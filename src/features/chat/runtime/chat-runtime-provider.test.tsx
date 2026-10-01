import { describe, expect, it } from "vitest"
import { ChatRuntimeProvider } from "./chat-runtime-provider"

describe("ChatRuntimeProvider", () => {
    it("exports the runtime provider", () => {
        expect(ChatRuntimeProvider).toBeTypeOf("function")
    })
})
