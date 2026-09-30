import { ArrowDown, Sparkles } from "lucide-react"
import { ThreadPrimitive } from "@assistant-ui/react"
import type { ChatRuntimeController } from "../runtime/chat-runtime-provider"
import { UserMessage } from "./user-message"
import { ServerMessage } from "./server-message"
import { ChatComposer } from "./chat-composer"

export function ChatThread({
    isRunning,
    status,
}: Pick<ChatRuntimeController, "isRunning" | "status">) {
    return (
        <ThreadPrimitive.Root className="chat-thread">
            <ThreadPrimitive.Viewport className="message-viewport" autoScroll>
                <p className="conversation-date">TODAY</p>
                <ThreadPrimitive.Empty>
                    <p className="thread-empty">
                        Messages from the server will appear here.
                    </p>
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages>
                    {({ message }) =>
                        message.role === "user" ? (
                            <UserMessage />
                        ) : (
                            <ServerMessage />
                        )
                    }
                </ThreadPrimitive.Messages>
                {isRunning && (
                    <div className="typing-row" aria-live="polite">
                        <div className="message-avatar">
                            <Sparkles size={17} aria-hidden="true" />
                        </div>
                        <div className="typing-bubble">
                            <i />
                            <i />
                            <i />
                            <span className="sr-only">Replying</span>
                        </div>
                    </div>
                )}
                <ThreadPrimitive.ScrollToBottom
                    className="scroll-bottom"
                    aria-label="Scroll to latest message"
                >
                    <ArrowDown size={16} />
                </ThreadPrimitive.ScrollToBottom>
            </ThreadPrimitive.Viewport>
            <ChatComposer connected={status === "connected"} />
        </ThreadPrimitive.Root>
    )
}
