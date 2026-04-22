"use client";

import { buildLegacyMenu } from "./legacy-menu";
import { mapLegacyMenu, type NavigationItem } from "./navigation-mapper";
import type { AuthUser } from "@/lib/auth/types";
import { track } from "@/lib/analytics";
import { isFeatureEnabled } from "@/lib/feature-flags";

export function isActiveRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}(?:/|$)`);
  return re.test(pathname);
}

function flattenItems(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenItems(item.children) : [])]);
}

export function flattenNavItems(items: NavigationItem[]): NavigationItem[] {
  return flattenItems(items);
}

export function getVisibleNavItems(
  user: AuthUser | null,
  translate: (key: string) => string
): NavigationItem[] {
  return mapLegacyMenu(buildLegacyMenu(user), translate).filter((item) =>
    isFeatureEnabled(item.featureFlag)
  );
}

export function resolveMostSpecificRoute(pathname: string, items: NavigationItem[]): string | null {
  const flat = flattenItems(items).sort((a, b) => {
    const byRouteLength = b.route.length - a.route.length;
    if (byRouteLength !== 0) return byRouteLength;
    // Tie-breaker: prefer real pages over group containers.
    const aIsGroup = Boolean(a.children?.length);
    const bIsGroup = Boolean(b.children?.length);
    if (aIsGroup === bIsGroup) return 0;
    return aIsGroup ? 1 : -1;
  });
  const matched = flat.find((item) => isActiveRoute(pathname, item.route));
  return matched?.route ?? null;
}

export function resolveRouteTitle(pathname: string, items: NavigationItem[]): string {
  const sorted = [...items].sort((a, b) => {
    const byRouteLength = b.route.length - a.route.length;
    if (byRouteLength !== 0) return byRouteLength;
    // Tie-breaker: prefer real pages over group containers.
    const aIsGroup = Boolean(a.children?.length);
    const bIsGroup = Boolean(b.children?.length);
    if (aIsGroup === bIsGroup) return 0;
    return aIsGroup ? 1 : -1;
  });
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
