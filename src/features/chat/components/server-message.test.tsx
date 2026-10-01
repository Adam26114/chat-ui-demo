// @vitest-environment jsdom
import { type ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const messageState = vi.hoisted(() => ({ text: "" }))

vi.mock("@assistant-ui/react", () => ({
    MessagePrimitive: {
        Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        Parts: ({ children }: { children: (value: { part: { type: string } }) => ReactNode }) => <>{children({ part: { type: "text" } })}</>,
    },
    useMessagePartText: () => ({ text: messageState.text }),
}))

import { ServerMessage, safeChatUrl } from "./server-message"

describe("safe server markdown", () => {
    beforeEach(() => { messageState.text = "" })

    it("strips raw HTML and does not render markdown images", () => {
        messageState.text = "<script>alert(1)</script>\n\n![room](https://example.test/room.jpg)"
        const view = render(<ServerMessage />)
        expect(view.container.querySelector("script")).toBeNull()
        expect(view.container.querySelector("img")).toBeNull()
        expect(screen.getByRole("img", { name: "room" })).toBeTruthy()
        expect(view.container.textContent).not.toContain("alert(1)")
    })

    it.each([
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "data:text/html,<svg/onload=alert(1)>",
        "java\nscript:alert(1)",
        "java%73cript:alert(1)",
        "https://user:pass@example.test/private",
    ])("removes unsafe anchor %s", (href) => {
        messageState.text = `[unsafe](${href})`
        const view = render(<ServerMessage />)
        expect(view.container.querySelector("a")).toBeNull()
        expect(view.container.textContent).toContain("unsafe")
        expect(safeChatUrl(href)).toBeNull()
    })

    it("keeps https and mailto links safe", () => {
        messageState.text = "[site](https://example.test) [email](mailto:stay@example.test)"
        render(<ServerMessage />)
        const links = screen.getAllByRole("link")
        expect(links[0].getAttribute("href")).toBe("https://example.test/")
        expect(links[0].getAttribute("target")).toBe("_blank")
        expect(links[0].getAttribute("rel")).toBe("noopener noreferrer")
        expect(links[1].getAttribute("href")).toBe("mailto:stay@example.test")
        expect(links[1].getAttribute("target")).toBeNull()
    })

    it("rejects credential-bearing public links", () => {
        expect(safeChatUrl("http://user:pass@example.test")).toBeNull()
    })
})
