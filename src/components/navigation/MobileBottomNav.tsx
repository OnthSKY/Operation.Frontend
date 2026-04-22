"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  getVisibleNavItems,
  isActiveRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";

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

function DockTabContent({ active, caption, captionTitle, badge, icon }: DockTabContentProps) {
  return (
    <>
      {active ? (
        <span
          className="pointer-events-none absolute inset-x-0.5 inset-y-0.5 rounded-[0.875rem] bg-gradient-to-b from-white via-violet-50/80 to-indigo-50/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.88),0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-violet-200/55"
          aria-hidden
        />
      ) : null}
      <span className="relative z-10 flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-1">
        <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
          <span
            className={`transition-[color,transform] duration-200 ease-out will-change-transform group-active:scale-[0.94] ${
              active ? "text-violet-700" : "text-zinc-500 group-active:text-zinc-700"
            }`}
          >
            {icon}
          </span>
          {badge ? <DockBadge value={badge} /> : null}
        </span>
        <span
          title={captionTitle}
          className={`w-full min-w-0 max-w-full px-0.5 text-center text-[10px] font-medium leading-[1.25] tracking-[-0.015em] antialiased sm:text-[11px] ${
            active ? "font-semibold text-zinc-900" : "text-zinc-500"
          } line-clamp-2 break-words [overflow-wrap:anywhere]`}
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
  const mobileItems = useMemo(
    () =>
      getVisibleNavItems(user, t)
        .filter((x) => x.mobileVisible)
        .slice(0, 4),
    [user, t]
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 md:hidden"
      style={{ zIndex: Z_INDEX.navbar + 1 }}
    >
      <div className="pointer-events-auto pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <nav
          className="relative mx-auto max-w-screen-md antialiased"
          aria-label={t("nav.dockNav")}
        >
          <div
            className="rounded-[1.125rem] border border-zinc-200/70 bg-white/55 px-1 py-1 shadow-[0_-1px_0_0_rgba(255,255,255,0.65)_inset,0_12px_40px_-14px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.03)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 sm:px-1.5"
            role="presentation"
          >
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
            >
              {mobileItems.map((item) => {
                const active = isActiveRoute(pathname, item.route);
                const badge = resolveBadge(item, badgeState);
                const caption = item.dockLabel ?? item.label;
                return (
                  <Link
                    key={item.id}
                    href={item.route}
                    prefetch
                    title={item.label}
                    className={`group relative flex w-full min-w-0 flex-col items-center justify-center rounded-[0.875rem] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100/80 ${
                      active ? "text-zinc-900" : "text-zinc-500"
                    }`}
                    aria-label={item.label}
                    onClick={() => trackNavClick(item.route)}
                  >
                    <DockTabContent
                      active={active}
                      caption={caption}
                      captionTitle={item.dockLabel ? item.label : undefined}
                      badge={badge}
                      icon={<NavIcon icon={item.icon} />}
                    />
                  </Link>
                );
              })}
              <button
                type="button"
                className="group relative flex w-full min-w-0 flex-col items-center justify-center rounded-[0.875rem] text-zinc-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100/80 active:text-zinc-700"
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
