"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const iconWrap = "flex h-6 w-6 items-center justify-center";
const svgCls = "h-5 w-5 shrink-0 text-current";

function IconHome() {
  return (
    <svg className={svgCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconBranch() {
  return (
    <svg className={svgCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  );
}

function IconWarehouse() {
  return (
    <svg className={svgCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAdvances() {
  return (
    <svg className={svgCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className={svgCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

type DockItem = {
  key: string;
  href?: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: () => void;
};

/**
 * Mobil patron / saha kullanımı: ana sayfalar tek dokunuşla; tam menü drawer’da.
 */
export function MobileNavDock({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const driverPortal = isDriverPortalRole(user?.role);
  const u = user;

  const items: DockItem[] = personnelPortal
    ? [
        ...(canSeeUiModule(u, PERM.uiBranches)
          ? ([
              {
                key: "branch",
                href: "/branches",
                label: t("nav.branch"),
                icon: <IconBranch />,
                active: pathname.startsWith("/branches"),
              },
            ] satisfies DockItem[])
          : []),
        ...(canSeeUiModule(u, PERM.uiMyAdvances)
          ? ([
              {
                key: "personnel-costs",
                href: "/personnel/costs",
                label: t("nav.personnelCosts"),
                icon: <IconAdvances />,
                active: pathname.startsWith("/personnel/costs"),
              },
            ] satisfies DockItem[])
          : []),
        {
          key: "more",
          label: t("nav.dockMore"),
          icon: <IconMenu />,
          active: false,
          onClick: onOpenMenu,
        },
      ]
    : driverPortal
      ? [
          ...(canSeeUiModule(u, PERM.uiBranches)
            ? ([
                {
                  key: "branch",
                  href: "/branches",
                  label: t("nav.branch"),
                  icon: <IconBranch />,
                  active: pathname.startsWith("/branches"),
                },
              ] satisfies DockItem[])
            : []),
          ...(canSeeUiModule(u, PERM.uiWarehouse)
            ? ([
                {
                  key: "warehouse",
                  href: "/warehouses",
                  label: t("nav.warehouse"),
                  icon: <IconWarehouse />,
                  active: pathname.startsWith("/warehouses"),
                },
              ] satisfies DockItem[])
            : []),
          ...(user?.allowPersonnelSelfFinancials
            ? ([
                {
                  key: "my-finances",
                  href: "/me/financials",
                  label: t("nav.myFinances"),
                  icon: <IconAdvances />,
                  active: pathname.startsWith("/me/financials"),
                },
              ] satisfies DockItem[])
            : []),
          {
            key: "more",
            label: t("nav.dockMore"),
            icon: <IconMenu />,
            active: false,
            onClick: onOpenMenu,
          },
        ]
      : (() => {
          const dock: DockItem[] = [];
          if (canSeeUiModule(u, PERM.uiDashboard)) {
            dock.push({
              key: "home",
              href: "/",
              label: t("nav.home"),
              icon: <IconHome />,
              active: pathname === "/",
            });
          }
          if (canSeeUiModule(u, PERM.uiBranches)) {
            dock.push({
              key: "branch",
              href: "/branches",
              label: t("nav.branch"),
              icon: <IconBranch />,
              active: pathname.startsWith("/branches"),
            });
          }
          if (canSeeUiModule(u, PERM.uiWarehouse)) {
            dock.push({
              key: "warehouse",
              href: "/warehouses",
              label: t("nav.warehouse"),
              icon: <IconWarehouse />,
              active: pathname.startsWith("/warehouses"),
            });
          }
          dock.push({
            key: "more",
            label: t("nav.dockMore"),
            icon: <IconMenu />,
            active: false,
            onClick: onOpenMenu,
          });
          return dock;
        })();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[35] border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      aria-label={t("nav.dockNav")}
    >
      <ul
        className={cn(
          "mx-auto grid max-w-lg items-stretch gap-0 px-1",
          items.length <= 3 ? "grid-cols-3" : "grid-cols-4"
        )}
      >
        {items.map((item) => {
          const content = (
            <>
              <span className={iconWrap}>{item.icon}</span>
              <span className="max-w-[4.5rem] truncate text-center text-[11px] font-semibold leading-tight text-zinc-600">
                {item.label}
              </span>
            </>
          );
          const base =
            "flex min-h-[3.25rem] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-zinc-700 transition-colors active:bg-zinc-100/90";
          const activeCls =
            item.active && item.href
              ? "bg-violet-50 text-violet-900 [&_svg]:text-violet-700"
              : "hover:bg-zinc-50";

          if (item.href) {
            return (
              <li key={item.key} className="flex min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={cn(base, activeCls)}
                  aria-current={item.active ? "page" : undefined}
                >
                  {content}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.key} className="flex min-w-0 flex-1">
              <button
                type="button"
                className={cn(base, activeCls, "w-full border-0 bg-transparent")}
                onClick={item.onClick}
                aria-label={t("nav.menuOpen")}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
