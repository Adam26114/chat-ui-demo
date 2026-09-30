# AGENT.md — Hotel chat UI WebSocket proof of concept

Read this file and `README.md` before changing the project. The goal is a customizable React chatbox for a hotel website that can later be mounted in WordPress. It should work with a third-party chatbot or a live-agent source. The current app is a **standalone proof of concept**, not a WordPress plugin.

The hotel preview is fictional. The server protocol, authentication, message schema, history, and streaming behavior are not yet documented. Do not invent them or describe the server as working without a real browser exchange. Explain changes to the user mainly in Burmese, using English for code and technical terms. Write code comments and project documentation in clear English.

## Stack

- React 19, TypeScript, Vite 8, npm, and the committed `package-lock.json`. Use Node.js 22 or newer.
- `@assistant-ui/react` primitives and `useExternalStoreRuntime` provide chat mechanics. The message bubbles, launcher, header, and composer markup/styles are ours.
- The browser's native `WebSocket` API handles transport. Vercel AI SDK is not required for this UI-only demo.
- Styling uses custom CSS in `src/index.css`, Lucide icons, and an owned shadcn-style `Button` built with CVA and Radix Slot. The Tailwind Vite plugin is configured, but the full shadcn/ui registry is not installed.
- No Next.js, Convex, Redux, database, backend proxy, or WordPress plugin is present. Add a dependency only when a task requires it.

## 1. Build from existing patterns, not new ones

Inspect the existing runtime, source adapter, components, and CSS before introducing a new pattern. Preserve `MessageSource` as the boundary between UI and chatbot/live-agent transport. Extend a component where its current owner already handles the behavior. Keep message state in the assistant-ui external store integration; do not mirror it into another state manager. Keep WebSocket protocol handling out of bubble components.

The current source map is:

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Chat runtime/state, custom bubbles, connection console, fictional hotel preview. |
| `src/source/types.ts` | UI-independent `MessageSource` contract and message types. |
| `src/source/websocket-source.ts` | Native WebSocket connection, exact send/receive, status and traffic events. |
| `src/components/ui/button.tsx` | Reusable owned button. |
| `src/index.css` | Preview, widget, console, and responsive styles. |
| `README.md` | Setup, test interpretation, known limits, WordPress next steps. |

## 2. How to search: `grep -l` first

Search for a concept before creating a type, function, component, or dependency. Use `rg -l 'pattern' src` to get matching **filenames** first, then read only the likely files; `rg --files` lists paths. `rg -l` is the fast equivalent of the heading's `grep -l` instruction. If `rg` is unavailable, use `grep -Rl`. Do not add `SOURCE OF TRUTH KEYWORDS` to every file solely to support search; use clear symbol names and focused comments.

## 3. The layered architecture

1. **Presentation:** `src/App.tsx` renders the fictional page, test console, and chat widget. assistant-ui primitives manage composer/thread behavior; owned components control their look.
2. **Chat state:** `ChatRuntime` holds the message list, maps it to `ThreadMessageLike`, subscribes to incoming messages, and passes `onNew` through `useExternalStoreRuntime`.
3. **Source boundary:** `src/source/types.ts` defines `MessageSource`. Incoming messages may arrive without a preceding user message, which also supports a future live agent.
4. **Transport:** `WebSocketSource` owns connect/disconnect, browser events, raw frames, and connection status. Adapt a documented backend message schema here, without coupling the UI to a particular chatbot.

The editable default endpoint is `ws://ubicompsystem.no-ip.org:3000`. The user clicks **Connect**; the app does not send automatically. Chat messages and the raw test payload are sent as plain text exactly as entered. Incoming text appears unchanged in the traffic log and a server bubble. The current UI treats one received frame as one complete message; JSON parsing and streaming assembly are not implemented.

**Connected** proves a WebSocket handshake, **Sent** shows the browser handed bytes to the socket, and **Received** shows the server sent a frame back. None alone proves chatbot-level understanding. The prior development-environment probe timed out, so do not claim the endpoint was verified. If a browser test fails, inspect DevTools Network → WS and the server logs. Confirm whether the backend is standard WebSocket or Socket.IO before changing the client; their protocols are not interchangeable.

## 4. Production-grade TypeScript

Use specific TypeScript types at boundaries and reuse the types in `src/source/types.ts` and `websocket-source.ts`. Narrow incoming data before interpreting it; avoid `any`, unchecked assertions, duplicated message shapes, and guessed backend fields. `unknown` is appropriate for untrusted parsed data until validated. Preserve cleanup for listeners and sockets and guard against events from an obsolete connection. Do not treat a simulated adapter test as proof of real-server connectivity.

Run `npm run build` after code edits; it includes the TypeScript check. Keep a fresh clone installable with `npm install` and the lockfile.

## 5. Validate every input with Zod

**Current state:** Zod is not installed. The raw-payload box intentionally accepts arbitrary text/JSON to discover the server contract; the WebSocket adapter currently checks the URL scheme and browser mixed-content case. Do not claim the demo already performs Zod validation.

For new structured forms or a production protocol, add Zod and define schemas at the relevant boundaries: URL configuration, form input, and parsed incoming server frames. Validate before trusting or rendering structured fields, show useful errors, and keep the raw test path able to send exact frames during protocol discovery. Do not invent a JSON message schema merely to satisfy this heading. Browser validation does not replace validation by the backend.

## 6. Inline comment context injection

Add comments where the reason is not obvious: the `MessageSource` boundary, raw-frame behavior, mixed-content rule, and stale-socket event guard are examples. For complex new modules, a short file-level comment may use `SOURCE OF TRUTH KEYWORDS`, `WHAT`, `WHY`, and `WHERE` to help future searches. Use specific keywords and keep them current. Avoid a repeated comment above every trivial function or a comment that simply narrates the code.

## 7. UI

Own the message bubble and widget design while using assistant-ui primitives for chat behavior. Reuse the local Button and existing CSS patterns. Preserve keyboard access, visible connection/error status, readable messages, and responsive layouts. Display actual received data rather than fabricated chatbot replies.

The current `dist/` is a standalone Vite preview. For WordPress work, separate the widget/runtime from the fictional page and test console, build a dedicated mount entry, enqueue built JS/CSS from a plugin or theme, scope styles so they do not affect the WordPress theme, and configure a production `wss://` endpoint. An HTTPS WordPress page cannot use insecure `ws://` directly. Do not say this integration is complete before it is built and tested.

## 8. Delivery

1. Read the relevant files and make the smallest coherent change. Run `npm install` if dependencies are absent or changed.
2. For code edits, run `npm run lint` and `npm run build`. Use `npm run dev` for browser checks where available.
3. For transport edits, check connection, exact outgoing payload, received frames, disconnect, and error handling. Report simulated tests separately from a real browser connection to the supplied endpoint.
4. Update `README.md` when setup, protocol assumptions, or known limits change. State any backend information still needed: real outgoing/incoming frames, auth/session method, conversation IDs, streaming, and reconnect expectations.

Do not deploy, publish, alter a production WordPress site, or send messages to a live customer channel without a task authorizing it. Do not use git unless asked.

## Browser automation safety

Browser automation may submit forms or reach authenticated and production services. Limit tests to the requested demo flow, avoid unrelated account or destructive actions, and do not capture or commit credentials or session data. Do not bypass mixed-content protection. Use `wss://` for an HTTPS site and keep secrets out of browser source and traffic logs.