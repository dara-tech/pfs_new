import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Area, AreaChart, Cell, CartesianGrid, XAxis, YAxis, Legend, ComposedChart } from 'recharts';
import { PiChartBarFill, PiChartLineUpFill, PiChartPieFill, PiChartLineUp, PiArrowsOut, PiX, PiCaretLeft, PiCaretRight } from 'react-icons/pi';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CHART_TYPES = [
  { value: 'bar', label: 'Bar', icon: PiChartBarFill },
  { value: 'line', label: 'Line', icon: PiChartLineUpFill },
  { value: 'pie', label: 'Pie', icon: PiChartPieFill },
  { value: 'area', label: 'Area', icon: PiChartLineUp },
];

export default function ChartCard({ 
  title, 
  data, 
  dataKey = 'value', 
  nameKey = 'name',
  colorIndex = 0,
  height = 220,
  showGrid = true,
  angle = 0,
  domain,
  locale = 'en',
  defaultChartType = 'bar',
  formatter,
  /** When set, render grouped bars (one per item); each item: { dataKey, label? }. Uses nameKey for X axis. */
  bars = null
}) {
  const [chartType, setChartType] = useState(defaultChartType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  if (!data || data.length === 0) return null;

  const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
  const isMultiBar = bars && Array.isArray(bars) && bars.length > 0;
  const chartConfig = isMultiBar
    ? Object.fromEntries(bars.map((b, idx) => [b.dataKey, { label: b.label ?? b.dataKey, color: CHART_COLORS[(colorIndex + idx) % CHART_COLORS.length] }]))
    : { [dataKey]: { label: dataKey, color } };

  const renderXAxisTick = ({ x, y, payload }) => (
    <text
      x={x}
      y={y + 8}
      textAnchor="middle"
      fill="hsl(var(--muted-foreground))"
      fontSize={10}
      className={locale === 'kh' ? 'font-khmer' : undefined}
    >
      {payload?.value}
    </text>
  );

  const xAxisCommon = {
    dataKey: nameKey,
    tickLine: false,
    axisLine: false,
    interval: 0,
    tick: angle === 0 ? renderXAxisTick : { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
    angle,
    textAnchor: angle === 0 ? 'middle' : angle < 0 ? 'end' : 'start',
    tickMargin: 0,
    height: angle === 0 ? 36 : 48,
    padding: { left: 0, right: 0 },
  };

  const chartMargin = { top: 8, right: 0, left: 0, bottom: 0 };

  const yAxisCommon = {
    tickLine: false,
    axisLine: false,
    width: 30,
    tickMargin: 2,
    tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
    domain,
  };

  const renderChart = (isFullscreenMode = false) => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data} margin={chartMargin} barCategoryGap="8%">
            {showGrid && <CartesianGrid vertical={false} />}
            <XAxis {...xAxisCommon} />
            <YAxis {...yAxisCommon} />
            <ChartTooltip content={<ChartTooltipContent />} formatter={formatter} />
            {isMultiBar ? (
              <>
                {bars.map((b, idx) => (
                  <Bar 
                    key={b.dataKey} 
                    dataKey={b.dataKey} 
                    name={b.label ?? b.dataKey} 
                    fill={CHART_COLORS[(colorIndex + idx) % CHART_COLORS.length]} 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                  />
                ))}
                <Legend
                  content={({ payload }) => (
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-0">
                      {payload && payload.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                          {payload.map((entry) => (
                            <span key={entry.value} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span>{entry.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
              </>
            ) : (
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={56} />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={chartMargin}>
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
            <XAxis {...xAxisCommon} />
            <YAxis {...yAxisCommon} />
            <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} formatter={formatter} />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'pie':
        // Calculate dynamic radius based on fullscreen mode
        const pieRadius = isFullscreenMode ? '40%' : 80;
        const innerRadius = isFullscreenMode ? '20%' : 0;
        
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy={isFullscreenMode ? "45%" : "50%"}
              labelLine={true}
              label={({ [nameKey]: name, percent }) => {
                const percentage = (percent * 100).toFixed(0);
                // Show label only if percentage is significant (> 1%) to prevent overlap
                if (percent < 0.01) return '';
                // Truncate long names - longer in fullscreen
                const maxLength = isFullscreenMode ? 30 : 20;
                const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
                return `${truncatedName}: ${percentage}%`;
              }}
              outerRadius={pieRadius}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey={dataKey}
              paddingAngle={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} formatter={formatter} />
            <Legend 
              wrapperStyle={{ paddingTop: isFullscreenMode ? '30px' : '10px' }}
              iconSize={isFullscreenMode ? 16 : 10}
              iconType="circle"
              fontSize={isFullscreenMode ? 14 : 12}
              formatter={(value) => {
                const item = data.find(d => d[nameKey] === value);
                if (!item) return value;
                const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);
                const percentage = total > 0 ? ((item[dataKey] / total) * 100).toFixed(0) : '0';
                return `${value} (${percentage}%)`;
              }}
            />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={chartMargin}>
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
            <XAxis {...xAxisCommon} />
            <YAxis {...yAxisCommon} />
            <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} formatter={formatter} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'all':
        // Show all chart types in a composed chart (bar + line + area)
        return (
          <ComposedChart data={data} margin={chartMargin}>
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
            <XAxis {...xAxisCommon} />
            <YAxis {...yAxisCommon} />
            <ChartTooltip content={<ChartTooltipContent />} formatter={formatter} />
            <Legend />
            <Bar dataKey={dataKey} fill={CHART_COLORS[0]} radius={8} />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={CHART_COLORS[1]} 
              strokeWidth={2}
              dot={{ fill: CHART_COLORS[1], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={CHART_COLORS[2]}
              fill={CHART_COLORS[2]}
              fillOpacity={0.2}
            />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  const currentChartType = CHART_TYPES.find(t => t.value === chartType);
  const CurrentIcon = currentChartType?.icon || PiChartBarFill;

  const chartTypeSelect = (size = 'sm') => (
    <Select value={chartType} onValueChange={setChartType}>
      <SelectTrigger
        className={cn(
          'relative z-20 shrink-0 gap-1.5 border-primary/20 bg-primary/10 text-primary shadow-none hover:bg-primary/20 focus:ring-primary/20',
          size === 'sm' ? 'h-8 w-[7.5rem] px-2.5 text-xs' : 'h-9 w-[8.5rem] px-3 text-sm'
        )}
        aria-label="Chart type"
      >
        <CurrentIcon className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
        <SelectValue placeholder="Bar" />
      </SelectTrigger>
      <SelectContent align="end" position="popper" sideOffset={4} className="z-[200] min-w-[9rem]">
        {CHART_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value} searchValue={type.label}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <div className="group">
        <div className="relative z-10 mb-2 flex items-center gap-2">
          <div className="h-6 w-1 bg-gradient-custom rounded-full"></div>
          <CardTitle className="flex-1 text-sm font-semibold text-muted-foreground sm:text-base">{title}</CardTitle>
          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="relative z-20 p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="View fullscreen"
          >
            <PiArrowsOut className="h-4 w-4" />
          </button>
          {chartTypeSelect('sm')}
        </div>
        <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
          <CardContent className="p-0">
            <ChartContainer
              config={chartConfig}
              className="h-[220px]"
              style={{ height: `${height}px` }}
            >
              {renderChart(false)}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-primary/20">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
              <CardTitle className="text-lg md:text-xl font-bold text-muted-foreground truncate">{title}</CardTitle>
            </div>
            
            {/* Chart Type Selector in Fullscreen */}
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {chartTypeSelect('md')}
              
              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = CHART_TYPES.findIndex(t => t.value === chartType);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : CHART_TYPES.length - 1;
                    setChartType(CHART_TYPES[prevIndex].value);
                  }}
                  className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Previous chart type"
                >
                  <PiCaretLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = CHART_TYPES.findIndex(t => t.value === chartType);
                    const nextIndex = currentIndex < CHART_TYPES.length - 1 ? currentIndex + 1 : 0;
                    setChartType(CHART_TYPES[nextIndex].value);
                  }}
                  className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Next chart type"
                >
                  <PiCaretRight className="h-5 w-5" />
                </button>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(false);
                }}
                className="p-2 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Close fullscreen"
              >
                <PiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Chart */}
          <div 
            className="flex-1 min-h-0 p-2 md:p-3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ChartContainer
              config={chartConfig}
              className="h-full w-full rounded-md border border-primary/20 bg-card/95"
              style={{ width: '100%', height: '100%' }}
            >
              {renderChart(true)}
            </ChartContainer>
          </div>
        </div>
      )}
    </>
  );
}

