# Hotel chatbox WebSocket proof of concept

This is a React chat UI using **assistant-ui primitives** and custom message bubbles, plus the browser's native `WebSocket` API. It is a transport test for `ws://ubicompsystem.no-ip.org:3000`. It does not use Vercel AI SDK or call any AI service itself. The hotel background is fictional.

## WebSocket configuration

The editable QA URL defaults to `ws://ubicompsystem.no-ip.org:3000`, and the optional WebSocket subprotocol defaults to the supplied candidate `ubicomp-chat`. Its meaning is unconfirmed: the app offers it only as protocol metadata, and the backend owner must confirm whether the supplied string is actually an authentication token or some other field. Configure the URL and protocol in the connection console before clicking **Connect**. Use a blank protocol to call the native WebSocket constructor without a subprotocol; surrounding whitespace is trimmed. The app reports the browser's actual negotiated `socket.protocol` after a successful handshake and does not claim a requested protocol was negotiated unless the browser reports it.

## Run and test

Use Node.js 22 or newer:

```bash
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

1. The server URL is filled in. Click **Connect**. A **Connected** status means the WebSocket handshake succeeded; it does not yet prove the chatbot protocol works.
2. Send `hello` with **Send raw payload** or type a message in the chat bubble composer. The raw payload sends the exact text you enter, including surrounding whitespace; the composer trims surrounding whitespace before sending. No example message is sent automatically.
3. Inspect the traffic log: it shows connection events, exact outgoing payloads, exact incoming payloads, and errors. Incoming text also appears as a server response bubble. The raw payload box accepts JSON too; paste an agreed protocol payload there if plain text does not produce a reply.
4. Click **Disconnect** to end the socket. Refreshing the page also ends the connection.

If the server responds with JSON, the demo intentionally shows that JSON unchanged. A production adapter should decode the agreed fields, associate messages with a conversation, and handle reconnect, errors, and streaming only after the protocol is known.

## What this test can prove

| Observation          | Meaning                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Connected            | Browser completed a standard WebSocket handshake with the endpoint.                                               |
| Sent in log          | Browser handed those exact bytes to the socket. This alone does not prove the server accepted the message format. |
| Received in log      | The endpoint sent data back on the WebSocket. The bubble shows the same raw text.                                 |
| Error / disconnected | Inspect browser DevTools Network → WS and backend logs; the browser often hides the handshake failure reason.     |

The bounded browser QA test attempted only a connection against the supplied endpoint from `http://localhost:5173`, with no chatbot payload. The UI forwarded `ubicomp-chat` as the requested subprotocol; the browser failed the candidate connection with an error and close code 1006, and `socket.protocol` never became available. Clearing the field exercised the no-protocol constructor path; that connection also failed with an error and close code 1006. The matching HTTP/1.1 upgrade probes returned `500 Internal Server Error` both with and without `Sec-WebSocket-Protocol: ubicomp-chat`. These results do not identify the backend's expected protocol or whether the supplied string is an auth token.

**Important:** `http://localhost` can use `ws://`. An HTTPS WordPress page generally needs a `wss://` endpoint; the demo reports this before trying to connect. If port 3000 is blocked or the server only allows certain origins, the backend/network owner must enable access. A Socket.IO server needs a Socket.IO client and its own protocol; this demo tests standard WebSocket only. Do not add credentials to the URL or commit secrets to this project.

## Project pieces

| File                                                                         | Responsibility                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/app.tsx`                                                            | Top-level composition of the chat, connection console, and hotel preview.                             |
| `src/features/chat/components/`                                              | Chat UI components; `runtime/chat-runtime-provider.tsx` owns the assistant-ui external-store runtime. |
| `src/features/connection-console/components/`                                | Connection controls and socket traffic log UI.                                                        |
| `src/features/hotel-preview/components/`                                     | Fictional hotel preview UI.                                                                           |
| `src/lib/messaging/types.ts`                                                 | UI-independent `MessageSource` contract and message types.                                            |
| `src/lib/messaging/websocket-source.ts`                                      | Standard WebSocket adapter; sends and displays raw text without protocol assumptions.                 |
| `src/components/ui/`                                                         | Installed shadcn/ui primitive component sources, imported directly through `@/components/ui/...`.     |
| `src/hooks/use-mobile.tsx`                                                   | Generated shared mobile hook.                                                                         |
| `src/lib/utils.ts`                                                           | Shared UI utility helpers.                                                                            |
| `src/styles/theme.css`, `src/styles/base.css`, `src/styles/ui-overrides.css` | Shared theme, base, and UI override styles.                                                           |
| `src/index.css`                                                              | Global CSS import entry point. Feature styles remain colocated in each feature folder.                |

assistant-ui handles chat composition/rendering primitives and chat mechanisms such as autosizing. shadcn/ui provides the installed, owned UI foundation; it does not establish the WebSocket connection. The native browser API does that here. Domain UI belongs in feature folders, while `src/components/ui/` is for shared primitives only.

The project has the complete compatible standard shadcn/ui registry set installed: 53 UI component files from CLI 4.21.0 using the default new-york `registry:ui` registry. This is a source set, not a claim that every component is rendered or every provider is initialized, and the dependency increase does not import every runtime into the application. The legacy Radix toast component is not compatible with this CLI and was rejected; the supported `sonner` component is installed instead. Use `shadcn add` with explicit components for future additions or updates; the CLI `--all` path currently references a missing `attachment.json`. Review overwrites carefully because the Button source is customized. Extend the foundation through composition and CVA, rather than duplicating primitives. Zod is installed as a generated-form dependency, but raw WebSocket payloads remain intentionally unvalidated for protocol discovery.

## Build and eventual WordPress integration

```bash
npm run lint
npm run build
```

The current `dist/` is a standalone Vite page, **not** a WordPress plugin. The widget, fictional preview, and test console are now separated in the application composition. WordPress mounting in a plugin-provided element, built JS/CSS enqueueing, and style isolation from the WordPress theme are not built. Configure a reachable `wss://` endpoint on the production HTTPS site. Before adding protocol parsing, ask the backend owner for a real outgoing and incoming payload, authentication/session rules, and whether the endpoint speaks standard WebSocket or Socket.IO.

References: [assistant-ui external store](https://www.assistant-ui.com/docs/runtimes/custom/external-store), [assistant-ui primitives](https://www.assistant-ui.com/docs/primitives), [WordPress script enqueuing](https://developer.wordpress.org/plugins/javascript/enqueuing/).
