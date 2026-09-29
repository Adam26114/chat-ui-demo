import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { ArrowDown, ArrowUp, BedDouble, Check, ChevronDown, Clock3, MapPin, MessageCircle, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { DEFAULT_WS_URL, WebSocketSource, type ConnectionStatus, type SocketEvent } from './source/websocket-source'
import type { ChatMessage } from './source/types'

type DemoController = {
  isRunning: boolean
  status: ConnectionStatus
  events: SocketEvent[]
  connect: (url: string) => void
  disconnect: () => void
  sendRaw: (payload: string) => Promise<void>
}

function toUiMessage(message: ChatMessage): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    createdAt: message.createdAt,
    content: [{ type: 'text', text: message.text }],
  }
}

function ChatRuntime({ children }: { children: (controller: DemoController) => ReactNode }) {
  const [source] = useState(() => new WebSocketSource())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [events, setEvents] = useState<SocketEvent[]>([])

  useEffect(() => {
    const unsubscribeMessages = source.subscribe((incoming) => {
      setMessages((current) => [...current, { ...incoming, role: 'assistant' }])
      setIsRunning(false)
    })
    const unsubscribeEvents = source.subscribeEvents((event) => {
      setEvents((current) => [...current.slice(-79), event])
      if (event.status) setStatus(event.status)
      if (event.status === 'disconnected' || event.status === 'error') setIsRunning(false)
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

  const onNew = useCallback(async (message: AppendMessage) => {
    const text = message.content.find((part) => part.type === 'text')?.text.trim()
    if (!text) return

    try {
      await source.send(text)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: 'user', text, createdAt: new Date(),
      }])
      setIsRunning(true)
    } catch {
      // The source logs the failure. Keep an unsent message out of chat history.
    }
  }, [source])

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    onNew,
    convertMessage: toUiMessage,
  })

  const controller: DemoController = {
    isRunning, status, events,
    connect: (url) => source.connect(url),
    disconnect: () => source.disconnect(),
    sendRaw: (payload) => source.send(payload),
  }

  return <AssistantRuntimeProvider runtime={runtime}>{children(controller)}</AssistantRuntimeProvider>
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="message-row message-row--user">
      <div className="message-bubble message-bubble--user">
        <MessagePrimitive.Parts>
          {({ part }) => part.type === 'text' ? <MessagePartPrimitive.Text /> : null}
        </MessagePrimitive.Parts>
      </div>
      <span className="message-caption">You <Check size={12} aria-hidden="true" /></span>
    </MessagePrimitive.Root>
  )
}

function StaffMessage() {
  return (
    <MessagePrimitive.Root className="message-row message-row--staff">
      <div className="message-avatar"><Sparkles size={17} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="message-column">
        <span className="staff-name">Server response</span>
        <div className="message-bubble message-bubble--staff">
          <MessagePrimitive.Parts>
            {({ part }) => part.type === 'text' ? <MessagePartPrimitive.Text /> : null}
          </MessagePrimitive.Parts>
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

function ChatThread({ isRunning, status }: Pick<DemoController, 'isRunning' | 'status'>) {
  return (
    <ThreadPrimitive.Root className="chat-thread">
      <ThreadPrimitive.Viewport className="message-viewport" autoScroll>
        <p className="conversation-date">TODAY</p>
        <ThreadPrimitive.Empty><p className="thread-empty">Messages from the server will appear here.</p></ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages>
          {({ message }) => message.role === 'user' ? <UserMessage /> : <StaffMessage />}
        </ThreadPrimitive.Messages>
        {isRunning && (
          <div className="typing-row" aria-live="polite">
            <div className="message-avatar"><Sparkles size={17} aria-hidden="true" /></div>
            <div className="typing-bubble"><i /><i /><i /><span className="sr-only">Replying</span></div>
          </div>
        )}
        <ThreadPrimitive.ScrollToBottom className="scroll-bottom" aria-label="Scroll to latest message">
          <ArrowDown size={16} />
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>
      <div className="composer-area">
        <ComposerPrimitive.Root className="composer-box">
          <ComposerPrimitive.Input className="composer-input" rows={1} placeholder={status === 'connected' ? 'Write your message...' : 'Connect to send a message'} aria-label="Write your message" />
          <ComposerPrimitive.Send asChild>
            <Button className="send-button" size="icon" aria-label="Send message"><ArrowUp size={18} /></Button>
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
        <p className="composer-hint">Sends plain text unchanged over WebSocket. Raw server replies appear as bubbles.</p>
      </div>
    </ThreadPrimitive.Root>
  )
}

function ChatWidget({ isRunning, status }: Pick<DemoController, 'isRunning' | 'status'>) {
  const [open, setOpen] = useState(true)
  return (
    <div className="widget-dock">
      {open && (
        <section className="chat-panel" aria-label="Hotel chat">
          <header className="chat-header">
            <div className="chat-brand"><Sparkles size={21} strokeWidth={1.8} /></div>
            <div className="chat-header-copy">
              <strong>The Meridian</strong>
              <span><span className={`status-dot status-dot--${status}`} /> WebSocket · {status}</span>
            </div>
            <Button variant="ghost" size="icon" className="close-button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></Button>
          </header>
          <div className="chat-intro">
            <span className="chat-eyebrow">WE'RE HERE TO HELP</span>
            <h2>Your stay, made simple.</h2>
            <p>Connect below, then send a test message. Server messages appear here as received.</p>
          </div>
          <ChatThread isRunning={isRunning} status={status} />
        </section>
      )}
      <Button className="widget-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Minimize chat' : 'Open chat'}>
        {open ? <ChevronDown size={22} /> : <MessageCircle size={24} />}
        <span>{open ? 'Minimize' : 'Chat with us'}</span>
      </Button>
    </div>
  )
}

function ConnectionConsole({ status, events, connect, disconnect, sendRaw }: DemoController) {
  const [url, setUrl] = useState(DEFAULT_WS_URL)
  const [payload, setPayload] = useState('hello')

  return (
    <section className="connection-console" aria-label="WebSocket connection test">
      <div className="console-title"><span className={`console-indicator status-dot--${status}`} /><strong>WebSocket test</strong><span>{status}</span></div>
      <label className="console-label" htmlFor="socket-url">Server URL</label>
      <div className="console-control-row">
        <input id="socket-url" className="console-input" value={url} onChange={(event) => setUrl(event.target.value)} spellCheck={false} autoComplete="off" />
        {status === 'connected' || status === 'connecting'
          ? <Button variant="outline" size="sm" onClick={disconnect}>Disconnect</Button>
          : <Button size="sm" onClick={() => connect(url)}>Connect</Button>}
      </div>
      <label className="console-label" htmlFor="socket-payload">Exact payload to send</label>
      <textarea id="socket-payload" className="console-payload" value={payload} onChange={(event) => setPayload(event.target.value)} rows={2} spellCheck={false} />
      <div className="console-actions">
        <Button size="sm" disabled={status !== 'connected' || !payload} onClick={() => void sendRaw(payload).catch(() => {})}>Send raw payload</Button>
        <span>Chat composer sends plain text.</span>
      </div>
      <div className="console-log" role="log" aria-label="WebSocket traffic">
        {events.length === 0 && <p className="console-empty">Click Connect to test the handshake. Traffic will appear here.</p>}
        {events.map((event, index) => (
          <div className={`console-event console-event--${event.type}`} key={`${event.at.getTime()}-${index}`}>
            <span>{event.at.toLocaleTimeString()} · {event.type}</span>
            <pre>{event.detail}</pre>
          </div>
        ))}
      </div>
    </section>
  )
}

function DemoPage(controller: DemoController) {
  return (
    <div className="demo-page">
      <div className="site-topline">THE MERIDIAN <span>HOTEL & RESIDENCES</span></div>
      <nav className="site-nav" aria-label="Demo website navigation">
        <span className="wordmark">the meridian<span className="wordmark-star">✦</span></span>
        <div className="nav-links"><span>Rooms & suites</span><span>Dining</span><span>Experiences</span></div>
        <Button variant="outline" size="sm">Explore stays <ArrowUp size={14} className="nav-arrow" /></Button>
      </nav>
      <main className="hero">
        <div className="hero-content">
          <p className="kicker">WELCOME TO THE MERIDIAN</p>
          <h1>A quieter way<br />to <em>stay.</em></h1>
          <p className="hero-description">Thoughtful stays, personal service, and a place to slow down. This sample page shows how the chatbox floats over a WordPress hotel site.</p>
          <div className="hero-actions">
            <Button>Discover our rooms <ArrowUp size={16} className="nav-arrow" /></Button>
            <span className="hero-note"><span className="hero-note-line" /> A stay worth remembering</span>
          </div>
          <ConnectionConsole {...controller} />
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-sun" /><div className="art-arch art-arch--rear" /><div className="art-arch art-arch--front" /><div className="art-floor" /><div className="art-vase" /><div className="art-leaf art-leaf--one" /><div className="art-leaf art-leaf--two" /></div>
      </main>
      <div className="site-benefits"><span><BedDouble size={19} /> Considered comfort</span><span><MapPin size={19} /> An exceptional location</span><span><ShieldCheck size={19} /> Here for every detail</span><span><Clock3 size={19} /> At your convenience</span></div>
      <div className="demo-label"><span className="demo-label-dot" /> WEBSOCKET POC <span>assistant-ui primitives + custom UI</span></div>
      <ChatWidget isRunning={controller.isRunning} status={controller.status} />
    </div>
  )
}

export default function App() {
  return <ChatRuntime>{(controller) => <DemoPage {...controller} />}</ChatRuntime>
}
