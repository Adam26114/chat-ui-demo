import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { createLocalTokenProvider, validateAuthSession } from "./chat-auth"
import { resolveChatbotConfig } from "./chatbot-config"
import type { ChatSessionContext } from "../../features/chat/types"
// The server remains JavaScript-only; these tests intentionally exercise its runtime exports.
// @ts-expect-error server test modules do not ship declaration files
import { loadServerConfig } from "../../../server/config.mjs"
// @ts-expect-error server test modules do not ship declaration files
import { createTokenHandler } from "../../../server/token-service.mjs"

const context: ChatSessionContext = { app_key: "a", customer_id: "c", property_code: "p", booking_link: "b", login_link: "l", payment_link: "pay", x_auth_token: "" }
const b64 = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
const token = (claims: Record<string, unknown> = { nbf: 90, iat: 90, exp: 200, data: context }, header: Record<string, unknown> = { alg: "HS256", typ: "JWT" }) => `${b64(header)}.${b64(claims)}.signature`

describe("chat auth", () => {
    it("validates strict JWT session claims and rejects skew", () => {
        expect(validateAuthSession({ token: token(), expiresAtUnixSeconds: 200, context }, context, 100).token).toBe(token())
        expect(() => validateAuthSession({ token: token({ nbf: 90, iat: 90, exp: 130, data: context }), expiresAtUnixSeconds: 130, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token(), expiresAtUnixSeconds: 200, context, extra: true }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token({ nbf: 101, iat: 90, exp: 200, data: context }), expiresAtUnixSeconds: 200, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token({ nbf: 90, iat: 101, exp: 200, data: context }), expiresAtUnixSeconds: 200, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token({ nbf: 90, iat: 90, exp: 200, data: { ...context, property_code: "other" } }), expiresAtUnixSeconds: 200, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token(), expiresAtUnixSeconds: 201, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token(), expiresAtUnixSeconds: 200, context: { ...context, customer_id: "other" } }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: token({ nbf: 90, iat: 90, exp: 200, data: context }, { alg: "none", typ: "JWT" }), expiresAtUnixSeconds: 200, context }, context, 100)).toThrow()
        expect(() => validateAuthSession({ token: "malformed", expiresAtUnixSeconds: 200, context }, context, 100)).toThrow()
    })

    it("uses local provider only for empty x_auth_token", async () => {
        const future = 4102444800
        const fetcher = vi.fn(async () => new Response(JSON.stringify({
            token: token({ nbf: 90, iat: 90, exp: future, data: context }),
            expiresAtUnixSeconds: future,
            context,
        }), { status: 200 }))
        await createLocalTokenProvider("/token", fetcher)({
            context,
            signal: new AbortController().signal,
        })
        expect(fetcher).toHaveBeenCalledOnce()
        await expect(createLocalTokenProvider("/token", fetcher)({
            context: { ...context, x_auth_token: "provided" },
            signal: new AbortController().signal,
        })).rejects.toThrow()
    })

    it("uses the in-process issuer for the local provider and preserves request options", async () => {
        const now = 1_700_000_000_000
        const root = "http://127.0.0.1:5173/"
        const browserContext = resolveChatbotConfig(
            {
                app_key: "synthetic-app",
                customer_id: "synthetic-customer",
                property_code: "synthetic-property",
                booking_link: "",
                login_link: null,
                payment_link: "",
            },
            root
        ).context
        const serverConfig = loadServerConfig({
            CHAT_SERVER_KEY: "synthetic-signing-key",
            CHAT_APP_KEY: browserContext.app_key,
            CHAT_CUSTOMER_ID: browserContext.customer_id,
            CHAT_PROPERTY_CODE: browserContext.property_code,
            CHAT_BASE_URL: root,
            CHAT_ISSUER_PORT: "8787",
            CHAT_ALLOWED_ORIGINS: root.slice(0, -1),
        })
        const handler = createTokenHandler(serverConfig, { now: () => now })
        const requestOrigin = serverConfig.allowedOrigins[0]
        const requestHost = `127.0.0.1:${serverConfig.port}`
        expect(serverConfig.port).toBe(8787)
        expect(serverConfig.allowedOrigins).toEqual(["http://127.0.0.1:5173"])
        expect(requestOrigin).toBe("http://127.0.0.1:5173")
        expect(requestHost).toBe("127.0.0.1:8787")
        expect(serverConfig.context).toEqual(browserContext)
        const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            const body = Buffer.from(String(init?.body ?? ""))
            const request = Readable.from(body) as Readable & {
                method: string
                headers: Record<string, string>
                socket: { remoteAddress: string }
            }
            request.method = "POST"
            request.headers = {
                origin: requestOrigin,
                host: requestHost,
                "content-type": "application/json",
                "content-length": String(body.length),
            }
            request.socket = { remoteAddress: "127.0.0.1" }
            let statusCode = 200
            const responseHeaders: Record<string, string> = {}
            let responseBody = ""
            await handler(request, {
                setHeader(name: string, value: string) {
                    responseHeaders[name.toLowerCase()] = value
                },
                end(value: string) {
                    responseBody = value
                },
                get statusCode() {
                    return statusCode
                },
                set statusCode(value: number) {
                    statusCode = value
                },
            })
            return new Response(responseBody, {
                status: statusCode,
                headers: responseHeaders,
            })
        })
        const clock = vi.spyOn(Date, "now").mockReturnValue(now)
        try {
            const session = await createLocalTokenProvider("/token", fetcher)({
                context: browserContext,
                signal: new AbortController().signal,
            })
            expect(session.context).toEqual(browserContext)
            expect(session.expiresAtUnixSeconds).toBe(now / 1000 + 3600)
            expect(validateAuthSession(session, browserContext, now / 1000)).toEqual(session)
            const [, request] = fetcher.mock.calls[0]
            expect(JSON.parse(String(request?.body))).toEqual({ context: browserContext })
            expect(request).toMatchObject({ method: "POST", cache: "no-store", credentials: "omit" })
            expect(request?.headers).toEqual({ "Content-Type": "application/json" })
            expect(request?.signal).toBeInstanceOf(AbortSignal)
        } finally {
            clock.mockRestore()
        }
        expect(fetcher).toHaveBeenCalledOnce()
        await expect(createLocalTokenProvider("/token", fetcher)({ context: { ...browserContext, x_auth_token: "provided" }, signal: new AbortController().signal })).rejects.toThrow()
    })
})
