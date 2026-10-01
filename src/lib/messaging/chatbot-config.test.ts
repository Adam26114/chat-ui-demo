import { describe, expect, it } from "vitest"
import { equalChatSessionContext, resolveChatbotConfig } from "./chatbot-config"

describe("resolveChatbotConfig", () => {
    it("rejects null and undefined with a safe configuration error", () => {
        expect(() =>
            resolveChatbotConfig(null, "https://example.test/app/")
        ).toThrow("Missing required chat configuration")
        expect(() => resolveChatbotConfig(undefined)).toThrow(
            "Missing required chat configuration"
        )
    })

    it("preserves exact bytes and does not normalize values", () => {
        const config = resolveChatbotConfig(
            {
                app_key: " app ",
                customer_id: "customer",
                property_code: "PROPERTY",
                booking_link: " booking ",
                login_link: "login",
                payment_link: "payment",
                x_auth_token: "",
            },
            "https://example.test/"
        )
        expect(config.context.app_key).toBe(" app ")
        expect(config.context.booking_link).toBe(" booking ")
    })

    it("keeps display fields outside the identity context", () => {
        const config = resolveChatbotConfig(
            {
                app_key: "app",
                customer_id: "customer",
                chatbox_title: "Hotel",
                avatar: "avatar.png",
            },
            "https://example.test/"
        )
        expect(config.chatbox_title).toBe("Hotel")
        expect(config.avatar).toBe("avatar.png")
        expect(config.context).not.toHaveProperty("chatbox_title")
        expect(config.context).not.toHaveProperty("avatar")
    })

    it("uses the custom provider and rejects a token without one", () => {
        const getAuthToken = async () => ({
            token: "issued",
            expiresAtUnixSeconds: 1,
            context: resolveChatbotConfig(
                { app_key: "app", customer_id: "customer" },
                "https://example.test/"
            ).context,
        })
        const config = resolveChatbotConfig(
            {
                app_key: "app",
                customer_id: "customer",
                x_auth_token: "token",
                getAuthToken,
            },
            "https://example.test/"
        )
        expect(config.getAuthToken).toBe(getAuthToken)
        expect(() =>
            resolveChatbotConfig(
                {
                    app_key: "app",
                    customer_id: "customer",
                    x_auth_token: "token",
                },
                "https://example.test/"
            )
        ).toThrow("getAuthToken provider")
    })

    it("defaults links and compares all context fields", () => {
        const config = resolveChatbotConfig(
            { app_key: "app", customer_id: "customer" },
            "https://example.test/base/"
        )
        expect(config.context.booking_link).toBe(
            "https://example.test/base/reservation"
        )
        expect(config.context.login_link).toBe(
            "https://example.test/base/login"
        )
        expect(config.context.payment_link).toBe(
            "https://example.test/base/reservation/payment"
        )
        expect(
            equalChatSessionContext(config.context, { ...config.context })
        ).toBe(true)
    })

    it("uses the exact local root for empty and null links", () => {
        const omitted = resolveChatbotConfig(
            {
                app_key: "synthetic-app",
                customer_id: "synthetic-customer",
                property_code: "synthetic-property",
            },
            "http://127.0.0.1:5173/"
        )
        const config = resolveChatbotConfig(
            {
                app_key: "synthetic-app",
                customer_id: "synthetic-customer",
                property_code: "synthetic-property",
                booking_link: "",
                login_link: null,
                payment_link: "",
            },
            "http://127.0.0.1:5173/"
        )
        expect(config.context.booking_link).toBe(
            "http://127.0.0.1:5173/reservation"
        )
        expect(config.context.login_link).toBe("http://127.0.0.1:5173/login")
        expect(config.context.payment_link).toBe(
            "http://127.0.0.1:5173/reservation/payment"
        )
        expect(config.context.booking_link).toBe(omitted.context.booking_link)
        expect(config.context.login_link).toBe(omitted.context.login_link)
        expect(config.context.payment_link).toBe(omitted.context.payment_link)
    })

    it("preserves explicitly provided link bytes, including a custom port", () => {
        const config = resolveChatbotConfig(
            {
                app_key: "synthetic-app",
                customer_id: "synthetic-customer",
                booking_link: "http://127.0.0.1:5000/custom reservation",
                login_link: " login-byte ",
                payment_link: "payment-byte",
                serverUrl: "ws://example.test:5000",
            },
            "http://127.0.0.1:5173/"
        )
        expect(config.context.booking_link).toBe(
            "http://127.0.0.1:5000/custom reservation"
        )
        expect(config.context.login_link).toBe(" login-byte ")
        expect(config.context.payment_link).toBe("payment-byte")
        expect(config.serverUrl).toBe("ws://example.test:5000")
    })
})
