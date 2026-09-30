import { useState } from "react"
import { ChevronDown, MessageCircle, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatRuntimeController } from "../runtime/chat-runtime-provider"
import { ChatThread } from "./chat-thread"

export function ChatWidget({
    isRunning,
    status,
}: Pick<ChatRuntimeController, "isRunning" | "status">) {
    const [open, setOpen] = useState(true)

    return (
        <div className="widget-dock">
            {open && (
                <section className="chat-panel" aria-label="Hotel chat">
                    <header className="chat-header">
                        <div className="chat-brand">
                            <Sparkles size={21} strokeWidth={1.8} />
                        </div>
                        <div className="chat-header-copy">
                            <strong>The Meridian</strong>
                            <span>
                                <span
                                    className={`status-dot status-dot--${status}`}
                                />{" "}
                                WebSocket · {status}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="close-button"
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                        >
                            <X size={18} />
                        </Button>
                    </header>
                    <div className="chat-intro">
                        <span className="chat-eyebrow">WE'RE HERE TO HELP</span>
                        <h2>Your stay, made simple.</h2>
                        <p>
                            Connect below, then send a test message. Server
                            messages appear here as received.
                        </p>
                    </div>
                    <ChatThread isRunning={isRunning} status={status} />
                </section>
            )}
            <Button
                className="widget-launcher"
                onClick={() => setOpen((value) => !value)}
                aria-label={open ? "Minimize chat" : "Open chat"}
            >
                {open ? <ChevronDown size={22} /> : <MessageCircle size={24} />}
                <span>{open ? "Minimize" : "Chat with us"}</span>
            </Button>
        </div>
    )
}
