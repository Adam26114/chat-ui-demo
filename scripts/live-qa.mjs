import { io } from "socket.io-client"
import { loadServerConfig } from "../server/config.mjs"
import { startTokenServer } from "../server/index.mjs"

if (!process.argv.includes("--approve")) {
    console.error("Live QA requires --approve")
    process.exit(1)
}

try {
    process.loadEnvFile(".env.server.local")
} catch (error) {
    if (error?.code !== "ENOENT") {
        console.error("Live QA configuration unavailable")
        process.exit(1)
    }
}

let config
try {
    config = loadServerConfig()
    if (!config.serverUrl) throw new Error("CHAT_SERVER_URL")
    const serverUrl = new URL(config.serverUrl)
    if (
        !["http:", "https:", "ws:", "wss:"].includes(serverUrl.protocol) ||
        !serverUrl.hostname ||
        serverUrl.username ||
        serverUrl.password
    )
        throw new Error("CHAT_SERVER_URL")
} catch (error) {
    const names =
        error instanceof Error &&
        error.message.startsWith("Missing required server configuration:")
            ? error.message
                  .replace("Missing required server configuration:", "")
                  .trim()
            : "CHAT_SERVER_URL, CHAT_SERVER_KEY, CHAT_APP_KEY, CHAT_CUSTOMER_ID"
    console.error(`Live QA configuration unavailable: ${names}`)
    process.exit(1)
}

const chat = process.argv.includes("--chat")
let issuer
let socket
let done = false
const timers = new Set()
const later = (callback, delay) => {
    const timer = setTimeout(() => {
        timers.delete(timer)
        callback()
    }, delay)
    timers.add(timer)
    return timer
}
const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
}
const close = () => {
    clearTimers()
    if (socket) socket.close()
    if (issuer) issuer.close()
}
const finish = (ok, message) => {
    if (done) return
    done = true
    close()
    console.log(message)
    process.exitCode = ok ? 0 : 1
}
const recognized = new Set([
    "Invalid token",
    "Invalid token values",
    "JWT token not found",
    "server_restarted",
])
const errorMessage = (error) => {
    const value = typeof error === "string" ? error : error?.message
    return recognized.has(value) ? value : "connection_error"
}

try {
    issuer = await startTokenServer(config)
    const response = await fetch(
        `http://127.0.0.1:${config.port}/api/chat/token`,
        {
            method: "POST",
            headers: {
                origin: config.allowedOrigins[0],
                host: `127.0.0.1:${config.port}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ context: config.context }),
            signal: AbortSignal.timeout(10_000),
        }
    )
    if (!response.ok) throw new Error("token request")
    const tokenResponse = await response.json()
    const contextKeys = Object.keys(config.context).sort()
    if (
        !tokenResponse ||
        typeof tokenResponse.token !== "string" ||
        !tokenResponse.token ||
        !Number.isInteger(tokenResponse.expiresAtUnixSeconds) ||
        tokenResponse.expiresAtUnixSeconds <= Math.floor(Date.now() / 1000) ||
        !tokenResponse.context ||
        JSON.stringify(Object.keys(tokenResponse.context).sort()) !==
            JSON.stringify(contextKeys) ||
        contextKeys.some(
            (key) => tokenResponse.context[key] !== config.context[key]
        )
    )
        throw new Error("token response")

    socket = io(config.serverUrl, { autoConnect: false })
    let connected = false
    let authenticating = false
    let authenticated = false
    let chatSent = false
    let phaseTimer
    const phaseTimeout = (label) => {
        if (phaseTimer) clearTimeout(phaseTimer)
        phaseTimer = later(
            () => finish(false, `Live QA failed: ${label} timeout`),
            30_000
        )
    }
    const sendAuthentication = () => {
        if (!connected || authenticated) return
        authenticating = true
        socket.emit("authenticate", tokenResponse.token)
    }
    const beginChat = () => {
        if (!chat || chatSent) return
        chatSent = true
        socket.emit(
            "chat",
            JSON.stringify({
                input: "Hello",
                x_auth_token: tokenResponse.context.x_auth_token,
            })
        )
        phaseTimeout("chat")
    }
    const acceptedResponse = (value) =>
        typeof value === "string" &&
        value.trim() &&
        value.length <= 256 * 1024 &&
        !recognized.has(value)
    const authenticatedNow = (eventType) => {
        if (!connected || !authenticating || authenticated) return
        authenticated = true
        if (phaseTimer) clearTimeout(phaseTimer)
        console.log(`Live QA passed: ${eventType}`)
        if (chat) beginChat()
        else finish(true, "Live QA passed")
    }
    socket.on("connect", () => {
        connected = true
        authenticating = false
        sendAuthentication()
        phaseTimeout("auth")
        later(function retry() {
            if (connected && !authenticated) {
                sendAuthentication()
                later(retry, 5000)
            }
        }, 5000)
    })
    socket.on("success", () => authenticatedNow("success"))
    socket.on("response", (value) => {
        if (!acceptedResponse(value)) {
            if (typeof value === "string" && recognized.has(value))
                finish(false, `Live QA failed: ${value}`)
            return
        }
        if (!authenticated) authenticatedNow("response")
        else if (chatSent) finish(true, "Live QA passed: chat")
    })
    socket.on('error', (error) => finish(false, `Live QA failed: error/${errorMessage(error)}`));
    socket.on('expired', () => finish(false, 'Live QA failed: expired'));
    socket.on("connect_error", (error) =>
        finish(false, `Live QA failed: ${errorMessage(error)}`)
    )
    socket.on("disconnect", () => {
        if (!done && authenticated)
            finish(false, "Live QA failed: disconnected")
        connected = false
    })
    phaseTimeout("auth")
    socket.connect()
} catch {
    finish(false, "Live QA failed: request_error")
}
