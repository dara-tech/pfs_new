import { useCallback, useEffect, useState } from 'react';
import { useReportingStore } from '../lib/stores/reportingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TableCell, TableRow } from '../components/ui/table';
import VirtualScrollTable from '../components/VirtualScrollTable';
import { useClearReportingMemory } from '../hooks/use-clear-reporting-memory';
import {
  formatReportStartDate,
  getAcknowledgeAgree,
  reportCellSite,
  reportCellStart,
  reportThClass,
} from '../lib/reportingRows';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import EmptyState from '../components/EmptyState';
import { FaFileExport, FaDownload, FaFilter, FaCalendarAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import api from '../lib/api';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import useRealtimeReporting from '../hooks/use-realtime-reporting';
import { REALTIME_INTERVAL_MS } from '../config/realtime';

export default function Reporting() {
  const { locale } = useUIStore();
  const { sites, loading, fetchSites } = useReportingStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSites, setSelectedSites] = useState(['*']);
  const [filteredData, setFilteredData] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [activeFilters, setActiveFilters] = useState(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  const clearLocalData = useCallback(() => {
    setFilteredData([]);
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
    setHasAutoLoaded(false);
  }, [fetchSites, locale]);

  const fetchReportingData = useCallback(async (params) => {
    const response = await api.post('/reporting/table', params);
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to fetch data');
    }
    return response.data.data || [];
  }, []);

  const handleFilter = useCallback(async () => {
    if (!startDate || !endDate) {
      setFilterError(t(locale, 'admin.common.pleaseSelectBothDates'));
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFilterError(t(locale, 'admin.common.startDateBeforeEndDate'));
      return;
    }

    const params = {
      startdate: startDate,
      enddate: endDate,
      sites: selectedSites.length > 0 ? selectedSites : ['*'],
      locale: locale || 'en',
    };

    setFilterLoading(true);
    setFilterError('');
    setIsFiltered(false);

    try {
      const data = await fetchReportingData(params);
      setFilteredData(data);
      setIsFiltered(true);
      setActiveFilters(params);
      if (data.length === 0) {
        setFilterError(t(locale, 'admin.common.noDataForDateRange'));
      }
    } catch (error) {
      console.error('Filter error:', error);
      setFilterError(error.response?.data?.error || error.message || t(locale, 'admin.common.failedToFilterData'));
    } finally {
      setFilterLoading(false);
    }
  }, [startDate, endDate, selectedSites, locale, fetchReportingData, t]);

  useRealtimeReporting({
    enabled: isFiltered && !!activeFilters && !filterLoading,
    intervalMs: REALTIME_INTERVAL_MS,
    fetcher: async () => fetchReportingData(activeFilters),
    subscribePayload: activeFilters,
    onData: (liveData) => {
      setFilteredData(liveData);
      if (liveData.length === 0) {
        setFilterError(t(locale, 'admin.common.noDataForDateRange'));
      } else {
        setFilterError('');
      }
    },
    onError: (error) => {
      console.error('Realtime reporting refresh failed:', error);
    },
  });

  useEffect(() => {
    if (hasAutoLoaded || !startDate || !endDate) return;
    setHasAutoLoaded(true);
    void handleFilter();
  }, [hasAutoLoaded, startDate, endDate, handleFilter]);

  const handleExport = () => {
    // Convert data to CSV
    if (filteredData.length === 0) {
      alert(t(locale, 'admin.common.noDataToExport'));
      return;
    }

    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Check if browser supports download attribute
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (isSafari || window.navigator.msSaveOrOpenBlob) {
      // Safari and IE fallback
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, `patient-report-${startDate}-to-${endDate}.csv`);
      } else {
        // Safari: open in new window
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          // Popup blocked, fallback to download link
          const link = document.createElement('a');
          link.href = url;
          link.download = `patient-report-${startDate}-to-${endDate}.csv`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
        } else {
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
      }
    } else {
      // Standard approach for Chrome, Firefox, etc. (improved for Mac)
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = `${startDate}-to-${endDate}`;
      link.download = `patient-report-${timestamp}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Delay cleanup to ensure download starts (especially important for Mac)
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 200);
    }
  };

  const displayData = isFiltered ? filteredData : [];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden overflow-x-hidden">
      <PageToolbar>
        <Button
          onClick={handleExport}
          variant="default"
          className="gap-2"
          disabled={displayData.length === 0 || filterLoading}
        >
          <FaDownload className="h-4 w-4" />
          {t(locale, 'admin.common.exportCSV')}
        </Button>
      </PageToolbar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Filter Card with Modern Glass Effect */}
      <Card className="mb-2 shrink-0 min-w-0 border-primary/20 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader className="pb-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <FaCalendarAlt className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle>{t(locale, 'admin.common.filters')}</CardTitle>
          </div>
          <CardDescription>{t(locale, 'admin.common.selectDateRangeSites')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            <div className="w-full space-y-2 sm:flex-1 sm:min-w-[10rem]">
              <Label htmlFor="startdate" className="text-sm font-semibold text-foreground">{t(locale, 'admin.common.startDate')}</Label>
              <Input
                id="startdate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterError('');
                  setIsFiltered(false);
                }}
                className="w-full border-primary/20 hover:border-primary/40 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                disabled={filterLoading}
              />
            </div>
            <div className="w-full space-y-2 sm:flex-1 sm:min-w-[10rem]">
              <Label htmlFor="enddate" className="text-sm font-semibold text-foreground">{t(locale, 'admin.common.endDate')}</Label>
              <Input
                id="enddate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterError('');
                  setIsFiltered(false);
                }}
                className="w-full border-primary/20 hover:border-primary/40 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                disabled={filterLoading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="w-full space-y-2 sm:flex-1 sm:min-w-[10rem]">
              <Label htmlFor="sites" className="text-sm font-semibold text-foreground">{t(locale, 'admin.common.sites')}</Label>
              <Select
                value={selectedSites.length > 0 ? selectedSites[0] : '*'}
                onValueChange={(value) => {
                  setSelectedSites(value === '*' ? ['*'] : [value]);
                  setFilterError('');
                  setIsFiltered(false);
                }}
                disabled={filterLoading}
              >
                <SelectTrigger id="sites" className="border-primary/20 hover:border-primary/40 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder={t(locale, 'admin.common.selectSites')} />
                </SelectTrigger>
                <SelectContent
                  searchable
                  selectedValue={selectedSites.length > 0 ? selectedSites[0] : '*'}
                  className="backdrop-blur-sm bg-card border-primary/10"
                >
                  <SelectItem value="*">{t(locale, 'admin.common.allSites')}</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site} value={site} className="hover:bg-primary/10 focus:bg-primary/10">
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleFilter}
              variant="default"
              size="sm"
              className="w-full gap-1.5 whitespace-nowrap sm:w-auto"
              disabled={filterLoading || !startDate || !endDate}
            >
              {filterLoading ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  {t(locale, 'admin.common.loading')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FaFilter className="h-4 w-4" />
                  {t(locale, 'admin.common.applyFilters')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </Button>
          </div>
          
          {filterError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{filterError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-4 grid shrink-0 min-w-0 gap-4 md:grid-cols-3">
        <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(locale, 'admin.common.totalRecords')}</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <FaFileExport className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.length}</div>
            <p className="text-xs text-muted-foreground">{t(locale, 'admin.common.patientRecords')}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(locale, 'admin.common.dateRange')}</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {startDate && endDate ? `${startDate} to ${endDate}` : t(locale, 'admin.common.notSet')}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {startDate && endDate ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">{t(locale, 'admin.common.days')}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(locale, 'admin.common.status')}</CardTitle>
            <div className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t(locale, 'admin.common.ready')}</div>
            <p className="text-xs text-muted-foreground">{t(locale, 'admin.common.systemReady')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden border-primary/20 bg-card/95 shadow-sm">
        <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden p-2 pt-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full bg-primary/10" />
              <Skeleton className="h-12 w-full bg-primary/10" />
              <Skeleton className="h-12 w-full bg-primary/10" />
              <Skeleton className="h-12 w-full bg-primary/10" />
            </div>
          ) : !isFiltered ? (
            <div className="flex h-full items-center justify-center py-8 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                  <FaInfoCircle className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t(locale, 'admin.common.noFiltersApplied')}</h3>
                <p className="mx-auto max-w-md text-sm font-medium text-muted-foreground">
                  {t(locale, 'admin.common.selectDateRangeApplyFilters')}
                </p>
              </div>
            </div>
          ) : displayData.length === 0 ? (
            <EmptyState
              title={t(locale, 'admin.common.noDataFound')}
              description={t(locale, 'admin.common.noRecordsFoundDateRange').replace('{startDate}', startDate).replace('{endDate}', endDate)}
            />
          ) : (
            <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
              <p className="mb-2 text-xs text-muted-foreground">
                {t(locale, 'admin.common.showingRecords').replace('{count}', String(displayData.length))}
                {filteredData.length > 0 ? t(locale, 'admin.common.filtered') : ''}
                <span className="md:hidden">
                  {' · '}
                  {locale === 'kh'
                    ? 'អូសផ្ដោតទៅម្ដែងដើម្បីមើលជួរឈរទាំងអស់'
                    : 'Swipe horizontally for all columns'}
                </span>
              </p>
              <VirtualScrollTable
                rows={displayData}
                rowHeight={44}
                maxHeight="min(65vh, 520px)"
                getRowKey={(row, idx) => row.id ?? row.START ?? row.start ?? idx}
                header={
                  <thead className="[&_tr]:border-b sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">ACKNOWLEDGE</th>
                    {['START', 'Site', 'Q1A', 'Q2A', 'Q3A', 'Q4A', 'Q5A', 'Q6A', 'Q7A', 'Q8A', 'Q9A', 'Q10A', 'Q1B', 'Q2B', 'Q3B', 'Q4B', 'Q5B', 'Q1C', 'Q2C', 'Q3C_1', 'Q3C_2', 'Q3C_3', 'Q3C_4', 'Q3C_5', 'Q3C_6', 'Q3C_7', 'Q3C_8', 'Q4C', 'Q5C1', 'Q5C2', 'Q5C3', 'Q6C_1', 'Q6C_2', 'Q6C_3', 'Q6C_4', 'Q6C_5', 'Q6C_6', 'Q6C_7', 'Q6C_8', 'Q7C', 'Q8C', 'Q9C_1', 'Q9C_2', 'Q9C_3', 'Q9C_4', 'Q9C_5', 'Q10C', 'Q11C', 'Q12C', 'Q13C', 'Q14C', 'Platform'].map((col) => (
                      <th key={col} className={reportThClass(col)}>{col}</th>
                    ))}
                  </tr>
                  </thead>
                }
                renderRow={(row, idx, key) => {
                  const isAgree = getAcknowledgeAgree(row);
                  return (
                    <TableRow key={key} className="hover:bg-muted/50 border-b transition-colors">
                      <TableCell>
                        <Badge variant={isAgree ? 'default' : 'secondary'}>
                          {isAgree ? t(locale, 'admin.common.agree') : t(locale, 'admin.common.disagree')}
                        </Badge>
                      </TableCell>
                      <TableCell className={reportCellStart}>
                        {formatReportStartDate(row.START || row.start)}
                      </TableCell>
                      <TableCell className={reportCellSite}>
                        {row.site || row.sitename || '-'}
                      </TableCell>
                      <TableCell>{row.Q1A ?? '-'}</TableCell>
                      <TableCell>{row.Q2A ?? '-'}</TableCell>
                      <TableCell>{row.Q3A ?? '-'}</TableCell>
                      <TableCell>{row.Q4A ?? '-'}</TableCell>
                      <TableCell>{row.Q5A ?? '-'}</TableCell>
                      <TableCell>{row.Q6A ?? '-'}</TableCell>
                      <TableCell>{row.Q7A ?? '-'}</TableCell>
                      <TableCell>{row.Q8A ?? '-'}</TableCell>
                      <TableCell>{row.Q9A ?? '-'}</TableCell>
                      <TableCell>{row.Q10A ?? '-'}</TableCell>
                      <TableCell>{row.Q1B ?? '-'}</TableCell>
                      <TableCell>{row.Q2B ?? '-'}</TableCell>
                      <TableCell>{row.Q3B ?? '-'}</TableCell>
                      <TableCell>{row.Q4B ?? '-'}</TableCell>
                      <TableCell>{row.Q5B ?? '-'}</TableCell>
                      <TableCell>{row.Q1C ?? '-'}</TableCell>
                      <TableCell>{row.Q2C ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_1 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_2 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_3 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_4 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_5 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_6 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_7 ?? '-'}</TableCell>
                      <TableCell>{row.Q3C_8 ?? '-'}</TableCell>
                      <TableCell>{row.Q4C ?? '-'}</TableCell>
                      <TableCell>{row.Q5C1 ?? '-'}</TableCell>
                      <TableCell>{row.Q5C2 ?? '-'}</TableCell>
                      <TableCell>{row.Q5C3 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_1 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_2 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_3 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_4 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_5 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_6 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_7 ?? '-'}</TableCell>
                      <TableCell>{row.Q6C_8 ?? '-'}</TableCell>
                      <TableCell>{row.Q7C ?? '-'}</TableCell>
                      <TableCell>{row.Q8C ?? '-'}</TableCell>
                      <TableCell>{row.Q9C_1 ?? '-'}</TableCell>
                      <TableCell>{row.Q9C_2 ?? '-'}</TableCell>
                      <TableCell>{row.Q9C_3 ?? '-'}</TableCell>
                      <TableCell>{row.Q9C_4 ?? '-'}</TableCell>
                      <TableCell>{row.Q9C_5 ?? '-'}</TableCell>
                      <TableCell>{row.Q10C ?? '-'}</TableCell>
                      <TableCell>{row.Q11C ?? '-'}</TableCell>
                      <TableCell>{row.Q12C ?? '-'}</TableCell>
                      <TableCell>{row.Q13C ?? '-'}</TableCell>
                      <TableCell>{row.Q14C ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.META_INSTANCE_ID ? 'ODK' : 'Online'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
