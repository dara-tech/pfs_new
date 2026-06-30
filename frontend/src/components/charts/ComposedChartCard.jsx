import { Card, CardContent, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { Bar, Line, ComposedChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function ComposedChartCard({ 
  title, 
  data, 
  barDataKey,
  lineDataKey,
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
              [barDataKey]: { label: barDataKey, color: CHART_COLORS[0] },
              [lineDataKey]: { label: lineDataKey, color: CHART_COLORS[1] }
            }}
            className="h-[300px]"
            style={{ height: `${height}px` }}
          >
            <ComposedChart data={data}>
              {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {barDataKey && data.some(item => item[barDataKey] !== undefined) && (
                <Bar dataKey={barDataKey} fill={CHART_COLORS[0]} radius={8} />
              )}
              {lineDataKey && data.some(item => item[lineDataKey] !== undefined) && (
                <Line 
                  type="monotone" 
                  dataKey={lineDataKey} 
                  stroke={CHART_COLORS[1]} 
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[1], r: 4 }}
                />
              )}
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

