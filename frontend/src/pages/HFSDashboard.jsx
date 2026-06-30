import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { ChartCard, VerticalBarChartCard } from '../components/charts';
import { DashboardFilterToolbar, KpiSummaryRow } from '../components/dashboard';
import { Users, Building2, CalendarRange, Layers } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import { FaChartLine } from 'react-icons/fa';
import api from '../lib/api';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function HFSDashboard() {
  const { locale } = useUIStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    periods: [],
    sites: [],
    provinces: [],
    isFiscalYear: false,
    locale: locale || 'en'
  });
  const [availableSites, setAvailableSites] = useState([]);
  const [availableProvinces, setAvailableProvinces] = useState({});
  const [userProvinces, setUserProvinces] = useState(null); // Provinces user has access to
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const defaultFilters = {
    periods: [],
    sites: [],
    provinces: [],
    isFiscalYear: false,
    locale: locale || 'en',
  };

  const getPreviousQuarterValue = () => {
    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    if (currentQuarter === 1) {
      return `Q4-${now.getFullYear() - 1}`;
    }
    return `Q${currentQuarter - 1}-${now.getFullYear()}`;
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-select previous quarter by default when available.

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.post('/reporting/hfs/dashboard', {
        ...filters,
        periods: filters.periods,
        period: filters.periods.length > 0 ? filters.periods.join(',') : '',
        locale
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setAvailableSites(response.data.sites || []);
        setAvailableProvinces(response.data.provinces || {});
        setUserProvinces(response.data.userProvinces || null);
        setAvailablePeriods(response.data.periods || []);

        const periodValues = (response.data.periods || []).map((p) => p.value ?? p);
        const shouldAutoSelectPeriod = !filters.periods || filters.periods.length === 0;
        if (shouldAutoSelectPeriod && periodValues.length > 0) {
          const previousQuarter = getPreviousQuarterValue();
          const selectedPeriod = periodValues.includes(previousQuarter)
            ? previousQuarter
            : periodValues[periodValues.length - 1];
          const nextFilters = { ...filters, periods: [selectedPeriod] };
          setFilters(nextFilters);
          await fetchDashboardWithFilters(nextFilters);
          return;
        }
        
        // Auto-select province if user has only one province assigned
        if (response.data.userProvinces && Array.isArray(response.data.userProvinces) && response.data.userProvinces.length === 1) {
          setFilters(prev => ({ ...prev, provinces: response.data.userProvinces }));
        }
      }
    } catch (error) {
      console.error('Error fetching HFS dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardWithFilters = async (newFilters) => {
    setLoading(true);
    try {
      const response = await api.post('/reporting/hfs/dashboard', {
        ...newFilters,
        periods: newFilters.periods || [],
        period: newFilters.periods && newFilters.periods.length > 0 ? newFilters.periods.join(',') : (newFilters.period || ''),
        locale
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setAvailableSites(response.data.sites || []);
        setAvailableProvinces(response.data.provinces || {});
        setUserProvinces(response.data.userProvinces || null);
        setAvailablePeriods(response.data.periods || []);
        
        // Auto-select province if user has only one province assigned and not already selected
        if (response.data.userProvinces && Array.isArray(response.data.userProvinces) && response.data.userProvinces.length === 1) {
          if (!newFilters.provinces || newFilters.provinces.length === 0) {
            const updatedFilters = { ...newFilters, provinces: response.data.userProvinces };
            setFilters(updatedFilters);
            // Re-fetch with the auto-selected province
            const retryResponse = await api.post('/reporting/hfs/dashboard', {
              ...updatedFilters,
              periods: updatedFilters.periods || [],
              period: updatedFilters.periods && updatedFilters.periods.length > 0 ? updatedFilters.periods.join(',') : (updatedFilters.period || ''),
              locale
            });
            if (retryResponse.data.success) {
              setDashboardData(retryResponse.data.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching HFS dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset dependent filters when parent changes
    if (key === 'provinces') {
      // When province changes to 'all' or empty, reset sites
      const isProvinceEmpty = !value || (Array.isArray(value) && value.length === 0);
      if (isProvinceEmpty) {
        newFilters.sites = ['*'];
      }
    }
    
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    fetchDashboardWithFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters({ ...defaultFilters, locale: locale || 'en' });
  };

  const getKpiItems = () => {
    let participants = 0;
    if (dashboardData?.participationChart?.length) {
      dashboardData.participationChart.forEach((item) => {
        participants += item.count ?? 0;
      });
    }
    const facilities =
      !filters.sites?.length || filters.sites[0] === '*'
        ? availableSites.length
        : filters.sites.filter((s) => s !== '*').length;
    const periods = filters.periods?.length ?? 0;
    const departments = dashboardData?.deptChart
      ? Object.keys(dashboardData.deptChart).length
      : 0;

    return [
      {
        id: 'participants',
        label: locale === 'kh' ? 'អ្នកចូលរួម' : 'Participants',
        value: participants.toLocaleString(),
        icon: Users,
      },
      {
        id: 'facilities',
        label: locale === 'kh' ? 'មន្ទីរពេទ្យ' : 'Facilities',
        value: facilities.toLocaleString(),
        icon: Building2,
      },
      {
        id: 'periods',
        label: locale === 'kh' ? 'រយៈពេល' : 'Periods',
        value: periods.toLocaleString(),
        icon: CalendarRange,
      },
      {
        id: 'departments',
        label: locale === 'kh' ? 'ផ្នែក' : 'Departments',
        value: departments.toLocaleString(),
        icon: Layers,
      },
    ];
  };

  // Helper to get department chart data
  const getDeptChartData = () => {
    if (!dashboardData?.deptChart) return null;
    
    const deptMap = {
      'ART': t(locale, 'admin.hfs.dept_art'),
      'ANC': t(locale, 'admin.hfs.dept_anc'),
      'HIV/STI': t(locale, 'admin.hfs.dept_hiv_sti'),
      'Lab': t(locale, 'admin.hfs.dept_lab'),
      'Methadone': t(locale, 'admin.hfs.dept_methadone'),
      'TB': t(locale, 'admin.hfs.dept_tb'),
      'Other': t(locale, 'admin.hfs.dept_other')
    };
    
    return Object.keys(dashboardData.deptChart).map(dept => ({
      name: deptMap[dept] || dept,
      value: dashboardData.deptChart[dept]
    }));
  };

  // Helper to create legend formatter
  const createLegendFormatter = (keyMap) => {
    return (value) => {
      return keyMap[value] || value;
    };
  };

  // Helper to create custom tooltip content with translations
  const createCustomTooltip = (keyMap) => {
    return ({ active, payload }) => {
      if (!active || !payload?.length) {
        return null;
      }

      return (
        <div className="rounded-lg border bg-background px-2.5 py-1.5 text-sm shadow-md">
          <div className="grid gap-1.5">
            {payload[0]?.payload?.quarter && (
              <div className="font-medium leading-none tracking-tight">
                {payload[0].payload.quarter}
              </div>
            )}
            <div className="grid gap-1.5">
              {payload.map((item, index) => {
                const translatedLabel = keyMap[item.dataKey] || item.dataKey;
                const indicatorColor = item.payload?.fill || item.color;

                return (
                  <div
                    key={`${item.dataKey}-${index}`}
                    className="flex w-full flex-wrap items-stretch gap-2"
                  >
                    <div
                      className="shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]"
                      style={{
                        "--color-border": indicatorColor,
                        "--color-bg": indicatorColor,
                        width: '10px',
                        height: '10px',
                        marginTop: '4px'
                      }}
                    />
                    <div className="flex flex-1 items-center gap-2 leading-none justify-between">
                      <div className="grid gap-1.5">
                        <span className="text-muted-foreground">
                          {translatedLabel}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : item.value}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };
  };

  return (
    <div className="page-stack">
      <DashboardFilterToolbar
        locale={locale}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        availablePeriods={availablePeriods}
        availableProvinces={availableProvinces}
        availableSites={availableSites}
        userProvinces={userProvinces}
        showByMonth={false}
      />

      <KpiSummaryRow
        items={dashboardData ? getKpiItems() : []}
        loading={loading && !dashboardData}
        className="mb-3"
      />

      {/* Charts Grid */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="border-primary/10 shadow-lg backdrop-blur-sm bg-card/95">
              <CardHeader>
                <Skeleton className="h-6 w-48 bg-primary/10" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full bg-primary/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Row 1: Participation Chart and Department Chart */}
          <div className="grid grid-cols-1 gap-3 sm:gap-3 md:grid-cols-2">
            {/* Participation Chart */}
            {dashboardData.participationChart && dashboardData.participationChart.length > 0 && (
              <ChartCard
                title={t(locale, 'admin.hfs.chart1_title')}
                data={dashboardData.participationChart.map(item => ({ name: item.quarter, value: item.count }))}
                dataKey="value"
                colorIndex={0}
                locale={locale}
                defaultChartType="bar"
                height={300}
              />
            )}

            {/* Department Chart */}
            {getDeptChartData() && getDeptChartData().length > 0 && (
              <ChartCard
                title={t(locale, 'admin.hfs.chart2_title')}
                data={getDeptChartData()}
                dataKey="value"
                colorIndex={1}
                locale={locale}
                defaultChartType="bar"
                height={300}
              />
            )}
          </div>

          {/* Row 2: Observed Unwilling Service and Observed Low Quality Service */}
          <div className="grid gap-3 sm:gap-3 grid-cols-1 md:grid-cols-2">
            {/* Observed Unwilling Service */}
            {dashboardData.observedUnwillingServiceChart && dashboardData.observedUnwillingServiceChart.length > 0 && (
              <ChartCard
                title={`${t(locale, 'admin.hfs.chart3_title_1')} ${t(locale, 'admin.hfs.chart3_title_2')} ${t(locale, 'admin.hfs.chart3_title_3')}`}
                data={dashboardData.observedUnwillingServiceChart.map(item => ({ name: item.quarter, value: item.percentage }))}
                dataKey="value"
                colorIndex={2}
                domain={[0, 100]}
                locale={locale}
                defaultChartType="bar"
                height={300}
              />
            )}

            {/* Observed Low Quality Service */}
            {dashboardData.observedLowQualityServiceChart && dashboardData.observedLowQualityServiceChart.length > 0 && (
              <ChartCard
                title={`${t(locale, 'admin.hfs.chart4_title_1')} ${t(locale, 'admin.hfs.chart4_title_2')} ${t(locale, 'admin.hfs.chart4_title_3')}`}
                data={dashboardData.observedLowQualityServiceChart.map(item => ({ name: item.quarter, value: item.percentage }))}
                dataKey="value"
                colorIndex={3}
                domain={[0, 100]}
                locale={locale}
                defaultChartType="bar"
                height={300}
              />
            )}
          </div>

          {/* Row 3: Double Glove and Draw Blood */}
          <div className="grid gap-3 sm:gap-3 grid-cols-1 md:grid-cols-2">
            {/* Double Glove Chart */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  <div>{t(locale, 'admin.hfs.chart5_title_1')}</div>
                  <div className="text-base font-semibold">{t(locale, 'admin.hfs.chart5_title_2')}</div>
                </h3>
              </div>
              <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
                <CardContent className="p-6">
                {dashboardData.doubleGloveChart && dashboardData.doubleGloveChart.length > 0 ? (
                  <ChartContainer
                    config={{
                      yes: { label: `${t(locale, 'admin.hfs.yes')} (%)`, color: CHART_COLORS[0] },
                      no: { label: `${t(locale, 'admin.hfs.no')} (%)`, color: CHART_COLORS[1] },
                      dontKnow: { label: `${t(locale, 'admin.hfs.dont_know')} (%)`, color: CHART_COLORS[2] },
                      na: { label: `${t(locale, 'admin.hfs.na')} (%)`, color: CHART_COLORS[3] }
                    }}
                    className="h-[250px] sm:h-[300px] md:h-[350px] w-full"
                  >
                    <BarChart
                      data={dashboardData.doubleGloveChart}
                      layout="vertical"
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        tickLine={false}
                        tickMargin={5}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        dataKey="quarter" 
                        type="category" 
                        width={55}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        content={createCustomTooltip({
                          yes: t(locale, 'admin.hfs.yes'),
                          no: t(locale, 'admin.hfs.no'),
                          dontKnow: t(locale, 'admin.hfs.dont_know'),
                          na: t(locale, 'admin.hfs.na')
                        })}
                      />
                      <Legend 
                        formatter={createLegendFormatter({
                          yes: t(locale, 'admin.hfs.yes'),
                          no: t(locale, 'admin.hfs.no'),
                          dontKnow: t(locale, 'admin.hfs.dont_know'),
                          na: t(locale, 'admin.hfs.na')
                        })}
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconSize={10}
                        iconType="square"
                      />
                      <Bar dataKey="yes" fill={CHART_COLORS[0]} radius={8} />
                      <Bar dataKey="no" fill={CHART_COLORS[1]} radius={8} />
                      <Bar dataKey="dontKnow" fill={CHART_COLORS[2]} radius={8} />
                      <Bar dataKey="na" fill={CHART_COLORS[3]} radius={8} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-center font-medium">
                      {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No data'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Draw Blood Chart */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  <div>{t(locale, 'admin.hfs.chart6_title_1')}</div>
                  <div className="text-base font-semibold">{t(locale, 'admin.hfs.chart6_title_2')} {t(locale, 'admin.hfs.chart6_title_3')}</div>
                </h3>
              </div>
              <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
                <CardContent className="p-6">
                {dashboardData.drawBloodChart && dashboardData.drawBloodChart.length > 0 ? (
                  <ChartContainer
                    config={{
                      veryWorried: { label: `${t(locale, 'admin.hfs.worried_1')} (%)`, color: CHART_COLORS[0] },
                      littleWorried: { label: `${t(locale, 'admin.hfs.worried_2')} (%)`, color: CHART_COLORS[1] },
                      notWorried: { label: `${t(locale, 'admin.hfs.worried_3')} (%)`, color: CHART_COLORS[2] },
                      noNeed: { label: `${t(locale, 'admin.hfs.worried_4')} (%)`, color: CHART_COLORS[3] }
                    }}
                    className="h-[250px] sm:h-[300px] md:h-[350px] w-full"
                  >
                    <BarChart
                      data={dashboardData.drawBloodChart}
                      layout="vertical"
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        tickLine={false}
                        tickMargin={5}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        dataKey="quarter" 
                        type="category" 
                        width={55}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        content={createCustomTooltip({
                          veryWorried: t(locale, 'admin.hfs.worried_1'),
                          littleWorried: t(locale, 'admin.hfs.worried_2'),
                          notWorried: t(locale, 'admin.hfs.worried_3'),
                          noNeed: t(locale, 'admin.hfs.worried_4')
                        })}
                      />
                      <Legend 
                        formatter={createLegendFormatter({
                          veryWorried: t(locale, 'admin.hfs.worried_1'),
                          littleWorried: t(locale, 'admin.hfs.worried_2'),
                          notWorried: t(locale, 'admin.hfs.worried_3'),
                          noNeed: t(locale, 'admin.hfs.worried_4')
                        })}
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconSize={10}
                        iconType="square"
                      />
                      <Bar dataKey="veryWorried" fill={CHART_COLORS[0]} radius={8} />
                      <Bar dataKey="littleWorried" fill={CHART_COLORS[1]} radius={8} />
                      <Bar dataKey="notWorried" fill={CHART_COLORS[2]} radius={8} />
                      <Bar dataKey="noNeed" fill={CHART_COLORS[3]} radius={8} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-center font-medium">
                      {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No data'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Row 4: Enough Equipment and Service Quality */}
          <div className="grid gap-3 sm:gap-3 grid-cols-1 md:grid-cols-2">
            {/* Enough Equipment Chart */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
                <h3 className="text-lg font-bold text-foreground leading-tight">
                  <div>{t(locale, 'admin.hfs.chart7_title_1')}</div>
                  <div className="text-base font-semibold">{t(locale, 'admin.hfs.chart7_title_2')} {t(locale, 'admin.hfs.chart7_title_3')}</div>
                </h3>
              </div>
              <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
                <CardContent className="p-6">
                {dashboardData.enoughEquipmentChart && dashboardData.enoughEquipmentChart.length > 0 ? (
                  <ChartContainer
                    config={{
                      stronglyAgree: { label: `${t(locale, 'admin.hfs.strongly_agree')} (%)`, color: CHART_COLORS[0] },
                      disagree: { label: `${t(locale, 'admin.hfs.disagree')} (%)`, color: CHART_COLORS[1] },
                      stronglyDisagree: { label: `${t(locale, 'admin.hfs.strongly_disagree')} (%)`, color: CHART_COLORS[2] }
                    }}
                    className="h-[250px] sm:h-[300px] md:h-[350px] w-full"
                  >
                    <BarChart
                      data={dashboardData.enoughEquipmentChart}
                      layout="vertical"
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        tickLine={false}
                        tickMargin={5}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        dataKey="quarter" 
                        type="category" 
                        width={55}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        content={createCustomTooltip({
                          stronglyAgree: t(locale, 'admin.hfs.strongly_agree'),
                          disagree: t(locale, 'admin.hfs.disagree'),
                          stronglyDisagree: t(locale, 'admin.hfs.strongly_disagree')
                        })}
                      />
                      <Legend 
                        formatter={createLegendFormatter({
                          stronglyAgree: t(locale, 'admin.hfs.strongly_agree'),
                          disagree: t(locale, 'admin.hfs.disagree'),
                          stronglyDisagree: t(locale, 'admin.hfs.strongly_disagree')
                        })}
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconSize={10}
                        iconType="square"
                      />
                      <Bar dataKey="stronglyAgree" fill={CHART_COLORS[0]} radius={8} />
                      <Bar dataKey="disagree" fill={CHART_COLORS[1]} radius={8} />
                      <Bar dataKey="stronglyDisagree" fill={CHART_COLORS[2]} radius={8} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-center font-medium">
                      {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No data'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Service Quality Chart */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-8 bg-gradient-custom rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">
                  {t(locale, 'admin.hfs.chart8_title_1')}
                </h3>
              </div>
              <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
                <CardContent className="p-6">
                {dashboardData.serviceQualityChart && dashboardData.serviceQualityChart.length > 0 ? (
                  <ChartContainer
                    config={{
                      veryLow: { label: `${t(locale, 'admin.hfs.quality_1')} (%)`, color: CHART_COLORS[0] },
                      low: { label: `${t(locale, 'admin.hfs.quality_2')} (%)`, color: CHART_COLORS[1] },
                      average: { label: `${t(locale, 'admin.hfs.quality_3')} (%)`, color: CHART_COLORS[2] },
                      high: { label: `${t(locale, 'admin.hfs.quality_4')} (%)`, color: CHART_COLORS[3] },
                      veryHigh: { label: `${t(locale, 'admin.hfs.quality_5')} (%)`, color: CHART_COLORS[4] }
                    }}
                    className="h-[250px] sm:h-[300px]"
                  >
                    <BarChart data={dashboardData.serviceQualityChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis 
                        dataKey="quarter" 
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis domain={[0, 100]} tickLine={false} tickMargin={10} axisLine={false} />
                      <ChartTooltip 
                        cursor={false} 
                        content={createCustomTooltip({
                          veryLow: t(locale, 'admin.hfs.quality_1'),
                          low: t(locale, 'admin.hfs.quality_2'),
                          average: t(locale, 'admin.hfs.quality_3'),
                          high: t(locale, 'admin.hfs.quality_4'),
                          veryHigh: t(locale, 'admin.hfs.quality_5')
                        })} 
                      />
                      <Legend 
                        formatter={createLegendFormatter({
                          veryLow: t(locale, 'admin.hfs.quality_1'),
                          low: t(locale, 'admin.hfs.quality_2'),
                          average: t(locale, 'admin.hfs.quality_3'),
                          high: t(locale, 'admin.hfs.quality_4'),
                          veryHigh: t(locale, 'admin.hfs.quality_5')
                        })}
                        wrapperStyle={{ paddingTop: '10px' }}
                        iconSize={10}
                        iconType="square"
                      />
                      <Bar dataKey="veryLow" fill={CHART_COLORS[0]} radius={8} />
                      <Bar dataKey="low" fill={CHART_COLORS[1]} radius={8} />
                      <Bar dataKey="average" fill={CHART_COLORS[2]} radius={8} />
                      <Bar dataKey="high" fill={CHART_COLORS[3]} radius={8} />
                      <Bar dataKey="veryHigh" fill={CHART_COLORS[4]} radius={8} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-center font-medium">
                      {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No data'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                {locale === 'kh' ? 'គ្មានទិន្នន័យ' : 'No data available'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
