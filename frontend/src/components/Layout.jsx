import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../lib/stores/uiStore';
import { useAuthStore } from '../lib/store';
import { t } from '../lib/translations/index';
import { getPageTitleKey } from '../config/pageTitles';
import { getDefaultSidebarOpen } from '../lib/layout';
import { cn } from '../lib/utils';
import api from '../lib/api';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import FullscreenToggle from './FullscreenToggle';
import { Button } from './ui/button';
import { SidebarProvider, useSidebar, SidebarInset } from './ui/sidebar';
import { FaBars } from 'react-icons/fa';

function LayoutContent({ children }) {
  const { pathname } = useLocation();
  const { initTheme, initLocale, locale } = useUIStore();
  const [buildId, setBuildId] = useState('');
  const { token, setPermissions, setRoles } = useAuthStore();
  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const titleKey = getPageTitleKey(pathname);
  const pageTitle = titleKey ? t(locale, titleKey) : '';

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  // Initialize theme and locale on mount
  useEffect(() => {
    initTheme();
    initLocale();
  }, [initTheme, initLocale]);

  useEffect(() => {
    setBuildId(document.querySelector('meta[name="psf-build"]')?.content || '');
  }, []);

  // Fetch user permissions on mount if not already set
  useEffect(() => {
    if (token && !useAuthStore.getState().permissions.length) {
      api.get('/auth/me')
        .then(response => {
          if (response.data.permissions) {
            setPermissions(response.data.permissions);
          }
          if (response.data.roles) {
            setRoles(response.data.roles);
          }
        })
        .catch(error => {
          console.error('Failed to fetch user permissions:', error);
        });
    }
  }, [token, setPermissions, setRoles]);

  return (
    <>
      <Sidebar />
      <SidebarInset>
        <div className="flex min-h-svh w-full flex-col bg-background">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-11 items-center gap-1 border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-2 sm:px-3 shadow-sm pt-safe">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden h-8 w-8 shrink-0"
            aria-label="Open menu"
          >
            <FaBars className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {pageTitle ? (
              <h1
                className={cn(
                  'truncate text-sm font-semibold tracking-tight text-foreground',
                  locale === 'kh' && 'font-khmer'
                )}
              >
                {pageTitle}
              </h1>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <LanguageToggle />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <ThemeToggle />
            <div className="h-4 w-px bg-border hidden md:block" />
            <div className="hidden md:contents">
              <FullscreenToggle />
              <div className="h-4 w-px bg-border" />
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{t(locale, 'admin.dashboard.online')}</span>
              {buildId ? (
                <span
                  className="text-[10px] text-muted-foreground/80 font-mono"
                  title={`Build ${buildId}`}
                >
                  v{buildId.slice(0, 8)}
                </span>
              ) : null}
            </div>
          </div>
        </header>

          {/* Page content */}
          <main className="flex-1 min-w-0 overflow-x-hidden p-2 sm:p-3 md:p-4 pb-safe">
            {children}
          </main>
        </div>
      </SidebarInset>
    </>
  );
}

export default function Layout({ children }) {
  const [defaultOpen] = useState(getDefaultSidebarOpen);
  const { locale } = useUIStore();
  const sidebarWidth = locale === 'kh' ? '17rem' : '15rem';

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ '--sidebar-width': sidebarWidth }}
    >
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

