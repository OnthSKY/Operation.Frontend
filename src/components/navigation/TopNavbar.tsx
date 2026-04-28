"use client";

import { TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { Z_INDEX } from "@/config/z-index";
import { UserAccountMenu } from "@/modules/account/UserAccountMenu";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { flattenNavItems, getVisibleNavItems, resolveRouteTitle } from "./navigation-utils";
import { useI18n } from "@/i18n/context";
import { hasStaffOperationsNotifications } from "@/lib/auth/permissions";
import { StaffHeaderNotifications } from "@/shared/components/StaffHeaderNotifications";
import { AppGlobalSearch } from "@/shared/components/AppGlobalSearch";
import { accountRoleLabel } from "@/modules/account/lib/role-label";
import { useIsMobile } from "@/shared/lib/use-is-mobile";

type TopNavbarProps = {
  onOpenMenu: () => void;
  breadcrumbs: string[];
};

export function TopNavbar({ onOpenMenu, breadcrumbs }: TopNavbarProps) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { t } = useI18n();
  const visibleItems = useMemo(() => getVisibleNavItems(user, t), [user, t]);
  const showStaffNotifications = hasStaffOperationsNotifications(user);
  const title = resolveRouteTitle(pathname, flattenNavItems(visibleItems));
  const isMobile = useIsMobile();
  const breadcrumbContext = breadcrumbs.slice(0, -1).join(" / ");
  const subtitle = isMobile
    ? ""
    : title === t("dashboard.title")
      ? t("dashboard.subtitle")
      : breadcrumbContext;
  const roleText = user ? accountRoleLabel(user.role, t) : "";

  return (
    <header
      style={{ zIndex: Z_INDEX.navbar }}
      className="fixed inset-x-0 top-0 h-16 border-b border-zinc-200 bg-white/85 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-full items-center justify-between gap-2 px-3 sm:px-4 md:gap-3 md:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex min-w-[44px] items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
          style={{ minHeight: TOUCH_TARGET_MIN }}
          aria-label={t("nav.menuOpen")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          {subtitle ? (
            <div className="hidden max-w-full items-center gap-2 rounded-lg bg-zinc-100/80 px-2 py-1 sm:inline-flex">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
              <p className="truncate text-xs leading-5 font-medium text-zinc-600 sm:text-sm">{subtitle}</p>
            </div>
          ) : null}
          <h1 className="truncate text-base leading-tight font-semibold text-zinc-900 sm:mt-1 sm:text-lg md:text-xl">
            {title}
          </h1>
        </div>
        <div className="hidden w-full max-w-xs md:block">
          <AppGlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              className="inline-flex min-w-[44px] items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
              style={{ minHeight: TOUCH_TARGET_MIN }}
              aria-label={t("search.open")}
              title={t("search.open")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            {user && showStaffNotifications ? <StaffHeaderNotifications /> : null}
          </div>
          {user ? (
            <span className="hidden items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 sm:inline-flex">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 3 5 6v6c0 4.6 2.9 7.8 7 9 4.1-1.2 7-4.4 7-9V6z" />
                <path d="M9.5 12.5 11 14l3.5-3.5" />
              </svg>
              <span className="max-w-[7.5rem] truncate">{roleText}</span>
            </span>
          ) : null}
          <div className="h-6 w-px bg-zinc-200" aria-hidden />
          {user ? <UserAccountMenu triggerLabel={user.fullName?.trim() || user.username} /> : null}
        </div>
      </div>
    </header>
  );
}
