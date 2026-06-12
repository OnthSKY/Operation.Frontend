"use client";

import { Z_INDEX } from "@/config/z-index";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  getConfiguredMobileNavItems,
  getVisibleNavItems,
  type NavBadgeState,
} from "./navigation-utils";
import { useSystemBrandingQuery } from "@/modules/admin/hooks/useSystemBrandingQuery";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";
import { MobileGroupedNavTree } from "./MobileGroupedNavTree";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
  badgeState: NavBadgeState;
};

export function MobileSidebar({ open, onClose, badgeState }: MobileSidebarProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: branding, isSuccess: brandingLoaded } = useSystemBrandingQuery(Boolean(user));
  const brandingTitle = branding?.companyName?.trim() || t("common.appName");
  const brandingIsCustom = Boolean(branding?.companyName?.trim());
  const panelRef = useRef<HTMLElement | null>(null);
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const sortedItems = useMemo(() => getVisibleNavItems(user, t), [user, t]);
  const quickAccessItems = useMemo(() => getConfiguredMobileNavItems(sortedItems), [sortedItems]);

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
        <MobileGroupedNavTree
          sortedItems={sortedItems}
          quickAccessItems={quickAccessItems}
          badgeState={badgeState}
          scrollContainerRef={navScrollRef}
          onBeforeItemNavigate={() => {
            if (navScrollRef.current) savedScrollTop.current = navScrollRef.current.scrollTop;
          }}
          onNavigate={onClose}
          omitQuickAccess
        />
      </aside>
    </div>
  );
}
