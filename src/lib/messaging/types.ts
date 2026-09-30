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
