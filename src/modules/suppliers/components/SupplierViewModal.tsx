"use client";

import type { Supplier } from "@/modules/suppliers/api/suppliers-api";
import {
  useDeleteSupplierPayment,
  useSupplierPayments,
  useSupplierView,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { SupplierPaymentModal } from "@/modules/suppliers/components/SupplierPaymentModal";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tab = "general" | "payments" | "summary";

function InfoTile({
  label,
  children,
  className,
  valueClassName,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/90 p-4 shadow-sm ring-1 ring-zinc-900/[0.035]",
        className
      )}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <div
        className={cn(
          "mt-2 min-w-0 break-words text-sm font-semibold leading-snug text-zinc-900",
          valueClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

const linkAct =
  "font-semibold text-violet-700 underline-offset-2 transition hover:text-violet-900 hover:underline active:text-violet-950";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

export function SupplierViewModal({
  open,
  supplierId,
  fallback,
  initialTab,
  onClose,
}: {
  open: boolean;
  supplierId: number | null;
  fallback: Supplier | null;
  initialTab?: Tab;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const tr = locale === "tr";
  const [tab, setTab] = useState<Tab>(initialTab ?? "general");
  const [payOpen, setPayOpen] = useState(false);
  const q = useSupplierView(supplierId, open && supplierId != null && supplierId > 0);
  const paymentsQ = useSupplierPayments(
    supplierId,
    open && supplierId != null && supplierId > 0 && tab === "payments",
  );
  const deletePayment = useDeleteSupplierPayment();

  const onDeletePayment = (paymentId: number) => {
    notifyConfirmToast({
      toastId: `supplier-payment-delete-${paymentId}`,
      title: tr ? "Ödemeyi sil?" : "Delete payment?",
      message: (
        <p className="text-sm text-zinc-600">
          {tr
            ? "Ödeme silinecek; zimmet kaynaklıysa personel zimmeti geri yüklenir."
            : "The payment will be removed; if paid from held cash, the personnel balance is restored."}
        </p>
      ),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: () => {
        deletePayment.mutate(paymentId, {
          onSuccess: () => notify.success(tr ? "Ödeme silindi." : "Payment deleted."),
          onError: (e) => notify.error(toErrorMessage(e)),
        });
      },
    });
  };

  useEffect(() => {
    if (open) setTab(initialTab ?? "general");
  }, [open, supplierId, initialTab]);

  const s = q.data?.supplier ?? fallback;
  const cur = s?.currencyCode?.trim().toUpperCase() || "TRY";
  const openBalance = q.data?.totalOpenBalance ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="supplier-view-title"
      title={t("suppliers.viewTitle")}
      wide
      wideFixedHeight
      closeButtonLabel={t("common.close")}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
        <div className="-mx-1 flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-100 pb-3 pt-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:gap-2">
          <button
            type="button"
            onClick={() => setTab("general")}
            className={cn(
              "min-h-11 shrink-0 touch-manipulation rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2",
              tab === "general"
                ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {t("suppliers.viewTabGeneral")}
          </button>
          <button
            type="button"
            onClick={() => setTab("payments")}
            className={cn(
              "min-h-11 shrink-0 touch-manipulation rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2",
              tab === "payments"
                ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {tr ? "Ödemeler" : "Payments"}
          </button>
          <button
            type="button"
            onClick={() => setTab("summary")}
            className={cn(
              "min-h-11 shrink-0 touch-manipulation rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-2",
              tab === "summary"
                ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {t("suppliers.viewTabSummary")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {q.isPending && !q.data ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : q.isError ? (
            <p className="text-sm text-red-600">{toErrorMessage(q.error)}</p>
          ) : !s ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : tab === "general" ? (
            <div className="space-y-4 pb-1">
              <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-white p-4 shadow-sm ring-1 ring-violet-100/60 sm:p-5">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-pretty text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                      {s.name}
                    </h2>
                    <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-violet-600/10 px-3 py-1 text-xs font-bold tabular-nums tracking-wide text-violet-900 ring-1 ring-violet-600/15">
                        {s.currencyCode}
                      </span>
                      {q.data?.isDeleted ? (
                        <StatusBadge tone="deleted" size="md" className="normal-case">
                          {t("suppliers.viewDeletedBadge")}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
                  {t("suppliers.viewGeneralContactSection")}
                </p>
                <InfoTile label={t("suppliers.phone")}>
                  {s.phone?.trim() ? (
                    <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className={linkAct}>
                      {s.phone.trim()}
                    </a>
                  ) : (
                    <span className="font-medium text-zinc-400">—</span>
                  )}
                </InfoTile>
                <InfoTile label={t("suppliers.email")}>
                  {s.email?.trim() ? (
                    <a href={`mailto:${encodeURIComponent(s.email.trim())}`} className={cn(linkAct, "break-all")}>
                      {s.email.trim()}
                    </a>
                  ) : (
                    <span className="font-medium text-zinc-400">—</span>
                  )}
                </InfoTile>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
                  {t("suppliers.viewGeneralCompanySection")}
                </p>
                <InfoTile label={t("suppliers.taxId")}>
                  {s.taxId?.trim() ? s.taxId : <span className="font-medium text-zinc-400">—</span>}
                </InfoTile>
                <InfoTile label={t("suppliers.paymentTermsDays")}>
                  {s.defaultPaymentTermsDays != null ? (
                    <span className="tabular-nums">{String(s.defaultPaymentTermsDays)}</span>
                  ) : (
                    <span className="font-medium text-zinc-400">—</span>
                  )}
                </InfoTile>
                <InfoTile
                  label={t("suppliers.notes")}
                  className="sm:col-span-2"
                  valueClassName="font-normal leading-relaxed text-zinc-800"
                >
                  {s.notes?.trim() ? (
                    <span className="block whitespace-pre-wrap">{s.notes}</span>
                  ) : (
                    <span className="font-medium text-zinc-400">—</span>
                  )}
                </InfoTile>
              </div>
            </div>
          ) : tab === "payments" ? (
            <div className="space-y-4">
              <section
                className={cn(
                  "rounded-2xl border p-4 shadow-sm",
                  openBalance > 0
                    ? "border-red-200/70 bg-gradient-to-br from-red-50/80 via-white to-white"
                    : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white",
                )}
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  {tr ? "Açık borç" : "Open balance"}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-2xl font-bold tabular-nums sm:text-3xl",
                    openBalance > 0 ? "text-red-700" : "text-emerald-700",
                  )}
                >
                  {formatLocaleAmount(openBalance, locale, cur)}
                </p>
                <Button
                  type="button"
                  className="mt-3 !min-h-11 w-full sm:w-auto"
                  onClick={() => setPayOpen(true)}
                  disabled={!supplierId}
                >
                  {tr ? "Ödeme yap" : "Make payment"}
                </Button>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {tr ? "Geçmiş ödemeler" : "Past payments"}
                </h3>
                {paymentsQ.isPending ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : paymentsQ.isError ? (
                  <p className="text-sm text-red-600">{toErrorMessage(paymentsQ.error)}</p>
                ) : (paymentsQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    {tr ? "Henüz ödeme yok." : "No payments yet."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {[...(paymentsQ.data ?? [])]
                      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
                      .map((pmt) => (
                        <li
                          key={pmt.id}
                          className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900">
                              {pmt.paymentDate.slice(0, 10)}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {sourceLabel(pmt.sourceType, tr)}
                              {pmt.branchName ? ` · ${pmt.branchName}` : ""}
                              {pmt.description ? ` · ${pmt.description}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p className="text-base font-bold tabular-nums text-zinc-900">
                              {formatLocaleAmount(pmt.amount, locale, pmt.currencyCode)}
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-red-600"
                              disabled={deletePayment.isPending}
                              onClick={() => onDeletePayment(pmt.id)}
                            >
                              {t("common.delete")}
                            </Button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </div>
          ) : q.data ? (
            <div className="space-y-4">
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.viewSummaryHint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Stat label={t("suppliers.viewInvoiceCount")} value={String(q.data.invoiceCount)} />
                <Stat
                  label={t("suppliers.viewTotalInvoiced")}
                  value={formatLocaleAmount(q.data.totalInvoiced, locale, cur)}
                />
                <Stat
                  label={t("suppliers.viewTotalPaidAllocated")}
                  value={formatLocaleAmount(q.data.totalPaidOnInvoices, locale, cur)}
                />
                <Stat
                  label={t("suppliers.viewTotalOpen")}
                  value={formatLocaleAmount(q.data.totalOpenBalance, locale, cur)}
                />
                <Stat label={t("suppliers.viewPaymentCount")} value={String(q.data.paymentRecordCount)} />
                <Stat
                  label={t("suppliers.viewTotalPaymentHeaders")}
                  value={formatLocaleAmount(q.data.totalPaymentAmounts, locale, cur)}
                />
              </div>
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.viewPaymentVsAllocatedHint")}</p>
              <Link
                href={`/suppliers/invoices?supplierId=${s.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm shadow-zinc-900/5 transition hover:bg-zinc-50 sm:w-auto"
              >
                {t("suppliers.viewOpenInvoices")}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      <SupplierPaymentModal
        open={payOpen}
        supplierId={supplierId}
        supplierName={s?.name ?? ""}
        currencyCode={cur}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          // refresh open balance + payments list
          void q.refetch();
          void paymentsQ.refetch();
        }}
      />
    </Modal>
  );
}

function sourceLabel(src: string, tr: boolean): string {
  const u = (src || "").toUpperCase();
  if (u === "CASH") return tr ? "Kasa" : "Cash";
  if (u === "BANK") return tr ? "Banka" : "Bank";
  if (u === "PATRON") return tr ? "Patron" : "Patron";
  if (u === "PERSONNEL_HELD_REGISTER_CASH")
    return tr ? "Personel zimmeti" : "Personnel-held cash";
  return src;
}
