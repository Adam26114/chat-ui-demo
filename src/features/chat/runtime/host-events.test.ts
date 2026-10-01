import { describe, expect, it, vi } from "vitest"
import { attachHostEvents } from "./host-events"

describe("attachHostEvents", () => {
    it("handles all legacy events and ignores malformed auth", () => {
        const target = new EventTarget()
        const callbacks = {
            onAuthToken: vi.fn(),
            onLogin: vi.fn(),
            onLogout: vi.fn(),
            onSessionExpired: vi.fn(),
        }
        const cleanup = attachHostEvents(callbacks, target as Document)
        target.dispatchEvent(
            new CustomEvent("qikres/auth", { detail: { auth_token: "token" } })
        )
        target.dispatchEvent(
            new CustomEvent("qikres/auth", { detail: { auth_token: 4 } })
        )
        ;["qikres/login", "myroompass/login"].forEach((name) =>
            target.dispatchEvent(new Event(name))
        )
        ;["qikres/logout", "myroompass/logout"].forEach((name) =>
            target.dispatchEvent(new Event(name))
        )
        target.dispatchEvent(new Event("qikres/sessionExpired"))
        expect(callbacks.onAuthToken).toHaveBeenCalledWith("token")
        expect(callbacks.onAuthToken).toHaveBeenCalledTimes(1)
        expect(callbacks.onLogin).toHaveBeenCalledTimes(2)
        expect(callbacks.onLogout).toHaveBeenCalledTimes(2)
        expect(callbacks.onSessionExpired).toHaveBeenCalledTimes(1)
        cleanup()
        target.dispatchEvent(new Event("qikres/login"))
        expect(callbacks.onLogin).toHaveBeenCalledTimes(2)
    })
})
