import { Sparkles } from "lucide-react"
import { MessagePrimitive, useMessagePartText } from "@assistant-ui/react"
import ReactMarkdown from "react-markdown"

export function safeChatUrl(value: string | null | undefined) {
    if (!value) return null
    const trimmed = value.trim()
    if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) return trimmed
    const compact = trimmed.replace(/\s+/g, "")
    let decoded = compact
    try {
        decoded = decodeURIComponent(compact)
    } catch {
        // A malformed escape is not a reason to make a link navigable.
    }
    if (/^(?:javascript|data):/i.test(decoded)) return null
    try {
        const url = new URL(compact)
        if (url.username || url.password) return null
        return ["http:", "https:", "mailto:"].includes(url.protocol.toLowerCase()) ? url.toString() : null
    } catch {
        return null
    }
}

function SafeServerText() {
    const part = useMessagePartText()
    return (
        <ReactMarkdown
            skipHtml
            components={{
                a: ({ href, children }) => {
                    const safe = safeChatUrl(href)
                    if (!safe) return <>{children}</>
                    const external = safe.startsWith("http:") || safe.startsWith("https:")
                    return <a href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>
                },
                img: ({ alt }) => <span role="img" aria-label={alt || "Image omitted"}>{alt || "Image omitted"}</span>,
            }}
        >
            {part.text}
        </ReactMarkdown>
    )
}

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
                                <SafeServerText />
                            ) : null
                        }
                    </MessagePrimitive.Parts>
                </div>
            </div>
        </MessagePrimitive.Root>
    )
}
