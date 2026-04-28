"use client";

export type NavIconName =
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

export function NavIcon({ icon }: { icon: NavIconName }) {
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
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  }
  if (icon === "branch") {
    return (
      <svg {...common}>
        <path d="M4 10h16" />
        <path d="M6 10V6h12v4" />
        <path d="M5 21V10M19 21V10" />
        <path d="M3 21h18" />
        <path d="M10 21v-5h4v5" />
      </svg>
    );
  }
  if (icon === "reports") {
    return (
      <svg {...common}>
        <path d="M4 19h16" />
        <path d="M7 15v4M12 10v9M17 6v13" />
        <path d="M6 12l4-3 3 2 5-4" />
      </svg>
    );
  }
  if (icon === "personnel") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="16.5" cy="9.5" r="2.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M14 20a4 4 0 0 1 7 0" />
      </svg>
    );
  }
  if (icon === "warehouse") {
    return (
      <svg {...common}>
        <path d="M3 8.5 12 4l9 4.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <path d="M3 8.5 12 13l9-4.5" />
        <path d="M12 13v8" />
        <path d="M7.5 16.5h2.5M14 16.5h2.5" />
      </svg>
    );
  }
  if (icon === "movements") {
    return (
      <svg {...common}>
        <path d="M4 7h10" />
        <path d="m10 4 4 3-4 3" />
        <path d="M20 17H10" />
        <path d="m14 14-4 3 4 3" />
      </svg>
    );
  }
  if (icon === "products") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (icon === "categories") {
    return (
      <svg {...common}>
        <path d="M6 7h12" />
        <path d="M6 12h12" />
        <path d="M6 17h12" />
        <circle cx="4" cy="7" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="17" r="1" />
      </svg>
    );
  }
  if (icon === "cost") {
    return (
      <svg {...common}>
        <path d="M12 4v16" />
        <path d="M16 7.5a4 4 0 0 0-4-2.5c-2 0-3.5 1.1-3.5 2.8 0 3.9 7.5 1.8 7.5 6 0 1.9-1.6 3.2-4 3.2a5.5 5.5 0 0 1-4.6-2.3" />
      </svg>
    );
  }
  if (icon === "documents") {
    return (
      <svg {...common}>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v6h6" />
        <path d="M9 14h6M9 18h6" />
      </svg>
    );
  }
  if (icon === "suppliers") {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="1.5" />
        <path d="M8 7V4h8v3" />
        <path d="M3 12h18" />
      </svg>
    );
  }
  if (icon === "invoices") {
    return (
      <svg {...common}>
        <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V5a2 2 0 0 1 2-2z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (icon === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.4a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" />
      </svg>
    );
  }
  if (icon === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <circle cx="17" cy="9" r="2" />
        <path d="M15 20a4.5 4.5 0 0 1 6 0" />
      </svg>
    );
  }
  if (icon === "roles") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (icon === "notifications") {
    return (
      <svg {...common}>
        <path d="M6 16h12l-1.2-1.2a2 2 0 0 1-.6-1.4V10a4.2 4.2 0 1 0-8.4 0v3.4a2 2 0 0 1-.6 1.4z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (icon === "branding") {
    return (
      <svg {...common}>
        <path d="M12 3 3 7.5 12 12l9-4.5z" />
        <path d="M3 12l9 4.5 9-4.5" />
        <path d="M3 16.5 12 21l9-4.5" />
      </svg>
    );
  }
  if (icon === "vehicles") {
    return (
      <svg {...common}>
        <path d="M5 15l1.5-5h11L19 15" />
        <path d="M4 15h16v3a1 1 0 0 1-1 1h-1" />
        <path d="M5 19H4a1 1 0 0 1-1-1v-3" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    );
  }
  return null;
}
