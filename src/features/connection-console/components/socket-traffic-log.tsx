import type { SocketEvent } from "@/lib/messaging/types"

const jwtPattern = /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/g

function safeDetail(detail: string) {
    return detail.replace(jwtPattern, "[redacted token]").slice(0, 500)
}

export function SocketTrafficLog({ events }: { events: SocketEvent[] }) {
    return (
        <div className="console-log" role="log" aria-label="Socket.IO traffic">
            {events.length === 0 && (
                <p className="console-empty">
                     Connect to test the handshake. Traffic will appear
                    here.
                </p>
            )}
            {events.map((event, index) => (
                <div
                    className={`console-event console-event--${event.type}`}
                    key={`${event.at.getTime()}-${index}`}
                >
                    <span>
                        {event.at.toLocaleTimeString()} · {event.type}
                    </span>
                    <pre>{safeDetail(event.detail)}</pre>
                </div>
            ))}
        </div>
    )
}
