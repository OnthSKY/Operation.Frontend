"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getVisibleNavItems, isActiveRoute, trackNavClick } from "./navigation-utils";

export function DesktopSidebar() {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const sortedItems = useMemo(
    () => getVisibleNavItems(user),
    [user]
  );

  return (
    <aside
      style={{ zIndex: Z_INDEX.sidebar }}
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[250px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 md:block"
    >
      <nav className="space-y-1" aria-label="Desktop navigation">
        {sortedItems.map((item) => {
          const active = isActiveRoute(pathname, item.route);
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
