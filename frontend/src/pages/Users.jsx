import { useEffect, useMemo, useState } from 'react';
import { useUsersStore } from '../lib/stores/usersStore';
import { useSitesStore } from '../lib/stores/sitesStore';
import { useUIStore } from '../lib/stores/uiStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { FaPlus, FaTrash, FaEdit, FaKey, FaUser, FaEnvelope, FaUsers, FaBuilding, FaGlobe, FaCopy, FaCheck, FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import AdminListCard from '../components/admin/AdminListCard';
import ResponsiveTableShell from '../components/admin/ResponsiveTableShell';
import { buildListMeta } from '../lib/listMeta';
import { useTablePagination } from '../hooks/use-table-pagination';

export default function Users() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser, resetPassword, massDelete, selectedUsers, setSelectedUsers, toggleSelection } = useUsersStore();
  const { sites, fetchSites } = useSitesStore();
  const { locale } = useUIStore();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [massDeleteDialogOpen, setMassDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordSuccessDialogOpen, setResetPasswordSuccessDialogOpen] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', siteIds: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSites();
  }, [fetchUsers, fetchSites]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => users.filter(user => {
    // Search filter
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Site filter
    const matchesSite = filterSite === 'all' || 
      (filterSite === 'allSites' && user.hasAllSites) ||
      (filterSite === 'noSites' && (!user.sites || user.sites.length === 0)) ||
      (filterSite !== 'all' && filterSite !== 'allSites' && filterSite !== 'noSites' && 
       user.sites && user.sites.includes(filterSite));
    
    // Role filter
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesSite && matchesRole;
  }), [users, searchQuery, filterSite, filterRole]);

  const {
    paginatedItems: paginatedUsers,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(filteredUsers, 10, [searchQuery, filterSite, filterRole]);

  const usersListMeta = buildListMeta(locale, {
    total: filteredUsers.length,
    rangeFrom,
    rangeTo,
    safePage,
    totalPages,
    emptyLabel: t(locale, 'admin.users.viewAndManage'),
  });

  // Get unique roles from users
  const availableRoles = [...new Set(users.map(u => u.role).filter(Boolean))];
  
  // Get unique sites from all users
  const availableSitesForFilter = [...new Set(
    users.flatMap(u => u.sites || []).filter(Boolean)
  )].sort();

  const handleDeleteClick = (id) => {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser(userToDelete);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleMassDeleteClick = () => {
    if (selectedUsers.length === 0) return;
    setMassDeleteDialogOpen(true);
  };

  const handleMassDeleteConfirm = async () => {
    try {
      await massDelete(selectedUsers);
      setSelectedUsers([]);
      setMassDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      alert(error.message || 'Failed to delete users');
      setMassDeleteDialogOpen(false);
    }
  };

  const handleResetPasswordClick = (id) => {
    setUserToReset(id);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToReset) return;
    
    try {
      const response = await resetPassword(userToReset);
      setResetPasswordDialogOpen(false);
      const defaultPassword = response?.defaultPassword || 'password';
      setResetPasswordResult({ defaultPassword });
      setResetPasswordSuccessDialogOpen(true);
      setUserToReset(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetPasswordDialogOpen(false);
      setUserToReset(null);
      // Show error in a better way
      const errorMessage = error.response?.data?.error || error.message || t(locale, 'admin.users.resetPasswordFailed');
      setResetPasswordResult({ error: errorMessage });
      setResetPasswordSuccessDialogOpen(true);
    }
  };

  const handleEdit = async (user) => {
    setEditingUser(user);
    // Ensure sites are loaded
    let currentSites = sites;
    if (currentSites.length === 0) {
      await fetchSites();
      // Wait a moment for state to update, then get fresh sites
      await new Promise(resolve => setTimeout(resolve, 50));
      currentSites = useSitesStore.getState().sites;
    }
    // Get site IDs from user's sites by matching site names
    const userSiteIds = currentSites
      .filter(site => user.sites && user.sites.includes(site.name))
      .map(site => site.id);
    setFormData({ 
      name: user.name || '', 
      email: user.email || '', 
      password: '',
      siteIds: userSiteIds
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', siteIds: [] });
    setOpen(true);
  };

  const toggleSiteSelection = (siteId) => {
    setFormData(prev => ({
      ...prev,
      siteIds: prev.siteIds.includes(siteId)
        ? prev.siteIds.filter(id => id !== siteId)
        : [...prev.siteIds, siteId]
    }));
  };

  const selectAllSites = () => {
    setFormData(prev => ({
      ...prev,
      siteIds: sites.map(site => site.id)
    }));
  };

  const deselectAllSites = () => {
    setFormData(prev => ({
      ...prev,
      siteIds: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await createUser(formData);
      }
      setOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', siteIds: [] });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.message || 'Failed to save user');
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  return (
    <div className="page-stack">
      <PageToolbar>
            {selectedUsers.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMassDeleteClick}
                className="gap-1.5"
              >
                <FaTrash className="h-3.5 w-3.5" />
                {t(locale, 'admin.users.delete')} ({selectedUsers.length})
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleNew} className="gap-1.5">
                  <FaPlus className="h-3.5 w-3.5" />
                  {t(locale, 'admin.users.addUser')}
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] mx-2 sm:mx-0">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingUser
                    ? t(locale, 'admin.users.editUser')
                    : t(locale, 'admin.users.createNewUser')}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingUser
                    ? t(locale, 'admin.users.editUserDescription')
                    : t(locale, 'admin.users.addNewUserDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">{t(locale, 'admin.users.fullName')}</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe"
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">{t(locale, 'admin.users.emailAddress')}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@example.com"
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">{t(locale, 'admin.users.password')}</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    required={!editingUser}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingUser 
                      ? t(locale, 'admin.users.passwordHintEdit')
                      : t(locale, 'admin.users.passwordHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sites" className="text-sm sm:text-base">{t(locale, 'admin.users.assignSites')}</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllSites}
                        className="text-xs h-7"
                      >
                        {t(locale, 'admin.users.selectAll')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllSites}
                        className="text-xs h-7"
                      >
                        {t(locale, 'admin.users.deselectAll')}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-3">
                    <div className="space-y-2">
                      {sites.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t(locale, 'admin.users.noSitesAvailable')}
                        </p>
                      ) : (
                        sites.map((site) => (
                          <div
                            key={site.id}
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleSiteSelection(site.id)}
                          >
                            <Checkbox
                              checked={formData.siteIds.includes(site.id)}
                              onCheckedChange={() => toggleSiteSelection(site.id)}
                              className="touch-manipulation"
                            />
                            <Label className="flex-1 cursor-pointer text-sm">
                              <div className="font-medium">{site.name}</div>
                              {site.code && (
                                <div className="text-xs text-muted-foreground">Code: {site.code}</div>
                              )}
                              {site.province && (
                                <div className="text-xs text-muted-foreground">{site.province}</div>
                              )}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {formData.siteIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t(locale, 'admin.users.selectedSitesCount', { count: formData.siteIds.length })}
                    </p>
                  )}
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
                    {editingUser
                      ? t(locale, 'admin.common.update')
                      : t(locale, 'admin.users.createUser')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
      </PageToolbar>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t(locale, 'admin.users.searchUsers')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-8 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <FaTimes className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 shrink-0"
              >
                <FaFilter className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, 'admin.users.filters')}</span>
                {(filterSite !== 'all' || filterRole !== 'all') && (
                  <Badge variant="secondary" className="ml-1">
                    {[filterSite !== 'all' ? 1 : 0, filterRole !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </Badge>
                )}
              </Button>

              {/* Clear Filters */}
              {(filterSite !== 'all' || filterRole !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterSite('all');
                    setFilterRole('all');
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <FaTimes className="h-3 w-3" />
                  <span className="hidden sm:inline">{t(locale, 'admin.users.clearFilters')}</span>
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t(locale, 'admin.users.filterBySite')}</Label>
                  <Select value={filterSite} onValueChange={setFilterSite}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(locale, 'admin.users.allSites')}</SelectItem>
                      <SelectItem value="allSites">{t(locale, 'admin.users.hasAllSites')}</SelectItem>
                      <SelectItem value="noSites">{t(locale, 'admin.users.noSites')}</SelectItem>
                      {availableSitesForFilter.map(site => (
                        <SelectItem key={site} value={site}>{site}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t(locale, 'admin.users.filterByRole')}</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t(locale, 'admin.users.allRoles')}</SelectItem>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t(locale, 'admin.users.totalUsers')}</CardTitle>
            <FaUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {searchQuery || filterSite !== 'all' || filterRole !== 'all' ? filteredUsers.length : users.length}
              {(searchQuery || filterSite !== 'all' || filterRole !== 'all') && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  / {users.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(searchQuery || filterSite !== 'all' || filterRole !== 'all') 
                ? t(locale, 'admin.users.filteredResults')
                : t(locale, 'admin.users.activeAccounts')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t(locale, 'admin.users.selected')}</CardTitle>
            <Checkbox className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{selectedUsers.length}</div>
            <p className="text-xs text-muted-foreground">{t(locale, 'admin.users.usersSelected')}</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t(locale, 'admin.users.status')}</CardTitle>
            <Badge variant="secondary">{t(locale, 'admin.common.active')}</Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">{t(locale, 'admin.users.systemOperational')}</p>
          </CardContent>
        </Card>
      </div>

      <DataTableSection meta={usersListMeta} scroll={false}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              title={t(locale, 'admin.users.noUsersFound')}
              description={
                searchQuery || filterSite !== 'all' || filterRole !== 'all'
                  ? t(locale, 'admin.users.noUsersMatchFilters')
                  : t(locale, 'admin.users.getStartedDescription')
              }
              action={
                searchQuery || filterSite !== 'all' || filterRole !== 'all'
                  ? () => {
                      setSearchQuery('');
                      setFilterSite('all');
                      setFilterRole('all');
                    }
                  : () => setOpen(true)
              }
              actionLabel={
                searchQuery || filterSite !== 'all' || filterRole !== 'all'
                  ? t(locale, 'admin.users.clearFilters')
                  : t(locale, 'admin.users.createUser')
              }
            />
          ) : (
            <ResponsiveTableShell
              mobile={paginatedUsers.map((user) => (
                <AdminListCard
                  key={user.id}
                  title={user.name || 'Unknown'}
                  subtitle={user.email}
                  badge={
                    <Badge variant="secondary" className="text-[10px]">
                      {t(locale, 'admin.common.active')}
                    </Badge>
                  }
                  meta={
                    <>
                      <span>ID {user.id}</span>
                      {user.hasAllSites ? (
                        <span>{t(locale, 'admin.users.allSites')}</span>
                      ) : (
                        <span>
                          {(user.siteCount || user.sites?.length || 0)} {t(locale, 'admin.users.sites')}
                        </span>
                      )}
                    </>
                  }
                  actions={
                    <>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleSelection(user.id)}
                        className="mr-2"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(user)}
                        title={t(locale, 'admin.users.edit')}
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleResetPasswordClick(user.id)}
                        title={t(locale, 'admin.users.reset')}
                      >
                        <FaKey className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(user.id)}
                        title={t(locale, 'admin.users.deleteUser')}
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  }
                />
              ))}
              desktop={
                <div className="admin-scroll-x rounded-lg">
                <Table containerClassName="min-w-[48rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 min-w-[48px]">
                        <Checkbox
                          checked={
                            paginatedUsers.length > 0 &&
                            paginatedUsers.every((u) => selectedUsers.includes(u.id))
                          }
                          onCheckedChange={(checked) => {
                            const pageIds = paginatedUsers.map((u) => u.id);
                            if (checked) {
                              setSelectedUsers([...new Set([...selectedUsers, ...pageIds])]);
                            } else {
                              setSelectedUsers(selectedUsers.filter((id) => !pageIds.includes(id)));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="min-w-[200px]">{t(locale, 'admin.users.user')}</TableHead>
                      <TableHead className="min-w-[200px]">{t(locale, 'admin.users.email')}</TableHead>
                      <TableHead className="min-w-[150px]">{t(locale, 'admin.users.siteAccess')}</TableHead>
                      <TableHead className="min-w-[100px]">{t(locale, 'admin.users.status')}</TableHead>
                      <TableHead className="text-right w-[120px]">{t(locale, 'admin.users.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleSelection(user.id)}
                            className="touch-manipulation"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate text-sm sm:text-base">{user.name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <FaEnvelope className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate text-sm sm:text-base">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-0">
                            {user.hasAllSites ? (
                              <Badge variant="default" className="gap-1 text-xs w-fit">
                                <FaGlobe className="h-2.5 w-2.5" />
                                <span>{t(locale, 'admin.users.allSites')}</span>
                              </Badge>
                            ) : user.sites && user.sites.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="gap-1 text-xs w-fit">
                                  <FaBuilding className="h-2.5 w-2.5" />
                                  <span>{user.siteCount || user.sites.length} {t(locale, 'admin.users.sites')}</span>
                                </Badge>
                                <div className="flex flex-wrap gap-1 max-w-[300px]">
                                  {user.sites.slice(0, 3).map((site, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                      {site.length > 20 ? `${site.substring(0, 20)}...` : site}
                                    </Badge>
                                  ))}
                                  {user.sites.length > 3 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                      +{user.sites.length - 3} {t(locale, 'admin.users.more')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs w-fit text-muted-foreground">
                                <FaBuilding className="h-2.5 w-2.5" />
                                <span>{t(locale, 'admin.users.noSites')}</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="hidden sm:inline">{t(locale, 'admin.common.active')}</span>
                            <span className="sm:hidden">Active</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(user)}
                              title={t(locale, 'admin.users.edit')}
                            >
                              <FaEdit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleResetPasswordClick(user.id)}
                              title={t(locale, 'admin.users.reset')}
                            >
                              <FaKey className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(user.id)}
                              title={t(locale, 'admin.users.deleteUser')}
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                  total={filteredUsers.length}
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
            <AlertDialogTitle className="text-lg sm:text-xl">{t(locale, 'admin.common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t(locale, 'admin.users.areYouSureDelete')}
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

      <AlertDialog open={massDeleteDialogOpen} onOpenChange={setMassDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full mx-2 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">{t(locale, 'admin.common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t(locale, 'admin.users.areYouSureDeleteMultiple', { count: selectedUsers.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              onClick={() => setMassDeleteDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t(locale, 'admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMassDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {t(locale, 'admin.common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full mx-2 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">{t(locale, 'admin.users.resetPassword')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t(locale, 'admin.users.areYouSureResetPassword')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel 
              onClick={() => setResetPasswordDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t(locale, 'admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPasswordConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {t(locale, 'admin.users.reset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Success Dialog */}
      <Dialog open={resetPasswordSuccessDialogOpen} onOpenChange={setResetPasswordSuccessDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              {resetPasswordResult?.error ? (
                <>
                  <FaKey className="h-5 w-5 text-destructive" />
                  {t(locale, 'admin.users.resetPasswordFailed')}
                </>
              ) : (
                <>
                  <FaKey className="h-5 w-5 text-green-600" />
                  {t(locale, 'admin.users.passwordResetSuccess')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {resetPasswordResult?.error ? (
                <span className="text-destructive">{resetPasswordResult.error}</span>
              ) : (
                <div className="space-y-3 pt-2">
                  <p>{t(locale, 'admin.users.passwordResetSuccess')}</p>
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">{t(locale, 'admin.users.defaultPassword')}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background border rounded px-3 py-2 text-sm font-mono font-semibold text-primary break-all">
                        {resetPasswordResult?.defaultPassword || 'password'}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(resetPasswordResult?.defaultPassword || 'password');
                        }}
                        className="shrink-0"
                        title={t(locale, 'admin.users.copyPassword')}
                      >
                        <FaCopy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              onClick={() => {
                setResetPasswordSuccessDialogOpen(false);
                setResetPasswordResult(null);
              }}
              className="w-full sm:w-auto"
              size="sm"
            >
              {t(locale, 'admin.common.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
