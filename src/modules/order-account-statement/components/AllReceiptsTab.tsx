"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllReceipts,
  type AllReceiptsListFilters,
  type AllReceiptsListItem,
  type CustomerAccountReceiptKind,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import {
  GeneralReceiptModal,
  type CounterpartyOption,
} from "@/modules/order-account-statement/components/GeneralReceiptModal";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import { RichCombobox } from "@/shared/ui/RichCombobox";
import {
  fetchBranchDocuments,
  fetchBranchDocumentBlob,
} from "@/modules/branch/api/branch-documents-api";
import type { BranchDocument } from "@/types/branch-document";
import { notify } from "@/shared/lib/notify";

type KindDef = { value: CustomerAccountReceiptKind | ""; labelKey: string };

const KIND_OPTIONS: KindDef[] = [
  { value: "", labelKey: "reports.counterpartySummaryTypeAll" },
  { value: "cash", labelKey: "branch.ledgerModalKindCash" },
  { value: "bank_transfer", labelKey: "branch.ledgerModalKindBankTransfer" },
  { value: "check", labelKey: "branch.ledgerModalKindCheck" },
  { value: "advance_payment", labelKey: "branch.ledgerModalKindAdvance" },
  { value: "promo_discount", labelKey: "branch.ledgerModalKindPromo" },
  { value: "other", labelKey: "branch.ledgerModalKindOther" },
];

function kindLabelKey(kind: CustomerAccountReceiptKind): string {
  switch (kind) {
    case "cash":
      return "branch.ledgerModalKindCash";
    case "bank_transfer":
      return "branch.ledgerModalKindBankTransfer";
    case "check":
      return "branch.ledgerModalKindCheck";
    case "advance_payment":
      return "branch.ledgerModalKindAdvance";
    case "promo_discount":
      return "branch.ledgerModalKindPromo";
    default:
      return "branch.ledgerModalKindOther";
  }
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

type Props = {
  /** Cari Hesaplar sayfasındaki filtre durumundan miras alabilir. */
  initialFilters?: AllReceiptsListFilters;
  /** Counterparty seçici modal için cari listesi (parent sayfadan miras). */
  counterpartyOptions?: CounterpartyOption[];
};

/**
 * Cari Hesaplar sayfasındaki "Tahsilatlar" tab'i — tüm tahsilatları listeler.
 * Backend canonical: /customer-accounts/receipts/list.
 * Filtreler: tarih aralığı, kind, search.
 */
export function AllReceiptsTab({ initialFilters, counterpartyOptions = [] }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [counterpartyType, setCounterpartyType] = useState<"" | "branch" | "customer">(
    (initialFilters?.counterpartyType as "" | "branch" | "customer" | undefined) ?? ""
  );
  const [currencyCode, setCurrencyCode] = useState(initialFilters?.currencyCode ?? "TRY");
  const [dateFrom, setDateFrom] = useState(initialFilters?.receiptDateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialFilters?.receiptDateTo ?? "");
  const [kind, setKind] = useState<CustomerAccountReceiptKind | "">("");
  const [search, setSearch] = useState("");

  const filters = useMemo<AllReceiptsListFilters>(
    () => ({
      counterpartyType: counterpartyType || undefined,
      currencyCode: currencyCode || undefined,
      receiptDateFrom: dateFrom || undefined,
      receiptDateTo: dateTo || undefined,
      receiptKind: kind || undefined,
      search: search.trim() || undefined,
      limit: 500,
    }),
    [counterpartyType, currencyCode, dateFrom, dateTo, kind, search]
  );

  const q = useQuery({
    queryKey: ["allReceipts", filters],
    queryFn: () => fetchAllReceipts(filters),
    staleTime: 30_000,
  });

  const rows = q.data ?? [];

  // ───────────────────────────── Dekont/PDF eklentileri ─────────────────────────────
  // Görünen satırlardaki şube counterparty'leri için belgeleri toplu yükle ve
  // tarih+source eşleşmesiyle satır başına attachment map'i oluştur.
  const branchIds = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) if (r.counterpartyType === "branch") set.add(r.counterpartyId);
    return Array.from(set);
  }, [rows]);

  const docsQuery = useQuery({
    queryKey: ["allReceiptsBranchDocuments", branchIds.join(",")],
    queryFn: async () => {
      const out: Record<number, BranchDocument[]> = {};
      // Şube başına paralel fetch — küçük N için makul
      await Promise.all(
        branchIds.map(async (bid) => {
          try {
            out[bid] = await fetchBranchDocuments(bid);
          } catch {
            out[bid] = [];
          }
        })
      );
      return out;
    },
    enabled: branchIds.length > 0,
    staleTime: 30_000,
  });

  // Satır id → bağlı belge (varsa)
  const attachmentByReceiptId = useMemo(() => {
    const m = new Map<number, BranchDocument>();
    const docsMap = docsQuery.data ?? {};
    for (const r of rows) {
      if (r.counterpartyType !== "branch") continue;
      const list = docsMap[r.counterpartyId] ?? [];
      // notes pattern: title=banka_dekontu · source=current_account_receipt · receiptDate=YYYY-MM-DD
      const hit = list.find((d) => {
        const n = (d.notes ?? "").toLowerCase();
        return n.includes("source=current_account_receipt") && n.includes(`receiptdate=${r.receiptDate.toLowerCase()}`);
      });
      if (hit) m.set(r.id, hit);
    }
    return m;
  }, [rows, docsQuery.data]);

  // ───────────────── Önizleme modal state ─────────────────
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string>("");
  const [previewName, setPreviewName] = useState<string>("");
  const [previewBusyId, setPreviewBusyId] = useState<number | null>(null);

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewContentType("");
    setPreviewName("");
  };

  const openAttachmentPreview = async (receiptId: number, branchId: number, doc: BranchDocument) => {
    setPreviewBusyId(receiptId);
    try {
      const { blob, contentType } = await fetchBranchDocumentBlob(branchId, doc.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewContentType(contentType);
      setPreviewName(doc.originalFileName ?? `dekont-${doc.id}`);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPreviewBusyId(null);
    }
  };

  const downloadAttachment = async (receiptId: number, branchId: number, doc: BranchDocument) => {
    setPreviewBusyId(receiptId);
    try {
      const { blob, contentType } = await fetchBranchDocumentBlob(branchId, doc.id);
      const url = URL.createObjectURL(blob);
      const ext = (contentType.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFileName ?? `dekont-${doc.id}.${ext}`;
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPreviewBusyId(null);
    }
  };

  const totals = useMemo(() => {
    let cash = 0;
    let advance = 0;
    let promo = 0;
    let other = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      switch (r.receiptKind) {
        case "advance_payment":
          advance += amt;
          break;
        case "promo_discount":
          promo += amt;
          break;
        case "cash":
        case "bank_transfer":
        case "check":
          cash += amt;
          break;
        default:
          other += amt;
      }
    }
    return { count: rows.length, cash, advance, promo, other, total: cash + advance + promo + other };
  }, [rows]);

  return (
    <div className="space-y-3">
      {/* Sağ üst — Tahsilat ekleme butonu */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          className="inline-flex min-h-[44px] items-center gap-1.5"
          onClick={() => setReceiptModalOpen(true)}
        >
          <svg
            aria-hidden
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
          <span>{t("branch.ledgerAddGeneralReceipt")}</span>
        </Button>
      </div>

      {/* Üst filtreler — Tip / Kind / Para birimi / Tarih başlangıç / Bitiş */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 sm:p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-600">
              {t("reports.counterpartySummaryColType")}
            </label>
            <RichCombobox
              value={counterpartyType}
              onChange={(v) => setCounterpartyType((v || "") as "" | "branch" | "customer")}
              options={[
                { value: "", title: t("reports.counterpartySummaryTypeAll") },
                { value: "branch", title: t("reports.counterpartySummaryTypeBranch") },
                { value: "customer", title: t("reports.counterpartySummaryTypeCustomer") },
              ]}
              placeholder={t("reports.counterpartySummaryTypeAll")}
              searchPlaceholder={t("common.search")}
              emptyText={t("common.noResults")}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-600">
              {t("branch.ledgerModalKind")}
            </label>
            <RichCombobox
              value={kind}
              onChange={(v) => setKind((v || "") as CustomerAccountReceiptKind | "")}
              options={KIND_OPTIONS.map((k) => ({
                value: k.value,
                title: t(k.labelKey),
              }))}
              placeholder={t("common.select")}
              searchPlaceholder={t("common.search")}
              emptyText={t("common.noResults")}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-600">
              {t("branch.currentAccountReceiptCurrency")}
            </label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="TRY"
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/80"
            />
          </div>

          <div>
            <DateField
              mode="date"
              label={t("reports.counterpartySummaryFilterDateFrom")}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <DateField
              mode="date"
              label={t("reports.counterpartySummaryFilterDateTo")}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard title={t("branch.currentAccountReceiptsTotalCount")} value={String(totals.count)} />
        <SummaryCard
          title={t("branch.currentAccountColPaid")}
          value={formatLocaleAmount(totals.cash, locale, currencyCode || "TRY")}
          color="text-emerald-700"
        />
        <SummaryCard
          title={t("branch.currentAccountColAdvance")}
          value={formatLocaleAmount(totals.advance, locale, currencyCode || "TRY")}
          color="text-sky-700"
        />
        <SummaryCard
          title={t("branch.currentAccountColPromo")}
          value={formatLocaleAmount(totals.promo, locale, currencyCode || "TRY")}
          color="text-violet-700"
        />
        <SummaryCard
          title={t("branch.currentAccountReceiptsTotalAmount")}
          value={formatLocaleAmount(totals.total, locale, currencyCode || "TRY")}
        />
      </div>

      {/* Arama — tablonun HEMEN üstünde, full width, responsive */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium text-zinc-600">{t("common.search")}</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            <svg
              aria-hidden
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/80"
          />
        </div>
      </div>

      {/* Hata + yüklenme */}
      {q.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toErrorMessage(q.error)}
        </p>
      ) : null}
      {q.isPending ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}

      {/* Liste — mobil kart */}
      {!q.isPending && rows.length > 0 ? (
        <div className="space-y-2 lg:hidden">
          {rows.map((r) => {
            const att = attachmentByReceiptId.get(r.id);
            const busy = previewBusyId === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-zinc-900">
                      {r.counterpartyType === "branch" ? "🏢 " : "👤 "}
                      {r.counterpartyName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {formatLocaleDate(r.receiptDate, locale)}
                      {r.linkedDocumentNumber ? ` · ${r.linkedDocumentNumber}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-base font-bold tabular-nums text-zinc-900">
                    {formatLocaleAmount(r.amount, locale, r.currencyCode)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${kindBadgeClass(
                      r.receiptKind
                    )}`}
                  >
                    {t(kindLabelKey(r.receiptKind))}
                  </span>
                  <div className="flex items-center gap-1">
                    {att ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void openAttachmentPreview(r.id, r.counterpartyId, att)}
                          aria-label={t("branch.currentAccountReceiptImageView") || "Görüntüle"}
                          title={t("branch.currentAccountReceiptImageView") || "Görüntüle"}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void downloadAttachment(r.id, r.counterpartyId, att)}
                          aria-label={t("branch.currentAccountReceiptImageDownload") || "İndir"}
                          title={t("branch.currentAccountReceiptImageDownload") || "İndir"}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M5 21h14" />
                          </svg>
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {r.notes ? (
                  <p className="mt-1 truncate text-[11px] text-zinc-500" title={r.notes}>
                    {r.notes}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Liste — desktop tablo */}
      {!q.isPending && rows.length > 0 ? (
        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white lg:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColIssueDate")}</th>
                <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColName")}</th>
                <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColType")}</th>
                <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColInvoiceRef")}</th>
                <th className="px-3 py-2 text-right">{t("branch.ledgerModalAmount")}</th>
                <th className="px-3 py-2 text-left">{t("branch.ledgerModalKind")}</th>
                <th className="px-3 py-2 text-left">{t("branch.ledgerModalNotes")}</th>
                <th className="px-3 py-2 text-center">
                  {t("branch.currentAccountColReceiptImageStatus") || "Dekont"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const att = attachmentByReceiptId.get(r.id);
                const busy = previewBusyId === r.id;
                return (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-600">{formatLocaleDate(r.receiptDate, locale)}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {r.counterpartyType === "branch" ? "🏢 " : "👤 "}
                      {r.counterpartyName}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {r.counterpartyType === "branch"
                        ? t("reports.counterpartySummaryTypeBranch")
                        : t("reports.counterpartySummaryTypeCustomer")}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{r.linkedDocumentNumber ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatLocaleAmount(r.amount, locale, r.currencyCode)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${kindBadgeClass(
                          r.receiptKind
                        )}`}
                      >
                        {t(kindLabelKey(r.receiptKind))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      <span className="line-clamp-1" title={r.notes ?? ""}>
                        {r.notes ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {att ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void openAttachmentPreview(r.id, r.counterpartyId, att)}
                            aria-label={t("branch.currentAccountReceiptImageView") || "Görüntüle"}
                            title={t("branch.currentAccountReceiptImageView") || "Görüntüle"}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                          >
                            <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void downloadAttachment(r.id, r.counterpartyId, att)}
                            aria-label={t("branch.currentAccountReceiptImageDownload") || "İndir"}
                            title={t("branch.currentAccountReceiptImageDownload") || "İndir"}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                          >
                            <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3v12" />
                              <path d="m7 10 5 5 5-5" />
                              <path d="M5 21h14" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!q.isPending && rows.length === 0 && !q.isError ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500">
          {t("branch.ledgerHistoryEmpty")}
        </p>
      ) : null}

      <GeneralReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        counterparty={{ mode: "selectable", options: counterpartyOptions }}
        locale={locale}
        t={t}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ["allReceipts"] });
        }}
      />

      <Modal
        open={previewUrl != null}
        onClose={closePreview}
        titleId="all-receipts-attachment-preview"
        title={previewName || t("branch.currentAccountReceiptImage")}
      >
        {previewUrl && previewContentType.startsWith("image/") ? (
          <div className="flex max-h-[70vh] items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={previewName} className="max-h-[70vh] max-w-full object-contain" />
          </div>
        ) : previewUrl && previewContentType === "application/pdf" ? (
          <iframe
            src={previewUrl}
            title={previewName}
            className="h-[70vh] w-full rounded-lg border border-zinc-200"
          />
        ) : previewUrl ? (
          <a
            href={previewUrl}
            download={previewName}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t("branch.currentAccountReceiptImageDownload") || "İndir"}
          </a>
        ) : null}
      </Modal>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">
        {title}
      </p>
      <p className={`mt-1 break-words text-base font-semibold tabular-nums sm:text-lg ${color ?? "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}
