import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    DEFAULT_WS_URL,
    DEFAULT_WS_SUBPROTOCOL,
    type ConnectionStatus,
    type SocketEvent,
    WebSocketSource,
} from "@/lib/messaging/websocket-source"
import type { MessageSource } from "@/lib/messaging/types"
import { SocketTrafficLog } from "./socket-traffic-log"

export type ConnectionConsoleProps = {
    status: ConnectionStatus
    events: SocketEvent[]
    connect: WebSocketSource["connect"]
    disconnect: WebSocketSource["disconnect"]
    sendRaw: MessageSource["send"]
}

export function ConnectionConsole({
    status,
    events,
    connect,
    disconnect,
    sendRaw,
}: ConnectionConsoleProps) {
    const [url, setUrl] = useState(DEFAULT_WS_URL)
    const [subprotocol, setSubprotocol] = useState(DEFAULT_WS_SUBPROTOCOL)
    const [payload, setPayload] = useState("hello")

    return (
        <section
            className="connection-console"
            aria-label="WebSocket connection test"
        >
            <div className="console-title">
                <span className={`console-indicator status-dot--${status}`} />
                <strong>WebSocket test</strong>
                <span>{status}</span>
            </div>
            <Label className="console-label" htmlFor="socket-url">
                Server URL
            </Label>
            <div className="console-control-row">
                <Input
                    id="socket-url"
                    className="console-input"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                />
                {status === "connected" || status === "connecting" ? (
                    <Button variant="outline" size="sm" onClick={disconnect}>
                        Disconnect
                    </Button>
                ) : (
                    <Button size="sm" onClick={() => connect(url, subprotocol)}>
                        Connect
                    </Button>
                )}
            </div>
            <Label className="console-label" htmlFor="socket-subprotocol">
                WebSocket subprotocol (optional)
            </Label>
            <Input
                id="socket-subprotocol"
                className="console-input"
                value={subprotocol}
                onChange={(event) => setSubprotocol(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="Leave blank for no subprotocol"
            />
            <Label className="console-label" htmlFor="socket-payload">
                Exact payload to send
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
                    disabled={status !== "connected" || !payload}
                    onClick={() => void sendRaw(payload).catch(() => {})}
                >
                    Send raw payload
                </Button>
                <span>Chat composer sends plain text.</span>
            </div>
            <SocketTrafficLog events={events} />
        </section>
    )
}
