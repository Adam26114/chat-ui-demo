import type { SocketEvent } from "@/lib/messaging/websocket-source"

export function SocketTrafficLog({ events }: { events: SocketEvent[] }) {
    return (
        <div className="console-log" role="log" aria-label="WebSocket traffic">
            {events.length === 0 && (
                <p className="console-empty">
                    Click Connect to test the handshake. Traffic will appear
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
                    <pre>{event.detail}</pre>
                </div>
            ))}
        </div>
    )
}
