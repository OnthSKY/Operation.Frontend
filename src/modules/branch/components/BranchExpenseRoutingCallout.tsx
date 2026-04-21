"use client";

import { useI18n } from "@/i18n/context";
import Link from "next/link";

type Variant = "full" | "personnel-only";

export function BranchExpenseRoutingCallout({ variant }: { variant: Variant }) {
  const { t } = useI18n();
  const linkClass =
    "font-semibold text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950";

  if (variant === "personnel-only") {
    return (
      <div
        role="note"
        className="rounded-lg border border-violet-200/70 bg-violet-50/50 px-3 py-2.5 text-xs leading-relaxed text-violet-950 sm:text-sm"
      >
        <p className="font-semibold text-violet-950">{t("branch.txRoutingPersonnelOnlyTitle")}</p>
        <p className="mt-1 text-violet-900/90">{t("branch.txRoutingPersonnelOnlyBody")}</p>
        <Link href="/personnel/costs" className={`mt-2 inline-block ${linkClass}`}>
          {t("branch.txExpenseRoutingPersonnelHrefLabel")}
        </Link>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="rounded-lg border border-sky-200/70 bg-sky-50/45 px-3 py-3 text-xs leading-relaxed text-sky-950 sm:text-sm"
    >
      <p className="font-semibold text-sky-950">{t("branch.txExpenseRoutingTitle")}</p>
      <p className="mt-1 text-sky-900/88">{t("branch.txExpenseRoutingIntro")}</p>
      <ul className="mt-2 list-inside list-disc space-y-1.5 text-sky-900/90">
        <li>
          <span className="font-medium text-sky-950">{t("branch.txExpenseRoutingSupplierInvoices")}</span>{" "}
          <Link href="/suppliers/invoices" className={linkClass}>
            {t("branch.txExpenseRoutingSupplierHrefLabel")}
          </Link>
        </li>
        <li>
          <span className="font-medium text-sky-950">{t("branch.txExpenseRoutingPersonnelCosts")}</span>{" "}
          <Link href="/personnel/costs" className={linkClass}>
            {t("branch.txExpenseRoutingPersonnelHrefLabel")}
          </Link>
        </li>
        <li>
          <span className="font-medium text-sky-950">{t("branch.txExpenseRoutingVehicleCosts")}</span>{" "}
          <Link href="/vehicles" className={linkClass}>
            {t("branch.txExpenseRoutingVehicleHrefLabel")}
          </Link>
        </li>
      </ul>
      <p className="mt-2 border-t border-sky-200/60 pt-2 text-[0.7rem] text-sky-900/82 sm:text-xs">
        {t("branch.txExpenseRoutingBranchForm")}
      </p>
    </div>
  );
}
