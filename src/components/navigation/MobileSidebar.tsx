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
import { useSystemBrandingQuery } from "@/modules/admin/hooks/useSystemBrandingQuery";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
  badgeState: NavBadgeState;
};

export function MobileSidebar({ open, onClose, badgeState }: MobileSidebarProps) {
  const STORAGE_KEY = "ops.nav.mobile.openGroups";
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: branding, isSuccess: brandingLoaded } = useSystemBrandingQuery(Boolean(user));
  const brandingTitle = branding?.companyName?.trim() || t("common.appName");
  const brandingIsCustom = Boolean(branding?.companyName?.trim());
  const panelRef = useRef<HTMLElement | null>(null);
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const sortedItems = useMemo(
    () => getVisibleNavItems(user, t),
    [user, t]
  );
  const activeRoute = useMemo(
    () => resolveMostSpecificRoute(pathname, sortedItems),
    [pathname, sortedItems]
  );
  const [openGroups, setOpenGroups] = useState<string[]>(["overview-group", "finance-reporting"]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      // Ignore storage write failures
    }
  }, [openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const root = panelRef.current;
    const selector = 'a, button, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(selector));
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open && navScrollRef.current) {
      navScrollRef.current.scrollTop = savedScrollTop.current;
    }
  }, [open]);

  return (
    <div
      style={{ zIndex: Z_INDEX.sidebar }}
      className={`fixed inset-0 transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="presentation"
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-zinc-900/45 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close sidebar"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`absolute inset-y-0 left-0 flex w-[85%] max-w-[18rem] flex-col border-r border-zinc-200 bg-zinc-50 shadow-xl transition-transform duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-14 items-center justify-between gap-2 border-b border-zinc-200/80 bg-white/80 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {brandingLoaded && branding?.hasLogo ? (
              <SidebarBrandingLogo
                hasLogo
                updatedAtUtc={branding.updatedAtUtc}
                className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain ring-1 ring-zinc-200/70"
              />
            ) : null}
            <p
              className={
                brandingIsCustom
                  ? "min-w-0 flex-1 truncate text-sm font-bold leading-tight text-zinc-900"
                  : "min-w-0 flex-1 truncate text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-600"
              }
              title={brandingTitle}
            >
              {brandingTitle}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            {t("common.close")}
          </button>
        </div>
        <nav
          ref={navScrollRef}
          className="m-2 flex-1 space-y-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm"
          aria-label="Primary mobile navigation"
        >
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
                <div key={item.id} className="mt-2 border-t border-zinc-200/70 pt-2 first:mt-0 first:border-t-0 first:pt-0">
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
                          {item.children.map((child: NavigationItem) => {
                            const active = activeRoute === child.route;
                            const badge = resolveBadge(child, badgeState);
                            return (
                              <Link
                                key={child.id}
                                href={child.route}
                                prefetch
                                onClick={() => {
                                  if (navScrollRef.current) savedScrollTop.current = navScrollRef.current.scrollTop;
                                  trackNavClick(child.route);
                                  onClose();
                                }}
                                className={`relative flex min-h-10 items-center gap-2.5 rounded-xl pl-6 pr-3 text-sm font-medium transition-all duration-200 ${
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
                                  <span className={`rounded-full px-1.5 text-[10px] leading-4 ${
                                    active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
                                  }`}>
                                    {badge > 99 ? "99+" : badge}
                                  </span>
                                ) : null}
                              </Link>
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
              <Link
                key={item.id}
                href={item.route}
                prefetch
                onClick={() => {
                  if (navScrollRef.current) savedScrollTop.current = navScrollRef.current.scrollTop;
                  trackNavClick(item.route);
                  onClose();
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
                  <span className={`rounded-full px-1.5 text-[10px] leading-4 ${
                    active ? "bg-indigo-600 text-white" : "bg-zinc-900 text-white"
                  }`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
