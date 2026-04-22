"use client";

import type { LegacyMenuItem } from "./legacy-menu";

export type NavigationItem = {
  id: string;
  label: string;
  /** Compact label for mobile bottom dock when space is tight. */
  dockLabel?: string;
  title: string;
  route: string;
  icon: "dashboard" | "branch" | "reports" | "personnel";
  mobileVisible: boolean;
  badgeKey?: "notifications";
  featureFlag?: string;
  children?: NavigationItem[];
};

function normalizeIcon(icon: string): NavigationItem["icon"] {
  if (icon === "dashboard" || icon === "branch" || icon === "reports" || icon === "personnel") {
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
