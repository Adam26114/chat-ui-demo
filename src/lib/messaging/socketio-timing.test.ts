import { afterEach, describe, expect, it, vi } from "vitest"
import { SocketIOMessageSource } from "./socketio-source"
import type { ChatSessionContext } from "../../features/chat/types"

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
const session = (exp: number, ctx = context) => ({
    token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ nbf: 1, iat: 1, exp, data: ctx })}.sig`,
    expiresAtUnixSeconds: exp,
    context: ctx,
})
type Handler = (...args: any[]) => void
type FakeSocket = ReturnType<typeof fakeSocket>

function fakeSocket(emitSuccess = false, emitConnect = true) {
    const handlers = new Map<string, Set<Handler>>()
    const emitted: Array<[string, ...any[]]> = []
    return {
        connected: false,
        emitted,
        on(event: string, handler: Handler) {
            if (!handlers.has(event)) handlers.set(event, new Set())
            handlers.get(event)!.add(handler)
        },
        off(event: string, handler?: Handler) {
            if (handler) handlers.get(event)?.delete(handler)
            else handlers.delete(event)
        },
        emit(event: string, ...args: any[]) {
            emitted.push([event, ...args])
            handlers.get(event)?.forEach((handler) => handler(...args))
            if (emitSuccess && event === "authenticate") this.fire("success")
        },
        connect() {
            this.connected = true
            if (emitConnect) this.fire("connect")
        },
        disconnect() {
            this.connected = false
        },
        fire(event: string, ...args: any[]) {
            handlers.get(event)?.forEach((handler) => handler(...args))
        },
        count(event: string) {
            return handlers.get(event)?.size ?? 0
        },
    }
}

const sources: SocketIOMessageSource[] = []
function setup(
    socket: FakeSocket = fakeSocket(),
    provider = vi.fn(async () => session(1000)),
    now = () => 100
) {
    const source = new SocketIOMessageSource(
        {
            serverUrl: "https://example.test",
            context,
            getAuthToken: provider,
        },
        { socketFactory: () => socket, now }
    )
    sources.push(source)
    return { source, socket, provider }
}

async function attached(source: SocketIOMessageSource, socket: FakeSocket) {
    const pending = source.connect()
    pending.catch(() => undefined)
    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(socket.count("connect")).toBe(1)
    return { pending }
}

afterEach(() => {
    sources.splice(0).forEach((source) => source.disconnect())
    vi.useRealTimers()
})

describe("SocketIOMessageSource timing contract", () => {
    it("retries authentication at 5000ms, but not at 4999ms", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket()
        const { source } = setup(socket)
        const { pending } = await attached(source, socket)
        expect(socket.emitted.filter(([event]) => event === "authenticate")).toHaveLength(1)
        await vi.advanceTimersByTimeAsync(4999)
        expect(socket.emitted.filter(([event]) => event === "authenticate")).toHaveLength(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(socket.emitted.filter(([event]) => event === "authenticate")).toHaveLength(2)
        socket.fire("success")
        await pending
    })

    it("makes authentication terminal at 30000ms with no later retries", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket()
        const { source } = setup(socket)
        const { pending } = await attached(source, socket)
        const rejected = pending.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(29999)
        expect(source.getState().status).toBe("authenticating")
        await vi.advanceTimersByTimeAsync(1)
        await rejected
        const count = socket.emitted.filter(([event]) => event === "authenticate").length
        await vi.advanceTimersByTimeAsync(30000)
        expect(socket.emitted.filter(([event]) => event === "authenticate")).toHaveLength(count)
        expect(source.getState()).toMatchObject({ status: "error", error: "Authentication timed out." })
    })

    it("times out a socket that never emits connect at 30000ms", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket(false, false)
        const { source } = setup(socket)
        const pending = source.connect()
        const rejected = pending.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        expect(source.getState().status).toBe("connecting")
        await vi.advanceTimersByTimeAsync(29999)
        expect(source.getState().status).toBe("connecting")
        await vi.advanceTimersByTimeAsync(1)
        await rejected
        expect(source.getState()).toMatchObject({ status: "error", error: "Connection timed out." })
        expect(socket.connected).toBe(false)
    })

    it("makes a never-resolving provider terminal at 10000ms and disconnects", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const provider = vi.fn(() => new Promise<any>(() => {}))
        const { source } = setup(fakeSocket(), provider)
        const pending = source.connect()
        const rejected = pending.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(9999)
        expect(source.getState().status).toBe("requesting-token")
        await vi.advanceTimersByTimeAsync(1)
        await rejected
        expect(source.getState()).toMatchObject({ status: "error", error: "Connection failed." })
        expect(vi.getTimerCount()).toBe(0)
    })

    it("reconnects with a cached fresh token and always authenticates", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket()
        const { source, provider } = setup(socket)
        const { pending: first } = await attached(source, socket)
        socket.fire("success")
        await first
        socket.fire("disconnect")
        const second = source.connect()
        const rejected = second.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(0)
        expect(provider).toHaveBeenCalledOnce()
        expect(socket.emitted.filter(([event]) => event === "authenticate")).toHaveLength(2)
        socket.fire("success")
        await second
        await rejected
    })

    it("gets a fresh provider token when reconnect remaining lifetime is at most 30s", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        let now = 100
        const socket = fakeSocket()
        const provider = vi.fn()
            .mockResolvedValueOnce(session(200))
            .mockResolvedValueOnce(session(300))
        const { source } = setup(socket, provider, () => now)
        const { pending: first } = await attached(source, socket)
        socket.fire("success")
        await first
        socket.fire("disconnect")
        now = 171
        const second = source.connect()
        const rejected = second.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(0)
        expect(provider).toHaveBeenCalledTimes(2)
        socket.fire("success")
        await second
        await rejected
    })

    it("requires a new success event after proactive refresh succeeds", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket()
        const provider = vi.fn()
            .mockResolvedValueOnce(session(140))
            .mockResolvedValueOnce(session(300))
        const { source } = setup(socket, provider)
        const { pending } = await attached(source, socket)
        socket.fire("success")
        await pending
        await vi.advanceTimersByTimeAsync(10000)
        expect(source.getState().status).toBe("authenticating")
        expect(source.getState().ready).toBe(false)
        socket.fire("success")
        await vi.advanceTimersByTimeAsync(0)
        expect(source.getState().status).toBe("ready")
        expect(provider).toHaveBeenCalledTimes(2)
    })

    it("makes proactive refresh rejection terminal and stops the socket", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket()
        const provider = vi.fn()
            .mockResolvedValueOnce(session(140))
            .mockRejectedValueOnce(new Error("refresh failed"))
        const { source } = setup(socket, provider)
        const { pending } = await attached(source, socket)
        socket.fire("success")
        await pending
        await vi.advanceTimersByTimeAsync(10000)
        expect(source.getState()).toMatchObject({ status: "error", error: "Authentication failed." })
        expect(socket.connected).toBe(false)
        expect(socket.count("success")).toBe(0)
    })

    it("leaves one refresh timer after synchronous success and zero after disconnect", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const socket = fakeSocket(true)
        const { source } = setup(socket, vi.fn(async () => session(140)))
        await source.connect()
        await vi.advanceTimersByTimeAsync(0)
        expect(source.getState().ready).toBe(true)
        expect(vi.getTimerCount()).toBe(1)
        source.disconnect()
        expect(vi.getTimerCount()).toBe(0)
    })

    it("does not let an aborted old finalizer clear the new token timeout", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const oldProvider = vi.fn(() => new Promise<any>(() => {}))
        const socket = fakeSocket()
        const { source } = setup(socket, oldProvider)
        const old = source.connect()
        const oldRejected = old.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        const newProvider = vi.fn(() => new Promise<any>(() => {}))
        source.configure({ serverUrl: "https://new.example.test", context, getAuthToken: newProvider })
        await oldRejected
        const next = source.connect()
        const nextRejected = next.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(9999)
        expect(source.getState().status).toBe("requesting-token")
        await vi.advanceTimersByTimeAsync(1)
        await nextRejected
        expect(source.getState().status).toBe("error")
    })

    it("does not let an old pending refresh result override fresh identity or status", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        let releaseOld!: (value: any) => void
        const oldProvider = vi.fn()
            .mockResolvedValueOnce(session(140))
            .mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve }))
        const oldSocket = fakeSocket()
        const newSocket = fakeSocket()
        const sockets = [oldSocket, newSocket]
        const source = new SocketIOMessageSource(
            { serverUrl: "https://example.test", context, getAuthToken: oldProvider },
            { socketFactory: () => sockets.shift()!, now: () => 100 }
        )
        sources.push(source)
        const { pending } = await attached(source, oldSocket)
        oldSocket.fire("success")
        await pending
        await vi.advanceTimersByTimeAsync(10000)
        source.configure({
            serverUrl: "https://new.example.test",
            context: { ...context, customer_id: "new" },
            getAuthToken: vi.fn(async () => session(400, { ...context, customer_id: "new" })),
        })
        const next = source.connect()
        const rejected = next.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        newSocket.fire("success")
        await next
        releaseOld(session(999))
        await vi.advanceTimersByTimeAsync(0)
        await rejected
        expect(source.getState()).toMatchObject({ status: "ready", ready: true, identityEpoch: 2 })
    })

    it("cleans the token timer when the provider throws synchronously", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const provider = vi.fn(() => { throw new Error("sync failure") })
        const { source } = setup(fakeSocket(), provider)
        const pending = source.connect()
        const rejected = pending.catch(() => undefined)
        await vi.advanceTimersByTimeAsync(0)
        await rejected
        expect(source.getState().status).toBe("error")
        expect(vi.getTimerCount()).toBe(0)
    })
})
