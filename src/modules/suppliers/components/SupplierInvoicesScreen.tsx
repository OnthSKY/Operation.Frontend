"use client";

import {
  fetchSupplierInvoiceLineBranchAllocations,
  type SupplierInvoiceDetail,
  type SupplierInvoiceLineBranchAllocationsState,
  type SupplierInvoiceListItem,
} from "@/modules/suppliers/api/suppliers-api";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { SupplierLineBranchAllocationModal } from "@/modules/suppliers/components/SupplierLineBranchAllocationModal";
import {
  supplierKeys,
  useCreateSupplierInvoice,
  useCreateSupplierPayment,
  useSupplierInvoice,
  useSupplierInvoiceAuditLogs,
  useSupplierInvoices,
  useSuppliers,
  useUpdateSupplierInvoice,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useWarehousePeopleOptions, useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { DateField } from "@/shared/ui/DateField";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphReceipt } from "@/shared/ui/ToolbarGlyph";
import { apiFetch } from "@/shared/api/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LineReceiveTarget = "none" | "warehouse" | "branch";

type InvoiceLineDraft = {
  key: string;
  receiveTarget: LineReceiveTarget;
  receiveBranchId: string;
  receiveWarehouseId: string;
  description: string;
  lineAmount: string;
  quantity: string;
  unitPrice: string;
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
    productId: "",
  };
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
}: {
  invoice: SupplierInvoiceDetail;
  locale: Locale;
  t: (key: string) => string;
}) {
  const movementId = useMemo(() => {
    const line = invoice.lines.find((l) => l.warehouseMovementId != null && l.warehouseMovementId > 0);
    return line?.warehouseMovementId ?? null;
  }, [invoice.lines]);

  const { objectUrl: photoUrl, loading: photoLoading } = useWarehouseMovementInvoicePhotoPreview(movementId);
  const showPhotoPanel = movementId != null && movementId > 0 && (photoLoading || photoUrl);

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
          <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-100 shadow-inner shadow-zinc-900/5 sm:aspect-[16/10] lg:aspect-[3/4] lg:max-h-[min(52vh,320px)]">
            {photoLoading ? (
              <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-zinc-500">
                {t("common.loading")}
              </div>
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
              <img src={photoUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : null}
          </div>
          {photoUrl && movementId ? (
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
  const [invWhCheckedBy, setInvWhCheckedBy] = useState("");
  const [invWhApprovedBy, setInvWhApprovedBy] = useState("");

  const [editInvOpen, setEditInvOpen] = useState(false);
  const [editInvDocNo, setEditInvDocNo] = useState("");
  const [editInvDocDate, setEditInvDocDate] = useState("");
  const [editInvDue, setEditInvDue] = useState("");
  const [editInvDesc, setEditInvDesc] = useState("");
  const [editInvPaymentMarked, setEditInvPaymentMarked] = useState(false);
  const [editInvFormalIssued, setEditInvFormalIssued] = useState(false);
  const [editChangeNote, setEditChangeNote] = useState("");

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

  const whPersonnelOptions = useMemo(
    () =>
      whPeopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [whPeopleRaw]
  );

  const whPersonnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...whPersonnelOptions],
    [whPersonnelOptions, t]
  );

  const invNeedsWhPersonnel = useMemo(
    () => invLines.some((l) => l.receiveTarget === "warehouse"),
    [invLines]
  );

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
    setInvWhCheckedBy("");
    setInvWhApprovedBy("");
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
    if (wantNew && idNum != null) {
      prepNewInvoiceModal(idNum);
      router.replace("/suppliers/invoices", { scroll: false });
    }
  }, [searchParams, router, prepNewInvoiceModal]);

  const saveInvoice = async () => {
    if (invSupplierPick === "" || invSupplierPick <= 0) {
      notify.error(t("common.required"));
      return;
    }
    if (!invDocDate.trim()) {
      notify.error(t("common.required"));
      return;
    }
    if (invNeedsWhPersonnel) {
      const wck = parseIntId(invWhCheckedBy);
      const wap = parseIntId(invWhApprovedBy);
      if (wck == null || wap == null) {
        notify.error(t("suppliers.whIntakePersonnelRequired"));
        return;
      }
    }
    for (const l of invLines) {
      if (l.receiveTarget !== "warehouse") continue;
      if (parseIntId(l.productId) == null) {
        notify.error(t("suppliers.whIntakeProductRequired"));
        return;
      }
      const wq = parseDec(l.quantity);
      if (wq == null || wq <= 0) {
        notify.error(t("suppliers.whIntakeQuantityRequired"));
        return;
      }
      if (parseIntId(l.receiveWarehouseId) == null) {
        notify.error(t("suppliers.whIntakeWarehouseRequired"));
        return;
      }
    }
    const lines = invLines
      .map((l) => {
        const amt = parseDec(l.lineAmount);
        if (amt == null || amt <= 0) return null;
        const pid = parseIntId(l.productId);
        const rwid = l.receiveTarget === "warehouse" ? parseIntId(l.receiveWarehouseId) : null;
        const bid = l.receiveTarget === "branch" ? parseIntId(l.receiveBranchId) : null;
        const qty = parseDec(l.quantity);
        const up = parseDec(l.unitPrice);
        return {
          description: l.description.trim() || null,
          lineAmount: amt,
          quantity: qty != null && qty > 0 ? qty : null,
          unitPrice: up != null && up >= 0 ? up : null,
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
      productId: number | null;
      receiveWarehouseId: number | null;
      receiveBranchId: number | null;
    }>;
    if (lines.length === 0) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await createInv.mutateAsync({
        supplierId: invSupplierPick,
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
      setInvOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const [viewId, setViewId] = useState<number | null>(null);
  const { data: viewInvoice, isPending: viewPending } = useSupplierInvoice(viewId, viewId != null);
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
    setEditInvOpen(true);
  };

  const saveEditInvoice = async () => {
    if (!viewInvoice || viewId == null) return;
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
  const [payDesc, setPayDesc] = useState("");

  const openPay = (row: SupplierInvoiceListItem) => {
    setPayTarget(row);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmt(String(row.openAmount));
    setPaySrc("PATRON");
    setPayBranchId("");
    setPayDesc("");
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
    const amt = parseDec(payAmt);
    if (!payDate.trim() || amt == null || amt <= 0) {
      notify.error(t("common.required"));
      return;
    }
    const cashBranch = paySrc === "CASH" ? parseIntId(payBranchId) : null;
    if (paySrc === "CASH" && cashBranch == null) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await createPay.mutateAsync({
        paymentDate: payDate.trim(),
        amount: amt,
        currencyCode: payTarget.currencyCode,
        sourceType: paySrc,
        branchId: cashBranch,
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
          </>
        }
        main={
          <Card
            title={t("suppliers.invoicesSection")}
            headerActions={
              <>
                <TableToolbarMoreMenu menuId="supplier-inv-toolbar-more" items={invoiceToolbarMoreItems} />
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
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
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
          <DateField label={t("suppliers.dateFrom")} value={invDateFrom} onChange={(e) => setInvDateFrom(e.target.value)} />
          <DateField label={t("suppliers.dateTo")} value={invDateTo} onChange={(e) => setInvDateTo(e.target.value)} />
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
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
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
        {invErr ? (
          <p className="text-sm text-red-600">{toErrorMessage(invError)}</p>
        ) : invPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("suppliers.noInvoices")}</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <Table>
              <TableHead>
                <TableRow>
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
                    <TableCell dataLabel={t("suppliers.documentDate")} className="whitespace-nowrap text-zinc-700">
                      {row.documentDate}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.name")} className="text-zinc-900">
                      {row.supplierName}
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
                        {row.openAmount > 0.005 ? (
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
        )}
          </Card>
        }
      />

      <Modal
        open={invOpen}
        onClose={() => setInvOpen(false)}
        titleId="inv-create-title"
        title={t("suppliers.newInvoice")}
        wide
        wideFixedHeight
        closeButtonLabel={t("common.close")}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            <div className="flex min-w-0 flex-col gap-3 pr-0.5 pt-1">
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.intakeFormHint")}</p>
              <Select
                name="invSupplierPick"
                label={t("suppliers.name")}
                labelRequired
                options={invoiceSupplierOptions}
                value={invSupplierPick === "" ? "" : String(invSupplierPick)}
                onChange={(e) => setInvSupplierPick(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => {}}
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label={t("suppliers.documentNumber")} value={invDocNo} onChange={(e) => setInvDocNo(e.target.value)} />
                <DateField label={t("suppliers.documentDate")} labelRequired value={invDocDate} onChange={(e) => setInvDocDate(e.target.value)} />
                <DateField label={t("suppliers.dueDate")} value={invDue} onChange={(e) => setInvDue(e.target.value)} />
                <Input label={t("suppliers.currency")} value={invCur} onChange={(e) => setInvCur(e.target.value)} />
              </div>
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.documentNumberHint")}</p>
              <Input label={t("suppliers.description")} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} />
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 sm:p-4">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoicePaymentMarked")}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoicePaymentMarkedHint")}</p>
                  </div>
                  <Switch checked={invPaymentMarked} onCheckedChange={setInvPaymentMarked} />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoiceFormalIssued")}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoiceFormalIssuedHint")}</p>
                  </div>
                  <Switch checked={invFormalIssued} onCheckedChange={setInvFormalIssued} />
                </div>
              </div>
              {invNeedsWhPersonnel ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-zinc-800">{t("suppliers.whIntakePersonnelSection")}</p>
                  <p className="mt-1 text-xs text-zinc-600">{t("suppliers.whIntakePersonnelHint")}</p>
                  <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      name="invWhCheckedBy"
                      label={t("warehouse.checkedByPersonnel")}
                      labelRequired
                      options={whPersonnelSelectOptions}
                      value={invWhCheckedBy}
                      onChange={(e) => setInvWhCheckedBy(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                    <Select
                      name="invWhApprovedBy"
                      label={t("warehouse.approvedByPersonnel")}
                      labelRequired
                      options={whPersonnelSelectOptions}
                      value={invWhApprovedBy}
                      onChange={(e) => setInvWhApprovedBy(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-zinc-800">{t("suppliers.lines")}</p>
                <p className="mt-1 text-xs leading-snug text-zinc-500">{t("suppliers.invoiceLinesSectionHint")}</p>
              </div>
              {invLines.map((line, idx) => (
                <div
                  key={line.key}
                  className="min-w-0 rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/90 p-3 shadow-sm sm:p-4"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold tracking-wide text-zinc-400">#{idx + 1}</span>
                    {invLines.length > 1 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full shrink-0 text-xs sm:min-h-8 sm:w-auto"
                        onClick={() => setInvLines((rows) => rows.filter((r) => r.key !== line.key))}
                      >
                        {t("suppliers.removeLine")}
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <Select
                      name={`invLineProduct-${line.key}`}
                      label={t("suppliers.product")}
                      options={productLineSelectOptions}
                      value={line.productId}
                      onChange={(e) =>
                        setInvLines((rows) =>
                          rows.map((r) => (r.key === line.key ? { ...r, productId: e.target.value } : r))
                        )
                      }
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input
                        label={t("suppliers.lineAmount")}
                        labelRequired
                        value={line.lineAmount}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, lineAmount: e.target.value } : r))
                          )
                        }
                      />
                      <Input
                        label={t("suppliers.quantity")}
                        value={line.quantity}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, quantity: e.target.value } : r))
                          )
                        }
                      />
                      <Input
                        label={t("suppliers.unitPrice")}
                        value={line.unitPrice}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, unitPrice: e.target.value } : r))
                          )
                        }
                      />
                    </div>
                    <Input
                      label={t("suppliers.lineDescription")}
                      value={line.description}
                      onChange={(e) =>
                        setInvLines((rows) =>
                          rows.map((r) => (r.key === line.key ? { ...r, description: e.target.value } : r))
                        )
                      }
                    />
                    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("suppliers.lineReceiveTarget")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{t("suppliers.movementHint")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(
                          [
                            ["none", t("suppliers.lineReceiveNone")] as const,
                            ["warehouse", t("suppliers.lineReceiveWarehouse")] as const,
                            ["branch", t("suppliers.lineReceiveBranch")] as const,
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              setInvLines((rows) =>
                                rows.map((r) =>
                                  r.key === line.key
                                    ? {
                                        ...r,
                                        receiveTarget: mode,
                                        ...(mode !== "warehouse" ? { receiveWarehouseId: "" } : {}),
                                        ...(mode !== "branch" ? { receiveBranchId: "" } : {}),
                                      }
                                    : r
                                )
                              )
                            }
                            className={cn(
                              "rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                              line.receiveTarget === mode
                                ? "border-violet-500 bg-violet-50 text-violet-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {line.receiveTarget === "warehouse" ? (
                        <div className="mt-3">
                          <Select
                            name={`invLineWh-${line.key}`}
                            label={t("suppliers.receiveWarehouseLabel")}
                            labelRequired
                            options={warehouseLineSelectOptions}
                            value={line.receiveWarehouseId}
                            onChange={(e) =>
                              setInvLines((rows) =>
                                rows.map((r) =>
                                  r.key === line.key ? { ...r, receiveWarehouseId: e.target.value } : r
                                )
                              )
                            }
                            onBlur={() => {}}
                            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                          />
                        </div>
                      ) : null}
                      {line.receiveTarget === "branch" ? (
                        <div className="mt-3">
                          <Select
                            name={`invLineBranch-${line.key}`}
                            label={t("suppliers.receiveBranchLabel")}
                            options={branchLineSelectOptions}
                            value={line.receiveBranchId}
                            onChange={(e) =>
                              setInvLines((rows) =>
                                rows.map((r) => (r.key === line.key ? { ...r, receiveBranchId: e.target.value } : r))
                              )
                            }
                            onBlur={() => {}}
                            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:min-h-9 sm:w-fit"
                onClick={() => setInvLines((r) => [...r, emptyLine()])}
              >
                {t("suppliers.addLine")}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={() => setInvOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={() => void saveInvoice()}
              disabled={createInv.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={viewId != null}
        onClose={() => setViewId(null)}
        titleId="inv-view-title"
        title={t("suppliers.invoiceDetail")}
        wide
        wideFixedHeight
      >
        {viewPending || !viewInvoice ? (
          <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <div className="max-h-[min(78vh,640px)] overflow-y-auto p-2 sm:p-3">
            <SupplierInvoiceDetailHero invoice={viewInvoice} locale={locale} t={t} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-10" onClick={openEditInvoice}>
                {t("suppliers.invoiceEdit")}
              </Button>
            </div>
            <SupplierInvoiceAuditHistoryPanel invoiceId={viewInvoice.id} locale={locale} t={t} />

            <div className="mt-5 space-y-3 sm:hidden">
              {viewInvoice.lines.map((l) => {
                const stockLinked =
                  (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                  (l.receiveBranchId != null && l.receiveBranchId > 0);
                const allocState = lineAllocByLineId.get(l.id);
                const hasShares = !stockLinked && hasInvoiceLineBranchShares(allocState);
                return (
                  <div key={l.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-400">#{l.lineNo}</p>
                        <p className="mt-0.5 font-medium text-zinc-900">{l.description ?? l.productName ?? "—"}</p>
                        {l.warehouseMovementId ? (
                          <p className="mt-1 text-xs text-zinc-500">WM #{l.warehouseMovementId}</p>
                        ) : null}
                        {l.receiveBranchName ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-base font-semibold tabular-nums text-zinc-900">
                        {formatLocaleAmount(l.lineAmount, locale, viewInvoice.currencyCode)}
                      </p>
                    </div>
                    <div className="mt-3">
                      {stockLinked ? (
                        <p className="text-xs text-zinc-500">{t("suppliers.allocNarrowHint")}</p>
                      ) : hasShares ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full"
                          onClick={() => setBranchSharesDrawerLineId(l.id)}
                        >
                          {t("suppliers.invoiceLineBranchSharesShow")}
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => setAllocLineId(l.id)}>
                          {t("suppliers.allocOpen")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto sm:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>#</TableHeader>
                    <TableHeader>{t("suppliers.lineDescription")}</TableHeader>
                    <TableHeader className="text-right">{t("suppliers.lineAmount")}</TableHeader>
                    <TableHeader className="text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewInvoice.lines.map((l) => {
                    const stockLinked =
                      (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                      (l.receiveBranchId != null && l.receiveBranchId > 0);
                    const allocState = lineAllocByLineId.get(l.id);
                    const hasShares = !stockLinked && hasInvoiceLineBranchShares(allocState);
                    return (
                      <TableRow key={l.id}>
                        <TableCell dataLabel="#">{l.lineNo}</TableCell>
                        <TableCell dataLabel={t("suppliers.lineDescription")}>
                          <div className="text-zinc-900">{l.description ?? l.productName ?? "—"}</div>
                          {l.warehouseMovementId ? (
                            <div className="text-xs text-zinc-500">WM #{l.warehouseMovementId}</div>
                          ) : null}
                          {l.receiveBranchName ? (
                            <div className="text-xs text-zinc-500">
                              {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell dataLabel={t("suppliers.lineAmount")} className="text-right tabular-nums">
                          {formatLocaleAmount(l.lineAmount, locale, viewInvoice.currencyCode)}
                        </TableCell>
                        <TableCell dataLabel={t("common.actions")} className="text-right">
                          {stockLinked ? (
                            <span className="text-xs text-zinc-400">{t("suppliers.allocNarrowHint")}</span>
                          ) : hasShares ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-9 whitespace-nowrap"
                              onClick={() => setBranchSharesDrawerLineId(l.id)}
                            >
                              {t("suppliers.invoiceLineBranchSharesShow")}
                            </Button>
                          ) : (
                            <Button type="button" variant="secondary" className="min-h-9 whitespace-nowrap" onClick={() => setAllocLineId(l.id)}>
                              {t("suppliers.allocOpen")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Modal>

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

      <Modal
        open={editInvOpen}
        onClose={() => setEditInvOpen(false)}
        titleId="inv-edit-title"
        title={t("suppliers.invoiceEdit")}
        wide
        wideFixedHeight
        nested
        closeButtonLabel={t("common.close")}
      >
        {viewInvoice ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
              <div className="flex min-w-0 flex-col gap-3 pr-0.5 pt-1">
                <p className="text-xs leading-snug text-zinc-500">{t("suppliers.invoiceEditHint")}</p>
                <p className="text-sm font-semibold text-zinc-900">{viewInvoice.supplierName}</p>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label={t("suppliers.documentNumber")} value={editInvDocNo} onChange={(e) => setEditInvDocNo(e.target.value)} />
                  <DateField
                    label={t("suppliers.documentDate")}
                    labelRequired
                    value={editInvDocDate}
                    onChange={(e) => setEditInvDocDate(e.target.value)}
                  />
                  <DateField label={t("suppliers.dueDate")} value={editInvDue} onChange={(e) => setEditInvDue(e.target.value)} />
                  <Input
                    label={t("suppliers.currency")}
                    value={viewInvoice.currencyCode}
                    readOnly
                    className="bg-zinc-50"
                    onChange={() => {}}
                  />
                </div>
                <Input label={t("suppliers.description")} value={editInvDesc} onChange={(e) => setEditInvDesc(e.target.value)} />
                <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 sm:p-4">
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoicePaymentMarked")}</p>
                    <Switch checked={editInvPaymentMarked} onCheckedChange={setEditInvPaymentMarked} />
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoiceFormalIssued")}</p>
                    <Switch checked={editInvFormalIssued} onCheckedChange={setEditInvFormalIssued} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-zinc-700" htmlFor="inv-edit-note">
                    {t("suppliers.invoiceEditNote")}
                  </label>
                  <textarea
                    id="inv-edit-note"
                    className="min-h-20 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
                    value={editChangeNote}
                    onChange={(e) => setEditChangeNote(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-zinc-500">{t("suppliers.invoiceEditNoteHint")}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                  <p className="text-xs font-semibold text-zinc-800">{t("suppliers.invoiceEditFlowTitle")}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-600">
                    <li>{t("suppliers.invoiceEditFlowStep1")}</li>
                    <li>{t("suppliers.invoiceEditFlowStep2")}</li>
                    <li>{t("suppliers.invoiceEditFlowStep3")}</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={() => setEditInvOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                onClick={() => void saveEditInvoice()}
                disabled={updateInv.isPending}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

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

      <Modal
        open={payTarget != null}
        onClose={() => setPayTarget(null)}
        titleId="pay-title"
        title={t("suppliers.paymentTitle")}
        narrow
        nested
      >
        {payTarget ? (
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-zinc-600">{t("suppliers.allocationsHint")}</p>
            <p className="text-sm text-zinc-800">
              {payTarget.supplierName} · #{payTarget.id} · {t("suppliers.openAmount")}:{" "}
              {formatLocaleAmount(payTarget.openAmount, locale, payTarget.currencyCode)}
            </p>
            <DateField label={t("suppliers.paymentDate")} labelRequired value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <Input label={t("suppliers.paymentAmount")} labelRequired value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
            <Select
              name="paySourceType"
              label={t("suppliers.sourceType")}
              options={invoicePaySourceOptions}
              value={paySrc}
              onChange={(e) => {
                const v = e.target.value;
                setPaySrc(v);
                if (v !== "CASH") setPayBranchId("");
              }}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
            {paySrc === "CASH" ? (
              <Select
                name="payBranchId"
                label={t("suppliers.paymentBranch")}
                labelRequired
                options={branchLineSelectOptions}
                value={payBranchId}
                onChange={(e) => setPayBranchId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            ) : null}
            <Input label={t("suppliers.description")} value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPayTarget(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void savePay()} disabled={createPay.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
