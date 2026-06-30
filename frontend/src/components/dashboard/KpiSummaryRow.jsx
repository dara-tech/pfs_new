import { Card, CardContent } from "../ui/card"
import { Skeleton } from "../ui/skeleton"
import { cn } from "../../lib/utils"

export default function KpiSummaryRow({ items = [], loading = false, className }) {
  if (!loading && items.length === 0) return null

  return (
    <div
      className={cn(
        "mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4",
        className
      )}
    >
      {(loading ? Array.from({ length: 4 }) : items).map((item, i) => (
        <Card
          key={loading ? i : item.id}
          className="border-border/60 bg-card/80 shadow-sm"
        >
          <CardContent className="flex items-center gap-2.5 p-2.5 sm:p-3">
            {loading ? (
              <>
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums leading-tight tracking-tight text-foreground">
                    {item.value}
                  </p>
                  {item.hint && (
                    <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
