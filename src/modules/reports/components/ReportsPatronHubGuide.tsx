"use client";

import { useI18n } from "@/i18n/context";
import type { ReportsHubTab } from "@/modules/reports/lib/reports-hub-paths";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sky-ops-reports-patron-guide-open";

type ElsewhereItem = {
  href: string;
  labelKey: string;
  descKey: string;
};

const INTRO_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideIntroFinancial",
  cash: "reports.patronHubGuideIntroCash",
  stock: "reports.patronHubGuideIntroStock",
};

const FLOW1_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideFlow1Financial",
  cash: "reports.patronHubGuideFlow1Cash",
  stock: "reports.patronHubGuideFlow1Stock",
};

const FLOW2_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideFlow2Financial",
  cash: "reports.patronHubGuideFlow2Cash",
  stock: "reports.patronHubGuideFlow2Stock",
};

const FLOW3_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideFlow3Financial",
  cash: "reports.patronHubGuideFlow3Cash",
  stock: "reports.patronHubGuideFlow3Stock",
};

const TAB_ANSWER_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideTabFinancial",
  cash: "reports.patronHubGuideTabCash",
  stock: "reports.patronHubGuideTabStock",
};

const FOOTER_KEYS: Record<ReportsHubTab, string> = {
  financial: "reports.patronHubGuideFooterFinancial",
  cash: "reports.patronHubGuideFooterCash",
  stock: "reports.patronHubGuideFooterStock",
};

const ELSEWHERE_BY_TAB: Record<ReportsHubTab, ElsewhereItem[]> = {
  financial: [
    {
      href: "/branches",
      labelKey: "reports.patronHubGuideLinkBranchesLabel",
      descKey: "reports.patronHubGuideLinkBranchesDesc",
    },
    {
      href: "/personnel/costs",
      labelKey: "reports.patronHubGuideLinkPersonnelLabel",
      descKey: "reports.patronHubGuideLinkPersonnelDesc",
    },
    {
      href: "/reports/patron-flow",
      labelKey: "reports.patronHubGuideLinkPatronFlowLabel",
      descKey: "reports.patronHubGuideLinkPatronFlowDesc",
    },
    {
      href: "/reports/branches",
      labelKey: "reports.patronHubGuideLinkBranchCompareLabel",
      descKey: "reports.patronHubGuideLinkBranchCompareDesc",
    },
  ],
  cash: [
    {
      href: "/branches",
      labelKey: "reports.patronHubGuideLinkBranchesLabel",
      descKey: "reports.patronHubGuideLinkBranchesDesc",
    },
    {
      href: "/reports/financial",
      labelKey: "reports.patronHubGuideLinkFinancialHubLabel",
      descKey: "reports.patronHubGuideLinkFinancialHubDesc",
    },
    {
      href: "/reports/cash",
      labelKey: "reports.patronHubGuideLinkCashTablesLabel",
      descKey: "reports.patronHubGuideLinkCashTablesDesc",
    },
    {
      href: "/reports/patron-flow",
      labelKey: "reports.patronHubGuideLinkPatronFlowLabel",
      descKey: "reports.patronHubGuideLinkPatronFlowDesc",
    },
  ],
  stock: [
    {
      href: "/warehouses",
      labelKey: "reports.patronHubGuideLinkWarehousesLabel",
      descKey: "reports.patronHubGuideLinkWarehousesDesc",
    },
    {
      href: "/branches",
      labelKey: "reports.patronHubGuideLinkBranchesLabel",
      descKey: "reports.patronHubGuideLinkBranchesStockDesc",
    },
    {
      href: "/reports/stock/tables",
      labelKey: "reports.patronHubGuideLinkStockTablesLabel",
      descKey: "reports.patronHubGuideLinkStockTablesDesc",
    },
  ],
};

export function ReportsPatronHubGuide({ tab }: { tab: ReportsHubTab }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "0") setOpen(false);
      if (v === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const introKey = INTRO_KEYS[tab];
  const flow1Key = FLOW1_KEYS[tab];
  const flow2Key = FLOW2_KEYS[tab];
  const flow3Key = FLOW3_KEYS[tab];
  const tabAnswerKey = TAB_ANSWER_KEYS[tab];
  const footerKey = FOOTER_KEYS[tab];

  const elsewhere = useMemo(() => ELSEWHERE_BY_TAB[tab], [tab]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const linkClass =
    "font-semibold text-emerald-900 underline-offset-2 hover:underline";

  return (
    <section
      className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/25 p-3 shadow-sm ring-1 ring-emerald-100/45 sm:p-4"
      aria-labelledby="reports-patron-guide-heading"
    >
      <button
        type="button"
        id="reports-patron-guide-heading"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full min-h-11 touch-manipulation items-start justify-between gap-3 rounded-lg text-left outline-none ring-emerald-400/40 focus-visible:ring-2 sm:min-h-0"
      >
        <span className="min-w-0">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-900/80">
            {t("reports.patronHubGuideEyebrow")}
          </span>
          <span className="mt-1 block text-sm font-semibold leading-snug text-zinc-900">
            {t("reports.patronHubGuideTitle")}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-600">
            {open
              ? t("reports.patronHubGuideOpenHint")
              : t("reports.patronHubGuideClosedHint")}
          </span>
        </span>
        <span className="mt-0.5 shrink-0 text-emerald-800/70" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-emerald-200/50 pt-4 text-sm leading-relaxed text-zinc-800">
          <p>{t(introKey)}</p>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideFlowTitle")}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
              <li>{t(flow1Key)}</li>
              <li>{t(flow2Key)}</li>
              <li>{t(flow3Key)}</li>
            </ol>
          </div>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideThisTabTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-800">{t(tabAnswerKey)}</p>
          </div>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideElsewhereTitle")}
            </p>
            <ul className="mt-2 space-y-2">
              {elsewhere.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {t(item.labelKey)}
                  </Link>
                  <span className="text-zinc-700">
                    {" — "}
                    {t(item.descKey)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-zinc-600">{t(footerKey)}</p>
        </div>
      ) : null}
    </section>
  );
}
