import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type {
    ConnectionState,
    SocketEvent,
} from "@/lib/messaging/types"
import { SocketTrafficLog } from "./socket-traffic-log"

export type ConnectionConsoleProps = {
    state: ConnectionState
    isRunning: boolean
    events: SocketEvent[]
    connect: () => Promise<void>
    restart: () => Promise<void>
    disconnect: () => void
    sendTest: (text: string) => Promise<void>
}

export function ConnectionConsole({
    state,
    isRunning,
    events,
    connect,
    restart,
    disconnect,
    sendTest,
}: ConnectionConsoleProps) {
    const [payload, setPayload] = useState("hello")
    const status = state.status
    const busy = status === "requesting-token" || status === "connecting" || status === "authenticating"

    return (
        <section
            className="connection-console"
            aria-label="Socket.IO connection test"
        >
            <div className="console-title">
                <span className={`console-indicator status-dot--${status}`} />
                <strong>Socket.IO test</strong>
                <span>{status}</span>
            </div>
            <Label className="console-label" htmlFor="socket-payload">
                Test message
            </Label>
            <Textarea
                id="socket-payload"
                className="console-payload"
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                rows={2}
                spellCheck={false}
            />
            <div className="console-actions">
                <Button
                    size="sm"
                    disabled={!state.ready || isRunning || !payload.trim()}
                    onClick={() => void sendTest(payload).catch(() => {})}
                >
                    Send test message
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void restart().catch(() => {})}>
                    Restart
                </Button>
                {state.ready ? (
                    <Button variant="ghost" size="sm" onClick={disconnect}>
                        Disconnect
                    </Button>
                ) : (
                    <Button size="sm" disabled={busy} onClick={() => void connect().catch(() => {})}>
                        {busy ? "Connecting..." : "Connect"}
                    </Button>
                )}
            </div>
            {state.error && <p className="console-error" role="alert">{state.error}</p>}
            {state.expiresAtUnixSeconds && (
                <p className="console-expiry" aria-live="polite">
                    Session expires {new Date(state.expiresAtUnixSeconds * 1000).toLocaleTimeString()}.
                </p>
            )}
            <SocketTrafficLog events={events} />
        </section>
    )
}
