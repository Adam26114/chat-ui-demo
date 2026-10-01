import { describe, expect, it, vi } from "vitest"
import { SocketIOMessageSource } from "./socketio-source"
import type { ChatSessionContext } from "../../features/chat/types"
import type { SocketEvent } from "./types"

const context: ChatSessionContext = {
    app_key: "a",
    customer_id: "c",
    property_code: "p",
    booking_link: "b",
    login_link: "l",
    payment_link: "pay",
    x_auth_token: "x",
}
const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url")
const session = (ctx = context, exp = 1000) => ({
    token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ nbf: 1, iat: 1, exp, data: ctx })}.sig`,
    expiresAtUnixSeconds: exp,
    context: ctx,
})
type Fake = ReturnType<typeof fakeSocket>
function fakeSocket() {
    const handlers = new Map<string, Set<(...args: any[]) => void>>()
    const emitted: Array<[string, ...any[]]> = []
    return {
        connected: false,
        emitted,
        on(event: string, fn: (...args: any[]) => void) {
            if (!handlers.has(event)) handlers.set(event, new Set())
            handlers.get(event)!.add(fn)
        },
        off(event: string, fn?: (...args: any[]) => void) {
            if (fn) handlers.get(event)?.delete(fn)
            else handlers.delete(event)
        },
        emit(event: string, ...args: any[]) {
            emitted.push([event, ...args])
            handlers.get(event)?.forEach((fn) => fn(...args))
        },
        connect() {
            this.connected = true
            this.fire("connect")
        },
        disconnect() {
            this.connected = false
        },
        fire(event: string, ...args: any[]) {
            handlers.get(event)?.forEach((fn) => fn(...args))
        },
        count(event: string) {
            return handlers.get(event)?.size ?? 0
        },
    }
}
function setup(now = 100, provider = vi.fn(async () => session())) {
    const socket = fakeSocket()
    const source = new SocketIOMessageSource(
        { serverUrl: "https://example.test", context, getAuthToken: provider },
        { socketFactory: () => socket, now: () => now }
    )
    return { source, socket, provider }
}
async function ready(source: SocketIOMessageSource, socket: Fake) {
    const pending = source.connect()
    for (let index = 0; index < 20 && socket.count("success") === 0; index++)
        await new Promise((resolve) => setTimeout(resolve, 0))
    socket.fire("success", { ignored: true })
    await pending
}
async function attached(socket: Fake) {
    for (let index = 0; index < 20 && socket.count("success") === 0; index++)
        await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("SocketIOMessageSource transport contract", () => {
    it("uses autoConnect false and reaches ready only after success", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        expect(source.getState().ready).toBe(true)
    })
    it("registers every reference event", async () => {
        const { source, socket } = setup()
        const pending = source.connect()
        await attached(socket)
        expect(socket.count("authenticate")).toBe(0)
        socket.fire("success")
        await pending
        ;[
            "connect",
            "disconnect",
            "connect_error",
            "success",
            "response",
            "error",
            "expired",
            "trigger",
            "logon",
            "logout",
        ].forEach((name) => expect(socket.count(name)).toBe(1))
    })
    it("emits exact chat, login, and logout payloads", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        await source.send(" hi ")
        await source.login()
        await source.logout()
        expect(socket.emitted.slice(-3)).toEqual([
            ["chat", JSON.stringify({ input: " hi ", x_auth_token: "x" })],
            ["login", JSON.stringify({ x_auth_token: "x" })],
            ["logout", JSON.stringify({ x_auth_token: "x" })],
        ])
    })
    it("delivers multiple complete responses", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        const messages: string[] = []
        source.subscribe((message) => messages.push(message.text))
        socket.fire("response", "one")
        socket.fire("response", "two")
        expect(messages).toEqual(["one", "two"])
    })
    it("uses a valid first response once and ignores blank objects", async () => {
        const { source, socket } = setup()
        const messages: string[] = []
        source.subscribe((message) => messages.push(message.text))
        const pending = source.connect()
        await attached(socket)
        socket.fire("response", {})
        socket.fire("response", " ")
        expect(source.getState().ready).toBe(false)
        socket.fire("response", "first")
        await pending
        expect(messages).toEqual(["first"])
    })
    it("accepts string slug triggers with an empty detail", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        const triggers: unknown[] = []
        source.subscribeTriggers((trigger) => triggers.push(trigger))
        socket.fire("trigger", "checkout-start")
        socket.fire("trigger", { type: "wrong" })
        expect(triggers).toEqual([{ type: "checkout-start", detail: "" }])
    })
    it("rejects blank and non-string sends", async () => {
        const { source } = setup()
        await expect(source.send(" ")).rejects.toThrow()
        await expect(source.send(null as unknown as string)).rejects.toThrow()
    })
    it("does not queue offline messages", async () => {
        const { source, socket } = setup()
        await expect(source.send("offline")).rejects.toThrow()
        expect(socket.emitted).toEqual([])
    })
    it("treats every auth error as terminal", async () => {
        const { source, socket } = setup()
        const pending = source.connect()
        await attached(socket)
        socket.fire("error", "unknown auth failure")
        await expect(pending).rejects.toThrow()
        expect(source.getState().status).toBe("error")
    })
    it("treats recognized auth strings as terminal", async () => {
        const { source, socket } = setup()
        const pending = source.connect()
        await attached(socket)
        socket.fire("response", "Invalid token")
        await expect(pending).rejects.toThrow()
        expect(source.getState().status).toBe("error")
    })
    it("deduplicates concurrent token requests", async () => {
        let release!: (value: any) => void
        const provider = vi.fn(
            () =>
                new Promise((resolve) => {
                    release = resolve
                })
        )
        const { source, socket } = setup(100, provider)
        const first = source.connect()
        const second = source.connect()
        expect(first).toBe(second)
        await Promise.resolve()
        release(session())
        await attached(socket)
        socket.fire("success")
        await first
        expect(provider).toHaveBeenCalledOnce()
    })
    it("rejects pending connect immediately on disconnect", async () => {
        const { source } = setup()
        const pending = source.connect()
        source.disconnect()
        await expect(pending).rejects.toThrow("Disconnected")
    })
    it("rejects pending connect immediately on restart and requests once", async () => {
        const { source, provider } = setup()
        const old = source.connect()
        const next = source.restart()
        await expect(old).rejects.toThrow()
        expect(provider).toHaveBeenCalledTimes(1)
        source.disconnect()
        await expect(next).rejects.toThrow()
    })
    it("keeps identity epoch stable on restart", async () => {
        const { source } = setup()
        const epoch = source.getState().identityEpoch
        const pending = source.restart()
        source.disconnect()
        await expect(pending).rejects.toThrow()
        expect(source.getState().identityEpoch).toBe(epoch)
    })
    it("does not reset same identity configuration", () => {
        const { source, provider } = setup()
        const epoch = source.getState().identityEpoch
        source.configure({
            serverUrl: "https://example.test",
            context: { ...context },
            getAuthToken: provider,
        })
        expect(source.getState().identityEpoch).toBe(epoch)
    })
    it("increments identity epoch and cancels old work", async () => {
        const { source } = setup()
        const pending = source.connect()
        source.configure({
            serverUrl: "https://new.example.test",
            context: { ...context, customer_id: "new" },
            getAuthToken: async () =>
                session({ ...context, customer_id: "new" }),
        })
        await expect(pending).rejects.toThrow()
        expect(source.getState().identityEpoch).toBe(2)
    })
    it("expires terminally and detaches socket", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        source.expireSession()
        expect(source.getState().status).toBe("expired")
        expect(socket.connected).toBe(false)
        expect(socket.count("response")).toBe(0)
    })
    it("cleans handlers on user disconnect", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        source.disconnect()
        expect(socket.count("response")).toBe(0)
        socket.fire("response", "late")
    })
    it("ignores stale socket events", async () => {
        const { source, socket } = setup()
        const pending = source.connect()
        source.configure({
            serverUrl: "https://new.example.test",
            context: { ...context, customer_id: "new" },
            getAuthToken: async () => session(),
        })
        socket.connected = true
        socket.fire("success")
        await expect(pending).rejects.toThrow()
        expect(source.getState().ready).toBe(false)
    })
    it("rejects synchronous emission when the event invalidates state", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        socket.on("chat", () => source.disconnect())
        await expect(source.send("hello")).rejects.toThrow("superseded")
    })
    it("uses the authoritative session context token", async () => {
        const { source, socket } = setup()
        await ready(source, socket)
        await source.send("x")
        expect(JSON.parse(socket.emitted.at(-1)![1])).toEqual({
            input: "x",
            x_auth_token: "x",
        })
    })

    it("times out a provider at 10000ms and leaves no timer after cancellation", async () => {
        vi.useFakeTimers()
        try {
            const provider = vi.fn(() => new Promise<any>(() => {}))
            const { source } = setup(100, provider)
            const pending = source.connect()
            const rejected = expect(pending).rejects.toThrow()
            await vi.advanceTimersByTimeAsync(10000)
            await rejected
            expect(source.getState().status).toBe("error")
            expect(vi.getTimerCount()).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })

    it("does not expose provider errors from connect", async () => {
        const marker = "provider-secret-generatedJWT"
        const provider = vi.fn(async () => {
            throw new Error(marker)
        })
        const { source } = setup(100, provider)
        const events: SocketEvent[] = []
        source.subscribeEvents((event) => events.push(event))

        await expect(source.connect()).rejects.toThrow("Connection failed.")
        expect(JSON.stringify(source.getState())).not.toContain(marker)
        expect(JSON.stringify(events)).not.toContain(marker)
    })

    it("does not expose socket factory errors from connect", async () => {
        const marker = "https://sensitive.example/key=generatedJWT"
        const source = new SocketIOMessageSource(
            { serverUrl: "https://example.test", context },
            {
                socketFactory: () => {
                    throw new Error(marker)
                },
            }
        )
        const events: SocketEvent[] = []
        source.subscribeEvents((event) => events.push(event))

        await expect(source.connect()).rejects.toThrow("Connection failed.")
        expect(JSON.stringify(source.getState())).not.toContain(marker)
        expect(JSON.stringify(events)).not.toContain(marker)
    })
})
