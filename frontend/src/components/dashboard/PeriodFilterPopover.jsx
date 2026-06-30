import { useMemo, useState } from "react"
import { Calendar, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Check } from "lucide-react"

function classifyPeriod(value, label) {
  const text = `${value} ${label}`.toLowerCase()
  if (/q[1-4]|quarter/.test(text)) return "quarter"
  if (/\b20\d{2}\b/.test(text) && !/q[1-4]/.test(text)) return "year"
  if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|\d{1,2}\//.test(text))
    return "month"
  return "all"
}

export default function PeriodFilterPopover({
  label = "Period",
  placeholder = "Select period",
  periods = [],
  selected = [],
  onChange,
  locale = "en",
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("all")

  const options = useMemo(
    () =>
      periods.map((p) => ({
        value: p.value ?? p,
        label: p.label ?? p.value ?? p,
        group: classifyPeriod(p.value ?? p, p.label ?? p),
      })),
    [periods]
  )

  const filtered = useMemo(() => {
    const available = options.filter((o) => !selected.includes(o.value))
    if (tab === "all") return available
    return available.filter((o) => o.group === tab)
  }, [options, selected, tab])

  const display =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selected.length} ${locale === "kh" ? "ពេលវេលា" : "periods"}`

  const addPeriod = (value) => {
    if (!selected.includes(value)) onChange([...selected, value])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-[9rem] justify-between border-border/60 bg-background/80 font-normal shadow-sm hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {display}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid h-9 w-full grid-cols-4 rounded-none border-b bg-muted/30 p-0.5">
            <TabsTrigger value="all" className="h-7 rounded-sm text-xs">
              {locale === "kh" ? "ទាំងអស់" : "All"}
            </TabsTrigger>
            <TabsTrigger value="quarter" className="h-7 rounded-sm text-xs">
              {locale === "kh" ? "ត្រីមាស" : "Quarter"}
            </TabsTrigger>
            <TabsTrigger value="year" className="h-7 rounded-sm text-xs">
              {locale === "kh" ? "ឆ្នាំ" : "Year"}
            </TabsTrigger>
            <TabsTrigger value="month" className="h-7 rounded-sm text-xs">
              {locale === "kh" ? "ខែ" : "Month"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="m-0">
            <Command>
              <CommandInput
                placeholder={
                  locale === "kh" ? "ស្វែងរកពេលវេលា..." : "Search periods..."
                }
              />
              <CommandList>
                <CommandEmpty>
                  {locale === "kh" ? "រកមិនឃើញ" : "No periods found"}
                </CommandEmpty>
                <CommandGroup>
                  {filtered.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => addPeriod(option.value)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 opacity-0",
                          selected.includes(option.value) && "opacity-100"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
