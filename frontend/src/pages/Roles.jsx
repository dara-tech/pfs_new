import { useEffect, useState } from 'react';
import { useRolesStore } from '../lib/stores/rolesStore';
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
import { FaPlus, FaBriefcase } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import TableRowActions from '../components/TableRowActions';
import AdminListCard from '../components/admin/AdminListCard';
import ResponsiveTableShell from '../components/admin/ResponsiveTableShell';
import { buildListMeta } from '../lib/listMeta';
import { useTablePagination } from '../hooks/use-table-pagination';

export default function Roles() {
  const { locale } = useUIStore();
  const { roles, loading, fetchRoles, createRole, updateRole, deleteRole } = useRolesStore();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const {
    paginatedItems: paginatedRoles,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(roles, 10, [roles.length]);

  const rolesListMeta = buildListMeta(locale, {
    total: roles.length,
    rangeFrom,
    rangeTo,
    safePage,
    totalPages,
    emptyLabel: t(locale, 'admin.roles.allRoles'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
      } else {
        await createRole(formData);
      }
      setOpen(false);
      setEditingRole(null);
      setFormData({ name: '' });
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(error.message || 'Failed to save role');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({ name: role.name });
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setRoleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRole(roleToDelete);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert(error.message || 'Failed to delete role');
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleNew = () => {
    setEditingRole(null);
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
              {t(locale, 'admin.roles.addRole')}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-full max-w-md mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingRole
                  ? t(locale, 'admin.roles.editRole')
                  : t(locale, 'admin.roles.addRole')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t(locale, 'admin.roles.formDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t(locale, 'admin.roles.roleName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., admin"
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
                  {editingRole
                    ? t(locale, 'admin.common.update')
                    : t(locale, 'admin.common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageToolbar>

      <DataTableSection meta={rolesListMeta} scroll={false}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            title={t(locale, 'admin.roles.noRoles')}
            description={t(locale, 'admin.roles.noRolesDescription')}
          />
        ) : (
          <ResponsiveTableShell
            mobile={paginatedRoles.map((role) => (
              <AdminListCard
                key={role.id}
                title={
                  <span className="inline-flex items-center gap-2 capitalize">
                    <FaBriefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                    {role.name}
                  </span>
                }
                badge={
                  <Badge variant="secondary" className="text-[10px]">
                    {t(locale, 'admin.common.active')}
                  </Badge>
                }
                meta={<span>ID {role.id}</span>}
                actions={
                  <TableRowActions
                    onEdit={() => handleEdit(role)}
                    onDelete={() => handleDeleteClick(role.id)}
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
                      <TableHead className="min-w-[200px]">{t(locale, 'admin.roles.roleName')}</TableHead>
                      <TableHead className="min-w-[100px]">{t(locale, 'admin.users.status')}</TableHead>
                      <TableHead className="text-right w-[88px]">{t(locale, 'admin.common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRoles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{role.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FaBriefcase className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium capitalize truncate">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t(locale, 'admin.common.active')}</Badge>
                        </TableCell>
                        <TableCell>
                          <TableRowActions
                            onEdit={() => handleEdit(role)}
                            onDelete={() => handleDeleteClick(role.id)}
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
                total={roles.length}
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
              {t(locale, 'admin.roles.areYouSureDelete')}
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
