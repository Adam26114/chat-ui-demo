export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: Date
}

export type IncomingMessage = Pick<ChatMessage, 'id' | 'text' | 'createdAt'>

// UI-independent boundary. Incoming messages can arrive at any time, including
// live-agent messages that were not triggered by the most recent user send.
export interface MessageSource {
  subscribe(onMessage: (message: IncomingMessage) => void): () => void
  send(text: string): Promise<void>
}
