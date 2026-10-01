import assert from "node:assert/strict"
import { createHmac, timingSafeEqual } from "node:crypto"
import test from "node:test"
import { loadServerConfig } from "./config.mjs"
import { createTokenServer } from "./index.mjs"

const SYNTHETIC_SIGNING_KEY = "plain test key"
const env = {
    CHAT_SERVER_KEY: SYNTHETIC_SIGNING_KEY,
    CHAT_APP_KEY: "app",
    CHAT_CUSTOMER_ID: "customer",
}

const ORACLE_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
const ORACLE_PAYLOAD = "eyJuYmYiOjE3MDAwMDAwMDAsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAzNjAwLCJkYXRhIjp7ImFwcF9rZXkiOiJhcHAiLCJjdXN0b21lcl9pZCI6ImN1c3RvbWVyIiwicHJvcGVydHlfY29kZSI6ImNhZsOpIiwiYm9va2luZ19saW5rIjoiaHR0cDovLzEyNy4wLjAuMTo1MTczL3Jlc2VydmF0aW9uIiwibG9naW5fbGluayI6Imh0dHA6Ly8xMjcuMC4wLjE6NTE3My9sb2dpbiIsInBheW1lbnRfbGluayI6Imh0dHA6Ly8xMjcuMC4wLjE6NTE3My9yZXNlcnZhdGlvbi9wYXltZW50IiwieF9hdXRoX3Rva2VuIjoiIn19"
// Captured offline from jsrsasign 11.1.3 before removal with fixed synthetic context/time; no real credentials.
const ORACLE_VECTORS = [
    ["plain test key", "706c61696e2074657374206b6579", "MGtqmiMwLpTJPGV4B5blniVfGluU-I9Alg-J1J6gqWE"],
    ["0011223344556677", "0011223344556677", "jpcmzwZNlgnx1sCP6A7yOLW1arQVWmuNLi8Ca52_x7E"],
    ["AABBCCDDEEFF0011", "aabbccddeeff0011", "Xu4Gp66ssDh-WrNranMmKIIgEKWRQyRVNe9rgVO2OBM"],
    ["abc", "616263", "Rekz-XUhWUeP8goIeiBc16bSG_Cch_O3oXBV0gnN5iY"],
    ["00zz11", "30307a7a3131", "wjcBOeO1qtTQA9BRep01lB_oduT4BxWzVKRR8UUs0N8"],
    [" key ", "206b657920", "VE95Kq36M-fkaMBwnRgFfAMpHwgBXo_JnPszKmsMMi0"],
    ["café", "636166e9", "Z3OZXVHv1tkg__QTUfGPdzBgpf1MksmCJVvHKGwznPo"],
    ["ākey", "016b6579", "xjFStpB0LS4MrVRW-l65dKL1p98391GueG8pgzQMEPM"],
    ["😀key", "3d006b6579", "Jh9HR_YCr0JV_RHoWZsRmfEur6NX3rCuOGzXe011rfA"],
]

function verifyHs256(token, keyBytes) {
    const parts = token.split(".")
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false
    let actual
    try { actual = Buffer.from(parts[2], "base64url") } catch { return false }
    const expected = createHmac("sha256", Buffer.from(keyBytes, "hex")).update(`${parts[0]}.${parts[1]}`).digest()
    return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function decodeJsonSegment(segment) {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"))
}

function config(overrides = {}) {
    return loadServerConfig({ ...env, ...overrides })
}

async function closeServer(server) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

async function withFixture(overrides, testDependencies, callback) {
    const loaded = config(overrides)
    const captured = { ...loaded, context: { ...loaded.context } }
    const server = createTokenServer(captured, testDependencies)
    const responses = []
    let listening = false
    const request = async (body, headers = {}) => {
        const requestHeaders = {
            origin: "http://127.0.0.1:5173",
            host: `127.0.0.1:${captured.port}`,
            "content-type": "application/json",
            ...headers,
        }
        if (requestHeaders.omitOrigin) delete requestHeaders.origin
        delete requestHeaders.omitOrigin
        const response = await fetch(`http://127.0.0.1:${captured.port}/api/chat/token`, {
            method: "POST",
            headers: requestHeaders,
            body,
        })
        responses.push(response)
        return response
    }
    const fetchPath = async (path, init) => {
        const response = await fetch(`http://127.0.0.1:${captured.port}${path}`, init)
        responses.push(response)
        return response
    }
    try {
        await new Promise((resolve, reject) => {
            const onError = (error) => {
                server.off("listening", onListening)
                reject(error)
            }
            const onListening = () => {
                server.off("error", onError)
                resolve()
            }
            server.once("error", onError)
            server.once("listening", onListening)
            server.listen(0, "127.0.0.1")
        })
        listening = true
        captured.port = server.address().port
        return await callback({ cfg: captured, request, fetchPath })
    } finally {
        await Promise.allSettled(responses.map((response) => response.arrayBuffer()))
        if (listening) await closeServer(server)
    }
}

test("config preserves keys and resolves default links", () => {
    const value = config({ CHAT_SERVER_KEY: " key ", CHAT_BASE_URL: "http://127.0.0.1:5173/" })
    assert.equal(value.signingKey, " key ")
    assert.equal(value.booking_link, "http://127.0.0.1:5173/reservation")
    assert.equal(value.login_link, "http://127.0.0.1:5173/login")
    assert.equal(value.payment_link, "http://127.0.0.1:5173/reservation/payment")
    assert.equal(config({ CHAT_BOOKING_LINK: "", CHAT_LOGIN_LINK: "", CHAT_PAYMENT_LINK: "" }).booking_link, "http://127.0.0.1:5173/reservation")
    assert.equal(config({ CHAT_BOOKING_LINK: "", CHAT_LOGIN_LINK: "", CHAT_PAYMENT_LINK: "" }).login_link, "http://127.0.0.1:5173/login")
    assert.equal(config({ CHAT_BOOKING_LINK: "", CHAT_LOGIN_LINK: "", CHAT_PAYMENT_LINK: "" }).payment_link, "http://127.0.0.1:5173/reservation/payment")
    assert.equal(config().port, 8787)
    assert.throws(() => config({ CHAT_ISSUER_PORT: "0" }), /Invalid issuer port/)
})

test("missing required configuration fails without exposing values", () => {
    assert.throws(() => loadServerConfig({ CHAT_SERVER_KEY: "x" }), /Missing required server configuration/)
})

test("issues exact signed claims", async () => {
    await withFixture({}, { now: () => 1_700_000_000_000 }, async ({ cfg, request }) => {
        const response = await request(JSON.stringify({ context: cfg.context }))
        assert.equal(response.status, 200)
        const result = await response.json()
        const [header, payload] = result.token.split(".")
        assert.deepEqual(decodeJsonSegment(header), { alg: "HS256", typ: "JWT" })
        assert.deepEqual(decodeJsonSegment(payload), { nbf: 1700000000, iat: 1700000000, exp: 1700003600, data: cfg.context })
        assert.equal(result.expiresAtUnixSeconds, 1700003600)
        assert.deepEqual(result.context, cfg.context)
        assert.equal(verifyHs256(result.token, "706c61696e2074657374206b6579"), true)
    })
})

test("signs plain, even-length hex, and whitespace keys without rewriting", async () => {
    for (const [key, keyBytes] of [["plain key", "706c61696e206b6579"], ["0011223344556677", "0011223344556677"], [" key ", "206b657920"]]) {
        await withFixture({ CHAT_SERVER_KEY: key }, {}, async ({ cfg, request }) => {
            const result = await (await request(JSON.stringify({ context: cfg.context }))).json()
            assert.equal(verifyHs256(result.token, keyBytes), true)
        })
    }
})

test("matches jsrsasign golden JWTs for every legacy key decoding case", async () => {
    for (const [key, keyBytes, signature] of ORACLE_VECTORS) {
        await withFixture({ CHAT_SERVER_KEY: key, CHAT_PROPERTY_CODE: "café" }, { now: () => 1_700_000_000_000 }, async ({ cfg, request }) => {
            const result = await (await request(JSON.stringify({ context: cfg.context }))).json()
            const expected = `${ORACLE_HEADER}.${ORACLE_PAYLOAD}.${signature}`
            assert.equal(result.token, expected)
            assert.equal(verifyHs256(result.token, keyBytes), true)
        })
    }
})

test("rejects tampered, wrong-key, shortened, and malformed signatures", () => {
    const token = `${ORACLE_HEADER}.${ORACLE_PAYLOAD}.${ORACLE_VECTORS[0][2]}`
    const [header, payload, signature] = token.split(".")
    const tamperedPayload = `${header}.${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`
    assert.equal(verifyHs256(tamperedPayload, ORACLE_VECTORS[0][1]), false)
    assert.equal(verifyHs256(token, "776f6e67206b6579"), false)
    assert.equal(verifyHs256(`${header}.${payload}.${signature.slice(1)}`, ORACLE_VECTORS[0][1]), false)
    assert.equal(verifyHs256(`${header}.${payload}.not-base64!`, ORACLE_VECTORS[0][1]), false)
    assert.equal(verifyHs256(`${header}.${payload}`, ORACLE_VECTORS[0][1]), false)
})

test("rejects duplicate keys, overrides, tokens, origins and content types", async () => {
    await withFixture({}, {}, async ({ cfg, request }) => {
        for (const [body, headers] of [
            ['{"context":{"app_key":"app","app_key":"app"}}', {}],
            [JSON.stringify({ context: { ...cfg.context, app_key: "other" } }), {}],
            [JSON.stringify({ context: { ...cfg.context, x_auth_token: "token" } }), {}],
            [JSON.stringify({ context: cfg.context }), { origin: "http://localhost:9" }],
            [JSON.stringify({ context: cfg.context }), { "content-type": "text/plain" }],
        ]) {
            const response = await request(body, headers)
            assert.notEqual(response.status, 200)
        }
    })
})

test("importing service has no listening side effect", () => {
    assert.equal(typeof createTokenServer, "function")
})

test("rejects escaped duplicate and extra fields, and preserves unicode split bytes", async () => {
    await withFixture({ CHAT_PROPERTY_CODE: "cafe\u00e9" }, {}, async ({ cfg, request }) => {
        const duplicate = '{"context":{"app_key":"app","\\u0061pp_key":"app"}}'
        assert.equal((await request(duplicate)).status, 400)
        for (const value of [
            { extra: true, context: cfg.context },
            { context: { ...cfg.context, extra: "x" } },
            { context: { ...cfg.context, app_key: 3 } },
            { context: { ...cfg.context, x_auth_token: "x" } },
        ]) assert.equal((await request(JSON.stringify(value))).status, 400)
        const valid = await request(JSON.stringify({ context: cfg.context }))
        assert.equal(valid.status, 200)
    })
})

test("returns safe cache and content headers on success, errors, and not found", async () => {
    await withFixture({}, {}, async ({ cfg, request, fetchPath }) => {
        const success = await request(JSON.stringify({ context: cfg.context }))
        assert.equal(success.headers.get("cache-control"), "no-store")
        assert.equal(success.headers.get("x-content-type-options"), "nosniff")
        const notFound = await fetchPath("/missing")
        assert.equal(notFound.status, 404)
        assert.equal(notFound.headers.get("cache-control"), "no-store")
        assert.equal(notFound.headers.get("x-content-type-options"), "nosniff")
    })
})

test("rejects missing, null, and wrong Origin or Host", async () => {
    await withFixture({}, {}, async ({ cfg, request }) => {
        for (const headers of [
            { omitOrigin: true },
            { origin: "null" },
            { origin: "http://evil.test" },
            { origin: "http://evil.test", host: "localhost:1" },
        ]) assert.equal((await request(JSON.stringify({ context: cfg.context }), headers)).status, 403)
    })
})

test("enforces declared and streamed body limits and rate limit", async () => {
    await withFixture({}, {}, async ({ request }) => {
        assert.equal((await request("x".repeat(8193))).status, 413)
    })
    await withFixture({}, {}, async ({ cfg, request }) => {
        const responses = []
        for (let i = 0; i < 21; i++) responses.push(await request(JSON.stringify({ context: cfg.context })))
        assert.deepEqual(responses.slice(0, 20).map((response) => response.status), Array(20).fill(200))
        assert.equal(responses[20].status, 429)
    })
})
