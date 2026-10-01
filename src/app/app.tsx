import { ChatRuntimeProvider } from "@/features/chat/runtime/chat-runtime-provider"
import { ChatWidget } from "@/features/chat/components/chat-widget"
import { ConnectionConsole } from "@/features/connection-console/components/connection-console"
import { HotelPreview } from "@/features/hotel-preview/components/hotel-preview"
import { resolveChatbotConfig } from "@/lib/messaging/chatbot-config"
import type { ChatBotProps } from "@/features/chat/types"
import type { ConnectionStatus } from "@/lib/messaging/types"

const env = import.meta.env

function getDemoConfig(): ChatBotProps {
    return {
        serverUrl: env.VITE_CHAT_SERVER,
        app_key: env.VITE_APP_KEY,
        customer_id: env.VITE_CUSTOMER,
        property_code: env.VITE_PROPERTY,
        booking_link: env.VITE_BOOKING_LINK,
        login_link: env.VITE_LOGIN_LINK,
        payment_link: env.VITE_PAYMENT_LINK,
        chatbox_title: env.VITE_CHATBOX_TITLE,
        avatar: env.VITE_AVATAR,
    }
}

export default function App() {
    let config: ReturnType<typeof resolveChatbotConfig> | null = null
    let setupError: string | null = null
    try {
        config = resolveChatbotConfig(getDemoConfig())
    } catch (error) {
        setupError = error instanceof Error ? error.message : "Chat setup is incomplete."
    }

    const preview = (heroSlot: React.ReactNode) => (
        <HotelPreview heroSlot={heroSlot} />
    )

    if (!config) {
        return (
            <>
                {preview(
                    <div className="connection-console connection-console--setup-error" role="alert">
                        <strong>Chat setup needed</strong>
                        <span>{setupError}</span>
                        <small>Hotel preview is available. Add the public chat settings to enable the live assistant.</small>
                    </div>
                )}
                <div className="hotel-chat-widget">
                    <ChatWidget
                        isRunning={false}
                        status={"error" as ConnectionStatus}
                        ready={false}
                        error={setupError}
                        expiresAtUnixSeconds={null}
                        title={getDemoConfig().chatbox_title ?? undefined}
                        avatar={getDemoConfig().avatar ?? undefined}
                        onRestart={() => undefined}
                        hasRuntime={false}
                    />
                </div>
            </>
        )
    }

    return (
        <ChatRuntimeProvider configuration={config} title={config.chatbox_title}>
            {(controller) => (
                <>
                    {preview(
                        <ConnectionConsole
                            state={controller.state}
                            isRunning={controller.isRunning}
                            events={controller.events}
                            connect={controller.connect}
                            restart={controller.restart}
                            disconnect={controller.disconnect}
                            sendTest={controller.sendTest}
                        />
                    )}
                    <div className="demo-label">
                        <span className="demo-label-dot" /> SOCKET.IO DEMO{" "}
                        <span>assistant-ui primitives + custom UI</span>
                    </div>
                    <div className="hotel-chat-widget">
                        <ChatWidget
                            isRunning={controller.isRunning}
                            status={controller.status}
                            ready={controller.ready}
                            error={controller.error}
                            expiresAtUnixSeconds={controller.expiresAtUnixSeconds}
                            title={config.chatbox_title}
                            avatar={config.avatar}
                            onRestart={controller.restart}
                        />
                    </div>
                </>
            )}
        </ChatRuntimeProvider>
    )
}
