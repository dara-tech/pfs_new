import { useEffect, useState } from 'react';
import { useSitesStore } from '../lib/stores/sitesStore';
import { useUIStore } from '../lib/stores/uiStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import EmptyState from '../components/EmptyState';
import { FaPlus, FaHospital, FaMapMarkerAlt } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import TableRowActions from '../components/TableRowActions';
import AdminListCard from '../components/admin/AdminListCard';
import ResponsiveTableShell from '../components/admin/ResponsiveTableShell';
import { buildListMeta } from '../lib/listMeta';
import { useTablePagination } from '../hooks/use-table-pagination';

export default function Sites() {
  const { locale } = useUIStore();
  const { sites, loading, fetchSites, createSite, updateSite, deleteSite } = useSitesStore();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    province: ''
  });

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const {
    paginatedItems: paginatedSites,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(sites, 10, [sites.length]);

  const sitesListMeta = buildListMeta(locale, {
    total: sites.length,
    rangeFrom,
    rangeTo,
    safePage,
    totalPages,
    emptyLabel: t(locale, 'admin.sites.allSites'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSite) {
        await updateSite(editingSite.id, formData);
      } else {
        await createSite(formData);
      }
      setOpen(false);
      setEditingSite(null);
      setFormData({ name: '', code: '', province: '' });
      fetchSites();
    } catch (error) {
      console.error('Error saving site:', error);
      alert(error.message || 'Failed to save site');
    }
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormData({ 
      name: site.name || '', 
      code: site.code || '', 
      province: site.province || '' 
    });
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setSiteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;
    
    try {
      await deleteSite(siteToDelete);
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      fetchSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      alert(error.message || 'Failed to delete site');
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    }
  };

  const handleNew = () => {
    setEditingSite(null);
    setFormData({ name: '', code: '', province: '' });
    setOpen(true);
  };

  return (
    <div className="page-stack">
      <PageToolbar>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNew} className="gap-1.5">
                <FaPlus className="h-3.5 w-3.5" />
                {t(locale, 'admin.sites.addSite')}
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-full max-w-2xl mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingSite
                  ? t(locale, 'admin.sites.editSite')
                  : t(locale, 'admin.sites.addSite')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t(locale, 'admin.sites.formDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t(locale, 'admin.sites.siteName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Health Center 1"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">{t(locale, 'admin.sites.code')}</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., HC001"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t(locale, 'admin.sites.province')}</Label>
                  <Input
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="e.g., Phnom Penh"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  {t(locale, 'admin.common.cancel')}
                </Button>
                <Button 
                  type="submit"
                  size="sm"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {editingSite
                    ? t(locale, 'admin.common.update')
                    : t(locale, 'admin.common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageToolbar>

      <DataTableSection meta={sitesListMeta} scroll={false}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sites.length === 0 ? (
            <EmptyState
              title={t(locale, 'admin.sites.noSites')}
              description={t(locale, 'admin.sites.noSitesDescription')}
            />
          ) : (
            <ResponsiveTableShell
              mobile={paginatedSites.map((site) => (
                <AdminListCard
                  key={site.id}
                  title={site.name || '-'}
                  subtitle={site.code ? `Code: ${site.code}` : undefined}
                  badge={<Badge variant="secondary" className="text-[10px]">Active</Badge>}
                  meta={
                    <>
                      <span>ID {site.id}</span>
                      <span className="inline-flex items-center gap-1">
                        <FaMapMarkerAlt className="h-3 w-3" />
                        {site.province || 'Unknown'}
                      </span>
                    </>
                  }
                  actions={
                    <TableRowActions
                      onEdit={() => handleEdit(site)}
                      onDelete={() => handleDeleteClick(site.id)}
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
                        <TableHead>ID</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[88px]">{t(locale, 'admin.common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSites.map((site) => (
                        <TableRow key={site.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{site.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FaHospital className="h-4 w-4 text-primary" />
                              <span className="font-medium">{site.name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{site.code || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <FaMapMarkerAlt className="h-3 w-3" />
                              <span>{site.province || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <TableRowActions
                              onEdit={() => handleEdit(site)}
                              onDelete={() => handleDeleteClick(site.id)}
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
                  total={sites.length}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full mx-2 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">{t(locale, 'admin.common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t(locale, 'admin.sites.areYouSureDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t(locale, 'admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {t(locale, 'admin.common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
