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
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { DateField } from "@/shared/ui/DateField";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
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

type PayFormErrors = Partial<{ date: string; amount: string; branch: string }>;

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

  const [editInvOpen, setEditInvOpen] = useState(false);
  const [editInvDocNo, setEditInvDocNo] = useState("");
  const [editInvDocDate, setEditInvDocDate] = useState("");
  const [editInvDue, setEditInvDue] = useState("");
  const [editInvDesc, setEditInvDesc] = useState("");
  const [editInvPaymentMarked, setEditInvPaymentMarked] = useState(false);
  const [editInvFormalIssued, setEditInvFormalIssued] = useState(false);
  const [editChangeNote, setEditChangeNote] = useState("");
  const [editInvFieldErrors, setEditInvFieldErrors] = useState<EditInvFormErrors>({});

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
      await createInv.mutateAsync({
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
      setInvLineEditKey(null);
      setInvLineEditDraft(null);
      setInvCreateFieldErrors({});
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
    setEditInvFieldErrors({});
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
  const [payFieldErrors, setPayFieldErrors] = useState<PayFormErrors>({});

  useEffect(() => {
    setPayFieldErrors({});
  }, [payTarget]);

  const openPay = (row: SupplierInvoiceListItem) => {
    setPayTarget(row);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmt(String(row.openAmount));
    setPaySrc("PATRON");
    setPayBranchId("");
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
    const cashBranch = paySrc === "CASH" ? parseIntId(payBranchId) : null;
    if (paySrc === "CASH" && cashBranch == null) {
      pe.branch = t("common.formFieldRequiredHint");
    }
    setPayFieldErrors(pe);
    if (Object.values(pe).some((v) => v != null && String(v).trim() !== "")) {
      notify.error(t("common.formFillRequiredSummary"));
      return;
    }
    setPayFieldErrors({});
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
    isBlocked: createInv.isPending,
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
          <div className="space-y-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] lg:hidden">
            {invoices.map((row) => (
              <div key={row.id} className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{row.supplierName}</p>
                    <p className="mt-1 text-xs text-zinc-600">{row.documentDate}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{row.documentNumber ?? "—"}</p>
                  </div>
                  {supplierInvoiceLooksPaid(row) ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/90">
                      {t("suppliers.invoicePaidBadge")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3">
                  <div>
                    <p className="text-xs text-zinc-500">{t("suppliers.linesTotal")}</p>
                    <p className="text-sm font-semibold tabular-nums text-zinc-900">
                      {formatLocaleAmount(row.linesTotal, locale, row.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{t("suppliers.openAmount")}</p>
                    <p className="text-sm font-semibold tabular-nums text-zinc-900">
                      {formatLocaleAmount(row.openAmount, locale, row.currencyCode)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button type="button" variant="secondary" className="min-h-11 w-full touch-manipulation" onClick={() => setViewId(row.id)}>
                    {t("suppliers.view")}
                  </Button>
                  {row.openAmount > 0.005 && !row.paymentMarkedComplete ? (
                    <Button type="button" className="min-h-11 w-full touch-manipulation" onClick={() => openPay(row)}>
                      {t("suppliers.pay")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="-mx-1 hidden overflow-x-auto px-1 lg:block">
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

      <Modal
        open={invOpen}
        onClose={requestCloseCreateInvoiceModal}
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
              {Object.values(invCreateFieldErrors).some((v) => v != null && String(v).trim() !== "") ? (
                <div
                  className="rounded-xl border border-red-300 bg-white px-3 py-2.5 text-sm text-red-900 shadow-sm"
                  role="alert"
                >
                  <p className="font-semibold leading-snug">{t("common.formFillRequiredSummary")}</p>
                </div>
              ) : null}
              <Select
                name="invSupplierPick"
                label={t("suppliers.name")}
                labelRequired
                options={invoiceSupplierOptions}
                value={invSupplierPick === "" ? "" : String(invSupplierPick)}
                onChange={(e) => setInvSupplierPick(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => {}}
                error={invCreateFieldErrors.supplier}
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label={t("suppliers.documentNumber")} value={invDocNo} onChange={(e) => setInvDocNo(e.target.value)} />
                <DateField
                  label={t("suppliers.documentDate")}
                  labelRequired
                  value={invDocDate}
                  onChange={(e) => setInvDocDate(e.target.value)}
                  error={invCreateFieldErrors.documentDate}
                />
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
                      error={invCreateFieldErrors.whChecked}
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
                      error={invCreateFieldErrors.whApproved}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                  </div>
                </div>
              ) : null}
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
                  invCreateFieldErrors.lines &&
                    "rounded-xl border border-red-300 p-3 sm:items-start sm:justify-between"
                )}
              >
                <div className="min-w-0">
                  {invCreateFieldErrors.lines ? (
                    <p className="text-sm font-medium text-red-700">{invCreateFieldErrors.lines}</p>
                  ) : null}
                  <p className="text-sm font-semibold text-zinc-800">{t("suppliers.lines")}</p>
                  <p className="mt-1 text-xs leading-snug text-zinc-500">{t("suppliers.invoiceLinesSectionHint")}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
                  onClick={() => {
                    const nl = emptyLine();
                    setInvLines((r) => [...r, nl]);
                    setInvLineEditDraft({ ...nl });
                    setInvLineEditKey(nl.key);
                  }}
                >
                  {t("suppliers.addLine")}
                </Button>
              </div>
              <div className="space-y-2 lg:hidden">
                {invLines.map((line, idx) => (
                  <div
                    key={line.key}
                    role="button"
                    tabIndex={0}
                    className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm outline-none ring-violet-500/30 transition hover:border-violet-200 hover:bg-violet-50/20 focus-visible:ring-2"
                    onClick={() => openInvLineEditor(line.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openInvLineEditor(line.key);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-400">#{idx + 1}</p>
                        <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">{invDraftProductCell(line)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{invDraftReceiveSummary(line)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-sm font-semibold tabular-nums text-zinc-900">{invDraftAmountCell(line)}</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-violet-700 transition hover:bg-violet-50"
                            aria-label={t("common.edit")}
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvLineEditor(line.key);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {invLines.length > 1 ? (
                            <button
                              type="button"
                              className={cn(trashIconActionButtonClass, "h-9 w-9 rounded-lg")}
                              aria-label={t("suppliers.removeLine")}
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvLines((rows) => rows.filter((r) => r.key !== line.key));
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-xl border border-zinc-200/90 sm:block">
                <Table>
                  <TableHead>
                    <TableRow className="bg-zinc-50/90">
                      <TableHeader className="w-10 whitespace-nowrap">#</TableHeader>
                      <TableHeader>{t("suppliers.product")}</TableHeader>
                      <TableHeader className="text-right whitespace-nowrap">{t("suppliers.lineAmount")}</TableHeader>
                      <TableHeader className="min-w-[8rem]">{t("suppliers.lineReceiveTarget")}</TableHeader>
                      <TableHeader className="w-28 text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invLines.map((line, idx) => (
                      <TableRow
                        key={line.key}
                        className="cursor-pointer transition-colors hover:bg-violet-50/35"
                        onClick={() => openInvLineEditor(line.key)}
                      >
                        <TableCell className="align-middle text-xs font-semibold text-zinc-500">{idx + 1}</TableCell>
                        <TableCell
                          className="max-w-[14rem] truncate align-middle text-sm text-zinc-900"
                          title={invDraftProductCell(line)}
                        >
                          {invDraftProductCell(line)}
                        </TableCell>
                        <TableCell className="align-middle text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {invDraftAmountCell(line)}
                        </TableCell>
                        <TableCell className="align-middle text-xs leading-snug text-zinc-600">
                          {invDraftReceiveSummary(line)}
                        </TableCell>
                        <TableCell className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Tooltip content={t("common.edit")} delayMs={200}>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-violet-700 transition hover:bg-violet-50"
                                aria-label={t("common.edit")}
                                onClick={() => openInvLineEditor(line.key)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            {invLines.length > 1 ? (
                              <Tooltip content={t("suppliers.removeLine")} delayMs={200}>
                                <button
                                  type="button"
                                  className={cn(trashIconActionButtonClass, "h-9 w-9 rounded-lg")}
                                  aria-label={t("suppliers.removeLine")}
                                  onClick={() => setInvLines((rows) => rows.filter((r) => r.key !== line.key))}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={requestCloseCreateInvoiceModal}>
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
        nested
        open={invLineEditKey != null && invLineEditDraft != null}
        onClose={closeInvLineEditor}
        titleId="inv-line-edit-title"
        title={`${t("suppliers.lines")} #${invLineEditKey != null ? invLines.findIndex((l) => l.key === invLineEditKey) + 1 : ""}`}
        narrow
        closeButtonLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        className="!max-w-[min(100vw-1rem,36rem)] sm:!max-w-xl"
      >
        {invLineEditDraft ? (
          <div className="flex max-h-[min(92dvh,52rem)] min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-0 sm:px-5 sm:pb-3">
              <div className="flex flex-col gap-3 pt-1">
                {Object.keys(invLineEditErrors).length > 0 ? (
                  <div
                    className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
                    role="alert"
                  >
                    {t("common.formFillRequiredSummary")}
                  </div>
                ) : null}
                <Select
                  name="invLineEditProduct"
                  label={t("suppliers.product")}
                  options={productLineSelectOptions}
                  value={invLineEditDraft.productId}
                  onChange={(e) =>
                    setInvLineEditDraft((d) => (d ? { ...d, productId: e.target.value } : d))
                  }
                  onBlur={() => {}}
                  error={invLineEditDraft.receiveTarget === "warehouse" ? invLineEditErrors.product : undefined}
                  className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                />
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label={t("suppliers.lineAmount")}
                    labelRequired
                    value={invLineEditDraft.lineAmount}
                    inputMode="decimal"
                    onChange={(e) =>
                      setInvLineEditDraft((d) => (d ? { ...d, lineAmount: e.target.value } : d))
                    }
                    onBlur={() =>
                      setInvLineEditDraft((d) =>
                        d ? { ...d, lineAmount: formatAmountInputOnBlur(d.lineAmount, locale) } : d
                      )
                    }
                    error={invLineEditErrors.lineAmount}
                  />
                  <Input
                    label={t("suppliers.quantity")}
                    value={invLineEditDraft.quantity}
                    onChange={(e) =>
                      setInvLineEditDraft((d) => (d ? { ...d, quantity: e.target.value } : d))
                    }
                    error={invLineEditDraft.receiveTarget === "warehouse" ? invLineEditErrors.quantity : undefined}
                  />
                  <Input
                    label={t("suppliers.unitPrice")}
                    value={invLineEditDraft.unitPrice}
                    onChange={(e) =>
                      setInvLineEditDraft((d) => (d ? { ...d, unitPrice: e.target.value } : d))
                    }
                  />
                </div>
                <Input
                  label={t("suppliers.lineDescription")}
                  value={invLineEditDraft.description}
                  onChange={(e) =>
                    setInvLineEditDraft((d) => (d ? { ...d, description: e.target.value } : d))
                  }
                />
                <div
                  className={cn(
                    "rounded-xl border p-3 sm:p-4",
                    invLineEditErrors.receiveBranch || invLineEditErrors.receiveWarehouse
                      ? "border-red-400 bg-zinc-50/80"
                      : "border-zinc-200/90 bg-zinc-50/80"
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("suppliers.lineReceiveTarget")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">{t("suppliers.movementHint")}</p>
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
                          setInvLineEditDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  receiveTarget: mode,
                                  ...(mode !== "warehouse" ? { receiveWarehouseId: "" } : {}),
                                  ...(mode !== "branch" ? { receiveBranchId: "" } : {}),
                                }
                              : d
                          )
                        }
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                          invLineEditDraft.receiveTarget === mode
                            ? "border-violet-500 bg-violet-50 text-violet-900"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {invLineEditDraft.receiveTarget === "warehouse" ? (
                    <div className="mt-3">
                      <Select
                        name="invLineEditWh"
                        label={t("suppliers.receiveWarehouseLabel")}
                        labelRequired
                        options={warehouseLineSelectOptions}
                        value={invLineEditDraft.receiveWarehouseId}
                        onChange={(e) =>
                          setInvLineEditDraft((d) =>
                            d ? { ...d, receiveWarehouseId: e.target.value } : d
                          )
                        }
                        onBlur={() => {}}
                        error={invLineEditErrors.receiveWarehouse}
                        className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                      />
                    </div>
                  ) : null}
                  {invLineEditDraft.receiveTarget === "branch" ? (
                    <div className="mt-3">
                      <Select
                        name="invLineEditBranch"
                        label={t("suppliers.receiveBranchLabel")}
                        labelRequired
                        options={branchLineSelectOptions}
                        value={invLineEditDraft.receiveBranchId}
                        onChange={(e) =>
                          setInvLineEditDraft((d) =>
                            d ? { ...d, receiveBranchId: e.target.value } : d
                          )
                        }
                        onBlur={() => {}}
                        error={invLineEditErrors.receiveBranch}
                        className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white px-3 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                onClick={closeInvLineEditor}
              >
                {t("common.cancel")}
              </Button>
              <Button type="button" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={applyInvLineEditor}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : null}
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
          <div className="max-h-[min(92dvh,72rem)] overflow-y-auto p-2 sm:p-3">
            <SupplierInvoiceDetailHero invoice={viewInvoice} locale={locale} t={t} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="min-h-10" onClick={openEditInvoice}>
                {t("suppliers.invoiceEdit")}
              </Button>
            </div>
            <SupplierInvoiceAuditHistoryPanel invoiceId={viewInvoice.id} locale={locale} t={t} />

            <div className="mt-5 space-y-3 lg:hidden">
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
        onClose={() => {
          setEditInvFieldErrors({});
          setEditInvOpen(false);
        }}
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
                {editInvFieldErrors.documentDate ? (
                  <div
                    className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
                    role="alert"
                  >
                    {t("common.formFillRequiredSummary")}
                  </div>
                ) : null}
                <p className="text-sm font-semibold text-zinc-900">{viewInvoice.supplierName}</p>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label={t("suppliers.documentNumber")} value={editInvDocNo} onChange={(e) => setEditInvDocNo(e.target.value)} />
                  <DateField
                    label={t("suppliers.documentDate")}
                    labelRequired
                    value={editInvDocDate}
                    onChange={(e) => setEditInvDocDate(e.target.value)}
                    error={editInvFieldErrors.documentDate}
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
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                onClick={() => {
                  setEditInvFieldErrors({});
                  setEditInvOpen(false);
                }}
              >
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
        onClose={() => {
          setPayFieldErrors({});
          setPayTarget(null);
        }}
        titleId="pay-title"
        title={t("suppliers.paymentTitle")}
        narrow
        nested
      >
        {payTarget ? (
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-zinc-600">{t("suppliers.allocationsHint")}</p>
            {Object.values(payFieldErrors).some((v) => v != null && String(v).trim() !== "") ? (
              <div
                className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
                role="alert"
              >
                {t("common.formFillRequiredSummary")}
              </div>
            ) : null}
            <p className="text-sm text-zinc-800">
              {payTarget.supplierName} · #{payTarget.id} · {t("suppliers.openAmount")}:{" "}
              {formatLocaleAmount(payTarget.openAmount, locale, payTarget.currencyCode)}
            </p>
            <DateField
              label={t("suppliers.paymentDate")}
              labelRequired
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              error={payFieldErrors.date}
            />
            <Input
              label={t("suppliers.paymentAmount")}
              labelRequired
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              error={payFieldErrors.amount}
            />
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
                error={payFieldErrors.branch}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            ) : null}
            <Input label={t("suppliers.description")} value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPayFieldErrors({});
                  setPayTarget(null);
                }}
              >
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
