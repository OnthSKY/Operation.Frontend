"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getVisibleNavItems,
  isActiveRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";

export function DesktopSidebar({ badgeState }: { badgeState: NavBadgeState }) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const navRef = useRef<HTMLElement | null>(null);
  const sortedItems = useMemo(
    () => getVisibleNavItems(user),
    [user]
  );

  return (
    <aside
      style={{ zIndex: Z_INDEX.sidebar }}
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[250px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 md:block"
    >
      <nav
        ref={navRef}
        className="space-y-1"
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
        {sortedItems.map((item) => {
          const active = isActiveRoute(pathname, item.route);
          const badge = resolveBadge(item, badgeState);
          return (
            <Link
              key={item.id}
              href={item.route}
              prefetch
              onClick={() => trackNavClick(item.route)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <NavIcon icon={item.icon} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badge ? (
                <span className="rounded-full bg-zinc-900 px-1.5 text-[10px] leading-4 text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
