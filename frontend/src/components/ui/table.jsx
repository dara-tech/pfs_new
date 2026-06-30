import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Skeleton } from "./skeleton"

const Table = React.forwardRef(
  ({ className, containerClassName, stickyHeader = false, striped = false, bordered = true, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-lg",
        bordered && "border border-border/60",
        stickyHeader && "max-h-[min(70vh,640px)]",
        containerClassName
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm",
          striped && "[&_tbody_tr:nth-child(even)]:bg-muted/20",
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, sticky, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b bg-muted/30",
      (sticky ?? false) && "sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-sm",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/40 transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary/5",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(
  ({ className, sortable, sorted, onSort, children, align, ...props }, ref) => {
    if (!sortable) {
      return (
        <th
          ref={ref}
          className={cn(
            "h-8 px-2.5 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0",
            align === "center" && "text-center",
            align === "right" && "text-right",
            className
          )}
          {...props}
        >
          {children}
        </th>
      )
    }

    const SortIcon =
      sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown

    return (
      <th
        ref={ref}
        className={cn(
          "h-8 px-2.5 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0",
          align === "center" && "text-center",
          align === "right" && "text-right",
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            sorted && "text-foreground"
          )}
        >
          {children}
          <SortIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-2.5 py-1.5 align-middle text-xs sm:text-sm [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

function getCellValue(row, column) {
  if (column.accessorFn) return column.accessorFn(row)
  if (column.accessorKey) return row[column.accessorKey]
  return null
}

function defaultSearchFilter(row, query, columns, searchKeys) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const keys =
    searchKeys ??
    columns
      .map((c) => c.accessorKey)
      .filter(Boolean)

  return keys.some((key) => {
    const val = row[key]
    return val != null && String(val).toLowerCase().includes(q)
  })
}

function compareValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

function DataTable({
  columns,
  data = [],
  className,
  tableClassName,
  stickyHeader = true,
  striped = true,
  searchable = false,
  searchPlaceholder = "Search...",
  searchValue: controlledSearch,
  onSearchChange,
  searchFilter,
  searchKeys,
  pageSize = 10,
  showPagination = true,
  loading = false,
  loadingRows = 5,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyAction,
  toolbar,
  footer,
  getRowId = (row, index) => row?.id ?? index,
  selectedIds,
  onSelectionChange,
  onRowClick,
  rowClassName,
}) {
  const [internalSearch, setInternalSearch] = React.useState("")
  const [sort, setSort] = React.useState({ id: null, direction: "asc" })
  const [page, setPage] = React.useState(0)

  const search = controlledSearch ?? internalSearch
  const setSearch = onSearchChange ?? setInternalSearch

  const selectable = selectedIds != null && onSelectionChange != null

  const filtered = React.useMemo(() => {
    if (!searchable || !search.trim()) return data
    const filterFn = searchFilter ?? ((row, q) => defaultSearchFilter(row, q, columns, searchKeys))
    return data.filter((row) => filterFn(row, search))
  }, [data, search, searchable, searchFilter, columns, searchKeys])

  const sorted = React.useMemo(() => {
    if (!sort.id) return filtered
    const column = columns.find((c) => c.id === sort.id)
    if (!column) return filtered
    const dir = sort.direction === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => compareValues(getCellValue(a, column), getCellValue(b, column)) * dir)
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)

  const pageRows = React.useMemo(() => {
    if (!showPagination) return sorted
    const start = safePage * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize, showPagination])

  React.useEffect(() => {
    setPage(0)
  }, [search, sort.id, sort.direction, data.length])

  React.useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const toggleSort = (columnId) => {
    setSort((prev) => {
      if (prev.id !== columnId) return { id: columnId, direction: "asc" }
      if (prev.direction === "asc") return { id: columnId, direction: "desc" }
      return { id: null, direction: "asc" }
    })
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds?.includes(getRowId(row)))

  const toggleAll = () => {
    if (!selectable) return
    const ids = pageRows.map((row) => getRowId(row))
    if (allPageSelected) {
      onSelectionChange(selectedIds.filter((id) => !ids.includes(id)))
    } else {
      onSelectionChange([...new Set([...(selectedIds ?? []), ...ids])])
    }
  }

  const toggleRow = (id) => {
    if (!selectable) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(toolbar || searchable) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {toolbar}
            <span>
              {sorted.length} {sorted.length === 1 ? "row" : "rows"}
            </span>
          </div>
        </div>
      )}

      <Table stickyHeader={stickyHeader} striped={striped} className={tableClassName}>
        <TableHeader sticky={stickyHeader}>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                align={column.align}
                sortable={column.sortable}
                sorted={sort.id === column.id ? sort.direction : false}
                onSort={() => column.sortable && toggleSort(column.id)}
                className={column.headerClassName}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={`loading-${i}`}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : pageRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-48 p-0">
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
                  <p className="max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
                  {emptyAction}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row, index) => {
              const rowId = getRowId(row, safePage * pageSize + index)
              const isSelected = selectedIds?.includes(rowId)
              return (
                <TableRow
                  key={rowId}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    typeof rowClassName === "function" ? rowClassName(row) : rowClassName
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(rowId)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                    >
                      {column.cell
                        ? column.cell(row)
                        : getCellValue(row, column) ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {showPagination && !loading && sorted.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {safePage + 1} of {totalPages}
            {searchable && search.trim() ? ` · filtered from ${data.length}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {footer}
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  DataTable,
}
