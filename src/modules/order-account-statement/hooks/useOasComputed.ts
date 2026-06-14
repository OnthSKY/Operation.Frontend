"use client";

import { useMemo } from "react";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import { computeOrderAccountTotals } from "@/modules/order-account-statement/lib/compute-order-account-totals";
import {
  parseLines,
  parsePaid,
  parsePromo,
} from "@/modules/order-account-statement/components/oas-helpers";
import type { SelectOption } from "@/shared/ui/Select";
import type {
  LineDraft,
  PaidDraft,
  PromoDraft,
} from "@/modules/order-account-statement/components/oas-types";
type BranchOption = { id: number; name: string };

/**
 * Orchestrator'da çoğalmış useMemo + tek seferlik türetmeleri tek yerde toplar:
 * parse, totals, preview filtreleri, label/select option sözlükleri, advance/previous
 * gibi parse edilmiş sayısal değerler.
 *
 * SRP: yalnızca türetme. Yan etki yok; pure hook.
 */
type Params = {
  t: (k: string) => string;
  locale: "tr" | "en";
  lines: LineDraft[];
  paidLines: PaidDraft[];
  promoLines: PromoDraft[];
  advanceText: string;
  previousBalanceText: string;
  statementDate: Date;
  branches: BranchOption[];
};

export function useOasComputed(p: Params) {
  const { t, locale, lines, paidLines, promoLines, advanceText, previousBalanceText, statementDate, branches } = p;

  const lineCompact = lines.length > 1;
  /** 4+ satır: liste ve tabloda ek sıkılaştırma */
  const lineDense = lines.length > 3;

  const parsedLines = useMemo(() => parseLines(lines, locale), [lines, locale]);
  const parsedPaid = useMemo(() => parsePaid(paidLines, locale), [paidLines, locale]);
  const parsedPromo = useMemo(() => parsePromo(promoLines, locale), [promoLines, locale]);

  const advanceDeduction = Math.max(0, parseLocaleAmount(advanceText, locale) || 0);
  const previousBalance = Math.max(0, parseLocaleAmount(previousBalanceText, locale) || 0);

  const totals = useMemo(
    () => computeOrderAccountTotals(parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance),
    [parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance]
  );

  const issuedDateLabel = useMemo(
    () =>
      statementDate.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale, statementDate]
  );

  const previewLines = useMemo(
    () => parsedLines.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedLines]
  );
  const previewPaid = useMemo(
    () => parsedPaid.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPaid]
  );
  const previewPromo = useMemo(
    () => parsedPromo.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPromo]
  );

  const labels = useMemo(
    () => ({
      headerCompany: t("reports.orderAccountStatementHeaderCompany"),
      headerBranch: t("reports.orderAccountStatementHeaderBranch"),
      documentTagline: t("reports.orderAccountStatementDocumentTagline"),
      issuedPrefix: t("reports.orderAccountStatementIssuedPrefix"),
      productCol: t("reports.orderAccountStatementColProduct"),
      qtyCol: t("reports.orderAccountStatementColQty"),
      unitCol: t("reports.orderAccountStatementUnit"),
      unitPriceCol: t("reports.orderAccountStatementUnitPrice"),
      amountCol: t("reports.orderAccountStatementColAmount"),
      gross: t("reports.orderAccountStatementGross"),
      giftTotal: t("reports.orderAccountStatementGiftTotalLine"),
      advance: t("reports.orderAccountStatementAdvanceLine"),
      subtotal: t("reports.orderAccountStatementSubtotal"),
      previousBalance: t("reports.orderAccountStatementPreviousBalanceLine"),
      net: t("reports.orderAccountStatementNet"),
      giftSuffix: t("reports.orderAccountStatementGiftSuffix"),
      paidSection: t("reports.orderAccountStatementPaidSectionPdf"),
      promoLineFallback: t("reports.orderAccountStatementPromoLineFallback"),
    }),
    [t]
  );

  const layoutSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "corporate", label: t("reports.orderAccountStatementLayoutCorporate") },
      { value: "compact", label: t("reports.orderAccountStatementLayoutCompact") },
      { value: "minimal", label: t("reports.orderAccountStatementLayoutMinimal") },
      { value: "invoiceClassic", label: t("reports.orderAccountStatementLayoutInvoiceClassic") },
      { value: "eInvoice", label: t("reports.orderAccountStatementLayoutEInvoice") },
      { value: "proforma", label: t("reports.orderAccountStatementLayoutProforma") },
      { value: "dispatch", label: t("reports.orderAccountStatementLayoutDispatch") },
      { value: "serviceForm", label: t("reports.orderAccountStatementLayoutServiceForm") },
    ],
    [t]
  );

  const contentSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "custom", label: t("reports.orderAccountStatementContentCustom") },
      { value: "tekin", label: t("reports.orderAccountStatementContentTekin") },
      { value: "cafe", label: t("reports.orderAccountStatementContentCafe") },
      { value: "bakery", label: t("reports.orderAccountStatementContentBakery") },
      { value: "catering", label: t("reports.orderAccountStatementContentCatering") },
    ],
    [t]
  );

  const branchSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("reports.orderAccountStatementSystemBranchNone") },
      ...branches
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, locale, t]
  );

  return {
    lineCompact,
    lineDense,
    parsedLines,
    parsedPaid,
    parsedPromo,
    advanceDeduction,
    previousBalance,
    totals,
    issuedDateLabel,
    previewLines,
    previewPaid,
    previewPromo,
    labels,
    layoutSelectOptions,
    contentSelectOptions,
    branchSelectOptions,
  };
}
