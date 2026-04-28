"use client";

import { Checkbox } from "@/shared/ui/Checkbox";
import type { Dispatch, SetStateAction } from "react";

type Props = {
  t: (key: string) => string;
  saveAsInvoice: boolean;
  setSaveAsInvoice: Dispatch<SetStateAction<boolean>>;
  saveToSystem: boolean;
  setSaveToSystem: Dispatch<SetStateAction<boolean>>;
  invoiceAutoPost: boolean;
  setInvoiceAutoPost: Dispatch<SetStateAction<boolean>>;
  customerAccountIdText: string;
  setCustomerAccountIdText: Dispatch<SetStateAction<string>>;
  linkedBranchId: string;
  invoicePaymentDetailsOpen: boolean;
  setInvoicePaymentDetailsOpen: Dispatch<SetStateAction<boolean>>;
  paymentIban: string;
  setPaymentIban: Dispatch<SetStateAction<string>>;
  paymentAccountHolder: string;
  setPaymentAccountHolder: Dispatch<SetStateAction<string>>;
  paymentBankName: string;
  setPaymentBankName: Dispatch<SetStateAction<string>>;
  paymentNote: string;
  setPaymentNote: Dispatch<SetStateAction<string>>;
  showPaymentOnPdf: boolean;
  setShowPaymentOnPdf: Dispatch<SetStateAction<boolean>>;
};

export function OrderAccountStatementPreviewSettings(props: Props) {
  const {
    t,
    saveAsInvoice,
    setSaveAsInvoice,
    saveToSystem,
    setSaveToSystem,
    invoiceAutoPost,
    setInvoiceAutoPost,
    customerAccountIdText,
    setCustomerAccountIdText,
    linkedBranchId,
    invoicePaymentDetailsOpen,
    setInvoicePaymentDetailsOpen,
    paymentIban,
    setPaymentIban,
    paymentAccountHolder,
    setPaymentAccountHolder,
    paymentBankName,
    setPaymentBankName,
    paymentNote,
    setPaymentNote,
    showPaymentOnPdf,
    setShowPaymentOnPdf,
  } = props;

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700">Cikti ayarlari</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:border-zinc-300">
          <Checkbox className="mt-0.5 shrink-0" checked={saveAsInvoice} onCheckedChange={setSaveAsInvoice} />
          <span className="font-medium text-zinc-800">{t("reports.orderAccountStatementInvoiceSaveToggle")}</span>
        </label>
        <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:border-zinc-300">
          <Checkbox className="mt-0.5 shrink-0" checked={saveToSystem} onCheckedChange={setSaveToSystem} />
          <span className="font-medium text-zinc-800">{t("reports.orderAccountStatementSystemSaveToggle")}</span>
        </label>
      </div>
      {saveAsInvoice ? (
        <div className="mt-2 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:border-zinc-300">
              <Checkbox className="mt-0.5 shrink-0" checked={invoiceAutoPost} onCheckedChange={setInvoiceAutoPost} />
              <span className="font-medium text-zinc-700">{t("reports.orderAccountStatementInvoiceAutoPost")}</span>
            </label>
            <label className="block text-xs">
              <span className="text-zinc-600">{t("reports.orderAccountStatementCustomerAccountId")}</span>
              <input
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
                value={customerAccountIdText}
                onChange={(e) => setCustomerAccountIdText(e.target.value)}
                placeholder={t("reports.orderAccountStatementCustomerAccountIdPlaceholder")}
                disabled={Boolean(linkedBranchId)}
              />
            </label>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-xs"
              onClick={() => setInvoicePaymentDetailsOpen((v) => !v)}
            >
              <span className="font-medium text-zinc-700">Odeme bilgileri (opsiyonel)</span>
              <span className="text-zinc-500">{invoicePaymentDetailsOpen ? "Gizle" : "Goster"}</span>
            </button>
            {invoicePaymentDetailsOpen ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="text-zinc-600">{t("reports.orderAccountStatementPaymentIban")}</span>
                  <input className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs uppercase outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200" value={paymentIban} onChange={(e) => setPaymentIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-600">{t("reports.orderAccountStatementPaymentAccountHolder")}</span>
                  <input className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200" value={paymentAccountHolder} onChange={(e) => setPaymentAccountHolder(e.target.value)} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-600">{t("reports.orderAccountStatementPaymentBankName")}</span>
                  <input className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200" value={paymentBankName} onChange={(e) => setPaymentBankName(e.target.value)} />
                </label>
                <label className="block text-xs">
                  <span className="text-zinc-600">{t("reports.orderAccountStatementPaymentNote")}</span>
                  <input className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                </label>
                <label className="sm:col-span-2 flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs">
                  <Checkbox className="mt-0.5 shrink-0" checked={showPaymentOnPdf} onCheckedChange={setShowPaymentOnPdf} />
                  <span className="font-medium text-zinc-700">{t("reports.orderAccountStatementPaymentShowOnPdf")}</span>
                </label>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
