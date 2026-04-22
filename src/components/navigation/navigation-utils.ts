"use client";

import { NAVIGATION_ITEMS, type NavigationItem } from "@/config/navigation.config";
import { canSeeUiModule } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

export function isActiveRoute(pathname: string, route: string): boolean {
  return route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`);
}

function hasRole(user: AuthUser | null, roles?: string[]): boolean {
  if (!roles || roles.length === 0) return true;
  if (!user) return false;
  const role = String(user.role ?? "").toUpperCase();
  return roles.some((r) => String(r).toUpperCase() === role);
}

export function getVisibleNavItems(user: AuthUser | null): NavigationItem[] {
  return [...NAVIGATION_ITEMS]
    .sort((a, b) => a.order - b.order)
    .filter((item) => {
      const permissionOk = item.permission ? canSeeUiModule(user, item.permission) : true;
      const roleOk = hasRole(user, item.roles);
      return permissionOk && roleOk;
    });
}

export function resolveRouteTitle(pathname: string, items: NavigationItem[]): string {
  const sorted = [...items].sort((a, b) => b.route.length - a.route.length);
  const matched = sorted.find((item) => isActiveRoute(pathname, item.route));
  return matched?.title ?? "Dashboard";
}

export function trackNavClick(route: string) {
  // Future-ready analytics hook.
  void route;
}
