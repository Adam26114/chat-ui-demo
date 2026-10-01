# QA ChatBot migration plan

**Status:** Saved for later - not approved for implementation

This document records a reviewed plan only. It is not implementation work, approval to begin any step, or evidence that any step has been completed.

## OBJECTIVE

`hotel-chat-ui-demo` is the main codebase and reusable replacement for the sibling `frontend/src/components/ChatBot.tsx`. Keep the current shadcn + assistant-ui UI and feature folders. Learn the backend flow from the frontend Socket.IO + JWT behavior. JWT signing moves to a localhost-only QA issuer per user choice. The sibling reference at `/Users/zweaungnaing/Developer/Project/vibe-coding/frontend` is read-only. All relative paths below are relative to the destination repository.

## STEPS

### 1. Define config and contracts (sequential)

Files: `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `.env.server.example`, `src/features/chat/types.ts`, `src/lib/messaging/types.ts`, `src/lib/messaging/chatbot-config.ts`.

- Pin the reference-installed `socket.io-client` `4.8.3` and server-only `jsrsasign` `11.1.3`.
- Preserve props `app_key`, `customer_id`, `property_code`, `booking_link`, `login_link`, `payment_link`, `x_auth_token`, `chatbox_title`, and `avatar`.
- Add optional `getAuthToken` for a host backend provider.
- Build future reuse of the appropriate QA config into ignored local files.
- The signing key `CHAT_SERVER_KEY` is never in browser `VITE*` variables.
- The auth result is a JWT with expiry and issuer-controlled session context.

### 2. Local JWT issuer (independent of step 3, after contracts)

Files: `server/config.mjs`, `server/token-service.mjs`, `server/index.mjs`, `vite.config.ts`.

- Bind Node to `127.0.0.1`.
- Add `POST /api/chat/token`; proxy token HTTP through Vite.
- Issue HS256 with `nbf`, `iat`, and `exp` one hour ahead, with data matching the reference. Use the same server-only `jsrsasign` and key encoding as the reference.
- Use a fixed server QA profile. Reject profile overrides, arbitrary claims, and non-empty booking tokens.
- Enforce body and rate limits, local origin / `Host` checks, no-store responses, and redacted errors.
- Anonymous local QA is only for the not-logged-in booking case.
- Reviewed interface:

  ```ts
  AuthSession {
    token,
    expiresAtUnixSeconds,
    context: {
      app_key,
      customer_id,
      property_code,
      booking_link,
      login_link,
      payment_link,
      x_auth_token,
    },
  }
  ```

- Issuer context is authoritative, not browser props. Local `x_auth_token` is `''`.
- A production provider validates the backend session independently; a browser callback is not authorization by itself.
- Resolve legacy prop defaults, then perform exact byte comparison with the server fixed profile. Do not implicitly trim, case-fold, or rewrite. Never trim the signing key. Missing app or customer configuration is a clear config error.
- Display title and avatar remain outside the JWT profile.

### 3. Transport (independent of step 2, after contracts)

Files: `src/lib/messaging/socketio-source.ts`, `src/lib/messaging/chat-auth.ts`, `src/lib/messaging/websocket-source.ts`.

- Implement `SocketIOMessageSource` as an adapter using the actual authenticate event and JWT, not subprotocol or header guesses.
- Use exact chat event JSON: `JSON.stringify({ input: text, x_auth_token })`, with `x_auth_token` from issuer-returned context token. Use exact login and logout event JSON: `JSON.stringify({ x_auth_token })`.
- Use the reference default Socket.IO path and transport negotiation.
- Gate ready on connect and app success, or the first valid response.
- Treat the first response as one complete assistant message, not chunk streaming.
- Authenticate on every connect and reconnect.
- Use a 5-second auth retry and a 30-second cap.
- Set a 10-second token request deadline with abort and deduplication within the source.
- Apply 30-second expiry skew. Do not queue or auto-replay chat, login, or logout while offline.
- Failed refresh, invalid auth, or timeout is a terminal error: ready false, cancel timers, disconnect, stop auto-reconnect, and retain the conversation unless identity changes. Explicit restart makes one fresh request.
- On expiry or invalid auth, disconnect, clear loading, and do not reload the page.
- An identity epoch aborts old token, socket, event, and send promises before the new context; clear the conversation.
- Retain native WebSocket only as unused diagnostic code. Clear hardcoded auth key and retain `DEFAULT_WS_SUBPROTOCOL = ''`.
- LIVE GATE after the adapter and issuer scaffold, before larger UI: authenticate with the actual approved QA profile JWT (opt-in), and accept either Socket.IO `success` or the first valid `response` within 30 seconds. On failure, report the actual auth error with no chat message and no guesses. An offline pass is not live QA proof. Anonymous acceptance remains UNVERIFIED.

### 4. Reusable wrapper (sequential after step 3)

Files: `src/features/chat/components/chatbot.tsx`, `src/features/chat/runtime/chat-runtime-provider.tsx`, `src/features/chat/runtime/host-events.ts`.

- Preserve original prop names and default semantics; `null` and `undefined` remain accepted.
- Keep `useExternalStoreRuntime` as the assistant-ui runtime and chat-state owner.
- Parameterize title and avatar while preserving the UI.
- Handle host events `qikres/auth`, `qikres/login`, `qikres/logout`, `qikres/sessionExpired`, `myroompass/login`, and `myroompass/logout` with cleanup.
- Bubble outbound events `qikres/chatbot/<validated trigger>` at the widget root.
- Require a token provider for non-empty booking tokens and explicitly reject those tokens locally.
- Keep one active socket with StrictMode cleanup.
- On a fresh context, abort old promises and clear previous messages.
- Do not force page reloads or provide fake backend responses.
- Append a user message once, after the emit is accepted.

### 5. Adapt UI/demo (sequential after step 4)

Files: `src/app/app.tsx`, the existing connection console and socket traffic log, `chat-widget.tsx`, `chat-thread.tsx`, `chat-composer.tsx`, `server-message.tsx`, `chat.css`, `src/styles/ui-overrides.css`.

- Preserve layout, colors, launcher, bubbles, and shadcn + assistant-ui.
- Replace misleading native WebSocket / subprotocol controls with Socket.IO auth status and a test message.
- Do not log keys in the UI.
- Send only when ready.
- Show expiry, errors, and restart visibly.
- Use safe Markdown links, skip HTML and unsafe URLs, and support `group_name` title substitution.
- Do not create room cards from unrelated HTTP fixtures.

### 6. Package (sequential after wrapper interface is stable)

Files: `src/chatbot.tsx`, `src/features/chat/widget.css`, `vite.widget.config.ts`, `tsconfig.widget.json`, `tsconfig.node.json`, `package.json`.

- Export the default `ChatBot` via `hotel-chat-ui-demo/chatbot` with typed ES entry; optionally provide named React / ReactDOM compatibility exports.
- Output `dist-widget/chatbot.es.js` and `style.css`, with a separate demo build.
- Make React and DOM peer dependencies `^18 || ^19`, dev-only, and externalize all React / JSX / DOM paths. Bundle other UI runtimes.
- Scope CSS under `.hotel-chat-widget` and widget-only styles; do not include host body, index, or demo CSS.
- Declarations contain no `@alias` or demo types.
- Future local package consumption is exactly: run `npm run build:widget`, then `npm pack` (no publish), and later, after approval, the sibling may run `npm install ../hotel-chat-ui-demo/hotel-chat-ui-demo-0.0.0.tgz` and `import ChatBot from 'hotel-chat-ui-demo/chatbot'` plus `hotel-chat-ui-demo/chatbot.css`. The sibling is not edited or installed now.
- Require a bundler; do not produce a global standalone / IIFE build.
- Git-ignore the tarball and `dist-widget`.

### 7. Verify and document (sequential)

Files: `vitest.config.ts`, tests beside modules, `server/token-service.test.mjs`, `src/features/chat/runtime/host-events.test.ts`, `README.md`, `.opencode/AGENT.md`.

- Add deterministic fake Socket.IO source unit tests for auth, exact events, 5-second retry, reconnect 30-second skew, terminal refresh failure, gating, cleanup, and identity out-of-order behavior.
- Test token signatures, claim overrides, non-empty token rejection, origin limits, no-store behavior, and absence of secrets.
- Add scripts `npm test`, `npm run lint`, `npm run build`, and `npm run build:widget`.
- Separately perform live QA auth with one approved test chat and an actual response only after ready.
- Verify browser StrictMode, keyboard behavior, restart, context behavior, React 18 consumer behavior, and CSS isolation.
- Keep offline testing distinct from real QA.

## CONSTRAINTS

- Work in the current repository only. The sibling is read-only. Do not publish, deploy, or change the production backend.
- Retain current feature folders and all 53 shared shadcn components.
- Do not use legacy `react-chat-widget`, Recoil, render-time worker creation, credential logs, or forced reloads.
- Do not add a new AI SDK, Next, or Redux.
- Defer SharedWorker / cross-tab coordination, persistent history, legacy 6 deployment bundles, and the WordPress installer.
- The first milestone is not full legacy behavior or drop-in production deployment parity.

Execution constraints for now: this is a saved plan only. Do not install dependencies, test, build, start servers, migrate, read environment files, copy keys, change `PROMPT.md`, change the reference, or change repository source. Do not run Git operations. Never include actual credentials in this plan; the key secret value is not needed.

## VERIFIED

Planning only: read `PROMPT.md` and the reference `ChatBot`, worker, types, packages, Vite, and current runtime UI. Confirmed reference Socket.IO event JWT behavior rather than native protocol behavior; installed reference versions are `socket.io-client` `4.8.3` and `jsrsasign` `11.1.3`; installed assistant-ui peers support React 18 and 19. Reviewed auth trust, lifecycle, and artifact scope. The reference JWS uses a plain string key with hex autodetection versus raw character encoding, so the server signer must be retained. No application files were changed, no actual credential values were read, and no QA auth tests were performed during planning. The user requested only that this plan be stored. NO IMPLEMENTATION AUTHORIZED.

This document itself was saved as the requested Markdown plan. Verification after writing must reread this Markdown, ensure all 7 steps and the 5 main sections plus status are present, and confirm that no other files changed.

## RISKS

- Anonymous QA acceptance remains unverified until the live authentication gate succeeds.
- The production issuer backend must validate a real booking session independently; the local issuer is not production authentication.
- No JWT or signing key may reach a browser bundle, logs, or at-rest artifacts. Insecure WS / HTTP remote connections are not TLS protected.
- A signing key previously exposed in a browser may require owner rotation.
- The core accepts `getAuthToken`, but the callback is not authorization.
- CSS and React 18 consumer compatibility must be tested.

## REVIEWED PLAN VS. WORK DONE

The sections above describe the reviewed future plan and its constraints. They do not report implementation progress. Work done for this request is limited to saving this document; no migration step, dependency operation, test, build, server run, environment read, credential handling, sibling change, or application source change is authorized or claimed.
