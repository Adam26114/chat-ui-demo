import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
    AssistantRuntimeProvider,
    useExternalStoreRuntime,
    type AppendMessage,
    type ThreadMessageLike,
} from "@assistant-ui/react"
import {
    WebSocketSource,
    type ConnectionStatus,
    type SocketEvent,
} from "@/lib/messaging/websocket-source"
import type { ChatMessage } from "@/lib/messaging/types"

export type ChatRuntimeController = {
    isRunning: boolean
    status: ConnectionStatus
    events: SocketEvent[]
    connect: WebSocketSource["connect"]
    disconnect: WebSocketSource["disconnect"]
    sendRaw: (
        payload: Parameters<WebSocketSource["send"]>[0]
    ) => ReturnType<WebSocketSource["send"]>
}

function toUiMessage(message: ChatMessage): ThreadMessageLike {
    return {
        id: message.id,
        role: message.role,
        createdAt: message.createdAt,
        content: [{ type: "text", text: message.text }],
    }
}

export function ChatRuntimeProvider({
    children,
}: {
    children: (controller: ChatRuntimeController) => ReactNode
}) {
    const [source] = useState(() => new WebSocketSource())
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [status, setStatus] = useState<ConnectionStatus>("disconnected")
    const [events, setEvents] = useState<SocketEvent[]>([])

    useEffect(() => {
        const unsubscribeMessages = source.subscribe((incoming) => {
            setMessages((current) => [
                ...current,
                { ...incoming, role: "assistant" },
            ])
            setIsRunning(false)
        })
        const unsubscribeEvents = source.subscribeEvents((event) => {
            setEvents((current) => [...current.slice(-79), event])
            if (event.status) setStatus(event.status)
            if (event.status === "disconnected" || event.status === "error")
                setIsRunning(false)
        })
        return () => {
            unsubscribeMessages()
            unsubscribeEvents()
            source.disconnect()
        }
    }, [source])

    useEffect(() => {
        if (!isRunning) return
        const timeout = window.setTimeout(() => setIsRunning(false), 15000)
        return () => window.clearTimeout(timeout)
    }, [isRunning])

    const onNew = useCallback(
        async (message: AppendMessage) => {
            const text = message.content
                .find((part) => part.type === "text")
                ?.text.trim()
            if (!text) return
            try {
                await source.send(text)
                setMessages((current) => [
                    ...current,
                    {
                        id: crypto.randomUUID(),
                        role: "user",
                        text,
                        createdAt: new Date(),
                    },
                ])
                setIsRunning(true)
            } catch {
                // The source logs failures; unsent messages stay out of history.
            }
        },
        [source]
    )

    const runtime = useExternalStoreRuntime({
        messages,
        isRunning,
        onNew,
        convertMessage: toUiMessage,
    })
    const controller: ChatRuntimeController = {
        isRunning,
        status,
        events,
        connect: (url, subprotocol) => source.connect(url, subprotocol),
        disconnect: () => source.disconnect(),
        sendRaw: (payload) => source.send(payload),
    }

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children(controller)}
        </AssistantRuntimeProvider>
    )
}
