import { io } from "socket.io-client"
import { createLocalTokenProvider, validateAuthSession } from "./chat-auth"
import { equalChatSessionContext } from "./chatbot-config"
import type { AuthSession, GetAuthToken } from "../../features/chat/types"
import type {
    IncomingMessage,
    MessageSource,
    ConnectionState,
    ConnectionStatus,
    SocketEvent,
    SocketIOConfiguration,
    SocketTrigger,
} from "./types"
export type {
    ConnectionState,
    ConnectionStatus,
    SocketEvent,
    SocketIOConfiguration,
    SocketTrigger,
} from "./types"

type Handler = (...args: any[]) => void
type SocketLike = {
    connected: boolean
    on: (event: string, fn: Handler) => void
    off: (event: string, fn?: Handler) => void
    emit: (event: string, ...args: any[]) => void
    connect: () => void
    disconnect: () => void
}
export type SocketFactory = (
    url: string,
    options: { autoConnect: false }
) => SocketLike
export type SocketIODependencies = {
    socketFactory?: SocketFactory
    now?: () => number
}
const MAX_MESSAGE = 256 * 1024
const isAuthError = (value: unknown) =>
    typeof value === "string" &&
    /invalid token|jwt token not found|server_restarted/i.test(value)
const isSlug = (value: string) => /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(value)
const cloneContext = (context: SocketIOConfiguration["context"]) => ({
    ...context,
})
const sameContext = equalChatSessionContext

export class SocketIOMessageSource implements MessageSource {
    private options: SocketIOConfiguration | null = null
    private socket: SocketLike | null = null
    private handlers = new Map<string, Handler>()
    private identityEpoch = 0
    private workGeneration = 0
    private authGeneration = 0
    private socketGeneration = 0
    private state: ConnectionState = Object.freeze({
        status: "disconnected",
        ready: false,
        error: null,
        expiresAtUnixSeconds: null,
        identityEpoch: 0,
    })
    private session: AuthSession | null = null
    private tokenRequest: Promise<AuthSession> | null = null
    private tokenAbort: AbortController | null = null
    private tokenTimeout: ReturnType<typeof setTimeout> | null = null
    private connectPromise: Promise<void> | null = null
    private connectResolve: (() => void) | null = null
    private connectReject: ((error: Error) => void) | null = null
    private authRetryTimer: ReturnType<typeof setTimeout> | null = null
    private authCapTimer: ReturnType<typeof setTimeout> | null = null
    private refreshTimer: ReturnType<typeof setTimeout> | null = null
    private listeners = new Set<(message: IncomingMessage) => void>()
    private stateListeners = new Set<(state: ConnectionState) => void>()
    private eventListeners = new Set<(event: SocketEvent) => void>()
    private triggerListeners = new Set<(trigger: SocketTrigger) => void>()
    private deps: Required<SocketIODependencies>
    constructor(
        options?: SocketIOConfiguration,
        dependencies: SocketIODependencies = {}
    ) {
        this.deps = {
            socketFactory:
                dependencies.socketFactory ??
                ((url, opts) => io(url, opts) as unknown as SocketLike),
            now: dependencies.now ?? (() => Math.floor(Date.now() / 1000)),
        }
        if (options) this.configure(options)
    }
    configure(options: SocketIOConfiguration) {
        const next = { ...options, context: cloneContext(options.context) }
        if (this.options && this.sameIdentity(this.options, next)) {
            this.options = next
            return
        }
        this.cancelWork(new Error("Connection superseded"))
        this.disposeSocket()
        this.identityEpoch++
        this.options = next
        this.session = null
        this.setState({
            status: "disconnected",
            ready: false,
            error: null,
            expiresAtUnixSeconds: null,
            identityEpoch: this.identityEpoch,
        })
    }
    private sameIdentity(a: SocketIOConfiguration, b: SocketIOConfiguration) {
        return (
            a.serverUrl === b.serverUrl &&
            a.tokenEndpoint === b.tokenEndpoint &&
            a.getAuthToken === b.getAuthToken &&
            sameContext(a.context, b.context)
        )
    }
    private setState(next: Partial<ConnectionState>) {
        this.state = Object.freeze({ ...this.state, ...next })
        this.stateListeners.forEach((listener) => listener(this.state))
    }
    getState(): ConnectionState {
        return this.state
    }
    subscribe(listener: (message: IncomingMessage) => void): () => void {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }
    subscribeState(listener: (state: ConnectionState) => void): () => void {
        this.stateListeners.add(listener)
        return () => {
            this.stateListeners.delete(listener)
        }
    }
    subscribeEvents(listener: (event: SocketEvent) => void): () => void {
        this.eventListeners.add(listener)
        return () => {
            this.eventListeners.delete(listener)
        }
    }
    subscribeTriggers(listener: (trigger: SocketTrigger) => void): () => void {
        this.triggerListeners.add(listener)
        return () => {
            this.triggerListeners.delete(listener)
        }
    }
    private event(type: string, detail: string, status?: ConnectionStatus) {
        this.eventListeners.forEach((listener) =>
            listener({
                id: crypto.randomUUID(),
                type,
                detail,
                at: new Date(),
                status,
            })
        )
    }
    private clearAuthTimers() {
        if (this.authRetryTimer) clearTimeout(this.authRetryTimer)
        if (this.authCapTimer) clearTimeout(this.authCapTimer)
        this.authRetryTimer = null
        this.authCapTimer = null
    }
    private clearRefresh() {
        if (this.refreshTimer) clearTimeout(this.refreshTimer)
        this.refreshTimer = null
    }
    private clearTokenTimer() {
        if (this.tokenTimeout) clearTimeout(this.tokenTimeout)
        this.tokenTimeout = null
    }
    private cancelWork(error: Error) {
        this.workGeneration++
        this.authGeneration++
        this.clearAuthTimers()
        this.clearRefresh()
        this.clearTokenTimer()
        this.tokenAbort?.abort()
        this.tokenAbort = null
        this.tokenRequest = null
        if (this.connectReject) this.connectReject(error)
        this.connectReject = null
        this.connectResolve = null
        this.connectPromise = null
    }
    private disposeSocket() {
        if (!this.socket) return
        const socket = this.socket
        this.socket = null
        this.socketGeneration++
        this.handlers.forEach((handler, name) => socket.off(name, handler))
        this.handlers.clear()
        socket.disconnect()
    }
    disconnect() {
        this.cancelWork(new Error("Disconnected"))
        this.disposeSocket()
        this.setState({ status: "disconnected", ready: false })
        this.event("status", "Disconnected by user.", "disconnected")
    }
    expireSession() {
        this.cancelWork(new Error("Session expired"))
        this.disposeSocket()
        this.session = null
        this.setState({
            status: "expired",
            ready: false,
            error: "Session expired.",
            expiresAtUnixSeconds: null,
        })
        this.event("expired", "Session expired.", "expired")
    }
    connect(): Promise<void> {
        if (!this.options)
            return Promise.reject(new Error("Chat configuration is required"))
        if (this.state.status === "expired" || this.state.status === "error")
            return Promise.reject(new Error("Connection requires restart"))
        if (this.state.ready) return Promise.resolve()
        if (this.connectPromise) return this.connectPromise
        const work = this.workGeneration
        const identity = this.identityEpoch
        this.connectPromise = new Promise<void>((resolve, reject) => {
            this.connectResolve = resolve
            this.connectReject = reject
            void this.start(work, identity).catch(() => {
                const safe = new Error("Connection failed.")
                if (this.isCurrent(work, identity)) {
                    this.disposeSocket()
                    this.session = null
                    this.cancelWork(safe)
                    this.setState({
                        status: "error",
                        ready: false,
                        error: "Connection failed.",
                    })
                    this.event("error", "Connection failed.", "error")
                }
                reject(safe)
            })
        })
        return this.connectPromise
    }
    private async start(work: number, identity: number) {
        const session = await this.getSession(work, identity)
        if (!this.isCurrent(work, identity))
            throw new Error("Connection superseded")
        if (!this.socket) {
            this.socket = this.deps.socketFactory(this.options!.serverUrl, {
                autoConnect: false,
            })
            this.socketGeneration++
            this.installHandlers(
                this.socket,
                work,
                identity,
                this.socketGeneration
            )
        }
        this.setState({
            status: "connecting",
            ready: false,
            error: null,
            expiresAtUnixSeconds: session.expiresAtUnixSeconds,
        })
        const socket = this.socket
        const generation = this.socketGeneration
        this.authCapTimer = setTimeout(
            () =>
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Connection timed out."
                ),
            30000
        )
        socket.connect()
    }
    private isCurrent(
        work: number,
        identity: number,
        socket?: SocketLike,
        generation?: number
    ) {
        return (
            work === this.workGeneration &&
            identity === this.identityEpoch &&
            (!socket ||
                (socket === this.socket &&
                    generation === this.socketGeneration))
        )
    }
    private installHandlers(
        socket: SocketLike,
        work: number,
        identity: number,
        generation: number
    ) {
        const valid = () => this.isCurrent(work, identity, socket, generation)
        const onConnect = () => {
            if (!valid()) return
            void this.authenticate(work, identity, socket, generation)
        }
        const onDisconnect = () => {
            if (!valid()) return
            this.authGeneration++
            this.clearAuthTimers()
            this.clearRefresh()
            this.setState({ status: "disconnected", ready: false })
            this.event("disconnect", "Socket disconnected.", "disconnected")
            this.authCapTimer = setTimeout(
                () =>
                    this.terminal(
                        work,
                        identity,
                        socket,
                        generation,
                        "Reconnection timed out."
                    ),
                30000
            )
        }
        const onConnectError = () => {
            if (valid())
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Connection failed."
                )
        }
        const onSuccess = () => {
            if (
                valid() &&
                socket.connected &&
                this.state.status === "authenticating" &&
                this.session &&
                this.session.expiresAtUnixSeconds > this.deps.now() + 30
            )
                this.ready(work, identity, socket, generation)
        }
        const onResponse = (value: unknown) => {
            if (!valid() || !socket.connected) return
            if (isAuthError(value)) {
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Authentication failed."
                )
                return
            }
            if (
                typeof value !== "string" ||
                value.trim() === "" ||
                value.length > MAX_MESSAGE
            )
                return
            if (this.state.status === "authenticating")
                this.ready(work, identity, socket, generation)
            if (this.state.ready) this.message(value)
        }
        const onError = (value: unknown) => {
            if (
                valid() &&
                (this.state.status === "authenticating" || isAuthError(value))
            )
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Authentication failed."
                )
        }
        const onExpired = () => {
            if (valid()) this.expireSession()
        }
        const onTrigger = (value: unknown) => {
            if (
                !valid() ||
                !socket.connected ||
                !this.state.ready ||
                typeof value !== "string" ||
                value.length > 64 ||
                !isSlug(value)
            )
                return
            this.triggerListeners.forEach((listener) =>
                listener({ type: value, detail: "" })
            )
        }
        const handlers: Record<string, Handler> = {
            connect: onConnect,
            disconnect: onDisconnect,
            connect_error: onConnectError,
            success: onSuccess,
            response: onResponse,
            error: onError,
            expired: onExpired,
            trigger: onTrigger,
            logon: () => {},
            logout: () => {},
        }
        this.handlers = new Map(Object.entries(handlers))
        this.handlers.forEach((handler, name) => socket.on(name, handler))
    }
    private async authenticate(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number
    ) {
        if (
            !this.isCurrent(work, identity, socket, generation) ||
            !socket.connected
        )
            return
        const auth = ++this.authGeneration
        this.clearAuthTimers()
        this.clearRefresh()
        this.setState({ status: "authenticating", ready: false })
        this.authCapTimer = setTimeout(() => {
            if (auth === this.authGeneration)
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Authentication timed out."
                )
        }, 30000)
        try {
            const session = await this.getSession(work, identity)
            if (
                auth !== this.authGeneration ||
                !this.isCurrent(work, identity, socket, generation) ||
                !socket.connected
            )
                return
            this.setState({
                status: "authenticating",
                ready: false,
                expiresAtUnixSeconds: session.expiresAtUnixSeconds,
            })
            this.authRetryTimer = setTimeout(() => {
                void this.authenticateRetry(
                    work,
                    identity,
                    socket,
                    generation,
                    auth
                )
            }, 5000)
            socket.emit("authenticate", session.token)
        } catch {
            if (
                auth === this.authGeneration &&
                this.isCurrent(work, identity, socket, generation)
            )
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Authentication failed."
                )
        }
    }
    private async authenticateRetry(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number,
        auth: number
    ) {
        if (
            auth !== this.authGeneration ||
            !this.isCurrent(work, identity, socket, generation) ||
            !socket.connected ||
            this.state.status !== "authenticating"
        )
            return
        try {
            const session = await this.getSession(work, identity)
            if (
                auth !== this.authGeneration ||
                !this.isCurrent(work, identity, socket, generation) ||
                !socket.connected
            )
                return
            this.setState({
                status: "authenticating",
                ready: false,
                expiresAtUnixSeconds: session.expiresAtUnixSeconds,
            })
            this.authRetryTimer = setTimeout(() => {
                void this.authenticateRetry(
                    work,
                    identity,
                    socket,
                    generation,
                    auth
                )
            }, 5000)
            socket.emit("authenticate", session.token)
        } catch {
            if (auth === this.authGeneration)
                this.terminal(
                    work,
                    identity,
                    socket,
                    generation,
                    "Authentication failed."
                )
        }
    }
    private ready(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number
    ) {
        if (
            !this.isCurrent(work, identity, socket, generation) ||
            !socket.connected ||
            this.state.status !== "authenticating" ||
            !this.session ||
            this.session.expiresAtUnixSeconds <= this.deps.now() + 30
        )
            return
        this.authGeneration++
        this.clearAuthTimers()
        this.setState({
            status: "ready",
            ready: true,
            error: null,
            expiresAtUnixSeconds: this.session.expiresAtUnixSeconds,
        })
        if (!this.isCurrent(work, identity, socket, generation)) return
        this.event("status", "Socket authenticated.", "ready")
        if (!this.isCurrent(work, identity, socket, generation)) return
        this.scheduleRefresh(work, identity, socket, generation)
        const resolve = this.connectResolve
        this.connectResolve = null
        this.connectReject = null
        this.connectPromise = null
        resolve?.()
    }
    private message(value: string) {
        this.listeners.forEach((listener) =>
            listener({
                id: crypto.randomUUID(),
                text: value,
                createdAt: new Date(),
            })
        )
    }
    private scheduleRefresh(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number
    ) {
        this.clearRefresh()
        if (!this.session) return
        this.refreshTimer = setTimeout(
            () => {
                void this.refresh(work, identity, socket, generation)
            },
            Math.max(
                0,
                (this.session.expiresAtUnixSeconds - this.deps.now() - 30) *
                    1000
            )
        )
    }
    private async refresh(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number
    ) {
        if (
            !this.isCurrent(work, identity, socket, generation) ||
            !socket.connected
        )
            return
        this.setState({ status: "authenticating", ready: false })
        this.session = null
        try {
            await this.authenticate(work, identity, socket, generation)
        } catch {
            this.terminal(
                work,
                identity,
                socket,
                generation,
                "Session refresh failed."
            )
        }
    }
    private terminal(
        work: number,
        identity: number,
        socket: SocketLike,
        generation: number,
        detail: string
    ) {
        if (!this.isCurrent(work, identity, socket, generation)) return
        const error = new Error(detail)
        this.cancelWork(error)
        this.disposeSocket()
        this.session = null
        this.setState({ status: "error", ready: false, error: detail })
        this.event("error", detail, "error")
    }
    private async getSession(
        work: number,
        identity: number
    ): Promise<AuthSession> {
        if (
            this.session &&
            this.session.expiresAtUnixSeconds > this.deps.now() + 30
        )
            return this.session
        if (this.tokenRequest) return this.tokenRequest
        const options = this.options!
        const provider: GetAuthToken =
            options.getAuthToken ??
            createLocalTokenProvider(options.tokenEndpoint)
        const controller = new AbortController()
        this.tokenAbort = controller
        this.setState({ status: "requesting-token", ready: false })
        let onAbort!: () => void
        let timer!: ReturnType<typeof setTimeout>
        const aborted = new Promise<AuthSession>((_, reject) => {
            onAbort = () => reject(new Error("Authentication cancelled"))
            controller.signal.addEventListener("abort", onAbort, { once: true })
        })
        const timeout = new Promise<AuthSession>((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error("Authentication request timed out."))
                controller.abort()
            }, 10000)
            this.tokenTimeout = timer
        })
        const provided = Promise.resolve().then(() => {
            if (controller.signal.aborted)
                throw new Error("Authentication cancelled")
            return provider({
                context: cloneContext(options.context),
                signal: controller.signal,
            })
        })
        const request = Promise.race([provided, aborted, timeout])
            .then((value) => {
                if (!this.isCurrent(work, identity))
                    throw new Error("Authentication superseded")
                const checked = validateAuthSession(
                    value,
                    options.context,
                    this.deps.now()
                )
                const session: AuthSession = {
                    ...checked,
                    context: Object.freeze(cloneContext(checked.context)),
                }
                this.session = session
                return session
            })
            .finally(() => {
                clearTimeout(timer)
                controller.signal.removeEventListener("abort", onAbort)
                if (this.tokenRequest === request) {
                    this.tokenRequest = null
                    this.tokenAbort = null
                    this.tokenTimeout = null
                }
            })
        this.tokenRequest = request
        return request
    }
    async restart() {
        this.cancelWork(new Error("Restarted"))
        this.disposeSocket()
        this.session = null
        this.setState({ status: "disconnected", ready: false, error: null })
        return this.connect()
    }
    private requireReady() {
        if (
            !this.socket ||
            !this.socket.connected ||
            !this.state.ready ||
            !this.session ||
            this.session.expiresAtUnixSeconds <= this.deps.now() + 30
        )
            throw new Error("Chat is not ready")
    }
    private emitAuthorized(
        event: "chat" | "login" | "logout",
        payload: string
    ) {
        this.requireReady()
        const work = this.workGeneration
        const identity = this.identityEpoch
        const socket = this.socket!
        const generation = this.socketGeneration
        socket.emit(event, payload)
        if (
            !this.isCurrent(work, identity, socket, generation) ||
            !socket.connected ||
            !this.state.ready
        )
            throw new Error("Connection superseded")
    }
    async send(text: string) {
        if (typeof text !== "string" || text.trim() === "")
            throw new Error("Message must be non-empty text")
        this.requireReady()
        this.emitAuthorized(
            "chat",
            JSON.stringify({
                input: text,
                x_auth_token: this.session!.context.x_auth_token,
            })
        )
    }
    async login() {
        this.requireReady()
        this.emitAuthorized(
            "login",
            JSON.stringify({ x_auth_token: this.session!.context.x_auth_token })
        )
    }
    async logout() {
        this.requireReady()
        this.emitAuthorized(
            "logout",
            JSON.stringify({ x_auth_token: this.session!.context.x_auth_token })
        )
    }
}
