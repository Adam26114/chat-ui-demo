import http from "node:http"
import { fileURLToPath } from "node:url"
import { loadServerConfig } from "./config.mjs"
import { createTokenHandler } from "./token-service.mjs"

export function createTokenServer(config, testDependencies) {
    const handler = createTokenHandler(config, testDependencies)
    return http.createServer((req, res) => {
        if (req.url !== "/api/chat/token") {
            res.statusCode = 404
            res.setHeader("content-type", "application/json")
            res.setHeader("cache-control", "no-store")
            res.setHeader("x-content-type-options", "nosniff")
            return res.end(JSON.stringify({ error: "Not found" }))
        }
        return handler(req, res)
    })
}

export function startTokenServer(config) {
    const server = createTokenServer(config)
    return new Promise((resolve, reject) => {
        server.once("error", reject)
        server.listen(config.port, "127.0.0.1", () => resolve(server))
    })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
    try {
        process.loadEnvFile(".env.server.local")
    } catch (error) {
        if (error?.code !== "ENOENT") throw error
    }
    startTokenServer(loadServerConfig()).catch(() => process.exitCode = 1)
}
