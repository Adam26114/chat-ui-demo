import type { MessageSource } from "../../lib/messaging/types"

export type ChatSessionContext = {
    app_key: string
    customer_id: string
    property_code: string
    booking_link: string
    login_link: string
    payment_link: string
    x_auth_token: string
}

export type AuthSession = {
    token: string
    expiresAtUnixSeconds: number
    context: ChatSessionContext
}

export type GetAuthToken = (request: {
    context: ChatSessionContext
    signal: AbortSignal
}) => Promise<AuthSession>

export type ChatBotProps = {
    app_key?: string | null
    customer_id?: string | null
    property_code?: string | null
    booking_link?: string | null
    login_link?: string | null
    payment_link?: string | null
    x_auth_token?: string | null
    chatbox_title?: string | null
    avatar?: string | null
    getAuthToken?: GetAuthToken
    serverUrl?: string | null
    tokenEndpoint?: string | null
}

export type { MessageSource }
