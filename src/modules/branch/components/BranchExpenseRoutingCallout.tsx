"use client";

import { useI18n } from "@/i18n/context";
import Link from "next/link";
import { useId, useState } from "react";

type Variant = "full" | "personnel-only";

export function BranchExpenseRoutingCallout({ variant }: { variant: Variant }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const uid = useId().replace(/:/g, "");
  const detailsId = `branch-expense-routing-${uid}`;
  const linkClass =
    "font-semibold text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950";

  const isPersonnelOnly = variant === "personnel-only";
  const tone = isPersonnelOnly
    ? {
        wrap: "border-violet-200/70 bg-violet-50/50 text-violet-950",
        title: "text-violet-950",
        button:
          "border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-900 focus-visible:ring-violet-400",
      }
    : {
        wrap: "border-sky-200/70 bg-sky-50/45 text-sky-950",
        title: "text-sky-950",
        button:
          "border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:text-sky-900 focus-visible:ring-sky-400",
      };

  const title = isPersonnelOnly
    ? t("branch.txRoutingPersonnelOnlyTitle")
    : t("branch.txExpenseRoutingTitle");
  const ariaLabel = `${title} — ${t("common.sectionInfoExplainButton")}`;

  return (
    <div
      role="note"
      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed sm:text-sm ${tone.wrap}`}
    >
      <div className="flex items-center gap-2">
        <p className={`min-w-0 flex-1 font-semibold ${tone.title}`}>{title}</p>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border shadow-sm transition focus-visible:outline focus-visible:ring-2 ${tone.button}`}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {open ? (
        <div id={detailsId} className="mt-2">
          {isPersonnelOnly ? (
            <>
              <p className="text-violet-900/90">{t("branch.txRoutingPersonnelOnlyBody")}</p>
              <Link href="/personnel/costs" className={`mt-2 inline-block ${linkClass}`}>
                {t("branch.txExpenseRoutingPersonnelHrefLabel")}
              </Link>
            </>
          ) : (
            <>
              <p className="text-sky-900/88">{t("branch.txExpenseRoutingIntro")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-sky-900/90">
                <li>
                  <span className="font-medium text-sky-950">
                    {t("branch.txExpenseRoutingSupplierInvoices")}
                  </span>{" "}
                  <Link href="/suppliers/invoices" className={linkClass}>
                    {t("branch.txExpenseRoutingSupplierHrefLabel")}
                  </Link>
                </li>
                <li>
                  <span className="font-medium text-sky-950">
                    {t("branch.txExpenseRoutingPersonnelCosts")}
                  </span>{" "}
                  <Link href="/personnel/costs" className={linkClass}>
                    {t("branch.txExpenseRoutingPersonnelHrefLabel")}
                  </Link>
                </li>
                <li>
                  <span className="font-medium text-sky-950">
                    {t("branch.txExpenseRoutingVehicleCosts")}
                  </span>{" "}
                  <Link href="/vehicles" className={linkClass}>
                    {t("branch.txExpenseRoutingVehicleHrefLabel")}
                  </Link>
                </li>
              </ul>
              <p className="mt-2 border-t border-sky-200/60 pt-2 text-[0.7rem] text-sky-900/82 sm:text-xs">
                {t("branch.txExpenseRoutingBranchForm")}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
