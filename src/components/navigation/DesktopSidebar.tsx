"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  getVisibleNavItems,
  resolveMostSpecificRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";
import type { NavigationItem } from "./navigation-mapper";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useSystemBrandingQuery } from "@/modules/admin/hooks/useSystemBrandingQuery";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";

export function DesktopSidebar({ badgeState }: { badgeState: NavBadgeState }) {
  const STORAGE_GROUPS_KEY = "ops.nav.desktop.openGroups";
  const STORAGE_COLLAPSED_KEY = "ops.nav.desktop.collapsed";
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: branding, isSuccess: brandingLoaded } = useSystemBrandingQuery(Boolean(user));
  const brandingTitle = branding?.companyName?.trim() || t("common.appName");
  const brandingIsCustom = Boolean(branding?.companyName?.trim());
  const navRef = useRef<HTMLElement | null>(null);
  const sortedItems = useMemo(
    () => getVisibleNavItems(user, t),
    [user, t]
  );
  const activeRoute = useMemo(
    () => resolveMostSpecificRoute(pathname, sortedItems),
    [pathname, sortedItems]
  );
  const [openGroups, setOpenGroups] = useState<string[]>(["overview-group", "finance-reporting"]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_GROUPS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setOpenGroups(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Ignore invalid localStorage values
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(openGroups));
    } catch {
      // Ignore storage write failures
    }
  }, [openGroups]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_COLLAPSED_KEY);
      if (!raw) return;
      setCollapsed(raw === "1");
    } catch {
      // Ignore invalid localStorage values
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore storage write failures
    }
  }, [collapsed]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <aside
      style={{ zIndex: Z_INDEX.sidebar }}
      className={`sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 overflow-hidden border-r border-zinc-200/80 bg-zinc-50 p-2 transition-[width] duration-300 md:block ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <nav
        ref={navRef}
        className="h-full space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm"
        aria-label="Desktop navigation"
        onKeyDown={(e) => {
          const root = navRef.current;
          if (!root) return;
          const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
          if (links.length === 0) return;
          const active = document.activeElement as HTMLElement | null;
          const idx = links.findIndex((el) => el === active);

          if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = idx < 0 ? 0 : (idx + 1) % links.length;
            links[next]?.focus();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = idx < 0 ? links.length - 1 : (idx - 1 + links.length) % links.length;
            links[prev]?.focus();
          } else if (e.key === "Enter" && idx >= 0) {
            e.preventDefault();
            links[idx]?.click();
          }
        }}
      >
        <div
          className={`mb-2 border-b border-zinc-100 pb-2 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}
        >
          {collapsed ? (
            <Tooltip content={brandingTitle} side="right">
              <div className="flex justify-center" aria-label={brandingTitle}>
                {brandingLoaded && branding?.hasLogo ? (
                  <SidebarBrandingLogo
                    hasLogo
                    updatedAtUtc={branding.updatedAtUtc}
                    className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-zinc-200/70"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-[10px] font-bold uppercase leading-none text-white">
                    {brandingTitle.trim().slice(0, 2) || "—"}
                  </span>
                )}
              </div>
            </Tooltip>
          ) : (
            <div className="flex min-w-0 items-center gap-2 px-1">
              {brandingLoaded && branding?.hasLogo ? (
                <SidebarBrandingLogo
                  hasLogo
                  updatedAtUtc={branding.updatedAtUtc}
                  className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain ring-1 ring-zinc-200/70"
                />
              ) : null}
              <p
                className={
                  brandingIsCustom
                    ? "min-w-0 flex-1 truncate text-sm font-bold leading-tight text-zinc-900"
                    : "min-w-0 flex-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-600"
                }
              >
                {brandingTitle}
              </p>
            </div>
          )}
        </div>
        <div className={`mb-1 flex items-center ${collapsed ? "justify-center" : "justify-end"} px-1`}>
          <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {collapsed ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
              </svg>
            </button>
          </Tooltip>
        </div>
        {sortedItems.map((item) => {
          if (item.children?.length) {
            const isOpen = openGroups.includes(item.id);
            return (
              <div key={item.id} className="mt-2 border-t border-zinc-200/70 pt-2 first:mt-0 first:border-t-0 first:pt-0">
                <Tooltip content={item.label} side="right" disabled={!collapsed}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition-all duration-200 ease-in-out hover:bg-zinc-100/80 ${
                    collapsed ? "justify-center px-2" : ""
                  }`}
                >
                  <span className={collapsed ? "hidden" : ""}>{item.label}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                    className={`transition-transform duration-200 ease-in-out ${isOpen ? "rotate-180" : ""} ${collapsed ? "hidden" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                </Tooltip>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    {isOpen ? (
                      <div className="space-y-1 pt-1">
                        {item.children.map((child: NavigationItem) => {
                          const active = activeRoute === child.route;
                          const badge = resolveBadge(child, badgeState);
                          return (
                            <Tooltip key={`tip-${child.id}`} content={child.label} side="right" disabled={!collapsed}>
                            <Link
                              href={child.route}
                              prefetch
                              onClick={() => trackNavClick(child.route)}
                              className={`group relative flex min-h-10 items-center gap-2.5 rounded-xl pr-3 text-sm font-medium transition-all duration-200 ${
                                collapsed ? "justify-center pl-3" : "pl-6"
                              } ${
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
                              <span className={`min-w-0 flex-1 truncate ${collapsed ? "hidden" : ""}`}>{child.label}</span>
                              {badge ? (
                                <span className={`rounded-full px-1.5 text-[10px] leading-4 ${
                                  active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
                                } ${collapsed ? "absolute -right-0.5 -top-0.5" : ""}`}>
                                  {badge > 99 ? "99+" : badge}
                                </span>
                              ) : null}
                            </Link>
                            </Tooltip>
                          );
                        })}
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
            <Tooltip key={`tip-${item.id}`} content={item.label} side="right" disabled={!collapsed}>
            <Link
              href={item.route}
              prefetch
              onClick={() => trackNavClick(item.route)}
              className={`group relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
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
              <span className={`min-w-0 flex-1 truncate ${collapsed ? "hidden" : ""}`}>{item.label}</span>
              {badge ? (
                <span className={`rounded-full px-1.5 text-[10px] leading-4 ${
                  active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
                } ${collapsed ? "absolute -right-0.5 -top-0.5" : ""}`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
