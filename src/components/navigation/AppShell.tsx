"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { NavigationStateProvider, useNavigationState } from "./NavigationState";
import { AppShellErrorBoundary } from "./AppShellErrorBoundary";

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

  const breadcrumbs = pathname
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-h-[100dvh] bg-zinc-50">
      <TopNavbar onOpenMenu={openSidebar} />

      <div className="mx-auto flex w-full max-w-screen-md pt-14 md:max-w-none">
        <div className="hidden md:block">
          <DesktopSidebar />
        </div>

        <main className="min-w-0 flex-1 px-2 pb-24 pt-2 md:px-4 md:pb-6 md:pt-4">
          <div className="mb-2 hidden text-xs text-zinc-500 md:block">
            Dashboard
            {breadcrumbs.map((seg) => (
              <span key={seg}> / {seg}</span>
            ))}
          </div>
          {children}
        </main>
      </div>

      <div className="block md:hidden">
        <MobileBottomNav onOpenMore={openSidebar} />
      </div>

      <MobileSidebar open={isSidebarOpen} onClose={closeSidebar} />
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
