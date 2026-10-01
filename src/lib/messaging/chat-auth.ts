import type { AuthSession, ChatSessionContext, GetAuthToken } from "../../features/chat/types"

const CONTEXT_KEYS = ["app_key", "customer_id", "property_code", "booking_link", "login_link", "payment_link", "x_auth_token"] as const
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const sameContext = (a: ChatSessionContext, b: ChatSessionContext) => CONTEXT_KEYS.every((key) => a[key] === b[key])
const isContext = (value: unknown): value is ChatSessionContext => isRecord(value) && Object.keys(value).length === CONTEXT_KEYS.length && CONTEXT_KEYS.every((key) => typeof value[key] === "string")
const decode = (part: string) => {
    if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("Invalid token")
    const binary = atob(part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))) as unknown
}

export function validateAuthSession(value: unknown, expectedContext: ChatSessionContext, now = Math.floor(Date.now() / 1000)): AuthSession {
    if (!isRecord(value) || Object.keys(value).length !== 3 || typeof value.token !== "string" || value.token.length === 0 || !Number.isSafeInteger(value.expiresAtUnixSeconds) || !isContext(value.context) || !sameContext(value.context, expectedContext)) throw new Error("Invalid authentication session")
    const parts = value.token.split(".")
    if (parts.length !== 3 || parts.some((part) => part.length === 0 || part.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Invalid authentication session")
    let header: unknown
    let payload: unknown
    try { header = decode(parts[0]); payload = decode(parts[1]) } catch { throw new Error("Invalid authentication session") }
    if (!isRecord(header) || header.alg !== "HS256" || header.typ !== "JWT" || !isRecord(payload) || !Number.isSafeInteger(payload.nbf) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || !isContext(payload.data)) throw new Error("Invalid authentication session")
    const nbf = payload.nbf as number; const iat = payload.iat as number; const exp = payload.exp as number
    if (nbf > now || iat > now || exp <= now + 30 || exp !== value.expiresAtUnixSeconds || !sameContext(payload.data, expectedContext)) throw new Error("Invalid authentication session")
    return { token: value.token, expiresAtUnixSeconds: value.expiresAtUnixSeconds, context: value.context }
}

export function createLocalTokenProvider(tokenEndpoint = "/api/chat/token", fetchImpl: typeof fetch = fetch): GetAuthToken {
    return async ({ context, signal }) => {
        if (context.x_auth_token !== "") throw new Error("Local authentication does not accept x_auth_token")
        const response = await fetchImpl(tokenEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context }), signal, cache: "no-store", credentials: "omit" })
        if (!response.ok) throw new Error("Authentication request failed")
        let body: unknown
        try { body = await response.json() } catch { throw new Error("Invalid authentication response") }
        return validateAuthSession(body, context)
    }
}
