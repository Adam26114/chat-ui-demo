import { Sparkles } from "lucide-react"
import { MessagePartPrimitive, MessagePrimitive } from "@assistant-ui/react"

export function ServerMessage() {
    return (
        <MessagePrimitive.Root className="message-row message-row--staff">
            <div className="message-avatar">
                <Sparkles size={17} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="message-column">
                <span className="staff-name">Server response</span>
                <div className="message-bubble message-bubble--staff">
                    <MessagePrimitive.Parts>
                        {({ part }) =>
                            part.type === "text" ? (
                                <MessagePartPrimitive.Text />
                            ) : null
                        }
                    </MessagePrimitive.Parts>
                </div>
            </div>
        </MessagePrimitive.Root>
    )
}
