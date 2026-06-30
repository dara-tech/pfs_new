import { Loader2, RotateCcw } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Separator } from "../ui/separator"
import { t } from "../../lib/translations/index"
import FilterCombobox from "./FilterCombobox"
import PeriodFilterPopover from "./PeriodFilterPopover"
import ActiveFilterChips from "./ActiveFilterChips"
import AdvancedFilterSheet from "./AdvancedFilterSheet"

function buildFilterChips({
  filters,
  availablePeriods,
  availableProvinces,
  availableSites,
  availableKPs,
  availableAges,
  locale,
}) {
  const chips = []

  filters.periods?.forEach((p) => {
    const period = availablePeriods.find((x) => (x.value ?? x) === p)
    chips.push({
      id: `period-${p}`,
      key: "periods",
      value: p,
      label: period?.label ?? p,
    })
  })

  filters.provinces?.forEach((p) => {
    chips.push({
      id: `province-${p}`,
      key: "provinces",
      value: p,
      label: availableProvinces[p] ?? p,
    })
  })

  const site = filters.sites?.[0]
  if (site && site !== "*") {
    chips.push({
      id: `site-${site}`,
      key: "sites",
      value: site,
      label: site,
    })
  }

  filters.kps?.forEach((k) => {
    chips.push({
      id: `kp-${k}`,
      key: "kps",
      value: k,
      label: availableKPs?.[k] ?? k,
    })
  })

  filters.ages?.forEach((a) => {
    chips.push({
      id: `age-${a}`,
      key: "ages",
      value: a,
      label: availableAges?.[a] ?? a,
    })
  })

  if (filters.isFiscalYear) {
    chips.push({
      id: "fiscal",
      key: "isFiscalYear",
      label: locale === "kh" ? "ឆ្នាំថវិកា" : "Fiscal year",
    })
  }

  if (filters.byMonth) {
    chips.push({
      id: "bymonth",
      key: "byMonth",
      label: locale === "kh" ? "តាមខែ" : "By month",
    })
  }

  return chips
}

export default function DashboardFilterToolbar({
  locale = "en",
  loading = false,
  filters,
  onFilterChange,
  onApply,
  onReset,
  availablePeriods = [],
  availableProvinces = {},
  availableSites = [],
  availableKPs = {},
  availableAges = {},
  userProvinces = null,
  showKp = false,
  showAge = false,
  showByMonth = true,
  className,
}) {
  const kh = locale === "kh"

  const provinceOptions = [
    { value: "all", label: t(locale, "admin.common.all") },
    ...Object.entries(availableProvinces)
      .filter(([key]) => {
        if (userProvinces === null) return true
        return userProvinces?.includes(key)
      })
      .map(([key, label]) => ({ value: key, label })),
  ]

  const siteOptions = [
    { value: "*", label: t(locale, "admin.common.allSites") },
    ...availableSites.map((site) => ({ value: site, label: site })),
  ]

  const kpOptions = [
    { value: "all", label: t(locale, "admin.common.all") },
    ...Object.entries(availableKPs).map(([key, label]) => ({
      value: key,
      label,
    })),
  ]

  const ageOptions = [
    { value: "all", label: t(locale, "admin.common.all") },
    ...Object.entries(availableAges).map(([key, label]) => ({
      value: key,
      label,
    })),
  ]

  // Step-by-step: "All" is still a valid parent selection.
  const selectedProvince = filters.provinces?.[0] ?? "all"
  const selectedSite = filters.sites?.[0] ?? "*"

  const siteDisabled = availableSites.length === 0 || !selectedProvince
  const kpDisabled = Object.keys(availableKPs).length === 0 || !selectedSite

  const chips = buildFilterChips({
    filters,
    availablePeriods,
    availableProvinces,
    availableSites,
    availableKPs,
    availableAges,
    locale,
  })

  const handleRemoveChip = (chip) => {
    if (chip.key === "periods") {
      onFilterChange(
        "periods",
        filters.periods.filter((p) => p !== chip.value)
      )
    } else if (chip.key === "provinces") {
      onFilterChange("provinces", [])
    } else if (chip.key === "sites") {
      onFilterChange("sites", ["*"])
    } else if (chip.key === "kps") {
      onFilterChange("kps", [])
    } else if (chip.key === "ages") {
      onFilterChange("ages", [])
    } else if (chip.key === "isFiscalYear") {
      onFilterChange("isFiscalYear", false)
    } else if (chip.key === "byMonth") {
      onFilterChange("byMonth", false)
    }
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-0.5 mb-3 min-w-0 px-0.5 pb-0.5 sm:-mx-1 sm:px-1",
        className
      )}
    >
      <Card className="border-border/60 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="p-2.5 space-y-2">
          {/* Primary toolbar row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <PeriodFilterPopover
              label={t(locale, "admin.common.period")}
              placeholder={t(locale, "admin.common.selectPeriod")}
              periods={availablePeriods}
              selected={filters.periods ?? []}
              onChange={(v) => onFilterChange("periods", v)}
              locale={locale}
            />

            <FilterCombobox
              label={t(locale, "admin.common.province")}
              placeholder={t(locale, "admin.common.province")}
              options={provinceOptions}
              value={filters.provinces?.[0] || "all"}
              onChange={(v) =>
                onFilterChange("provinces", v === "all" ? [] : [v])
              }
            />

            <FilterCombobox
              label={t(locale, "admin.common.sites")}
              placeholder={t(locale, "admin.common.sites")}
              options={siteOptions}
              value={filters.sites?.[0] || "*"}
              disabled={siteDisabled}
              onChange={(v) =>
                onFilterChange("sites", v === "*" ? ["*"] : [v])
              }
            />

            {showKp && (
              <FilterCombobox
                label={t(locale, "admin.common.keyPopulation")}
                placeholder={t(locale, "admin.common.keyPopulation")}
                options={kpOptions}
                value={filters.kps?.[0] || "all"}
                disabled={kpDisabled}
                onChange={(v) =>
                  onFilterChange("kps", v === "all" ? [] : [v])
                }
              />
            )}

            {showAge && (
              <FilterCombobox
                label={t(locale, "admin.common.ageRange")}
                placeholder={t(locale, "admin.common.ageRange")}
                options={ageOptions}
                value={filters.ages?.[0] || "all"}
                onChange={(v) =>
                  onFilterChange("ages", v === "all" ? [] : [v])
                }
              />
            )}

            <AdvancedFilterSheet
              locale={locale}
              filters={filters}
              onChange={onFilterChange}
              showByMonth={showByMonth}
            />

            </div>
            <div className="flex w-full shrink-0 items-center gap-2 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 flex-1 sm:flex-none"
                onClick={onReset}
                disabled={loading}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {kh ? "កំណត់ឡើងវិញ" : "Reset"}
              </Button>

              <Button
                type="button"
                size="sm"
                className="h-9 min-w-[5.5rem] flex-1 shadow-sm sm:flex-none"
                onClick={onApply}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {kh ? "កំពុង..." : "Loading"}
                  </>
                ) : (
                  t(locale, "admin.common.applyFilters")
                )}
              </Button>
            </div>
          </div>

          {chips.length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <ActiveFilterChips chips={chips} onRemove={handleRemoveChip} />
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
