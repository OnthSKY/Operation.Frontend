"use client";

import { NAVIGATION_ITEMS, type NavigationItem } from "@/config/navigation.config";
import { canSeeUiModule } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";
import { track } from "@/lib/analytics";
import { isFeatureEnabled } from "@/lib/feature-flags";

export function isActiveRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}(?:/|$)`);
  return re.test(pathname);
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
      const featureOk = isFeatureEnabled(item.featureFlag);
      return permissionOk && roleOk && featureOk;
    });
}

export function resolveRouteTitle(pathname: string, items: NavigationItem[]): string {
  const sorted = [...items].sort((a, b) => b.route.length - a.route.length);
  const matched = sorted.find((item) => isActiveRoute(pathname, item.route));
  return matched?.title ?? "Dashboard";
}

export function trackNavClick(route: string) {
  track("nav_click", { route });
}

export function resolveBreadcrumbs(pathname: string, items: NavigationItem[]): string[] {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts.length === 0) return ["Dashboard"];

  const crumb: string[] = ["Dashboard"];
  const joined = `/${parts.join("/")}`;
  const sorted = [...items].sort((a, b) => a.route.length - b.route.length);
  sorted.forEach((item) => {
    if (item.route !== "/" && isActiveRoute(joined, item.route) && !crumb.includes(item.title)) {
      crumb.push(item.title);
    }
  });

  if (crumb.length === 1) {
    crumb.push("Detay");
  }
  return crumb;
}

export type NavBadgeState = {
  notificationsUnread: number;
};

export function resolveBadge(item: NavigationItem, state: NavBadgeState): number | null {
  switch (item.badgeKey) {
    case "notifications":
      return state.notificationsUnread > 0 ? state.notificationsUnread : null;
    default:
      return null;
  }
}
