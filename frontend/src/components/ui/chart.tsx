"use client"

import * as React from "react"
import { cn } from '../../lib/utils';

// ChartConfig type
export type ChartConfig = {
  [key: string]: {
    label?: string
    color?: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {children}
    </div>
  )
}

interface ChartTooltipProps {
  children: React.ReactNode
  content?: React.ComponentType<any>
}

export function ChartTooltip({ children, content: Content }: ChartTooltipProps) {
  return <>{children}</>
}

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  nameKey?: string
  labelFormatter?: (value: any) => string
  formatter?: (value: any, name: string) => [string, string]
}

export function ChartTooltipContent({
  className,
  nameKey,
  labelFormatter,
  formatter,
  indicator,
  hideLabel,
  ...props
}: ChartTooltipContentProps & { indicator?: "line" | "dot" | "dashed" | "none"; hideLabel?: boolean }) {
  return <div className={cn("", className)} {...props} />
}

interface ChartStyleProps {
  id: string
  config: ChartConfig
}

export function ChartStyle({ id, config }: ChartStyleProps) {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([_, config]) => config.color)
          .map(([key, itemConfig]) => {
            const color = itemConfig.color || ''
            return `[data-chart=${id}] { --color-${key}: ${color}; }`
          })
          .join("\n"),
      }}
    />
  )
}

