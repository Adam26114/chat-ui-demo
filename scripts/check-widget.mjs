import { readFile, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import postcss from "postcss"

const manifest = JSON.parse(await readFile("package.json", "utf8"))
const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"))
const rootManifest = lockfile.packages?.[""] ?? {}
for (const section of [manifest.dependencies, rootManifest.dependencies]) {
    if (section?.react || section?.["react-dom"]) {
        throw new Error("React runtime dependencies must not be published dependencies")
    }
}
if (manifest.devDependencies?.react !== "^19.2.8" || manifest.devDependencies?.["react-dom"] !== "^19.2.8") {
    throw new Error("React development dependency versions are incorrect")
}
if (manifest.peerDependencies?.react !== "^18.0.0 || ^19.0.0" || manifest.peerDependencies?.["react-dom"] !== "^18.0.0 || ^19.0.0") {
    throw new Error("React peer dependency ranges are incorrect")
}

const files = [
    "dist-widget/chatbot.es.js",
    "dist-widget/style.css",
    "dist-widget/types/chatbot.d.ts",
]
for (const file of files) {
    if (!existsSync(file)) throw new Error(`Missing widget artifact: ${file}`)
}

const js = await readFile(files[0], "utf8")
const css = await readFile(files[1], "utf8")
if (!/from\s+["']react(?:\/|["'])/.test(js) && !/from\s+["']react-dom(?:\/|["'])/.test(js)) {
    throw new Error("Widget bundle has no external React import")
}
if (/jsrsasign|server\//.test(js)) {
    throw new Error("Widget bundle contains forbidden runtime code")
}
async function declarationFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const nested = await Promise.all(entries.map(async (entry) => {
        const path = `${directory}/${entry.name}`
        if (entry.isDirectory()) return declarationFiles(path)
        return entry.isFile() && entry.name.endsWith(".d.ts") ? [path] : []
    }))
    return nested.flat()
}
const declarationPaths = await declarationFiles("dist-widget/types")
if (declarationPaths.length < 15) {
    throw new Error(`Expected at least 15 declaration files, found ${declarationPaths.length}`)
}
for (const declarationPath of declarationPaths) {
    const declaration = await readFile(declarationPath, "utf8")
    if (/@\/|hotel-preview|connection-console|server\//.test(declaration)) {
        throw new Error(`Widget declaration contains an alias or demo path: ${declarationPath}`)
    }
}
const parsedCss = postcss.parse(css)
parsedCss.walkAtRules((rule) => {
    if (/^(?:-webkit-)?keyframes$/i.test(rule.name)) {
        if (!rule.params.trim().startsWith("hotel-chat-")) {
            throw new Error(`Unprefixed widget keyframe: ${rule.params}`)
        }
        rule.walkRules((child) => {
            for (const selector of child.selectors) {
                if (!/^(?:from|to|(?:0|[1-9]\d?|100)%)$/.test(selector.trim())) {
                    throw new Error(`Invalid keyframe selector: ${selector}`)
                }
            }
        })
    }
})
parsedCss.walkRules((rule) => {
    let ancestor = rule.parent
    while (ancestor) {
        if (ancestor.type === "atrule" && /^(?:-webkit-)?keyframes$/i.test(ancestor.name)) return
        ancestor = ancestor.parent
    }
    for (const selector of rule.selectors) {
        if (!selector.includes(".hotel-chat-widget")) {
            throw new Error(`Widget CSS contains an unscoped selector: ${selector}`)
        }
    }
})
if (/(^|\s)(?:body|html|:root)\s*\{|@property\s|@layer\s|@(?:-webkit-)?keyframes\s+(?!hotel-chat-)/.test(css)) {
    throw new Error("Widget CSS contains a host reset or unprefixed global rule")
}
parsedCss.walkDecls((decl) => {
    if (/^animation(?:-name)?$/.test(decl.prop) && /(?:^|[ ,(])(?:bounce|spin|pulse)(?:$|[ ,)])/.test(decl.value)) {
        throw new Error("Widget CSS contains an unprefixed animation name")
    }
})
if (/hotel-preview|connection-console|\.app\b/.test(css)) {
    throw new Error("Widget CSS contains demo selectors")
}
for (const selector of [
    ".hotel-chat-widget .status-dot",
    ".hotel-chat-widget .status-dot--ready",
    ".hotel-chat-widget .status-dot--error",
    ".hotel-chat-widget .status-dot--expired",
]) {
    if (!css.includes(selector)) throw new Error(`Missing required widget selector: ${selector}`)
}
console.log(JSON.stringify({ files, declarationsChecked: declarationPaths.length }, null, 2))
