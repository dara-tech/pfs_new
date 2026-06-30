import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { ChartCard, VerticalBarChartCard } from '../components/charts';
import { DashboardFilterToolbar, KpiSummaryRow } from '../components/dashboard';
import { FaChartLine, FaDatabase, FaFilter } from 'react-icons/fa';
import { Users, Building2, CalendarRange, MessageSquare } from 'lucide-react';
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

export default function Patients() {
  const { locale } = useUIStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    periods: [],
    sites: [],
    kps: [],
    provinces: [],
    ages: [],
    isFiscalYear: false,
    byMonth: false,
    locale: locale || 'en'
  });
  const [availableSites, setAvailableSites] = useState([]);
  const [availableProvinces, setAvailableProvinces] = useState({});
  const [userProvinces, setUserProvinces] = useState(null); // Provinces user has access to
  const [availableKPs, setAvailableKPs] = useState({});
  const [availableAges, setAvailableAges] = useState({});
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const dashboardFetchId = useRef(0);
  const defaultFilters = {
    periods: [],
    sites: [],
    kps: [],
    provinces: [],
    ages: [],
    isFiscalYear: false,
    byMonth: false,
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
    const fetchId = ++dashboardFetchId.current;
    setLoading(true);
    try {
      // Send periods as array and also as comma-separated string for backward compatibility
      const paramsToSend = {
        ...filters,
        periods: filters.periods,
        period: filters.periods.length > 0 ? filters.periods.join(',') : ''
      };
      const response = await api.post('/reporting/dashboard', paramsToSend);
      if (fetchId !== dashboardFetchId.current) return;
      if (response.data.success) {
        setDashboardData(response.data.data);
        setAvailableSites(response.data.sites || []);
        setAvailableProvinces(response.data.provinces || {});
        setUserProvinces(response.data.userProvinces || null);
        setAvailableKPs(response.data.kps || {});
        setAvailableAges(response.data.ages || {});
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
          await fetchDashboardWithFilters(nextFilters, fetchId);
          return;
        }
        
        // Auto-select province if user has only one province assigned
        if (response.data.userProvinces && Array.isArray(response.data.userProvinces) && response.data.userProvinces.length === 1) {
          setFilters(prev => ({ ...prev, provinces: response.data.userProvinces }));
        }
      } else {
        console.error('Dashboard fetch failed:', response.data.error);
      }
    } catch (error) {
      if (fetchId !== dashboardFetchId.current) return;
      console.error('Fetch dashboard error:', error);
      console.error('Error details:', error.response?.data);
      // Set empty data on error so UI doesn't break
      setDashboardData({
        participationChart: null,
        platformChart: null,
        kpChart: null,
        providerSatisfactionChart: null,
        serviceSatisfactionChart: null,
        patientSatisfactionChart: null,
        providerAttitudeChart: null,
        patientCommentsChart: null
      });
    } finally {
      if (fetchId === dashboardFetchId.current) {
        setLoading(false);
      }
    }
  };

  const fetchDashboardWithFilters = async (filterParams, parentFetchId) => {
    const fetchId = parentFetchId ?? ++dashboardFetchId.current;
    setLoading(true);
    try {
      // Auto-select province if user has only one province assigned and not already selected
      let finalFilterParams = { ...filterParams };
      if (filterParams.provinces && filterParams.provinces.length === 0) {
        // Check if we need to auto-select province - this will be handled after first response
      }
      
      // Send periods as array and also as comma-separated string for backward compatibility
      const paramsToSend = {
        ...finalFilterParams,
        periods: finalFilterParams.periods || [],
        period: finalFilterParams.periods && finalFilterParams.periods.length > 0 ? finalFilterParams.periods.join(',') : (finalFilterParams.period || '')
      };
      const response = await api.post('/reporting/dashboard', paramsToSend);
      if (fetchId !== dashboardFetchId.current) return;
      if (response.data.success) {
        setDashboardData(response.data.data);
        setAvailableSites(response.data.sites || []);
        setAvailableProvinces(response.data.provinces || {});
        setUserProvinces(response.data.userProvinces || null);
        setAvailableKPs(response.data.kps || {});
        setAvailableAges(response.data.ages || {});
        setAvailablePeriods(response.data.periods || []);
        // Auto-select province if user has only one province assigned and not already selected
        if (response.data.userProvinces && Array.isArray(response.data.userProvinces) && response.data.userProvinces.length === 1) {
          if (!filterParams.provinces || filterParams.provinces.length === 0) {
            const updatedFilters = { ...filterParams, provinces: response.data.userProvinces };
            setFilters(updatedFilters);
            // Re-fetch with the auto-selected province
            const paramsWithProvince = {
              ...updatedFilters,
              periods: updatedFilters.periods || [],
              period: updatedFilters.periods && updatedFilters.periods.length > 0 ? updatedFilters.periods.join(',') : (updatedFilters.period || '')
            };
            const retryResponse = await api.post('/reporting/dashboard', paramsWithProvince);
            if (retryResponse.data.success) {
              setDashboardData(retryResponse.data.data);
            }
          }
        }
      } else {
        console.error('Dashboard fetch failed:', response.data.error);
      }
    } catch (error) {
      if (fetchId !== dashboardFetchId.current) return;
      console.error('Fetch dashboard error:', error);
      console.error('Error details:', error.response?.data);
      // Set empty data on error so UI doesn't break
      setDashboardData({
        participationChart: null,
        platformChart: null,
        kpChart: null,
        providerSatisfactionChart: null,
        serviceSatisfactionChart: null,
        patientSatisfactionChart: null,
        providerAttitudeChart: null,
        patientCommentsChart: null
      });
    } finally {
      if (fetchId === dashboardFetchId.current) {
        setLoading(false);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      
      // Reset dependent filters when parent changes
      if (key === 'provinces') {
        // When province changes to 'all' or empty, reset sites and kps
        const isProvinceEmpty = !value || (Array.isArray(value) && value.length === 0);
        if (isProvinceEmpty) {
          updated.sites = ['*'];
          updated.kps = [];
        }
      } else if (key === 'sites') {
        // When sites changes to '*', reset kps
        const isSitesAll = Array.isArray(value) && value.length > 0 && value[0] === '*';
        if (isSitesAll || !value || (Array.isArray(value) && value.length === 0)) {
          updated.kps = [];
        }
      }
      
      return updated;
    });
  };

  const handleApplyFilters = () => {
    fetchDashboardWithFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters({ ...defaultFilters, locale: locale || 'en' });
  };

  const getKpiItems = () => {
    let participants = 0;
    if (dashboardData?.platformChart?.length) {
      dashboardData.platformChart.forEach((item) => {
        participants += (item.odk ?? 0) + (item.online ?? 0);
      });
    }
    const facilities =
      !filters.sites?.length || filters.sites[0] === '*'
        ? availableSites.length
        : filters.sites.filter((s) => s !== '*').length;
    const periods = filters.periods?.length ?? 0;
    const feedback = dashboardData?.patientCommentsChart?.total ?? 0;

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
        id: 'feedback',
        label: locale === 'kh' ? 'មតិយោបល់' : 'Feedback',
        value: feedback.toLocaleString(),
        icon: MessageSquare,
      },
    ];
  };

  // Helper function to aggregate quarter-based data into single values
  const aggregateData = (dataArray, key) => {
    if (!dataArray || dataArray.length === 0) return 0;
    return dataArray.reduce((sum, item) => sum + (item[key] || 0), 0);
  };

  // Helper function to calculate average percentage from quarter data
  const averagePercentage = (dataArray, key, totalKey) => {
    if (!dataArray || dataArray.length === 0) return 0;
    let totalValue = 0;
    let totalCount = 0;
    dataArray.forEach(item => {
      if (item[key] !== undefined && item[totalKey] !== undefined) {
        totalValue += item[key];
        totalCount += item[totalKey];
      }
    });
    return totalCount > 0 ? Math.round((totalValue / totalCount) * 100) : 0;
  };

  // Platform chart: show one row per period with Tablet and QR Code as grouped bars
  const getPlatformDataByPeriod = () => {
    if (!dashboardData?.platformChart || dashboardData.platformChart.length === 0) return null;
    return dashboardData.platformChart.map((item) => ({
      name: item.quarter,
      Tablet: item.odk ?? 0,
      'QR Code': item.online ?? 0
    }));
  };

  const platformBars = [
    { dataKey: 'Tablet', label: locale === 'kh' ? 'Tablet' : 'Tablet' },
    { dataKey: 'QR Code', label: locale === 'kh' ? 'QR Code' : 'QR Code' }
  ];

  // Provider (patient ART) satisfaction: one row per period, grouped bars per category
  const getProviderSatisfactionByPeriod = () => {
    if (!dashboardData?.providerSatisfactionChart || dashboardData.providerSatisfactionChart.length === 0) return null;
    return dashboardData.providerSatisfactionChart.map((item) => ({
      name: item.quarter,
      overall: item.overall ?? 0,
      receptionist: item.receptionist ?? 0,
      counselor: item.counselor ?? 0,
      doctor: item.doctor ?? 0,
      pharmacist: item.pharmacist ?? 0
    }));
  };

  const providerSatisfactionBars = [
    { dataKey: 'overall', label: locale === 'kh' ? 'ការពេញចិត្តជារួម' : 'Overall' },
    { dataKey: 'receptionist', label: locale === 'kh' ? 'អ្នកទទួលចុះឈ្មោះ' : 'Registrar' },
    { dataKey: 'counselor', label: locale === 'kh' ? 'អ្នកផ្តល់ប្រឹក្សា' : 'Counselor' },
    { dataKey: 'doctor', label: locale === 'kh' ? 'គ្រូពេទ្យ' : 'Doctor' },
    { dataKey: 'pharmacist', label: locale === 'kh' ? 'ឱសថការី' : 'Pharmacist' }
  ];

  // Service quality (Quality of Care): one row per period
  const getServiceQualityByPeriod = () => {
    if (!dashboardData?.serviceSatisfactionChart || dashboardData.serviceSatisfactionChart.length === 0) return null;
    return dashboardData.serviceSatisfactionChart.map((item) => ({
      name: item.quarter,
      anc: item.anc ?? 0,
      sti: item.sti ?? 0,
      lab: item.lab ?? 0,
      tb: item.tb ?? 0,
      psycho: item.psycho ?? 0,
    }));
  };

  const serviceQualityBars = [
    { dataKey: 'anc', label: 'ANC' },
    { dataKey: 'sti', label: 'STI' },
    { dataKey: 'lab', label: locale === 'kh' ? 'មន្ទីរពិសោធន៍' : 'Laboratory' },
    { dataKey: 'tb', label: 'TB' },
    { dataKey: 'psycho', label: locale === 'kh' ? 'ចិត្តសាស្ត្រ' : 'Psychological' },
  ];

  // Other services satisfaction: one row per period
  const getOtherServicesByPeriod = () => {
    if (!dashboardData?.serviceSatisfactionChart || dashboardData.serviceSatisfactionChart.length === 0) return null;
    return dashboardData.serviceSatisfactionChart.map((item) => ({
      name: item.quarter,
      mentalHealth: item.psycho ?? 0,
      laboratory: item.lab ?? 0,
      counseling: item.anc ?? 0,
      eyeCounseling: item.sti ?? 0,
      psycho: item.psycho ?? 0
    }));
  };

  const otherServicesBars = [
    { dataKey: 'mentalHealth', label: locale === 'kh' ? 'សុខភាពផ្លូវចិត្ត' : 'Mental Health' },
    { dataKey: 'laboratory', label: locale === 'kh' ? 'មន្ទីរពិសោធន៍' : 'Laboratory' },
    { dataKey: 'counseling', label: locale === 'kh' ? 'ការប្រឹក្សាយោបល់' : 'Counseling' },
    { dataKey: 'eyeCounseling', label: locale === 'kh' ? 'ការប្រឹក្សាយោបល់ភ្នែក' : 'Eye' },
    { dataKey: 'psycho', label: locale === 'kh' ? 'ចិត្តសាស្ត្រ' : 'Psychological' }
  ];

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
        availableKPs={availableKPs}
        availableAges={availableAges}
        userProvinces={userProvinces}
        showKp
        showAge
        showByMonth
      />

      <KpiSummaryRow
        items={dashboardData ? getKpiItems() : []}
        loading={loading && !dashboardData}
        className="mb-3"
      />

      {/* Charts Grid */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Number of Participants Chart - one bar group per period */}
          {getPlatformDataByPeriod() && (
            <ChartCard
              title={locale === 'kh' ? 'ចំនួនអ្នកចូលរួម' : 'Number of Participants'}
              data={getPlatformDataByPeriod()}
              nameKey="name"
              colorIndex={0}
              locale={locale}
              defaultChartType="bar"
              bars={platformBars}
            />
          )}

          {/* Patient Satisfaction (ART Service) % - one bar group per period */}
          {getProviderSatisfactionByPeriod() && (
            <ChartCard
              title={locale === 'kh' ? 'ការពេញចិត្តរបស់អ្នកជំងឺ (សេវា ART) %' : 'Patient Satisfaction (ART Service) %'}
              data={getProviderSatisfactionByPeriod()}
              nameKey="name"
              colorIndex={1}
              angle={0}
              domain={[0, 100]}
              locale={locale}
              defaultChartType="bar"
              bars={providerSatisfactionBars}
            />
          )}

          {/* Quality of Care Service % - one bar group per period */}
          {getServiceQualityByPeriod() && (
            <ChartCard
              title={locale === 'kh' ? 'គុណភាពនៃសេវាថែទាំ %' : 'Quality of Care Service %'}
              data={getServiceQualityByPeriod()}
              nameKey="name"
              colorIndex={2}
              angle={0}
              domain={[0, 100]}
              locale={locale}
              defaultChartType="bar"
              bars={serviceQualityBars}
            />
          )}

          {/* Patient Satisfaction (Other Services) % - one bar group per period */}
          {getOtherServicesByPeriod() && (
            <ChartCard
              title={locale === 'kh' ? 'ការពេញចិត្តរបស់អ្នកជំងឺ (សេវាផ្សេងទៀត) %' : 'Patient Satisfaction (Other Services) %'}
              data={getOtherServicesByPeriod()}
              nameKey="name"
              colorIndex={3}
              angle={0}
              domain={[0, 100]}
              locale={locale}
              defaultChartType="bar"
              bars={otherServicesBars}
            />
          )}
          </div>

          {/* Number and Percentage of Patients Completing Feedback */}
          {dashboardData.patientCommentsChart && dashboardData.patientCommentsChart.total > 0 && (
            <VerticalBarChartCard
              title={
                locale === 'kh' 
                  ? `ចំនួន និងភាគរយ អ្នកជំងឺបំពេញមតិយោបល់ និងសំណូមពរ (#${dashboardData.patientCommentsChart.total})`
                  : `Number and Percentage of Patients Completing Feedback and Suggestions (#${dashboardData.patientCommentsChart.total})`
              }
              data={[
                { 
                  name: locale === 'kh' ? 'កាត់មួយពេលរាំ (29%)' : 'Cut once a week (29%)', 
                  value: dashboardData.patientCommentsChart.reduceWaitingTime,
                  percentage: Math.round((dashboardData.patientCommentsChart.reduceWaitingTime / dashboardData.patientCommentsChart.total) * 100)
                },
                { 
                  name: locale === 'kh' ? 'អ្នកគ្រប់ប្រឹក្សា (13%)' : 'Counselor (13%)', 
                  value: dashboardData.patientCommentsChart.moreFriendlyProvider,
                  percentage: Math.round((dashboardData.patientCommentsChart.moreFriendlyProvider / dashboardData.patientCommentsChart.total) * 100)
                },
                { 
                  name: locale === 'kh' ? 'សុភាព និងការព្យា (7%)' : 'Politeness and Treatment (7%)', 
                  value: dashboardData.patientCommentsChart.staffPresent,
                  percentage: Math.round((dashboardData.patientCommentsChart.staffPresent / dashboardData.patientCommentsChart.total) * 100)
                },
                { 
                  name: locale === 'kh' ? 'ការប្រឹក្សាយោបល់ភ្នែក (19%)' : 'Eye Counseling (19%)', 
                  value: dashboardData.patientCommentsChart.cleanWaitingRoom,
                  percentage: Math.round((dashboardData.patientCommentsChart.cleanWaitingRoom / dashboardData.patientCommentsChart.total) * 100)
                },
                { 
                  name: locale === 'kh' ? 'ការប្រឹក្សាយោបល់ចិត្តសាស្ត្រ (25%)' : 'Psychological Counseling (25%)', 
                  value: dashboardData.patientCommentsChart.serviceEvery6Month,
                  percentage: Math.round((dashboardData.patientCommentsChart.serviceEvery6Month / dashboardData.patientCommentsChart.total) * 100)
                },
                { 
                  name: locale === 'kh' ? 'សរុប (74%)' : 'Total (74%)', 
                  value: dashboardData.patientCommentsChart.total,
                  percentage: 74
                }
              ]}
              dataKey="value"
              colorIndex={0}
              height={400}
              locale={locale}
              formatter={(value, name) => [`${value} (${Math.round((value / dashboardData.patientCommentsChart.total) * 100)}%)`, name]}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle>Dashboard Overview</CardTitle>
              <CardDescription>Select filters to view analytics and charts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <FaChartLine className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Data Selected</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4 font-medium">
                  To view dashboard analytics, please:
                </p>
                <ol className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-2 list-decimal list-inside">
                  <li>Select a period from the dropdown (e.g., Q1 2024)</li>
                  <li>Optionally select sites, KP, province, or age filters</li>
                  <li>Toggle Fiscal Year or By Month if needed</li>
                  <li>Click "Apply Filters" to generate charts</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Preview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Charts</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <FaChartLine className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Available visualizations</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filter Options</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <FaFilter className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">Filter categories</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Range</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <FaDatabase className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2020+</div>
                <p className="text-xs text-muted-foreground">Historical data available</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <div className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Ready</div>
                <p className="text-xs text-muted-foreground">System operational</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
