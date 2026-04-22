"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { NavigationStateProvider, useNavigationState } from "./NavigationState";
import { AppShellErrorBoundary } from "./AppShellErrorBoundary";
import { useAuth } from "@/lib/auth/AuthContext";
import { getVisibleNavItems, resolveBreadcrumbs } from "./navigation-utils";
import { useNotifications } from "@/modules/reminders/hooks/useNotifications";
import { selectUnreadCount } from "@/selectors/notification.selector";
import { hasStaffOperationsNotifications } from "@/lib/auth/permissions";

const MobileSidebar = dynamic(
  () => import("./MobileSidebar").then((m) => m.MobileSidebar),
  { ssr: false }
);
const DesktopSidebar = dynamic(
  () => import("./DesktopSidebar").then((m) => m.DesktopSidebar),
  { ssr: false }
);

function AppShellInner({ children }: { children: ReactNode }) {
  const { isSidebarOpen, openSidebar, closeSidebar } = useNavigationState();
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const [routeLoading, setRouteLoading] = useState(false);
  const visibleItems = useMemo(() => getVisibleNavItems(user), [user]);
  const notificationsEnabled = Boolean(user) && hasStaffOperationsNotifications(user);
  const notificationsQ = useNotifications(notificationsEnabled);
  const notificationsUnread = useMemo(
    () => selectUnreadCount(notificationsQ.data),
    [notificationsQ.data]
  );
  const badgeState = useMemo(
    () => ({ notificationsUnread }),
    [notificationsUnread]
  );
  const breadcrumbs = useMemo(
    () => resolveBreadcrumbs(pathname, visibleItems).slice(0, 3),
    [pathname, visibleItems]
  );

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] bg-zinc-50">
      {routeLoading ? (
        <div className="fixed inset-x-0 top-0 z-[75] h-0.5 bg-zinc-900/80" aria-hidden />
      ) : null}
      <TopNavbar onOpenMenu={openSidebar} />

      <div className="mx-auto flex w-full max-w-screen-md pt-14 md:max-w-none">
        <div className="hidden md:block">
          <DesktopSidebar badgeState={badgeState} />
        </div>

        <main className="min-w-0 flex-1 px-2 pb-24 pt-2 md:px-4 md:pb-6 md:pt-4">
          <div className="mb-2 hidden text-xs text-zinc-500 md:block">
            {breadcrumbs.map((seg) => (
              <span key={seg}> / {seg}</span>
            ))}
          </div>
          {children}
        </main>
      </div>

      <div className="block md:hidden">
        <MobileBottomNav onOpenMore={openSidebar} badgeState={badgeState} />
      </div>

      <MobileSidebar open={isSidebarOpen} onClose={closeSidebar} badgeState={badgeState} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellErrorBoundary>
      <NavigationStateProvider>
        <AppShellInner>{children}</AppShellInner>
      </NavigationStateProvider>
    </AppShellErrorBoundary>
  );
}
