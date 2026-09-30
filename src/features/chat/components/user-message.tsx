import { Check } from "lucide-react"
import { MessagePartPrimitive, MessagePrimitive } from "@assistant-ui/react"

export function UserMessage() {
    return (
        <MessagePrimitive.Root className="message-row message-row--user">
            <div className="message-bubble message-bubble--user">
                <MessagePrimitive.Parts>
                    {({ part }) =>
                        part.type === "text" ? (
                            <MessagePartPrimitive.Text />
                        ) : null
                    }
                </MessagePrimitive.Parts>
            </div>
            <span className="message-caption">
                You <Check size={12} aria-hidden="true" />
            </span>
        </MessagePrimitive.Root>
    )
}
