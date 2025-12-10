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
  ...props
}: ChartTooltipContentProps) {
  return <div className={cn("", className)} {...props} />
}

