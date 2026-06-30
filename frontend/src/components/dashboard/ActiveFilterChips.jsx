import { X } from "lucide-react"
import { Badge } from "../ui/badge"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"

export default function ActiveFilterChips({ chips = [], onRemove, className }) {
  if (!chips.length) return null

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Applied filters
      </p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-1">
          {chips.map((chip) => (
            <Badge
              key={chip.id}
              variant="secondary"
              className="h-7 shrink-0 gap-1 rounded-md border border-border/60 bg-muted/50 pl-2.5 pr-1 font-normal text-foreground hover:bg-muted"
            >
              <span className="max-w-[180px] truncate text-xs">{chip.label}</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(chip)}
                  className="rounded-sm p-0.5 hover:bg-background/80"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
