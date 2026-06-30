import { useEffect, useState } from 'react';
import { useUIStore } from '../lib/stores/uiStore';
import { useSitesStore } from '../lib/stores/sitesStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import EmptyState from '../components/EmptyState';
import { FaPlus, FaTablet, FaEdit, FaTrash, FaMobile, FaLaptop, FaCheckCircle, FaTimesCircle, FaWrench } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import api from '../lib/api';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import TableRowActions from '../components/TableRowActions';
import AdminListCard from '../components/admin/AdminListCard';
import ResponsiveTableShell from '../components/admin/ResponsiveTableShell';
import { buildListMeta } from '../lib/listMeta';
import { useTablePagination } from '../hooks/use-table-pagination';

export default function Devices() {
  const { locale } = useUIStore();
  const { sites, fetchSites } = useSitesStore();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    device_id: '',
    device_type: 'tablet',
    platform: 'android',
    site_id: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    fetchDevices();
    fetchSites();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/devices');
      setDevices(response.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await api.put(`/admin/devices/${editingDevice.id}`, formData);
      } else {
        await api.post('/admin/devices', formData);
      }
      setOpen(false);
      setEditingDevice(null);
      setFormData({
        name: '',
        device_id: '',
        device_type: 'tablet',
        platform: 'android',
        site_id: '',
        status: 'active',
        notes: ''
      });
      fetchDevices();
    } catch (error) {
      console.error('Error saving device:', error);
      alert(error.response?.data?.error || error.message || 'Failed to save device');
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name || '',
      device_id: device.device_id || '',
      device_type: device.device_type || 'tablet',
      platform: device.platform || 'android',
      site_id: device.site_id || '',
      status: device.status || 'active',
      notes: device.notes || ''
    });
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeviceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    
    try {
      await api.delete(`/admin/devices/${deviceToDelete}`);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      alert(error.response?.data?.error || error.message || 'Failed to delete device');
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const handleNew = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      device_id: '',
      device_type: 'tablet',
      platform: 'android',
      site_id: '',
      status: 'active',
      notes: ''
    });
    setOpen(true);
  };

  const {
    paginatedItems: paginatedDevices,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(devices, 10, [devices.length]);

  const devicesListMeta = buildListMeta(locale, {
    total: devices.length,
    rangeFrom,
    rangeTo,
    safePage,
    totalPages,
    emptyLabel: t(locale, 'admin.devices.deviceList') || 'Devices',
  });

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'tablet':
        return <FaTablet className="h-4 w-4" />;
      case 'phone':
        return <FaMobile className="h-4 w-4" />;
      default:
        return <FaLaptop className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="gap-1"><FaCheckCircle className="h-3 w-3" /> {t(locale, 'admin.devices.statusActive') || 'Active'}</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="gap-1"><FaTimesCircle className="h-3 w-3" /> {t(locale, 'admin.devices.statusInactive') || 'Inactive'}</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="gap-1"><FaWrench className="h-3 w-3" /> {t(locale, 'admin.devices.statusMaintenance') || 'Maintenance'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="page-stack">
      <PageToolbar>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNew} className="gap-1.5">
                <FaPlus className="h-4 w-4" />
                {t(locale, 'admin.devices.addDevice') || 'Add Device'}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDevice 
                  ? (t(locale, 'admin.devices.editDevice') || 'Edit Device')
                  : (t(locale, 'admin.devices.addDevice') || 'Add Device')
                }
              </DialogTitle>
              <DialogDescription>
                {t(locale, 'admin.devices.deviceFormDescription') || 'Register a new tablet or device'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t(locale, 'admin.devices.deviceName') || 'Device Name'} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t(locale, 'admin.devices.deviceNamePlaceholder') || 'e.g., Tablet 01'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_id">{t(locale, 'admin.devices.deviceId') || 'Device ID'}</Label>
                <Input
                  id="device_id"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  placeholder={t(locale, 'admin.devices.deviceIdPlaceholder') || 'Serial number or IMEI (optional)'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device_type">{t(locale, 'admin.devices.deviceType') || 'Device Type'}</Label>
                  <Select value={formData.device_type} onValueChange={(value) => setFormData({ ...formData, device_type: value })}>
                    <SelectTrigger id="device_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tablet">{t(locale, 'admin.devices.typeTablet') || 'Tablet'}</SelectItem>
                      <SelectItem value="phone">{t(locale, 'admin.devices.typePhone') || 'Phone'}</SelectItem>
                      <SelectItem value="other">{t(locale, 'admin.devices.typeOther') || 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">{t(locale, 'admin.devices.platform') || 'Platform'}</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="other">{t(locale, 'admin.devices.typeOther') || 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_id">{t(locale, 'admin.devices.site') || 'Site'}</Label>
                <Select value={formData.site_id} onValueChange={(value) => setFormData({ ...formData, site_id: value || '' })}>
                  <SelectTrigger id="site_id">
                    <SelectValue placeholder={t(locale, 'admin.devices.selectSite') || 'Select site (optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t(locale, 'admin.common.all') || 'All'}</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.name || site.sitename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t(locale, 'admin.devices.status') || 'Status'}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t(locale, 'admin.devices.statusActive') || 'Active'}</SelectItem>
                    <SelectItem value="inactive">{t(locale, 'admin.devices.statusInactive') || 'Inactive'}</SelectItem>
                    <SelectItem value="maintenance">{t(locale, 'admin.devices.statusMaintenance') || 'Maintenance'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t(locale, 'admin.devices.notes') || 'Notes'}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t(locale, 'admin.devices.notesPlaceholder') || 'Additional notes (optional)'}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t(locale, 'admin.common.cancel') || 'Cancel'}
                </Button>
                <Button type="submit">
                  {editingDevice 
                    ? (t(locale, 'admin.common.update') || 'Update')
                    : (t(locale, 'admin.common.create') || 'Create')
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageToolbar>

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardDescription className="text-sm m-0">
            {t(locale, 'admin.devices.deviceListDescription') || 'Manage all registered tablets and devices'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <DataTableSection meta={devicesListMeta} scroll={false}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <EmptyState
              icon={FaTablet}
              title={t(locale, 'admin.devices.noDevices') || 'No devices found'}
              description={t(locale, 'admin.devices.noDevicesDescription') || 'Get started by adding your first device'}
            />
          ) : (
            <ResponsiveTableShell
              mobile={paginatedDevices.map((device) => (
                <AdminListCard
                  key={device.id}
                  title={
                    <span className="inline-flex items-center gap-2">
                      {getDeviceIcon(device.device_type)}
                      {device.name}
                    </span>
                  }
                  subtitle={device.device_id || undefined}
                  badge={getStatusBadge(device.status)}
                  meta={
                    <>
                      <span className="capitalize">{device.device_type}</span>
                      <span className="capitalize">{device.platform}</span>
                      {device.site_name ? <span>{device.site_name}</span> : null}
                    </>
                  }
                  actions={
                    <TableRowActions
                      onEdit={() => handleEdit(device)}
                      onDelete={() => handleDeleteClick(device.id)}
                      editTitle={t(locale, 'admin.users.edit')}
                      deleteTitle={t(locale, 'admin.common.delete')}
                    />
                  }
                />
              ))}
              desktop={
                <div className="admin-scroll-x rounded-lg">
                  <Table containerClassName="min-w-[40rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t(locale, 'admin.devices.deviceName') || 'Name'}</TableHead>
                        <TableHead>{t(locale, 'admin.devices.deviceId') || 'Device ID'}</TableHead>
                        <TableHead>{t(locale, 'admin.devices.deviceType') || 'Type'}</TableHead>
                        <TableHead>{t(locale, 'admin.devices.platform') || 'Platform'}</TableHead>
                        <TableHead>{t(locale, 'admin.devices.site') || 'Site'}</TableHead>
                        <TableHead>{t(locale, 'admin.devices.status') || 'Status'}</TableHead>
                        <TableHead className="text-right w-[88px]">{t(locale, 'admin.common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDevices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell className="text-muted-foreground">{device.device_id || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(device.device_type)}
                              <span className="capitalize">{device.device_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{device.platform}</TableCell>
                          <TableCell>{device.site_name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(device.status)}</TableCell>
                          <TableCell>
                            <TableRowActions
                              onEdit={() => handleEdit(device)}
                              onDelete={() => handleDeleteClick(device.id)}
                              editTitle={t(locale, 'admin.users.edit')}
                              deleteTitle={t(locale, 'admin.common.delete')}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              }
              pagination={
                <TablePagination
                  locale={locale}
                  total={devices.length}
                  safePage={safePage}
                  totalPages={totalPages}
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
              }
            />
          )}
          </DataTableSection>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(locale, 'admin.devices.deleteConfirm') || 'Delete Device?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(locale, 'admin.devices.deleteConfirmDescription') || 'Are you sure you want to delete this device? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t(locale, 'admin.common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t(locale, 'admin.common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
