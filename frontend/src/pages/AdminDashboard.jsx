import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { FaUsers, FaBriefcase, FaShieldAlt, FaHospital, FaChartLine } from 'react-icons/fa';
import { useUIStore } from '../lib/stores/uiStore';
import { useUsersStore } from '../lib/stores/usersStore';
import { useRolesStore } from '../lib/stores/rolesStore';
import { usePermissionsStore } from '../lib/stores/permissionsStore';
import { useSitesStore } from '../lib/stores/sitesStore';
import { t } from '../lib/translations/index';

export default function AdminDashboard() {
  const { locale } = useUIStore();
  const navigate = useNavigate();
  const { users, fetchUsers } = useUsersStore();
  const { roles, fetchRoles } = useRolesStore();
  const { permissions, fetchPermissions } = usePermissionsStore();
  const { sites, fetchSites } = useSitesStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUsers(),
          fetchRoles(),
          fetchPermissions(),
          fetchSites()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchUsers, fetchRoles, fetchPermissions, fetchSites]);
  
  return (
    <div className="page-stack page-stack-lg">
      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t(locale, 'admin.dashboard.totalUsers')}</CardTitle>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaUsers className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{users.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{t(locale, 'admin.dashboard.activeUserAccounts')}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t(locale, 'admin.dashboard.roles')}</CardTitle>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaBriefcase className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{roles.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{t(locale, 'admin.dashboard.systemRolesDefined')}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t(locale, 'admin.dashboard.permissions')}</CardTitle>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaShieldAlt className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{permissions.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{t(locale, 'admin.dashboard.accessPermissions')}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t(locale, 'admin.dashboard.sites')}</CardTitle>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaHospital className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <Skeleton className="h-7 sm:h-9 w-12 sm:w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{sites.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{t(locale, 'admin.dashboard.healthFacilitySites')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t(locale, 'admin.dashboard.systemHealth')}</CardTitle>
            <CardDescription className="text-sm">{t(locale, 'admin.dashboard.systemStatus')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm">{t(locale, 'admin.dashboard.database')}</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {t(locale, 'admin.dashboard.connected')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm">{t(locale, 'admin.dashboard.apiServer')}</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {t(locale, 'admin.dashboard.online')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm">{t(locale, 'admin.dashboard.cache')}</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {t(locale, 'admin.dashboard.active')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t(locale, 'admin.dashboard.quickActions')}</CardTitle>
            <CardDescription className="text-sm">{t(locale, 'admin.dashboard.commonTasks')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                className="h-auto flex-col items-start p-3 sm:p-4 min-h-[80px] touch-manipulation"
                onClick={() => navigate('/users')}
              >
                <FaUsers className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-left">{t(locale, 'admin.dashboard.manageUsers')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col items-start p-3 sm:p-4 min-h-[80px] touch-manipulation"
                onClick={() => navigate('/permissions')}
              >
                <FaShieldAlt className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-left">{t(locale, 'admin.dashboard.permissions')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col items-start p-3 sm:p-4 min-h-[80px] touch-manipulation"
                onClick={() => navigate('/roles')}
              >
                <FaBriefcase className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-left">{t(locale, 'admin.dashboard.roles')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col items-start p-3 sm:p-4 min-h-[80px] touch-manipulation"
                onClick={() => navigate('/sites')}
              >
                <FaHospital className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-left">{t(locale, 'admin.dashboard.sites')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

