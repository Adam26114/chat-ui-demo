# AGENT.md — Hotel chat UI WebSocket proof of concept

Read this file and `README.md` before changing the project. The goal is a customizable React chatbox for a hotel website that can later be mounted in WordPress. It should work with a third-party chatbot or a live-agent source. The current app is a **standalone proof of concept**, not a WordPress plugin.

The hotel preview is fictional. The server protocol, authentication, message schema, history, and streaming behavior are not yet documented. Do not invent them or describe the server as working without a real browser exchange. Explain changes to the user mainly in Burmese, using English for code and technical terms. Write code comments and project documentation in clear English.

## Stack

- React 19, TypeScript, Vite 8, npm, and the committed `package-lock.json`. Use Node.js 22 or newer.
- `@assistant-ui/react` primitives and `useExternalStoreRuntime` provide chat mechanics. The message bubbles, launcher, header, and composer markup/styles are ours.
- The browser's native `WebSocket` API handles transport. Vercel AI SDK is not required for this UI-only demo.
- Styling uses the complete compatible standard shadcn/ui registry source set: 53 UI component files installed with CLI 4.21.0 from the default new-york `registry:ui` registry. Sources live under `src/components/ui/`; shared/generated hooks live under `src/hooks/`; shared utility helpers live in `src/lib/utils.ts`; shared CSS is imported through `src/index.css`; and feature CSS is colocated. The legacy Radix toast component is rejected by this CLI; use the supported installed `sonner` component instead. The Button source is customized and built with CVA and Radix Slot. Use direct imports from `@/components/ui/...`; keep domain UI in feature folders and shared primitives only in `src/components/ui/`. Extend primitives through composition and CVA, and keep assistant-ui primitives for autosize and other chat mechanisms. Use `shadcn add` with explicit components for additions or updates, because the CLI `--all` path currently references a missing `attachment.json`; review overwrites carefully. This source set does not mean every component is rendered or every provider is initialized, and the dependency increase does not import every runtime.
- No Next.js, Convex, Redux, database, backend proxy, or WordPress plugin is present. Add a dependency only when a task requires it.

## 1. Build from existing patterns, not new ones

Inspect the existing runtime, source adapter, components, and CSS before introducing a new pattern. Preserve `MessageSource` as the boundary between UI and chatbot/live-agent transport. Extend a component where its current owner already handles the behavior. Keep message state in the assistant-ui external store integration; do not mirror it into another state manager. Keep WebSocket protocol handling out of bubble components.

The current source map is:

| Path | Responsibility |
| --- | --- |
| `src/app/app.tsx` | Top-level composition of chat, connection console, and fictional hotel preview. |
| `src/features/chat/components/` | Chat components; chat runtime provider is at `src/features/chat/runtime/chat-runtime-provider.tsx`. |
| `src/features/connection-console/components/` | Connection controls and socket traffic log components. |
| `src/features/hotel-preview/components/` | Fictional hotel preview components. |
| `src/lib/messaging/types.ts` | UI-independent `MessageSource` contract and message types. |
| `src/lib/messaging/websocket-source.ts` | Native WebSocket connection, exact send/receive, status and traffic events. |
| `src/components/ui/` | Standard shadcn/ui primitive component sources, imported directly through `@/components/ui/...`. |
| `src/hooks/use-mobile.tsx` | Generated shared mobile hook. |
| `src/lib/utils.ts` | Shared UI utility helpers. |
| `src/styles/theme.css`, `src/styles/base.css`, `src/styles/ui-overrides.css` | Shared theme, base, and UI override styles. |
| `src/index.css` | CSS import entry point; feature CSS is colocated under each feature folder. |
| `README.md` | Setup, test interpretation, known limits, WordPress next steps. |

## 2. How to search: `grep -l` first

Search for a concept before creating a type, function, component, or dependency. Use `rg -l 'pattern' src` to get matching **filenames** first, then read only the likely files; `rg --files` lists paths. `rg -l` is the fast equivalent of the heading's `grep -l` instruction. If `rg` is unavailable, use `grep -Rl`. Do not add `SOURCE OF TRUTH KEYWORDS` to every file solely to support search; use clear symbol names and focused comments.

## 3. The layered architecture

1. **Presentation:** `src/app/app.tsx` composes the fictional page, test console, and chat widget from feature components. assistant-ui primitives manage composer/thread behavior and chat mechanisms such as autosize; owned components control their look.
2. **Chat state:** `ChatRuntime` holds the message list, maps it to `ThreadMessageLike`, subscribes to incoming messages, and passes `onNew` through `useExternalStoreRuntime`.
3. **Source boundary:** `src/lib/messaging/types.ts` defines `MessageSource`. Incoming messages may arrive without a preceding user message, which also supports a future live agent.
4. **Transport:** `src/lib/messaging/websocket-source.ts` owns connect/disconnect, browser events, raw frames, and connection status. Adapt a documented backend message schema here, without coupling the UI to a particular chatbot.

The editable default endpoint is `ws://ubicompsystem.no-ip.org:3000`. The user clicks **Connect**; the app does not send automatically. The raw test payload is sent as plain text exactly as entered, including surrounding whitespace; composer messages trim surrounding whitespace before sending. Incoming text appears unchanged in the traffic log and a server bubble. The current UI treats one received frame as one complete message; JSON parsing and streaming assembly are not implemented.

**Connected** proves a WebSocket handshake, **Sent** shows the browser handed bytes to the socket, and **Received** shows the server sent a frame back. None alone proves chatbot-level understanding. The prior development-environment probe timed out, so do not claim the endpoint was verified. If a browser test fails, inspect DevTools Network → WS and the server logs. Confirm whether the backend is standard WebSocket or Socket.IO before changing the client; their protocols are not interchangeable.

## 4. Production-grade TypeScript

Use specific TypeScript types at boundaries and reuse the types in `src/lib/messaging/types.ts` and `src/lib/messaging/websocket-source.ts`. Narrow incoming data before interpreting it; avoid `any`, unchecked assertions, duplicated message shapes, and guessed backend fields. `unknown` is appropriate for untrusted parsed data until validated. Preserve cleanup for listeners and sockets and guard against events from an obsolete connection. Do not treat a simulated adapter test as proof of real-server connectivity.

Run `npm run build` after code edits; it includes the TypeScript check. Keep a fresh clone installable with `npm install` and the lockfile.

## 5. Validate every input with Zod

**Current state:** Zod is installed as a generated-form dependency, but the raw-payload box intentionally accepts arbitrary text/JSON to discover the server contract; the WebSocket adapter currently checks the URL scheme and browser mixed-content case. Do not claim the demo validates raw payloads or performs protocol validation.

For new structured forms or a production protocol, add Zod and define schemas at the relevant boundaries: URL configuration, form input, and parsed incoming server frames. Validate before trusting or rendering structured fields, show useful errors, and keep the raw test path able to send exact frames during protocol discovery. Do not invent a JSON message schema merely to satisfy this heading. Browser validation does not replace validation by the backend.

## 6. Inline comment context injection

Add comments where the reason is not obvious: the `MessageSource` boundary, raw-frame behavior, mixed-content rule, and stale-socket event guard are examples. For complex new modules, a short file-level comment may use `SOURCE OF TRUTH KEYWORDS`, `WHAT`, `WHY`, and `WHERE` to help future searches. Use specific keywords and keep them current. Avoid a repeated comment above every trivial function or a comment that simply narrates the code.

## 7. UI

Own the message bubble and widget design while using assistant-ui primitives for chat behavior. Import shared primitives directly from `@/components/ui/...`; keep domain UI in feature folders and feature CSS colocated there. Reuse the local Button and existing CSS patterns. Preserve keyboard access, visible connection/error status, readable messages, and responsive layouts. Display actual received data rather than fabricated chatbot replies.

The current `dist/` is a standalone Vite preview. The widget/runtime is now separated from the fictional page and test console in the application composition. WordPress mounting in a plugin-provided element, a dedicated plugin mount entry, built JS/CSS enqueueing, and style isolation from the WordPress theme are not built. Configure a production `wss://` endpoint; an HTTPS WordPress page cannot use insecure `ws://` directly. Do not say this integration is complete before it is built and tested.

## 8. Delivery

1. Read the relevant files and make the smallest coherent change. Run `npm install` if dependencies are absent or changed.
2. For code edits, run `npm run lint` and `npm run build`. Use `npm run dev` for browser checks where available.
3. For transport edits, check connection, exact outgoing payload, received frames, disconnect, and error handling. Report simulated tests separately from a real browser connection to the supplied endpoint.
4. Update `README.md` when setup, protocol assumptions, or known limits change. State any backend information still needed: real outgoing/incoming frames, auth/session method, conversation IDs, streaming, and reconnect expectations.

Do not deploy, publish, alter a production WordPress site, or send messages to a live customer channel without a task authorizing it. Do not use git unless asked.

## Browser automation safety

Browser automation may submit forms or reach authenticated and production services. Limit tests to the requested demo flow, avoid unrelated account or destructive actions, and do not capture or commit credentials or session data. Do not bypass mixed-content protection. Use `wss://` for an HTTPS site and keep secrets out of browser source and traffic logs.
