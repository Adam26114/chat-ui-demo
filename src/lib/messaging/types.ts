export type ChatMessage = {
    id: string
    role: "user" | "assistant"
    text: string
    createdAt: Date
}

export type IncomingMessage = Pick<ChatMessage, "id" | "text" | "createdAt">

export interface MessageSource {
    subscribe(onMessage: (message: IncomingMessage) => void): () => void
    send(text: string): Promise<void>
}

export type { AuthSession, ChatSessionContext, GetAuthToken } from "../../features/chat/types"
export type ConnectionStatus =
    | "disconnected"
    | "requesting-token"
    | "connecting"
    | "authenticating"
    | "ready"
    | "error"
    | "expired"
export type ConnectionState = {
    status: ConnectionStatus
    ready: boolean
    error: string | null
    expiresAtUnixSeconds: number | null
    identityEpoch: number
}
export type SocketIOConfiguration = {
    serverUrl: string
    tokenEndpoint?: string
    context: import("../../features/chat/types").ChatSessionContext
    getAuthToken?: import("../../features/chat/types").GetAuthToken
}
export type SocketEvent = {
    id: string
    type: string
    detail: string
    at: Date
    status?: ConnectionStatus | "connected"
}
export type SocketTrigger = { type: string; detail: string }
