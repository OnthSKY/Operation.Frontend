"use client";

import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/messages";
import {
  computeOrderAccountTotals,
  type OrderAccountLine,
  type PaidOnBehalfLine,
  type PromoDeductionLine,
} from "@/modules/order-account-statement/lib/compute-order-account-totals";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { forwardRef } from "react";

export type StatementLayoutVariant =
  | "corporate"
  | "compact"
  | "minimal"
  | "invoiceClassic"
  | "eInvoice"
  | "proforma"
  | "dispatch"
  | "serviceForm";

type StatementPaperProps = {
  layoutVariant: StatementLayoutVariant;
  locale: Locale;
  companyName: string;
  branchName: string;
  emblemDataUrl?: string;
  documentTitle: string;
  showDocumentTagline: boolean;
  issuedDate: string;
  lines: OrderAccountLine[];
  showQuantityColumn: boolean;
  promoLines: PromoDeductionLine[];
  totals: ReturnType<typeof computeOrderAccountTotals>;
  advanceDeduction: number;
  previousBalance: number;
  paidOnBehalf: PaidOnBehalfLine[];
  /** İsteğe bağlı: belgenin en altına eklenen tahsilat kalemleri (tutarlar net borçtan düşülür). */
  receipts?: { id: string; description: string; amount: number }[];
  receiptsLabel?: string;
  /** İsteğe bağlı: tahsilatlar düşüldükten sonra gösterilecek kalan tutar. */
  remaining?: number;
  remainingLabel?: string;
  labels: {
    headerCompany: string;
    headerBranch: string;
    documentTagline: string;
    issuedPrefix: string;
    productCol: string;
    qtyCol: string;
    unitCol: string;
    unitPriceCol: string;
    amountCol: string;
    gross: string;
    giftTotal: string;
    advance: string;
    subtotal: string;
    previousBalance: string;
    net: string;
    giftSuffix: string;
    paidSection: string;
    promoLineFallback: string;
  };
  paymentInfo?: {
    iban?: string | null;
    accountHolder?: string | null;
    bankName?: string | null;
    paymentNote?: string | null;
    showOnPdf?: boolean;
  };
  paymentLabels: {
    section: string;
    iban: string;
    accountHolder: string;
    bankName: string;
    paymentNote: string;
  };
  documentMeta: {
    referenceId: string;
    systemDocumentId?: number | null;
    generationLabel: string;
  };
  emptyHint: string;
  /** Mobil önizleme: tablo sütunları dar ekrana göre oranlanır, taşma azaltılır. */
  previewFit?: boolean;
};

export const OrderAccountStatementPaper = forwardRef<HTMLDivElement, StatementPaperProps>(function StatementPaper(
  {
    layoutVariant,
    locale,
    companyName,
    branchName,
    emblemDataUrl,
    documentTitle,
    showDocumentTagline,
    issuedDate,
    lines,
    showQuantityColumn,
    promoLines,
    totals,
    advanceDeduction,
    previousBalance,
    paidOnBehalf,
    receipts,
    receiptsLabel,
    remaining,
    remainingLabel,
    labels,
    paymentInfo,
    paymentLabels,
    documentMeta,
    emptyHint,
    previewFit = false,
  },
  ref
) {
  const fmt = (n: number) => formatLocaleAmount(n, locale, "TRY");
  const dense = layoutVariant === "compact";
  const minimal = layoutVariant === "minimal";
  const hasQty = showQuantityColumn;
  const qtyGridCols =
    previewFit && hasQty
      ? "grid-cols-[minmax(0,1fr)_minmax(1.75rem,3.25rem)_minmax(1.75rem,3.25rem)_minmax(2rem,4.25rem)_minmax(2.25rem,4.75rem)] gap-x-1 sm:gap-x-2"
      : hasQty
        ? "grid-cols-[minmax(0,1fr)_3.75rem_4.25rem_5.5rem_6.5rem] gap-x-2 sm:gap-x-3"
        : "grid-cols-[minmax(0,1fr)_auto] gap-x-3";
  const qtyHeadPadding = dense
    ? "px-2.5 py-2 text-[8px]"
    : previewFit
      ? "px-2 py-2 text-[8px] leading-snug sm:px-4 sm:py-2.5 sm:text-[9px]"
      : "px-3 py-2.5 text-[9px] sm:px-5 sm:py-3 sm:text-[10px]";
  const paymentRowGridClass = previewFit
    ? "grid grid-cols-1 gap-1 border-t border-zinc-200 py-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3"
    : "grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-zinc-200 py-1";
  const invoiceLike = layoutVariant === "invoiceClassic" || layoutVariant === "eInvoice";
  const hasDeductions = totals.giftLinesSum > 0 || promoLines.length > 0 || advanceDeduction > 0;
  const showSubtotalRow = hasDeductions || totals.subtotal !== totals.grossTotal;
  const paymentIban = (paymentInfo?.iban ?? "").trim();
  const paymentAccountHolder = (paymentInfo?.accountHolder ?? "").trim();
  const paymentBankName = (paymentInfo?.bankName ?? "").trim();
  const paymentNote = (paymentInfo?.paymentNote ?? "").trim();
  const showPaymentSection =
    Boolean(paymentInfo?.showOnPdf) &&
    (paymentIban.length > 0 ||
      paymentAccountHolder.length > 0 ||
      paymentBankName.length > 0 ||
      paymentNote.length > 0);

  const paperThemeClass =
    layoutVariant === "invoiceClassic"
      ? "border-slate-400 shadow-[0_0_0_1px_rgba(71,85,105,0.2)]"
      : layoutVariant === "eInvoice"
      ? "border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
      : layoutVariant === "proforma"
        ? "border-sky-300 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
        : layoutVariant === "dispatch"
          ? "border-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
          : layoutVariant === "serviceForm"
            ? "border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]"
            : minimal
              ? "border-zinc-300 shadow-none"
              : "border-zinc-400 shadow-sm";

  const headerThemeClass =
    layoutVariant === "invoiceClassic"
      ? "rounded-xl border-slate-300 bg-gradient-to-b from-slate-50 to-white shadow-sm ring-1 ring-slate-300/60"
      : layoutVariant === "eInvoice"
      ? "rounded-xl border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-sm ring-1 ring-emerald-200/50"
      : layoutVariant === "proforma"
        ? "rounded-xl border-sky-200 bg-gradient-to-b from-sky-50 to-white shadow-sm ring-1 ring-sky-200/55"
        : layoutVariant === "dispatch"
          ? "rounded-xl border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm ring-1 ring-amber-200/55"
          : layoutVariant === "serviceForm"
            ? "rounded-xl border-violet-200 bg-gradient-to-b from-violet-50 to-white shadow-sm ring-1 ring-violet-200/55"
            : minimal
              ? "rounded-lg border-zinc-200 bg-zinc-50 shadow-none ring-0"
              : "rounded-xl border-zinc-200 bg-gradient-to-b from-zinc-50 to-white shadow-sm ring-1 ring-zinc-950/[0.04]";

  const titleBandClass =
    layoutVariant === "invoiceClassic"
      ? "border border-slate-400 bg-slate-100 px-3 py-2 font-black uppercase tracking-tight text-slate-950 shadow-sm"
      : layoutVariant === "eInvoice"
      ? "border border-emerald-300 bg-emerald-50/70 px-3 py-2 font-black uppercase tracking-tight text-emerald-950 shadow-sm"
      : layoutVariant === "proforma"
        ? "border border-sky-300 bg-sky-50/75 px-3 py-2 font-black uppercase tracking-tight text-sky-950 shadow-sm"
        : layoutVariant === "dispatch"
          ? "border border-amber-300 bg-amber-50/75 px-3 py-2 font-black uppercase tracking-tight text-amber-950 shadow-sm"
          : layoutVariant === "serviceForm"
            ? "border border-violet-300 bg-violet-50/75 px-3 py-2 font-black uppercase tracking-tight text-violet-950 shadow-sm"
            : "border border-zinc-300 bg-white px-3 py-2 font-black uppercase tracking-tight text-zinc-950 shadow-sm";

  const tableHeadClass =
    layoutVariant === "invoiceClassic"
      ? "grid rounded-t-lg bg-slate-900 font-bold uppercase tracking-wide text-slate-50"
      : layoutVariant === "eInvoice"
      ? "grid rounded-t-lg bg-emerald-900 font-bold uppercase tracking-wide text-emerald-50"
      : layoutVariant === "proforma"
        ? "grid rounded-t-lg bg-sky-900 font-bold uppercase tracking-wide text-sky-50"
        : layoutVariant === "dispatch"
          ? "grid rounded-t-lg bg-amber-900 font-bold uppercase tracking-wide text-amber-50"
          : layoutVariant === "serviceForm"
            ? "grid rounded-t-lg bg-violet-900 font-bold uppercase tracking-wide text-violet-50"
            : "grid rounded-t-lg bg-zinc-900 font-bold uppercase tracking-wide text-zinc-50";

  const netRowClass =
    layoutVariant === "invoiceClassic"
      ? "mt-2 flex justify-between gap-3 rounded-lg bg-slate-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
      : layoutVariant === "eInvoice"
      ? "mt-2 flex justify-between gap-3 rounded-lg bg-emerald-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
      : layoutVariant === "proforma"
        ? "mt-2 flex justify-between gap-3 rounded-lg bg-sky-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
        : layoutVariant === "dispatch"
          ? "mt-2 flex justify-between gap-3 rounded-lg bg-amber-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
          : layoutVariant === "serviceForm"
            ? "mt-2 flex justify-between gap-3 rounded-lg bg-violet-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
            : "mt-2 flex justify-between gap-3 rounded-lg bg-zinc-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3";

  function rowLabel(l: OrderAccountLine): string {
    const d = l.description.trim();
    if (!d) return "—";
    return l.isGift ? `${d} (${labels.giftSuffix})` : d;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "box-border w-full border bg-white text-zinc-900 antialiased",
        paperThemeClass,
        previewFit && "max-w-full",
        dense
          ? "px-5 py-5 text-[10px] leading-tight sm:px-6 sm:py-6"
          : previewFit
            ? "px-3 py-4 text-[10px] leading-normal sm:px-6 sm:py-6 sm:text-[11px]"
            : "px-5 py-6 text-[11px] leading-normal sm:px-8 sm:py-8 sm:text-xs md:px-10 md:py-10"
      )}
    >
      <header
        className={cn(
          "border px-4 py-4 text-center sm:px-6 sm:py-5",
          headerThemeClass,
          dense ? "px-3 py-3 sm:px-4" : ""
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-h-11 items-start">
            {emblemDataUrl ? (
              <img
                src={emblemDataUrl}
                alt=""
                className={cn(
                  "rounded-lg border border-zinc-200 bg-white object-contain p-1 shadow-sm",
                  dense ? "h-20 w-20" : previewFit ? "h-14 w-14 sm:h-24 sm:w-24" : "h-28 w-28 sm:h-32 sm:w-32"
                )}
              />
            ) : null}
          </div>
          <div className="rounded-lg border border-zinc-300 bg-white shadow-sm">
            <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-2.5 py-1.5 text-zinc-600">
              <span className={cn("font-medium", dense ? "text-[9px]" : "text-[10px] sm:text-xs")}>{labels.issuedPrefix}</span>
              <span
                className={cn(
                  "rounded border border-zinc-300 bg-zinc-50 font-semibold tabular-nums text-zinc-800",
                  dense ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[11px] sm:text-xs"
                )}
              >
                {issuedDate}
              </span>
            </div>
            <div className={cn("px-2.5 py-1.5 text-right text-zinc-700", dense ? "text-[8px]" : "text-[9px] sm:text-[10px]")}>
              <span className="font-semibold">{documentMeta.generationLabel}</span>
              <span className="mx-1.5 text-zinc-400">|</span>
              <span className="font-mono">REF: {documentMeta.referenceId}</span>
              {documentMeta.systemDocumentId ? (
                <>
                  <span className="mx-1.5 text-zinc-400">|</span>
                  <span className="font-mono">DOC: {documentMeta.systemDocumentId}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className={cn("pb-2 text-center", invoiceLike ? "border-b-2 border-zinc-900" : "border-b-2 border-zinc-900/85")}>
            <p
              className={cn(
                "font-black uppercase tracking-tight text-zinc-950",
                dense ? "text-sm leading-tight" : previewFit ? "text-base leading-tight sm:text-xl" : "text-lg leading-tight sm:text-2xl"
              )}
            >
              {companyName.trim() || "—"}
            </p>
            <p
              className={cn(
                "mt-1 font-medium text-zinc-700",
                dense ? "text-[10px]" : "text-xs sm:text-sm"
              )}
            >
              {branchName.trim() || "—"}
            </p>
          </div>
        </div>
        {showDocumentTagline ? (
          <p
            className={cn(
              "mt-3 font-semibold uppercase tracking-[0.18em] text-zinc-500",
              dense ? "text-[8px]" : "text-[10px] sm:text-[11px]"
            )}
          >
            {labels.documentTagline}
          </p>
        ) : null}
        <div className={cn("mx-auto max-w-2xl", showDocumentTagline ? "mt-3" : "mt-3")}>
          <p
            className={cn(
              titleBandClass,
              dense ? "text-xs" : "text-sm sm:text-lg"
            )}
          >
            {documentTitle.trim() || "—"}
          </p>
        </div>
      </header>

      <div className="mt-5">
        <div className={cn(tableHeadClass, qtyGridCols, qtyHeadPadding)}>
          <span className="min-w-0">{labels.productCol}</span>
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.unitCol}</span> : null}
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.qtyCol}</span> : null}
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.unitPriceCol}</span> : null}
          <span className="whitespace-nowrap text-right tabular-nums text-zinc-100">{labels.amountCol}</span>
        </div>
        <ul
          className={cn(
            "divide-y divide-zinc-200 rounded-b-lg border border-t-0 border-zinc-200",
            previewFit ? "px-2 sm:px-4" : "px-3 sm:px-5"
          )}
        >
          {lines.length === 0 ? (
            <li className="px-1 py-6 text-center italic text-zinc-400">{emptyHint}</li>
          ) : (
            lines.map((l, i) => {
              const q = (l.quantityText ?? "").trim();
              const unit = (l.unitText ?? "").trim();
              const u = (l.unitPriceText ?? "").trim();
              return (
                <li
                  key={l.id}
                  className={cn(
                    "grid items-baseline",
                    qtyGridCols,
                    previewFit && hasQty
                      ? "py-1.5 text-[8px] leading-snug sm:py-2 sm:text-[9px]"
                      : dense
                        ? "py-2"
                        : "py-2.5 sm:py-3",
                    i % 2 === 1 && "bg-zinc-50/90"
                  )}
                >
                  <span className={cn("min-w-0 text-zinc-800", previewFit ? "break-words" : "truncate")}>{rowLabel(l)}</span>
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !unit && "text-zinc-300"
                      )}
                    >
                      {unit || "—"}
                    </span>
                  ) : null}
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !q && "text-zinc-300"
                      )}
                    >
                      {q || "—"}
                    </span>
                  ) : null}
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !u && "text-zinc-300"
                      )}
                    >
                      {u || "—"}
                    </span>
                  ) : null}
                  <span className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-900">
                    {fmt(l.amount)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div
        className={cn(
          "mt-5 space-y-1 border-t border-zinc-200 px-1 pt-4 sm:px-2",
          dense ? "space-y-0.5" : "space-y-1"
        )}
      >
        <div
          className={cn(
            "flex justify-between gap-3 text-zinc-800",
            dense ? "text-[10px]" : "text-[11px] sm:text-xs"
          )}
        >
          <span>{labels.gross}</span>
          <span className="shrink-0 tabular-nums font-black text-zinc-950">{fmt(totals.grossTotal)}</span>
        </div>
        {totals.giftLinesSum > 0 ? (
          <div className="flex justify-between gap-3 text-zinc-800">
            <span>{labels.giftTotal}</span>
            <span className="shrink-0 tabular-nums">−{fmt(totals.giftLinesSum)}</span>
          </div>
        ) : null}
        {promoLines.map((p) => (
          <div key={p.id} className="flex justify-between gap-3 text-zinc-800">
            <span className="min-w-0 break-words">{p.description.trim() || labels.promoLineFallback}</span>
            <span className="shrink-0 tabular-nums">−{fmt(p.amount)}</span>
          </div>
        ))}
        {advanceDeduction > 0 ? (
          <div className="flex justify-between gap-3 text-zinc-800">
            <span>{labels.advance}</span>
            <span className="shrink-0 tabular-nums">−{fmt(advanceDeduction)}</span>
          </div>
        ) : null}
        {showSubtotalRow ? (
          <div
            className={cn(
              "flex justify-between gap-3 border-t border-zinc-300 pt-2 font-black text-zinc-950",
              dense ? "text-[10px]" : "text-[11px] sm:text-xs"
            )}
          >
            <span>{labels.subtotal}</span>
            <span className="shrink-0 tabular-nums">{fmt(totals.subtotal)}</span>
          </div>
        ) : null}
        {previousBalance > 0 ? (
          <div
            className={cn(
              "mt-1 flex justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-100/80 px-2 py-1.5 font-semibold text-zinc-900",
              dense ? "text-[10px]" : "text-[11px] sm:text-xs"
            )}
          >
            <span>{labels.previousBalance}</span>
            <span className="shrink-0 tabular-nums">+{fmt(previousBalance)}</span>
          </div>
        ) : null}
        {paidOnBehalf.length > 0 ? (
          <div className="border-t border-dashed border-zinc-300 pt-2">
            <p
              className={cn(
                "mb-2 inline-block rounded-md bg-zinc-200 px-2 py-1 font-black uppercase tracking-wide text-zinc-900",
                dense ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              )}
            >
              {labels.paidSection}
            </p>
            {paidOnBehalf.map((p) => (
              <div key={p.id} className="flex justify-between gap-3 py-0.5 text-zinc-800">
                <span className="min-w-0 break-words">{p.description.trim() || "—"}</span>
                <span className="shrink-0 tabular-nums font-semibold text-zinc-900">+{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {showPaymentSection ? (
          <div className="mt-2 rounded-md border border-zinc-400 bg-white px-2.5 py-2 text-zinc-800 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.03)]">
            <p
              className={cn(
                "mb-2 inline-flex rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-black uppercase tracking-wide text-zinc-900",
                dense ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              )}
            >
              {paymentLabels.section}
            </p>
            {paymentIban ? (
              <div className={paymentRowGridClass}>
                <span className="font-semibold text-zinc-700">{paymentLabels.iban}</span>
                <span className="break-all text-right tabular-nums">{paymentIban}</span>
              </div>
            ) : null}
            {paymentAccountHolder ? (
              <div className={paymentRowGridClass}>
                <span className="font-semibold text-zinc-700">{paymentLabels.accountHolder}</span>
                <span className="text-right">{paymentAccountHolder}</span>
              </div>
            ) : null}
            {paymentBankName ? (
              <div className={paymentRowGridClass}>
                <span className="font-semibold text-zinc-700">{paymentLabels.bankName}</span>
                <span className="text-right">{paymentBankName}</span>
              </div>
            ) : null}
            {paymentNote ? (
              <div className={paymentRowGridClass}>
                <span className="font-semibold text-zinc-700">{paymentLabels.paymentNote}</span>
                <span className="text-right">{paymentNote}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            netRowClass,
            dense ? "text-[9px]" : "text-[10px] sm:text-xs"
          )}
        >
          <span>{labels.net}</span>
          <span className="shrink-0 tabular-nums">{fmt(totals.netDue)}</span>
        </div>
        {receipts && receipts.length > 0 ? (
          <div className="mt-2 border-t border-dashed border-zinc-300 pt-2">
            <p
              className={cn(
                "mb-2 inline-block rounded-md bg-emerald-100 px-2 py-1 font-black uppercase tracking-wide text-emerald-900",
                dense ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              )}
            >
              {receiptsLabel ?? "—"}
            </p>
            {receipts.map((rcp) => (
              <div key={rcp.id} className="flex justify-between gap-3 py-0.5 text-zinc-800">
                <span className="min-w-0 break-words">{rcp.description.trim() || "—"}</span>
                <span className="shrink-0 tabular-nums font-semibold text-emerald-700">−{fmt(rcp.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {remaining != null ? (
          <div
            className={cn(
              "mt-2 flex justify-between gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2.5 font-black uppercase tracking-wide text-amber-950 shadow-sm sm:px-4 sm:py-3",
              dense ? "text-[9px]" : "text-[10px] sm:text-xs"
            )}
          >
            <span>{remainingLabel ?? "—"}</span>
            <span className="shrink-0 tabular-nums">{fmt(remaining)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export { OrderAccountStatementPaper as StatementPaper };
