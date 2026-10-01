import { URL } from "node:url"

export const CONTEXT_KEYS = [
    "app_key",
    "customer_id",
    "property_code",
    "booking_link",
    "login_link",
    "payment_link",
    "x_auth_token",
]

const DEFAULT_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]

function loopbackOrigin(value) {
    try {
        const url = new URL(value)
        if (
            url.protocol !== "http:" ||
            !["127.0.0.1", "localhost"].includes(url.hostname) ||
            !url.port ||
            url.pathname !== "/" ||
            url.search ||
            url.hash ||
            url.username ||
            url.password
        )
            return false
        return url.origin
    } catch {
        return false
    }
}

function loopbackBase(value) {
    try {
        const url = new URL(value)
        if (
            url.protocol !== "http:" ||
            !["127.0.0.1", "localhost"].includes(url.hostname) ||
            !url.port ||
            url.username ||
            url.password
        ) return false
        return url
    } catch {
        return false
    }
}

export function loadServerConfig(env = process.env) {
    const required = ["CHAT_SERVER_KEY", "CHAT_APP_KEY", "CHAT_CUSTOMER_ID"]
    const missing = required.filter((key) => !env[key])
    if (missing.length) throw new Error(`Missing required server configuration: ${missing.join(", ")}`)

    const portText = env.CHAT_ISSUER_PORT || "8787"
    if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535)
        throw new Error("Invalid issuer port")
    const base = env.CHAT_BASE_URL || "http://127.0.0.1:5173/"
    const baseUrl = loopbackBase(base)
    if (!baseUrl) throw new Error("Invalid chat base URL")
    const rawOrigins = env.CHAT_ALLOWED_ORIGINS === undefined
        ? DEFAULT_ORIGINS
        : env.CHAT_ALLOWED_ORIGINS.split(",")
    const allowedOrigins = rawOrigins.map(loopbackOrigin)
    if (allowedOrigins.some((origin) => !origin)) throw new Error("Invalid allowed origin")
    const context = {
        app_key: env.CHAT_APP_KEY,
        customer_id: env.CHAT_CUSTOMER_ID,
        property_code: env.CHAT_PROPERTY_CODE || "",
        booking_link: env.CHAT_BOOKING_LINK || new URL("reservation", baseUrl).toString(),
        login_link: env.CHAT_LOGIN_LINK || new URL("login", baseUrl).toString(),
        payment_link: env.CHAT_PAYMENT_LINK || new URL("reservation/payment", baseUrl).toString(),
        x_auth_token: "",
    }
    return {
        ...context,
        context,
        signingKey: env.CHAT_SERVER_KEY,
        port: Number(portText),
        allowedOrigins,
        serverUrl: env.CHAT_SERVER_URL || "",
    }
}
