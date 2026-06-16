"use client";

import {
  deleteCustomerAccountReceipt,
  fetchCustomerAccountBalance,
  updateCustomerAccountReceipt,
  type CustomerAccountReceiptKind,
  type CustomerAccountReceiptResponse,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import type { OutboundInvoiceResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  invoices: OutboundInvoiceResponse[];
  branchId: number;
  locale: Locale;
  t: (key: string) => string;
  canEdit: boolean;
  active: boolean;
};

const KIND_KEYS: { value: CustomerAccountReceiptKind; labelKey: string }[] = [
  { value: "cash", labelKey: "branch.ledgerModalKindCash" },
  { value: "bank_transfer", labelKey: "branch.ledgerModalKindBankTransfer" },
  { value: "check", labelKey: "branch.ledgerModalKindCheck" },
  { value: "promo_discount", labelKey: "branch.ledgerModalKindPromo" },
  { value: "advance_payment", labelKey: "branch.ledgerModalKindAdvance" },
  { value: "other", labelKey: "branch.ledgerModalKindOther" },
];

function kindLabelKey(kind: CustomerAccountReceiptKind): string {
  return KIND_KEYS.find((k) => k.value === kind)?.labelKey ?? "branch.ledgerModalKindCash";
}

function kindBadgeClass(kind: CustomerAccountReceiptKind): string {
  switch (kind) {
    case "promo_discount":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "advance_payment":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "bank_transfer":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "check":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "other":
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
    case "cash":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function BranchCurrentAccountReceiptsPanel({
  invoices,
  branchId,
  locale,
  t,
  canEdit,
  active,
}: Props) {
  const qc = useQueryClient();
  const queryKey = ["customerAccountBalance", "branch", branchId];

  const balanceQuery = useQuery({
    queryKey,
    queryFn: () => fetchCustomerAccountBalance("branch", branchId),
    enabled: active && branchId > 0,
    staleTime: 30_000,
  });

  const [onlyWithReceipts, setOnlyWithReceipts] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<CustomerAccountReceiptResponse | null>(null);

  const deleteMut = useMutation({
    mutationFn: deleteCustomerAccountReceipt,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
      notify.success(t("branch.currentAccountReceiptDeleted"));
      setPendingDeleteId(null);
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const invoiceById = useMemo(() => {
    const map = new Map<number, OutboundInvoiceResponse>();
    for (const inv of invoices) map.set(inv.id, inv);
    return map;
  }, [invoices]);

  const grouped = useMemo(() => {
    const receipts = balanceQuery.data?.receipts ?? [];
    const byInvoice = new Map<number | "general", CustomerAccountReceiptResponse[]>();
    for (const r of receipts) {
      const key = r.linkedOutboundInvoiceId ?? "general";
      const arr = byInvoice.get(key) ?? [];
      arr.push(r);
      byInvoice.set(key, arr);
    }
    const lower = search.trim().toLowerCase();
    type Group = {
      key: number | "general";
      invoice?: OutboundInvoiceResponse;
      receipts: CustomerAccountReceiptResponse[];
    };
    const groups: Group[] = [];
    // Genel ödemeler en üstte
    const generalReceipts = byInvoice.get("general") ?? [];
    if (generalReceipts.length > 0) {
      const matches = !lower || lower.includes(t("branch.ledgerReceiptGeneral").toLowerCase());
      if (matches) groups.push({ key: "general", receipts: generalReceipts });
    }
    // Fatura-bazlı gruplar — fatura tarihi DESC
    const invoiceGroups = Array.from(byInvoice.entries())
      .filter(([k]) => k !== "general")
      .map(([k, list]) => {
        const inv = invoiceById.get(k as number);
        return { key: k as number, invoice: inv, receipts: list };
      })
      .filter((g) => {
        if (lower && g.invoice) {
          return g.invoice.documentNumber.toLowerCase().includes(lower);
        }
        return !lower;
      });
    invoiceGroups.sort((a, b) => {
      const ad = a.invoice?.issueDate ?? "";
      const bd = b.invoice?.issueDate ?? "";
      const d = bd.localeCompare(ad);
      return d !== 0 ? d : (b.key as number) - (a.key as number);
    });
    groups.push(...invoiceGroups);
    return onlyWithReceipts ? groups.filter((g) => g.receipts.length > 0) : groups;
  }, [balanceQuery.data, invoiceById, onlyWithReceipts, search, t]);

  const totals = useMemo(() => {
    const receipts = balanceQuery.data?.receipts ?? [];
    let count = 0;
    let amount = 0;
    let currency: string | undefined;
    let mixedCurrency = false;
    for (const r of receipts) {
      count += 1;
      amount += Number(r.amount) || 0;
      if (!currency) currency = r.currencyCode;
      else if (currency !== r.currencyCode) mixedCurrency = true;
    }
    return { count, amount, currency: mixedCurrency ? undefined : currency };
  }, [balanceQuery.data]);

  if (balanceQuery.isPending) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }
  if (balanceQuery.isError) {
    return <p className="text-sm text-red-600">{toErrorMessage(balanceQuery.error)}</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-sm text-zinc-600">{t("branch.currentAccountReceiptsHint")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">
            {t("branch.currentAccountReceiptsTotalCount")}
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-900 tabular-nums">
            {totals.count}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">
            {t("branch.currentAccountReceiptsTotalAmount")}
          </div>
          <div className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">
            {totals.currency
              ? formatLocaleAmount(totals.amount, locale, totals.currency)
              : `${formatLocaleAmount(totals.amount, locale, "TRY")} ·`}
            {!totals.currency && totals.count > 0 ? (
              <span className="ml-1 text-xs font-normal text-zinc-500">
                {t("branch.currentAccountReceiptsMixedCurrency")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          inputMode="search"
          placeholder={t("branch.currentAccountReceiptsSearchPlaceholder")}
          className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm sm:flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-zinc-900"
            checked={onlyWithReceipts}
            onChange={(e) => setOnlyWithReceipts(e.target.checked)}
          />
          <span className="text-zinc-700">
            {t("branch.currentAccountReceiptsFilterOnlyWithReceipts")}
          </span>
        </label>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {t("branch.currentAccountReceiptsEmpty")}
        </p>
      ) : null}

      <div className="space-y-3">
        {grouped.map((group) => {
          const isGeneral = group.key === "general";
          const inv = group.invoice;
          return (
            <div
              key={String(group.key)}
              className="rounded-xl border border-zinc-200 bg-white"
            >
              <div className="flex flex-col gap-2 border-b border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {isGeneral ? (
                    <div className="text-sm font-semibold text-amber-700">
                      {t("branch.ledgerReceiptGeneral")}
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-zinc-500">
                        {inv ? formatLocaleDate(inv.issueDate, locale) : "—"}
                      </div>
                      <div className="text-sm font-semibold text-zinc-900 break-all">
                        {inv ? inv.documentNumber : `Invoice #${group.key}`}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 tabular-nums">
                    {t("branch.currentAccountReceiptsInvoiceReceiptCount").replace(
                      "{n}",
                      String(group.receipts.length)
                    )}
                  </span>
                  {inv ? (
                    <>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 tabular-nums">
                        {t("branch.currentAccountColInvoiceTotal")}:{" "}
                        {formatLocaleAmount(inv.linesTotal, locale, inv.currencyCode)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          Number(inv.openAmount) > 0.009
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {t("branch.currentAccountColOpen")}:{" "}
                        {formatLocaleAmount(inv.openAmount, locale, inv.currencyCode)}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <ul className="divide-y divide-zinc-100">
                {[...group.receipts]
                  .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))
                  .map((receipt) => {
                    const isPending = pendingDeleteId === receipt.id;
                    const isDeleting =
                      deleteMut.isPending && deleteMut.variables === receipt.id;
                    return (
                      <li key={receipt.id} className="p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                                {formatLocaleAmount(
                                  receipt.amount,
                                  locale,
                                  receipt.currencyCode
                                )}
                              </span>
                              <span className="text-xs text-zinc-500 tabular-nums">
                                {formatLocaleDate(receipt.receiptDate, locale)}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                  kindBadgeClass(receipt.receiptKind)
                                )}
                              >
                                {t(kindLabelKey(receipt.receiptKind))}
                              </span>
                            </div>
                            {receipt.notes ? (
                              <p className="mt-1 break-words text-xs text-zinc-600">
                                {receipt.notes}
                              </p>
                            ) : null}
                          </div>

                          {canEdit ? (
                            <div className="flex shrink-0 items-center gap-2">
                              {isPending ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-zinc-600">
                                    {t("branch.currentAccountReceiptDeleteAsk")}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] text-xs"
                                    disabled={isDeleting}
                                    onClick={() => setPendingDeleteId(null)}
                                  >
                                    {t("branch.currentAccountReceiptDeleteCancel")}
                                  </Button>
                                  <Button
                                    type="button"
                                    className="min-h-[44px] min-w-[44px] bg-red-600 text-xs text-white hover:bg-red-700"
                                    disabled={isDeleting}
                                    onClick={() => deleteMut.mutate(receipt.id)}
                                  >
                                    {isDeleting
                                      ? t("common.loading")
                                      : t("branch.currentAccountReceiptDeleteConfirm")}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] p-0"
                                    aria-label={t("branch.currentAccountReceiptEdit")}
                                    title={t("branch.currentAccountReceiptEdit")}
                                    onClick={() => setEditTarget(receipt)}
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] p-0 text-red-700 hover:bg-red-50"
                                    aria-label={t("branch.currentAccountReceiptDelete")}
                                    title={t("branch.currentAccountReceiptDelete")}
                                    onClick={() => setPendingDeleteId(receipt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
      </div>

      <EditReceiptModal
        receipt={editTarget}
        locale={locale}
        t={t}
        onClose={() => setEditTarget(null)}
        onSaved={async () => {
          setEditTarget(null);
          await qc.invalidateQueries({ queryKey });
        }}
      />
    </div>
  );
}

type EditReceiptModalProps = {
  receipt: CustomerAccountReceiptResponse | null;
  locale: Locale;
  t: (key: string) => string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function EditReceiptModal({ receipt, locale, t, onClose, onSaved }: EditReceiptModalProps) {
  const open = receipt != null;
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CustomerAccountReceiptKind>("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (receipt) {
      setDate(receipt.receiptDate);
      setAmount(formatAmountInputOnBlur(String(receipt.amount), locale));
      setKind(receipt.receiptKind);
      setNotes(receipt.notes ?? "");
    }
  }, [receipt, locale]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!receipt) return;
      const parsed = parseLocaleAmount(amount, locale);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(t("branch.ledgerInvalidAmount"));
      }
      return updateCustomerAccountReceipt(receipt.id, {
        receiptDate: date,
        amount: parsed,
        receiptKind: kind,
        notes: notes.trim() || null,
      });
    },
    onSuccess: async () => {
      notify.success(t("branch.currentAccountReceiptUpdated"));
      await onSaved();
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="ledger-receipt-edit-title"
      title={t("branch.currentAccountReceiptUpdateModalTitle")}
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalDate")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-700">
            {t("branch.ledgerModalAmount")} ({receipt?.currencyCode ?? "TRY"})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => setAmount(formatAmountInputOnBlur(e.target.value, locale))}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalKind")}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CustomerAccountReceiptKind)}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
          >
            {KIND_KEYS.map((k) => (
              <option key={k.value} value={k.value}>
                {t(k.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalNotes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px]"
            disabled={mut.isPending}
            onClick={onClose}
          >
            {t("branch.ledgerModalCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? t("common.loading") : t("branch.currentAccountReceiptSaveEdit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

