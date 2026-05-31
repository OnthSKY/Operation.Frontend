"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchBranchDocuments } from "@/modules/branch/api/branch-documents-api";
import {
  fetchWarehouseGlobalMovements,
  type WarehouseGlobalMovementsFilters,
  type WarehouseGlobalMovementRow,
} from "@/modules/warehouse/api/warehouse-global-movements-api";
import { fetchShipmentRequests } from "@/modules/shipments/api/shipment-api";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  formatWarehouseShipmentDisplay,
  shipmentIdLabelClassName,
} from "@/shared/lib/in-batch-group-label";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { EyeIcon, detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { WarehouseMovementInvoicePreviewModal } from "@/modules/warehouse/components/WarehouseMovementInvoicePreviewModal";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ResponsiveTableFrame } from "@/shared/tables/ResponsiveTableFrame";

const PAGE_SIZE = 25;
const DRAWER_SELECT_Z = 280;

const EMPTY_SCOPE: WarehouseScopeFiltersValue = {
  mainCategoryId: null,
  subCategoryId: null,
  parentProductId: null,
  productId: null,
};

/** Sevkiyat aksiyon barında PDF/belge eylemleri için ince çizgili belge ikonu. */
function ShipmentDocIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

/** Sevkiyat kartı başlığında tarihi "tarih gibi" göstermek için ince çizgili takvim ikonu. */
function ShipmentCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

/** İki sevkiyat PDF'i (satış formu / irsaliye) için var-yok + erişim chip'i. Modern, kompakt. */
function ShipmentPdfChip({
  label,
  exists,
  loading,
  actionHint,
  onClick,
  compact,
}: {
  label: string;
  exists: boolean;
  loading?: boolean;
  actionHint?: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const clickable = typeof onClick === "function";
  const cls = cn(
    "inline-flex items-center gap-1.5 border transition",
    compact ? "rounded-full px-2 py-0.5 text-[11px]" : "rounded-lg px-2.5 py-1.5 text-xs",
    exists ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white",
    clickable && (exists ? "hover:bg-emerald-100" : "hover:bg-zinc-50"),
    clickable && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
  );
  const content = (
    <>
      <ShipmentDocIcon
        className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0", exists ? "text-emerald-600" : "text-zinc-400")}
      />
      <span className={cn("font-semibold", exists ? "text-zinc-900" : "text-zinc-700")}>{label}</span>
      {!compact && actionHint ? (
        <>
          <span className="text-zinc-300">·</span>
          <span className={exists ? "font-medium text-emerald-700" : "text-zinc-500"}>
            {loading ? "…" : actionHint}
          </span>
        </>
      ) : null}
      {loading ? (
        <span className="text-zinc-400">…</span>
      ) : exists ? (
        <svg
          className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "shrink-0 text-emerald-600")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <span aria-hidden className="text-zinc-300">
          —
        </span>
      )}
    </>
  );
  if (!clickable) return <span className={cls}>{content}</span>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

function shipmentGroupKeyForRow(row: WarehouseGlobalMovementRow): string {
  return row.inBatchGroupId?.trim() ? `batch:${row.inBatchGroupId.trim()}` : `single:${row.id}`;
}

type ShipmentGroupSummary = {
  key: string;
  representative: WarehouseGlobalMovementRow;
  rows: WarehouseGlobalMovementRow[];
  lineCount: number;
  totalQuantity: number;
};

function shipmentOutboundBranchSummary(rows: WarehouseGlobalMovementRow[]): string | null {
  const names = Array.from(
    rows
      .filter((r) => r.type === "OUT" && r.isDepotToBranchShipment)
      .map((r) => (r.outDestinationBranchName ?? "").trim())
      .filter((name) => name.length > 0)
      .reduce((map, name) => {
        const key = name.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
        if (!map.has(key)) map.set(key, name);
        return map;
      }, new Map<string, string>())
      .values()
  );
  if (names.length === 0) return null;
  // UX kuralı: bir sevkiyat grubunun hedefi tek şubedir; çakışan eski veride ilk hedefi göster.
  return names[0] ?? null;
}

function movementMainProductKey(m: WarehouseGlobalMovementRow): string {
  if (m.parentProductId != null && m.parentProductId > 0) return `parent:${m.parentProductId}`;
  return `product:${m.productId}`;
}

function movementMainProductName(m: WarehouseGlobalMovementRow): string {
  return m.parentProductName?.trim() || m.productName;
}

type ShipmentMainProductGroup = {
  key: string;
  name: string;
  /** Kalemlerin ham miktar toplamı (yön kart başlığındaki tip rozetinden okunur). */
  quantity: number;
  unit: string | null;
  rows: WarehouseGlobalMovementRow[];
};

/** Ana ürün -> altındaki kalemler. Tek düzen liste için: başlık (ana ürün + toplam) + alt kalemler. */
function shipmentMainProductGroups(
  movements: WarehouseGlobalMovementRow[]
): ShipmentMainProductGroup[] {
  const map = new Map<string, ShipmentMainProductGroup>();
  for (const m of movements) {
    const key = movementMainProductKey(m);
    const qty = Number(m.quantity) || 0;
    const unit = m.unit?.trim() || null;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
      if (!existing.unit && unit) existing.unit = unit;
      existing.rows.push(m);
      continue;
    }
    map.set(key, { key, name: movementMainProductName(m), quantity: qty, unit, rows: [m] });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function compactPeopleList(values: Array<string | null | undefined>): string {
  const uniq = Array.from(new Set(values.map((v) => v?.trim() ?? "").filter((v) => v.length > 0)));
  if (uniq.length === 0) return "—";
  if (uniq.length <= 2) return uniq.join(", ");
  return `${uniq.slice(0, 2).join(", ")} +${uniq.length - 2}`;
}

function buildShipmentGroupSummary(
  key: string,
  rows: WarehouseGlobalMovementRow[]
): ShipmentGroupSummary {
  const first = rows[0];
  if (!first) {
    throw new Error("buildShipmentGroupSummary: empty rows");
  }
  const representative =
    rows.find((r) => r.type === "OUT" && r.isDepotToBranchShipment) ??
    rows.find((r) => r.type === "OUT") ??
    first;
  return {
    key,
    representative,
    rows: rows.slice().sort((a, b) => b.id - a.id),
    lineCount: rows.length,
    totalQuantity: rows.reduce((sum, x) => sum + (Number(x.quantity) || 0), 0),
  };
}

function parseShipmentMetadataFromNotes(notes: string | null | undefined): Record<string, string> {
  const text = String(notes ?? "");
  const parts = text
    .split("·")
    .map((x) => x.trim())
    .filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (!key || !value) continue;
    map[key] = value;
  }
  return map;
}

type RelatedShipmentRequest = {
  id: number;
  shipmentNo: string;
  status: string;
};

function resolveRelatedShipmentFromRows(
  rows: WarehouseGlobalMovementRow[],
  shipmentById: Map<number, RelatedShipmentRequest>,
  shipmentByNo: Map<string, RelatedShipmentRequest>
): RelatedShipmentRequest | null {
  for (const row of rows) {
    const meta = parseShipmentMetadataFromNotes(row.description);
    const idRaw =
      meta.shipmentRequestId ??
      meta.shipment_request_id ??
      meta.shipmentId ??
      meta.shipment_id;
    const noRaw =
      meta.shipmentNo ??
      meta.shipment_no ??
      meta.shipmentRequestNo ??
      meta.shipment_request_no;
    const id = Number(idRaw ?? 0);
    if (Number.isFinite(id) && id > 0) {
      const hit = shipmentById.get(id);
      if (hit) return hit;
    }
    const no = String(noRaw ?? "").trim().toUpperCase();
    if (no.length > 0) {
      const hit = shipmentByNo.get(no);
      if (hit) return hit;
    }
  }
  return null;
}

/** Notes metadata'sından ilgili sevkiyat talebinin ham id'si (aday listesinden bağımsız, irsaliye eşleştirmesi için). */
function resolveShipmentRequestIdFromRows(rows: WarehouseGlobalMovementRow[]): number | null {
  for (const row of rows) {
    const meta = parseShipmentMetadataFromNotes(row.description);
    const id = Number(
      meta.shipmentRequestId ?? meta.shipment_request_id ?? meta.shipmentId ?? meta.shipment_id ?? 0
    );
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

/** Sevkiyat kartı `<details>` içi: ana ürün başlığı + altında alt kalemler (tek düzen, toggle yok). */
function ShipmentGroupExpandedLineBlock({ group }: { group: ShipmentGroupSummary }) {
  const { t, locale } = useI18n();
  const isOut = group.representative.type === "OUT";
  const mainGroups = useMemo(() => shipmentMainProductGroups(group.rows), [group.rows]);

  return (
    <div className="space-y-2">
      {mainGroups.map((mg) => {
        const onlyChild =
          mg.rows.length === 1 && mg.rows[0]?.productName?.trim() === mg.name.trim();
        return (
          <div
            key={`ship-main-${group.key}-${mg.key}`}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900">
                {mg.name}
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm font-bold tabular-nums",
                  isOut ? "text-rose-700" : "text-emerald-700"
                )}
              >
                {formatLocaleAmount(mg.quantity, locale)}
                {mg.unit ? ` ${mg.unit}` : ""}
              </span>
            </div>
            {onlyChild ? null : (
              <div className="divide-y divide-zinc-50">
                {mg.rows.map((x) => (
                  <div
                    key={`g-row-${group.key}-${x.id}`}
                    className="flex items-center justify-between gap-3 py-1.5 pl-5 pr-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-zinc-600">{x.productName}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums font-medium text-zinc-800">{x.quantity}</span>
                      {x.type === "IN" && x.hasInvoicePhoto ? (
                        <a
                          href={warehouseMovementInvoicePhotoUrl(x.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={detailOpenIconButtonClass}
                          aria-label={t("warehouse.openInvoicePhoto")}
                          title={t("warehouse.openInvoicePhoto")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WarehouseGlobalMovementsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: warehouses = [] } = useWarehousesList();
  const { data: branches = [] } = useBranchesList();
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>(() => ({ ...EMPTY_SCOPE }));
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftScope, setDraftScope] = useState<WarehouseScopeFiltersValue>(() => ({ ...EMPTY_SCOPE }));
  const [draftWarehouseId, setDraftWarehouseId] = useState("");
  const [draftType, setDraftType] = useState("");
  const [draftBranchId, setDraftBranchId] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"movements" | "shipments">("shipments");
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [detailSummaryGroup, setDetailSummaryGroup] = useState<ShipmentGroupSummary | null>(null);
  const [invoicePreviewTarget, setInvoicePreviewTarget] = useState<{
    movementId: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const openFiltersDrawer = useCallback(() => {
    setDraftScope({
      mainCategoryId: scope.mainCategoryId,
      subCategoryId: scope.subCategoryId,
      parentProductId: scope.parentProductId,
      productId: scope.productId,
    });
    setDraftWarehouseId(warehouseId);
    setDraftType(type);
    setDraftBranchId(type === "IN" ? "" : branchId);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setFiltersDrawerOpen(true);
  }, [scope, warehouseId, type, branchId, dateFrom, dateTo]);

  const clearDraftFilters = useCallback(() => {
    setDraftScope({ ...EMPTY_SCOPE });
    setDraftWarehouseId("");
    setDraftType("");
    setDraftBranchId("");
    setDraftDateFrom("");
    setDraftDateTo("");
  }, []);

  const applyDraftFiltersAndClose = useCallback(() => {
    setScope({
      mainCategoryId: draftScope.mainCategoryId,
      subCategoryId: draftScope.subCategoryId,
      parentProductId: draftScope.parentProductId,
      productId: draftScope.productId,
    });
    setWarehouseId(draftWarehouseId);
    setType(draftType);
    setBranchId(draftType === "IN" ? "" : draftBranchId);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFiltersDrawerOpen(false);
  }, [draftScope, draftWarehouseId, draftType, draftBranchId, draftDateFrom, draftDateTo]);

  const closeFiltersDrawer = useCallback(() => {
    setFiltersDrawerOpen(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(1);
    }, 0);
    return () => window.clearTimeout(id);
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    warehouseId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (type !== "IN") return;
    const id = window.setTimeout(() => {
      setBranchId((prev) => (prev !== "" ? "" : prev));
    }, 0);
    return () => window.clearTimeout(id);
  }, [type]);

  const filters = useMemo<WarehouseGlobalMovementsFilters>(
    () => ({
      scope,
      warehouseId:
        warehouseId !== "" && Number(warehouseId) > 0 ? Math.trunc(Number(warehouseId)) : undefined,
      type: type === "IN" || type === "OUT" ? type : "",
      branchId:
        type !== "IN" && branchId !== "" && Number(branchId) > 0 ? Math.trunc(Number(branchId)) : undefined,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    }),
    [scope, warehouseId, type, branchId, dateFrom, dateTo]
  );

  const { data = [], isPending, isError, error, isFetching } = useQuery({
    queryKey: ["warehouse-global-movements", filters] as const,
    queryFn: () => fetchWarehouseGlobalMovements(filters),
    placeholderData: (prev) => prev,
  });
  const { data: relatedShipmentCandidates } = useQuery({
    queryKey: ["shipment-requests-for-warehouse-movements-link"] as const,
    queryFn: async () => {
      const page = await fetchShipmentRequests({ page: 1, pageSize: 200 });
      return (page.items ?? []).map((x) => ({
        id: x.id,
        shipmentNo: x.shipmentNo,
        status: x.status,
      })) as RelatedShipmentRequest[];
    },
    staleTime: 60_000,
  });
  const relatedShipmentById = useMemo(() => {
    const map = new Map<number, RelatedShipmentRequest>();
    for (const x of relatedShipmentCandidates ?? []) map.set(x.id, x);
    return map;
  }, [relatedShipmentCandidates]);
  const relatedShipmentByNo = useMemo(() => {
    const map = new Map<string, RelatedShipmentRequest>();
    for (const x of relatedShipmentCandidates ?? [])
      map.set(String(x.shipmentNo).trim().toUpperCase(), x);
    return map;
  }, [relatedShipmentCandidates]);

  const warehouseOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.globalFilterWarehouseAll") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [t, warehouses]
  );

  const typeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("products.filterTypeAll") },
      { value: "IN", label: t("products.typeIn") },
      { value: "OUT", label: t("products.typeOut") },
    ],
    [t]
  );

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.filterAllBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const totalCount = data.length;
  const totalInShipmentCount = useMemo(
    () => new Set(data.filter((x) => x.type === "IN").map((x) => shipmentGroupKeyForRow(x))).size,
    [data]
  );
  const totalOutShipmentCount = useMemo(
    () => new Set(data.filter((x) => x.type === "OUT").map((x) => shipmentGroupKeyForRow(x))).size,
    [data]
  );
  /** Ana ürün bazında, filtreli aralıktaki toplam giriş ve çıkış miktarları. */
  const inOutTotalsByMainProduct = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; inQty: number; outQty: number; unit: string | null }
    >();
    for (const r of data) {
      const mk = movementMainProductKey(r);
      const qty = Number(r.quantity) || 0;
      const unit = r.unit?.trim() || null;
      const existing = map.get(mk);
      if (existing) {
        if (r.type === "IN") existing.inQty += qty;
        else existing.outQty += qty;
        if (!existing.unit && unit) existing.unit = unit;
        continue;
      }
      map.set(mk, {
        key: mk,
        name: movementMainProductName(r),
        inQty: r.type === "IN" ? qty : 0,
        outQty: r.type === "OUT" ? qty : 0,
        unit,
      });
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        b.inQty + b.outQty - (a.inQty + a.outQty) ||
        a.name.localeCompare(b.name, locale, { sensitivity: "base" })
    );
  }, [data, locale]);
  const movementFiltersActive = useMemo(() => {
    if (scope.mainCategoryId != null || scope.subCategoryId != null || scope.parentProductId != null || scope.productId != null) return true;
    if (warehouseId !== "" && Number(warehouseId) > 0) return true;
    if (type === "IN" || type === "OUT") return true;
    if (type !== "IN" && branchId !== "" && Number(branchId) > 0) return true;
    if (dateFrom.length === 10 || dateTo.length === 10) return true;
    return false;
  }, [scope, warehouseId, type, branchId, dateFrom, dateTo]);
  const openMovementGroupDetailDialog = (row: WarehouseGlobalMovementRow) => {
    const key = shipmentGroupKeyForRow(row);
    const rows = data.filter((r) => shipmentGroupKeyForRow(r) === key);
    if (rows.length === 0) return;
    setDetailSummaryGroup(buildShipmentGroupSummary(key, rows));
  };
  const openOrderAccountStatement = (group: ShipmentGroupSummary) => {
    const row = group.representative;
    const movementIds = group.rows.map((x) => x.id).filter((x) => Number.isFinite(x) && x > 0);
    const params = new URLSearchParams({
      shipmentWarehouseId: String(row.warehouseId),
      shipmentMovementId: String(row.id),
      shipmentMovementIds: movementIds.join(","),
    });
    router.push(`/products/order-account-statement?${params.toString()}`);
  };
  const openShipmentPdfDocuments = (group: ShipmentGroupSummary) => {
    const movementIds = Array.from(
      new Set(
        group.rows
          .map((x) => Number(x.id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );
    if (movementIds.length === 0) return;
    const params = new URLSearchParams({ shipmentMovementIds: movementIds.join(",") });
    router.push(`/documents?${params.toString()}`);
  };
  const shipmentGroups = useMemo<ShipmentGroupSummary[]>(() => {
    const grouped = new Map<string, WarehouseGlobalMovementRow[]>();
    for (const row of data) {
      const key = shipmentGroupKeyForRow(row);
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries())
      .map(([key, rows]) => buildShipmentGroupSummary(key, rows))
      .sort(
        (a, b) =>
          b.representative.movementDate.localeCompare(a.representative.movementDate) ||
          b.representative.id - a.representative.id
      );
  }, [data]);
  const shipmentPdfLookupEnabled = branches.length > 0 && shipmentGroups.some((g) => g.representative.type === "OUT");
  const shipmentPdfDocsQ = useQuery({
    queryKey: ["warehouse-global-shipment-pdf-docs", branches.map((b) => b.id).sort((a, b) => a - b).join(",")] as const,
    queryFn: async () => {
      const docsByBranch = await Promise.all(
        branches.map(async (b) => ({
          branchId: b.id,
          docs: await fetchBranchDocuments(b.id),
        }))
      );
      return docsByBranch.flatMap((x) =>
        x.docs.map((doc) => ({
          branchId: x.branchId,
          kind: doc.kind,
          contentType: String(doc.contentType ?? "").toLocaleLowerCase(),
          notes: doc.notes,
          shipmentRequestId: doc.shipmentRequestId,
        }))
      );
    },
    enabled: shipmentPdfLookupEnabled,
    staleTime: 30_000,
  });
  const hasSystemPdfByShipmentGroupKey = useMemo(() => {
    const map = new Map<string, boolean>();
    const docs = shipmentPdfDocsQ.data ?? [];
    for (const group of shipmentGroups) {
      const movementIds = new Set(group.rows.map((r) => r.id));
      let has = false;
      for (const doc of docs) {
        if (!doc.contentType.includes("pdf")) continue;
        const meta = parseShipmentMetadataFromNotes(doc.notes);
        const primary = Number(meta.shipmentPrimaryMovementId ?? 0);
        if (primary > 0 && movementIds.has(primary)) {
          has = true;
          break;
        }
        const linked = String(meta.shipmentMovementIds ?? "")
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (linked.some((n) => movementIds.has(n))) {
          has = true;
          break;
        }
      }
      map.set(group.key, has);
    }
    return map;
  }, [shipmentGroups, shipmentPdfDocsQ.data]);
  /** İrsaliye (SHIPMENT_DELIVERY_SLIP) PDF'i bulunan sevkiyat talebi id'leri. */
  const deliverySlipShipmentRequestIds = useMemo(() => {
    const set = new Set<number>();
    for (const doc of shipmentPdfDocsQ.data ?? []) {
      if (doc.kind !== "SHIPMENT_DELIVERY_SLIP") continue;
      if (!doc.contentType.includes("pdf")) continue;
      if (doc.shipmentRequestId && doc.shipmentRequestId > 0) set.add(doc.shipmentRequestId);
    }
    return set;
  }, [shipmentPdfDocsQ.data]);
  const activeItemCount = viewMode === "movements" ? totalCount : shipmentGroups.length;
  const totalPages = Math.max(1, Math.ceil(activeItemCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const items = data.slice(pageStart, pageStart + PAGE_SIZE);

  const movementDetailModalContent = useMemo(() => {
    if (!detailSummaryGroup) return null;
    const g = detailSummaryGroup;
    const rep = g.representative;
    const batchCell = formatWarehouseShipmentDisplay(rep.inBatchGroupId, rep.id);
    const destBranch = shipmentOutboundBranchSummary(g.rows);
    const detailType = rep.type;
    const typeLabel = detailType === "IN" ? t("products.typeIn") : t("products.typeOut");
    const isOut = rep.type === "OUT";
    const mainGroups = shipmentMainProductGroups(g.rows);
    const hasPdfActions = rep.type === "OUT";
    const hasSystemPdf = hasSystemPdfByShipmentGroupKey.get(g.key) === true;
    const shipmentRequestId = resolveShipmentRequestIdFromRows(g.rows);
    const hasDeliverySlip =
      shipmentRequestId != null && deliverySlipShipmentRequestIds.has(shipmentRequestId);
    const pdfStatusLoading = shipmentPdfDocsQ.isFetching && !shipmentPdfDocsQ.data;
    const invoiceRows = g.rows.filter((x) => x.type === "IN" && x.hasInvoicePhoto);
    return (
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pr-2 sm:mt-4 sm:px-4 sm:pb-4 sm:pr-3">
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="rounded-md border border-zinc-200 bg-zinc-50/60">
              <div className="border-b border-zinc-200 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("warehouse.quickMovementDate")}
                    </p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">
                      {formatLocaleDate(rep.movementDate, locale)}
                    </p>
                  </div>
                  <span className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-800">
                    {typeLabel}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="border-b border-zinc-200 px-3 py-2 md:border-r">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {detailType === "OUT"
                      ? t("warehouse.movementSourceWarehouseLabel")
                      : t("warehouse.movementWarehouseLabel")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{rep.warehouseName?.trim() || "—"}</p>
                </div>
                {detailType === "OUT" ? (
                  <div className="border-b border-zinc-200 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("warehouse.movementOutBranch")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{destBranch || "—"}</p>
                  </div>
                ) : null}
                {detailType === "IN" ? (
                  <div className="border-b border-zinc-200 px-3 py-2 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("warehouse.movementInvoicesDialogTitle")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {invoiceRows.length === 0 ? (
                        <p className="text-sm font-medium text-zinc-500">{t("warehouse.detailFieldEmpty")}</p>
                      ) : (
                        invoiceRows.map((row) => (
                          <Button
                            key={`dlg-invoice-${g.key}-${row.id}`}
                            type="button"
                            variant="secondary"
                            className="min-h-11 px-2.5 text-xs"
                            onClick={() =>
                              setInvoicePreviewTarget({
                                movementId: row.id,
                                title: t("warehouse.movementInvoicePreviewTitle"),
                                subtitle: row.productName,
                              })
                            }
                          >
                            {t("warehouse.openInvoicePhoto")}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="border-b border-zinc-200 px-3 py-2 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("warehouse.movementBatchGroup")}
                  </p>
                  <p className={cn("mt-1", shipmentIdLabelClassName)}>{batchCell.text}</p>
                </div>
                <div className="border-b border-zinc-200 px-3 py-2 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("warehouse.movementNote")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {g.rows[0]?.description?.trim() || "—"}
                  </p>
                </div>
                <div className="border-b border-zinc-200 px-3 py-2 md:border-r">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("warehouse.movementCheckedBy")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {compactPeopleList(g.rows.map((m) => m.checkedByPersonnelName))}
                  </p>
                </div>
                <div className="border-b border-zinc-200 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("warehouse.movementApprovedBy")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {compactPeopleList(g.rows.map((m) => m.approvedByPersonnelName))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {hasPdfActions ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("warehouse.shipmentPdfsLabel")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ShipmentPdfChip
                  label={t("warehouse.shipmentPdfSalesForm")}
                  exists={hasSystemPdf}
                  loading={pdfStatusLoading}
                  actionHint={
                    hasSystemPdf ? t("warehouse.shipmentPdfView") : t("warehouse.shipmentPdfCreate")
                  }
                  onClick={
                    hasSystemPdf ? () => openShipmentPdfDocuments(g) : () => openOrderAccountStatement(g)
                  }
                />
                <ShipmentPdfChip
                  label={t("warehouse.shipmentPdfDeliverySlip")}
                  exists={hasDeliverySlip}
                  loading={pdfStatusLoading}
                  actionHint={
                    hasDeliverySlip ? t("warehouse.shipmentPdfView") : t("warehouse.shipmentPdfNotYet")
                  }
                  onClick={
                    hasDeliverySlip && shipmentRequestId != null
                      ? () => router.push(`/shipments/${shipmentRequestId}`)
                      : undefined
                  }
                />
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
            <p className="text-xs font-semibold text-zinc-800">
              {t("warehouse.movementLinesDialogTitle")} ({g.rows.length})
            </p>
            <div className="mt-2 space-y-2">
              {mainGroups.map((mg) => {
                const onlyChild =
                  mg.rows.length === 1 && mg.rows[0]?.productName?.trim() === mg.name.trim();
                return (
                  <div
                    key={`dlg-main-${g.key}-${mg.key}`}
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900">
                        {mg.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-bold tabular-nums",
                          isOut ? "text-rose-700" : "text-emerald-700"
                        )}
                      >
                        {formatLocaleAmount(mg.quantity, locale)}
                        {mg.unit ? ` ${mg.unit}` : ""}
                      </span>
                    </div>
                    {onlyChild ? null : (
                      <div className="divide-y divide-zinc-50">
                        {mg.rows.map((x) => (
                          <div
                            key={`dlg-line-${g.key}-${x.id}`}
                            className="flex items-center justify-between gap-3 py-1.5 pl-5 pr-3 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate text-zinc-600">{x.productName}</span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="tabular-nums font-medium text-zinc-800">{x.quantity}</span>
                              {x.type === "IN" && x.hasInvoicePhoto ? (
                                <button
                                  type="button"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t("warehouse.openInvoicePhoto")}
                                  title={t("warehouse.openInvoicePhoto")}
                                  onClick={() =>
                                    setInvoicePreviewTarget({
                                      movementId: x.id,
                                      title: t("warehouse.movementInvoicePreviewTitle"),
                                      subtitle: x.productName,
                                    })
                                  }
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    deliverySlipShipmentRequestIds,
    detailSummaryGroup,
    hasSystemPdfByShipmentGroupKey,
    locale,
    openOrderAccountStatement,
    openShipmentPdfDocuments,
    router,
    shipmentPdfDocsQ.data,
    shipmentPdfDocsQ.isFetching,
    t,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 pb-6 sm:p-4 sm:pb-10">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {t("warehouse.globalMovementsTitle")}
        </h1>
        <p className="text-sm text-zinc-500">{t("warehouse.globalMovementsSubtitle")}</p>
      </div>
      <div className="flex items-center justify-end">
        <div className="mr-2 inline-flex rounded-lg border border-zinc-200 bg-white p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              viewMode === "movements" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
            )}
            onClick={() => setViewMode("movements")}
          >
            {t("warehouse.globalViewMovements")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              viewMode === "shipments" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
            )}
            onClick={() => setViewMode("shipments")}
          >
            {t("warehouse.globalViewShipments")}
          </button>
        </div>
        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
          aria-expanded={filtersDrawerOpen}
          aria-haspopup="dialog"
          aria-label={t("warehouse.movementsFilterIconAria")}
          onClick={openFiltersDrawer}
        >
          <FilterFunnelIcon className="h-5 w-5" />
          {movementFiltersActive ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" aria-hidden />
          ) : null}
        </button>
      </div>

      <RightDrawer
        open={filtersDrawerOpen}
        onClose={closeFiltersDrawer}
        title={t("warehouse.movementsFiltersTitle")}
        closeLabel={t("common.close")}
        showFooterCloseButton={false}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="space-y-4 pb-2">
          <Select
            label={t("warehouse.globalFilterWarehouse")}
            options={warehouseOptions}
            value={draftWarehouseId}
            onChange={(e) => setDraftWarehouseId(e.target.value)}
            onBlur={() => {}}
            name="global-wh-mv-warehouse"
          />
          <Select
            label={t("products.filterType")}
            options={typeOptions}
            value={draftType}
            onChange={(e) => {
              const v = e.target.value;
              setDraftType(v);
              if (v === "IN") setDraftBranchId("");
            }}
            onBlur={() => {}}
            name="global-wh-mv-type"
          />
          <div className={cn(draftType === "IN" && "opacity-90")}>
            <Select
              label={t("warehouse.filterMovementBranch")}
              options={branchOptions}
              value={draftType === "IN" ? "" : draftBranchId}
              onChange={(e) => setDraftBranchId(e.target.value)}
              onBlur={() => {}}
              name="global-wh-mv-branch"
              disabled={draftType === "IN"}
            />
            {draftType === "IN" ? (
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{t("warehouse.movementsFilterBranchDisabledForIn")}</p>
            ) : null}
          </div>
          <DateField
            label={t("products.filterDateFrom")}
            value={draftDateFrom}
            onChange={(e) => setDraftDateFrom(e.target.value)}
          />
          <DateField
            label={t("products.filterDateTo")}
            value={draftDateTo}
            onChange={(e) => setDraftDateTo(e.target.value)}
          />
          <WarehouseProductScopeFilters value={draftScope} onChange={setDraftScope} menuZIndex={DRAWER_SELECT_Z} />
          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={closeFiltersDrawer}>
              {t("common.close")}
            </Button>
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={clearDraftFilters}>
              {t("warehouse.movementsFilterClear")}
            </Button>
            <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={applyDraftFiltersAndClose}>
              {t("warehouse.movementsFilterApplyClose")}
            </Button>
          </div>
        </div>
      </RightDrawer>

      {inOutTotalsByMainProduct.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-zinc-50/80 to-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/[0.03] sm:px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            {t("warehouse.globalInOutByMainProductTitle")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t("warehouse.globalInOutByMainProductHint")}
          </p>
          <div className="mt-3 grid max-h-[60vh] grid-cols-1 gap-1.5 overflow-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inOutTotalsByMainProduct.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 shadow-sm"
              >
                <p className="truncate text-xs font-semibold text-zinc-900" title={row.name}>
                  {row.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                    <span aria-hidden>↑</span>
                    {row.inQty > 0 ? "+" : ""}
                    {formatLocaleAmount(row.inQty, locale)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700">
                    <span aria-hidden>↓</span>
                    {row.outQty > 0 ? "−" : ""}
                    {formatLocaleAmount(row.outQty, locale)}
                  </span>
                  {row.unit ? (
                    <span className="text-[11px] font-medium text-zinc-500">{row.unit}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <p className="text-xs text-zinc-500">{t("products.pagingTotal")}</p>
          <p className="text-lg font-semibold text-zinc-900">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">{t("warehouse.globalInboundShipmentCount")}</p>
          <p className="text-lg font-semibold text-emerald-900">{totalInShipmentCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{t("warehouse.globalOutboundShipmentCount")}</p>
          <p className="text-lg font-semibold text-red-900">{totalOutShipmentCount}</p>
        </div>
      </div>

      {isError ? <p className="text-sm text-red-600">{toErrorMessage(error)}</p> : null}
      {isPending && data.length === 0 ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}

      {viewMode === "movements" && !isPending && !isError && items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("warehouse.globalMovementsEmpty")}</p>
      ) : null}

      {viewMode === "movements" && items.length > 0 ? (
        <ResponsiveTableFrame
          mobileVisibilityClassName="sm:flex md:hidden"
          desktopVisibilityClassName="hidden md:block"
          mobileClassName={cn("space-y-2", isFetching && "opacity-75")}
          desktopClassName={cn("rounded-lg border border-zinc-200 bg-white", isFetching && "opacity-75")}
          desktopInsetScroll
          desktopScrollClassName="overflow-x-auto"
          mobile={
            <>
              {items.map((m: WarehouseGlobalMovementRow) => {
                const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
                const isOut = m.type === "OUT";
                return (
                  <div key={`m-card-${m.warehouseId}-${m.id}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{t("products.mColDate")}</p>
                        <p
                          className={cn(
                            "mt-0.5 tabular-nums text-zinc-900",
                            isOut ? "text-lg font-bold tracking-tight sm:text-xl" : "text-sm font-semibold"
                          )}
                        >
                          {formatLocaleDate(m.movementDate, locale)}
                        </p>
                        {isOut ? (
                          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/90 px-2.5 py-2">
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-rose-800">
                              {t("warehouse.movementOutBranch")}
                            </p>
                            <p className="mt-0.5 text-base font-bold leading-snug text-rose-950 sm:text-lg">
                              {m.outDestinationBranchName?.trim() || "—"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", m.type === "IN" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900")}>
                        {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-left text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                      onClick={() => openMovementGroupDetailDialog(m)}
                    >
                      {m.productName}
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-zinc-500">{t("products.colWarehouse")}</p><p className="font-medium text-zinc-800">{m.warehouseName}</p></div>
                      <div>
                        <p className="text-zinc-500">{t("warehouse.movementOutBranch")}</p>
                        <p
                          className={cn(
                            "text-zinc-800",
                            isOut ? "text-xs font-normal text-zinc-500" : "font-medium"
                          )}
                        >
                          {m.outDestinationBranchName || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">{t("warehouse.movementBatchGroup")}</p>
                        <p className={shipmentIdLabelClassName}>{batchCell.text}</p>
                      </div>
                      <div><p className="text-zinc-500">{t("products.colQty")}</p><p className="font-semibold tabular-nums text-zinc-900">{m.quantity}</p></div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">{m.description || "—"}</p>
                    {m.type === "IN" && m.hasInvoicePhoto ? (
                      <a
                        href={warehouseMovementInvoicePhotoUrl(m.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(detailOpenIconButtonClass, "mt-2")}
                        aria-label={t("warehouse.openInvoicePhoto")}
                        title={t("warehouse.openInvoicePhoto")}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </>
          }
          desktop={
            <table className="w-full min-w-0 lg:min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColDate")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.colWarehouse")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.colName")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColType")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.movementBatchGroup")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.movementOutBranch")}</th>
                  <th className="px-3 py-2.5 text-right font-semibold">{t("products.colQty")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColNote")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.mColInvoice")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m: WarehouseGlobalMovementRow) => {
                  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
                  const isOut = m.type === "OUT";
                  const branchLabel = m.outDestinationBranchName?.trim() ?? "";
                  return (
                    <tr
                      key={`${m.warehouseId}-${m.id}`}
                      className={cn(
                        "border-b border-zinc-100 last:border-0",
                        isOut && "border-l-[3px] border-l-rose-400 bg-rose-50/40"
                      )}
                    >
                      <td
                        className={cn(
                          "px-3 py-2 tabular-nums",
                          isOut ? "text-base font-bold text-zinc-900" : "text-sm text-zinc-800"
                        )}
                      >
                        {formatLocaleDate(m.movementDate, locale)}
                      </td>
                      <td className="px-3 py-2">{m.warehouseName}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                          onClick={() => openMovementGroupDetailDialog(m)}
                        >
                          {m.productName}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                      </td>
                      <td className={cn("px-3 py-2", shipmentIdLabelClassName)}>{batchCell.text}</td>
                      <td
                        className={cn(
                          "px-3 py-2",
                          isOut && branchLabel.length > 0
                            ? "text-sm font-bold text-rose-950"
                            : "text-sm text-zinc-800"
                        )}
                      >
                        {branchLabel || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.quantity}</td>
                      <td className="max-w-[20rem] truncate px-3 py-2 text-zinc-600">{m.description || "—"}</td>
                      <td className="px-3 py-2">
                        {m.type === "IN" && m.hasInvoicePhoto ? (
                          <a
                            href={warehouseMovementInvoicePhotoUrl(m.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={detailOpenIconButtonClass}
                            aria-label={t("warehouse.openInvoicePhoto")}
                            title={t("warehouse.openInvoicePhoto")}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        />
      ) : null}

      {viewMode === "shipments" ? (
        shipmentGroups.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("warehouse.globalShipmentGroupsEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {shipmentGroups.slice(pageStart, pageStart + PAGE_SIZE).map((group) => {
              const row = group.representative;
              const batchCell = formatWarehouseShipmentDisplay(row.inBatchGroupId, row.id);
              const idBadge = batchCell.text.includes("-")
                ? `#${batchCell.text.split("-")[0]}`
                : batchCell.text;
              const hasPdfActions = row.type === "OUT";
              const hasSystemPdf = hasSystemPdfByShipmentGroupKey.get(group.key) === true;
              const outboundBranchSummary = shipmentOutboundBranchSummary(group.rows);
              const relatedShipment = resolveRelatedShipmentFromRows(
                group.rows,
                relatedShipmentById,
                relatedShipmentByNo
              );
              const shipmentRequestId =
                relatedShipment?.id ?? resolveShipmentRequestIdFromRows(group.rows);
              const hasDeliverySlip =
                shipmentRequestId != null && deliverySlipShipmentRequestIds.has(shipmentRequestId);
              const pdfStatusLoading = shipmentPdfDocsQ.isFetching && !shipmentPdfDocsQ.data;
              return (
                <details key={group.key} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-x-3 gap-y-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="inline-flex shrink-0 items-center rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[0.7rem] font-semibold tracking-tight text-zinc-600"
                          title={batchCell.text}
                        >
                          {idBadge}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-sm font-semibold text-zinc-900">
                          <ShipmentCalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                          {formatLocaleDate(row.movementDate, locale)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          row.type === "IN" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
                        )}
                      >
                        {row.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1.5">
                      <span className="inline-flex min-w-0 flex-col">
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-400">
                          {row.type === "OUT"
                            ? t("warehouse.movementSourceWarehouseLabel")
                            : t("warehouse.movementWarehouseLabel")}
                        </span>
                        <span className="truncate text-sm font-medium text-zinc-700">
                          {row.warehouseName}
                        </span>
                      </span>
                      {row.type === "OUT" ? (
                        <>
                          <span aria-hidden className="pb-0.5 text-base text-zinc-300">
                            →
                          </span>
                          <span className="inline-flex min-w-0 flex-col">
                            <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-rose-500">
                              {t("warehouse.movementOutBranch")}
                            </span>
                            <span className="truncate text-sm font-bold text-rose-900">
                              {outboundBranchSummary || "—"}
                            </span>
                          </span>
                        </>
                      ) : null}
                    </div>
                    {hasPdfActions ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ShipmentPdfChip
                          compact
                          label={t("warehouse.shipmentPdfSalesForm")}
                          exists={hasSystemPdf}
                          loading={pdfStatusLoading}
                        />
                        <ShipmentPdfChip
                          compact
                          label={t("warehouse.shipmentPdfDeliverySlip")}
                          exists={hasDeliverySlip}
                          loading={pdfStatusLoading}
                        />
                      </div>
                    ) : null}
                  </summary>
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-zinc-50 px-2.5 py-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        {t("warehouse.relatedShipmentRequestLabel")}
                      </span>
                      {relatedShipment ? (
                        <button
                          type="button"
                          className="text-left text-sm font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:decoration-violet-700"
                          onClick={() => router.push(`/shipments/${relatedShipment.id}`)}
                        >
                          {relatedShipment.shipmentNo} · {relatedShipment.status}
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-400">{t("warehouse.relatedShipmentRequestEmpty")}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Button
                        type="button"
                        className="h-10 min-h-10 gap-2 px-3.5 text-sm md:h-10 md:px-3.5 md:text-sm sm:flex-none"
                        onClick={() => setDetailSummaryGroup(group)}
                      >
                        <EyeIcon className="h-4 w-4 shrink-0" />
                        {t("warehouse.globalShipmentOpenDetail")}
                      </Button>
                      {hasPdfActions ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <ShipmentPdfChip
                            label={t("warehouse.shipmentPdfSalesForm")}
                            exists={hasSystemPdf}
                            loading={pdfStatusLoading}
                            actionHint={
                              hasSystemPdf
                                ? t("warehouse.shipmentPdfView")
                                : t("warehouse.shipmentPdfCreate")
                            }
                            onClick={
                              hasSystemPdf
                                ? () => openShipmentPdfDocuments(group)
                                : () => openOrderAccountStatement(group)
                            }
                          />
                          <ShipmentPdfChip
                            label={t("warehouse.shipmentPdfDeliverySlip")}
                            exists={hasDeliverySlip}
                            loading={pdfStatusLoading}
                            actionHint={
                              hasDeliverySlip ? t("warehouse.shipmentPdfView") : t("warehouse.shipmentPdfNotYet")
                            }
                            onClick={
                              hasDeliverySlip && shipmentRequestId != null
                                ? () => router.push(`/shipments/${shipmentRequestId}`)
                                : undefined
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                    <p className="pt-1 text-xs text-zinc-700">
                      {t("warehouse.globalShipmentSummary")
                        .replace("{qty}", String(group.totalQuantity))
                        .replace("{lines}", String(group.lineCount))}
                    </p>
                    <ShipmentGroupExpandedLineBlock group={group} />
                  </div>
                </details>
              );
            })}
          </div>
        )
      ) : null}

      {!isPending && (viewMode === "movements" ? totalCount : shipmentGroups.length) > 0 ? (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {pageStart + 1}
            {"–"}
            {Math.min(pageStart + PAGE_SIZE, viewMode === "movements" ? totalCount : shipmentGroups.length)} · {t("products.pagingTotal")}{" "}
            {viewMode === "movements" ? totalCount : shipmentGroups.length}
          </p>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 px-0"
              aria-label={t("products.pagingPrev")}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span aria-hidden className="text-lg leading-none">‹</span>
            </Button>
            <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-zinc-700">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 px-0"
              aria-label={t("products.pagingNext")}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <span aria-hidden className="text-lg leading-none">›</span>
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={detailSummaryGroup != null}
        onClose={() => setDetailSummaryGroup(null)}
        titleId="warehouse-global-movement-detail-title"
        title={t("warehouse.movementHeaderInfoTitle")}
        closeButtonLabel={t("common.close")}
        wide
        wideExpanded
        wideFixedHeight
        wideFullScreenMobile
      >
        {movementDetailModalContent}
      </Modal>
      <WarehouseMovementInvoicePreviewModal
        open={invoicePreviewTarget != null}
        movementId={invoicePreviewTarget?.movementId ?? null}
        title={invoicePreviewTarget?.title ?? t("warehouse.movementInvoicePreviewTitle")}
        subtitle={invoicePreviewTarget?.subtitle}
        t={t}
        onClose={() => setInvoicePreviewTarget(null)}
      />
    </div>
  );
}
