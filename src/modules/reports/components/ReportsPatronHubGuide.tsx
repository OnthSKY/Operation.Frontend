"use client";

import { useI18n } from "@/i18n/context";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sky-ops-reports-patron-guide-open";

export function ReportsPatronHubGuide() {
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
          <p>{t("reports.patronHubGuideIntro")}</p>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideFlowTitle")}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
              <li>{t("reports.patronHubGuideFlow1")}</li>
              <li>{t("reports.patronHubGuideFlow2")}</li>
              <li>{t("reports.patronHubGuideFlow3")}</li>
            </ol>
          </div>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideTabsTitle")}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>
                <span className="font-semibold text-zinc-900">
                  {t("reports.tabFinancial")}
                </span>
                {" — "}
                {t("reports.patronHubGuideTabFinancial")}
              </li>
              <li>
                <span className="font-semibold text-zinc-900">
                  {t("reports.tabCashPosition")}
                </span>
                {" — "}
                {t("reports.patronHubGuideTabCash")}
              </li>
              <li>
                <span className="font-semibold text-zinc-900">
                  {t("reports.tabStock")}
                </span>
                {" — "}
                {t("reports.patronHubGuideTabStock")}
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/75">
              {t("reports.patronHubGuideElsewhereTitle")}
            </p>
            <ul className="mt-2 space-y-2">
              <li>
                <Link href="/branches" className={linkClass}>
                  {t("reports.patronHubGuideLinkBranchesLabel")}
                </Link>
                <span className="text-zinc-700">
                  {" — "}
                  {t("reports.patronHubGuideLinkBranchesDesc")}
                </span>
              </li>
              <li>
                <Link href="/personnel/costs" className={linkClass}>
                  {t("reports.patronHubGuideLinkPersonnelLabel")}
                </Link>
                <span className="text-zinc-700">
                  {" — "}
                  {t("reports.patronHubGuideLinkPersonnelDesc")}
                </span>
              </li>
              <li>
                <Link href="/warehouses" className={linkClass}>
                  {t("reports.patronHubGuideLinkWarehousesLabel")}
                </Link>
                <span className="text-zinc-700">
                  {" — "}
                  {t("reports.patronHubGuideLinkWarehousesDesc")}
                </span>
              </li>
              <li>
                <Link href="/reports/patron-flow" className={linkClass}>
                  {t("reports.patronHubGuideLinkPatronFlowLabel")}
                </Link>
                <span className="text-zinc-700">
                  {" — "}
                  {t("reports.patronHubGuideLinkPatronFlowDesc")}
                </span>
              </li>
              <li>
                <Link href="/reports/branches" className={linkClass}>
                  {t("reports.patronHubGuideLinkBranchCompareLabel")}
                </Link>
                <span className="text-zinc-700">
                  {" — "}
                  {t("reports.patronHubGuideLinkBranchCompareDesc")}
                </span>
              </li>
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-zinc-600">
            {t("reports.patronHubGuideFooterNote")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
