// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import * as React from "react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as RechartsPrimitive from "recharts"

import {
    ChartContainer,
    ChartLegendContent,
    ChartTooltipContent,
} from "./chart"

vi.mock("recharts", async () => {
    const actual = await vi.importActual<typeof RechartsPrimitive>("recharts")
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: ReactNode }) => (
            <>{children}</>
        ),
    }
})

const config = {
    visitors: { label: "Visitors", color: "#2563eb" },
}

const tooltipPayload: RechartsPrimitive.TooltipPayloadEntry[] = [
    {
        dataKey: "visitors",
        name: "visitors",
        value: 123,
        color: "#2563eb",
        payload: { visitors: 123 },
        graphicalItemId: "visitors",
    },
]

describe("chart components", () => {
    afterEach(cleanup)

    it("renders configured tooltip label, value, and indicator", () => {
        render(
            <ChartContainer config={config}>
                <ChartTooltipContent
                    active
                    label="visitors"
                    payload={tooltipPayload}
                    indicator="line"
                />
            </ChartContainer>
        )

        expect(screen.queryAllByText("Visitors").length).toBeGreaterThan(0)
        expect(screen.queryByText("123")).not.toBeNull()
        expect(document.querySelector(".w-1")).not.toBeNull()
    })

    it("invokes a custom tooltip formatter", () => {
        const formatter = vi.fn(
            (
                value: RechartsPrimitive.TooltipValueType | undefined,
                name: number | string | undefined,
                item: RechartsPrimitive.TooltipPayloadEntry,
                index: number,
                payload: ReadonlyArray<RechartsPrimitive.TooltipPayloadEntry>
            ) => {
                void name
                void item
                void index
                void payload
                return `formatted ${value}`
            }
        )

        render(
            <ChartContainer config={config}>
                <ChartTooltipContent
                    active
                    payload={tooltipPayload}
                    formatter={formatter}
                />
            </ChartContainer>
        )

        expect(formatter).toHaveBeenCalledOnce()
        expect(formatter).toHaveBeenCalledWith(
            123,
            "visitors",
            tooltipPayload[0],
            0,
            tooltipPayload[0].payload
        )
        expect(screen.queryByText("formatted 123")).not.toBeNull()
    })

    it("preserves a tooltip item with numeric dataKey across name changes", () => {
        const mounts = vi.fn()
        const StatefulFormatterResult = () => {
            React.useEffect(() => {
                mounts()
            }, [])
            return <span>stateful tooltip</span>
        }
        const formatter = () => <StatefulFormatterResult />
        const firstPayload: RechartsPrimitive.TooltipPayloadEntry[] = [
            {
                ...tooltipPayload[0],
                dataKey: 0,
                name: "first",
            },
        ]
        const secondPayload: RechartsPrimitive.TooltipPayloadEntry[] = [
            {
                ...firstPayload[0],
                name: "second",
            },
        ]
        const { rerender } = render(
            <ChartContainer config={{ "0": { label: "Zero", color: "#2563eb" } }}>
                <ChartTooltipContent
                    active
                    payload={firstPayload}
                    formatter={formatter}
                />
            </ChartContainer>
        )

        rerender(
            <ChartContainer config={{ "0": { label: "Zero", color: "#2563eb" } }}>
                <ChartTooltipContent
                    active
                    payload={secondPayload}
                    formatter={formatter}
                />
            </ChartContainer>
        )

        expect(mounts).toHaveBeenCalledOnce()
    })

    it("returns null for inactive and empty tooltips", () => {
        const { rerender } = render(
            <ChartContainer config={config}>
                <ChartTooltipContent active={false} payload={tooltipPayload} />
            </ChartContainer>
        )

        expect(document.querySelector("[class*='min-w']")).toBeNull()

        rerender(
            <ChartContainer config={config}>
                <ChartTooltipContent active payload={[]} />
            </ChartContainer>
        )

        expect(document.querySelector("[class*='min-w']")).toBeNull()
    })

    it("renders configured legend labels and colors", () => {
        render(
            <ChartContainer config={config}>
                <ChartLegendContent
                    payload={[{ dataKey: "visitors", value: "visitors", color: "#2563eb" }]}
                />
            </ChartContainer>
        )

        expect(screen.queryAllByText("Visitors").length).toBeGreaterThan(0)
        expect(document.querySelector("[style*='background-color']")).not.toBeNull()
    })

    it("keeps the legend swatch when hideIcon is set and returns null without payload", () => {
        const { rerender } = render(
            <ChartContainer config={config}>
                <ChartLegendContent
                    hideIcon
                    payload={[{ dataKey: "visitors", value: "visitors", color: "#2563eb" }]}
                />
            </ChartContainer>
        )

        expect(screen.queryAllByText("Visitors").length).toBeGreaterThan(0)
        expect(document.querySelector("[style*='background-color']")).not.toBeNull()

        rerender(
            <ChartContainer config={config}>
                <ChartLegendContent payload={[]} />
            </ChartContainer>
        )

        expect(screen.queryByText("Visitors")).toBeNull()
    })

    it("preserves a configured legend icon when an empty value keeps its key", () => {
        const mounts = vi.fn()
        const StatefulIcon = () => {
            React.useEffect(() => {
                mounts()
            }, [])
            return <span>legend icon</span>
        }
        const legendConfig = {
            first: { label: "First", color: "#2563eb", icon: StatefulIcon },
            second: { label: "Second", color: "#2563eb", icon: StatefulIcon },
        }
        const { rerender } = render(
            <ChartContainer config={legendConfig}>
                <ChartLegendContent
                    payload={[{ dataKey: "first", value: "", color: "#2563eb" }]}
                />
            </ChartContainer>
        )

        rerender(
            <ChartContainer config={legendConfig}>
                <ChartLegendContent
                    payload={[{ dataKey: "second", value: "", color: "#2563eb" }]}
                />
            </ChartContainer>
        )

        expect(mounts).toHaveBeenCalledOnce()
    })
})
