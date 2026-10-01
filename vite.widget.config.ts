import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import selectorParser from "postcss-selector-parser"
import { defineConfig, type Plugin } from "vite"
import { fileURLToPath, URL } from "node:url"

const widgetRoot = ".hotel-chat-widget"

function scopeWidgetCss(): Plugin {
    return {
        name: "scope-widget-css",
        enforce: "post",
        config() {
            return {
                css: {
                    postcss: {
                        plugins: [
                            {
                                postcssPlugin: "scope-widget-css-ast",
                                Once(root) {
                                    const keyframeNames = new Map<string, string>()
                                    root.walkAtRules((rule) => {
                                        if (rule.name === "property") rule.remove()
                                        if (rule.name === "layer") {
                                            rule.replaceWith(...rule.nodes ?? [])
                                        }
                                        if (/^(?:-webkit-)?keyframes$/.test(rule.name)) {
                                            const name = rule.params.trim()
                                            const scopedName = name.startsWith("hotel-chat-")
                                                ? name
                                                : `hotel-chat-${name}`
                                            keyframeNames.set(name, scopedName)
                                            rule.params = scopedName
                                        }
                                    })
                                    root.walkDecls((decl) => {
                                        if (/^(animation|animation-name)$/.test(decl.prop) || decl.prop.startsWith("--animate-")) {
                                            for (const [name, scopedName] of keyframeNames) {
                                                decl.value = decl.value.replace(
                                                    new RegExp(`\\b${name}\\b`, "g"),
                                                    scopedName
                                                )
                                            }
                                        }
                                    })
                                    root.walkRules((rule) => {
                                        let ancestor = rule.parent
                                        while (ancestor) {
                                            if (
                                                ancestor.type === "atrule" &&
                                                /^(?:-webkit-)?keyframes$/.test(ancestor.name)
                                            ) {
                                                return
                                            }
                                            ancestor = ancestor.parent as typeof ancestor
                                        }
                                        rule.selector = selectorParser((selectors) => {
                                            selectors.each((selector) => {
                                                const first = selector.nodes[0]
                                                if (
                                                    first?.type === "pseudo" &&
                                                    (first.value === ":root" || first.value === ":host")
                                                ) {
                                                    selector.nodes.shift()
                                                    selector.prepend(selectorParser.className({ value: widgetRoot.slice(1) }))
                                                } else if (
                                                    first?.type === "tag" &&
                                                    /^(html|body)$/.test(first.value)
                                                ) {
                                                    selector.nodes.shift()
                                                    selector.prepend(selectorParser.className({ value: widgetRoot.slice(1) }))
                                                } else if (!selector.toString().includes(widgetRoot)) {
                                                    selector.prepend(selectorParser.combinator({ value: " " }))
                                                    selector.prepend(selectorParser.className({ value: widgetRoot.slice(1) }))
                                                }
                                            })
                                        }).processSync(rule.selector)
                                    })
                                },
                            },
                        ],
                    },
                },
            }
        },
        transform(code, id) {
            if (id.endsWith("/src/chatbot.tsx")) {
                return `${code}\nimport "./features/chat/widget.css"`
            }
            return undefined
        },
    }
}

export default defineConfig({
    plugins: [react(), tailwindcss(), scopeWidgetCss()],
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    build: {
        lib: {
            entry: fileURLToPath(new URL("./src/chatbot.tsx", import.meta.url)),
            formats: ["es"],
            fileName: () => "chatbot.es.js",
            cssFileName: "style",
        },
        outDir: "dist-widget",
        emptyOutDir: true,
        rollupOptions: {
            external: (id) =>
                id === "react" ||
                id.startsWith("react/") ||
                id === "react-dom" ||
                id.startsWith("react-dom/"),
        },
    },
})
