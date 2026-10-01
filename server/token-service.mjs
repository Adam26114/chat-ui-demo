import { createHmac } from "node:crypto"
import { CONTEXT_KEYS } from "./config.mjs"

export const MAX_BODY_BYTES = 8192
const WINDOW_MS = 60_000

function signingKeyBytes(key) {
    // Preserve legacy jsrsasign key decoding: even-length hex is decoded; otherwise use raw low bytes, not UTF-8.
    if (key.length % 2 === 0 && /^[0-9a-f]+$/i.test(key)) return Buffer.from(key, "hex")
    return Buffer.from(key, "latin1")
}

function signHs256(header, payload, key) {
    const encodedHeader = Buffer.from(JSON.stringify(header), "utf8").toString("base64url")
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const signature = createHmac("sha256", signingKeyBytes(key)).update(signingInput).digest("base64url")
    return `${signingInput}.${signature}`
}

function safeJson(res, status, value) {
    const body = JSON.stringify(value)
    res.statusCode = status
    res.setHeader("content-type", "application/json")
    res.setHeader("cache-control", "no-store")
    res.setHeader("x-content-type-options", "nosniff")
    res.end(body)
}

function parseStrictJson(text) {
    let i = 0
    const whitespace = () => { while (/\s/.test(text[i] || "")) i++ }
    const string = () => {
        const start = i++
        let escaped = false
        while (i < text.length) {
            const c = text[i++]
            if (c === '"' && !escaped) break
            if (c === "\n" || c === "\r") throw new Error("Invalid JSON")
            escaped = c === "\\" && !escaped
            if (c !== "\\") escaped = false
        }
        if (text[i - 1] !== '"') throw new Error("Invalid JSON")
        return JSON.parse(text.slice(start, i))
    }
    const value = () => {
        whitespace()
        if (text[i] === "{") {
            i++; whitespace(); const keys = new Set()
            if (text[i] === "}") { i++; return }
            while (true) {
                if (text[i] !== '"') throw new Error("Invalid JSON")
                const key = string()
                if (keys.has(key)) throw new Error("Duplicate object key")
                keys.add(key); whitespace()
                if (text[i++] !== ":") throw new Error("Invalid JSON")
                value(); whitespace()
                if (text[i] === "}") { i++; return }
                if (text[i++] !== ",") throw new Error("Invalid JSON")
                whitespace()
            }
        }
        if (text[i] === "[") {
            i++; whitespace()
            if (text[i] === "]") { i++; return }
            while (true) {
                value(); whitespace()
                if (text[i] === "]") { i++; return }
                if (text[i++] !== ",") throw new Error("Invalid JSON")
            }
        }
        if (text[i] === '"') { string(); return }
        const match = text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)
        if (!match) throw new Error("Invalid JSON")
        i += match[0].length
    }
    value(); whitespace()
    if (i !== text.length) throw new Error("Invalid JSON")
    return JSON.parse(text)
}

function validContext(context, fixed) {
    if (!context || typeof context !== "object" || Array.isArray(context)) return false
    const keys = Object.keys(context)
    if (keys.length !== CONTEXT_KEYS.length || keys.some((key) => !CONTEXT_KEYS.includes(key))) return false
    if (CONTEXT_KEYS.some((key) => typeof context[key] !== "string")) return false
    if (context.x_auth_token !== "") return false
    return CONTEXT_KEYS.every((key) => context[key] === fixed[key])
}

export function createTokenHandler(config, testDependencies = {}) {
    const now = testDependencies.now || (() => Date.now())
    const counters = new Map()
    return async function tokenHandler(req, res) {
        const address = req.socket?.remoteAddress || "unknown"
        const current = now()
        const prior = counters.get(address)
        if (!prior || current - prior.started >= WINDOW_MS) counters.set(address, { started: current, count: 1 })
        else if (++prior.count > 20) return safeJson(res, 429, { error: "Rate limit exceeded" })
        if (counters.size > 10000) for (const [key, item] of counters) if (current - item.started >= WINDOW_MS) counters.delete(key)
        if (req.method !== "POST") return safeJson(res, 405, { error: "Method not allowed" })
        const origin = req.headers.origin
        const host = req.headers.host
        const loopback = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1"
        if (!loopback || typeof origin !== "string" || !config.allowedOrigins.includes(origin) ||
            (host !== `127.0.0.1:${config.port}` && host !== `localhost:${config.port}`))
            return safeJson(res, 403, { error: "Forbidden" })
        if (req.headers["content-type"]?.split(";", 1)[0].toLowerCase() !== "application/json")
            return safeJson(res, 415, { error: "JSON content type required" })
        const declared = Number(req.headers["content-length"])
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return safeJson(res, 413, { error: "Request body too large" })
        const chunks = []
        let body = "", bytes = 0
        try {
            for await (const chunk of req) {
                bytes += Buffer.byteLength(chunk)
                if (bytes > MAX_BODY_BYTES) return safeJson(res, 413, { error: "Request body too large" })
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            body = Buffer.concat(chunks).toString("utf8")
            const parsed = parseStrictJson(body)
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed, "context") || !validContext(parsed.context, config.context))
                return safeJson(res, 400, { error: "Invalid chat context" })
            const seconds = Math.floor(now() / 1000)
            const payload = { nbf: seconds, iat: seconds, exp: seconds + 3600, data: config.context }
            const header = { alg: "HS256", typ: "JWT" }
            const token = signHs256(header, payload, config.signingKey)
            return safeJson(res, 200, { token, expiresAtUnixSeconds: seconds + 3600, context: config.context })
        } catch {
            return safeJson(res, 400, { error: "Invalid JSON request" })
        }
    }
}
