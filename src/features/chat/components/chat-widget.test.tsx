// @vitest-environment jsdom
import { type ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChatWidget } from "./chat-widget"
import { ChatComposer } from "./chat-composer"

vi.mock("../../../components/ui/button", () => ({
    Button: ({ children, ...props }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}))
vi.mock("./chat-thread", () => ({
    ChatThread: ({ ready, isRunning }: { ready: boolean; isRunning: boolean }) => <div data-testid="mock-thread"><ChatComposer ready={ready} isRunning={isRunning} /></div>,
}))
vi.mock("@assistant-ui/react", () => ({
    ComposerPrimitive: {
        Root: ({ children, ...props }: { children: ReactNode }) => <form {...props}>{children}</form>,
        Input: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
        Send: ({ children }: { children: ReactNode }) => <>{children}</>,
    },
}))

const baseProps = { isRunning: false, status: "ready" as const, ready: true, error: null, expiresAtUnixSeconds: null, onRestart: vi.fn() }

describe("ChatWidget offline states", () => {
    afterEach(cleanup)

    it("keeps launcher controls keyboard reachable and toggles labels", () => {
        render(<ChatWidget {...baseProps} />)
        const launcher = screen.getByRole("button", { name: "Minimize chat" })
        launcher.focus()
        expect(document.activeElement).toBe(launcher)
        fireEvent.keyDown(launcher, { key: "Enter" })
        fireEvent.click(launcher)
        expect(screen.getByRole("button", { name: "Open chat" })).toBeTruthy()
    })

    it("keeps the thread visible after a runtime error and disables sending", () => {
        render(<ChatWidget {...baseProps} ready={false} status="error" error="Auth unavailable" />)
        expect(screen.getByTestId("mock-thread")).toBeTruthy()
        expect((screen.getByRole("textbox", { name: "Write your message" }) as HTMLTextAreaElement).disabled).toBe(true)
        expect((screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement).disabled).toBe(true)
    })

    it("omits the thread without a runtime and distinguishes setup copy", () => {
        render(<ChatWidget {...baseProps} ready={false} status="error" error="Missing app_key" hasRuntime={false} />)
        expect(screen.queryByTestId("mock-thread")).toBeNull()
        expect(screen.getByText(/public chat settings/i)).toBeTruthy()
    })

    it("shows runtime error and expiry while safely handling rejected and thrown restarts", async () => {
        const onRestart = vi.fn(() => Promise.reject(new Error("offline")))
        render(<ChatWidget {...baseProps} status="expired" error="Token expired" expiresAtUnixSeconds={100} onRestart={onRestart} />)
        const alerts = screen.getAllByRole("alert")
        expect(alerts.map((alert) => alert.textContent).join(" ")).toContain("Token expired")
        expect(alerts.map((alert) => alert.textContent).join(" ")).toContain("expired")
        fireEvent.click(screen.getByRole("button", { name: "Restart connection" }))
        await Promise.resolve()
        expect(onRestart).toHaveBeenCalledTimes(1)

        cleanup()
        const throws = vi.fn(() => { throw new Error("offline") })
        render(<ChatWidget {...baseProps} status="error" error="Connection unavailable" onRestart={throws} />)
        fireEvent.click(screen.getByRole("button", { name: "Restart connection" }))
        await Promise.resolve()
        expect(throws).toHaveBeenCalledTimes(1)
    })
})
