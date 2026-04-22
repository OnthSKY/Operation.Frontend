"use client";

import { TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { Z_INDEX } from "@/config/z-index";
import { UserAccountMenu } from "@/modules/account/UserAccountMenu";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getVisibleNavItems, resolveRouteTitle } from "./navigation-utils";

type TopNavbarProps = {
  onOpenMenu: () => void;
};

export function TopNavbar({ onOpenMenu }: TopNavbarProps) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const visibleItems = useMemo(() => getVisibleNavItems(user), [user]);

  return (
    <header
      style={{ zIndex: Z_INDEX.navbar }}
      className="fixed inset-x-0 top-0 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="mx-auto flex min-h-14 w-full max-w-screen-md items-center px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex w-11 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden"
          style={{ minHeight: TOUCH_TARGET_MIN }}
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold text-zinc-900 md:text-left">
          {resolveRouteTitle(pathname, visibleItems)}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex w-11 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
            style={{ minHeight: TOUCH_TARGET_MIN }}
            onClick={() => window.location.reload()}
            aria-label="Refresh page"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
          {user ? <UserAccountMenu triggerLabel={user.fullName?.trim() || user.username} /> : null}
        </div>
      </div>
    </header>
  );
}
