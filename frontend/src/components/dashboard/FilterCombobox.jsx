import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

/**
 * Searchable filter via Popover + Command (enterprise combobox pattern).
 * Supports single or multi select.
 */
export default function FilterCombobox({
  label,
  placeholder,
  options = [],
  value,
  onChange,
  multiple = false,
  disabled = false,
  emptyText = "No results found.",
  className,
}) {
  const [open, setOpen] = useState(false)

  const isAllValue = value === "all" || value === "*"

  const selectedValues = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value != null && value !== ""
      ? [value]
      : []

  const selectedLabels = selectedValues
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean)

  const displayLabel =
    selectedLabels.length === 0
      ? placeholder ?? label
      : multiple
        ? selectedLabels.length === 1
          ? selectedLabels[0]
          : `${selectedLabels.length} selected`
        : selectedLabels[0]

  const toggleValue = (optionValue) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : []
      if (current.includes(optionValue)) {
        onChange(current.filter((v) => v !== optionValue))
      } else {
        onChange([...current, optionValue])
      }
      return
    }
    onChange(optionValue)
    setOpen(false)
  }

  const isSelected = (optionValue) => {
    if (multiple) return (Array.isArray(value) ? value : []).includes(optionValue)
    if (optionValue === "all" || optionValue === "*") {
      return (
        isAllValue ||
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      )
    }
    return value === optionValue
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 min-w-[7.5rem] max-w-[10rem] justify-between border-border/60 bg-background/80 text-xs font-normal shadow-sm hover:bg-muted/50",
            className
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label?.toLowerCase() ?? ""}...`} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => toggleValue(option.value)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      isSelected(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
