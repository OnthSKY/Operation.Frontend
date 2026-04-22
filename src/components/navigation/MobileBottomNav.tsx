"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
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
    <nav
      style={{ zIndex: Z_INDEX.navbar + 1 }}
      className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1 backdrop-blur md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid w-full max-w-screen-md grid-cols-5">
        {mobileItems.map((item) => {
          const active = isActiveRoute(pathname, item.route);
          const badge = resolveBadge(item, badgeState);
          return (
            <Link
              key={item.id}
              href={item.route}
              prefetch
              className={`flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${
                active ? "text-zinc-900" : "text-zinc-500"
              }`}
              aria-label={item.label}
              onClick={() => trackNavClick(item.route)}
            >
              <NavIcon icon={item.icon} />
              <span className="max-w-full truncate text-xs">{item.label}</span>
              {badge ? (
                <span className="rounded-full bg-zinc-900 px-1.5 text-[10px] leading-4 text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-zinc-600"
          aria-label={t("nav.menuOpen")}
          onClick={onOpenMore}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
          <span>{t("nav.dockMore")}</span>
        </button>
      </div>
    </nav>
  );
}
