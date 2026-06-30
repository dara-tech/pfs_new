import { Settings2 } from "lucide-react"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
import { Switch } from "../ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet"

export default function AdvancedFilterSheet({
  locale = "en",
  filters = {},
  onChange,
  showByMonth = true,
}) {
  const kh = locale === "kh"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-border/60 bg-background/80 shadow-sm"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {kh ? "តម្រងបន្ថែម" : "More filters"}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{kh ? "តម្រងកម្រិតខ្ពស់" : "Advanced filters"}</SheetTitle>
          <SheetDescription>
            {kh
              ? "កំណត់របៀបបង្ហាញទិន្នន័យ និងរយៈពេល"
              : "Configure display options and reporting period behavior."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              {kh ? "រយៈពេល" : "Period options"}
            </h4>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <Label htmlFor="fiscal-year" className="text-sm font-medium">
                  {kh ? "ឆ្នាំថវិកា" : "Fiscal year"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {kh ? "ប្រើឆ្នាំថវិកាជំแทน ឆ្នាំប្រតិទិន" : "Use fiscal year grouping"}
                </p>
              </div>
              <Switch
                id="fiscal-year"
                checked={!!filters.isFiscalYear}
                onCheckedChange={(v) => onChange("isFiscalYear", v)}
              />
            </div>
            {showByMonth && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <div>
                  <Label htmlFor="by-month" className="text-sm font-medium">
                    {kh ? "តាមខែ" : "By month"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {kh ? "បំបែកតាមខែ" : "Break down data by month"}
                  </p>
                </div>
                <Switch
                  id="by-month"
                  checked={!!filters.byMonth}
                  onCheckedChange={(v) => onChange("byMonth", v)}
                />
              </div>
            )}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            {kh
              ? "ចុច «អនុវត្ត» នៅលើ toolbar ដើម្បីផ្ទុកទិន្នន័យឡើងវិញ"
              : "Click Apply on the toolbar to refresh dashboard data."}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
