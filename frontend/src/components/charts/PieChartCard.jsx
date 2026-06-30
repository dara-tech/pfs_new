import { Card, CardContent, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { Pie, PieChart, Cell, Legend } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function PieChartCard({ 
  title, 
  data, 
  dataKey = 'value', 
  nameKey = 'name',
  height = 300,
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
            config={data.reduce((acc, item, index) => {
              acc[item[nameKey]] = { 
                label: item[nameKey], 
                color: CHART_COLORS[index % CHART_COLORS.length] 
              };
              return acc;
            }, {})}
            className="h-[300px]"
            style={{ height: `${height}px` }}
          >
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                innerRadius={0}
                paddingAngle={0}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

