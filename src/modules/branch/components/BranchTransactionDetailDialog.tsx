"use client";

import type { Locale } from "@/i18n/messages";
import { useI18n } from "@/i18n/context";
import {
  branchTransactionReceiptPhotoUrl,
  reclassifyBranchExpense,
} from "@/modules/branch/api/branch-transactions-api";
import { classificationCodeFromLegacyBranchTxForm } from "@/modules/branch/lib/branch-tx-form-to-classification";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import { Select } from "@/shared/ui/Select";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  branchTxGeneralOverheadLine,
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  branchTxLinkedContractorLine,
  branchTxLinkedVehicleLine,
  branchTxUnpaidInvoice,
  canReclassifyExpenseRow,
  reclassifyExpenseOptionSources,
  expensePaymentSourceLabelShort,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  branchTxIsPocketRepayMain,
  branchTxNonPnl,
  expensePocketRepaySubline,
  expensePocketSubline,
  registerCashSettlementLabel,
} from "./BranchDetailTabs.shared";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
import { BranchExpenseKindBadge } from "@/modules/branch/components/BranchExpenseKindBadge";
import { useId, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  row: BranchTransaction | null;
  /** Sil yetkisi var mı? Yoksa eylem alanı görünmez. */
  canDelete: boolean;
  /** Silme butonuna tıklandığında çağrılır. Modalı dışarıdan kapatmak çağıranın işi. */
  onDelete?: (id: number) => void;
  deletePending?: boolean;
  /** Kategori düzeltme yetkisi (bağımsız işletme / yatırım giderlerinde görünür). */
  canEditCategory?: boolean;
  /** Kategori kaydedildikten sonra güncel satır (detay penceresi tazelensin). */
  onRowUpdated?: (row: BranchTransaction) => void;
};

export function BranchTransactionDetailDialog({
  open,
  onClose,
  row,
  canDelete,
  onDelete,
  deletePending = false,
  canEditCategory = false,
  onRowUpdated,
}: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();

  if (!row) return null;

  const isIncome = String(row.type ?? "").trim().toUpperCase() === "IN";
  const title = isIncome
    ? t("branch.txDetailTitleIncome")
    : t("branch.txDetailTitleExpense");

  const category = txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash");
  const amount = formatMoneyDash(row.amount, t("personnel.dash"), locale as Locale, row.currencyCode);

  const cardAmount = Number(row.cardAmount ?? 0);
  const cashAmount = Number(row.cashAmount ?? 0);
  const total = Number(row.amount);
  const grossCash = total - cardAmount;
  const cashExpense = grossCash - cashAmount;
  const netIncome = cashAmount + cardAmount;
  const hasCashCardSplit = row.cardAmount != null && row.cashAmount != null;

  const cashSettlement = registerCashSettlementLabel(row, t);
  const expenseLink = branchTxLinkedExpenseLine(row, t);
  const supplierLink = branchTxLinkedSupplierInvoiceLine(row, t);
  const vehicleLink = branchTxLinkedVehicleLine(row, t);
  const contractorLink = branchTxLinkedContractorLine(row, t);
  const overheadLine = branchTxGeneralOverheadLine(row, t);
  const pocketLine = expensePocketSubline(row, t);
  const repayLine = expensePocketRepaySubline(row, t);
  const pocketRepayMain = branchTxIsPocketRepayMain(row);
  const nonPnl = branchTxNonPnl(row);
  const unpaidInvoice = branchTxUnpaidInvoice(row);

  const paymentLabel = unpaidInvoice
    ? t("branch.invoiceUnpaidBadge")
    : expensePaymentSourceLabelShort(row.expensePaymentSource, t);

  const hasAudit = Boolean(row.createdByName?.trim() || row.createdAt?.trim());

  const linkedPersonnel = row.linkedPersonnelFullName?.trim() || null;
  const linkedAdvancePersonnel = row.linkedAdvancePersonnelFullName?.trim() || null;
  const linkedSalaryPersonnel = row.linkedSalaryPersonnelFullName?.trim() || null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      description={category}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="space-y-3 py-2 sm:space-y-4">
        {!isIncome ? (
          <div className="flex flex-wrap items-center gap-2">
            <BranchExpenseKindBadge row={row} t={t} />
          </div>
        ) : null}

        <DetailSection title={t("branch.txDetailSectionGeneral")}>
          <DetailField label={t("branch.advColDate")}>
            <span className="tabular-nums">
              {formatLocaleDate(row.transactionDate, locale as Locale)}
            </span>
          </DetailField>
          {canEditCategory && !isIncome && canReclassifyExpenseRow(row) ? (
            <ExpenseCategoryEditor key={row.id} row={row} category={category} onSaved={onRowUpdated} />
          ) : (
            <DetailField label={t("branch.txColMainCategory")}>{category}</DetailField>
          )}
          {nonPnl ? (
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
              {t("branch.txNonPnlBadge")}
            </span>
          ) : null}
          {unpaidInvoice ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              {t("branch.invoiceUnpaidBadge")}
            </span>
          ) : null}
        </DetailSection>

        <DetailSection title={t("branch.txDetailSectionAmounts")}>
          <DetailField
            label={t("branch.txColAmount")}
            valueClassName={cn(
              "font-mono text-base font-semibold tabular-nums",
              isIncome ? "text-emerald-800" : "text-red-800"
            )}
          >
            {amount}
          </DetailField>
          {isIncome && hasCashCardSplit ? (
            <div className="mt-1 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 text-sm sm:grid-cols-2 sm:p-2 sm:text-xs">
              <SplitRow
                label={t("branch.txDetailGrossCash")}
                value={formatMoneyDash(grossCash, "—", locale as Locale, row.currencyCode)}
              />
              <SplitRow
                label={t("branch.txDetailCardAmount")}
                value={formatMoneyDash(cardAmount, "—", locale as Locale, row.currencyCode)}
              />
              <SplitRow
                label={t("branch.txDetailCashAmount")}
                value={formatMoneyDash(cashAmount, "—", locale as Locale, row.currencyCode)}
              />
              <SplitRow
                label={t("branch.txDetailNetIncome")}
                value={formatMoneyDash(netIncome, "—", locale as Locale, row.currencyCode)}
                strong
              />
              {Math.abs(cashExpense) > 0.005 ? (
                <SplitRow
                  className="sm:col-span-2 border-t border-zinc-200 pt-1.5 text-orange-700"
                  label={t("branch.txDetailCashExpense")}
                  value={`− ${formatMoneyDash(cashExpense, "—", locale as Locale, row.currencyCode)}`}
                  strong
                />
              ) : null}
            </div>
          ) : null}
        </DetailSection>

        {paymentLabel || cashSettlement || pocketLine || repayLine ? (
          <DetailSection title={t("branch.txDetailSectionPayment")}>
            {!pocketRepayMain && !nonPnl && paymentLabel ? (
              <DetailField label={t("branch.txColExpensePayment")}>{paymentLabel}</DetailField>
            ) : null}
            {cashSettlement ? (
              <DetailField label={t("branch.txColCashSettlement")}>{cashSettlement}</DetailField>
            ) : null}
            {pocketLine ? <p className="text-xs text-zinc-600">{pocketLine}</p> : null}
            {repayLine ? <p className="text-xs text-zinc-600">{repayLine}</p> : null}
          </DetailSection>
        ) : null}

        {linkedPersonnel || linkedAdvancePersonnel || linkedSalaryPersonnel || expenseLink || supplierLink || vehicleLink || contractorLink || overheadLine || row.hasReceiptPhoto ? (
          <DetailSection title={t("branch.txDetailSectionLinks")}>
            {linkedPersonnel ? (
              <DetailField label={t("branch.expensePocketPersonLabel")}>{linkedPersonnel}</DetailField>
            ) : null}
            {linkedAdvancePersonnel ? (
              <DetailField label={t("branch.txLegacyAdvance")}>{linkedAdvancePersonnel}</DetailField>
            ) : null}
            {linkedSalaryPersonnel ? (
              <DetailField label={t("branch.txLegacySalary")}>{linkedSalaryPersonnel}</DetailField>
            ) : null}
            {contractorLink && row.linkedContractorName ? (
              <DetailField label={t("branch.txLinkedContractor")}>
                {row.linkedContractorName}
              </DetailField>
            ) : null}
            {expenseLink ? <p className="text-xs text-zinc-600">{expenseLink}</p> : null}
            {supplierLink ? <p className="text-xs text-zinc-600">{supplierLink}</p> : null}
            {vehicleLink ? <p className="text-xs text-zinc-600">{vehicleLink}</p> : null}
            {overheadLine ? <p className="text-xs text-amber-800/90">{overheadLine}</p> : null}
            {row.hasReceiptPhoto ? (
              <a
                href={branchTransactionReceiptPhotoUrl(row.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 sm:w-auto sm:self-start sm:justify-start"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t("branch.openReceiptPhoto")}
              </a>
            ) : null}
          </DetailSection>
        ) : null}

        <DetailSection title={t("branch.txDetailSectionNote")}>
          {row.description?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {row.description}
            </p>
          ) : (
            <p className="text-sm italic text-zinc-400">{t("branch.txDetailNoNote")}</p>
          )}
        </DetailSection>

        {hasAudit ? (
          <DetailSection title={t("branch.txDetailSectionAudit")}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">
                {t("branch.txColCreatedBy")}
              </span>
              <CreatedByMeta
                row={row}
                locale={locale as Locale}
                dash={t("personnel.dash")}
              />
            </div>
          </DetailSection>
        ) : null}
      </div>

      {canDelete && onDelete ? (
        <div className="mt-3 flex border-t border-zinc-100 px-1 pt-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] w-full justify-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50 sm:ml-auto sm:w-auto"
            disabled={deletePending}
            onClick={() => onDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("branch.txDeleteConfirm")}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}

/**
 * Kategori satırı + düzenleme. Yalnız kategori değişir; tutar, tarih ve ödeme kaynağı (kasa / patron /
 * zimmet) aynı kalır — kasa ve zimmet bakiyeleri etkilenmez.
 */
function ExpenseCategoryEditor({
  row,
  category,
  onSaved,
}: {
  row: BranchTransaction;
  category: string;
  onSaved?: (row: BranchTransaction) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const current = String(row.mainCategory ?? "").trim().toUpperCase();
  const [code, setCode] = useState(current);

  const options = useMemo(() => {
    const groupLabel = (g: "OUT_OPS" | "OUT_CAPEX") =>
      t(g === "OUT_OPS" ? "branch.txMainOutOps" : "branch.txMainOutCapex");
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const o of reclassifyExpenseOptionSources()) {
      const value = classificationCodeFromLegacyBranchTxForm("OUT", o.group, o.value).toUpperCase();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({ value, label: `${groupLabel(o.group)} · ${t(o.labelKey)}` });
    }
    // Mevcut kod listede yoksa (eski alt kod) seçili kalabilsin diye ekle.
    if (current && !seen.has(current)) out.unshift({ value: current, label: category });
    return out;
  }, [t, current, category]);

  const mut = useMutation({
    mutationFn: (next: string) => reclassifyBranchExpense(row.id, next),
    onSuccess: (updated) => {
      notify.success(t("branch.txCategoryUpdated"));
      setEditing(false);
      onSaved?.(updated);
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
      void qc.invalidateQueries({ queryKey: ["personnel", "management-snapshot"], exact: false });
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  if (!editing) {
    return (
      <DetailField label={t("branch.txColMainCategory")}>
        <span className="inline-flex items-center gap-2">
          {category}
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-violet-700 hover:bg-violet-50"
            onClick={() => {
              setCode(current);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t("branch.txCategoryEdit")}
          </button>
        </span>
      </DetailField>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        name={`tx-${row.id}-category`}
        label={t("branch.txColMainCategory")}
        options={options}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onBlur={() => {}}
        disabled={mut.isPending}
        menuZIndex={300}
      />
      <p className="text-xs text-zinc-500">{t("branch.txCategoryEditHint")}</p>
      <div className="flex gap-2 sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px] flex-1 sm:flex-none"
          disabled={mut.isPending}
          onClick={() => setEditing(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          className="min-h-[44px] flex-1 sm:flex-none"
          disabled={mut.isPending || !code || code === current}
          onClick={() => mut.mutate(code)}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm sm:p-3">
        {children}
      </div>
    </section>
  );
}

function DetailField({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 sm:gap-y-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs sm:normal-case sm:tracking-normal">
        {label}
      </span>
      <span className={cn("break-words text-[15px] text-zinc-900 sm:text-right sm:text-sm", valueClassName)}>
        {children}
      </span>
    </div>
  );
}

function SplitRow({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-zinc-600">{label}</span>
      <span className={cn("tabular-nums", strong ? "font-bold text-zinc-900" : "font-medium text-zinc-800")}>
        {value}
      </span>
    </div>
  );
}
