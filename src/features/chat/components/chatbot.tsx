import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MutableRefObject,
    type ReactNode,
    type RefObject,
} from "react"
import { resolveChatbotConfig } from "../../../lib/messaging/chatbot-config"
import type { ChatBotProps } from "../types"
import { attachHostEvents } from "../runtime/host-events"
import {
    ChatRuntimeProvider,
    type ChatRuntimeController,
} from "../runtime/chat-runtime-provider"
import { ChatWidget } from "./chat-widget"

function RuntimeWidget({
    rootRef,
    configuration,
    title,
    avatar,
    controllerRef,
}: {
    rootRef: RefObject<HTMLDivElement | null>
    configuration: Parameters<typeof ChatRuntimeProvider>[0]["configuration"]
    title?: string
    avatar?: string
    controllerRef: MutableRefObject<ChatRuntimeController | null>
}) {
    useLayoutEffect(() => {
        return () => {
            controllerRef.current = null
        }
    }, [controllerRef])

    return (
        <ChatRuntimeProvider
            configuration={configuration}
            title={title}
            onTrigger={(trigger) => {
                if (
                    !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(trigger.type) ||
                    trigger.type.length > 64
                )
                    return
                rootRef.current?.dispatchEvent(
                    new CustomEvent(`qikres/chatbot/${trigger.type}`, {
                        bubbles: true,
                    })
                )
            }}
        >
            {(controller) => {
                return (
                    <ControllerBridge
                        controller={controller}
                        controllerRef={controllerRef}
                    >
                        <ChatWidget
                            isRunning={controller.isRunning}
                            status={controller.status}
                            ready={controller.ready}
                            error={controller.error}
                            expiresAtUnixSeconds={
                                controller.expiresAtUnixSeconds
                            }
                            title={title}
                            avatar={avatar}
                            onRestart={controller.restart}
                        />
                    </ControllerBridge>
                )
            }}
        </ChatRuntimeProvider>
    )
}

function ControllerBridge({
    controller,
    controllerRef,
    children,
}: {
    controller: ChatRuntimeController
    controllerRef: MutableRefObject<ChatRuntimeController | null>
    children: ReactNode
}) {
    useLayoutEffect(() => {
        controllerRef.current = controller
        return () => {
            if (controllerRef.current === controller) controllerRef.current = null
        }
    }, [controller, controllerRef])
    return children
}

export function ChatBot(props: ChatBotProps | null | undefined) {
    const propToken = props?.x_auth_token ?? ""
    const [tokenState, setTokenState] = useState<{
        propToken: string
        hostToken: string | undefined
    }>({ propToken, hostToken: undefined })
    // Conditionally adjusting state during render keeps the new prop effective immediately.
    if (tokenState.propToken !== propToken) {
        setTokenState({ propToken, hostToken: undefined })
    }
    const committedPropToken = useRef(propToken)
    useLayoutEffect(() => {
        committedPropToken.current = propToken
    }, [propToken])
    const rootRef = useRef<HTMLDivElement>(null)
    const controllerRef = useRef<ChatRuntimeController | null>(null)
    const effectiveToken =
        tokenState.propToken !== propToken
            ? propToken
            : (tokenState.hostToken ?? propToken)
    let resolved: ReturnType<typeof resolveChatbotConfig> | null = null
    let configError: string | null = null
    try {
        resolved = resolveChatbotConfig({
            ...(props ?? {}),
            x_auth_token: effectiveToken,
        })
    } catch (error) {
        configError =
            error instanceof Error
                ? error.message
                : "Invalid chat configuration"
    }

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        return attachHostEvents(
            {
                onAuthToken: (token) => {
                    setTokenState((current) =>
                        current.propToken === committedPropToken.current
                            ? { ...current, hostToken: token }
                            : current
                    )
                },
                onLogin: () => {
                    void controllerRef.current?.login().catch(() => undefined)
                },
                onLogout: () => {
                    void controllerRef.current?.logout().catch(() => undefined)
                },
                onSessionExpired: () => controllerRef.current?.expireSession(),
            },
            root.ownerDocument
        )
    }, [])

    return (
        <div className="hotel-chat-widget" ref={rootRef}>
            {configError ? (
                <div role="alert">{configError}</div>
            ) : resolved ? (
                <RuntimeWidget
                    rootRef={rootRef}
                    configuration={resolved}
                    title={resolved.chatbox_title}
                    avatar={resolved.avatar}
                    controllerRef={controllerRef}
                />
            ) : null}
        </div>
    )
}

export default ChatBot
