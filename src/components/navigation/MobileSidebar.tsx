"use client";

import { Z_INDEX } from "@/config/z-index";
import { NavIcon } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getVisibleNavItems,
  isActiveRoute,
  resolveBadge,
  trackNavClick,
  type NavBadgeState,
} from "./navigation-utils";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
  badgeState: NavBadgeState;
};

export function MobileSidebar({ open, onClose, badgeState }: MobileSidebarProps) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const panelRef = useRef<HTMLElement | null>(null);
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const sortedItems = useMemo(
    () => getVisibleNavItems(user),
    [user]
  );

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
        className={`absolute inset-y-0 left-0 flex w-[85%] max-w-[18rem] flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-zinc-100 px-4">
          <p className="text-sm font-semibold text-zinc-900">Menu</p>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Close menu"
          >
            Close
          </button>
        </div>
        <nav
          ref={navScrollRef}
          className="flex-1 space-y-1 overflow-y-auto p-2"
          aria-label="Primary mobile navigation"
        >
          {sortedItems.map((item) => {
            const active = isActiveRoute(pathname, item.route);
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
    </div>
  );
}
