"use client";

import {
  fetchSupplierInvoiceLineBranchAllocations,
  type SupplierInvoiceDetail,
  type SupplierInvoiceLineBranchAllocationsState,
  type SupplierInvoiceListItem,
} from "@/modules/suppliers/api/suppliers-api";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { SupplierLineBranchAllocationModal } from "@/modules/suppliers/components/SupplierLineBranchAllocationModal";
import { SupplierInvoicePhotoField } from "@/modules/suppliers/components/SupplierInvoicePhotoField";
import { SupplierInvoicePhotoPreviewModal } from "@/modules/suppliers/components/SupplierInvoicePhotoPreviewModal";
import { SupplierInvoicePhotoThumb } from "@/modules/suppliers/components/SupplierInvoicePhotoThumb";
import { useSupplierInvoicePhotoBlob } from "@/modules/suppliers/components/useSupplierInvoicePhoto";
import {
  supplierKeys,
  useCreateSupplierInvoice,
  useCreateSupplierPayment,
  useHeldCashPersonnelPool,
  useDeleteSupplierInvoicePhoto,
  useSupplierInvoice,
  useSupplierInvoiceAuditLogs,
  useSupplierInvoices,
  useSuppliers,
  useUpdateSupplierInvoice,
  useUploadSupplierInvoicePhoto,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useWarehousePeopleOptions, useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  mapWarehousePersonnelOptions,
  withWarehousePersonnelPickPlaceholder,
} from "@/modules/warehouse/lib/warehouse-personnel-select";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import Link from "next/link";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { DateField } from "@/shared/ui/DateField";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { PencilIcon } from "@/shared/ui/EyeIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { ToolbarGlyphReceipt } from "@/shared/ui/ToolbarGlyph";
import { apiFetch } from "@/shared/api/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SupplierInvoicePaymentModal } from "@/modules/suppliers/components/invoices/SupplierInvoicePaymentModal";
import { SupplierInvoiceEditModal } from "@/modules/suppliers/components/invoices/SupplierInvoiceEditModal";
import { SupplierInvoiceDetailModal } from "@/modules/suppliers/components/invoices/SupplierInvoiceDetailModal";
import { SupplierInvoiceLineEditorModal } from "@/modules/suppliers/components/invoices/SupplierInvoiceLineEditorModal";
import { SupplierInvoiceCreateModal } from "@/modules/suppliers/components/invoices/SupplierInvoiceCreateModal";

type LineReceiveTarget = "none" | "warehouse" | "branch";

type InvCreateFormErrors = Partial<{
  supplier: string;
  documentDate: string;
  lines: string;
  whChecked: string;
  whApproved: string;
}>;

type InvLineEditFormErrors = Partial<{
  lineAmount: string;
  receiveBranch: string;
  receiveWarehouse: string;
  product: string;
  quantity: string;
}>;

type PayFormErrors = Partial<{ date: string; amount: string; branch: string; personnel: string }>;

type EditInvFormErrors = Partial<{ documentDate: string }>;

type InvoiceLineDraft = {
  key: string;
  receiveTarget: LineReceiveTarget;
  receiveBranchId: string;
  receiveWarehouseId: string;
  description: string;
  lineAmount: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  productId: string;
};

function emptyLine(): InvoiceLineDraft {
  return {
    key: crypto.randomUUID(),
    receiveTarget: "none",
    receiveBranchId: "",
    receiveWarehouseId: "",
    description: "",
    lineAmount: "",
    quantity: "",
    unitPrice: "",
    vatRate: "",
    productId: "",
  };
}

/**
 * Miktar ve birim fiyat doluysa Satır tutarı'nı otomatik doldurur (lineAmount = qty × unitPrice).
 * Eksik veya geçersizse draft'a dokunmaz — kullanıcının manuel girişini ezmez.
 */
function autoFillLineAmount(d: InvoiceLineDraft, locale: Locale): InvoiceLineDraft {
  const qty = parseDec(d.quantity);
  const up = parseDec(d.unitPrice);
  if (qty == null || qty <= 0 || up == null || up < 0) return d;
  const total = Math.round(qty * up * 100) / 100;
  return { ...d, lineAmount: formatAmountInputOnBlur(String(total), locale) };
}

function parseDec(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntId(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function supplierInvoiceLooksPaid(row: SupplierInvoiceListItem): boolean {
  return row.openAmount <= 0.005 || row.paymentMarkedComplete;
}

function InvoiceFilterDrawerIconWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600">
      {children}
    </div>
  );
}

const AUDIT_HEADER_KEYS = [
  "documentNumber",
  "documentDate",
  "dueDate",
  "description",
  "paymentMarkedComplete",
  "formalSupplierInvoiceIssued",
] as const;

type AuditHeaderKey = (typeof AUDIT_HEADER_KEYS)[number];

function parseAuditEnvelope(raw: string | null): {
  header: Partial<Record<AuditHeaderKey, unknown>>;
  changeNote: string | null;
} {
  if (!raw) return { header: {}, changeNote: null };
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const bag = (j.header ?? j.snapshot) as Record<string, unknown> | undefined;
    const header: Partial<Record<AuditHeaderKey, unknown>> = {};
    if (bag && typeof bag === "object") {
      for (const k of AUDIT_HEADER_KEYS) {
        if (k in bag) header[k] = bag[k];
      }
    }
    const cn = j.changeNote;
    const note = typeof cn === "string" && cn.trim() ? cn.trim() : null;
    return { header, changeNote: note };
  } catch {
    return { header: {}, changeNote: null };
  }
}

function stableJsonish(a: unknown): string {
  return JSON.stringify(a, (_k, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v as object)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (v as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return v;
  });
}

function eqAuditValue(a: unknown, b: unknown): boolean {
  return stableJsonish(a ?? null) === stableJsonish(b ?? null);
}

function diffInvoiceHeaderAudit(
  oldH: Partial<Record<AuditHeaderKey, unknown>>,
  newH: Partial<Record<AuditHeaderKey, unknown>>
): Array<{ key: AuditHeaderKey; before: unknown; after: unknown }> {
  const out: Array<{ key: AuditHeaderKey; before: unknown; after: unknown }> = [];
  for (const k of AUDIT_HEADER_KEYS) {
    const o = k in oldH ? oldH[k] : undefined;
    const n = k in newH ? newH[k] : undefined;
    if (!eqAuditValue(o, n)) out.push({ key: k, before: o, after: n });
  }
  return out;
}

function formatAuditFieldValue(value: unknown, t: (key: string) => string): string {
  if (value === null || value === undefined) return t("suppliers.invoiceAuditValueEmpty");
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "string") return value.trim() || t("suppliers.invoiceAuditValueEmpty");
  return String(value);
}

function auditFieldLabelKey(key: AuditHeaderKey): string {
  const map: Record<AuditHeaderKey, string> = {
    documentNumber: "suppliers.invoiceAuditField_documentNumber",
    documentDate: "suppliers.invoiceAuditField_documentDate",
    dueDate: "suppliers.invoiceAuditField_dueDate",
    description: "suppliers.invoiceAuditField_description",
    paymentMarkedComplete: "suppliers.invoiceAuditField_paymentMarkedComplete",
    formalSupplierInvoiceIssued: "suppliers.invoiceAuditField_formalSupplierInvoiceIssued",
  };
  return map[key];
}

function formatAuditWhen(iso: string, loc: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(loc === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function SupplierInvoiceAuditHistoryPanel({
  invoiceId,
  locale,
  t,
}: {
  invoiceId: number;
  locale: Locale;
  t: (key: string) => string;
}) {
  const { data: rows = [], isPending, isError } = useSupplierInvoiceAuditLogs(invoiceId, true);

  const blocks = useMemo(() => {
    const updates = rows.filter((r) => r.action === "UPDATE");
    return updates
      .map((row) => {
        const oldP = parseAuditEnvelope(row.oldData);
        const newP = parseAuditEnvelope(row.newData);
        const diffs = diffInvoiceHeaderAudit(oldP.header, newP.header);
        const note = newP.changeNote ?? oldP.changeNote;
        if (diffs.length === 0 && !note) return null;
        return { row, diffs, note };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [rows]);

  if (isPending) {
    return <p className="mt-4 text-xs text-zinc-500">{t("common.loading")}</p>;
  }
  if (isError) {
    return <p className="mt-4 text-xs text-red-700">{t("suppliers.invoiceEditHistoryLoadFailed")}</p>;
  }
  if (blocks.length === 0) {
    return <p className="mt-4 text-xs text-zinc-500">{t("suppliers.invoiceEditHistoryEmpty")}</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{t("suppliers.invoiceEditHistory")}</p>
      <ul className="space-y-3">
        {blocks.map(({ row, diffs, note }) => (
          <li
            key={row.id}
            className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 text-sm shadow-sm shadow-zinc-900/[0.03]"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>
                {t("suppliers.invoiceAuditWhen")}:{" "}
                <span className="font-medium text-zinc-700">{formatAuditWhen(row.createdAt, locale)}</span>
              </span>
              {row.userId != null ? (
                <span>
                  {t("suppliers.invoiceAuditUser")}: <span className="font-mono font-medium text-zinc-700">#{row.userId}</span>
                </span>
              ) : null}
            </div>
            {diffs.length > 0 ? (
              <ul className="mt-2 space-y-2.5 border-t border-dashed border-zinc-200 pt-2">
                {diffs.map((d) => (
                  <li key={d.key} className="text-xs leading-relaxed text-zinc-800">
                    <p className="font-semibold text-zinc-900">{t(auditFieldLabelKey(d.key))}</p>
                    <p className="mt-1 text-zinc-500">
                      <span className="font-medium text-zinc-600">{t("suppliers.invoiceAuditBefore")}: </span>
                      {formatAuditFieldValue(d.before, t)}
                    </p>
                    <p className="mt-0.5 font-medium text-zinc-900">
                      <span className="text-zinc-600">{t("suppliers.invoiceAuditAfter")}: </span>
                      {formatAuditFieldValue(d.after, t)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {note ? (
              <p className="mt-2 border-t border-dashed border-zinc-200 pt-2 text-xs text-zinc-600">
                <span className="font-semibold text-zinc-800">{t("suppliers.invoiceChangeNoteLabel")}: </span>
                {note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function useWarehouseMovementInvoicePhotoPreview(movementId: number | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (movementId == null || movementId <= 0) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setObjectUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setObjectUrl(null);

    void (async () => {
      try {
        const res = await apiFetch(`/warehouse/movements/${movementId}/invoice-photo`);
        if (cancelled) return;
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setObjectUrl(u);
      } catch {
        /* no file */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [movementId]);

  return { objectUrl, loading };
}

function SupplierInvoiceDetailHero({
  invoice,
  locale,
  t,
  onPreviewInvoicePhoto,
}: {
  invoice: SupplierInvoiceDetail;
  locale: Locale;
  t: (key: string) => string;
  onPreviewInvoicePhoto?: () => void;
}) {
  const movementId = useMemo(() => {
    const line = invoice.lines.find((l) => l.warehouseMovementId != null && l.warehouseMovementId > 0);
    return line?.warehouseMovementId ?? null;
  }, [invoice.lines]);

  const hasInvoicePhoto = Boolean(invoice.hasInvoicePhoto);
  const { objectUrl: invoicePhotoUrl, loading: invoicePhotoLoading } = useSupplierInvoicePhotoBlob(
    invoice.id,
    hasInvoicePhoto,
  );
  const { objectUrl: movementPhotoUrl, loading: movementPhotoLoading } =
    useWarehouseMovementInvoicePhotoPreview(hasInvoicePhoto ? null : movementId);

  const photoUrl = hasInvoicePhoto ? invoicePhotoUrl : movementPhotoUrl;
  const photoLoading = hasInvoicePhoto ? invoicePhotoLoading : movementPhotoLoading;
  const showPhotoPanel =
    hasInvoicePhoto
      ? invoicePhotoLoading || invoicePhotoUrl
      : movementId != null && movementId > 0 && (movementPhotoLoading || movementPhotoUrl);

  const docNo = invoice.documentNumber?.trim();
  const displayRef = docNo && docNo.length > 0 ? docNo : `#${invoice.id}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5",
        showPhotoPanel ? "lg:grid lg:grid-cols-[1fr_minmax(160px,220px)] xl:grid-cols-[1fr_minmax(180px,260px)]" : undefined
      )}
    >
      {showPhotoPanel ? (
        <div className="order-first border-b border-zinc-100 bg-zinc-50/90 p-3 sm:p-4 lg:order-2 lg:border-b-0 lg:border-l lg:border-zinc-100">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("suppliers.invoiceDetailScanLabel")}
          </p>
          <div
            className={cn(
              "relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-100 shadow-inner shadow-zinc-900/5 sm:aspect-[16/10] lg:aspect-[3/4] lg:max-h-[min(52vh,320px)]",
              hasInvoicePhoto && photoUrl ? "cursor-zoom-in" : undefined,
            )}
            onClick={() => {
              if (hasInvoicePhoto && photoUrl) onPreviewInvoicePhoto?.();
            }}
          >
            {photoLoading ? (
              <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-zinc-500">
                {t("common.loading")}
              </div>
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
              <img src={photoUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : null}
          </div>
          {hasInvoicePhoto && photoUrl ? (
            <button
              type="button"
              onClick={() => onPreviewInvoicePhoto?.()}
              className="mt-3 flex min-h-10 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-center text-xs font-semibold text-zinc-800 shadow-sm shadow-zinc-900/5 transition hover:bg-zinc-50"
            >
              {t("suppliers.invoicePhotoOpen")}
            </button>
          ) : !hasInvoicePhoto && photoUrl && movementId ? (
            <a
              href={warehouseMovementInvoicePhotoUrl(movementId)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex min-h-10 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-center text-xs font-semibold text-zinc-800 shadow-sm shadow-zinc-900/5 transition hover:bg-zinc-50"
            >
              {t("warehouse.openInvoicePhoto")}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className={cn("p-4 sm:p-5", showPhotoPanel ? "lg:order-1" : undefined)}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{t("suppliers.name")}</p>
            <p className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-zinc-900">{invoice.supplierName}</p>
            {invoice.description?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{invoice.description.trim()}</p>
            ) : null}
          </div>
          <div className="shrink-0 sm:max-w-[240px] sm:border-l sm:border-zinc-100 sm:pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {t("suppliers.invoiceDetailPurchaseInvoice")}
            </p>
            <p className="mt-1.5 break-all font-mono text-xl font-bold tabular-nums tracking-tight text-zinc-900 sm:text-2xl">
              {displayRef}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-zinc-500">{t("suppliers.documentDate")}</dt>
                <dd className="font-medium tabular-nums text-zinc-900">{invoice.documentDate}</dd>
              </div>
              {invoice.dueDate ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-zinc-500">{t("suppliers.dueDate")}</dt>
                  <dd className="font-medium tabular-nums text-zinc-900">{invoice.dueDate}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-dashed border-zinc-200 pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">{t("suppliers.linesTotal")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900">
              {formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">{t("suppliers.paidTotal")}</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900">
              {formatLocaleAmount(invoice.paidTotal, locale, invoice.currencyCode)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-zinc-500">{t("suppliers.openAmount")}</p>
            <p className="mt-1 text-base font-bold tabular-nums text-zinc-900">
              {formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
              invoice.openAmount <= 0.005 || invoice.paymentMarkedComplete
                ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                : "border-zinc-200 bg-zinc-50 text-zinc-600"
            )}
          >
            {t("suppliers.invoiceDetailPaymentComplete")}:{" "}
            {invoice.openAmount <= 0.005 || invoice.paymentMarkedComplete ? t("common.yes") : t("common.no")}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
              invoice.formalSupplierInvoiceIssued
                ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                : "border-zinc-200 bg-zinc-50 text-zinc-600"
            )}
          >
            {t("suppliers.invoiceFormalIssued")}:{" "}
            {invoice.formalSupplierInvoiceIssued ? t("common.yes") : t("common.no")}
          </span>
        </div>
      </div>
    </div>
  );
}

function hasInvoiceLineBranchShares(allocState: SupplierInvoiceLineBranchAllocationsState | undefined) {
  return (allocState?.shares?.length ?? 0) > 0;
}

function SupplierInvoiceBranchSharesDrawerBody({
  lineNo,
  lineLabel,
  lineAmount,
  allocState,
  branchNameById,
  locale,
  currencyCode,
  t,
  onEditDraft,
  onClose,
}: {
  lineNo: number;
  lineLabel: string;
  lineAmount: number;
  allocState: SupplierInvoiceLineBranchAllocationsState;
  branchNameById: Map<number, string>;
  locale: Locale;
  currencyCode: string;
  t: (key: string) => string;
  onEditDraft?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-white to-zinc-50/80 p-4 shadow-sm shadow-zinc-900/[0.06]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{t("suppliers.lineShort")}</p>
        <p className="mt-0.5 text-xs font-bold text-zinc-400">#{lineNo}</p>
        <p className="mt-2 text-base font-semibold leading-snug text-zinc-900">{lineLabel}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-zinc-200 pt-3">
          <span className="text-xs font-medium text-zinc-500">{t("suppliers.lineAmount")}</span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-zinc-900">
            {formatLocaleAmount(lineAmount, locale, currencyCode)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-tight",
            allocState.isPosted ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-800 shadow-sm"
          )}
        >
          {allocState.isPosted ? t("suppliers.allocStatusPosted") : t("suppliers.allocStatusDraft")}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{t("suppliers.invoiceLineBranchShares")}</p>
        <ul className="mt-3 space-y-2.5">
          {allocState.shares.map((s) => {
            const pct = lineAmount > 0 ? Math.min(100, Math.round((s.amount / lineAmount) * 1000) / 10) : 0;
            const name = branchNameById.get(s.branchId) ?? `${t("suppliers.allocBranch")} #${s.branchId}`;
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/[0.04]"
              >
                <div className="flex items-start justify-between gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-zinc-900">{name}</p>
                    <p className="mt-1 text-xs tabular-nums text-zinc-500">{pct}%</p>
                  </div>
                  <p className="shrink-0 text-lg font-bold tabular-nums text-zinc-900">
                    {formatLocaleAmount(s.amount, locale, currencyCode)}
                  </p>
                </div>
                <div className="h-1 bg-zinc-100">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-400 to-zinc-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {!allocState.isPosted && onEditDraft ? (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          onClick={() => {
            onClose();
            onEditDraft();
          }}
        >
          {t("suppliers.allocEditShares")}
        </Button>
      ) : null}
    </div>
  );
}

export function SupplierInvoicesScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useSuppliers(false);
  const searchParams = useSearchParams();

  const [invSupplierId, setInvSupplierId] = useState<number | "">("");
  const [invDateFrom, setInvDateFrom] = useState("");
  const [invDateTo, setInvDateTo] = useState("");
  const [minLinesTotalStr, setMinLinesTotalStr] = useState("");
  const [maxLinesTotalStr, setMaxLinesTotalStr] = useState("");
  const [payFilter, setPayFilter] = useState<"" | "paid" | "unpaid">("");
  const [invFiltersDrawerOpen, setInvFiltersDrawerOpen] = useState(false);

  const invFilters = useMemo(() => {
    const minN = parseDec(minLinesTotalStr);
    const maxN = parseDec(maxLinesTotalStr);
    return {
      supplierId: invSupplierId === "" ? undefined : invSupplierId,
      dateFrom: invDateFrom || undefined,
      dateTo: invDateTo || undefined,
      minLinesTotal: minN != null && minN >= 0 ? minN : undefined,
      maxLinesTotal: maxN != null && maxN >= 0 ? maxN : undefined,
      paymentStatus: payFilter === "" ? undefined : payFilter,
    };
  }, [invSupplierId, invDateFrom, invDateTo, minLinesTotalStr, maxLinesTotalStr, payFilter]);

  const {
    data: invoices = [],
    isPending: invPending,
    isError: invErr,
    error: invError,
  } = useSupplierInvoices(invFilters);
  const createInv = useCreateSupplierInvoice();
  const updateInv = useUpdateSupplierInvoice();
  const createPay = useCreateSupplierPayment();
  const uploadPhoto = useUploadSupplierInvoicePhoto();
  const deletePhoto = useDeleteSupplierInvoicePhoto();

  const { data: catalog = [] } = useProductsCatalog();
  const { data: branches = [] } = useBranchesList();
  const productOptions = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((p) => ({ id: p.id, name: p.name })),
    [catalog]
  );

  const supplierFilterOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.allSuppliers") },
      ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suppliers, t]
  );

  const invoiceSupplierOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.pickSupplier") },
      ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suppliers, t]
  );

  const productLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.noProduct") },
      ...productOptions.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productOptions, t]
  );

  const branchLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.allocPickBranch") },
      ...[...branches]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const invoicePaySourceOptions = useMemo(
    () => [
      { value: "PATRON", label: t("suppliers.sourcePatron") },
      { value: "CASH", label: t("suppliers.sourceCash") },
      {
        value: "PERSONNEL_HELD_REGISTER_CASH",
        label: t("suppliers.sourcePersonnelHeldRegisterCash"),
      },
    ],
    [t]
  );

  const paymentStatusOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.filterPaymentAll") },
      { value: "unpaid", label: t("suppliers.filterPaymentUnpaid") },
      { value: "paid", label: t("suppliers.filterPaymentPaid") },
    ],
    [t]
  );

  const invoiceFiltersActive = useMemo(
    () =>
      invSupplierId !== "" ||
      !!invDateFrom.trim() ||
      !!invDateTo.trim() ||
      !!minLinesTotalStr.trim() ||
      !!maxLinesTotalStr.trim() ||
      payFilter !== "",
    [invSupplierId, invDateFrom, invDateTo, minLinesTotalStr, maxLinesTotalStr, payFilter]
  );

  const [invOpen, setInvOpen] = useState(false);
  const [invSupplierPick, setInvSupplierPick] = useState<number | "">("");
  const [invDocNo, setInvDocNo] = useState("");
  const [invDocDate, setInvDocDate] = useState("");
  const [invDue, setInvDue] = useState("");
  const [invDesc, setInvDesc] = useState("");
  const [invCur, setInvCur] = useState("TRY");
  const [invPaymentMarked, setInvPaymentMarked] = useState(false);
  const [invFormalIssued, setInvFormalIssued] = useState(false);
  const [invLines, setInvLines] = useState<InvoiceLineDraft[]>(() => [emptyLine()]);
  const [invLineEditKey, setInvLineEditKey] = useState<string | null>(null);
  const [invLineEditDraft, setInvLineEditDraft] = useState<InvoiceLineDraft | null>(null);
  const [invWhCheckedBy, setInvWhCheckedBy] = useState("");
  const [invWhApprovedBy, setInvWhApprovedBy] = useState("");
  const [invCreateFieldErrors, setInvCreateFieldErrors] = useState<InvCreateFormErrors>({});
  const [invLineEditErrors, setInvLineEditErrors] = useState<InvLineEditFormErrors>({});
  const [invPhotoFile, setInvPhotoFile] = useState<File | null>(null);

  const [editInvOpen, setEditInvOpen] = useState(false);
  const [editInvDocNo, setEditInvDocNo] = useState("");
  const [editInvDocDate, setEditInvDocDate] = useState("");
  const [editInvDue, setEditInvDue] = useState("");
  const [editInvDesc, setEditInvDesc] = useState("");
  const [editInvPaymentMarked, setEditInvPaymentMarked] = useState(false);
  const [editInvFormalIssued, setEditInvFormalIssued] = useState(false);
  const [editChangeNote, setEditChangeNote] = useState("");
  const [editInvFieldErrors, setEditInvFieldErrors] = useState<EditInvFormErrors>({});
  const [editInvPhotoFile, setEditInvPhotoFile] = useState<File | null>(null);
  const [editInvPhotoClear, setEditInvPhotoClear] = useState(false);
  const [previewPhotoInvoice, setPreviewPhotoInvoice] = useState<SupplierInvoiceListItem | SupplierInvoiceDetail | null>(null);

  const { data: warehouses = [] } = useWarehousesList();
  const { data: whPeopleRaw = [] } = useWarehousePeopleOptions(invOpen);

  const warehouseLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.pickReceiveWarehouse") },
      ...[...warehouses]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  const whPersonnelOptions = useMemo(() => mapWarehousePersonnelOptions(whPeopleRaw), [whPeopleRaw]);

  const whPersonnelSelectOptions = useMemo(
    () => withWarehousePersonnelPickPlaceholder(whPersonnelOptions, t("warehouse.personnelPickPlaceholder")),
    [whPersonnelOptions, t]
  );

  const invNeedsWhPersonnel = useMemo(
    () => invLines.some((l) => l.receiveTarget === "warehouse"),
    [invLines]
  );

  useEffect(() => {
    if (!invOpen) return;
    setInvCreateFieldErrors({});
  }, [
    invOpen,
    invSupplierPick,
    invDocDate,
    invDue,
    invDesc,
    invCur,
    invPaymentMarked,
    invFormalIssued,
    invWhCheckedBy,
    invWhApprovedBy,
  ]);

  const closeInvLineEditor = useCallback(() => {
    setInvLineEditKey(null);
    setInvLineEditDraft(null);
    setInvLineEditErrors({});
  }, []);

  const openInvLineEditor = useCallback(
    (key: string) => {
      const line = invLines.find((l) => l.key === key);
      if (!line) return;
      setInvLineEditErrors({});
      setInvLineEditDraft({ ...line });
      setInvLineEditKey(key);
    },
    [invLines]
  );

  const applyInvLineEditor = useCallback(() => {
    if (!invLineEditKey || !invLineEditDraft) return;
    const draft = invLineEditDraft;
    const lineErrs: InvLineEditFormErrors = {};
    const n = parseLocaleAmount(draft.lineAmount, locale);
    if (!Number.isFinite(n) || n <= 0) {
      lineErrs.lineAmount = t("common.formFieldRequiredHint");
    }
    if (draft.receiveTarget === "branch" && parseIntId(draft.receiveBranchId) == null) {
      lineErrs.receiveBranch = t("suppliers.lineBranchRequired");
    }
    if (draft.receiveTarget === "warehouse") {
      if (parseIntId(draft.productId) == null) {
        lineErrs.product = t("common.formFieldRequiredHint");
      }
      const wq = parseDec(draft.quantity);
      if (wq == null || wq <= 0) {
        lineErrs.quantity = t("common.formFieldRequiredHint");
      }
      if (parseIntId(draft.receiveWarehouseId) == null) {
        lineErrs.receiveWarehouse = t("common.formFieldRequiredHint");
      }
    }
    if (Object.keys(lineErrs).length > 0) {
      setInvLineEditErrors(lineErrs);
      notify.error(t("common.formFillRequiredSummary"));
      return;
    }
    const key = invLineEditKey;
    const formattedAmt = formatAmountInputOnBlur(draft.lineAmount, locale);
    setInvLines((rows) => rows.map((r) => (r.key === key ? { ...draft, lineAmount: formattedAmt } : r)));
    closeInvLineEditor();
  }, [invLineEditKey, invLineEditDraft, locale, t, closeInvLineEditor]);

  const prepNewInvoiceModal = useCallback((supplierPick: number | "") => {
    setInvSupplierPick(supplierPick);
    setInvDocNo("");
    setInvDocDate("");
    setInvDue("");
    setInvDesc("");
    setInvCur("TRY");
    setInvPaymentMarked(false);
    setInvFormalIssued(false);
    setInvLines([emptyLine()]);
    setInvLineEditKey(null);
    setInvLineEditDraft(null);
    setInvCreateFieldErrors({});
    setInvWhCheckedBy("");
    setInvWhApprovedBy("");
    setInvPhotoFile(null);
    setInvOpen(true);
  }, []);

  const openInvoiceModal = () => {
    prepNewInvoiceModal(invSupplierId === "" ? "" : invSupplierId);
  };

  useEffect(() => {
    const raw = searchParams.get("supplierId");
    const wantNew = searchParams.get("newInvoice") === "1";
    let idNum: number | null = null;
    if (raw != null && raw !== "") {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) idNum = n;
    }
    if (idNum != null) {
      setInvSupplierId(idNum);
    }
    if (wantNew) {
      // Supplier preset olmasa bile dialog açılsın — kullanıcı supplier picker'dan seçer.
      prepNewInvoiceModal(idNum ?? "");
      // Query'yi temizlerken branchPreset/paymentSource/returnTo'yu sakla (kayıt sonrası kullanılır).
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("newInvoice");
      params.delete("supplierId");
      const qs = params.toString();
      router.replace(`/suppliers/invoices${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [searchParams, router, prepNewInvoiceModal]);

  const saveInvoice = async () => {
    const err: InvCreateFormErrors = {};
    if (invSupplierPick === "" || invSupplierPick <= 0) {
      err.supplier = t("common.formFieldRequiredHint");
    }
    if (!invDocDate.trim()) {
      err.documentDate = t("common.formFieldRequiredHint");
    }
    if (invNeedsWhPersonnel) {
      if (parseIntId(invWhCheckedBy) == null) {
        err.whChecked = t("common.formFieldRequiredHint");
      }
      if (parseIntId(invWhApprovedBy) == null) {
        err.whApproved = t("common.formFieldRequiredHint");
      }
    }
    let lineBlockMsg: string | undefined;
    for (const l of invLines) {
      if (l.receiveTarget === "branch" && parseIntId(l.receiveBranchId) == null) {
        lineBlockMsg = t("suppliers.lineBranchRequired");
        break;
      }
    }
    if (!lineBlockMsg) {
      for (const l of invLines) {
        if (l.receiveTarget !== "warehouse") continue;
        if (parseIntId(l.productId) == null) {
          lineBlockMsg = t("suppliers.whIntakeProductRequired");
          break;
        }
        const wq = parseDec(l.quantity);
        if (wq == null || wq <= 0) {
          lineBlockMsg = t("suppliers.whIntakeQuantityRequired");
          break;
        }
        if (parseIntId(l.receiveWarehouseId) == null) {
          lineBlockMsg = t("suppliers.whIntakeWarehouseRequired");
          break;
        }
      }
    }
    const lines = invLines
      .map((l) => {
        const amt = parseLocaleAmount(l.lineAmount, locale);
        if (!Number.isFinite(amt) || amt <= 0) return null;
        const pid = parseIntId(l.productId);
        const rwid = l.receiveTarget === "warehouse" ? parseIntId(l.receiveWarehouseId) : null;
        const bid = l.receiveTarget === "branch" ? parseIntId(l.receiveBranchId) : null;
        const qty = parseDec(l.quantity);
        const up = parseDec(l.unitPrice);
        const vat = parseDec(l.vatRate);
        return {
          description: l.description.trim() || null,
          lineAmount: amt,
          quantity: qty != null && qty > 0 ? qty : null,
          unitPrice: up != null && up >= 0 ? up : null,
          vatRate: vat != null && vat >= 0 && vat <= 100 ? vat : null,
          productId: pid,
          receiveWarehouseId: rwid,
          receiveBranchId: bid,
        };
      })
      .filter(Boolean) as Array<{
      description: string | null;
      lineAmount: number;
      quantity: number | null;
      unitPrice: number | null;
      vatRate: number | null;
      productId: number | null;
      receiveWarehouseId: number | null;
      receiveBranchId: number | null;
    }>;
    if (!lineBlockMsg && lines.length === 0) {
      lineBlockMsg = t("suppliers.invoiceLinesInvalidSummary");
    }
    if (lineBlockMsg) {
      err.lines = lineBlockMsg;
    }
    setInvCreateFieldErrors(err);
    const hasErr = Object.values(err).some((v) => v != null && String(v).trim() !== "");
    if (hasErr) {
      notify.error(t("common.formFillRequiredSummary"));
      return;
    }
    setInvCreateFieldErrors({});
    const supplierIdForApi = typeof invSupplierPick === "number" ? invSupplierPick : Number(invSupplierPick);
    try {
      const created = await createInv.mutateAsync({
        supplierId: supplierIdForApi,
        documentNumber: invDocNo.trim() || null,
        documentDate: invDocDate.trim(),
        dueDate: invDue.trim() || null,
        currencyCode: invCur.trim() || "TRY",
        description: invDesc.trim() || null,
        paymentMarkedComplete: invPaymentMarked,
        formalSupplierInvoiceIssued: invFormalIssued,
        autoWarehouseCheckedByPersonnelId: invNeedsWhPersonnel ? parseIntId(invWhCheckedBy) : null,
        autoWarehouseApprovedByPersonnelId: invNeedsWhPersonnel ? parseIntId(invWhApprovedBy) : null,
        lines,
      });
      notify.success(t("toast.supplierInvoiceCreated"));

      if (invPhotoFile && created?.id) {
        try {
          await uploadPhoto.mutateAsync({ id: created.id, file: invPhotoFile });
          notify.success(t("suppliers.invoicePhotoUploaded"));
        } catch (e) {
          notify.error(`${t("suppliers.invoicePhotoUploadFailed")} (${toErrorMessage(e)})`);
        }
      }

      setInvLineEditKey(null);
      setInvLineEditDraft(null);
      setInvCreateFieldErrors({});
      setInvPhotoFile(null);
      setInvOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const [viewId, setViewId] = useState<number | null>(null);
  const { data: viewInvoice, isPending: viewPending } = useSupplierInvoice(viewId, viewId != null);

  // Derin-link: /suppliers/invoices?openInvoice=ID → fatura detayını aç, param'ı temizle.
  useEffect(() => {
    const raw = searchParams.get("openInvoice");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id) && id > 0) setViewId(id);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("openInvoice");
    const qs = params.toString();
    router.replace(qs ? `/suppliers/invoices?${qs}` : "/suppliers/invoices", {
      scroll: false,
    });
  }, [searchParams, router]);
  const [allocLineId, setAllocLineId] = useState<number | null>(null);
  const [branchSharesDrawerLineId, setBranchSharesDrawerLineId] = useState<number | null>(null);

  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const splittableLineIds = useMemo(() => {
    if (!viewInvoice) return [];
    return viewInvoice.lines
      .filter(
        (l) =>
          !(
            (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
            (l.receiveBranchId != null && l.receiveBranchId > 0)
          )
      )
      .map((l) => l.id);
  }, [viewInvoice]);

  const lineAllocQueries = useQueries({
    queries: splittableLineIds.map((lineId) => ({
      queryKey: supplierKeys.lineAlloc(lineId),
      queryFn: () => fetchSupplierInvoiceLineBranchAllocations(lineId),
      enabled: viewId != null && splittableLineIds.length > 0,
    })),
  });

  const lineAllocByLineId = useMemo(() => {
    const m = new Map<number, SupplierInvoiceLineBranchAllocationsState>();
    splittableLineIds.forEach((id, i) => {
      const d = lineAllocQueries[i]?.data;
      if (d) m.set(id, d);
    });
    return m;
  }, [splittableLineIds, lineAllocQueries]);

  useEffect(() => {
    if (viewId == null) setBranchSharesDrawerLineId(null);
  }, [viewId]);

  const branchSharesDrawerLine = useMemo(() => {
    if (viewInvoice == null || branchSharesDrawerLineId == null) return null;
    return viewInvoice.lines.find((l) => l.id === branchSharesDrawerLineId) ?? null;
  }, [viewInvoice, branchSharesDrawerLineId]);

  const branchSharesDrawerAlloc =
    branchSharesDrawerLineId != null ? lineAllocByLineId.get(branchSharesDrawerLineId) : undefined;

  const openEditInvoice = () => {
    if (!viewInvoice || viewId == null) return;
    setEditInvDocNo(viewInvoice.documentNumber ?? "");
    setEditInvDocDate(viewInvoice.documentDate);
    setEditInvDue(viewInvoice.dueDate ?? "");
    setEditInvDesc(viewInvoice.description ?? "");
    setEditInvPaymentMarked(viewInvoice.paymentMarkedComplete);
    setEditInvFormalIssued(viewInvoice.formalSupplierInvoiceIssued);
    setEditChangeNote("");
    setEditInvFieldErrors({});
    setEditInvPhotoFile(null);
    setEditInvPhotoClear(false);
    setEditInvOpen(true);
  };

  const saveEditInvoice = async () => {
    if (!viewInvoice || viewId == null) return;
    if (!editInvDocDate.trim()) {
      setEditInvFieldErrors({ documentDate: t("common.formFieldRequiredHint") });
      notify.error(t("common.formFillRequiredSummary"));
      return;
    }
    setEditInvFieldErrors({});
    try {
      await updateInv.mutateAsync({
        id: viewId,
        body: {
          documentNumber: editInvDocNo.trim() || null,
          documentDate: editInvDocDate.trim(),
          dueDate: editInvDue.trim() || null,
          description: editInvDesc.trim() || null,
          paymentMarkedComplete: editInvPaymentMarked,
          formalSupplierInvoiceIssued: editInvFormalIssued,
          changeNote: editChangeNote.trim() || null,
        },
      });
      notify.success(t("toast.supplierInvoiceUpdated"));

      if (editInvPhotoFile) {
        try {
          await uploadPhoto.mutateAsync({ id: viewId, file: editInvPhotoFile });
          notify.success(t("suppliers.invoicePhotoUploaded"));
        } catch (e) {
          notify.error(`${t("suppliers.invoicePhotoUploadFailed")} (${toErrorMessage(e)})`);
        }
      } else if (editInvPhotoClear && viewInvoice.hasInvoicePhoto) {
        try {
          await deletePhoto.mutateAsync(viewId);
          notify.success(t("suppliers.invoicePhotoRemoved"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      }

      setEditInvPhotoFile(null);
      setEditInvPhotoClear(false);
      setEditInvOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const [payTarget, setPayTarget] = useState<SupplierInvoiceListItem | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [paySrc, setPaySrc] = useState("PATRON");
  const [payBranchId, setPayBranchId] = useState("");
  const [payPersonnelId, setPayPersonnelId] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payFieldErrors, setPayFieldErrors] = useState<PayFormErrors>({});

  // Personel zimmetindeki kasa parası kaynağı: HAVUZ modeli — fon kaynağında şubeye bakılmaz.
  // Tüm şubelerdeki net zimmeti > 0 olan personeller listelenir; şube yalnız atıf içindir.
  const heldPoolQ = useHeldCashPersonnelPool(
    (payTarget?.currencyCode ?? "TRY").toUpperCase(),
    payDate,
    payTarget != null && paySrc === "PERSONNEL_HELD_REGISTER_CASH",
  );
  const payHeldPersonnelOptions = useMemo(() => {
    const rows = (heldPoolQ.data ?? []).filter((r) => (r.amount ?? 0) > 0);
    return [
      { value: "", label: t("branch.expenseHeldRegisterPersonLabel") },
      ...rows.map((r) => ({
        value: String(r.personnelId),
        label: `${r.fullName} · ${formatLocaleAmount(r.amount, locale, r.currencyCode)}`,
      })),
    ];
  }, [heldPoolQ.data, t, locale]);

  useEffect(() => {
    setPayFieldErrors({});
  }, [payTarget]);

  const openPay = (row: SupplierInvoiceListItem) => {
    setPayTarget(row);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmt(formatLocaleAmountInput(row.openAmount, locale));
    setPaySrc("PATRON");
    setPayBranchId("");
    setPayPersonnelId("");
    setPayDesc("");
    setPayFieldErrors({});
  };

  const invoiceToolbarMoreItems = useMemo(
    () => [
      {
        id: "back-suppliers",
        label: t("suppliers.backToSuppliers"),
        onSelect: () => router.push("/suppliers"),
      },
    ],
    [t, router]
  );

  const savePay = async () => {
    if (!payTarget) return;
    const pe: PayFormErrors = {};
    if (!payDate.trim()) {
      pe.date = t("common.formFieldRequiredHint");
    }
    const amt = parseLocaleAmount(payAmt, locale);
    if (!Number.isFinite(amt) || amt <= 0) {
      pe.amount = t("common.formFieldRequiredHint");
    }
    const requiresBranch =
      paySrc === "CASH" || paySrc === "PERSONNEL_HELD_REGISTER_CASH";
    const branchForPay = requiresBranch ? parseIntId(payBranchId) : null;
    if (requiresBranch && branchForPay == null) {
      pe.branch = t("common.formFieldRequiredHint");
    }
    const requiresPersonnel = paySrc === "PERSONNEL_HELD_REGISTER_CASH";
    const personnelForPay = requiresPersonnel ? parseIntId(payPersonnelId) : null;
    if (requiresPersonnel && personnelForPay == null) {
      pe.personnel = t("common.formFieldRequiredHint");
    }
    setPayFieldErrors(pe);
    if (Object.values(pe).some((v) => v != null && String(v).trim() !== "")) {
      notify.error(t("common.formFillRequiredSummary"));
      return;
    }
    setPayFieldErrors({});
    try {
      await createPay.mutateAsync({
        supplierId: payTarget.supplierId,
        paymentDate: payDate.trim(),
        amount: amt,
        currencyCode: payTarget.currencyCode,
        sourceType: paySrc,
        branchId: branchForPay,
        personnelId: personnelForPay,
        description: payDesc.trim() || null,
        allocations: [{ invoiceId: payTarget.id, amount: amt }],
      });
      notify.success(t("toast.supplierPaymentCreated"));
      void queryClient.invalidateQueries({ queryKey: supplierKeys.invoice(payTarget.id) });
      setPayTarget(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const invDraftReceiveSummary = (line: InvoiceLineDraft) => {
    if (line.receiveTarget === "none") return t("suppliers.lineReceiveNone");
    if (line.receiveTarget === "warehouse") {
      const wid = parseIntId(line.receiveWarehouseId);
      const wn = wid != null ? warehouses.find((w) => w.id === wid)?.name : undefined;
      return wn ? `${t("suppliers.lineReceiveWarehouse")}: ${wn}` : t("suppliers.lineReceiveWarehouse");
    }
    const bid = parseIntId(line.receiveBranchId);
    const bn = bid != null ? branches.find((b) => b.id === bid)?.name : undefined;
    return bn ? `${t("suppliers.lineReceiveBranch")}: ${bn}` : t("suppliers.lineReceiveBranch");
  };

  const invDraftProductCell = (line: InvoiceLineDraft) => {
    const pid = parseIntId(line.productId);
    if (pid == null) return t("suppliers.noProduct");
    return catalog.find((p) => p.id === pid)?.name ?? t("suppliers.noProduct");
  };

  const invDraftAmountCell = (line: InvoiceLineDraft) => {
    const n = parseLocaleAmount(line.lineAmount, locale);
    const cur = invCur.trim() || "TRY";
    if (!Number.isFinite(n) || n <= 0) return line.lineAmount.trim() ? line.lineAmount : "—";
    return formatLocaleAmount(n, locale, cur);
  };

  const closeCreateInvoiceModal = () => {
    setInvLineEditKey(null);
    setInvLineEditDraft(null);
    setInvLineEditErrors({});
    setInvCreateFieldErrors({});
    setInvPhotoFile(null);
    setInvOpen(false);
  };

  const isCreateInvoiceDirty =
    invSupplierPick !== "" ||
    invDocNo.trim() !== "" ||
    invDocDate.trim() !== "" ||
    invDue.trim() !== "" ||
    invDesc.trim() !== "" ||
    invCur.trim() !== "TRY" ||
    invPaymentMarked ||
    invFormalIssued ||
    invWhCheckedBy.trim() !== "" ||
    invWhApprovedBy.trim() !== "" ||
    invPhotoFile != null ||
    invLines.length > 1 ||
    (invLines[0] != null &&
      (invLines[0].description.trim() !== "" ||
        invLines[0].lineAmount.trim() !== "" ||
        invLines[0].quantity.trim() !== "" ||
        invLines[0].unitPrice.trim() !== "" ||
        invLines[0].productId.trim() !== "" ||
        invLines[0].receiveTarget !== "none" ||
        invLines[0].receiveBranchId.trim() !== "" ||
        invLines[0].receiveWarehouseId.trim() !== ""));

  const requestCloseCreateInvoiceModal = useDirtyGuard({
    isDirty: isCreateInvoiceDirty,
    isBlocked: createInv.isPending || uploadPhoto.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose: closeCreateInvoiceModal,
  });

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-8"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {t("suppliers.invoicesPageTitle")}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">{t("suppliers.invoicesPageSubtitle")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="suppliers"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.supplierInvoices.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.supplierInvoices.step1") },
                { text: t("pageHelp.supplierInvoices.step2") },
                {
                  text: t("pageHelp.supplierInvoices.step3"),
                  link: { href: "/warehouses", label: t("pageHelp.supplierInvoices.step3Link") },
                },
              ]}
            />
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs leading-relaxed text-sky-950 sm:text-sm">
              <span>{t("suppliers.invoicesCrossRefToFinReport")}</span>
              <Link
                href="/reports/financial/tables/supplier-payments"
                className="font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-900"
              >
                {t("suppliers.invoicesCrossRefToFinReportLink")}
              </Link>
            </p>
          </>
        }
        main={
          <Card
            title={t("suppliers.invoicesSection")}
            headerActions={
              <>
                <TableToolbarMoreMenu menuId="supplier-inv-toolbar-more" items={invoiceToolbarMoreItems} />
                <Tooltip content={t("suppliers.filterDrawerTitle")} delayMs={200}>
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(TABLE_TOOLBAR_ICON_BTN, "relative")}
                    onClick={() => setInvFiltersDrawerOpen(true)}
                    aria-label={t("suppliers.filterDrawerTitle")}
                  >
                    <FilterFunnelIcon className="h-5 w-5" />
                    {invoiceFiltersActive ? (
                      <span
                        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                        aria-hidden
                      />
                    ) : null}
                  </Button>
                </Tooltip>
                <Tooltip content={t("suppliers.newInvoice")} delayMs={200}>
                  <Button
                    type="button"
                    variant="primary"
                    className={TABLE_TOOLBAR_ICON_BTN}
                    onClick={openInvoiceModal}
                    aria-label={t("suppliers.newInvoice")}
                  >
                    <ToolbarGlyphReceipt className="h-5 w-5" />
                  </Button>
                </Tooltip>
              </>
            }
          >
        {invErr ? (
          <p className="text-sm text-red-600">{toErrorMessage(invError)}</p>
        ) : invPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("suppliers.noInvoices")}</p>
        ) : (
          <>
          <div className="flex flex-col gap-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] lg:hidden">
            {invoices.map((row) => (
              <MobileListCard key={row.id} as="div" className="flex flex-col gap-4 bg-zinc-50/40">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3 overflow-hidden">
                    {row.hasInvoicePhoto ? (
                      <SupplierInvoicePhotoThumb
                        invoiceId={row.id}
                        hasInvoicePhoto
                        ariaLabel={t("suppliers.invoicePhotoOpen")}
                        onClick={() => setPreviewPhotoInvoice(row)}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-zinc-900">{row.supplierName}</p>
                      <p className="mt-1 text-xs text-zinc-600">{row.documentDate}</p>
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        {row.documentNumber ?? "—"}
                      </p>
                    </div>
                  </div>
                  {supplierInvoiceLooksPaid(row) ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/90">
                      {t("suppliers.invoicePaidBadge")}
                    </span>
                  ) : null}
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-3 border-t border-zinc-200/80 pt-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-zinc-500">{t("suppliers.linesTotal")}</p>
                    <p className="break-words text-sm font-semibold tabular-nums text-zinc-900">
                      {formatLocaleAmount(row.linesTotal, locale, row.currencyCode)}
                    </p>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-zinc-500">{t("suppliers.openAmount")}</p>
                    <p className="break-words text-sm font-semibold tabular-nums text-zinc-900">
                      {formatLocaleAmount(row.openAmount, locale, row.currencyCode)}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <Button type="button" variant="secondary" className="min-h-11 w-full touch-manipulation" onClick={() => setViewId(row.id)}>
                    {t("suppliers.view")}
                  </Button>
                  {row.openAmount > 0.005 && !row.paymentMarkedComplete ? (
                    <Button type="button" className="min-h-11 w-full touch-manipulation" onClick={() => openPay(row)}>
                      {t("suppliers.pay")}
                    </Button>
                  ) : null}
                </div>
              </MobileListCard>
            ))}
          </div>
          <div className="-mx-1 hidden overflow-x-auto px-1 lg:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-20 whitespace-nowrap">{t("suppliers.invoicePhotoColumn")}</TableHeader>
                  <TableHeader>{t("suppliers.documentDate")}</TableHeader>
                  <TableHeader>{t("suppliers.name")}</TableHeader>
                  <TableHeader>{t("suppliers.documentNumber")}</TableHeader>
                  <TableHeader className="text-right">{t("suppliers.linesTotal")}</TableHeader>
                  <TableHeader className="text-right">{t("suppliers.openAmount")}</TableHeader>
                  <TableHeader className="text-right">{t("common.actions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell dataLabel={t("suppliers.invoicePhotoColumn")} className="align-middle">
                      {row.hasInvoicePhoto ? (
                        <SupplierInvoicePhotoThumb
                          invoiceId={row.id}
                          hasInvoicePhoto
                          ariaLabel={t("suppliers.invoicePhotoOpen")}
                          onClick={() => setPreviewPhotoInvoice(row)}
                        />
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.documentDate")} className="whitespace-nowrap text-zinc-700">
                      {row.documentDate}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.name")} className="text-zinc-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0">{row.supplierName}</span>
                        {supplierInvoiceLooksPaid(row) ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/90">
                            {t("suppliers.invoicePaidBadge")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.documentNumber")} className="text-zinc-600">
                      {row.documentNumber ?? "—"}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.linesTotal")} className="text-right tabular-nums text-zinc-800">
                      {formatLocaleAmount(row.linesTotal, locale, row.currencyCode)}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.openAmount")} className="text-right tabular-nums font-medium text-zinc-900">
                      {formatLocaleAmount(row.openAmount, locale, row.currencyCode)}
                    </TableCell>
                    <TableCell dataLabel={t("common.actions")} className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="secondary" className="min-h-9" onClick={() => setViewId(row.id)}>
                          {t("suppliers.view")}
                        </Button>
                        {row.openAmount > 0.005 && !row.paymentMarkedComplete ? (
                          <Button type="button" className="min-h-9" onClick={() => openPay(row)}>
                            {t("suppliers.pay")}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
          </Card>
        }
      />

      <RightDrawer
        open={invFiltersDrawerOpen}
        onClose={() => setInvFiltersDrawerOpen(false)}
        title={t("suppliers.filterDrawerTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
      >
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <InvoiceFilterDrawerIconWrap>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </InvoiceFilterDrawerIconWrap>
            <div className="min-w-0 flex-1">
              <Select
                name="invSupplierFilter"
                label={t("suppliers.filterSupplier")}
                options={supplierFilterOptions}
                value={invSupplierId === "" ? "" : String(invSupplierId)}
                onChange={(e) => setInvSupplierId(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <InvoiceFilterDrawerIconWrap>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </InvoiceFilterDrawerIconWrap>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <DateField label={t("suppliers.dateFrom")} value={invDateFrom} onChange={(e) => setInvDateFrom(e.target.value)} />
              <DateField label={t("suppliers.dateTo")} value={invDateTo} onChange={(e) => setInvDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <InvoiceFilterDrawerIconWrap>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </InvoiceFilterDrawerIconWrap>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label={t("suppliers.filterLinesTotalMin")}
                value={minLinesTotalStr}
                onChange={(e) => setMinLinesTotalStr(e.target.value)}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
              <Input
                label={t("suppliers.filterLinesTotalMax")}
                value={maxLinesTotalStr}
                onChange={(e) => setMaxLinesTotalStr(e.target.value)}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <InvoiceFilterDrawerIconWrap>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m22 4-10 10-3-3" />
              </svg>
            </InvoiceFilterDrawerIconWrap>
            <div className="min-w-0 flex-1">
              <Select
                name="invPaymentStatus"
                label={t("suppliers.filterPaymentStatus")}
                options={paymentStatusOptions}
                value={payFilter}
                onChange={(e) => setPayFilter((e.target.value as "" | "paid" | "unpaid") || "")}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </RightDrawer>

      <SupplierInvoiceCreateModal
        open={invOpen}
        onClose={requestCloseCreateInvoiceModal}
        invSupplierPick={invSupplierPick}
        setInvSupplierPick={setInvSupplierPick}
        invoiceSupplierOptions={invoiceSupplierOptions}
        whPersonnelSelectOptions={whPersonnelSelectOptions}
        invDocNo={invDocNo}
        setInvDocNo={setInvDocNo}
        invDocDate={invDocDate}
        setInvDocDate={setInvDocDate}
        invDue={invDue}
        setInvDue={setInvDue}
        invDesc={invDesc}
        setInvDesc={setInvDesc}
        invCur={invCur}
        setInvCur={setInvCur}
        invPaymentMarked={invPaymentMarked}
        setInvPaymentMarked={setInvPaymentMarked}
        invFormalIssued={invFormalIssued}
        setInvFormalIssued={setInvFormalIssued}
        invLines={invLines}
        setInvLines={setInvLines}
        invCreateFieldErrors={invCreateFieldErrors}
        openInvLineEditor={openInvLineEditor}
        invNeedsWhPersonnel={invNeedsWhPersonnel}
        invWhCheckedBy={invWhCheckedBy}
        setInvWhCheckedBy={setInvWhCheckedBy}
        invWhApprovedBy={invWhApprovedBy}
        setInvWhApprovedBy={setInvWhApprovedBy}
        invPhotoFile={invPhotoFile}
        setInvPhotoFile={setInvPhotoFile}
        busy={createInv.isPending || uploadPhoto.isPending}
        saveInvoice={() => void saveInvoice()}
        locale={locale}
        invDraftProductCell={invDraftProductCell}
        invDraftReceiveSummary={invDraftReceiveSummary}
        invDraftAmountCell={invDraftAmountCell}
        emptyLine={emptyLine}
        setInvLineEditDraft={setInvLineEditDraft}
        setInvLineEditKey={setInvLineEditKey}
      />

      <SupplierInvoiceLineEditorModal
        open={invLineEditKey != null && invLineEditDraft != null}
        title={`${t("suppliers.lines")} #${invLineEditKey != null ? invLines.findIndex((l) => l.key === invLineEditKey) + 1 : ""}`}
        draft={invLineEditDraft}
        setDraft={setInvLineEditDraft}
        errors={invLineEditErrors}
        onClose={closeInvLineEditor}
        onApply={applyInvLineEditor}
        productLineSelectOptions={productLineSelectOptions}
        warehouseLineSelectOptions={warehouseLineSelectOptions}
        branchLineSelectOptions={branchLineSelectOptions}
        invCur={invCur}
        locale={locale}
        autoFillLineAmount={autoFillLineAmount}
        parseDec={parseDec}
      />

      <SupplierInvoiceDetailModal
        open={viewId != null}
        onClose={() => setViewId(null)}
        invoice={viewInvoice}
        loading={viewPending}
        locale={locale}
        HeroComponent={SupplierInvoiceDetailHero}
        AuditComponent={SupplierInvoiceAuditHistoryPanel}
        lineAllocByLineId={lineAllocByLineId}
        hasInvoiceLineBranchShares={hasInvoiceLineBranchShares}
        onPreviewInvoicePhoto={(inv) => setPreviewPhotoInvoice(inv)}
        onOpenEdit={openEditInvoice}
        onOpenAllocation={(lineId) => setAllocLineId(lineId)}
        onOpenBranchSharesDrawer={(lineId) => setBranchSharesDrawerLineId(lineId)}
      />

      <RightDrawer
        open={
          branchSharesDrawerLineId != null &&
          branchSharesDrawerLine != null &&
          branchSharesDrawerAlloc != null &&
          hasInvoiceLineBranchShares(branchSharesDrawerAlloc) &&
          viewInvoice != null
        }
        onClose={() => setBranchSharesDrawerLineId(null)}
        title={t("suppliers.invoiceLineBranchShares")}
        closeLabel={t("common.close")}
        rootClassName="z-[125]"
        className="max-w-lg shadow-2xl shadow-zinc-900/20"
      >
        {branchSharesDrawerLine && branchSharesDrawerAlloc && viewInvoice ? (
          <SupplierInvoiceBranchSharesDrawerBody
            lineNo={branchSharesDrawerLine.lineNo}
            lineLabel={branchSharesDrawerLine.description ?? branchSharesDrawerLine.productName ?? "—"}
            lineAmount={branchSharesDrawerLine.lineAmount}
            allocState={branchSharesDrawerAlloc}
            branchNameById={branchNameById}
            locale={locale}
            currencyCode={viewInvoice.currencyCode}
            t={t}
            onEditDraft={() => setAllocLineId(branchSharesDrawerLine.id)}
            onClose={() => setBranchSharesDrawerLineId(null)}
          />
        ) : null}
      </RightDrawer>

      <SupplierInvoiceEditModal
        open={editInvOpen}
        onClose={() => setEditInvOpen(false)}
        invoice={viewInvoice ?? null}
        docNo={editInvDocNo}
        setDocNo={setEditInvDocNo}
        docDate={editInvDocDate}
        setDocDate={setEditInvDocDate}
        due={editInvDue}
        setDue={setEditInvDue}
        desc={editInvDesc}
        setDesc={setEditInvDesc}
        paymentMarked={editInvPaymentMarked}
        setPaymentMarked={setEditInvPaymentMarked}
        formalIssued={editInvFormalIssued}
        setFormalIssued={setEditInvFormalIssued}
        changeNote={editChangeNote}
        setChangeNote={setEditChangeNote}
        fieldErrors={editInvFieldErrors}
        setFieldErrors={setEditInvFieldErrors}
        photoFile={editInvPhotoFile}
        setPhotoFile={setEditInvPhotoFile}
        photoClear={editInvPhotoClear}
        setPhotoClear={setEditInvPhotoClear}
        saving={updateInv.isPending}
        uploadingPhoto={uploadPhoto.isPending}
        deletingPhoto={deletePhoto.isPending}
        onPreviewCurrent={(inv) => setPreviewPhotoInvoice(inv)}
        onSave={() => void saveEditInvoice()}
      />

      <SupplierLineBranchAllocationModal
        open={allocLineId != null}
        lineId={allocLineId ?? 0}
        onClose={() => setAllocLineId(null)}
        onPosted={() => {
          if (viewId != null) {
            void queryClient.invalidateQueries({ queryKey: supplierKeys.invoice(viewId) });
          }
        }}
      />

      <SupplierInvoicePhotoPreviewModal
        open={previewPhotoInvoice != null}
        invoiceId={previewPhotoInvoice?.id ?? null}
        title={t("suppliers.invoicePhotoPreviewTitle")}
        subtitle={previewPhotoInvoice ? `${previewPhotoInvoice.supplierName} · ${previewPhotoInvoice.documentDate}` : undefined}
        t={t}
        onClose={() => setPreviewPhotoInvoice(null)}
      />

      <SupplierInvoicePaymentModal
        target={payTarget}
        payDate={payDate}
        setPayDate={setPayDate}
        payAmt={payAmt}
        setPayAmt={setPayAmt}
        paySrc={paySrc}
        setPaySrc={setPaySrc}
        payBranchId={payBranchId}
        setPayBranchId={setPayBranchId}
        payPersonnelId={payPersonnelId}
        setPayPersonnelId={setPayPersonnelId}
        heldPersonnelOptions={payHeldPersonnelOptions}
        heldPersonnelLoading={heldPoolQ.isPending}
        payDesc={payDesc}
        setPayDesc={setPayDesc}
        payFieldErrors={payFieldErrors}
        setPayFieldErrors={setPayFieldErrors}
        invoicePaySourceOptions={invoicePaySourceOptions}
        branchLineSelectOptions={branchLineSelectOptions}
        locale={locale}
        saving={createPay.isPending}
        onCancel={() => setPayTarget(null)}
        onSave={() => void savePay()}
      />
    </>
  );
}
