import { Card, CardContent, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function BarChartCard({ 
  title, 
  data, 
  dataKey = 'value', 
  colorIndex = 0,
  height = 300,
  showGrid = true,
  angle = 0,
  domain,
  locale = 'en'
}) {
  if (!data || data.length === 0) return null;

  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
        <CardTitle className="text-xl font-bold text-muted-foreground">{title}</CardTitle>
      </div>
      <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
        <CardContent className="p-6">
          <ChartContainer
            config={{
              [dataKey]: { label: dataKey, color: CHART_COLORS[colorIndex % CHART_COLORS.length] }
            }}
            className="h-[300px]"
            style={{ height: `${height}px` }}
          >
            <BarChart data={data}>
              {showGrid && <CartesianGrid vertical={false} />}
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                tickMargin={10} 
                axisLine={false}
                angle={0}
                textAnchor="middle"
              />
              <YAxis 
                tickLine={false} 
                tickMargin={10} 
                axisLine={false}
                domain={domain}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} fill={CHART_COLORS[colorIndex % CHART_COLORS.length]} radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

