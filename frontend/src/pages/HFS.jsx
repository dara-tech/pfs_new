import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TableCell, TableRow } from '../components/ui/table';
import VirtualScrollTable from '../components/VirtualScrollTable';
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
import { FaFileExport, FaFilter, FaCalendarAlt, FaSpinner, FaHospital } from 'react-icons/fa';
import api from '../lib/api';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import MobileScrollHint from '../components/admin/MobileScrollHint';
import useRealtimeReporting from '../hooks/use-realtime-reporting';
import { REALTIME_INTERVAL_MS } from '../config/realtime';

export default function HFS() {
  const { locale } = useUIStore();
  const [sites, setSites] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSites, setSelectedSites] = useState(['*']);
  const [filteredData, setFilteredData] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [activeFilters, setActiveFilters] = useState(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  useEffect(() => {
    return () => {
      setFilteredData([]);
      setSites([]);
    };
  }, []);

  useEffect(() => {
    // Initialize default dates (last 3 months for HFS)
    const today = new Date();
    const lastQuarter = new Date();
    lastQuarter.setMonth(today.getMonth() - 3);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastQuarter.toISOString().split('T')[0]);
    setHasAutoLoaded(false);

    // Fetch sites list (and confirm auth)
    const init = async () => {
      setLoading(true);
      try {
        const response = await api.post('/reporting/hfs/table', {
          // no dates -> backend returns empty data + sites
          locale: locale || 'en'
        });
        if (response.data?.sites) {
          setSites(response.data.sites || []);
        }
      } catch (error) {
        console.error('Error initializing HFS export:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [locale]);

  const fetchHfsData = useCallback(async (params) => {
    const response = await api.post('/reporting/hfs/table', params);
    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to fetch HFS data');
    }
    return response.data.data || [];
  }, []);

  const handleFilter = async () => {
    if (!startDate || !endDate) {
      setFilterError(t(locale, 'admin.common.pleaseSelectBothDates'));
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFilterError(t(locale, 'admin.common.startDateBeforeEndDate'));
      return;
    }

    setFilterLoading(true);
    setFilterError('');
    setIsFiltered(false);

    const params = {
        startdate: startDate,
        enddate: endDate,
        sites: selectedSites.length > 0 ? selectedSites : ['*'],
        locale: locale || 'en'
      };

    try {
      const data = await fetchHfsData(params);
      setFilteredData(data);
        setIsFiltered(true);
      setActiveFilters(params);
      if (data.length === 0) {
          setFilterError(t(locale, 'admin.common.noDataForDateRange'));
      } else {
        setFilterError('');
      }
    } catch (error) {
      console.error('HFS filter error:', error);
      setFilterError(error.response?.data?.error || error.message || t(locale, 'admin.common.failedToFilterData'));
    } finally {
      setFilterLoading(false);
    }
  };

  // Auto-load default range on first visit so the latest results appear immediately.
  useEffect(() => {
    if (hasAutoLoaded || !startDate || !endDate) return;
    setHasAutoLoaded(true);
    void handleFilter();
  }, [hasAutoLoaded, startDate, endDate]);

  useRealtimeReporting({
    enabled: isFiltered && !!activeFilters && !filterLoading,
    intervalMs: REALTIME_INTERVAL_MS,
    fetcher: async () => fetchHfsData(activeFilters),
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
      console.error('Realtime HFS refresh failed:', error);
    },
  });

  const handleExport = () => {
    if (!isFiltered || filteredData.length === 0) {
      alert(t(locale, 'admin.common.noDataToExport'));
      return;
    }

    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(header => {
          const value = row[header] ?? '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hfs-report-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  const displayData = isFiltered ? filteredData : [];

  return (
    <div className="page-stack">
      <PageToolbar>
        <Button
          onClick={handleExport}
          variant="default"
          className="gap-2"
          disabled={displayData.length === 0 || filterLoading}
        >
          <FaFileExport className="h-4 w-4" />
          {t(locale, 'admin.common.exportCSV')}
        </Button>
      </PageToolbar>

      <Card className="mb-2 border-primary/20 bg-card/95 shadow-sm backdrop-blur-sm">
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
              <Label htmlFor="startdate" className="text-sm font-semibold text-foreground">
                {t(locale, 'admin.common.startDate')}
              </Label>
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
              <Label htmlFor="enddate" className="text-sm font-semibold text-foreground">
                {t(locale, 'admin.common.endDate')}
              </Label>
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
              <Label htmlFor="sites" className="text-sm font-semibold text-foreground">
                {t(locale, 'admin.common.sites')}
              </Label>
              <Select
                value={selectedSites.length > 0 ? selectedSites[0] : '*'}
                onValueChange={(value) => {
                  setSelectedSites(value === '*' ? ['*'] : [value]);
                  setFilterError('');
                  setIsFiltered(false);
                }}
                disabled={filterLoading}
              >
                <SelectTrigger className="w-full border-primary/20 hover:border-primary/40 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder={t(locale, 'admin.common.selectSites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">{t(locale, 'admin.common.allSites')}</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleFilter}
                variant="default"
                size="sm"
                disabled={filterLoading}
                className="w-full gap-2 shadow-md hover:shadow-lg transition-shadow sm:w-auto"
              >
                {filterLoading ? (
                  <>
                    <FaSpinner className="h-4 w-4 animate-spin" />
                    {t(locale, 'admin.common.loading')}
                  </>
                ) : (
                  <>
                    <FaFilter className="h-4 w-4" />
                    {t(locale, 'admin.common.applyFilters')}
                  </>
                )}
              </Button>
            </div>
          </div>
          {filterError && (
            <p className="text-sm text-destructive mt-3 font-medium">{filterError}</p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaHospital className="h-5 w-5" />
            {t(locale, 'admin.hfs.data')}
          </CardTitle>
          <CardDescription>
            {t(locale, 'admin.hfs.exportDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || filterLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !isFiltered ? (
            <EmptyState
              title={t(locale, 'admin.common.noFiltersApplied')}
              description={t(locale, 'admin.common.selectDateRangeApplyFilters')}
            />
          ) : displayData.length === 0 ? (
            <EmptyState
              title={t(locale, 'admin.common.noDataFound')}
              description={t(locale, 'admin.common.noDataForDateRange')}
            />
          ) : (
            <>
              <MobileScrollHint />
              <VirtualScrollTable
                rows={displayData}
                rowHeight={44}
                maxHeight="min(65vh, 520px)"
                containerClassName="rounded-md border"
                getRowKey={(row, idx) => row.id ?? row.START ?? row.start ?? idx}
                header={
                  <thead className="[&_tr]:border-b bg-muted/30 sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-sm">
                    <tr>
                      {['ACKNOWLEDGE', 'START', 'Site', 'DEPT', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'].map((col) => (
                        <th key={col} className={reportThClass(col)}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                }
                renderRow={(row, idx, key) => {
                  const isAgree = getAcknowledgeAgree(row);
                  return (
                    <TableRow key={key} className="hover:bg-muted/50 border-b">
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
                      <TableCell>
                        <Badge variant="secondary">{row.DEPT ?? '-'}</Badge>
                      </TableCell>
                      <TableCell>{row.E1 ?? '-'}</TableCell>
                      <TableCell>{row.E2 ?? '-'}</TableCell>
                      <TableCell>{row.E3 ?? '-'}</TableCell>
                      <TableCell>{row.E4 ?? '-'}</TableCell>
                      <TableCell>{row.E5 ?? '-'}</TableCell>
                      <TableCell>{row.E6 ?? '-'}</TableCell>
                    </TableRow>
                  );
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

