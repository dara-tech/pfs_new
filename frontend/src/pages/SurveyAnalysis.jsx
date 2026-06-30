import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useReportingStore } from '../lib/stores/reportingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChartCard } from '../components/charts';
import { FaBrain, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import { PiGraphFill, PiChartBarFill } from 'react-icons/pi';
import api from '../lib/api';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';
const GeographicMap = lazy(() => import('../components/SurveyAnalysis/GeographicMap'));
import useRealtimeReporting from '../hooks/use-realtime-reporting';
import { useClearReportingMemory } from '../hooks/use-clear-reporting-memory';
import { REALTIME_INTERVAL_MS } from '../config/realtime';

export default function SurveyAnalysis() {
  const { locale } = useUIStore();
  const { sites, loading, fetchSites } = useReportingStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSites, setSelectedSites] = useState(['*']);
  const [filteredData, setFilteredData] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeFilters, setActiveFilters] = useState(null);

  const clearLocalData = useCallback(() => {
    setFilteredData([]);
    setAnalysisData(null);
    setIsFiltered(false);
    setActiveFilters(null);
  }, []);

  useClearReportingMemory(clearLocalData);

  useEffect(() => {
    fetchSites(locale || 'en');
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastMonth.toISOString().split('T')[0]);
  }, [fetchSites, locale]);

  const fetchAnalysisRows = useCallback(async (params) => {
    const response = await api.post('/reporting/table', params);
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to fetch analysis data');
    }
    return response.data.data || [];
  }, []);

  const handleAnalyze = async () => {
    if (!startDate || !endDate) return;

    const params = {
      startdate: startDate,
      enddate: endDate,
      sites: selectedSites.length > 0 ? selectedSites : ['*'],
      locale: locale || 'en'
    };

    setFilterLoading(true);
    try {
      const data = await fetchAnalysisRows(params);
      setFilteredData(data);
      setIsFiltered(true);
      setActiveFilters(params);
      
      // Generate advanced analysis
      setAnalysisData(generateAdvancedAnalysis(data));
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  useRealtimeReporting({
    enabled: isFiltered && !!activeFilters && !filterLoading,
    intervalMs: REALTIME_INTERVAL_MS,
    fetcher: async () => fetchAnalysisRows(activeFilters),
    subscribePayload: activeFilters,
    onData: (liveData) => {
      setFilteredData(liveData);
      setAnalysisData(generateAdvancedAnalysis(liveData));
    },
    onError: (error) => {
      console.error('Realtime survey analysis refresh failed:', error);
    },
  });

  // Advanced analysis generation
  const generateAdvancedAnalysis = (data) => {
    if (!data || data.length === 0) return null;

    const satisfaction = calculateSatisfactionMetrics(data);
    const trends = calculateTrends(data);
    const correlations = calculateCorrelations(data);
    const keyFindings = identifyKeyFindings(data, satisfaction);
    const recommendations = generateRecommendations(data, satisfaction);
    const mindMapData = generateMindMapData(data, satisfaction);

    return {
      satisfaction,
      trends,
      correlations,
      keyFindings,
      recommendations,
      mindMapData
    };
  };

  const calculateSatisfactionMetrics = (data) => {
    const metrics = {
      overall: { total: 0, satisfied: 0, neutral: 0, dissatisfied: 0 },
      byProvider: {},
      byService: {},
      bySite: {}
    };

    data.forEach(row => {
      if (row.ACKNOWLEDGE === 1) {
        const satisfactionScores = [];
        for (let i = 1; i <= 5; i++) {
          const q = row[`Q${i}A`];
          if (q != null && q !== 4) satisfactionScores.push(parseInt(q));
        }
        
        if (satisfactionScores.length > 0) {
          const avg = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;
          metrics.overall.total++;
          if (avg >= 3) metrics.overall.satisfied++;
          else if (avg === 2) metrics.overall.neutral++;
          else metrics.overall.dissatisfied++;
        }

        ['Q1A', 'Q2A', 'Q3A', 'Q4A', 'Q5A'].forEach((q, idx) => {
          const provider = ['Overall', 'Receptionist', 'Counselor', 'Doctor', 'Pharmacist'][idx];
          if (row[q] != null && row[q] !== 4) {
            if (!metrics.byProvider[provider]) {
              metrics.byProvider[provider] = { total: 0, satisfied: 0 };
            }
            metrics.byProvider[provider].total++;
            if (row[q] === 3) metrics.byProvider[provider].satisfied++;
          }
        });

        ['Q1B', 'Q2B', 'Q3B', 'Q4B', 'Q5B'].forEach((q, idx) => {
          const service = ['ANC', 'STI', 'LAB', 'TB', 'Psycho-Counseling'][idx];
          if (row[q] != null && row[q] !== 4) {
            if (!metrics.byService[service]) {
              metrics.byService[service] = { total: 0, satisfied: 0 };
            }
            metrics.byService[service].total++;
            if (row[q] === 3) metrics.byService[service].satisfied++;
          }
        });

        const site = row.site || row.sitename || 'Unknown';
        if (!metrics.bySite[site]) {
          metrics.bySite[site] = { total: 0, satisfied: 0 };
        }
        metrics.bySite[site].total++;
        const siteAvg = satisfactionScores.length > 0 
          ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length 
          : 0;
        if (siteAvg >= 3) metrics.bySite[site].satisfied++;
      }
    });

    return metrics;
  };

  const calculateTrends = (data) => {
    const monthlyData = {};
    
    data.forEach(row => {
      if (row.START || row.start) {
        try {
          const date = new Date(row.START || row.start);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { count: 0, satisfaction: [] };
          }
          monthlyData[monthKey].count++;
          
          const scores = [];
          for (let i = 1; i <= 5; i++) {
            const q = row[`Q${i}A`];
            if (q != null && q !== 4) scores.push(parseInt(q));
          }
          if (scores.length > 0) {
            monthlyData[monthKey].satisfaction.push(
              scores.reduce((a, b) => a + b, 0) / scores.length
            );
          }
        } catch (e) {}
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        count: data.count,
        avgSatisfaction: data.satisfaction.length > 0
          ? data.satisfaction.reduce((a, b) => a + b, 0) / data.satisfaction.length
          : 0
      }));
  };

  const calculateCorrelations = (data) => {
    const correlations = {
      providerService: {},
      sitePlatform: {},
      satisfactionIssues: {}
    };

    data.forEach(row => {
      if (row.ACKNOWLEDGE === 1) {
        const providerAvg = ['Q1A', 'Q2A', 'Q3A', 'Q4A', 'Q5A']
          .map(q => row[q])
          .filter(v => v != null && v !== 4)
          .reduce((a, b, _, arr) => a + (b / arr.length), 0);
        
        const serviceAvg = ['Q1B', 'Q2B', 'Q3B', 'Q4B', 'Q5B']
          .map(q => row[q])
          .filter(v => v != null && v !== 4)
          .reduce((a, b, _, arr) => a + (b / arr.length), 0);

        if (providerAvg > 0 && serviceAvg > 0) {
          const key = `${Math.round(providerAvg)}-${Math.round(serviceAvg)}`;
          correlations.providerService[key] = (correlations.providerService[key] || 0) + 1;
        }
      }
    });

    return correlations;
  };

  const identifyKeyFindings = (data, metrics) => {
    const findings = [];

    if (metrics.overall.total > 0) {
      const satisfactionRate = (metrics.overall.satisfied / metrics.overall.total) * 100;
      findings.push({
        type: satisfactionRate >= 80 ? 'positive' : satisfactionRate >= 60 ? 'neutral' : 'negative',
        title: t(locale, 'admin.common.overallSatisfaction'),
        value: `${satisfactionRate.toFixed(1)}%`,
        description: `${metrics.overall.satisfied} ${t(locale, 'admin.common.outOf')} ${metrics.overall.total} ${t(locale, 'admin.common.respondentsSatisfied')}`
      });
    }

    const providerRates = Object.entries(metrics.byProvider).map(([name, data]) => ({
      name,
      rate: data.total > 0 ? (data.satisfied / data.total) * 100 : 0,
      total: data.total
    })).sort((a, b) => b.rate - a.rate);

    if (providerRates.length > 0 && providerRates[0].total > 10) {
      findings.push({
        type: 'positive',
        title: t(locale, 'admin.common.topPerformingProvider'),
        value: providerRates[0].name,
        description: `${providerRates[0].rate.toFixed(1)}% ${t(locale, 'admin.common.satisfactionRate')}`
      });
    }

    return findings;
  };

  const generateRecommendations = (data, metrics) => {
    const recommendations = [];
    const serviceRates = Object.entries(metrics.byService)
      .map(([name, data]) => ({
        name,
        rate: data.total > 0 ? (data.satisfied / data.total) * 100 : 0
      }))
      .filter(s => s.rate < 75 && s.rate > 0);

    serviceRates.forEach(service => {
      recommendations.push({
        priority: 'high',
        category: t(locale, 'admin.common.serviceQuality'),
        title: `${t(locale, 'admin.common.improve')} ${service.name} ${t(locale, 'admin.common.service')}`,
        description: `${t(locale, 'admin.common.currentSatisfaction')} ${service.rate.toFixed(1)}%. ${t(locale, 'admin.common.considerTraining')}`
      });
    });

    return recommendations;
  };

  const generateMindMapData = (data, metrics) => {
    return {
      center: {
        id: 'survey-analysis',
        label: t(locale, 'admin.common.surveyAnalysis'),
        value: data.length,
        type: 'center'
      },
      nodes: [
        {
          id: 'satisfaction',
          label: t(locale, 'admin.common.satisfactionMetrics'),
          parent: 'survey-analysis',
          value: metrics.overall.total,
          children: Object.entries(metrics.byProvider).map(([name, data]) => ({
            id: `provider-${name}`,
            label: name,
            parent: 'satisfaction',
            value: data.total,
            satisfaction: data.total > 0 ? (data.satisfied / data.total) * 100 : 0
          }))
        },
        {
          id: 'services',
          label: t(locale, 'admin.common.serviceQuality'),
          parent: 'survey-analysis',
          value: Object.values(metrics.byService).reduce((sum, d) => sum + d.total, 0),
          children: Object.entries(metrics.byService).map(([name, data]) => ({
            id: `service-${name}`,
            label: name,
            parent: 'services',
            value: data.total,
            satisfaction: data.total > 0 ? (data.satisfied / data.total) * 100 : 0
          }))
        },
        {
          id: 'sites',
          label: t(locale, 'admin.common.sitePerformance'),
          parent: 'survey-analysis',
          value: Object.values(metrics.bySite).reduce((sum, d) => sum + d.total, 0),
          children: Object.entries(metrics.bySite)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10)
            .map(([name, data]) => ({
              id: `site-${name}`,
              label: name,
              parent: 'sites',
              value: data.total,
              satisfaction: data.total > 0 ? (data.satisfied / data.total) * 100 : 0
            }))
        }
      ]
    };
  };

  return (
    <div className="page-stack min-w-0">
      <Card className="border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/95 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiGraphFill className="h-5 w-5 text-primary" />
            {t(locale, 'admin.common.analysisParameters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px] space-y-2">
              <Label>{t(locale, 'admin.common.startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={filterLoading}
              />
            </div>
            <div className="flex-1 min-w-[180px] space-y-2">
              <Label>{t(locale, 'admin.common.endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={filterLoading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex-1 min-w-[180px] space-y-2">
              <Label>{t(locale, 'admin.common.sites')}</Label>
              <Select
                value={selectedSites.length > 0 ? selectedSites[0] : '*'}
                onValueChange={(value) => setSelectedSites(value === '*' ? ['*'] : [value])}
                disabled={filterLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">{t(locale, 'admin.common.allSites')}</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAnalyze} 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={filterLoading || !startDate || !endDate}
            >
              {filterLoading ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  {t(locale, 'admin.common.analyzing')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FaBrain className="h-4 w-4" />
                  {t(locale, 'admin.common.startAnalysis')}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysisData && (
        <Tabs defaultValue="map" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <FaMapMarkerAlt className="h-4 w-4" />
              {t(locale, 'admin.common.map')}
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <PiChartBarFill className="h-4 w-4" />
              {t(locale, 'admin.common.trends')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-6">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
                  <FaSpinner className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <GeographicMap
                surveyData={analysisData}
                locale={locale}
                filteredData={filteredData}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {analysisData.trends && analysisData.trends.length > 0 && (
                <>
                  <ChartCard
                    title={t(locale, 'admin.common.monthlyTrends')}
                    data={analysisData.trends.map(t => ({ name: t.month, value: t.count }))}
                    dataKey="value"
                    colorIndex={0}
                    locale={locale}
                    defaultChartType="line"
                  />
                  <ChartCard
                    title={t(locale, 'admin.common.averageSatisfactionOverTime')}
                    data={analysisData.trends.map(t => ({ name: t.month, value: Math.round(t.avgSatisfaction * 100) / 100 }))}
                    dataKey="value"
                    colorIndex={1}
                    locale={locale}
                    defaultChartType="area"
                    domain={[0, 3]}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!analysisData && isFiltered && (
        <Card className="border-primary/20">
          <CardContent className="py-16 text-center">
            <FaBrain className="h-16 w-16 mx-auto mb-4 text-primary/60" />
            <h3 className="text-lg font-semibold mb-2">
              {t(locale, 'admin.common.noDataAvailable')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(locale, 'admin.common.selectDateRangeStartAnalysis')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
