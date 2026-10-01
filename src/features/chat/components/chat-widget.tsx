import { useState } from "react"
import { ChevronDown, MessageCircle, Sparkles, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { ChatThread } from "./chat-thread"

export type ChatWidgetProps = {
    isRunning: boolean
    status: import("../../../lib/messaging/types").ConnectionStatus
    ready: boolean
    error: string | null
    expiresAtUnixSeconds: number | null
    title?: string
    avatar?: string
    onRestart: () => void | Promise<void>
    hasRuntime?: boolean
}

function safeAvatar(value?: string) {
    if (!value) return null
    try {
        const url = new URL(value)
        return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password ? url.toString() : null
    } catch {
        return null
    }
}

export function ChatWidget({
    isRunning,
    status,
    ready,
    error,
    expiresAtUnixSeconds,
    title,
    avatar,
    onRestart,
    hasRuntime = true,
}: ChatWidgetProps) {
    const [open, setOpen] = useState(true)
    const displayTitle = title?.trim() || "The Meridian"
    const avatarUrl = safeAvatar(avatar)
    const isUnavailable = !hasRuntime
    const restart = () => {
        void Promise.resolve().then(onRestart).catch(() => undefined)
    }

    return (
        <div className="widget-dock">
            {open && (
                <section className="chat-panel" aria-label="Hotel chat">
                    <header className="chat-header">
                        <div className="chat-brand">
                             {avatarUrl ? <img src={avatarUrl} alt="" /> : <Sparkles size={21} strokeWidth={1.8} />}
                        </div>
                        <div className="chat-header-copy">
                             <strong>{displayTitle}</strong>
                             <span>
                                <span
                                    className={`status-dot status-dot--${status}`}
                                />{" "}
                                 Socket.IO · {status}
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
                             {isUnavailable ? "The assistant is unavailable until the public chat settings are configured." : "Connect below, then send a test message. Server messages appear here as received."}
                        </p>
                        {error && <p className="chat-error" role="alert">{hasRuntime ? "Authentication or connection is unavailable: " : ""}{error}</p>}
                        {status === "expired" && <p className="chat-error" role="alert">Your chat session expired. Restart to request a fresh session.</p>}
                        {expiresAtUnixSeconds && status !== "expired" && <p className="chat-expiry">Session expires {new Date(expiresAtUnixSeconds * 1000).toLocaleTimeString()}.</p>}
                        {!isUnavailable && (status === "expired" || status === "error") && (
                                <Button className="chat-status-action" variant="outline" size="sm" onClick={restart}>
                                Restart connection
                            </Button>
                        )}
                    </div>
                    {isUnavailable ? (
                        <div className="chat-unavailable">
                            <Button variant="outline" onClick={restart}>Restart connection</Button>
                        </div>
                    ) : (
                        <ChatThread isRunning={isRunning} status={status} ready={ready} />
                    )}
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
