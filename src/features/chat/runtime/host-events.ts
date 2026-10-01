export type HostEventCallbacks = {
    onAuthToken: (token: string) => void
    onLogin: () => void
    onLogout: () => void
    onSessionExpired: () => void
}

const AUTH_EVENTS = new Set(["qikres/auth"])
const LOGIN_EVENTS = new Set(["qikres/login", "myroompass/login"])
const LOGOUT_EVENTS = new Set(["qikres/logout", "myroompass/logout"])

export function attachHostEvents(
    callbacks: HostEventCallbacks,
    targetDocument: Document = document
): () => void {
    const onEvent = (event: Event) => {
        if (AUTH_EVENTS.has(event.type)) {
            const detail = (event as CustomEvent<unknown>).detail
            if (
                detail &&
                typeof detail === "object" &&
                typeof (detail as { auth_token?: unknown }).auth_token ===
                    "string" &&
                (detail as { auth_token: string }).auth_token.length <=
                    16 * 1024
            )
                callbacks.onAuthToken(
                    (detail as { auth_token: string }).auth_token
                )
            return
        }
        if (event.type === "qikres/sessionExpired") {
            callbacks.onSessionExpired()
            return
        }
        if (LOGIN_EVENTS.has(event.type)) callbacks.onLogin()
        if (LOGOUT_EVENTS.has(event.type)) callbacks.onLogout()
    }
    const names = [
        "qikres/auth",
        "qikres/login",
        "qikres/logout",
        "qikres/sessionExpired",
        "myroompass/login",
        "myroompass/logout",
    ]
    names.forEach((name) => targetDocument.addEventListener(name, onEvent))
    return () =>
        names.forEach((name) =>
            targetDocument.removeEventListener(name, onEvent)
        )
}
