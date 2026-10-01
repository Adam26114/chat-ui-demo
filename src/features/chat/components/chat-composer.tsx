import { ArrowUp } from "lucide-react"
import { ComposerPrimitive } from "@assistant-ui/react"
import { Button } from "../../../components/ui/button"

export function ChatComposer({ ready, isRunning }: { ready: boolean; isRunning: boolean }) {
    return (
        <div className="composer-area">
            <ComposerPrimitive.Root className="composer-box">
                <ComposerPrimitive.Input
                    className="composer-input"
                    rows={1}
                    placeholder={
                        ready
                            ? "Write your message..."
                            : "Connect to send a message"
                    }
                    aria-label="Write your message"
                    disabled={!ready || isRunning}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault()
                            if (ready && !isRunning) event.currentTarget.form?.requestSubmit()
                        }
                    }}
                />
                <ComposerPrimitive.Send asChild>
                    <Button
                        className="send-button"
                        size="icon"
                        aria-label="Send message"
                        disabled={!ready || isRunning}
                    >
                        <ArrowUp size={18} />
                    </Button>
                </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
            <p className="composer-hint">
                Sends plain text unchanged over Socket.IO. Raw server replies
                appear as bubbles.
            </p>
        </div>
    )
}
