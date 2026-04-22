"use client";

import type { NavigationItem } from "@/config/navigation.config";

export function NavIcon({ icon }: { icon: NavigationItem["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (icon === "dashboard") {
    return (
      <svg {...common}>
        <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
      </svg>
    );
  }
  if (icon === "branch") {
    return (
      <svg {...common}>
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
        <path d="M9 12h.01M12 12h.01M15 12h.01" />
      </svg>
    );
  }
  if (icon === "reports") {
    return (
      <svg {...common}>
        <line x1="5" y1="20" x2="5" y2="11" />
        <line x1="12" y1="20" x2="12" y2="5" />
        <line x1="19" y1="20" x2="19" y2="8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 21a6 6 0 0 1 12 0" />
      <path d="M17 8h4M19 6v4" />
    </svg>
  );
}
