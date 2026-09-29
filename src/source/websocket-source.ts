import type { IncomingMessage, MessageSource } from './types'

export const DEFAULT_WS_URL = 'ws://ubicompsystem.no-ip.org:3000'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type SocketEvent = {
  type: 'status' | 'sent' | 'received' | 'error'
  detail: string
  at: Date
  status?: ConnectionStatus
}

// Protocol-agnostic proof of concept: text is sent unchanged and inbound data
// is shown unchanged. No chatbot-specific JSON shape is assumed.
export class WebSocketSource implements MessageSource {
  private socket: WebSocket | null = null
  private generation = 0
  private messageListeners = new Set<(message: IncomingMessage) => void>()
  private eventListeners = new Set<(event: SocketEvent) => void>()

  subscribe(onMessage: (message: IncomingMessage) => void) {
    this.messageListeners.add(onMessage)
    return () => { this.messageListeners.delete(onMessage) }
  }

  subscribeEvents(onEvent: (event: SocketEvent) => void) {
    this.eventListeners.add(onEvent)
    return () => { this.eventListeners.delete(onEvent) }
  }

  private emit(type: SocketEvent['type'], detail: string, status?: ConnectionStatus) {
    const event = { type, detail, status, at: new Date() }
    this.eventListeners.forEach((listener) => listener(event))
  }

  connect(url: string) {
    this.disconnect()
    const endpoint = url.trim()
    if (!/^wss?:\/\//i.test(endpoint)) {
      this.emit('error', 'Use a ws:// or wss:// URL.', 'error')
      return
    }
    if (window.location.protocol === 'https:' && endpoint.startsWith('ws://')) {
      this.emit('error', 'This page uses HTTPS. Browsers block insecure ws:// connections; request a wss:// endpoint.', 'error')
      return
    }

    const generation = ++this.generation
    this.emit('status', `Connecting to ${endpoint}`, 'connecting')
    try {
      const socket = new WebSocket(endpoint)
      socket.binaryType = 'arraybuffer'
      this.socket = socket

      socket.addEventListener('open', () => {
        if (generation !== this.generation) return
        this.emit('status', 'Connected. WebSocket handshake succeeded.', 'connected')
      })
      socket.addEventListener('message', (event: MessageEvent) => {
        if (generation !== this.generation) return
        const raw = typeof event.data === 'string'
          ? event.data
          : `[binary message: ${event.data?.byteLength ?? 'unknown'} bytes]`
        this.emit('received', raw)
        this.messageListeners.forEach((listener) => listener({
          id: crypto.randomUUID(), text: raw, createdAt: new Date(),
        }))
      })
      socket.addEventListener('error', () => {
        if (generation !== this.generation) return
        this.emit('error', 'WebSocket error. The browser may not reveal the server reason; check its developer console and server logs.', 'error')
      })
      socket.addEventListener('close', (event: CloseEvent) => {
        if (generation !== this.generation) return
        this.socket = null
        this.emit('status', `Disconnected (code ${event.code}${event.reason ? `: ${event.reason}` : ''}).`, 'disconnected')
      })
    } catch (error) {
      this.socket = null
      this.emit('error', error instanceof Error ? error.message : 'Could not create WebSocket connection.', 'error')
    }
  }

  disconnect() {
    this.generation += 1
    if (this.socket) {
      this.socket.close(1000, 'Demo disconnect')
      this.socket = null
      this.emit('status', 'Disconnected by user.', 'disconnected')
    }
  }

  async send(text: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.emit('error', 'Message not sent. Connect first.')
      throw new Error('WebSocket is not connected')
    }
    this.socket.send(text)
    this.emit('sent', text)
  }
}
