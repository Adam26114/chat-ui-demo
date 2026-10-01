import { describe, expect, it } from "vitest"
import { vi } from "vitest"
vi.mock("./chat-widget", () => ({ ChatWidget: () => null }))
import ChatBot, { ChatBot as NamedChatBot } from "./chatbot"

describe("ChatBot", () => {
    it("has default and named exports", () => {
        expect(ChatBot).toBe(NamedChatBot)
    })
})
