"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  canSeeDailyBranchRegister,
  canSeeUiModule,
  hasPermissionCode,
  hasStaffOperationsNotifications,
  PERM,
} from "@/lib/auth/permissions";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { AppGlobalSearch } from "@/shared/components/AppGlobalSearch";
import { DateDisplayFormatHint } from "@/shared/components/DateDisplayFormatHint";
import { MobileNavDock } from "@/shared/components/MobileNavDock";
import { UserAccountMenu } from "@/modules/account/UserAccountMenu";
import { useSystemBrandingQuery } from "@/modules/admin/hooks/useSystemBrandingQuery";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";
import { StaffHeaderNotifications } from "@/shared/components/StaffHeaderNotifications";
import { Tooltip } from "@/shared/ui/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const personnelSubNav = [
  { href: "/personnel", labelKey: "nav.personnelList", icon: "personnel" as const },
  {
    href: "/personnel/costs",
    labelKey: "nav.personnelCosts",
    icon: "personnelCosts" as const,
  },
] as const;

function reportsHubLinkActive(pathname: string, href: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  if (href === "/reports/financial") return p.startsWith("/reports/financial");
  if (href === "/reports/stock") return p.startsWith("/reports/stock");
  if (href === "/reports/patron-flow") return p.startsWith("/reports/patron-flow");
  if (href === "/reports/cash") return p.startsWith("/reports/cash");
  if (href === "/reports/branches") return p.startsWith("/reports/branches");
  return p.startsWith(href);
}

function isReportsSidebarContext(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  return p.startsWith("/reports") || p.startsWith("/daily-branch-register");
}

const suppliersSubNav = [
  { href: "/suppliers", labelKey: "nav.suppliers", icon: "/suppliers" as const, hintKey: "nav.tooltip.suppliers" as const },
  {
    href: "/suppliers/invoices",
    labelKey: "nav.supplierInvoices",
    icon: "/suppliers" as const,
    hintKey: "nav.tooltip.supplierInvoices" as const,
  },
] as const;

const procurementSubNav = suppliersSubNav;

const topRoutes = [
  "/",
  "/reports",
  "/branches",
  "/warehouses",
  "/products",
  "/suppliers",
  "/vehicles",
] as const;
type NavIconName =
  | (typeof topRoutes)[number]
  | "personnel"
  | "personnelCosts"
  | "users"
  | "settings"
  | "authz"
  | "notificationsBell"
  | "branding"
  | "insurances"
  | "generalOverhead"
  | "dailyBranchRegister"
  | "reportSummary"
  | "reportTrend"
  | "reportTable"
  | "reportFlow"
  | "reportCash"
  | "reportStock"
  | "reportCompare";

function NavGlyph({ name }: { name: NavIconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0 opacity-90",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "/":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "/reports":
      return (
        <svg {...common}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "personnel":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "personnelCosts":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M8 15h4M10 13v4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case "authz":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 12h5M8 15h7" />
        </svg>
      );
    case "notificationsBell":
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "branding":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      );
    case "/branches":
      return (
        <svg {...common}>
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
        </svg>
      );
    case "dailyBranchRegister":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01" />
        </svg>
      );
    case "/warehouses":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "/products":
      return (
        <svg {...common}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "/suppliers":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "/vehicles":
      return (
        <svg {...common}>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.5 9.1A2 2 0 0 0 16.8 8H13" />
          <path d="M2 17h2" />
          <path d="M6 17h10v-5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v5z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "insurances":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "generalOverhead":
      return (
        <svg {...common}>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      );
    case "reportSummary":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      );
    case "reportTrend":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "reportTable":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case "reportFlow":
      return (
        <svg {...common}>
          <path d="M12 3v6l4-2" />
          <path d="M12 21v-6l-4 2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M4 12h2M18 12h2" />
        </svg>
      );
    case "reportCash":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 10h.01M18 14h.01" />
        </svg>
      );
    case "reportStock":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      );
    case "reportCompare":
      return (
        <svg {...common}>
          <path d="M8 6v14M16 6v14M4 20h16" />
          <path d="M8 6a4 4 0 1 1 8 0" />
        </svg>
      );
    default:
      return null;
  }
}

type ReportSidebarNavItem = {
  readonly href: string;
  readonly labelKey: string;
  readonly icon: NavIconName;
  readonly hintKey: string;
};

/** Şirket / kasa — tek finans girişi (sayfa içi sekmeler); kasa özeti ayrı. */
const reportsFinSystemSubNav: readonly ReportSidebarNavItem[] = [
  {
    href: "/reports/financial",
    labelKey: "reports.sidebarFinances",
    icon: "reportSummary",
    hintKey: "nav.tooltip.reportsFinOneEntry",
  },
  {
    href: "/reports/position",
    labelKey: "reports.tabCashPosition",
    icon: "reportCash",
    hintKey: "nav.tooltip.reportsHubCash",
  },
];

const reportsPatronSubNav: readonly ReportSidebarNavItem[] = [
  {
    href: "/reports/patron-flow",
    labelKey: "reports.finNavCashFlow",
    icon: "reportFlow",
    hintKey: "nav.tooltip.reportsHubFinCashFlow",
  },
];

const reportsStockSubNav: readonly ReportSidebarNavItem[] = [
  {
    href: "/reports/stock",
    labelKey: "reports.tabStock",
    icon: "reportStock",
    hintKey: "nav.tooltip.reportsHubStock",
  },
];

const reportsOtherSubNav: readonly ReportSidebarNavItem[] = [
  {
    href: "/reports/branches",
    labelKey: "reports.navBranchComparison",
    icon: "reportCompare",
    hintKey: "nav.tooltip.reportsHubBranches",
  },
  {
    href: "/daily-branch-register",
    labelKey: "nav.dailyBranchRegister",
    icon: "dailyBranchRegister",
    hintKey: "nav.tooltip.reportsHubDailyRegister",
  },
];

const navLinkBase =
  "flex min-h-12 items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 md:min-h-0";
const navLinkActive =
  "bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 ring-1 ring-zinc-900/20";
const navLinkIdle =
  "text-zinc-600 hover:bg-white/80 hover:text-zinc-900 hover:shadow-md hover:shadow-zinc-900/[0.04] hover:ring-1 hover:ring-zinc-200/90";
/** Level 1: ana grup (Raporlar, Personel, Şube, …) */
const navSidebarL1Label =
  "min-w-0 px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.13em] text-zinc-800";
/** Level 2: Raporlar altındaki alt gruplar */
const navSidebarL2Label =
  "min-w-0 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.09em] text-zinc-600 md:px-2.5";
/** Rapor alt grupları — çok hafif violet wash (tema ile uyumlu) */
const navReportsSubgroupBlock =
  "flex flex-col gap-1 rounded-xl border-t border-zinc-200/50 bg-gradient-to-br from-violet-50/45 via-white/75 to-zinc-50/40 px-1.5 pb-1 pt-2.5 shadow-sm shadow-violet-950/[0.025] first:border-t-0 first:pt-0.5";
/** Alt grup içi sayfa linkleri — hafif girinti, mobilde dar kenar */
const navReportsLeafStack =
  "flex flex-col gap-1 rounded-lg bg-white/35 py-0.5 pl-2 sm:pl-2.5 md:gap-1.5 md:bg-white/25";
const navLinkReportsLeaf =
  `${navLinkBase} min-w-0 rounded-xl py-2.5 pl-2.5 pr-2 text-sm font-semibold leading-snug md:min-h-0 md:rounded-lg md:py-2 md:pl-3`;
const navSectionToggleBtn =
  "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl px-1 py-0.5 text-left transition-[background-color,box-shadow,transform,color] duration-200 ease-out hover:bg-zinc-100/90 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 motion-reduce:transition-none";
const navSectionToggleBtnOpen =
  "bg-gradient-to-b from-violet-50/85 to-zinc-50/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] shadow-sm shadow-violet-900/[0.04] ring-1 ring-violet-200/45";
const navCollapsibleChevron =
  "mr-1 shrink-0 text-zinc-500 transition-transform duration-300 ease-[cubic-bezier(0.33,1.2,0.68,1)] motion-reduce:duration-150 motion-reduce:ease-out";
const navCollapsibleGrid =
  "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-0 motion-reduce:transition-none";
const navSectionBlock = "mt-2 border-t border-zinc-200/80 pt-2";
/** Sağdaki (i) sütunu tüm satırlarda aynı x konumunda tutar. */
const navItemRow =
  "grid grid-cols-[minmax(0,1fr)_2.25rem] items-stretch gap-x-0";
const navHintCol = "flex items-center justify-center";
const navHintBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 md:h-8 md:w-8";

/** Sistem yönetimi alt menüsü — ana nav’dan ayrışan modern kart. */
const adminNavCard =
  "mx-0.5 rounded-2xl border border-violet-200/40 bg-gradient-to-br from-violet-50/90 via-white to-zinc-50/70 p-2 shadow-sm shadow-violet-950/[0.03] ring-1 ring-white/80";
const adminNavLinkBase =
  "flex min-h-11 items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 md:min-h-10";
const adminNavLinkActive =
  "bg-violet-700 text-white shadow-md shadow-violet-900/25 ring-1 ring-violet-800/40";
const adminNavLinkIdle =
  "text-zinc-700 hover:bg-white/90 hover:text-zinc-900 hover:shadow-md hover:shadow-zinc-900/[0.04] hover:ring-1 hover:ring-zinc-200/70";
/** Hub altındaki doğrudan sayfalar — görsel hiyerarşi */
const adminNavSubLinkWrap = "ml-1 border-l-2 border-violet-200/60 pl-2";

function AdminSectionShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function NavCollapsiblePanel({
  id,
  labelledBy,
  open,
  contentClassName,
  children,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      aria-hidden={!open}
      className={`${navCollapsibleGrid} ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className="min-h-0 overflow-hidden" inert={open ? undefined : true}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}

function NavMenuHint({ hintKey }: { hintKey: string }) {
  const { t } = useI18n();
  const text = t(hintKey);
  if (!text || text === hintKey) return null;
  return (
    <Tooltip
      content={text}
      side="bottom"
      delayMs={160}
      panelClassName="max-w-[min(26rem,calc(100vw-1rem))]"
    >
      <button
        type="button"
        className={navHintBtn}
        aria-label={t("nav.hintAria")}
        onClick={(e) => e.preventDefault()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
    </Tooltip>
  );
}

function ReportsNavSubgroup({
  subgroupId,
  titleKey,
  items,
  pathname,
  user,
  onItemClick,
}: {
  subgroupId: string;
  titleKey: string;
  items: readonly ReportSidebarNavItem[];
  pathname: string;
  user: ReturnType<typeof useAuth>["user"];
  onItemClick: () => void;
}) {
  const { t } = useI18n();
  const visible = useMemo(
    () =>
      items.filter((item) =>
        item.href === "/daily-branch-register"
          ? canSeeDailyBranchRegister(user)
          : canSeeUiModule(user, PERM.uiReports)
      ),
    [items, user]
  );
  const hasActive = useMemo(
    () => visible.some((item) => reportsHubLinkActive(pathname, item.href)),
    [visible, pathname]
  );
  const [open, setOpen] = useState(hasActive);
  const toggleId = `sidebar-report-sub-${subgroupId}-toggle`;
  const panelId = `sidebar-report-sub-${subgroupId}-panel`;

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  if (visible.length === 0) return null;
  return (
    <div className={navReportsSubgroupBlock}>
      <button
        type="button"
        id={toggleId}
        className={`${navSectionToggleBtn} md:min-h-9 md:rounded-lg ${
          open ? navSectionToggleBtnOpen : ""
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        aria-label={
          open
            ? `${t(titleKey)} — ${t("nav.collapseReportSubgroup")}`
            : `${t(titleKey)} — ${t("nav.expandReportSubgroup")}`
        }
      >
        <span className={`${navSidebarL2Label} flex min-w-0 flex-1 items-center`}>
          {t(titleKey)}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${navCollapsibleChevron} ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <NavCollapsiblePanel
        id={panelId}
        labelledBy={toggleId}
        open={open}
        contentClassName="pb-0.5 pt-1"
      >
        <div className={navReportsLeafStack}>
          {visible.map((item) => {
            const subActive = reportsHubLinkActive(pathname, item.href);
            return (
              <div key={item.href} className={navItemRow}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`${navLinkReportsLeaf} ${
                    subActive ? navLinkActive : navLinkIdle
                  }`}
                >
                  <NavGlyph name={item.icon} />
                  <span className="min-w-0 normal-case tracking-normal">
                    {t(item.labelKey)}
                  </span>
                </Link>
                <div className={navHintCol}>
                  <NavMenuHint hintKey={item.hintKey} />
                </div>
              </div>
            );
          })}
        </div>
      </NavCollapsiblePanel>
    </div>
  );
}

function LocaleToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      className="inline-flex shrink-0 rounded-full bg-zinc-100/90 p-0.5 shadow-inner ring-1 ring-zinc-200/70"
      role="group"
      aria-label={t("lang.label")}
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-h-11 min-w-11 rounded-full px-2.5 text-xs font-bold tracking-wide transition-colors sm:min-h-8 sm:min-w-9 ${
            locale === code
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { t, locale } = useI18n();
  const { logout, user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const driverPortal = isDriverPortalRole(user?.role);
  const u = user;
  const showHome = canSeeUiModule(u, PERM.uiDashboard);
  const showReportsBlock = canSeeUiModule(u, PERM.uiReports) || canSeeDailyBranchRegister(u);
  const showPersonnelFull = !personnelPortal && canSeeUiModule(u, PERM.uiPersonnel);
  const showPersonnelAdvancesOnly = personnelPortal && canSeeUiModule(u, PERM.uiMyAdvances);
  const showBranches = canSeeUiModule(u, PERM.uiBranches);
  const showDocuments = showBranches;
  const showGeneralOverhead =
    !personnelPortal && !driverPortal && canSeeUiModule(u, PERM.uiGeneralOverhead);
  const showInsurances = !personnelPortal && !driverPortal && canSeeUiModule(u, PERM.uiInsurances);
  const showInvShell =
    driverPortal || canSeeUiModule(u, PERM.uiWarehouse) || canSeeUiModule(u, PERM.uiProducts);
  const showWarehouseLink = driverPortal || canSeeUiModule(u, PERM.uiWarehouse);
  const showProductsBlock = !driverPortal && canSeeUiModule(u, PERM.uiProducts);
  const showProcurement = !personnelPortal && !driverPortal && canSeeUiModule(u, PERM.uiSuppliers);
  const showFleet = !personnelPortal && !driverPortal && canSeeUiModule(u, PERM.uiVehicles);
  const showStaffNotifications = hasStaffOperationsNotifications(u);
  const isSystemAdmin = hasPermissionCode(u, PERM.systemAdmin);
  const { data: branding, isSuccess: brandingLoaded } = useSystemBrandingQuery(Boolean(user));
  const brandingTitle = branding?.companyName?.trim() || t("common.appName");
  const brandingIsCustom = Boolean(branding?.companyName?.trim());

  const displayName = user
    ? (user.fullName?.trim() || user.username).toLocaleUpperCase(
        locale === "tr" ? "tr-TR" : "en-US"
      )
    : "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [reportsNavOpen, setReportsNavOpen] = useState(() =>
    isReportsSidebarContext(pathname)
  );

  useEffect(() => {
    if (isReportsSidebarContext(pathname)) setReportsNavOpen(true);
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const sidebarBody = (
    <>
      <div className="relative px-2 pb-4 pt-5 md:pt-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/35 to-fuchsia-500/0"
          aria-hidden
        />
        <div className="flex min-w-0 items-center gap-2.5">
          {brandingLoaded && branding?.hasLogo ? (
            <SidebarBrandingLogo
              hasLogo
              updatedAtUtc={branding.updatedAtUtc}
              className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain ring-1 ring-zinc-200/70"
            />
          ) : null}
          <p
            className={
              brandingIsCustom
                ? "min-w-0 flex-1 truncate text-sm font-bold leading-tight text-zinc-900"
                : "min-w-0 flex-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-zinc-600"
            }
          >
            {brandingTitle}
          </p>
        </div>
        <div className={`${navItemRow} mt-3`}>
          <Link
            href="/guide"
            onClick={() => setMobileNavOpen(false)}
            className={`${navLinkBase} min-h-12 min-w-0 px-3 py-2.5 ring-1 ring-violet-200/90 bg-gradient-to-r from-violet-50/95 to-fuchsia-50/70 text-violet-950 shadow-sm hover:from-violet-100/90 hover:to-fuchsia-100/60 hover:ring-violet-300/80 active:scale-[0.99] motion-reduce:active:scale-100 md:min-h-11 ${
              pathname === "/guide" ? "ring-2 ring-violet-400/50" : ""
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-violet-700"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="min-w-0 font-bold">{t("nav.guide")}</span>
          </Link>
          <div className={navHintCol}>
            <NavMenuHint hintKey="nav.tooltip.guide" />
          </div>
        </div>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2"
        aria-label={t("nav.mainNav")}
      >
        {showHome ? (
          <div className={navItemRow}>
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className={`${navLinkBase} min-w-0 px-3 py-2.5 ${
                pathname === "/" ? navLinkActive : navLinkIdle
              }`}
            >
              <NavGlyph name="/" />
              <span className="min-w-0">{t("nav.home")}</span>
            </Link>
            <div className={navHintCol}>
              <NavMenuHint hintKey="nav.tooltip.home" />
            </div>
          </div>
        ) : null}
        {showReportsBlock ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <button
                type="button"
                id="sidebar-reports-toggle"
                className={`${navSectionToggleBtn} md:min-h-10 ${
                  reportsNavOpen ? navSectionToggleBtnOpen : ""
                }`}
                aria-expanded={reportsNavOpen}
                aria-controls="sidebar-reports-panel"
                onClick={() => setReportsNavOpen((o) => !o)}
                aria-label={
                  reportsNavOpen
                    ? t("nav.collapseReportsSection")
                    : t("nav.expandReportsSection")
                }
              >
                <span className={`${navSidebarL1Label} flex min-w-0 flex-1 items-center`}>
                  {t("nav.reportsSection")}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`${navCollapsibleChevron} ${reportsNavOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.reports" />
              </div>
            </div>
            <NavCollapsiblePanel
              id="sidebar-reports-panel"
              labelledBy="sidebar-reports-toggle"
              open={reportsNavOpen}
              contentClassName="flex flex-col gap-0.5 pt-1"
            >
              <ReportsNavSubgroup
                subgroupId="fin-system"
                titleKey="nav.reportsFinSystemSection"
                items={reportsFinSystemSubNav}
                pathname={pathname}
                user={u}
                onItemClick={() => setMobileNavOpen(false)}
              />
              <ReportsNavSubgroup
                subgroupId="patron"
                titleKey="nav.reportsPatronSection"
                items={reportsPatronSubNav}
                pathname={pathname}
                user={u}
                onItemClick={() => setMobileNavOpen(false)}
              />
              <ReportsNavSubgroup
                subgroupId="stock"
                titleKey="nav.reportsStockSection"
                items={reportsStockSubNav}
                pathname={pathname}
                user={u}
                onItemClick={() => setMobileNavOpen(false)}
              />
              <ReportsNavSubgroup
                subgroupId="other"
                titleKey="nav.reportsOtherSection"
                items={reportsOtherSubNav}
                pathname={pathname}
                user={u}
                onItemClick={() => setMobileNavOpen(false)}
              />
            </NavCollapsiblePanel>
          </div>
        ) : null}

        {showPersonnelFull ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <p className={navSidebarL1Label}>{t("nav.personnelSection")}</p>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.personnelSection" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {personnelSubNav.map((item) => {
                const subActive =
                  item.href === "/personnel"
                    ? pathname === "/personnel"
                    : pathname.startsWith(item.href);
                const hintKey =
                  item.href === "/personnel"
                    ? "nav.tooltip.personnelList"
                    : "nav.tooltip.personnelCosts";
                return (
                  <div key={item.href} className={navItemRow}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                        subActive ? navLinkActive : navLinkIdle
                      }`}
                    >
                      <NavGlyph name={item.icon} />
                      <span className="min-w-0">{t(item.labelKey)}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey={hintKey} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : showPersonnelAdvancesOnly ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <p className={navSidebarL1Label}>{t("nav.personnelSection")}</p>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.personnelSection" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className={navItemRow}>
                <Link
                  href="/personnel/costs"
                  onClick={() => setMobileNavOpen(false)}
                  className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                    pathname.startsWith("/personnel/costs")
                      ? navLinkActive
                      : navLinkIdle
                  }`}
                >
                  <NavGlyph name="personnelCosts" />
                  <span className="min-w-0">{t("nav.personnelCosts")}</span>
                </Link>
                <div className={navHintCol}>
                  <NavMenuHint hintKey="nav.tooltip.personnelCosts" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showDocuments ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <Link
                href="/documents"
                onClick={() => setMobileNavOpen(false)}
                className={`${navLinkBase} min-w-0 px-3 py-2.5 ${
                  pathname.startsWith("/documents") ? navLinkActive : navLinkIdle
                }`}
              >
                <NavGlyph name="reportTable" />
                <span className="min-w-0">{t("nav.documents")}</span>
              </Link>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.documents" />
              </div>
            </div>
          </div>
        ) : null}

        {showBranches ? (
        <div className={navSectionBlock}>
          <div className={navItemRow}>
            <p className={navSidebarL1Label}>{t("nav.branchSection")}</p>
            <div className={navHintCol}>
              <NavMenuHint hintKey="nav.tooltip.branchSection" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className={navItemRow}>
              <Link
                href="/branches"
                onClick={() => setMobileNavOpen(false)}
                className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                  pathname.startsWith("/branches") ? navLinkActive : navLinkIdle
                }`}
              >
                <NavGlyph name="/branches" />
                <span className="min-w-0">{t("nav.branch")}</span>
              </Link>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.branch" />
              </div>
            </div>
            {showGeneralOverhead ? (
              <div className={navItemRow}>
                <Link
                  href="/general-overhead"
                  onClick={() => setMobileNavOpen(false)}
                  className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                    pathname.startsWith("/general-overhead") ? navLinkActive : navLinkIdle
                  }`}
                >
                  <NavGlyph name="generalOverhead" />
                  <span className="min-w-0">{t("nav.generalOverhead")}</span>
                </Link>
                <div className={navHintCol}>
                  <NavMenuHint hintKey="nav.tooltip.generalOverhead" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        ) : null}

        {showInsurances ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <p className={navSidebarL1Label}>{t("nav.insuranceSection")}</p>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.insuranceSection" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className={navItemRow}>
                <Link
                  href="/insurances"
                  onClick={() => setMobileNavOpen(false)}
                  className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                    pathname.startsWith("/insurances") ? navLinkActive : navLinkIdle
                  }`}
                >
                  <NavGlyph name="insurances" />
                  <span className="min-w-0">{t("nav.insurances")}</span>
                </Link>
                <div className={navHintCol}>
                  <NavMenuHint hintKey="nav.tooltip.insurances" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showInvShell ? (
          <>
            <div className={navSectionBlock}>
              <div className={navItemRow}>
                <p className={navSidebarL1Label}>{t("nav.inventorySection")}</p>
                <div className={navHintCol}>
                  <NavMenuHint hintKey="nav.tooltip.inventorySection" />
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                {showWarehouseLink ? (
                <div className={navItemRow}>
                  <Link
                    href="/warehouses"
                    onClick={() => setMobileNavOpen(false)}
                    className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                      pathname.startsWith("/warehouses")
                        ? navLinkActive
                        : navLinkIdle
                    }`}
                  >
                    <NavGlyph name="/warehouses" />
                    <span className="min-w-0">{t("nav.warehouse")}</span>
                  </Link>
                  <div className={navHintCol}>
                    <NavMenuHint hintKey="nav.tooltip.warehouse" />
                  </div>
                </div>
                ) : null}
                {showProductsBlock ? (
                  <>
                    <div className={navItemRow}>
                      <Link
                        href="/products"
                        onClick={() => setMobileNavOpen(false)}
                        className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                          pathname === "/products" ? navLinkActive : navLinkIdle
                        }`}
                      >
                        <NavGlyph name="/products" />
                        <span className="min-w-0">{t("nav.products")}</span>
                      </Link>
                      <div className={navHintCol}>
                        <NavMenuHint hintKey="nav.tooltip.products" />
                      </div>
                    </div>
                    <div className={navItemRow}>
                      <Link
                        href="/products/categories"
                        onClick={() => setMobileNavOpen(false)}
                        className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                          pathname.startsWith("/products/categories")
                            ? navLinkActive
                            : navLinkIdle
                        }`}
                      >
                        <NavGlyph name="/products" />
                        <span className="min-w-0">{t("nav.productCategories")}</span>
                      </Link>
                      <div className={navHintCol}>
                        <NavMenuHint hintKey="nav.tooltip.productCategories" />
                      </div>
                    </div>
                    <div className={navItemRow}>
                      <Link
                        href="/products/cost-history"
                        onClick={() => setMobileNavOpen(false)}
                        className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                          pathname.startsWith("/products/cost-history")
                            ? navLinkActive
                            : navLinkIdle
                        }`}
                      >
                        <NavGlyph name="reportTable" />
                        <span className="min-w-0">{t("nav.productCostHistory")}</span>
                      </Link>
                      <div className={navHintCol}>
                        <NavMenuHint hintKey="nav.tooltip.productCostHistory" />
                      </div>
                    </div>
                    <div className={navItemRow}>
                      <Link
                        href="/products/order-account-statement"
                        onClick={() => setMobileNavOpen(false)}
                        className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                          pathname.startsWith("/products/order-account-statement")
                            ? navLinkActive
                            : navLinkIdle
                        }`}
                      >
                        <NavGlyph name="reportTable" />
                        <span className="min-w-0">{t("reports.sidebarOrderAccountStatement")}</span>
                      </Link>
                      <div className={navHintCol}>
                        <NavMenuHint hintKey="nav.tooltip.productsOrderAccountStatement" />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {showProcurement ? (
              <div className={navSectionBlock}>
                <div className={navItemRow}>
                  <p className={navSidebarL1Label}>{t("nav.procurementSection")}</p>
                  <div className={navHintCol}>
                    <NavMenuHint hintKey="nav.tooltip.procurementSection" />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {procurementSubNav.map((item) => {
                    const subActive =
                      item.href === "/suppliers"
                        ? pathname === "/suppliers"
                        : pathname.startsWith(item.href);
                    return (
                      <div key={item.href} className={navItemRow}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                            subActive ? navLinkActive : navLinkIdle
                          }`}
                        >
                          <NavGlyph name={item.icon} />
                          <span className="min-w-0">{t(item.labelKey)}</span>
                        </Link>
                        <div className={navHintCol}>
                          <NavMenuHint hintKey={item.hintKey} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {showFleet ? (
              <div className={navSectionBlock}>
                <div className={navItemRow}>
                  <p className={navSidebarL1Label}>{t("nav.fleetSection")}</p>
                  <div className={navHintCol}>
                    <NavMenuHint hintKey="nav.tooltip.fleetSection" />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className={navItemRow}>
                    <Link
                      href="/vehicles"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${navLinkBase} min-w-0 py-2 pl-4 pr-2 ${
                        pathname.startsWith("/vehicles") ? navLinkActive : navLinkIdle
                      }`}
                    >
                      <NavGlyph name="/vehicles" />
                      <span className="min-w-0">{t("nav.vehicles")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.vehicles" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {driverPortal && user?.allowPersonnelSelfFinancials ? (
          <div className={navSectionBlock}>
            <div className={navItemRow}>
              <Link
                href="/me/financials"
                onClick={() => setMobileNavOpen(false)}
                className={`${navLinkBase} min-w-0 px-3 py-2.5 ${
                  pathname.startsWith("/me/financials") ? navLinkActive : navLinkIdle
                }`}
              >
                <NavGlyph name="personnelCosts" />
                <span className="min-w-0">{t("nav.myFinances")}</span>
              </Link>
              <div className={navHintCol}>
                <NavMenuHint hintKey="nav.tooltip.myFinances" />
              </div>
            </div>
          </div>
        ) : null}

        {isSystemAdmin ? (
          <div className={`${navSectionBlock} border-t-transparent pt-3`}>
            <div className={adminNavCard}>
              <div className={navItemRow}>
                <div className="flex min-h-9 min-w-0 items-center gap-2.5 pl-1.5 pr-1">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-700 shadow-inner shadow-violet-900/5 ring-1 ring-violet-500/10"
                    aria-hidden
                  >
                    <AdminSectionShieldIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-violet-950/50">
                      {t("nav.systemSection")}
                    </p>
                    <p className="truncate text-[11px] font-medium leading-tight text-zinc-500">
                      {t("nav.systemSectionSubtitle")}
                    </p>
                  </div>
                </div>
                <div className={navHintCol}>
                  <NavMenuHint hintKey="nav.tooltip.systemSection" />
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <div className={navItemRow}>
                  <Link
                    href="/admin/settings"
                    onClick={() => setMobileNavOpen(false)}
                    className={`${adminNavLinkBase} min-w-0 py-2.5 pl-3 pr-2 ${
                      pathname === "/admin/settings" ? adminNavLinkActive : adminNavLinkIdle
                    }`}
                  >
                    <NavGlyph name="settings" />
                    <span className="min-w-0">{t("nav.systemSettingsHome")}</span>
                  </Link>
                  <div className={navHintCol}>
                    <NavMenuHint hintKey="nav.tooltip.systemSettingsHome" />
                  </div>
                </div>
                <div className={`${adminNavSubLinkWrap} flex flex-col gap-1`}>
                  <div className={navItemRow}>
                    <Link
                      href="/admin/users"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${adminNavLinkBase} min-w-0 py-2.5 pl-2 pr-2 ${
                        pathname.startsWith("/admin/users") ? adminNavLinkActive : adminNavLinkIdle
                      }`}
                    >
                      <NavGlyph name="users" />
                      <span className="min-w-0">{t("nav.systemUsers")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.systemUsers" />
                    </div>
                  </div>
                  <div className={navItemRow}>
                    <Link
                      href="/admin/settings/authorization"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${adminNavLinkBase} min-w-0 py-2.5 pl-2 pr-2 ${
                        pathname.startsWith("/admin/settings/authorization")
                          ? adminNavLinkActive
                          : adminNavLinkIdle
                      }`}
                    >
                      <NavGlyph name="authz" />
                      <span className="min-w-0">{t("nav.adminNavAuthorization")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.adminNavAuthorization" />
                    </div>
                  </div>
                  <div className={navItemRow}>
                    <Link
                      href="/admin/settings/notifications"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${adminNavLinkBase} min-w-0 py-2.5 pl-2 pr-2 ${
                        pathname.startsWith("/admin/settings/notifications")
                          ? adminNavLinkActive
                          : adminNavLinkIdle
                      }`}
                    >
                      <NavGlyph name="notificationsBell" />
                      <span className="min-w-0">{t("nav.adminNavNotifications")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.adminNavNotifications" />
                    </div>
                  </div>
                  <div className={navItemRow}>
                    <Link
                      href="/admin/settings/branding"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${adminNavLinkBase} min-w-0 py-2.5 pl-2 pr-2 ${
                        pathname.startsWith("/admin/settings/branding")
                          ? adminNavLinkActive
                          : adminNavLinkIdle
                      }`}
                    >
                      <NavGlyph name="branding" />
                      <span className="min-w-0">{t("nav.adminNavBranding")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.adminNavBranding" />
                    </div>
                  </div>
                  <div className={navItemRow}>
                    <Link
                      href="/admin/settings/tourism-season-closed-policy"
                      onClick={() => setMobileNavOpen(false)}
                      className={`${adminNavLinkBase} min-w-0 py-2.5 pl-2 pr-2 ${
                        pathname.startsWith("/admin/settings/tourism-season-closed-policy")
                          ? adminNavLinkActive
                          : adminNavLinkIdle
                      }`}
                    >
                      <NavGlyph name="settings" />
                      <span className="min-w-0">{t("nav.adminNavTourismSeasonPolicy")}</span>
                    </Link>
                    <div className={navHintCol}>
                      <NavMenuHint hintKey="nav.tooltip.adminNavTourismSeasonPolicy" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </nav>
      <div className="mt-auto shrink-0 border-t border-zinc-200/80 bg-zinc-950/[0.02] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[2px]">
        <div className="mb-3 md:hidden">
          <DateDisplayFormatHint className="text-center" />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-100/90 px-3 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200/80 transition hover:bg-zinc-200/90 hover:ring-zinc-300/80 md:min-h-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 opacity-80"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t("auth.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[100dvh] flex-1 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:min-h-0 max-md:overflow-hidden md:min-h-[100dvh] md:items-stretch md:gap-3 md:bg-gradient-to-br md:from-zinc-100 md:to-zinc-200/50 md:p-3">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 md:hidden"
          aria-label={t("nav.menuClose")}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`z-50 flex h-[100dvh] max-h-[100dvh] min-h-0 w-[15.5rem] flex-col overflow-hidden max-md:border-r max-md:border-zinc-200/90 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 transition-transform duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-0 md:sticky md:top-3 md:h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-1.5rem)] md:shrink-0 md:translate-x-0 md:rounded-2xl md:border md:border-zinc-200/80 md:shadow-lg md:shadow-zinc-900/[0.06] md:ring-1 md:ring-zinc-950/[0.04] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0 items-center justify-end border-b border-zinc-200/80 bg-white/60 px-2 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-white/90 hover:text-zinc-900"
          >
            {t("common.close")}
          </button>
        </div>
        {sidebarBody}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col max-md:min-h-0 max-md:overflow-hidden md:h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-1.5rem)] md:overflow-hidden md:rounded-2xl md:border md:border-zinc-200/80 md:bg-white md:shadow-lg md:shadow-zinc-900/[0.05] md:ring-1 md:ring-zinc-950/[0.04]">
        <header className="app-shell-inline sticky top-0 z-30 flex min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0 items-center gap-2 border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top,0px)] md:rounded-t-2xl md:border-b md:border-zinc-200/90 md:bg-zinc-50/40 md:backdrop-blur-[2px]">
          <Tooltip content={t("nav.menuOpen")} delayMs={240}>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="app-sidebar"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={t("nav.menuOpen")}
            >
              <span className="sr-only">{t("nav.menuOpen")}</span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </Tooltip>
          <AppGlobalSearch />
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {user && showStaffNotifications ? <StaffHeaderNotifications /> : null}
            {user ? (
              <UserAccountMenu triggerLabel={displayName} />
            ) : null}
            <LocaleToggle />
          </div>
        </header>
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden max-md:overflow-hidden md:min-h-0">
          <div className="app-shell-inline min-h-0 min-w-0 flex-1 overflow-auto overscroll-y-contain [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] max-md:flex-1 max-md:pb-[calc(4.35rem+env(safe-area-inset-bottom,0px))] md:pt-5 md:pb-10">
            <div className="mx-auto min-h-full w-full min-w-0 max-w-full">{children}</div>
          </div>
          <footer className="app-shell-inline shrink-0 border-t border-zinc-100 bg-zinc-50/90 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-center backdrop-blur-[2px] max-md:mb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:rounded-b-2xl">
            <div className="flex flex-col items-center gap-1">
              <DateDisplayFormatHint className="max-md:leading-tight" />
              <p className="text-[10px] leading-tight tracking-wide text-zinc-400">
                {t("common.footerCredit").replace(
                  "{{year}}",
                  String(new Date().getFullYear())
                )}
              </p>
            </div>
          </footer>
          <MobileNavDock onOpenMenu={() => setMobileNavOpen(true)} />
        </main>
      </div>
    </div>
  );
}
