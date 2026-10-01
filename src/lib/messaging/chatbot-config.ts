import type {
    ChatBotProps,
    ChatSessionContext,
    GetAuthToken,
} from "../../features/chat/types"

export type ResolvedChatbotConfig = {
    context: ChatSessionContext
    chatbox_title: string
    avatar: string
    serverUrl: string
    tokenEndpoint: string
    getAuthToken?: GetAuthToken
}

export function validateChatSessionContext(
    context: Partial<ChatSessionContext> | null | undefined
): string[] {
    const required: Array<keyof ChatSessionContext> = [
        "app_key",
        "customer_id",
        "property_code",
        "booking_link",
        "login_link",
        "payment_link",
        "x_auth_token",
    ]
    if (!context) return required
    const missing = required.filter((key) => typeof context[key] !== "string")
    const extras = Object.keys(context).filter(
        (key) => !(required as readonly string[]).includes(key)
    )
    return [...missing, ...extras]
}

export function isValidChatSessionContext(
    context: Partial<ChatSessionContext> | null | undefined
): context is ChatSessionContext {
    return validateChatSessionContext(context).length === 0
}

export function equalChatSessionContext(
    a: ChatSessionContext,
    b: ChatSessionContext
): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

export function resolveChatbotConfig(
    props: ChatBotProps | null | undefined,
    baseUrl?: string
): ResolvedChatbotConfig {
    const source = props ?? {}
    const origin =
        baseUrl ??
        (typeof window === "undefined"
            ? "http://localhost/"
            : window.location.href)
    const context: ChatSessionContext = {
        app_key: source.app_key || "",
        customer_id: source.customer_id || "",
        property_code: source.property_code || "",
        booking_link:
            source.booking_link || new URL("reservation", origin).toString(),
        login_link: source.login_link || new URL("login", origin).toString(),
        payment_link:
            source.payment_link ||
            new URL("reservation/payment", origin).toString(),
        x_auth_token: source.x_auth_token || "",
    }
    const missing = (["app_key", "customer_id"] as const).filter(
        (key) => !context[key]
    )
    if (missing.length > 0) {
        throw new Error(
            `Missing required chat configuration: ${missing.join(", ")}`
        )
    }
    if (context.x_auth_token && !source.getAuthToken) {
        throw new Error("A getAuthToken provider is required with x_auth_token")
    }
    return {
        context,
        chatbox_title: source.chatbox_title || "",
        avatar: source.avatar || "",
        serverUrl: source.serverUrl || "/",
        tokenEndpoint: source.tokenEndpoint || "/api/chat/token",
        getAuthToken: source.getAuthToken,
    }
}
