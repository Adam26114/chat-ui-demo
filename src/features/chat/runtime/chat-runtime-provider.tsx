import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react"
import {
    AssistantRuntimeProvider,
    useExternalStoreRuntime,
    type AppendMessage,
    type ThreadMessageLike,
} from "@assistant-ui/react"
import {
    SocketIOMessageSource,
    type ConnectionState,
    type ConnectionStatus,
    type SocketEvent,
    type SocketIOConfiguration,
    type SocketTrigger,
} from "../../../lib/messaging/socketio-source"
import type { ChatMessage } from "../../../lib/messaging/types"

export type ChatRuntimeController = {
    state: ConnectionState
    status: ConnectionStatus
    ready: boolean
    error: string | null
    expiresAtUnixSeconds: number | null
    isRunning: boolean
    events: SocketEvent[]
    connect: () => Promise<void>
    restart: () => Promise<void>
    disconnect: () => void
    expireSession: () => void
    sendTest: (text: string) => Promise<void>
    login: () => Promise<void>
    logout: () => Promise<void>
}

export type ChatRuntimeProviderProps = {
    configuration: SocketIOConfiguration
    title?: string
    children: ReactNode | ((controller: ChatRuntimeController) => ReactNode)
    onTrigger?: (trigger: SocketTrigger) => void
    sourceFactory?: (
        configuration?: SocketIOConfiguration
    ) => SocketIOMessageSource
}

function toUiMessage(message: ChatMessage): ThreadMessageLike {
    return {
        id: message.id,
        role: message.role,
        createdAt: message.createdAt,
        content: [{ type: "text", text: message.text }],
    }
}

const SAFE_ERRORS = new Set([
    "Chat is not ready.",
    "Message must be non-empty text.",
    "A message is already being sent.",
    "Connection superseded",
    "Disconnected",
    "Restarted",
    "Session expired",
    "Session expired.",
    "Connection requires restart",
    "Chat configuration is required",
    "Connection failed.",
    "Authentication failed.",
    "Authentication timed out.",
    "Connection timed out.",
    "Reconnection timed out.",
    "Authentication cancelled",
    "Authentication request timed out.",
    "Authentication superseded",
    "Message could not be sent.",
    "Connection restart failed.",
])

const safeError = (error: unknown, fallback: string) =>
    error instanceof Error && SAFE_ERRORS.has(error.message)
        ? error.message
        : fallback

export function ChatRuntimeProvider({
    configuration,
    title,
    children,
    onTrigger,
    sourceFactory,
}: ChatRuntimeProviderProps) {
    const [source] = useState(() =>
        (sourceFactory ?? (() => new SocketIOMessageSource()))()
    )
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [state, setState] = useState<ConnectionState>(source.getState())
    const [events, setEvents] = useState<SocketEvent[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const stateRef = useRef(state)
    const titleRef = useRef(title)
    const onTriggerRef = useRef(onTrigger)
    const previousIdentityEpoch = useRef<number | undefined>(undefined)
    const sendGeneration = useRef(0)
    const sendPending = useRef(false)
    useLayoutEffect(() => {
        titleRef.current = title
        onTriggerRef.current = onTrigger
    }, [title, onTrigger])

    const {
        serverUrl,
        tokenEndpoint,
        getAuthToken,
        context: {
            app_key,
            customer_id,
            property_code,
            booking_link,
            login_link,
            payment_link,
            x_auth_token,
        },
    } = configuration

    useEffect(() => {
        let active = true
        const unsubscribeMessages = source.subscribe((incoming) => {
            if (!active) return
            setMessages((current) => [
                ...current,
                {
                    ...incoming,
                    role: "assistant",
                    text: incoming.text.replaceAll(
                        "group_name",
                        titleRef.current ?? ""
                    ),
                },
            ])
            sendPending.current = false
            setIsRunning(false)
            setLocalError(null)
        })
        const unsubscribeState = source.subscribeState((next) => {
            if (!active) return
            stateRef.current = next
            setState(next)
            if (!next.ready) {
                sendGeneration.current++
                sendPending.current = false
                setIsRunning(false)
            }
            if (next.error) setLocalError(null)
        })
        const unsubscribeEvents = source.subscribeEvents((event) => {
            if (active) setEvents((current) => [...current.slice(-199), event])
        })
        const unsubscribeTriggers = source.subscribeTriggers((trigger) => {
            if (active) onTriggerRef.current?.(trigger)
        })

        source.configure({
            serverUrl,
            tokenEndpoint,
            getAuthToken,
            context: {
                app_key,
                customer_id,
                property_code,
                booking_link,
                login_link,
                payment_link,
                x_auth_token,
            },
        })
        const configuredState = source.getState()
        stateRef.current = configuredState
        setState(configuredState)
        if (previousIdentityEpoch.current !== configuredState.identityEpoch) {
            previousIdentityEpoch.current = configuredState.identityEpoch
            setMessages([])
            setEvents([])
        }
        setLocalError(null)
        void source.connect().catch((error) => {
            if (active) setLocalError(safeError(error, "Connection failed."))
        })

        return () => {
            active = false
            sendGeneration.current++
            sendPending.current = false
            unsubscribeMessages()
            unsubscribeState()
            unsubscribeEvents()
            unsubscribeTriggers()
            source.disconnect()
        }
    }, [
        source,
        serverUrl,
        tokenEndpoint,
        getAuthToken,
        app_key,
        customer_id,
        property_code,
        booking_link,
        login_link,
        payment_link,
        x_auth_token,
    ])

    const send = useCallback(
        async (text: string) => {
            const value = text
            const current = stateRef.current
            let reason = "Chat is not ready."
            if (!value.trim()) reason = "Message must be non-empty text."
            else if (sendPending.current || isRunning)
                reason = "A message is already being sent."
            else if (!current.ready) reason = "Chat is not ready."
            if (reason !== "Chat is not ready." || !current.ready) {
                setLocalError(reason)
                throw new Error(reason)
            }
            sendPending.current = true
            setLocalError(null)
            setIsRunning(true)
            const generation = sendGeneration.current
            const snapshot = current
            try {
                await source.send(value)
                const latest = source.getState()
                if (
                    generation !== sendGeneration.current ||
                    latest !== snapshot ||
                    !latest.ready
                )
                    throw new Error("Connection superseded")
                setMessages((items) => [
                    ...items,
                    {
                        id: crypto.randomUUID(),
                        role: "user",
                        text: value,
                        createdAt: new Date(),
                    },
                ])
            } catch (error) {
                const message = safeError(error, "Message could not be sent.")
                if (generation === sendGeneration.current) {
                    sendPending.current = false
                    setIsRunning(false)
                    setLocalError(message)
                }
                throw new Error(message)
            } finally {
                if (
                    generation === sendGeneration.current &&
                    !stateRef.current.ready
                ) {
                    sendPending.current = false
                    setIsRunning(false)
                }
            }
        },
        [isRunning, source]
    )

    const onNew = useCallback(
        (message: AppendMessage) => {
            const text =
                message.content.find((part) => part.type === "text")?.text ?? ""
            return send(text)
        },
        [send]
    )
    const runtime = useExternalStoreRuntime({
        messages,
        isRunning,
        onNew,
        convertMessage: toUiMessage,
    })
    const controller: ChatRuntimeController = {
        state,
        status: state.status,
        ready: state.ready,
        error: localError ?? state.error,
        expiresAtUnixSeconds: state.expiresAtUnixSeconds,
        isRunning,
        events,
        connect: () =>
            source.connect().catch((error) => {
                throw new Error(safeError(error, "Connection failed."))
            }),
        restart: () => {
            sendGeneration.current++
            sendPending.current = false
            setIsRunning(false)
            return source.restart().catch((error) => {
                throw new Error(safeError(error, "Connection restart failed."))
            })
        },
        disconnect: () => {
            sendGeneration.current++
            sendPending.current = false
            setIsRunning(false)
            source.disconnect()
        },
        expireSession: () => {
            sendGeneration.current++
            sendPending.current = false
            setIsRunning(false)
            source.expireSession()
        },
        sendTest: send,
        login: () =>
            source.login().catch((error) => {
                throw new Error(safeError(error, "Message could not be sent."))
            }),
        logout: () =>
            source.logout().catch((error) => {
                throw new Error(safeError(error, "Message could not be sent."))
            }),
    }
    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {typeof children === "function" ? children(controller) : children}
        </AssistantRuntimeProvider>
    )
}
