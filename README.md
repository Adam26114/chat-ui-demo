# Hotel chat UI and Socket.IO widget

This repository contains a React 19/Vite demo, a Socket.IO chat source, a local token issuer, and a packaged React widget. The selected frontend command is `dev:wbe` (Vite mode `development.wbe`), with the existing UI, assistant-ui runtime, and retained 53-file shadcn source set preserved. The hotel page is fictional. The live backend, its authentication, and chat exchange remain unverified, so this is not a production drop-in parity claim.

## Local setup

Use Node.js 22 or newer and npm. For a fresh setup, copy the templates without overwriting any existing configured local files:

```bash
npm install
cp -n .env.example .env.local
cp -n .env.server.example .env.server.local
```

The templates have blank credential fields, while existing ignored `.env.local` and `.env.server.local` files are preserved and may already be configured. Fill values manually with approved values only; never add real credentials, JWTs, or signing keys to source control. Public `VITE_*` values belong in `.env.local`. Server-only values belong in `.env.server.local`. This is a root-only local profile: the two root templates are aligned, but values are not automatically imported from another profile. `CHAT_SERVER_KEY` must never be a `VITE_*` variable, and signing keys must not be trimmed. When whitespace is meaningful, quote the environment value. `jsrsasign` treats a plain string signing key with its plain-string/hex semantics; do not silently normalize it.

Use separate terminals:

```bash
npm run dev:server
npm run dev
```

The local issuer listens on `127.0.0.1:8787`; its default chat base URL is `http://127.0.0.1:5173/`, and the only supported local demo entry is exactly `http://127.0.0.1:5173/`. Keep this spelling consistently. Exact-byte comparisons reject differences in `localhost` versus `127.0.0.1`, case, or whitespace; signing and context checks do not normalize URLs. The local issuer accepts only an anonymous context with `x_auth_token: ""`. A non-empty booking token requires an authorized production `getAuthToken` provider and is rejected locally.

The browser-visible demo settings are `VITE_CHAT_SERVER`, `VITE_APP_KEY`, `VITE_CUSTOMER`, `VITE_PROPERTY`, `VITE_BOOKING_LINK`, `VITE_LOGIN_LINK`, `VITE_PAYMENT_LINK`, `VITE_CHATBOX_TITLE`, and `VITE_AVATAR`. The server requires `CHAT_SERVER_KEY`, `CHAT_APP_KEY`, and `CHAT_CUSTOMER_ID`; optional server settings include the property/links, `CHAT_BASE_URL`, `CHAT_ISSUER_PORT`, `CHAT_ALLOWED_ORIGINS`, and `CHAT_SERVER_URL`. Do not use fake keys or invented profiles.

For the selected `dev:wbe` mapping, `VITE_CHAT_SERVER` and `CHAT_SERVER_URL` are both `ws://ubicompsystem.no-ip.org:5000`. This is the remote Socket.IO backend, not a browser URL for the issuer and not the issuer port. Port `8787` remains the local issuer and Vite's normal browser proxy target. The old port `3000` is not part of this mapping. Empty booking, login, and payment links use page-relative browser defaults. Do not copy JWT fixtures or keys just to enable authentication.

## Widget package

Build the package and inspect the generated artifacts:

```bash
npm run build:widget
npm pack
```

The package exports a default or named `ChatBot` from `hotel-chat-ui-demo/chatbot`, and CSS from `hotel-chat-ui-demo/chatbot.css`:

```tsx
import ChatBot, { ChatBot as NamedChatBot } from "hotel-chat-ui-demo/chatbot"
import "hotel-chat-ui-demo/chatbot.css"
```

`npm run build:widget` produces `dist-widget/chatbot.es.js`, `dist-widget/style.css`, and declaration files under `dist-widget/types`. React 18 and 19 are peer externals. The package is ESM-only, not an IIFE, and requires a host bundler. CSS is scoped under `.hotel-chat-widget`; the package does not style `body` or provide a demo page. Do not publish from this workflow. Sibling consumption is future work after approval:

```bash
npm install ../hotel-chat-ui-demo/hotel-chat-ui-demo-0.0.0.tgz
```

The sibling consumer is unchanged now.

### Props and authentication contract

All legacy props remain nullable and optional: `app_key`, `customer_id`, `property_code`, `booking_link`, `login_link`, `payment_link`, `x_auth_token`, `chatbox_title`, and `avatar`. The transport props are `getAuthToken`, `serverUrl`, and `tokenEndpoint`.

The exported types are:

```ts
type AuthSession = {
    token: string
    expiresAtUnixSeconds: number
    context: ChatSessionContext
}

type GetAuthToken = (request: {
    context: ChatSessionContext
    signal: AbortSignal
}) => Promise<AuthSession>
```

`ChatSessionContext` has exactly these seven string fields: `app_key`, `customer_id`, `property_code`, `booking_link`, `login_link`, `payment_link`, and `x_auth_token`. The returned issuer context is validated exactly against the requested context, and the JWT claims are checked before use. A browser callback is an authorization-token provider, not an authorization decision. A production provider backend must independently validate the booking session and sign the JWT. Keep `CHAT_SERVER_KEY` only in the ignored local server configuration; never expose it in browser bundles, logs, committed files, or generated artifacts. Never log JWTs. If the signing key was previously exposed in browser code, the owner must rotate it. Remote `ws://` or `http://` transport is not TLS protected.

### Runtime JWT flow

For the local anonymous flow, the browser POSTs `/api/chat/token` to the Vite proxy. The issuer signs an HS256 JWT with the server-only `CHAT_SERVER_KEY`. Its header is `{"alg":"HS256","typ":"JWT"}`; its claims are `nbf`, `iat`, `exp` (one hour), and `data`, where `data` is exactly the seven-field context above. The browser checks the claim shape, expiry, and exact context, but does not verify the cryptographic signature. It sends the raw JWT on Socket.IO `authenticate`, then treats `success` or the first valid response as readiness. The browser does not sign tokens, and no static JWT is required.

The reference fixture is `frontend/chat_server_json/jwt_token.json`, an unsigned documentation/sample-claims fixture. It is not read by the reference ChatBot, and the demo does not need that folder. The old README typo was `jwt_token.js`, not the JSON filename. A fixture is not a credential and must not be copied into local configuration. The `x_auth_token` booking value is distinct from the Socket.IO JWT. The local issuer supports anonymous context only; a non-empty value requires an authorized backend `getAuthToken` provider. Do not trust a query token or treat the local issuer as production parity.

Socket.IO uses these exact application messages:

- Authenticate with the JWT on the `authenticate` event.
- Send chat JSON on `chat`: `{"input": text, "x_auth_token": context.x_auth_token}`.
- Send login/logout JSON on `login` and `logout`, each containing `x_auth_token`.
- Read `success` or the first valid `response` as readiness. A valid response is a non-empty string within the message limit.

Authentication retries every 5 seconds and has a 30-second cap. Token requests have a 10-second timeout. Refresh and readiness retain a 30-second expiry skew. Admission is local after `emit`; it is not a server acknowledgement. There is no queue or replay. An identity change clears the conversation; `restart` retains the conversation.

The six host document events are `qikres/auth`, `qikres/login`, `qikres/logout`, `qikres/sessionExpired`, `myroompass/login`, and `myroompass/logout`. The auth event is accepted only when `detail.auth_token` is a string. Outbound trigger events use the validated string slug `qikres/chatbot/<slug>`, bubble from the widget root, and are dispatched as `CustomEvent`s. Listener cleanup is required and is StrictMode-safe.

The native WebSocket adapter is retained only as unused diagnostic code. Its `DEFAULT_WS_SUBPROTOCOL` is an empty string; it is not the widget's transport.

## Offline verification and live QA

The actual offline verification completed here is 77 Vitest tests across 11 Vitest files plus 10 Node tests, 87 total, all passing. `npx tsc --noEmit -p tsconfig.app.json` passes. `npm run lint` passes with 14 existing warnings; no runtime or UI warnings were fixed. `npm run build` passes with the existing client-bundle warning for a chunk over 500 kB (the client bundle is about 755 kB), so the build is not warning-free. `npm run build:widget` passes, including TypeScript declarations and all 16 declaration files. `npm run check:widget` also passes with all 16 declaration files verified. Widget checks preserve status dots, keep React external as both a peer and development dependency, and preserve the package contract.

### Qualified offline React 18 browser verification

The packed widget was verified in the `.verification/consumer` fixture with React 18.3.1 and React DOM 18.3.1 from the minimal offline-cached peer install. The initial full consumer `npm install --offline` failed with `ENOTCACHED` because `@vitejs/plugin-react` and `@assistant-ui/react` were not cached; Vite aliases were therefore pointed at the explicit cached React 18.3.1 peer packages. This is a qualified offline browser result, not a claim that a clean full consumer install passed.

Actual browser DevTools showed React renderer 18.3.1 with no errors. Consumer typecheck and build passed. After waiting, the title/header changed without an extra auth request; an identity change made a fresh request. Close, minimize, reopen, keyboard launcher Enter, and Tab flows passed. Controlled auth rejection showed an error and visible restart. Computed host styles were unchanged on desktop and at mobile width 390px; screenshots are retained in the ignored `.verification` directory. Ready-state composer/send behavior is covered by unit tests, not real-backend QA.

No live authentication or chat attempt was made during this implementation. Explicit approval is still required. The observed `Authentication timed out` message means the client waited 30 seconds for server confirmation after connecting; it does not necessarily mean that a token was missing. The selected profile now has the correct endpoint and context, but remote authentication remains UNVERIFIED. Environment values load at startup: after changing them, restart both the existing issuer and Vite processes in their own terminals and reload the exact root URL. Do not start duplicate services or stop an unknown process occupying port 5173 or 8787. No development services or browser were started automatically; Node tests used temporary synthetic loopback servers.

For an explicitly approved authentication-only live attempt, run this without `--chat`:

```bash
npm run qa:live -- --approve
```

After separate explicit approval, a chat attempt may be run separately:

```bash
npm run qa:live -- --approve --chat
```

The second command sends exactly one `Hello`, and only after authentication. `qa:live` starts a separate issuer using `CHAT_ISSUER_PORT`; it collides with a running development issuer on 8787. Preflight port ownership separately, and never stop or reuse an unknown service. After explicit approval, Node-only authentication may be run with an already-confirmed free issuer port:

```bash
CHAT_ISSUER_PORT=8788 npm run qa:live -- --approve
```

This alternate port command contacts the backend and does not merely check availability. It does not change Vite's browser proxy, which remains 8787. Node's `process.loadEnvFile` preserves that explicit `CHAT_ISSUER_PORT=8788` override. `ws://` is not TLS protected. Port ownership of 5173 and 8787 is required for any later approved browser verification.

The live QA commands above were not run in this implementation. JWT/provider parity is currently synthetic, not proof of the real backend or a complete browser flow. Do not assume live QA approval, credentials, or remote chat availability.

## Scope and deferred work

The demo and widget share the assistant-ui external-store runtime and the shadcn foundation. Cross-tab coordination, worker transport, history, legacy six-bundle compatibility, and a WordPress installer are deferred. The widget package is the implemented integration surface; production hosting, backend authorization, and real-backend chat remain unverified. The qualified offline React 18 browser result above does not cover a clean full consumer install or live backend exchange.
