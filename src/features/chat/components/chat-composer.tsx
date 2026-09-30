import { ArrowUp } from "lucide-react"
import { ComposerPrimitive } from "@assistant-ui/react"
import { Button } from "@/components/ui/button"

export function ChatComposer({ connected }: { connected: boolean }) {
    return (
        <div className="composer-area">
            <ComposerPrimitive.Root className="composer-box">
                <ComposerPrimitive.Input
                    className="composer-input"
                    rows={1}
                    placeholder={
                        connected
                            ? "Write your message..."
                            : "Connect to send a message"
                    }
                    aria-label="Write your message"
                />
                <ComposerPrimitive.Send asChild>
                    <Button
                        className="send-button"
                        size="icon"
                        aria-label="Send message"
                    >
                        <ArrowUp size={18} />
                    </Button>
                </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
            <p className="composer-hint">
                Sends plain text unchanged over WebSocket. Raw server replies
                appear as bubbles.
            </p>
        </div>
    )
}
