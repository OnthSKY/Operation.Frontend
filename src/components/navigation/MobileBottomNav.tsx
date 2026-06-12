"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  getConfiguredMobileNavItems,
  getVisibleNavItems,
  isActiveRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";
import { useSoftKeyboardOpen } from "@/shared/lib/use-soft-keyboard-open";

type MobileBottomNavProps = {
  onOpenMore: () => void;
  badgeState: NavBadgeState;
};

function DockBadge({ value }: { value: number }) {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] max-w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 px-0.5 text-[9px] font-bold tabular-nums leading-none text-white shadow-[0_2px_8px_-1px_rgba(91,33,182,0.45)] ring-[2.5px] ring-white"
      aria-hidden
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

type DockTabContentProps = {
  active: boolean;
  caption: string;
  captionTitle?: string;
  badge?: number | null;
  icon: ReactNode;
};

/**
 * Kompakt + aktif genişler stili (Apple/iOS pill).
 *  - Pasif tab: yalnız ikon (kare ~44px).
 *  - Aktif tab: ikon + label yatay pill, parent flex-grow ile genişler.
 *  - Geçişler: spring-like cubic-bezier ile width + opacity animasyonu.
 */
function DockTabContent({ active, caption, captionTitle, badge, icon }: DockTabContentProps) {
  return (
    <>
      {active ? (
        <span
          className="pointer-events-none absolute inset-x-0.5 inset-y-0.5 rounded-full bg-gradient-to-b from-violet-100 via-violet-50 to-indigo-50/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92),0_1px_3px_rgba(91,33,182,0.12)] ring-1 ring-violet-300/55"
          aria-hidden
        />
      ) : null}
      <span
        className={`relative z-10 flex min-h-[2.75rem] min-w-0 items-center justify-center gap-1.5 px-2.5 py-1 ${
          active ? "pr-3.5" : ""
        }`}
      >
        <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
          <span
            className={`transition-[color,transform] duration-200 ease-out will-change-transform group-active:scale-[0.92] ${
              active
                ? "text-violet-700 scale-105"
                : "text-zinc-500 group-active:text-zinc-700"
            }`}
          >
            {icon}
          </span>
          {badge ? <DockBadge value={badge} /> : null}
        </span>
        <span
          title={captionTitle}
          aria-hidden={!active}
          className={`min-w-0 overflow-hidden whitespace-nowrap text-[12px] font-semibold tracking-[-0.01em] text-violet-900 antialiased transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            active ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          {caption}
        </span>
      </span>
    </>
  );
}

export function MobileBottomNav({ onOpenMore, badgeState }: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { t } = useI18n();
  const keyboardOpen = useSoftKeyboardOpen();
  const mobileItems = useMemo(() => {
    const visibleItems = getVisibleNavItems(user, t);
    return getConfiguredMobileNavItems(visibleItems);
  }, [user, t]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 transition-opacity duration-150 md:hidden ${
        keyboardOpen ? "opacity-0" : "opacity-100"
      }`}
      style={{ zIndex: Z_INDEX.navbar + 1 }}
      aria-hidden={keyboardOpen}
    >
      <div
        className={`${keyboardOpen ? "pointer-events-none" : "pointer-events-auto"} pt-1 pb-[env(safe-area-inset-bottom,0px)] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pt-1.5 sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))]`}
      >
        <nav
          className="relative mx-auto max-w-screen-md antialiased"
          aria-label={t("nav.dockNav")}
        >
          <div
            className="rounded-[1.125rem] border border-zinc-200/70 bg-white/55 px-1 py-1 shadow-[0_-1px_0_0_rgba(255,255,255,0.65)_inset,0_12px_40px_-14px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.03)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 sm:px-1.5"
            role="presentation"
          >
            <div className="flex items-center gap-0.5">
              {mobileItems.map((item) => {
                const active = isActiveRoute(pathname, item.route);
                const badge = item.sourceItem ? resolveBadge(item.sourceItem, badgeState) : null;
                const caption = item.label;
                return (
                  <Link
                    key={item.id}
                    href={item.route}
                    prefetch
                    title={item.label}
                    className={`group relative flex min-h-[44px] items-center justify-center rounded-full outline-none transition-[flex,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100/80 ${
                      active
                        ? "flex-[2_1_0%] text-zinc-900"
                        : "flex-[1_1_0%] text-zinc-500"
                    }`}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => trackNavClick(item.route)}
                  >
                    <DockTabContent
                      active={active}
                      caption={caption}
                      captionTitle={item.label}
                      badge={badge}
                      icon={<NavIcon icon={item.icon} />}
                    />
                  </Link>
                );
              })}
              <button
                type="button"
                className="group relative flex min-h-[44px] flex-[1_1_0%] items-center justify-center rounded-full text-zinc-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100/80 active:text-zinc-700"
                aria-label={t("nav.menuOpen")}
                onClick={onOpenMore}
              >
                <DockTabContent
                  active={false}
                  caption={t("nav.dockMore")}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <circle cx="5" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="19" cy="12" r="1.5" />
                    </svg>
                  }
                />
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
