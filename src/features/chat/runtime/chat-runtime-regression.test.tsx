// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    ChatRuntimeProvider,
    type ChatRuntimeController,
} from "./chat-runtime-provider"
import type { ChatSessionContext } from "../types"
import type {
    ConnectionState,
    SocketIOConfiguration,
    SocketEvent,
    SocketTrigger,
} from "../../../lib/messaging/socketio-source"

const runtimeCapture = vi.hoisted(() => ({ latest: null as any }))
vi.mock("@assistant-ui/react", () => ({
    AssistantRuntimeProvider: ({ children }: { children: ReactNode }) =>
        children,
    useExternalStoreRuntime: (value: unknown) => {
        runtimeCapture.latest = value
        return { kind: "dummy-runtime" }
    },
}))

const context = (suffix = "one"): ChatSessionContext => ({
    app_key: "app",
    customer_id: `customer-${suffix}`,
    property_code: "property",
    booking_link: "https://example.test/book",
    login_link: "https://example.test/login",
    payment_link: "https://example.test/pay",
    x_auth_token: "token",
})
const configuration = (suffix = "one"): SocketIOConfiguration => ({
    serverUrl: "https://socket.example.test",
    tokenEndpoint: "/token",
    context: context(suffix),
})

class FakeSocketIOMessageSource {
    state: ConnectionState = Object.freeze({
        status: "ready",
        ready: true,
        error: null,
        expiresAtUnixSeconds: 999,
        identityEpoch: 0,
    })
    configured: SocketIOConfiguration | undefined
    configureCalls: SocketIOConfiguration[] = []
    connectCalls = 0
    connectError: Error | null = null
    disconnectCalls = 0
    activeConnects = 0
    maxActiveConnects = 0
    private messages = new Set<
        (message: { id: string; text: string; createdAt: Date }) => void
    >()
    private states = new Set<(state: ConnectionState) => void>()
    private events = new Set<(event: SocketEvent) => void>()
    private triggers = new Set<(trigger: SocketTrigger) => void>()
    sendDeferred: Array<{
        resolve: () => void
        reject: (error: Error) => void
        text: string
    }> = []

    getState() {
        return this.state
    }
    configure(next: SocketIOConfiguration) {
        this.configureCalls.push(next)
        const same =
            this.configured &&
            this.configured.serverUrl === next.serverUrl &&
            this.configured.tokenEndpoint === next.tokenEndpoint &&
            this.configured.getAuthToken === next.getAuthToken &&
            JSON.stringify(this.configured.context) ===
                JSON.stringify(next.context)
        this.configured = next
        if (!same) {
            this.state = Object.freeze({
                ...this.state,
                status: "disconnected",
                ready: false,
                identityEpoch: this.state.identityEpoch + 1,
            })
            this.states.forEach((listener) => listener(this.state))
        }
    }
    subscribe(
        listener: (message: {
            id: string
            text: string
            createdAt: Date
        }) => void
    ) {
        this.messages.add(listener)
        return () => this.messages.delete(listener)
    }
    subscribeState(listener: (state: ConnectionState) => void) {
        this.states.add(listener)
        return () => this.states.delete(listener)
    }
    subscribeEvents(listener: (event: SocketEvent) => void) {
        this.events.add(listener)
        return () => this.events.delete(listener)
    }
    subscribeTriggers(listener: (trigger: SocketTrigger) => void) {
        this.triggers.add(listener)
        return () => this.triggers.delete(listener)
    }
    async connect() {
        this.connectCalls++
        if (this.connectError) throw this.connectError
        this.activeConnects++
        this.maxActiveConnects = Math.max(
            this.maxActiveConnects,
            this.activeConnects
        )
        this.setReady()
    }
    disconnect() {
        this.disconnectCalls++
        this.activeConnects = Math.max(0, this.activeConnects - 1)
        this.state = Object.freeze({
            ...this.state,
            status: "disconnected",
            ready: false,
        })
        this.states.forEach((listener) => listener(this.state))
    }
    async restart() {
        this.disconnect()
        return this.connect()
    }
    expireSession() {
        this.state = Object.freeze({
            ...this.state,
            status: "expired" as const,
            ready: false,
            error: "Session expired.",
        })
        this.states.forEach((listener) => listener(this.state))
    }
    async send(text: string) {
        return new Promise<void>((resolve, reject) =>
            this.sendDeferred.push({ resolve, reject, text })
        )
    }
    async login() {}
    async logout() {}
    setReady() {
        this.state = Object.freeze({
            ...this.state,
            status: "ready" as const,
            ready: true,
            error: null,
        })
        this.states.forEach((listener) => listener(this.state))
    }
    message(text: string) {
        this.messages.forEach((listener) =>
            listener({ id: crypto.randomUUID(), text, createdAt: new Date() })
        )
    }
    event(event: SocketEvent) {
        this.events.forEach((listener) => listener(event))
    }
    trigger(trigger: SocketTrigger) {
        this.triggers.forEach((listener) => listener(trigger))
    }
    resolveSend(index = 0) {
        this.sendDeferred.splice(index, 1)[0]?.resolve()
    }
    rejectSend(error = new Error("send rejected"), index = 0) {
        this.sendDeferred.splice(index, 1)[0]?.reject(error)
    }
}

describe("ChatRuntimeProvider lifecycle regressions", () => {
    let source: FakeSocketIOMessageSource
    let sourceFactory: () => FakeSocketIOMessageSource
    let controller!: ChatRuntimeController
    beforeEach(() => {
        source = new FakeSocketIOMessageSource()
        sourceFactory = vi.fn(() => source)
        runtimeCapture.latest = null
    })
    const renderProvider = (
        config = configuration(),
        title = "Meridian",
        onTrigger = vi.fn()
    ) =>
        render(
            <ChatRuntimeProvider
                configuration={config}
                title={title}
                sourceFactory={
                    sourceFactory as unknown as (
                        configuration?: SocketIOConfiguration
                    ) => import("../../../lib/messaging/socketio-source").SocketIOMessageSource
                }
                onTrigger={onTrigger}
            >
                {(next) => {
                    controller = next
                    return null
                }}
            </ChatRuntimeProvider>
        )

    it("keeps StrictMode at one active connection and cleans up every mount", () => {
        const view = render(
            <StrictMode>
                <ChatRuntimeProvider
                    configuration={configuration()}
                    sourceFactory={sourceFactory as any}
                >
                    {() => null}
                </ChatRuntimeProvider>
            </StrictMode>
        )
        expect(source.maxActiveConnects).toBe(1)
        view.unmount()
        expect(source.activeConnects).toBe(0)
        expect(source.disconnectCalls).toBe(2)
    })

    it("admits one user send, rejects rejected sends, and serializes simultaneous sends", async () => {
        renderProvider()
        await act(async () => {
            const send = controller.sendTest(" hello ")
            expect(source.sendDeferred[0].text).toBe(" hello ")
            source.resolveSend()
            await send
        })
        expect(runtimeCapture.latest.messages).toHaveLength(1)
        await expect(controller.sendTest(" ")).rejects.toThrow("non-empty")
        await act(async () => source.message("ack"))
        const first = controller.sendTest("first")
        await expect(controller.sendTest("second")).rejects.toThrow("already")
        source.resolveSend()
        await act(async () => {
            await first
        })
        expect(
            runtimeCapture.latest.messages.filter(
                (message: any) => message.role === "user"
            )
        ).toHaveLength(2)
    })

    it("preserves exact sendTest text and rejects whitespace-only text", async () => {
        renderProvider()
        const text = "  Hello\nworld  "
        await act(async () => {
            const send = controller.sendTest(text)
            expect(source.sendDeferred[0].text).toBe(text)
            source.resolveSend()
            await send
        })
        expect(runtimeCapture.latest.messages.at(-1).text).toBe(text)

        await expect(controller.sendTest(" \n\t ")).rejects.toThrow(
            "non-empty"
        )
        expect(source.sendDeferred).toHaveLength(0)
        expect(runtimeCapture.latest.messages).toHaveLength(1)
    })

    it("uses a safe fallback for provider connection errors", async () => {
        const marker = "provider-secret-generatedJWT"
        source.connectError = new Error(marker)
        renderProvider()
        await act(async () => await Promise.resolve())
        expect(controller.error).toBe("Connection failed.")
        expect(controller.error).not.toContain(marker)
    })

    it("clears loading when an assistant response completes", async () => {
        renderProvider()
        let sending!: Promise<void>
        act(() => {
            sending = controller.sendTest("question")
        })
        expect(runtimeCapture.latest.isRunning).toBe(true)
        source.resolveSend()
        await act(async () => {
            await sending
        })
        expect(runtimeCapture.latest.isRunning).toBe(true)
        await act(async () => source.message("answer"))
        expect(runtimeCapture.latest.isRunning).toBe(false)
    })

    it("substitutes the current title without losing history", async () => {
        const view = renderProvider(configuration(), "Old title")
        await act(async () => source.message("welcome"))
        view.rerender(
            <ChatRuntimeProvider
                configuration={configuration()}
                title="New title"
                sourceFactory={sourceFactory as any}
            >
                {(next) => {
                    controller = next
                    return null
                }}
            </ChatRuntimeProvider>
        )
        await act(async () => source.message("hello group_name"))
        expect(
            runtimeCapture.latest.messages.map((message: any) => message.text)
        ).toEqual(["welcome", "hello New title"])
    })

    it("clears messages and events only when configuration identity changes", async () => {
        const view = renderProvider()
        await act(async () => {
            source.message("history")
            source.event({
                id: "e",
                type: "status",
                detail: "x",
                at: new Date(),
            })
        })
        expect(runtimeCapture.latest.messages).toHaveLength(1)
        view.rerender(
            <ChatRuntimeProvider
                configuration={configuration("two")}
                sourceFactory={sourceFactory as any}
            >
                {(next) => {
                    controller = next
                    return null
                }}
            </ChatRuntimeProvider>
        )
        expect(runtimeCapture.latest.messages).toHaveLength(0)
        expect(controller.events).toHaveLength(0)
        expect(source.configureCalls).toHaveLength(2)
    })

    it("ignores stale deferred sends and does not let old rejection clear new loading", async () => {
        const view = renderProvider()
        const oldSend = controller.sendTest("old").catch((error) => {
            throw error
        })
        void oldSend.catch(() => undefined)
        view.rerender(
            <ChatRuntimeProvider
                configuration={configuration("two")}
                sourceFactory={sourceFactory as any}
            >
                {(next) => {
                    controller = next
                    return null
                }}
            </ChatRuntimeProvider>
        )
        await act(async () => {
            source.rejectSend(new Error("old rejection"))
        })
        await expect(oldSend).rejects.toThrow("Message could not be sent.")
        expect(runtimeCapture.latest.messages).toHaveLength(0)
        let currentSend!: Promise<void>
        act(() => {
            currentSend = controller.sendTest("new")
        })
        expect(runtimeCapture.latest.isRunning).toBe(true)
        expect(source.sendDeferred).toHaveLength(1)
        await act(async () => {
            source.rejectSend(new Error("current rejection"))
            await expect(currentSend).rejects.toThrow(
                "Message could not be sent."
            )
        })
        expect(runtimeCapture.latest.isRunning).toBe(false)
        expect(controller.error).toBe("Message could not be sent.")
    })

    it("retains history across restart and clears loading on expiry", async () => {
        renderProvider()
        await act(async () => source.message("history"))
        await act(async () => {
            await controller.restart()
        })
        expect(runtimeCapture.latest.messages).toHaveLength(1)
        let sending!: Promise<void>
        act(() => {
            sending = controller.sendTest("pending")
        })
        expect(runtimeCapture.latest.isRunning).toBe(true)
        await act(async () => controller.expireSession())
        expect(runtimeCapture.latest.isRunning).toBe(false)
        source.rejectSend(new Error("expired"))
        await expect(sending).rejects.toThrow()
    })

    it("maps triggers and cleans trigger subscriptions on unmount", async () => {
        const onTrigger = vi.fn()
        const view = renderProvider(configuration(), "title", onTrigger)
        await act(async () =>
            source.trigger({ type: "valid", detail: "detail" })
        )
        expect(onTrigger).toHaveBeenCalledWith({
            type: "valid",
            detail: "detail",
        })
        view.unmount()
        source.trigger({ type: "after-unmount", detail: "" })
        expect(onTrigger).toHaveBeenCalledTimes(1)
    })
})
