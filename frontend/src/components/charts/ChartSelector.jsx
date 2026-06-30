import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { PiChartBarFill, PiChartLineUpFill, PiChartPieFill } from 'react-icons/pi';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: PiChartBarFill },
  { id: 'line', label: 'Line Chart', icon: PiChartLineUpFill },
  { id: 'pie', label: 'Pie Chart', icon: PiChartPieFill },
  { id: 'area', label: 'Area Chart', icon: PiChartLineUpFill },
  { id: 'composed', label: 'Composed Chart', icon: PiChartBarFill },
];

export default function ChartSelector({ selectedCharts = [], onChartsChange, locale = 'en' }) {

  const handleToggle = (chartId) => {
    if (selectedCharts.includes(chartId)) {
      onChartsChange(selectedCharts.filter(id => id !== chartId));
    } else {
      onChartsChange([...selectedCharts, chartId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCharts.length === CHART_TYPES.length) {
      onChartsChange([]);
    } else {
      onChartsChange(CHART_TYPES.map(t => t.id));
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            {locale === 'en' ? 'Select Charts' : 'ជ្រើសរើសតារាង'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {selectedCharts.length === CHART_TYPES.length 
              ? (locale === 'en' ? 'Deselect All' : 'លុបការជ្រើសរើសទាំងអស់')
              : (locale === 'en' ? 'Select All' : 'ជ្រើសរើសទាំងអស់')
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CHART_TYPES.map((chartType) => {
            const Icon = chartType.icon;
            const isSelected = selectedCharts.includes(chartType.id);
            return (
              <label
                key={chartType.id}
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent/50'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(chartType.id)}
                />
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium flex-1">{chartType.label}</span>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

