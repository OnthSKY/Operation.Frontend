"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type TabId =
  | "mission"
  | "nav"
  | "dashboard"
  | "flows"
  | "reports"
  | "personnel"
  | "branch"
  | "warehouse"
  | "suppliers"
  | "vehicles"
  | "products"
  | "admin"
  | "tips"
  | "portal";

const SECTION_TITLE_KEYS: Record<TabId, string> = {
  mission: "guide.mission.title",
  nav: "guide.nav.title",
  dashboard: "guide.dashboard.title",
  flows: "guide.flows.title",
  reports: "guide.reports.title",
  personnel: "guide.personnel.title",
  branch: "guide.branch.title",
  warehouse: "guide.warehouse.title",
  suppliers: "guide.suppliers.title",
  vehicles: "guide.vehicles.title",
  products: "guide.products.title",
  admin: "guide.admin.title",
  tips: "guide.footer.title",
  portal: "guide.portal.title",
};

const WHATS_NEW_KEYS: Record<TabId, string> = {
  mission: "guide.mission.whatsNew",
  nav: "guide.nav.whatsNew",
  dashboard: "guide.dashboard.whatsNew",
  flows: "guide.flows.whatsNew",
  reports: "guide.reports.whatsNew",
  personnel: "guide.personnel.whatsNew",
  branch: "guide.branch.whatsNew",
  warehouse: "guide.warehouse.whatsNew",
  suppliers: "guide.suppliers.whatsNew",
  vehicles: "guide.vehicles.whatsNew",
  products: "guide.products.whatsNew",
  admin: "guide.admin.whatsNew",
  tips: "guide.footer.whatsNew",
  portal: "guide.portal.whatsNew",
};

function P({ children }: { children: ReactNode }) {
  return <p className="text-pretty">{children}</p>;
}

const jumpClass =
  "group mt-1 inline-flex min-h-[3.25rem] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 text-base font-semibold text-zinc-900 shadow-sm transition-[transform,box-shadow,background-color] duration-200 hover:bg-white hover:shadow-md active:bg-zinc-100 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 sm:mt-2 sm:w-auto sm:min-w-[12rem]";

function Jump({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(jumpClass)}>
      <span className="text-center">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-violet-600 motion-safe:transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function GuidePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const isAdmin = user?.role === "ADMIN";

  const tabIds = useMemo(
    () =>
      personnelPortal
        ? (["mission", "nav", "portal", "branch", "tips"] as const)
        : ([
            "mission",
            "nav",
            "dashboard",
            "flows",
            "reports",
            "personnel",
            "branch",
            "warehouse",
            "suppliers",
            "vehicles",
            "products",
            ...(isAdmin ? (["admin"] as const) : []),
            "tips",
          ] as const),
    [personnelPortal, isAdmin]
  );

  const [active, setActive] = useState<TabId>(tabIds[0]!);

  useEffect(() => {
    if (!(tabIds as readonly TabId[]).includes(active)) {
      setActive(tabIds[0]!);
    }
  }, [tabIds, active]);

  const safeActive = (tabIds as readonly TabId[]).includes(active)
    ? active
    : tabIds[0]!;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 pb-28 pt-4 sm:space-y-6 sm:px-4 sm:pb-10 sm:pt-6 md:max-w-5xl md:px-6 md:py-8 lg:max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl min-[1920px]:max-w-[min(112rem,calc(100vw-4rem))]">
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-pretty text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t("guide.pageTitle")}
        </h1>
        <p className="text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg">
          {t("guide.pageLead")}
        </p>
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 p-4 text-base leading-snug text-amber-950 sm:items-start sm:text-[0.95rem] sm:leading-relaxed"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
            aria-hidden
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <p className="min-w-0 pt-0.5">{t("guide.roleNote")}</p>
        </div>
      </header>

      <div
        className="-mx-1 flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t("guide.tabsAria")}
      >
        {tabIds.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={safeActive === id}
            id={`guide-tab-${id}`}
            aria-controls={`guide-panel-${id}`}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition min-h-11 sm:min-h-10",
              safeActive === id
                ? "bg-zinc-900 text-white shadow-md"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/90 hover:text-zinc-900"
            )}
            onClick={() => setActive(id)}
          >
            {t(`guide.tocShort.${id}`)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`guide-panel-${safeActive}`}
        aria-labelledby={`guide-tab-${safeActive}`}
        className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-900/[0.04] sm:p-6"
      >
        <h2 className="text-lg font-bold leading-snug text-zinc-900 sm:text-xl">
          {t(SECTION_TITLE_KEYS[safeActive])}
        </h2>

        {t(WHATS_NEW_KEYS[safeActive]).trim() ? (
          <div className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/90 p-4 text-sm leading-relaxed text-violet-950 sm:text-[0.95rem]">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-violet-800/90">
              {t("guide.whatsNewTitle")}
            </p>
            <p className="mt-2 text-pretty">{t(WHATS_NEW_KEYS[safeActive])}</p>
          </div>
        ) : null}

        <div className="mt-4 space-y-3 text-base leading-relaxed text-zinc-600 sm:text-[0.95rem] sm:leading-relaxed md:text-base">
          {safeActive === "mission" ? (
            <>
              <P>{t("guide.mission.p1")}</P>
              <P>{t("guide.mission.p2")}</P>
              <P>{t("guide.mission.p3")}</P>
              <P>{t("guide.mission.p4")}</P>
              <P>{t("guide.mission.p5")}</P>
              <P>{t("guide.mission.p6")}</P>
            </>
          ) : null}

          {safeActive === "nav" ? (
            <>
              <P>{t("guide.nav.p1")}</P>
              <P>{t("guide.nav.p2")}</P>
              <P>{t("guide.nav.p3")}</P>
            </>
          ) : null}

          {safeActive === "portal" ? (
            <>
              <P>{t("guide.portal.p1")}</P>
              <P>{t("guide.portal.p2")}</P>
              <P>{t("guide.portal.p3")}</P>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                <Jump href="/branches" label={t("guide.portal.goBranch")} />
                <Jump
                  href="/personnel/costs"
                  label={t("guide.portal.goAdvances")}
                />
              </div>
            </>
          ) : null}

          {safeActive === "dashboard" ? (
            <>
              <P>{t("guide.dashboard.p1")}</P>
              <P>{t("guide.dashboard.p2")}</P>
              <Jump href="/" label={t("guide.dashboard.go")} />
            </>
          ) : null}

          {safeActive === "flows" ? (
            <>
              <P>{t("guide.flows.p1")}</P>
              <P>{t("guide.flows.p2")}</P>
              <P>{t("guide.flows.p3")}</P>
              <P>{t("guide.flows.p4")}</P>
              <P>{t("guide.flows.p5")}</P>
              <P>{t("guide.flows.p6")}</P>
              <P>{t("guide.flows.p7")}</P>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                <Jump href="/" label={t("guide.flows.goHome")} />
                <Jump href="/branches" label={t("guide.flows.goBranch")} />
                <Jump href="/reports" label={t("guide.flows.goReports")} />
              </div>
            </>
          ) : null}

          {safeActive === "reports" ? (
            <>
              <P>{t("guide.reports.p1")}</P>
              <P>{t("guide.reports.p2")}</P>
              <Jump href="/reports" label={t("guide.reports.go")} />
            </>
          ) : null}

          {safeActive === "personnel" ? (
            <>
              <P>{t("guide.personnel.p1")}</P>
              <P>{t("guide.personnel.p2")}</P>
              <P>{t("guide.personnel.p3")}</P>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                <Jump href="/personnel" label={t("guide.personnel.goList")} />
                <Jump
                  href="/personnel/costs"
                  label={t("guide.personnel.goAdvances")}
                />
              </div>
            </>
          ) : null}

          {safeActive === "branch" ? (
            <>
              <P>{t("guide.branch.p1")}</P>
              <P>{t("guide.branch.p2")}</P>
              <P>{t("guide.branch.p3")}</P>
              <Jump href="/branches" label={t("guide.branch.go")} />
            </>
          ) : null}

          {safeActive === "warehouse" ? (
            <>
              <P>{t("guide.warehouse.p1")}</P>
              <P>{t("guide.warehouse.p2")}</P>
              <Jump href="/warehouses" label={t("guide.warehouse.go")} />
            </>
          ) : null}

          {safeActive === "suppliers" ? (
            <>
              <P>{t("guide.suppliers.p1")}</P>
              <P>{t("guide.suppliers.p2")}</P>
              <P>{t("guide.suppliers.p3")}</P>
              <P>{t("guide.suppliers.p4")}</P>
              <P>{t("guide.suppliers.p5")}</P>
              <Jump href="/suppliers" label={t("guide.suppliers.go")} />
            </>
          ) : null}

          {safeActive === "vehicles" ? (
            <>
              <P>{t("guide.vehicles.p1")}</P>
              <P>{t("guide.vehicles.p2")}</P>
              <P>{t("guide.vehicles.p3")}</P>
              <P>{t("guide.vehicles.p4")}</P>
              <Jump href="/vehicles" label={t("guide.vehicles.go")} />
            </>
          ) : null}

          {safeActive === "products" ? (
            <>
              <P>{t("guide.products.p1")}</P>
              <Jump href="/products" label={t("guide.products.go")} />
            </>
          ) : null}

          {safeActive === "admin" ? (
            <>
              <P>{t("guide.admin.p1")}</P>
              <Jump href="/admin/users" label={t("guide.admin.go")} />
            </>
          ) : null}

          {safeActive === "tips" ? (
            <>
              <P>{t("guide.footer.p1")}</P>
              <P>{t("guide.footer.p2")}</P>
              <P>{t("guide.footer.p3")}</P>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
