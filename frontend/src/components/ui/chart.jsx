import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "../../lib/utils"
import { Skeleton } from "./skeleton"

const THEMES = { light: "", dark: ".dark" }

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

function resolveConfigColor(entry) {
  if (!entry) return undefined
  if (typeof entry === "string") return entry
  return entry.color
}

function resolveConfigLabel(entry) {
  if (!entry) return undefined
  if (typeof entry === "string") return entry
  return entry.label
}

const ChartStyle = ({ id, config }) => {
  if (!config || !Object.keys(config).length) return null

  const colorRules = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const vars = Object.entries(config)
        .filter(([, item]) => resolveConfigColor(item))
        .map(([key, item]) => `  --color-${key}: ${resolveConfigColor(item)};`)
        .join("\n")

      if (!vars) return ""
      return `${prefix} [data-chart=${id}] {\n${vars}\n}`
    })
    .filter(Boolean)
    .join("\n")

  if (!colorRules) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: colorRules,
      }}
    />
  )
}

const chartContainerVariants = {
  default: "",
  card: "rounded-lg border border-border/60 bg-card/50 p-2",
}

const ChartContainer = React.forwardRef(
  (
    {
      id,
      config = {},
      className,
      children,
      aspectRatio,
      minHeight = 200,
      loading = false,
      empty = false,
      emptyMessage = "No chart data",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    const contextValue = React.useMemo(
      () => ({ config, id: chartId }),
      [config, chartId]
    )

    const aspectStyle = aspectRatio
      ? { aspectRatio: String(aspectRatio) }
      : { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }

    return (
      <ChartContext.Provider value={contextValue}>
        <div
          data-chart={chartId}
          className={cn(
            "relative flex w-full flex-col justify-center p-1 text-xs",
            chartContainerVariants[variant] ?? chartContainerVariants.default,
            "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
            "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/40",
            "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border/60",
            "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-layer]:outline-none",
            "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border/40",
            "[&_.recharts-radial-bar-background-sector]:fill-muted/30",
            "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/40",
            "[&_.recharts-reference-line-line]:stroke-border",
            "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-sector]:outline-none",
            "[&_.recharts-surface]:outline-none",
            "[&_.recharts-active-dot]:stroke-background",
            className
          )}
          style={aspectStyle}
          ref={ref}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          {loading ? (
            <div className="flex h-full min-h-[inherit] w-full flex-col justify-end gap-2 p-4">
              <Skeleton className="h-[75%] w-full rounded-md" />
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ) : empty ? (
            <div className="flex h-full min-h-[inherit] w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
              {children}
            </RechartsPrimitive.ResponsiveContainer>
          )}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "Chart"

const ChartTooltip = RechartsPrimitive.Tooltip

function getPayloadConfig(payload, key, config) {
  if (!payload || !key) return undefined
  const fromPayload = payload?.payload?.config?.[key]
  if (fromPayload) return fromPayload
  return config?.[key] ?? config?.[payload?.[key]]
}

const ChartTooltipContent = React.forwardRef(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelKey,
      labelFormatter,
      labelClassName,
      formatter,
      nameKey,
      color,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      const raw =
        label ??
        (labelKey && payload?.[0]?.payload
          ? payload[0].payload[labelKey]
          : payload?.[0]?.payload?.[nameKey] ?? payload?.[0]?.name)

      if (raw == null) return null
      if (labelFormatter) return labelFormatter(raw, payload)
      return raw
    }, [label, labelKey, labelFormatter, nameKey, payload])

    if (!active || !payload?.length) {
      return null
    }

    const {
      allowEscapeViewBox,
      animationDuration,
      animationEasing,
      axisId,
      contentStyle,
      filterNull,
      includeHidden,
      isAnimationActive,
      itemSorter,
      itemStyle,
      labelStyle,
      reverseDirection,
      useTranslate3d,
      wrapperStyle,
      activeIndex,
      accessibilityLayer,
      cursor,
      ...domProps
    } = props

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] gap-1.5 rounded-lg border border-border/60 bg-popover/95 px-3 py-2 text-popover-foreground shadow-lg backdrop-blur-sm",
          className
        )}
        {...domProps}
      >
        {!hideLabel && tooltipLabel != null && (
          <div className={cn("font-medium leading-none", labelClassName)}>
            {tooltipLabel}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${item.name ?? item.dataKey}-${index}`
            const itemKey = nameKey && item.payload ? String(item.payload[nameKey]) : item.dataKey
            const itemConfig = getPayloadConfig(item.payload, itemKey, config)
            const labelText = resolveConfigLabel(itemConfig) ?? item.name ?? item.dataKey
            const indicatorColor =
              color ??
              item.payload?.fill ??
              item.color ??
              resolveConfigColor(itemConfig) ??
              `hsl(var(--chart-${(index % 5) + 1}))`

            const formatted =
              formatter?.(item.value, item.name, item, index, item.payload) ??
              (typeof item.value === "number"
                ? item.value.toLocaleString()
                : item.value)

            return (
              <div
                key={key}
                className={cn(
                  "flex w-full flex-wrap items-center gap-2 text-xs [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "justify-between"
                )}
              >
                {!hideIndicator && (
                  <>
                    {indicator === "dot" && (
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: indicatorColor }}
                      />
                    )}
                    {indicator === "line" && (
                      <div
                        className="w-4 shrink-0 border-[2px]"
                        style={{ borderColor: indicatorColor }}
                      />
                    )}
                    {indicator === "dashed" && (
                      <div
                        className="w-0 shrink-0 border-[1.5px] border-dashed"
                        style={{ borderColor: indicatorColor }}
                      />
                    )}
                  </>
                )}
                <span className="text-muted-foreground">{labelText}</span>
                <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                  {formatted}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef(
  (
    {
      className,
      hideIcon = false,
      payload,
      verticalAlign = "bottom",
      nameKey,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-3 px-2",
          verticalAlign === "top" ? "pb-2" : "pt-2",
          className
        )}
        {...props}
      >
        {payload.map((item, index) => {
          const key = `${item.value}-${index}`
          const itemKey = nameKey && item.payload ? String(item.payload[nameKey]) : item.dataKey
          const itemConfig = getPayloadConfig(item.payload, itemKey, config)
          const label = resolveConfigLabel(itemConfig) ?? item.value
          const indicatorColor =
            item.color ??
            resolveConfigColor(itemConfig) ??
            `hsl(var(--chart-${(index % 5) + 1}))`

          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:h-3 [&>svg]:w-3"
              )}
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: indicatorColor }}
                />
              )}
              <span className="text-foreground/90">{label}</span>
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

/** Recharts-friendly grid with theme colors */
const ChartGrid = React.forwardRef(({ className, ...props }, ref) => (
  <RechartsPrimitive.CartesianGrid
    ref={ref}
    strokeDasharray="3 3"
    vertical={false}
    className={cn("stroke-border/40", className)}
    {...props}
  />
))
ChartGrid.displayName = "ChartGrid"

const ChartXAxis = React.forwardRef(({ className, tickMargin = 8, ...props }, ref) => (
  <RechartsPrimitive.XAxis
    ref={ref}
    tickLine={false}
    axisLine={false}
    tickMargin={tickMargin}
    className={cn(className)}
    {...props}
  />
))
ChartXAxis.displayName = "ChartXAxis"

const ChartYAxis = React.forwardRef(({ className, tickMargin = 8, width = 40, ...props }, ref) => (
  <RechartsPrimitive.YAxis
    ref={ref}
    tickLine={false}
    axisLine={false}
    tickMargin={tickMargin}
    width={width}
    className={cn(className)}
    {...props}
  />
))
ChartYAxis.displayName = "ChartYAxis"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartStyle,
  useChart,
}
