import assert from "node:assert/strict"
import test from "node:test"
import { KJUR } from "jsrsasign"
import { loadServerConfig } from "./config.mjs"
import { createTokenServer } from "./index.mjs"

const SYNTHETIC_SIGNING_KEY = "plain test key"
const env = {
    CHAT_SERVER_KEY: SYNTHETIC_SIGNING_KEY,
    CHAT_APP_KEY: "app",
    CHAT_CUSTOMER_ID: "customer",
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
        const parsed = KJUR.jws.JWS.parse(result.token)
        assert.deepEqual(parsed.headerObj, { alg: "HS256", typ: "JWT" })
        assert.deepEqual(parsed.payloadObj, { nbf: 1700000000, iat: 1700000000, exp: 1700003600, data: cfg.context })
        assert.equal(result.expiresAtUnixSeconds, 1700003600)
        assert.deepEqual(result.context, cfg.context)
        assert.equal(KJUR.jws.JWS.verify(result.token, SYNTHETIC_SIGNING_KEY, ["HS256"]), true)
    })
})

test("signs plain, even-length hex, and whitespace keys without rewriting", async () => {
    for (const key of ["plain key", "0011223344556677", " key "]) {
        await withFixture({ CHAT_SERVER_KEY: key }, {}, async ({ cfg, request }) => {
            const result = await (await request(JSON.stringify({ context: cfg.context }))).json()
            assert.equal(KJUR.jws.JWS.verify(result.token, key, ["HS256"]), true)
        })
    }
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
