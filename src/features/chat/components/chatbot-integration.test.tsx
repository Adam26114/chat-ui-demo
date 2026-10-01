// @vitest-environment jsdom
import { type ReactNode } from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatBot } from "./chatbot"
import type { ChatSessionContext } from "../types"

const captures = vi.hoisted(() => ({ runtime: null as any, widget: null as any }))
vi.mock("./chat-widget", () => ({
    ChatWidget: (props: unknown) => { captures.widget = props; return <div data-testid="chat-widget" /> },
}))
vi.mock("../runtime/chat-runtime-provider", () => ({
    ChatRuntimeProvider: ({ configuration, title, onTrigger, children }: { configuration: unknown; title?: string; onTrigger?: (trigger: { type: string }) => void; children: (controller: any) => ReactNode }) => {
        const controller = {
            status: "ready", ready: true, error: null, expiresAtUnixSeconds: null, isRunning: false,
            restart: vi.fn(), login: vi.fn(async () => undefined), logout: vi.fn(async () => undefined), expireSession: vi.fn(),
        }
        captures.runtime = { configuration, title, onTrigger, controller }
        return <>{children(controller)}</>
    },
}))

const authProvider = vi.fn(async ({ context }: { context: ChatSessionContext }) => ({ token: "session", expiresAtUnixSeconds: 9999999999, context }))
const props = (overrides = {}) => ({ app_key: "app", customer_id: "customer", property_code: "property", x_auth_token: "prop-token", getAuthToken: authProvider, chatbox_title: "Suite chat", avatar: "https://example.test/avatar.png", ...overrides })

describe("ChatBot integration boundaries", () => {
    beforeEach(() => { captures.runtime = null; captures.widget = null; authProvider.mockClear() })

    it("observes x_auth prop changes and host token override precedence", async () => {
        const view = render(<ChatBot {...props()} />)
        expect(captures.runtime.configuration.context.x_auth_token).toBe("prop-token")
        await act(async () => document.dispatchEvent(new CustomEvent("qikres/auth", { detail: { auth_token: "host-token" } })))
        expect(captures.runtime.configuration.context.x_auth_token).toBe("host-token")
        view.rerender(<ChatBot {...props({ x_auth_token: "new-prop-token" })} />)
        expect(captures.runtime.configuration.context.x_auth_token).toBe("new-prop-token")
    })

    it("does not reset title or avatar when context changes", () => {
        const view = render(<ChatBot {...props()} />)
        expect(captures.widget.title).toBe("Suite chat")
        expect(captures.widget.avatar).toBe("https://example.test/avatar.png")
        view.rerender(<ChatBot {...props({ customer_id: "changed" })} />)
        expect(captures.widget.title).toBe("Suite chat")
        expect(captures.widget.avatar).toBe("https://example.test/avatar.png")
    })

    it("reports configuration errors for nonempty tokens without a provider", () => {
        const view = render(<ChatBot {...props({ getAuthToken: undefined })} />)
        expect(view.getByRole("alert").textContent).toContain("getAuthToken")
    })

    it("bubbles valid root triggers and rejects invalid trigger names", async () => {
        const view = render(<ChatBot {...props()} />)
        const events: Event[] = []
        document.addEventListener("qikres/chatbot/room_ready", (event) => events.push(event))
        await act(async () => captures.runtime.onTrigger?.({ type: "room_ready" }))
        await act(async () => captures.runtime.onTrigger?.({ type: "not valid" }))
        expect(events).toHaveLength(1)
        expect(events[0].type).toBe("qikres/chatbot/room_ready")
        view.unmount()
    })

    it("attaches and removes all host event bridges", async () => {
        const view = render(<ChatBot {...props()} />)
        const login = captures.runtime.controller.login
        const logout = captures.runtime.controller.logout
        const expire = captures.runtime.controller.expireSession
        await act(async () => {
            document.dispatchEvent(new CustomEvent("qikres/auth", { detail: { auth_token: "host-token" } }))
            document.dispatchEvent(new CustomEvent("qikres/login"))
            document.dispatchEvent(new CustomEvent("myroompass/login"))
            document.dispatchEvent(new CustomEvent("qikres/logout"))
            document.dispatchEvent(new CustomEvent("myroompass/logout"))
            document.dispatchEvent(new CustomEvent("qikres/sessionExpired"))
        })
        expect(captures.runtime.configuration.context.x_auth_token).toBe("host-token")
        expect(login).toHaveBeenCalledTimes(2)
        expect(logout).toHaveBeenCalledTimes(2)
        expect(expire).toHaveBeenCalledTimes(1)
        view.unmount()
        document.dispatchEvent(new CustomEvent("qikres/login"))
        expect(login).toHaveBeenCalledTimes(2)
    })
})
