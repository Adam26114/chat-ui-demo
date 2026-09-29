# Hotel chatbox WebSocket proof of concept

This is a React chat UI using **assistant-ui primitives** and custom message bubbles, plus the browser's native `WebSocket` API. It is a transport test for `ws://ubicompsystem.no-ip.org:3000`. It does not use Vercel AI SDK or call any AI service itself. The hotel background is fictional.

## Run and test

Use Node.js 22 or newer:

```bash
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

1. The server URL is filled in. Click **Connect**. A **Connected** status means the WebSocket handshake succeeded; it does not yet prove the chatbot protocol works.
2. Send `hello` with **Send raw payload** or type a message in the chat bubble composer. Both send the exact plain text you enter. No example message is sent automatically.
3. Inspect the traffic log: it shows connection events, exact outgoing payloads, exact incoming payloads, and errors. Incoming text also appears as a server response bubble. The raw payload box accepts JSON too; paste an agreed protocol payload there if plain text does not produce a reply.
4. Click **Disconnect** to end the socket. Refreshing the page also ends the connection.

If the server responds with JSON, the demo intentionally shows that JSON unchanged. A production adapter should decode the agreed fields, associate messages with a conversation, and handle reconnect, errors, and streaming only after the protocol is known.

## What this test can prove

| Observation | Meaning |
| --- | --- |
| Connected | Browser completed a standard WebSocket handshake with the endpoint. |
| Sent in log | Browser handed those exact bytes to the socket. This alone does not prove the server accepted the message format. |
| Received in log | The endpoint sent data back on the WebSocket. The bubble shows the same raw text. |
| Error / disconnected | Inspect browser DevTools Network → WS and backend logs; the browser often hides the handshake failure reason. |

We could not complete a live handshake from the development environment: the endpoint probe timed out before any message was sent. Run the page from a network that can resolve and reach that host. The result in your browser is the proof of connectivity.

**Important:** `http://localhost` can use `ws://`. An HTTPS WordPress page generally needs a `wss://` endpoint; the demo reports this before trying to connect. If port 3000 is blocked or the server only allows certain origins, the backend/network owner must enable access. A Socket.IO server needs a Socket.IO client and its own protocol; this demo tests standard WebSocket only. Do not add credentials to the URL or commit secrets to this project.

## Project pieces

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | assistant-ui external store runtime, owned chat bubbles, hotel preview, and test console. |
| `src/source/websocket-source.ts` | Standard WebSocket adapter; sends and displays raw text without protocol assumptions. |
| `src/source/types.ts` | UI-independent `MessageSource` contract. Incoming messages can arrive at any time. |
| `src/components/ui/button.tsx` | Owned, shadcn-style button source using CVA and Radix Slot. |
| `src/index.css` | Widget, console, and preview styles. |

assistant-ui handles chat composition/rendering primitives. shadcn/ui provides an approach to owned UI components; it does not establish the WebSocket connection. The native browser API does that here.

## Build and eventual WordPress integration

```bash
npm run lint
npm run build
```

The current `dist/` is a standalone Vite page, **not** a WordPress plugin. For WordPress, separate the widget entry point from the fictional preview and test console, mount it in a plugin-provided element, enqueue its built JS/CSS, and scope styles to the widget. Configure a reachable `wss://` endpoint on the production HTTPS site. Before adding protocol parsing, ask the backend owner for a real outgoing and incoming payload, authentication/session rules, and whether the endpoint speaks standard WebSocket or Socket.IO.

References: [assistant-ui external store](https://www.assistant-ui.com/docs/runtimes/custom/external-store), [assistant-ui primitives](https://www.assistant-ui.com/docs/primitives), [WordPress script enqueuing](https://developer.wordpress.org/plugins/javascript/enqueuing/).
