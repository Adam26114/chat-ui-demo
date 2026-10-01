import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,
        proxy: {
            "/api/chat/token": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
            },
        },
    },
    build: {
        rolldownOptions: {
            output: {
                // Preserve source initialization order across generated chunks.
                strictExecutionOrder: true,
                codeSplitting: {
                    minSize: 20 * 1024,
                    groups: [
                        {
                            name: "react",
                            test: /node_modules[\\/](?:react|react-dom|scheduler|use-sync-external-store)(?:[\\/]|$)/,
                            priority: 100,
                            maxSize: 420 * 1024,
                        },
                        {
                            name: "assistant-ui",
                            test: /node_modules[\\/]@assistant-ui[\\/]/,
                            priority: 80,
                            maxSize: 420 * 1024,
                        },
                        {
                            name: "markdown",
                            test: /node_modules[\\/](?:react-markdown|unified|remark-[^\\/]+|rehype-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unist-[^\\/]+)(?:[\\/]|$)/,
                            priority: 70,
                            maxSize: 420 * 1024,
                        },
                        {
                            name: "radix",
                            test: /node_modules[\\/]@radix-ui[\\/]/,
                            priority: 60,
                            maxSize: 420 * 1024,
                        },
                        {
                            name: "socket",
                            test: /node_modules[\\/](?:socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser|@socket\.io)(?:[\\/]|$)/,
                            priority: 50,
                            maxSize: 420 * 1024,
                        },
                        {
                            name: "vendor",
                            test: /node_modules[\\/]/,
                            priority: 1,
                            maxSize: 420 * 1024,
                        },
                    ],
                },
            },
        },
    },
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
})
