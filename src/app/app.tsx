import { ChatRuntimeProvider } from "@/features/chat/runtime/chat-runtime-provider"
import { ChatWidget } from "@/features/chat/components/chat-widget"
import { ConnectionConsole } from "@/features/connection-console/components/connection-console"
import { HotelPreview } from "@/features/hotel-preview/components/hotel-preview"

export default function App() {
    return (
        <ChatRuntimeProvider>
            {(controller) => (
                <>
                    <HotelPreview
                        heroSlot={
                            <ConnectionConsole
                                status={controller.status}
                                events={controller.events}
                                connect={controller.connect}
                                disconnect={controller.disconnect}
                                sendRaw={controller.sendRaw}
                            />
                        }
                    />
                    <div className="demo-label">
                        <span className="demo-label-dot" /> WEBSOCKET POC{" "}
                        <span>assistant-ui primitives + custom UI</span>
                    </div>
                    <ChatWidget
                        isRunning={controller.isRunning}
                        status={controller.status}
                    />
                </>
            )}
        </ChatRuntimeProvider>
    )
}
