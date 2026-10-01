# Agent guidance

Read `README.md` before changing setup, package, authentication, Socket.IO, host events, or QA documentation. It is the source of truth for the implemented widget/server contracts and the honest offline/live verification status.

## Guardrails

- Keep edits scoped to the requested files. Preserve the implemented Socket.IO source, local issuer, package exports, and generated widget shape.
- Use Node.js 22+, npm, and the committed lockfile. Use `127.0.0.1:5173` in local instructions and preserve exact-byte URL/context comparisons.
- Keep `CHAT_SERVER_KEY` server-only. Never invent credentials, profiles, JWTs, or booking sessions. Never trim signing keys; preserve `jsrsasign` plain-string/hex semantics.
- Treat `GetAuthToken` as a token callback, not authorization. A production provider must validate the booking session independently and sign the JWT. Validate returned context exactly before transport use.
- Preserve exact Socket.IO events and payloads: `authenticate` with JWT, `chat` with JSON, and `login`/`logout` with JSON. Readiness is `success` or the first valid response; local emit admission is not an acknowledgement.
- Preserve the 5-second auth retry, 30-second cap and expiry skew, 10-second token timeout, no queue/replay, identity-clear behavior, restart-retain behavior, and StrictMode-safe listener cleanup.
- Validate host event detail before use and keep outbound slug events string-only, scoped to the widget root, and bubbling.
- React 18/19 stay peer externals. The widget is ESM and bundler-required, not an IIFE; CSS remains scoped to `.hotel-chat-widget` with no body/demo styling.
- The native WebSocket module is diagnostic and unused. `DEFAULT_WS_SUBPROTOCOL` is intentionally empty; do not restore native WebSocket instructions as the default.
- Use the qualified offline React 18 browser evidence and the current test counts in `README.md`; do not broaden them into a clean full consumer install, live backend auth/chat, production drop-in parity, or error-free lint claim. Live QA requires explicit `--approve` and approved configuration; it sends one `Hello` only after auth.

## Change workflow

Inspect the relevant source and `README.md` first. Keep assistant-ui as the chat runtime boundary and preserve the 53-file shadcn source set. For code changes, run the repository scripts that the task requests and report warnings separately from failures. Do not deploy, publish, commit, alter a sibling consumer, or edit environment files unless explicitly requested.
