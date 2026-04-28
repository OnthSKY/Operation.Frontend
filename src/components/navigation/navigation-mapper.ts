"use client";

import type { LegacyMenuItem } from "./legacy-menu";

export type NavigationItem = {
  id: string;
  label: string;
  /** Compact label for mobile bottom dock when space is tight. */
  dockLabel?: string;
  title: string;
  route: string;
  icon:
    | "dashboard"
    | "branch"
    | "reports"
    | "personnel"
    | "warehouse"
    | "movements"
    | "products"
    | "categories"
    | "cost"
    | "documents"
    | "suppliers"
    | "invoices"
    | "settings"
    | "users"
    | "roles"
    | "notifications"
    | "branding"
    | "vehicles";
  mobileVisible: boolean;
  badgeKey?: "notifications";
  featureFlag?: string;
  children?: NavigationItem[];
};

function normalizeIcon(icon: string): NavigationItem["icon"] {
  if (
    icon === "dashboard" ||
    icon === "branch" ||
    icon === "reports" ||
    icon === "personnel" ||
    icon === "warehouse" ||
    icon === "movements" ||
    icon === "products" ||
    icon === "categories" ||
    icon === "cost" ||
    icon === "documents" ||
    icon === "suppliers" ||
    icon === "invoices" ||
    icon === "settings" ||
    icon === "users" ||
    icon === "roles" ||
    icon === "notifications" ||
    icon === "branding" ||
    icon === "vehicles"
  ) {
    return icon;
  }
  return "reports";
}

export function mapLegacyMenu(
  legacyMenu: LegacyMenuItem[],
  translate: (key: string) => string
): NavigationItem[] {
  return legacyMenu.map((item) => {
    const label = translate(item.labelKey);
    return {
      id: item.id,
      label,
      dockLabel: item.dockLabelKey ? translate(item.dockLabelKey) : undefined,
      title: label,
      route: item.route,
      icon: normalizeIcon(item.icon),
      mobileVisible: item.mobileVisible ?? false,
      badgeKey: item.badgeKey,
      featureFlag: item.featureFlag,
      children: item.children ? mapLegacyMenu(item.children, translate) : undefined,
    };
  });
}
