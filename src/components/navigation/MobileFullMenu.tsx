"use client";

import { Z_INDEX } from "@/config/z-index";
import { TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { useSystemBrandingQuery } from "@/modules/admin/hooks/useSystemBrandingQuery";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useIsMobile } from "@/shared/lib/use-is-mobile";
import { Input } from "@/shared/ui/Input";
import {
  flattenNavItems,
  getConfiguredMobileNavItems,
  getVisibleNavItems,
  isActiveRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";
import type { NavigationItem } from "./navigation-mapper";
import { MobileGroupedNavTree } from "./MobileGroupedNavTree";

type MobileFullMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenSidebar: () => void;
  badgeState: NavBadgeState;
};

function normalizeMenuSearchQuery(raw: string): string {
  return raw.trim().toLocaleLowerCase("tr-TR");
}

function navItemMatchesSearch(item: NavigationItem, q: string): boolean {
  if (!q) return true;
  const blob = `${item.label}\u0000${item.title}\u0000${item.route}`.toLocaleLowerCase("tr-TR");
  return blob.includes(q);
}

function flattenLeafNavItems(items: NavigationItem[]): NavigationItem[] {
  return flattenNavItems(items).filter((item) => !item.children?.length);
}

function buildMenuSearchResults(items: NavigationItem[], rawQuery: string): NavigationItem[] {
  const q = normalizeMenuSearchQuery(rawQuery);
  if (!q) return [];
  const seenRoutes = new Set<string>();
  const out: NavigationItem[] = [];
  for (const item of flattenLeafNavItems(items)) {
    if (!navItemMatchesSearch(item, q)) continue;
    if (seenRoutes.has(item.route)) continue;
    seenRoutes.add(item.route);
    out.push(item);
  }
  return out;
}

export function MobileFullMenu({ open, onClose, onOpenSidebar, badgeState }: MobileFullMenuProps) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: branding, isSuccess: brandingLoaded } = useSystemBrandingQuery(Boolean(user));
  const brandingTitle = branding?.companyName?.trim() || t("common.appName");
  const brandingIsCustom = Boolean(branding?.companyName?.trim());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const debouncedMenuSearch = useDebouncedValue(menuSearch, 250);
  const isMobile = useIsMobile();

  const sortedItems = useMemo(() => getVisibleNavItems(user, t), [user, t]);
  const quickItems = useMemo(() => getConfiguredMobileNavItems(sortedItems), [sortedItems]);

  const searchQueryNorm = useMemo(
    () => normalizeMenuSearchQuery(debouncedMenuSearch),
    [debouncedMenuSearch]
  );
  const searchActive = searchQueryNorm.length > 0;

  const searchResults = useMemo(
    () => buildMenuSearchResults(sortedItems, debouncedMenuSearch),
    [sortedItems, debouncedMenuSearch]
  );

  useEffect(() => {
    if (!open) {
      const id = window.requestAnimationFrame(() => setMenuSearch(""));
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    if (open && !isMobile) onClose();
  }, [open, isMobile, onClose]);

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

  return (
    <div
      style={{ zIndex: Z_INDEX.mobileFullMenu }}
      className={`fixed inset-0 flex flex-col bg-zinc-50 transition-opacity duration-200 ease-out md:hidden ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="presentation"
      aria-hidden={!open}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.mobileFullMenuTitle")}
        className={`flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top,0px)] ${open ? "" : "invisible"}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {brandingLoaded && branding?.hasLogo ? (
              <SidebarBrandingLogo
                hasLogo
                updatedAtUtc={branding.updatedAtUtc}
                className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain ring-1 ring-zinc-200/70"
              />
            ) : null}
            <div className="min-w-0">
              <p
                className={
                  brandingIsCustom
                    ? "truncate text-base font-bold leading-tight text-zinc-900"
                    : "truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-600"
                }
                title={brandingTitle}
              >
                {brandingTitle}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{t("nav.mobileFullMenuSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            style={{ minHeight: TOUCH_TARGET_MIN }}
            aria-label={t("common.close")}
          >
            {t("common.close")}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <div className="mb-4">
            <Input
              name="mobileMenuSearch"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder={t("nav.mobileMenuSearchPlaceholder")}
              aria-label={t("nav.mobileMenuSearchAria")}
              className="border-zinc-200 bg-white"
            />
            <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{t("nav.mobileMenuSearchHint")}</p>
          </div>

          {searchActive ? (
            <section aria-label={t("nav.mobileMenuSearchAria")}>
              {searchResults.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                  {t("nav.mobileMenuSearchNoResults")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {searchResults.map((item) => {
                    const active = isActiveRoute(pathname, item.route);
                    const badge = resolveBadge(item, badgeState);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.route}
                          prefetch
                          onClick={() => {
                            trackNavClick(item.route);
                            onClose();
                          }}
                          className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                              : "border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100/90 text-zinc-700">
                            <NavIcon icon={item.icon} />
                          </span>
                          <span className="min-w-0 flex-1 text-pretty leading-snug">{item.label}</span>
                          {badge ? (
                            <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("nav.openGroupedNavigation")}
                </p>
                <MobileGroupedNavTree
                  sortedItems={sortedItems}
                  quickAccessItems={quickItems}
                  badgeState={badgeState}
                  onNavigate={onClose}
                  omitQuickAccess
                  navClassName="mx-0 mb-2 space-y-1 overflow-visible rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm"
                />
              </div>
            </>
          )}

          <div className="mt-6 border-t border-zinc-200/80 pt-4">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="w-full rounded-xl py-2.5 text-center text-sm font-medium text-violet-800 underline decoration-violet-300 underline-offset-2 hover:bg-violet-50/50 hover:text-violet-950"
              style={{ minHeight: TOUCH_TARGET_MIN }}
            >
              {t("nav.openInSidebarPanel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
