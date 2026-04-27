"use client";
import {
  branchTxGeneralOverheadLine,
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  branchTxLinkedVehicleLine,
  cashSettlementPartyLabel,
  expensePaymentSourceLabel,
  expensePaymentSourceLabelShort,
  branchTxUnpaidInvoice,
  branchTxFormIsSupplierInvoiceLine,
  isNonPnlMemoClassificationMain,
  txCategoryLine,
  txCodeLabel,
  TX_MAIN_IN,
  TX_MAIN_OUT,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  branchDashboardScopeActive,
  type BranchDashboardStockScope,
} from "@/modules/branch/api/branches-api";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import type { Locale } from "@/i18n/messages";
import type {
  BranchIncomePeriodSummary,
  BranchRegisterSummary,
  ExpenseGeneralOverheadLine,
  ExpenseTabBranchOperatingLine,
  ExpenseTabPeriodBreakdown,
  ExpenseTabPeriodInsights,
  IncomeCashBranchManagerPersonRow,
} from "@/types/branch";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type { BranchTransaction } from "@/types/branch-transaction";
import { cn } from "@/lib/cn";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyBranchIncomeDeleteConfirm } from "@/shared/lib/notify-branch-income-delete";
import { notify } from "@/shared/lib/notify";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  WarehouseProductScopeFilters,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";

export function registerCashSettlementLabel(
  row: BranchTransaction,
  t: (key: string) => string
): string {
  return cashSettlementPartyLabel(
    row.cashSettlementParty,
    t,
    row.cashSettlementParty === "BRANCH_MANAGER" && row.cashSettlementPersonnelFullName
      ? {
          fullName: row.cashSettlementPersonnelFullName,
          jobTitle: row.cashSettlementPersonnelJobTitle,
        }
      : null
  );
}

export function expensePocketSubline(
  row: BranchTransaction,
  t: (key: string) => string
): string | null {
  const src = String(row.expensePaymentSource ?? "").trim().toUpperCase();
  if (src !== "PERSONNEL_POCKET" && src !== "PERSONNEL_HELD_REGISTER_CASH") return null;
  const n = row.expensePocketPersonnelFullName?.trim();
  if (!n) return null;
  const lab =
    src === "PERSONNEL_HELD_REGISTER_CASH"
      ? t("branch.expenseHeldRegisterPersonLabel")
      : t("branch.expensePocketPersonLabel");
  return `${lab}: ${n}`;
}

/** Pocket debt repayment main code: OUT_POCKET_REPAY or legacy OUT_PERSONNEL_POCKET_REPAY. */
export function branchTxIsPocketRepayMain(row: BranchTransaction): boolean {
  const mc = String(row.mainCategory ?? "").trim().toUpperCase();
  return mc === "OUT_POCKET_REPAY" || mc === "OUT_PERSONNEL_POCKET_REPAY";
}

export function expensePocketRepaySubline(
  row: BranchTransaction,
  t: (key: string) => string
): string | null {
  if (!branchTxIsPocketRepayMain(row)) return null;
  const n = row.expensePocketPersonnelFullName?.trim();
  const who = n || "—";
  const u = String(row.expensePaymentSource ?? "").trim().toUpperCase();
  let via = "";
  if (u === "REGISTER") via = t("branch.expensePocketRepayViaRegister");
  else if (u === "PATRON") via = t("branch.expensePocketRepayViaPatron");
  else if (u) via = expensePaymentSourceLabelShort(row.expensePaymentSource, t);
  return via ? `${who} · ${via}` : who;
}

export function branchTxNonPnl(row: BranchTransaction): boolean {
  if (row.excludedFromProfitAndLoss === true) return true;
  return isNonPnlMemoClassificationMain(row.mainCategory);
}

export function patronIncomeToPatronVisible(
  s: { total: number; cash: number; card: number; unspecified: number } | null | undefined
): boolean {
  if (!s) return false;
  const nz = (n: number) => Math.abs(n) > 0.009;
  return nz(s.total) || nz(s.cash) || nz(s.card) || nz(s.unspecified);
}

export function isoMonthLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export type IncomeCashPartyParts = {
  patron: number;
  branchManager: number;
  remains: number;
  unspecified: number;
};

export function incomeCashTotalAndParties(
  totalCash: number,
  parties: IncomeCashPartyParts,
  t: (key: string) => string,
  locale: Locale,
  branchManagerByPerson?: IncomeCashBranchManagerPersonRow[] | null
): ReactNode {
  const rows: { labelKey: string; v: number }[] = [
    { labelKey: "branch.incomeCashPartyPatron", v: parties.patron },
    { labelKey: "branch.incomeCashPartyBranchManager", v: parties.branchManager },
    { labelKey: "branch.incomeCashPartyRemains", v: parties.remains },
    { labelKey: "branch.incomeCashPartyUnspecified", v: parties.unspecified },
  ].filter((x) => Math.abs(x.v) > 0.005);
  const bmRows =
    branchManagerByPerson?.filter((x) => Math.abs(x.amount) > 0.005) ?? [];
  const bmDetail = bmRows.length > 0;
  return (
    <>
      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
        {formatMoneyDash(totalCash, t("personnel.dash"), locale, "TRY")}
      </p>
      {rows.length ? (
        <ul className="mt-2 space-y-0.5 border-t border-zinc-200/80 pt-2 text-[10px] leading-snug text-zinc-600">
          {rows.map((row) =>
            row.labelKey === "branch.incomeCashPartyBranchManager" && bmDetail ? (
              <li key={row.labelKey} className="space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1">{t(row.labelKey)}</span>
                  <span className="shrink-0 tabular-nums font-medium text-zinc-700">
                    {formatMoneyDash(row.v, t("personnel.dash"), locale, "TRY")}
                  </span>
                </div>
                <details className="rounded-md border border-zinc-200/90 bg-zinc-50/80 text-[10px] text-zinc-700">
                  <summary className="cursor-pointer select-none list-none px-2 py-1.5 font-medium text-zinc-600 outline-none [&::-webkit-details-marker]:hidden">
                    {t("branch.incomeCashBranchManagerBreakdownToggle")}
                  </summary>
                  <ul className="space-y-1 border-t border-zinc-200/80 px-2 py-2">
                    {bmRows.map((p, i) => (
                      <li
                        key={p.personnelId != null ? `p-${p.personnelId}` : `n-${i}-${p.fullName}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {p.fullName.trim()
                            ? p.fullName
                            : t("branch.incomeCashBranchManagerUnassigned")}
                        </span>
                        <span className="shrink-0 tabular-nums font-medium text-zinc-800">
                          {formatMoneyDash(p.amount, t("personnel.dash"), locale, "TRY")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : (
              <li key={row.labelKey} className="flex justify-between gap-2">
                <span className="min-w-0 flex-1">{t(row.labelKey)}</span>
                <span className="shrink-0 tabular-nums font-medium text-zinc-700">
                  {formatMoneyDash(row.v, t("personnel.dash"), locale, "TRY")}
                </span>
              </li>
            )
          )}
        </ul>
      ) : null}
    </>
  );
}

export function partiesFromRegisterSummary(row: BranchRegisterSummary): IncomeCashPartyParts {
  return {
    patron: row.cumulativeIncomeCashPatronThroughAsOf ?? 0,
    branchManager: row.cumulativeIncomeCashBranchManagerThroughAsOf ?? 0,
    remains: row.cumulativeIncomeCashRemainsAtBranchThroughAsOf ?? 0,
    unspecified: row.cumulativeIncomeCashUnspecifiedThroughAsOf ?? 0,
  };
}

export function partiesSeasonFromRegisterSummary(row: BranchRegisterSummary): IncomeCashPartyParts {
  return {
    patron: row.seasonCumulativeIncomeCashPatronThroughAsOf ?? 0,
    branchManager: row.seasonCumulativeIncomeCashBranchManagerThroughAsOf ?? 0,
    remains: row.seasonCumulativeIncomeCashRemainsAtBranchThroughAsOf ?? 0,
    unspecified: row.seasonCumulativeIncomeCashUnspecifiedThroughAsOf ?? 0,
  };
}

export function partiesDayFromRegisterSummary(row: BranchRegisterSummary): IncomeCashPartyParts {
  return {
    patron: row.dayIncomeCashPatron ?? 0,
    branchManager: row.dayIncomeCashBranchManager ?? 0,
    remains: row.dayIncomeCashRemainsAtBranch ?? 0,
    unspecified: row.dayIncomeCashUnspecified ?? 0,
  };
}

export function partiesFromPeriodSummary(row: BranchIncomePeriodSummary): IncomeCashPartyParts {
  return {
    patron: row.incomeCashPatron ?? 0,
    branchManager: row.incomeCashBranchManager ?? 0,
    remains: row.incomeCashRemainsAtBranch ?? 0,
    unspecified: row.incomeCashUnspecified ?? 0,
  };
}

export const EMPTY_EXPENSE_INSIGHTS: ExpenseTabPeriodInsights = {
  topExpenseMainCategory: null,
  topExpenseAmount: 0,
  economicOutTransactionCount: 0,
  generalOverheadLines: [],
  branchOperatingExpenseLines: [],
  generalOverheadPaidByPatronAmount: 0,
  generalOverheadPaidFromRegisterAmount: 0,
  generalOverheadPaidFromPersonnelPocketAmount: 0,
  generalOverheadAmountInBranchOperatingMains: 0,
};

export const EMPTY_EXPENSE_TAB_BREAKDOWN: ExpenseTabPeriodBreakdown = {
  totalIncome: 0,
  outPaidFromRegister: 0,
  outPaidFromPatron: 0,
  outPaidFromPersonnelPocket: 0,
  outPersonnelExpense: 0,
  outBranchExpense: 0,
  outAdvanceNonPnl: 0,
  outAdvanceNonPnlFromRegister: 0,
  outAdvanceNonPnlFromPatron: 0,
  outAdvanceNonPnlFromPersonnelPocket: 0,
  outGeneralOverheadAllocated: 0,
  insights: EMPTY_EXPENSE_INSIGHTS,
};

export type ExpenseOverviewCardId =
  | "income"
  | "register"
  | "patron"
  | "pocket"
  | "personnel"
  | "branch"
  | "advance"
  | "overhead"
  | "topCategory"
  | "outCount";

/** Kartın ölçtüğü boyut: ödeme (kasa/patron/cep) mi, ana kategori mi, merkez payı mı. */
function expenseOverviewCardAxisKey(card: ExpenseOverviewCardId): string {
  switch (card) {
    case "income":
      return "branch.expensesCardAxisIncome";
    case "register":
      return "branch.expensesCardAxisRegister";
    case "patron":
      return "branch.expensesCardAxisPatron";
    case "pocket":
      return "branch.expensesCardAxisPocket";
    case "personnel":
      return "branch.expensesCardAxisMainCategoryPersonnel";
    case "branch":
      return "branch.expensesCardAxisMainCategoryBranch";
    case "advance":
      return "branch.expensesCardAxisMainCategoryAdvance";
    case "overhead":
      return "branch.expensesCardAxisCentralShare";
    case "topCategory":
      return "branch.expensesCardAxisTopMain";
    case "outCount":
      return "branch.expensesCardAxisOutLines";
  }
}

function expenseOverviewCardAxisLine(
  card: ExpenseOverviewCardId,
  t: (key: string) => string,
  mode: "card" | "modal" = "card"
): ReactNode {
  const isModal = mode === "modal";
  return (
    <p
      className={cn(
        "w-full max-w-none font-medium text-zinc-600 text-pretty [overflow-wrap:anywhere]",
        isModal
          ? "mt-2 text-xs leading-snug sm:text-[11px] sm:leading-snug"
          : "mt-0.5 text-[9px] leading-tight"
      )}
    >
      {t(expenseOverviewCardAxisKey(card))}
    </p>
  );
}

function expenseOverviewInsights(b: ExpenseTabPeriodBreakdown): ExpenseTabPeriodInsights {
  return b.insights ?? EMPTY_EXPENSE_INSIGHTS;
}

function expenseGeneralOverheadOverlapCallout(
  breakdown: ExpenseTabPeriodBreakdown,
  t: (key: string) => string,
  locale: Locale
): ReactNode | null {
  const eps = 0.005;
  if (breakdown.outGeneralOverheadAllocated <= eps) return null;
  const ins = expenseOverviewInsights(breakdown);
  const p = ins.generalOverheadPaidByPatronAmount ?? 0;
  const r = ins.generalOverheadPaidFromRegisterAmount ?? 0;
  const pk = ins.generalOverheadPaidFromPersonnelPocketAmount ?? 0;
  const b = ins.generalOverheadAmountInBranchOperatingMains ?? 0;
  if (p <= eps && r <= eps && pk <= eps && b <= eps) return null;

  const line = (labelKey: string, v: number) =>
    v > eps ? (
      <li key={labelKey}>
        {t(labelKey)}{" "}
        <span className="tabular-nums font-semibold">
          {formatMoneyDash(v, t("personnel.dash"), locale, "TRY")}
        </span>
      </li>
    ) : null;

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5 text-[10px] leading-relaxed text-amber-950/90">
      <p className="font-semibold">{t("branch.expensesOverlapTitle")}</p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5">
        {line("branch.expensesOverlapBulPatron", p)}
        {line("branch.expensesOverlapBulRegister", r)}
        {line("branch.expensesOverlapBulPocket", pk)}
        {line("branch.expensesOverlapBulBranchMain", b)}
      </ul>
      <p className="mt-2 border-t border-amber-200/60 pt-2 text-[10px] text-amber-950/85">
        {t("branch.expensesOverlapFooter")}
      </p>
    </div>
  );
}

function expenseGoLineUpper(s: string | null | undefined): string {
  return String(s ?? "").trim().toUpperCase();
}

/** Satırlar «kasa genel gider payı» özet tutarına (goCross register) hangi OUT’lar girer. */
function expenseGoLineEligibleForRegisterOverlapCard(line: ExpenseGeneralOverheadLine): boolean {
  const src = expenseGoLineUpper(line.expensePaymentSource);
  const okSrc = !src || src === "REGISTER";
  if (!okSrc) return false;
  const inv = expenseGoLineUpper(line.invoicePaymentStatus);
  if (
    inv === "UNPAID" &&
    branchTxFormIsSupplierInvoiceLine({
      type: "OUT",
      mainCategory: line.mainCategory,
      category: line.category,
    })
  )
    return false;
  return true;
}

function expenseGoBranchOperatingMain(main: string | null | undefined): boolean {
  const u = expenseGoLineUpper(main);
  if (!u) return false;
  return (
    u.startsWith("OUT_GOODS") ||
    u.startsWith("OUT_OPS") ||
    u.startsWith("OUT_TAX") ||
    u.startsWith("OUT_OTHER") ||
    u === "OUT_GOODS" ||
    u === "OUT_OPS" ||
    u === "OUT_TAX" ||
    u === "OUT_OTHER"
  );
}

function expenseGoColumnLabels(t: (key: string) => string) {
  return {
    pool: t("branch.expensesCardDetailGoColPool"),
    date: t("branch.expensesCardDetailGoColDate"),
    amount: t("branch.expensesCardDetailGoColAmount"),
    main: t("branch.expensesCardDetailGoColMain"),
    pay: t("branch.expensesCardDetailGoColPay"),
    desc: t("branch.expensesCardDetailGoColDesc"),
    tx: t("branch.expensesCardDetailGoColTx"),
  };
}

function expenseGoFilteredLines(
  lines: ExpenseGeneralOverheadLine[],
  filter: "patron" | "register" | "pocket" | "branch"
): ExpenseGeneralOverheadLine[] {
  switch (filter) {
    case "patron":
      return lines.filter((l) => expenseGoLineUpper(l.expensePaymentSource) === "PATRON");
    case "pocket":
      return lines.filter((l) => expenseGoLineUpper(l.expensePaymentSource) === "PERSONNEL_POCKET");
    case "branch":
      return lines.filter((l) => expenseGoBranchOperatingMain(l.mainCategory));
    case "register":
      return lines.filter(expenseGoLineEligibleForRegisterOverlapCard);
    default:
      return [];
  }
}

export function ExpenseGoLinesDetailTable(opts: {
  rows: ExpenseGeneralOverheadLine[];
  t: (key: string) => string;
  locale: Locale;
}): ReactNode {
  const { rows, t, locale } = opts;
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-xs text-zinc-500">{t("branch.expensesCardDetailGoLinesFilteredEmpty")}</p>
    );
  }
  const col = expenseGoColumnLabels(t);
  return (
    <div className="mt-3 max-h-[min(50dvh,20rem)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-200 max-md:max-h-[min(72dvh,28rem)] sm:max-h-[min(48vh,24rem)] lg:max-h-[min(52vh,32rem)]">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="text-[10px] uppercase">{col.pool}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.date}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.amount}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.main}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.pay}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.desc}</TableHeader>
            <TableHeader className="text-[10px] uppercase">{col.tx}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.branchTransactionId}-${row.poolId}`}>
              <TableCell
                dataLabel={col.pool}
                className="max-w-[9rem] truncate text-xs text-zinc-800 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
              >
                {row.poolTitle || "—"}
              </TableCell>
              <TableCell
                dataLabel={col.date}
                className="whitespace-nowrap text-xs tabular-nums text-zinc-700"
              >
                {row.transactionDate ? formatLocaleDate(row.transactionDate, locale) : "—"}
              </TableCell>
              <TableCell dataLabel={col.amount} className="text-xs font-medium tabular-nums text-zinc-900">
                {formatMoneyDash(row.amount, t("personnel.dash"), locale, "TRY")}
              </TableCell>
              <TableCell
                dataLabel={col.main}
                className="max-w-[10rem] truncate text-xs text-zinc-700 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
              >
                {row.mainCategory ? txCategoryLine(row.mainCategory, row.category, t) : "—"}
              </TableCell>
              <TableCell
                dataLabel={col.pay}
                className="max-w-[7rem] truncate text-xs text-zinc-700 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
              >
                {expensePaymentSourceLabel(row.expensePaymentSource, t) || "—"}
              </TableCell>
              <TableCell
                dataLabel={col.desc}
                className="max-w-[12rem] truncate text-xs text-zinc-600 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
              >
                {row.description?.trim() ? row.description : "—"}
              </TableCell>
              <TableCell dataLabel={col.tx} className="whitespace-nowrap font-mono text-xs text-zinc-500">
                {row.branchTransactionId > 0 ? row.branchTransactionId : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BranchOperatingExpenseLinesList(opts: {
  lines: ExpenseTabBranchOperatingLine[];
  t: (key: string) => string;
  locale: Locale;
}): ReactNode {
  const { lines, t, locale } = opts;
  if (lines.length === 0) {
    return (
      <p className="mt-3 text-xs text-zinc-500">{t("branch.expensesBranchOperatingListEmpty")}</p>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-zinc-800">{t("branch.expensesBranchOperatingListTitle")}</p>
      <p className="text-[10px] leading-snug text-zinc-500">{t("branch.expensesBranchOperatingListLead")}</p>
      <ul className="space-y-2.5">
        {lines.map((row) => (
          <li
            key={row.branchTransactionId}
            className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    row.isGeneralOverheadShare
                      ? "bg-indigo-100 text-indigo-900"
                      : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
                  )}
                >
                  {row.isGeneralOverheadShare
                    ? t("branch.expensesBranchLineBadgeGo")
                    : t("branch.expensesBranchLineBadgeDirect")}
                </span>
                <span className="whitespace-nowrap text-xs text-zinc-500">
                  {row.transactionDate ? formatLocaleDate(row.transactionDate, locale) : "—"}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                {formatMoneyDash(row.amount, t("personnel.dash"), locale, "TRY")}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-[11px] leading-snug text-zinc-600">
              <p>
                <span className="font-medium text-zinc-500">{t("branch.expensesCardDetailGoColMain")}: </span>
                {row.mainCategory ? txCategoryLine(row.mainCategory, row.category, t) : "—"}
              </p>
              <p>
                <span className="font-medium text-zinc-500">{t("branch.expensesCardDetailGoColPay")}: </span>
                {expensePaymentSourceLabel(row.expensePaymentSource, t) || "—"}
              </p>
              {row.isGeneralOverheadShare ? (
                <p>
                  <span className="font-medium text-zinc-500">{t("branch.expensesCardDetailGoColPool")}: </span>
                  <span className="text-zinc-800">{row.poolTitle || (row.poolId ? `#${row.poolId}` : "—")}</span>
                </p>
              ) : null}
              {row.description?.trim() ? (
                <p className="text-zinc-800">
                  <span className="font-medium text-zinc-500">{t("branch.expensesCardDetailGoColDesc")}: </span>
                  {row.description}
                </p>
              ) : null}
              <p className="font-mono text-[10px] text-zinc-400">
                {t("branch.expensesCardDetailGoColTx")} · {row.branchTransactionId}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {lines.length >= 250 ? (
        <p className="mt-2 text-[10px] leading-snug text-amber-900/90">{t("branch.expensesBranchOperatingListTruncated")}</p>
      ) : null}
    </div>
  );
}

function expenseOverviewCardTitle(card: ExpenseOverviewCardId, t: (key: string) => string): string {
  switch (card) {
    case "income":
      return t("branch.expensesTabTotalIncome");
    case "register":
      return t("branch.expensesTabOutRegister");
    case "patron":
      return t("branch.expensesTabOutPatron");
    case "pocket":
      return t("branch.expensesTabOutPocket");
    case "personnel":
      return t("branch.expensesTabPersonnelMain");
    case "branch":
      return t("branch.expensesTabBranchOps");
    case "advance":
      return t("branch.expensesTabAdvanceNonPnl");
    case "overhead":
      return t("branch.expensesTabGeneralOverhead");
    case "topCategory":
      return t("branch.expensesTabTopExpenseCategory");
    case "outCount":
      return t("branch.expensesTabEconomicOutCount");
    default:
      return "";
  }
}

function expenseOverviewModalCardPeriodTotal(opts: {
  amount: number;
  valueClassName: string;
  t: (key: string) => string;
  locale: Locale;
}): ReactNode {
  const { amount, valueClassName, t, locale } = opts;
  return (
    <>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {t("branch.expensesCardDetailMatchingCardTotalLabel")}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums sm:text-2xl", valueClassName)}>
        {formatMoneyDash(amount, t("personnel.dash"), locale, "TRY")}
      </p>
    </>
  );
}

export function ExpenseOverviewDetailModal(opts: {
  detail: { periodTitle: string; breakdown: ExpenseTabPeriodBreakdown; card: ExpenseOverviewCardId };
  onClose: () => void;
  t: (key: string) => string;
  locale: Locale;
}): ReactNode {
  const { detail, onClose, t, locale } = opts;
  const { card, breakdown, periodTitle } = detail;
  const ins = expenseOverviewInsights(breakdown);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const body = (): ReactNode => {
    switch (card) {
      case "income":
        return <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailIncome")}</p>;
      case "register": {
        const goR = ins.generalOverheadPaidFromRegisterAmount ?? 0;
        const regLines = expenseGoFilteredLines(ins.generalOverheadLines, "register");
        return (
          <>
            <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailRegister")}</p>
            {expenseOverviewModalCardPeriodTotal({
              amount: breakdown.outPaidFromRegister,
              valueClassName: "text-zinc-900",
              t,
              locale,
            })}
            {goR > 0.005 ? (
              <>
                <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                  {t("branch.expensesCardDetailGoTableVsCardHint")}
                </p>
                <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-amber-950/90">
                  <span className="font-semibold">{t("branch.expensesCardDetailRegisterGoOverlapLabel")}</span>{" "}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyDash(goR, t("personnel.dash"), locale, "TRY")}
                  </span>
                  {" — "}
                  {t("branch.expensesCardDetailRegisterGoOverlapExplain")}
                </p>
                <p className="mt-2 text-xs font-semibold text-zinc-800">
                  {t("branch.expensesCardDetailGoLinesTitleRegister")}
                </p>
                <ExpenseGoLinesDetailTable rows={regLines} t={t} locale={locale} />
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  {t("branch.expensesCardDetailGoLinesRegisterFootnote")}
                </p>
              </>
            ) : null}
          </>
        );
      }
      case "patron": {
        const goP = ins.generalOverheadPaidByPatronAmount ?? 0;
        const patLines = expenseGoFilteredLines(ins.generalOverheadLines, "patron");
        return (
          <>
            <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailPatron")}</p>
            {expenseOverviewModalCardPeriodTotal({
              amount: breakdown.outPaidFromPatron,
              valueClassName: "text-violet-950",
              t,
              locale,
            })}
            {goP > 0.005 ? (
              <>
                <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                  {t("branch.expensesCardDetailGoTableVsCardHint")}
                </p>
                <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-amber-950/90">
                  <span className="font-semibold">{t("branch.expensesCardDetailPatronGoOverlapLabel")}</span>{" "}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyDash(goP, t("personnel.dash"), locale, "TRY")}
                  </span>
                  {" — "}
                  {t("branch.expensesCardDetailPatronGoOverlapExplain")}
                </p>
                <p className="mt-2 text-xs font-semibold text-zinc-800">
                  {t("branch.expensesCardDetailGoLinesTitlePatron")}
                </p>
                <ExpenseGoLinesDetailTable rows={patLines} t={t} locale={locale} />
              </>
            ) : null}
          </>
        );
      }
      case "pocket": {
        const goPk = ins.generalOverheadPaidFromPersonnelPocketAmount ?? 0;
        const pocketLines = expenseGoFilteredLines(ins.generalOverheadLines, "pocket");
        return (
          <>
            <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailPocket")}</p>
            {expenseOverviewModalCardPeriodTotal({
              amount: breakdown.outPaidFromPersonnelPocket,
              valueClassName: "text-sky-950",
              t,
              locale,
            })}
            {goPk > 0.005 ? (
              <>
                <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                  {t("branch.expensesCardDetailGoTableVsCardHint")}
                </p>
                <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-amber-950/90">
                  <span className="font-semibold">{t("branch.expensesCardDetailPocketGoOverlapLabel")}</span>{" "}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyDash(goPk, t("personnel.dash"), locale, "TRY")}
                  </span>
                  {" — "}
                  {t("branch.expensesCardDetailPocketGoOverlapExplain")}
                </p>
                <p className="mt-2 text-xs font-semibold text-zinc-800">
                  {t("branch.expensesCardDetailGoLinesTitlePocket")}
                </p>
                <ExpenseGoLinesDetailTable rows={pocketLines} t={t} locale={locale} />
              </>
            ) : null}
          </>
        );
      }
      case "personnel":
        return <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailPersonnel")}</p>;
      case "branch": {
        const branchOpLines = ins.branchOperatingExpenseLines ?? [];
        const hasUnified = branchOpLines.length > 0;
        const goB = ins.generalOverheadAmountInBranchOperatingMains ?? 0;
        const branchLines = expenseGoFilteredLines(ins.generalOverheadLines, "branch");
        const cardBranch = breakdown.outBranchExpense ?? 0;
        const branchNonGoRemainder = cardBranch - goB;
        return (
          <>
            <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailBranch")}</p>
            {expenseOverviewModalCardPeriodTotal({
              amount: cardBranch,
              valueClassName: "text-red-900/90",
              t,
              locale,
            })}
            {hasUnified ? (
              <BranchOperatingExpenseLinesList lines={branchOpLines} t={t} locale={locale} />
            ) : goB > 0.005 ? (
              <>
                <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                  {t("branch.expensesCardDetailGoTableVsCardHint")}
                </p>
                <p className="mt-3 border-t border-zinc-200 pt-3 text-xs leading-relaxed text-amber-950/90">
                  <span className="font-semibold">{t("branch.expensesCardDetailBranchGoOverlapLabel")}</span>{" "}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyDash(goB, t("personnel.dash"), locale, "TRY")}
                  </span>
                  {" — "}
                  {t("branch.expensesCardDetailBranchGoOverlapExplain")}
                </p>
                {branchNonGoRemainder > 0.005 ? (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                    <p className="text-xs font-medium leading-snug text-zinc-800">
                      {t("branch.expensesCardDetailBranchNonGoPortionLabel")}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                      {formatMoneyDash(branchNonGoRemainder, t("personnel.dash"), locale, "TRY")}
                    </p>
                    <p className="mt-1.5 text-[10px] leading-snug text-zinc-600">
                      {t("branch.expensesCardDetailBranchNonGoPortionHint")}
                    </p>
                  </div>
                ) : null}
                <p className="mt-2 text-xs font-semibold text-zinc-800">
                  {t("branch.expensesCardDetailGoLinesTitleBranch")}
                </p>
                <ExpenseGoLinesDetailTable rows={branchLines} t={t} locale={locale} />
              </>
            ) : null}
          </>
        );
      }
      case "advance":
        return <p className="text-sm leading-relaxed text-zinc-700">{t("branch.expensesCardDetailAdvance")}</p>;
      case "overhead": {
        if (ins.generalOverheadLines.length === 0) {
          return (
            <p className="text-sm text-zinc-600">{t("branch.expensesCardDetailOverheadEmpty")}</p>
          );
        }
        const col = expenseGoColumnLabels(t);
        return (
          <div>
            <p className="mb-3 text-xs leading-relaxed text-amber-950/90">
              {t("branch.expensesCardDetailOverheadOverlapIntro")}
            </p>
            <div className="max-h-[min(52vh,24rem)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-200 max-md:max-h-[min(72dvh,28rem)] sm:max-h-[min(58vh,32rem)] lg:max-h-[min(62vh,40rem)]">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="text-[10px] uppercase">{col.pool}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.date}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.amount}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.main}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.pay}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.desc}</TableHeader>
                    <TableHeader className="text-[10px] uppercase">{col.tx}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ins.generalOverheadLines.map((row) => (
                    <TableRow key={`${row.branchTransactionId}-${row.poolId}`}>
                      <TableCell
                        dataLabel={col.pool}
                        className="max-w-[10rem] truncate text-xs text-zinc-800 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
                      >
                        {row.poolTitle || "—"}
                      </TableCell>
                      <TableCell
                        dataLabel={col.date}
                        className="whitespace-nowrap text-xs tabular-nums text-zinc-700"
                      >
                        {row.transactionDate ? formatLocaleDate(row.transactionDate, locale) : "—"}
                      </TableCell>
                      <TableCell dataLabel={col.amount} className="text-xs font-medium tabular-nums text-zinc-900">
                        {formatMoneyDash(row.amount, t("personnel.dash"), locale, "TRY")}
                      </TableCell>
                      <TableCell
                        dataLabel={col.main}
                        className="max-w-[10rem] truncate text-xs text-zinc-700 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
                      >
                        {row.mainCategory ? txCategoryLine(row.mainCategory, row.category, t) : "—"}
                      </TableCell>
                      <TableCell
                        dataLabel={col.pay}
                        className="max-w-[7rem] truncate text-xs text-zinc-700 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
                      >
                        {expensePaymentSourceLabel(row.expensePaymentSource, t) || "—"}
                      </TableCell>
                      <TableCell
                        dataLabel={col.desc}
                        className="max-w-[14rem] truncate text-xs text-zinc-600 max-md:max-w-none max-md:whitespace-normal max-md:break-words"
                      >
                        {row.description?.trim() ? row.description : "—"}
                      </TableCell>
                      <TableCell dataLabel={col.tx} className="whitespace-nowrap font-mono text-xs text-zinc-500">
                        {row.branchTransactionId > 0 ? row.branchTransactionId : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      }
      case "topCategory":
        if (!ins.topExpenseMainCategory || Math.abs(ins.topExpenseAmount) < 0.005) {
          return (
            <p className="text-sm text-zinc-600">{t("branch.expensesCardDetailTopCategoryEmpty")}</p>
          );
        }
        return (
          <div>
            <p className="text-xs leading-relaxed text-zinc-600">{t("branch.expensesCardDetailTopCategoryLead")}</p>
            <p className="mt-3 text-sm font-semibold text-zinc-900">
              {txCategoryLine(ins.topExpenseMainCategory, null, t)}
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-red-900/90">
              {formatMoneyDash(ins.topExpenseAmount, t("personnel.dash"), locale, "TRY")}
            </p>
          </div>
        );
      case "outCount":
        return (
          <div>
            <p className="text-xs leading-relaxed text-zinc-600">{t("branch.expensesCardDetailOutCountLead")}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900">
              {ins.economicOutTransactionCount}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${OVERLAY_Z_TW.modalNested} flex items-end justify-center bg-zinc-950/50 p-0 pb-[env(safe-area-inset-bottom,0px)] sm:items-center sm:p-4 sm:pb-4 lg:p-6`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-overview-detail-title"
        className="flex max-h-[min(96dvh,100dvh)] w-full min-w-0 max-w-[100dvw] flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl max-sm:border-x-0 max-sm:pb-[env(safe-area-inset-bottom,0px)] sm:max-h-[min(90dvh,52rem)] sm:max-w-[min(100vw-1rem,96rem)] sm:rounded-2xl md:max-h-[min(88dvh,56rem)] md:max-w-3xl lg:max-h-[min(86dvh,60rem)] lg:max-w-4xl xl:max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="grid shrink-0 grid-cols-1 gap-3 border-b border-zinc-100 px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{periodTitle}</p>
            <h3
              id="expense-overview-detail-title"
              className="mt-1 w-full max-w-none text-balance text-base font-semibold leading-snug text-zinc-900 [overflow-wrap:anywhere] sm:mt-0.5 sm:text-lg sm:leading-tight"
            >
              {expenseOverviewCardTitle(card, t)}
            </h3>
            {expenseOverviewCardAxisLine(card, t, "modal")}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 justify-self-end whitespace-nowrap px-3 py-2 text-xs sm:justify-self-auto sm:self-start sm:px-4 sm:text-sm"
            onClick={onClose}
          >
            {t("branch.expensesCardDetailClose")}
          </Button>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4 [&_p]:leading-relaxed [&_p]:text-pretty">
          {body()}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Gider sekmesi: tıklanabilir kartlar + yönetim özetleri (API `ExpenseTabPeriodBreakdown`). */
export function expenseTabPeriodOverviewBlock(opts: {
  breakdown: ExpenseTabPeriodBreakdown;
  t: (key: string) => string;
  locale: Locale;
  onOpenCard: (card: ExpenseOverviewCardId) => void;
}): ReactNode {
  const { breakdown, t, locale, onOpenCard } = opts;
  const ins = expenseOverviewInsights(breakdown);

  const cardBtn = (
    card: ExpenseOverviewCardId,
    labelKey: string,
    value: number,
    valueClass: string,
    hintKey?: string
  ) => (
    <button
      type="button"
      className="rounded-lg border border-white bg-white p-2.5 text-left shadow-sm transition hover:bg-zinc-50/90 hover:ring-2 hover:ring-zinc-300/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:p-3"
      onClick={() => onOpenCard(card)}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{t(labelKey)}</p>
      {expenseOverviewCardAxisLine(card, t)}
      <p className={`mt-0.5 text-sm font-semibold tabular-nums tracking-tight sm:text-base ${valueClass}`}>
        {formatMoneyDash(value, t("personnel.dash"), locale, "TRY")}
      </p>
      {hintKey ? <p className="mt-1 text-[10px] leading-snug text-zinc-500">{t(hintKey)}</p> : null}
      <p className="mt-1.5 text-[9px] font-medium text-zinc-400">{t("branch.expensesCardTapForDetail")}</p>
    </button>
  );

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cardBtn("income", "branch.expensesTabTotalIncome", breakdown.totalIncome, "text-emerald-800")}
        {cardBtn("register", "branch.expensesTabOutRegister", breakdown.outPaidFromRegister, "text-zinc-900")}
        {cardBtn("patron", "branch.expensesTabOutPatron", breakdown.outPaidFromPatron, "text-violet-950")}
        {cardBtn(
          "pocket",
          "branch.expensesTabOutPocket",
          breakdown.outPaidFromPersonnelPocket,
          "text-sky-950",
          "branch.expensesTabOutPocketHint"
        )}
        {cardBtn("personnel", "branch.expensesTabPersonnelMain", breakdown.outPersonnelExpense, "text-zinc-900")}
        {cardBtn(
          "branch",
          "branch.expensesTabBranchOps",
          breakdown.outBranchExpense,
          "text-red-900/90",
          "branch.expensesTabBranchOpsHint"
        )}
        {cardBtn("advance", "branch.expensesTabAdvanceNonPnl", breakdown.outAdvanceNonPnl, "text-amber-900")}
        {cardBtn(
          "overhead",
          "branch.expensesTabGeneralOverhead",
          breakdown.outGeneralOverheadAllocated,
          "text-indigo-950",
          "branch.expensesTabGeneralOverheadHint"
        )}
      </div>
      {expenseGeneralOverheadOverlapCallout(breakdown, t, locale)}
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <button
          type="button"
          className="rounded-lg border border-white bg-white p-2.5 text-left shadow-sm transition hover:bg-zinc-50/90 hover:ring-2 hover:ring-zinc-300/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:p-3"
          onClick={() => onOpenCard("topCategory")}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t("branch.expensesTabTopExpenseCategory")}
          </p>
          {expenseOverviewCardAxisLine("topCategory", t)}
          <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-zinc-800">
            {ins.topExpenseMainCategory && Math.abs(ins.topExpenseAmount) > 0.005
              ? txCategoryLine(ins.topExpenseMainCategory, null, t)
              : t("branch.expensesTabTopExpenseCategoryEmpty")}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-red-900/85 sm:text-base">
            {formatMoneyDash(ins.topExpenseAmount, t("personnel.dash"), locale, "TRY")}
          </p>
          <p className="mt-1 text-[9px] font-medium text-zinc-400">{t("branch.expensesCardTapForDetail")}</p>
        </button>
        <button
          type="button"
          className="rounded-lg border border-white bg-white p-2.5 text-left shadow-sm transition hover:bg-zinc-50/90 hover:ring-2 hover:ring-zinc-300/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:p-3"
          onClick={() => onOpenCard("outCount")}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t("branch.expensesTabEconomicOutCount")}
          </p>
          {expenseOverviewCardAxisLine("outCount", t)}
          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
            {ins.economicOutTransactionCount}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500">{t("branch.expensesTabEconomicOutCountHint")}</p>
          <p className="mt-1 text-[9px] font-medium text-zinc-400">{t("branch.expensesCardTapForDetail")}</p>
        </button>
      </div>
    </div>
  );
}

export type PatronIncomePin = {
  total: number;
  cash: number;
  card: number;
  unspecified: number;
};

export function listSummaryPatronCashLine(
  patron: PatronIncomePin | null | undefined,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (!patron || !patronIncomeToPatronVisible(patron) || Math.abs(patron.cash) <= 0.005) return null;
  return (
    <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/90 pt-2 text-[10px] text-zinc-600">
      <span className="min-w-0">{t("branch.incomeListPatronTransferredCash")}</span>
      <span className="shrink-0 tabular-nums font-medium text-zinc-800">
        {formatMoneyDash(patron.cash, t("personnel.dash"), locale, "TRY")}
      </span>
    </div>
  );
}

export function listSummaryPatronCardLine(
  patron: PatronIncomePin | null | undefined,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (!patron || !patronIncomeToPatronVisible(patron) || Math.abs(patron.card) <= 0.005) return null;
  return (
    <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/90 pt-2 text-[10px] text-zinc-600">
      <span className="min-w-0">{t("branch.incomeListPatronTransferredCard")}</span>
      <span className="shrink-0 tabular-nums font-medium text-zinc-800">
        {formatMoneyDash(patron.card, t("personnel.dash"), locale, "TRY")}
      </span>
    </div>
  );
}

export function listSummaryPatronTotalLine(
  patron: PatronIncomePin | null | undefined,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (!patron || !patronIncomeToPatronVisible(patron) || Math.abs(patron.total) <= 0.005) return null;
  return (
    <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/90 pt-2 text-[10px] text-zinc-600">
      <span className="min-w-0">{t("branch.incomeListPatronTransferredTotal")}</span>
      <span className="shrink-0 tabular-nums font-medium text-zinc-800">
        {formatMoneyDash(patron.total, t("personnel.dash"), locale, "TRY")}
      </span>
    </div>
  );
}

export function listSummaryPosPatronHint(t: (key: string) => string): ReactNode {
  return (
    <p className="mt-2 border-t border-slate-200/90 pt-2 text-[10px] leading-snug text-zinc-600">
      {t("branch.incomeListPosPatronHint")}
    </p>
  );
}

export function listSummaryPatronUnspecifiedNote(
  patron: PatronIncomePin | null | undefined,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (!patron || patron.unspecified <= 0.009) return null;
  return (
    <p className="mt-2 text-[10px] text-amber-900/85">
      {t("branch.patronFlowIncomeUnspecified")}:{" "}
      {formatMoneyDash(patron.unspecified, t("personnel.dash"), locale, "TRY")}
    </p>
  );
}

export function advanceSourceLabel(code: string, t: (key: string) => string): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "CASH") return t("personnel.sourceCash");
  if (u === "BANK") return t("personnel.sourceBank");
  if (u === "PATRON") return t("personnel.sourcePatron");
  return u ? code : t("personnel.dash");
}

export function branchPersonnelMoneyAdvancesCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.advancesMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  if (
    row.totalAdvances != null &&
    row.totalAdvances > 0 &&
    row.advancesCurrencyCode
  ) {
    return formatMoneyDash(
      row.totalAdvances,
      t("personnel.dash"),
      locale,
      row.advancesCurrencyCode
    );
  }
  return "—";
}

export function branchPersonnelMoneyRegisterOwesCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.pocketMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  if (row.netRegisterOwesPocket > 0.009) {
    const cur = row.pocketCurrencyCode ?? "TRY";
    return formatMoneyDash(
      row.netRegisterOwesPocket,
      t("personnel.dash"),
      locale,
      cur
    );
  }
  return "—";
}

export function branchPersonnelMoneyPocketCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.pocketMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  const cur = row.pocketCurrencyCode ?? "TRY";
  const parts: ReactNode[] = [];
  if (row.grossPocketExpense > 0.009) {
    parts.push(
      <span key="g" className="block">
        {t("branch.personnelMoneyPocketOutShort")}:{" "}
        {formatMoneyDash(row.grossPocketExpense, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  const rep = row.pocketRepaidFromRegister + row.pocketRepaidFromPatron;
  if (rep > 0.009) {
    parts.push(
      <span key="r" className="block">
        {t("branch.personnelMoneyPocketRepaidShort")}:{" "}
        {formatMoneyDash(rep, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  const xfer = row.pocketClaimTransferNet ?? 0;
  if (Math.abs(xfer) > 0.009) {
    parts.push(
      <span key="x" className="block text-zinc-600">
        {t("branch.personnelMoneyPocketClaimTransferShort")}:{" "}
        {formatMoneyDash(xfer, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  if (row.netRegisterOwesPocket < -0.009) {
    parts.push(
      <span key="a" className="block text-emerald-800">
        {t("branch.personnelMoneyPocketAheadShort")}:{" "}
        {formatMoneyDash(-row.netRegisterOwesPocket, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  if (parts.length === 0) return "—";
  return <div className="space-y-0.5 text-xs leading-snug">{parts}</div>;
}

export function PersonnelPocketRepayCta({
  personnelId,
  moneyRow,
  loading,
  onPay,
  t,
  buttonClassName,
}: {
  personnelId: number;
  moneyRow?: BranchPersonnelMoneySummaryItem;
  loading: boolean;
  onPay: (pid: number, currencyCode: string) => void;
  t: (key: string) => string;
  buttonClassName?: string;
}) {
  const show =
    !loading &&
    moneyRow &&
    !moneyRow.pocketMixedCurrencies &&
    moneyRow.netRegisterOwesPocket > 0.009;
  if (!show) return null;
  const cur = moneyRow.pocketCurrencyCode ?? "TRY";
  return (
    <Button
      type="button"
      title={t("branch.personnelPayPocketDebtHint")}
      className={cn("min-h-10", buttonClassName)}
      onClick={() => onPay(personnelId, cur)}
    >
      {t("branch.personnelPayPocketDebt")}
    </Button>
  );
}

export function BranchTxDeleteRow({
  transactionId,
  pendingId,
  onSetPending,
  onConfirm,
  busy,
  show,
  t,
}: {
  transactionId: number;
  pendingId: number | null;
  onSetPending: (id: number | null) => void;
  onConfirm: (id: number) => void | Promise<void>;
  busy: boolean;
  show: boolean;
  t: (key: string) => string;
}) {
  if (!show) return null;
  if (pendingId === transactionId) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <p className="text-xs leading-snug text-zinc-600">{t("branch.txDeleteSure")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 text-xs"
            disabled={busy}
            onClick={() => onSetPending(null)}
          >
            {t("branch.txDeleteCancel")}
          </Button>
          <Button
            type="button"
            className="min-h-9 bg-red-600 text-xs text-white hover:bg-red-700"
            disabled={busy}
            onClick={() => void onConfirm(transactionId)}
          >
            {t("branch.txDeleteConfirm")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={trashIconActionButtonClass}
      aria-label={t("branch.txDeleteAria")}
      disabled={busy}
      onClick={() => onSetPending(transactionId)}
    >
      <TrashIcon className="h-5 w-5" />
    </button>
  );
}

export function BranchTxIncomeDeleteRow({
  transactionId,
  busy,
  show,
  t,
  onConfirm,
}: {
  transactionId: number;
  busy: boolean;
  show: boolean;
  t: (key: string) => string;
  onConfirm: (id: number) => void | Promise<void>;
}) {
  if (!show) return null;
  return (
    <button
      type="button"
      className={trashIconActionButtonClass}
      aria-label={t("branch.txDeleteAria")}
      disabled={busy}
      onClick={() =>
        notifyBranchIncomeDeleteConfirm({
          message: t("branch.txDeleteIncomeToastMessage"),
          cancelLabel: t("branch.txDeleteCancel"),
          confirmLabel: t("branch.txDeleteConfirm"),
          onConfirm: () => onConfirm(transactionId),
        })
      }
    >
      <TrashIcon className="h-5 w-5" />
    </button>
  );
}
export function DashCard({
  badge,
  label,
  value,
  valueClass,
  hint,
  compact,
  highlight,
  tone = "violet",
}: {
  badge?: string;
  label: string;
  value: string;
  valueClass?: string;
  hint?: ReactNode;
  compact?: boolean;
  highlight?: boolean;
  tone?: "violet" | "amber";
}) {
  const surface =
    highlight && tone === "amber"
      ? "border-amber-300/90 bg-amber-50/80 ring-2 ring-amber-200/70 shadow-md"
      : highlight && tone === "violet"
        ? "border-violet-200/90 bg-violet-50/40 ring-1 ring-violet-100/80"
        : tone === "amber"
          ? "border-amber-200/85 bg-white shadow-sm"
          : "border-zinc-200 bg-zinc-50/90";

  const badgeTone = tone === "amber" ? "text-amber-900" : "text-violet-700";

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", surface)}>
      {badge ? (
        <p
          className={cn(
            "mb-1.5 text-[10px] font-bold uppercase tracking-wider",
            badgeTone
          )}
        >
          {badge}
        </p>
      ) : null}
      <p className="text-xs font-semibold leading-snug text-zinc-700">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-semibold tabular-nums tracking-tight text-zinc-900",
          compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          valueClass
        )}
      >
        {value}
      </p>
      {hint ? (
        <div className="mt-1.5 text-[11px] leading-snug text-zinc-500 [&_span]:text-inherit">{hint}</div>
      ) : null}
    </div>
  );
}

/** Gün sonu veya kasa tahsilatı geliri — nakit devri düzeltme API’si için uygun satır. */
export function isRegisterIncomeCashSettlementRow(row: BranchTransaction): boolean {
  const ty = String(row.type ?? "").toUpperCase();
  const main = String(row.mainCategory ?? "").toUpperCase();
  return ty === "IN" && (main === "IN_DAY_CLOSE" || main === "IN_OTHER_REGISTER");
}
