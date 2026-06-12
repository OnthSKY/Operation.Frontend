"use client";

import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/context";
import {
  isActiveRoute,
  resolveMostSpecificRoute,
  resolveBadge,
  trackNavClick,
  type ConfiguredMobileNavItem,
  type NavBadgeState,
} from "./navigation-utils";
import type { NavigationItem } from "./navigation-mapper";

const OPEN_GROUPS_STORAGE_KEY = "ops.nav.mobile.openGroups.v2";
const DEFAULT_OPEN_GROUPS = ["overview-group"] as const;

export type MobileGroupedNavTreeProps = {
  sortedItems: NavigationItem[];
  quickAccessItems: ConfiguredMobileNavItem[];
  badgeState: NavBadgeState;
  /** Link tıklanınca (üst katman menüyü kapatır) */
  onNavigate: () => void;
  /** Kaydırma konumunu saklamak için (soldan panel) */
  onBeforeItemNavigate?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Varsayılan: soldan panelde `flex-1` ile kaydırma; tam ekran menüde üst sarmalayıcı kaydırır */
  navClassName?: string;
  /** Üstte ayrı hızlı kısayol ızgarası varken tekrarını gizle */
  omitQuickAccess?: boolean;
};

export function MobileGroupedNavTree({
  sortedItems,
  quickAccessItems,
  badgeState,
  onNavigate,
  onBeforeItemNavigate,
  scrollContainerRef,
  navClassName,
  omitQuickAccess,
}: MobileGroupedNavTreeProps) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
  const activeRoute = useMemo(
    () => resolveMostSpecificRoute(pathname, sortedItems),
    [pathname, sortedItems]
  );
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...DEFAULT_OPEN_GROUPS];
    try {
      const raw = window.localStorage.getItem(OPEN_GROUPS_STORAGE_KEY);
      if (!raw) return [...DEFAULT_OPEN_GROUPS];
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const next = parsed.filter((x): x is string => typeof x === "string");
        if (next.length > 0) return next;
      }
    } catch {
      // ignore
    }
    return [...DEFAULT_OPEN_GROUPS];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      // ignore
    }
  }, [openGroups]);

  // Aktif route hangi top-level grupta ise o grubu auto-expand et (mevcut açık olanlara eklenir).
  useEffect(() => {
    if (!activeRoute) return;
    const containing = sortedItems.find(
      (g) =>
        g.children?.some((c) =>
          c.route === activeRoute ||
          c.children?.some((sub) => sub.route === activeRoute)
        )
    );
    if (containing && !openGroups.includes(containing.id)) {
      setOpenGroups((prev) => (prev.includes(containing.id) ? prev : [...prev, containing.id]));
    }
  }, [activeRoute, sortedItems, openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Grup çocuğu: kendi `children`'ı varsa iç içe (alt menü) açılır; yoksa normal link.
  const renderChild = (child: NavigationItem, depth: number): ReactNode => {
    if (child.children?.length) {
      const isOpen = openGroups.includes(child.id);
      return (
        <div key={child.id} className="pl-3">
          <button
            type="button"
            onClick={() => toggleGroup(child.id)}
            aria-expanded={isOpen}
            className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition-colors duration-200 hover:bg-zinc-100/80"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <NavIcon icon={child.icon} />
              <span className="truncate">{child.label}</span>
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
              className={`transition-transform duration-200 ease-in-out ${isOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden">
              {isOpen ? <div className="space-y-1 pt-1">{child.children.map((g) => renderChild(g, depth + 1))}</div> : null}
            </div>
          </div>
        </div>
      );
    }

    const active = activeRoute === child.route;
    const badge = resolveBadge(child, badgeState);
    const leftPad = depth >= 2 ? "pl-9" : "pl-6";
    return (
      <Link
        key={child.id}
        href={child.route}
        prefetch
        onClick={() => {
          onBeforeItemNavigate?.();
          trackNavClick(child.route);
          onNavigate();
        }}
        className={`relative flex min-h-10 items-center gap-2.5 rounded-xl pr-3 text-sm font-medium transition-all duration-200 ${leftPad} ${
          active
            ? "border border-indigo-100 bg-indigo-50 text-indigo-700"
            : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
        }`}
      >
        <span
          className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-500 transition-all duration-200 ${
            active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
          }`}
          aria-hidden
        />
        <NavIcon icon={child.icon} />
        <span className="min-w-0 flex-1">{child.label}</span>
        {badge ? (
          <span
            className={`rounded-full px-1.5 text-[10px] leading-4 ${
              active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
            }`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      ref={scrollContainerRef}
      className={
        navClassName ??
        "m-2 flex-1 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm"
      }
      aria-label={t("nav.mobileGroupedNavAria")}
    >
      {!omitQuickAccess && quickAccessItems.length ? (
        <div className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("nav.dockNav")}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {quickAccessItems.map((item) => {
              const active = isActiveRoute(pathname, item.route);
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  prefetch
                  onClick={() => {
                    onBeforeItemNavigate?.();
                    trackNavClick(item.route);
                    onNavigate();
                  }}
                  className={`flex min-h-[44px] items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border border-indigo-100 bg-indigo-50 text-indigo-700"
                      : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                  }`}
                >
                  <NavIcon icon={item.icon} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("nav.mobileGroupHintTitle")}
        </p>
        <p className="mt-0.5 text-xs text-zinc-600">{t("nav.mobileGroupHintBody")}</p>
      </div>
      {sortedItems.map((item) => {
        if (item.children?.length) {
          const isOpen = openGroups.includes(item.id);
          return (
            <div
              key={item.id}
              className="mt-2 border-t border-zinc-200/70 pt-2 first:mt-0 first:border-t-0 first:pt-0"
            >
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition-all duration-200 ease-in-out hover:bg-zinc-100/80"
              >
                <span>{item.label}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                  className={`transition-transform duration-200 ease-in-out ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  {isOpen ? (
                    <div className="space-y-1 pt-1">
                      {item.children.map((child: NavigationItem) => renderChild(child, 1))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        }

        const active = activeRoute === item.route;
        const badge = resolveBadge(item, badgeState);
        return (
          <Link
            key={item.id}
            href={item.route}
            prefetch
            onClick={() => {
              onBeforeItemNavigate?.();
              trackNavClick(item.route);
              onNavigate();
            }}
            className={`relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 ${
              active
                ? "border border-indigo-100 bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
            }`}
          >
            <span
              className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-500 transition-all duration-200 ${
                active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
              }`}
              aria-hidden
            />
            <NavIcon icon={item.icon} />
            <span className="min-w-0 flex-1">{item.label}</span>
            {badge ? (
              <span
                className={`rounded-full px-1.5 text-[10px] leading-4 ${
                  active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
                }`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
