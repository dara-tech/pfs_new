import { useEffect, useState } from 'react';
import { usePermissionsStore } from '../lib/stores/permissionsStore';
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
import { FaPlus, FaShieldAlt } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import TableRowActions from '../components/TableRowActions';
import AdminListCard from '../components/admin/AdminListCard';
import ResponsiveTableShell from '../components/admin/ResponsiveTableShell';
import { buildListMeta } from '../lib/listMeta';
import { useTablePagination } from '../hooks/use-table-pagination';

export default function Permissions() {
  const { locale } = useUIStore();
  const { permissions, loading, fetchPermissions, createPermission, updatePermission, deletePermission } = usePermissionsStore();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const {
    paginatedItems: paginatedPermissions,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(permissions, 10, [permissions.length]);

  const permissionsListMeta = buildListMeta(locale, {
    total: permissions.length,
    rangeFrom,
    rangeTo,
    safePage,
    totalPages,
    emptyLabel: t(locale, 'admin.permissions.allPermissions'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPermission) {
        await updatePermission(editingPermission.id, formData);
      } else {
        await createPermission(formData);
      }
      setOpen(false);
      setEditingPermission(null);
      setFormData({ name: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error saving permission:', error);
      alert(error.message || 'Failed to save permission');
    }
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setFormData({ name: permission.name });
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setPermissionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!permissionToDelete) return;

    try {
      await deletePermission(permissionToDelete);
      setDeleteDialogOpen(false);
      setPermissionToDelete(null);
      fetchPermissions();
    } catch (error) {
      console.error('Error deleting permission:', error);
      alert(error.message || 'Failed to delete permission');
      setDeleteDialogOpen(false);
      setPermissionToDelete(null);
    }
  };

  const handleNew = () => {
    setEditingPermission(null);
    setFormData({ name: '' });
    setOpen(true);
  };

  return (
    <div className="page-stack">
      <PageToolbar>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleNew} className="gap-1.5">
              <FaPlus className="h-3.5 w-3.5" />
              {t(locale, 'admin.permissions.addPermission')}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-full max-w-md mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingPermission
                  ? t(locale, 'admin.permissions.editPermission')
                  : t(locale, 'admin.permissions.addPermission')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t(locale, 'admin.permissions.formDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t(locale, 'admin.permissions.permissionName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., users_manage"
                  required
                />
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
                <Button type="submit" size="sm" className="w-full sm:w-auto order-1 sm:order-2">
                  {editingPermission
                    ? t(locale, 'admin.common.update')
                    : t(locale, 'admin.common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageToolbar>

      <DataTableSection meta={permissionsListMeta} scroll={false}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : permissions.length === 0 ? (
          <EmptyState
            title={t(locale, 'admin.permissions.noPermissions')}
            description={t(locale, 'admin.permissions.noPermissionsDescription')}
          />
        ) : (
          <ResponsiveTableShell
            mobile={paginatedPermissions.map((permission) => (
              <AdminListCard
                key={permission.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <FaShieldAlt className="h-3.5 w-3.5 text-primary shrink-0" />
                    {permission.name}
                  </span>
                }
                badge={
                  <Badge variant="secondary" className="text-[10px]">
                    {t(locale, 'admin.common.active')}
                  </Badge>
                }
                meta={<span>ID {permission.id}</span>}
                actions={
                  <TableRowActions
                    onEdit={() => handleEdit(permission)}
                    onDelete={() => handleDeleteClick(permission.id)}
                    editTitle={t(locale, 'admin.users.edit')}
                    deleteTitle={t(locale, 'admin.common.delete')}
                  />
                }
              />
            ))}
            desktop={
              <div className="admin-scroll-x rounded-lg">
                <Table containerClassName="min-w-[32rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[60px]">ID</TableHead>
                      <TableHead className="min-w-[200px]">{t(locale, 'admin.permissions.permissionName')}</TableHead>
                      <TableHead className="min-w-[100px]">{t(locale, 'admin.users.status')}</TableHead>
                      <TableHead className="text-right w-[88px]">{t(locale, 'admin.common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPermissions.map((permission) => (
                      <TableRow key={permission.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{permission.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FaShieldAlt className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{permission.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t(locale, 'admin.common.active')}</Badge>
                        </TableCell>
                        <TableCell>
                          <TableRowActions
                            onEdit={() => handleEdit(permission)}
                            onDelete={() => handleDeleteClick(permission.id)}
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
                total={permissions.length}
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
              {t(locale, 'admin.permissions.areYouSureDelete')}
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
