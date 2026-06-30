import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';
import api from '../lib/api';
import {
  PiFilesFill,
  PiChartLineFill,
  PiUsersFill,
  PiShieldFill,
  PiBriefcaseFill,
  PiBuildingsFill,
  PiSignOut,
  PiGearFill,
  PiQrCode,
  PiQuestionFill,
} from 'react-icons/pi';
import { ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from './ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '../lib/utils';

const SIDEBAR_ICON_CLASS = 'size-4 shrink-0 text-sidebar-foreground/70';

const getMenuItems = (locale) => {
  const panel = t(locale, 'admin.nav.panel');
  const exp = t(locale, 'admin.common.export');

  return [
    {
      title: t(locale, 'admin.common.reporting'),
      icon: PiFilesFill,
      children: [
        {
          title: t(locale, 'admin.common.patient'),
          children: [
            { title: panel, path: '/patients', icon: PiChartLineFill },
            { title: exp, path: '/reporting', icon: PiFilesFill, permission: 'users_manage' },
          ],
        },
        {
          title: t(locale, 'admin.common.hfs'),
          children: [
            { title: panel, path: '/hfs_dashboard', icon: PiChartLineFill },
            { title: exp, path: '/hfs', icon: PiFilesFill, permission: 'users_manage' },
          ],
        },
        {
          title: t(locale, 'admin.nav.adminPanel'),
          path: '/admin_dashboard',
          icon: PiChartLineFill,
          permission: 'users_manage',
        },
      ],
    },
    {
      title: t(locale, 'admin.common.userManagement'),
      icon: PiUsersFill,
      permission: 'users_manage',
      children: [
        { title: t(locale, 'admin.dashboard.permissions'), path: '/permissions', icon: PiShieldFill },
        { title: t(locale, 'admin.dashboard.roles'), path: '/roles', icon: PiBriefcaseFill },
        { title: t(locale, 'admin.dashboard.sites'), path: '/sites', icon: PiBuildingsFill },
        { title: t(locale, 'admin.users.title'), path: '/users', icon: PiUsersFill },
        { title: t(locale, 'admin.questions.title'), path: '/questions', icon: PiQuestionFill },
        { title: locale === 'kh' ? 'QR Code' : 'QR Codes', path: '/qr-codes', icon: PiQrCode },
      ],
    },
    {
      title: t(locale, 'admin.common.settings'),
      path: '/settings',
      icon: PiGearFill,
    },
  ];
};

function NavMenu({ menuItems }) {
  const location = useLocation();
  const { hasPermission } = useAuthStore();

  const renderItem = (item, idx) => {
    if (item.permission && !hasPermission(item.permission)) return null;

    const hasChildren = item.children?.length > 0;
    const isActive = item.path && location.pathname === item.path;
    const hasActiveChild =
      hasChildren &&
      item.children.some((ch) => {
        if (ch.path) return location.pathname === ch.path;
        return ch.children?.some((gc) => gc.path === location.pathname);
      });

    if (hasChildren) {
      return (
        <Collapsible
          key={idx}
          asChild
          defaultOpen={hasActiveChild}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.title}>
                {item.icon && <item.icon className={SIDEBAR_ICON_CLASS} />}
                <span className="truncate">{item.title}</span>
                <ChevronRight
                  className={cn(
                    'ml-auto size-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90'
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.children.map((child, cIdx) => {
                  if (child.permission && !hasPermission(child.permission)) return null;
                  if (child.children?.length) {
                    return (
                      <React.Fragment key={cIdx}>
                        <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">
                          {child.title}
                        </div>
                        {child.children.map((grandchild, gIdx) => {
                          if (grandchild.permission && !hasPermission(grandchild.permission)) return null;
                          const active = grandchild.path === location.pathname;
                          return (
                            <SidebarMenuSubItem key={gIdx}>
                              <SidebarMenuSubButton asChild isActive={active}>
                                <Link to={grandchild.path}>
                                  {grandchild.icon && <grandchild.icon className={SIDEBAR_ICON_CLASS} />}
                                  <span>{grandchild.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </React.Fragment>
                    );
                  }
                  const childActive = child.path === location.pathname;
                  return (
                    <SidebarMenuSubItem key={cIdx}>
                      <SidebarMenuSubButton asChild isActive={childActive}>
                        <Link to={child.path}>
                          {child.icon && <child.icon className={SIDEBAR_ICON_CLASS} />}
                          <span>{child.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={idx}>
        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
          <Link to={item.path}>
            {item.icon && <item.icon className={SIDEBAR_ICON_CLASS} />}
            <span className="truncate">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarGroup className="py-1">
      <SidebarGroupContent>
        <SidebarMenu>{menuItems.map((item, idx) => renderItem(item, idx))}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UserInitials({ name }) {
  const parts = (name || 'U').trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0]?.[0] || 'U');
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
      {initials.toUpperCase()}
    </span>
  );
}

export default function Sidebar() {
  const { initTheme, locale } = useUIStore();
  const { isMobile, state, toggleSidebar } = useSidebar();
  const { logout, user } = useAuthStore();
  const menuItems = getMenuItems(locale);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
    }
  };

  const collapsed = state === 'collapsed';

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div
          className={cn(
            'flex h-11 items-center',
            collapsed ? 'justify-center px-0' : 'justify-between gap-2 px-3'
          )}
        >
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-semibold">P</span>
              </div>
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                PSF
              </span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="size-7 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn('gap-0', locale === 'kh' && 'font-khmer')}>
        <NavMenu menuItems={menuItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <SidebarMenu>
            {!isMobile && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={locale === 'kh' ? 'ពង្រីក' : 'Expand'}
                  onClick={toggleSidebar}
                >
                  <PanelLeft className="size-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t(locale, 'admin.common.logout')}
                onClick={handleLogout}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <PiSignOut className="size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="flex flex-col gap-2">
            {user && (
              <div className="flex min-w-0 items-center gap-2 px-1">
                <UserInitials name={user.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-sidebar-foreground">
                    {user.name || 'User'}
                  </div>
                  {user.email && (
                    <div className="truncate text-[11px] text-sidebar-foreground/60">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-full justify-start gap-2 px-2 text-xs text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <PiSignOut className="size-4 shrink-0" />
              {t(locale, 'admin.common.logout')}
            </Button>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
