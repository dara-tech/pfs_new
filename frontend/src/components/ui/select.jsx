import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "../../lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
)
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
)
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

function getNodeText(node) {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join("")
  if (React.isValidElement(node)) return getNodeText(node.props.children)
  return ""
}

function matchesSearch(item, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const text = (item.props.searchValue ?? getNodeText(item.props.children)).toLowerCase()
  return text.includes(q)
}

function hasSelectItems(nodes) {
  return React.Children.toArray(nodes).some((child) => {
    if (!React.isValidElement(child)) return false
    if (child.type === SelectItem) return true
    if (child.props?.children) return hasSelectItems(child.props.children)
    return false
  })
}

function filterSelectChildren(children, query) {
  return React.Children.toArray(children)
    .map((child) => {
      if (!React.isValidElement(child)) return child

      if (child.type === SelectGroup) {
        const filtered = filterSelectChildren(child.props.children, query).filter(Boolean)
        if (filtered.length === 0) return null
        return React.cloneElement(child, {}, filtered)
      }

      if (child.type === SelectItem) {
        return matchesSearch(child, query) ? child : null
      }

      if (child.type === SelectLabel || child.type === SelectSeparator) {
        return query.trim() ? null : child
      }

      if (child.props?.children) {
        const filtered = filterSelectChildren(child.props.children, query).filter(Boolean)
        if (filtered.length === 0) return null
        return React.cloneElement(child, {}, filtered)
      }

      return child
    })
    .filter(Boolean)
}

function countSelectItems(nodes) {
  return React.Children.toArray(nodes).reduce((count, child) => {
    if (!React.isValidElement(child)) return count
    if (child.type === SelectItem) return count + 1
    if (child.props?.children) return count + countSelectItems(child.props.children)
    return count
  }, 0)
}

function limitSelectChildren(children, limit, selectedValue) {
  if (!limit || limit <= 0) return { nodes: children, total: countSelectItems(children) }

  let shown = 0
  const total = countSelectItems(children)

  const walk = (nodes) =>
    React.Children.toArray(nodes)
      .map((child) => {
        if (!React.isValidElement(child)) return child

        if (child.type === SelectGroup) {
          const inner = walk(child.props.children).filter(Boolean)
          if (inner.length === 0) return null
          return React.cloneElement(child, {}, inner)
        }

        if (child.type === SelectItem) {
          const isSelected =
            selectedValue != null && String(child.props.value) === String(selectedValue)
          if (isSelected || shown < limit) {
            if (!isSelected) shown += 1
            return child
          }
          return null
        }

        if (child.type === SelectLabel || child.type === SelectSeparator) {
          return shown < limit ? child : null
        }

        if (child.props?.children) {
          const inner = walk(child.props.children).filter(Boolean)
          if (inner.length === 0) return null
          return React.cloneElement(child, {}, inner)
        }

        return child
      })
      .filter(Boolean)

  return { nodes: walk(children), total }
}

const stopSelectKeyboardCapture = (e) => {
  // Radix Select typeahead steals key events — block all except Escape (close)
  if (e.key === "Escape") return
  e.stopPropagation()
}

const SelectSearch = React.forwardRef(
  ({ className, placeholder = "Search...", value, onChange, ...props }, ref) => (
    <div
      className="border-b border-border/60 p-2"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={stopSelectKeyboardCapture}
          onKeyUp={stopSelectKeyboardCapture}
          {...props}
        />
      </div>
    </div>
  )
)
SelectSearch.displayName = "SelectSearch"

const SelectContent = React.forwardRef(
  (
    {
      className,
      children,
      position = "popper",
      searchable = false,
      searchPlaceholder = "Search...",
      emptyMessage = "No results found.",
      limit,
      limitHint,
      selectedValue,
      onOpenAutoFocus,
      onCloseAutoFocus,
      ...props
    },
    ref
  ) => {
    const [search, setSearch] = React.useState("")
    const searchInputRef = React.useRef(null)
    const itemLimit = limit ?? (searchable ? 50 : undefined)

    const processedChildren = React.useMemo(() => {
      const filtered = searchable ? filterSelectChildren(children, search) : children
      const applyLimit = itemLimit && !search.trim()
      if (!applyLimit) {
        return { nodes: filtered, total: countSelectItems(filtered), truncated: false }
      }
      const { nodes, total } = limitSelectChildren(filtered, itemLimit, selectedValue)
      return { nodes, total, truncated: total > itemLimit }
    }, [children, search, searchable, itemLimit, selectedValue])

    const { nodes: displayChildren, total, truncated } = processedChildren

    const hasResults = hasSelectItems(displayChildren)
    const shownCount = countSelectItems(displayChildren)

    const limitMessage =
      limitHint ??
      (truncated
        ? searchable
          ? `Showing ${shownCount} of ${total}. Type to search for more.`
          : `Showing ${shownCount} of ${total}.`
        : null)

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          onOpenAutoFocus={(e) => {
            onOpenAutoFocus?.(e)
            if (searchable) {
              e.preventDefault()
              requestAnimationFrame(() => searchInputRef.current?.focus())
            }
          }}
          onCloseAutoFocus={(e) => {
            onCloseAutoFocus?.(e)
            if (searchable) e.preventDefault()
            setSearch("")
          }}
          {...props}
        >
          <SelectScrollUpButton />
          {searchable && (
            <SelectSearch
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
            />
          )}
          <SelectPrimitive.Viewport
            className={cn(
              "p-1",
              position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
              position === "popper" &&
                !searchable &&
                "h-[var(--radix-select-trigger-height)]",
              searchable && "max-h-60"
            )}
          >
            {hasResults ? (
              displayChildren
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </SelectPrimitive.Viewport>
          {limitMessage && (
            <div className="border-t border-border/60 px-2 py-1.5 text-center text-xs text-muted-foreground">
              {limitMessage}
            </div>
          )}
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(
  ({ className, children, searchValue, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator className="text-foreground">
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
)
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectSearch,
}
