"use client";

import {
  useBranchStockReceiptsPaged,
  useBranchStockReceiptsSummary,
} from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";
import {
  useUploadWarehouseOutboundShipmentMovementInvoicePhoto,
  useClearWarehouseOutboundShipmentMovementInvoicePhoto,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, canSeeUiModule } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { useWarehouseDetailOverlayOptional } from "@/shared/warehouse-detail";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import {
  formatWarehouseShipmentDisplay,
  shipmentIdLabelClassName,
  warehouseMovementShipmentGroupKey,
} from "@/shared/lib/in-batch-group-label";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { Button } from "@/shared/ui/Button";
import { ToggleButton } from "@/shared/ui/ToggleButton";
import { TablePagination } from "@/shared/ui/TablePagination";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import type { BranchStockReceiptRow } from "@/types/branch";
import { Clock, Package, User, Warehouse } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const PAGE_SIZE = 20;

const EMPTY_SCOPE: WarehouseScopeFiltersValue = {
  mainCategoryId: null,
  subCategoryId: null,
  parentProductId: null,
  productId: null,
};

function sumReceiptQty(rows: BranchStockReceiptRow[]): number {
  return rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
}

type ReceiptMainProductGroup = {
  key: string;
  label: string;
  movements: BranchStockReceiptRow[];
  totalQty: number;
};

function groupReceiptMovementsByMainProduct(
  movements: BranchStockReceiptRow[],
  fallbackProductLabel: string
): ReceiptMainProductGroup[] {
  const map = new Map<string, BranchStockReceiptRow[]>();
  for (const m of movements) {
    const hasParent = m.parentProductId != null && m.parentProductId > 0;
    const key = hasParent ? `p:${m.parentProductId}` : `leaf:${m.productId}`;
    const g = map.get(key) ?? [];
    g.push(m);
    map.set(key, g);
  }
  for (const g of map.values()) {
    g.sort((a, b) => {
      const c = b.movementDate.localeCompare(a.movementDate);
      if (c !== 0) return c;
      return b.id - a.id;
    });
  }
  return Array.from(map.entries())
    .map(([key, rows]) => {
      const head = rows[0];
      const label =
        head.parentProductName?.trim() || head.productName || fallbackProductLabel;
      return { key, label, movements: rows, totalQty: sumReceiptQty(rows) };
    })
    .sort((a, b) => {
      const d = b.movements[0].movementDate.localeCompare(a.movements[0].movementDate);
      if (d !== 0) return d;
      return b.movements[0].id - a.movements[0].id;
    });
}

function kv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}

function receiptPreviewLines(rows: BranchStockReceiptRow[]): string {
  if (rows.length === 0) return "";
  if (rows.length === 1) {
    const m = rows[0];
    const u = m.unit?.trim() ? ` ${m.unit}` : "";
    return `${m.productName} · ${m.quantity}${u}`;
  }
  const head = rows.slice(0, 2).map((m) => m.productName);
  const more = rows.length - head.length;
  return more > 0 ? `${head.join(", ")} +${more}` : head.join(", ");
}

function BranchReceiptLineCard({
  row,
  fmtDate,
  t,
  hideShipmentGroup,
  showRecordMeta,
  fmtDateTime,
}: {
  row: BranchStockReceiptRow;
  fmtDate: (iso: string) => string;
  t: (key: string) => string;
  hideShipmentGroup?: boolean;
  showRecordMeta?: boolean;
  fmtDateTime?: (iso: string) => string;
}) {
  const batchCell = formatWarehouseShipmentDisplay(
    row.inBatchGroupId ?? null,
    row.warehouseMovementId ?? row.id
  );
  return (
    <MobileListCard as="div" className="touch-manipulation shadow-zinc-900/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{fmtDate(row.movementDate)}</p>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
          {t("products.typeIn")}
        </span>
      </div>
      <div className="mt-3">
        {row.parentProductName?.trim() ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            {row.parentProductName}
          </p>
        ) : null}
        <p className="min-w-0 break-words text-base font-semibold leading-snug text-zinc-900">
          {row.productName}
          {row.unit ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">({row.unit})</span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{row.quantity}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("products.colQty")}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-4 border-t border-zinc-100 pt-3">
        {!hideShipmentGroup
          ? kv(
              t("warehouse.movementBatchGroup"),
              <span className={shipmentIdLabelClassName}>{batchCell.text}</span>
            )
          : null}
        {kv(
          t("branch.stockColWarehouse"),
          row.warehouseName?.trim() ? (
            <span className="text-sm font-medium text-violet-900">{row.warehouseName.trim()}</span>
          ) : (
            "—"
          )
        )}
        {showRecordMeta
          ? kv(
              t("branch.stockColCreatedBy"),
              <span className="text-sm text-zinc-700">
                {row.createdByUserName?.trim() || t("branch.stockCreatedByUnknown")}
              </span>
            )
          : null}
        {showRecordMeta
          ? kv(
              t("branch.stockColCreatedAt"),
              <span className="text-sm text-zinc-700">
                {row.createdAt && fmtDateTime ? fmtDateTime(row.createdAt) : "—"}
              </span>
            )
          : null}
      </div>
    </MobileListCard>
  );
}

type StockListViewMode = "shipment" | "mainProduct";

type StockListBlock =
  | {
      mode: "shipment";
      key: string;
      movements: BranchStockReceiptRow[];
      batchCell: ReturnType<typeof formatWarehouseShipmentDisplay>;
      sample: BranchStockReceiptRow;
      preview: string;
    }
  | {
      mode: "mainProduct";
      key: string;
      movements: BranchStockReceiptRow[];
      label: string;
      sample: BranchStockReceiptRow;
      totalQty: number;
      preview: string;
    };

type Props = {
  branchId: number;
};

export function BranchStockInboundPanel({ branchId }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const warehouseDetailOverlay = useWarehouseDetailOverlayOptional();
  // Admin veya depo modülü yetkisi (ui.warehouse) olan kullanıcılar depo detayına/hareket
  // geçmişine gidebilir. canSeeUiModule system.admin + operations.staff jokerlerini de kapsar.
  const canOpenWarehouseDetail = canSeeUiModule(user, PERM.uiWarehouse);
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({ ...EMPTY_SCOPE });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [listViewMode, setListViewMode] = useState<StockListViewMode>("shipment");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [expandedBreakdownParents, setExpandedBreakdownParents] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  const [detailModal, setDetailModal] = useState<null | {
    movements: BranchStockReceiptRow[];
    title: string;
    description?: string;
    source: "shipment" | "mainProduct";
    shipmentIdText?: string;
  }>(null);
  const [detailModalViewMode, setDetailModalViewMode] = useState<"lines" | "mainProduct">("lines");
  const [stockFiltersDrawerOpen, setStockFiltersDrawerOpen] = useState(false);

  useEffect(() => {
    const today = localIsoDate();
    setScope({ ...EMPTY_SCOPE });
    setDateFrom(today);
    setDateTo(today);
    setPage(1);
    setListViewMode("shipment");
    setExpandedGroupKeys(new Set());
    setExpandedBreakdownParents(new Set());
    setDetailModal(null);
    setDetailModalViewMode("lines");
    setStockFiltersDrawerOpen(false);
  }, [branchId]);

  useEffect(() => {
    setPage(1);
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    setPage(1);
    setExpandedGroupKeys(new Set());
  }, [listViewMode]);

  const params = useMemo(() => {
    const categoryId = warehouseScopeEffectiveCategoryId(scope) ?? undefined;
    const leafProductId =
      scope.productId != null && scope.productId > 0 ? scope.productId : undefined;
    const parentProductId =
      leafProductId == null && scope.parentProductId != null && scope.parentProductId > 0
        ? scope.parentProductId
        : undefined;

    return {
      page,
      pageSize: PAGE_SIZE,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
      categoryId,
      parentProductId,
      productId: leafProductId,
      groupBy: listViewMode,
    };
  }, [
    page,
    listViewMode,
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    dateFrom,
    dateTo,
  ]);

  const { data, isPending, isError, error, refetch, isFetching } = useBranchStockReceiptsPaged(
    branchId,
    params,
    true
  );
  const {
    data: summaryData,
    isPending: summaryPending,
    isFetching: summaryFetching,
  } = useBranchStockReceiptsSummary(
    branchId,
    {
      dateFrom: undefined,
      dateTo: undefined,
      categoryId: params.categoryId,
      parentProductId: params.parentProductId,
      productId: params.productId,
    },
    true
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const filteredTotalQty = Number(summaryData?.filteredTotalQuantity ?? data?.filteredTotalQuantity ?? 0) || 0;
  const mainProductBreakdown = summaryData?.parentBreakdown ?? [];
  const mainProductBreakdownTotal = useMemo(
    () => mainProductBreakdown.reduce((sum, g) => sum + g.quantity, 0),
    [mainProductBreakdown]
  );

  const shipmentGroups = useMemo(() => {
    const map = new Map<string, BranchStockReceiptRow[]>();
    for (const m of items) {
      const k = warehouseMovementShipmentGroupKey(
        m.inBatchGroupId ?? null,
        m.warehouseMovementId ?? m.id
      );
      const g = map.get(k) ?? [];
      g.push(m);
      map.set(k, g);
    }
    for (const g of map.values()) {
      g.sort((a, b) => {
        const c = b.movementDate.localeCompare(a.movementDate);
        if (c !== 0) return c;
        return b.id - a.id;
      });
    }
    return Array.from(map.entries())
      .map(([key, movements]) => ({ key, movements }))
      .sort((a, b) => {
        const d = b.movements[0].movementDate.localeCompare(a.movements[0].movementDate);
        if (d !== 0) return d;
        return b.movements[0].id - a.movements[0].id;
      });
  }, [items]);

  const mainProductGroups = useMemo(
    () =>
      groupReceiptMovementsByMainProduct(items, t("branch.stockColProduct")).map(
        ({ key, movements, label }) => ({ key, movements, label })
      ),
    [items, t]
  );

  const detailModalMainProductGroups = useMemo(() => {
    if (!detailModal) return [];
    return groupReceiptMovementsByMainProduct(
      detailModal.movements,
      t("branch.stockColProduct")
    );
  }, [detailModal, t]);

  const detailModalWarehouseId = useMemo(() => {
    if (!detailModal) return null;
    for (const m of detailModal.movements) {
      const id = m.warehouseId;
      if (id != null && id > 0) return id;
    }
    return null;
  }, [detailModal]);

  const detailModalWarehouseMovementId = useMemo(() => {
    if (!detailModal) return null;
    for (const m of detailModal.movements) {
      const id = m.warehouseMovementId;
      if (id != null && id > 0) return id;
    }
    return null;
  }, [detailModal]);

  const uploadShipmentPhotoMut = useUploadWarehouseOutboundShipmentMovementInvoicePhoto();
  const clearShipmentPhotoMut = useClearWarehouseOutboundShipmentMovementInvoicePhoto();

  /** Sevkiyat (batch) görseli: depo + bağlayıcı hareket id'si + görsel var mı. Yalnızca sevkiyat gruplaması için. */
  const detailShipmentPhoto = useMemo(() => {
    if (!detailModal || detailModal.source !== "shipment") return null;
    let warehouseId: number | null = null;
    let anchorMovementId: number | null = null;
    let hasPhoto = false;
    for (const m of detailModal.movements) {
      if (warehouseId == null && m.warehouseId != null && m.warehouseId > 0) warehouseId = m.warehouseId;
      if (anchorMovementId == null && m.photoMovementId != null && m.photoMovementId > 0)
        anchorMovementId = m.photoMovementId;
      if (m.hasInvoicePhoto) hasPhoto = true;
    }
    if (anchorMovementId == null) {
      const fm = detailModal.movements.find((m) => m.warehouseMovementId != null && m.warehouseMovementId > 0);
      anchorMovementId = fm?.warehouseMovementId ?? null;
    }
    if (warehouseId == null || anchorMovementId == null) return null;
    return { warehouseId, anchorMovementId, hasPhoto };
  }, [detailModal]);

  const shipmentPhotoBusy = uploadShipmentPhotoMut.isPending || clearShipmentPhotoMut.isPending;

  const onUploadShipmentPhoto = useCallback(
    async (file: File) => {
      const info = detailShipmentPhoto;
      if (!info) return;
      const v = await validateImageFileForUpload(file);
      if (!v.ok) {
        notify.error(
          v.reason === "size" ? t("common.imageUploadTooLarge") : t("common.imageUploadNotImage")
        );
        return;
      }
      try {
        await uploadShipmentPhotoMut.mutateAsync({
          warehouseId: info.warehouseId,
          movementId: info.anchorMovementId,
          file,
        });
        notify.success(t("branch.stockShipmentPhotoSaved"));
        setDetailModal(null);
      } catch (e) {
        notify.error(toErrorMessage(e));
      }
    },
    [detailShipmentPhoto, uploadShipmentPhotoMut, t]
  );

  const onClearShipmentPhoto = useCallback(async () => {
    const info = detailShipmentPhoto;
    if (!info) return;
    try {
      await clearShipmentPhotoMut.mutateAsync({
        warehouseId: info.warehouseId,
        movementId: info.anchorMovementId,
      });
      notify.success(t("branch.stockShipmentPhotoRemoved"));
      setDetailModal(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [detailShipmentPhoto, clearShipmentPhotoMut, t]);

  const openWarehouseDetailFromModal = useCallback(() => {
    const warehouseId = detailModalWarehouseId;
    if (!warehouseId || !warehouseDetailOverlay) return;
    warehouseDetailOverlay.openWarehouseDetail(warehouseId, {
      initialTab: "history",
      openMovementId: detailModalWarehouseMovementId,
      nested: true,
    });
  }, [detailModalWarehouseId, detailModalWarehouseMovementId, warehouseDetailOverlay]);

  /** Tek bir gelen-mal satırını kaynak depodaki hareket geçmişi detayında açar. */
  const openWarehouseDetailForMovement = useCallback(
    (warehouseId: number, movementId: number | null) => {
      if (!warehouseDetailOverlay || !warehouseId || warehouseId <= 0) return;
      warehouseDetailOverlay.openWarehouseDetail(warehouseId, {
        initialTab: "history",
        openMovementId: movementId != null && movementId > 0 ? movementId : null,
        nested: true,
      });
    },
    [warehouseDetailOverlay]
  );

  /** İzinli kullanıcı için satır sonunda "kaynak depoyu aç" ikon butonu (yoksa null). */
  const renderOpenWarehouseDetailButton = useCallback(
    (row: BranchStockReceiptRow) => {
      if (!canOpenWarehouseDetail || !warehouseDetailOverlay) return null;
      const warehouseId = row.warehouseId;
      if (warehouseId == null || warehouseId <= 0) return null;
      return (
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
          aria-label={t("branch.stockShipmentModalOpenWarehouse")}
          title={t("branch.stockShipmentModalOpenWarehouse")}
          onClick={() => openWarehouseDetailForMovement(warehouseId, row.warehouseMovementId ?? null)}
        >
          <Warehouse className="h-4 w-4" aria-hidden />
        </button>
      );
    },
    [canOpenWarehouseDetail, warehouseDetailOverlay, openWarehouseDetailForMovement, t]
  );

  const listBlocks = useMemo((): StockListBlock[] => {
    if (listViewMode === "shipment") {
      return shipmentGroups.map(({ key, movements }) => {
        const sample = movements[0];
        const batchCell = formatWarehouseShipmentDisplay(
          sample.inBatchGroupId ?? null,
          sample.warehouseMovementId ?? sample.id
        );
        return {
          mode: "shipment",
          key,
          movements,
          batchCell,
          sample,
          preview: receiptPreviewLines(movements),
        };
      });
    }
    return mainProductGroups.map(({ key, movements, label }) => {
      const sample = movements[0];
      return {
        mode: "mainProduct",
        key,
        movements,
        label,
        sample,
        totalQty: sumReceiptQty(movements),
        preview: receiptPreviewLines(movements),
      };
    });
  }, [listViewMode, shipmentGroups, mainProductGroups]);

  const fmtDate = (iso: string) => formatLocaleDate(iso, locale);
  const fmtDateTime = (iso: string) => formatLocaleDateTime(iso, locale);
  // "Kim girdi / ne zaman oluşturuldu": bu panel zaten yalnızca merkez/yönetici (staffMode)
  // görünümünde açıldığından ayrı bir izin gate'i gerekmez.
  const canSeeRecordMeta = true;

  /** Sevkiyat grubu başlığında giren kullanıcı + oluşturulma zamanı (admin). */
  const renderGroupRecordMeta = (sample: BranchStockReceiptRow) => {
    if (!canSeeRecordMeta) return null;
    const who = sample.createdByUserName?.trim() || t("branch.stockCreatedByUnknown");
    const when = sample.createdAt ? fmtDateTime(sample.createdAt) : "—";
    return (
      <span className="flex basis-full flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
        <span className="inline-flex min-w-0 items-center gap-1" title={`${t("branch.stockColCreatedBy")}: ${who}`}>
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
          <span className="truncate font-medium text-zinc-700">{who}</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap" title={`${t("branch.stockColCreatedAt")}: ${when}`}>
          <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
          <span className="font-medium text-zinc-700">{when}</span>
        </span>
      </span>
    );
  };

  /** Kalem (satır) altında giren kullanıcı + oluşturulma zamanı (admin). */
  const renderLineRecordMeta = (row: BranchStockReceiptRow) => {
    if (!canSeeRecordMeta) return null;
    const who = row.createdByUserName?.trim() || t("branch.stockCreatedByUnknown");
    const when = row.createdAt ? fmtDateTime(row.createdAt) : "—";
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.65rem] font-normal leading-snug text-zinc-400">
        <span className="inline-flex min-w-0 items-center gap-1">
          <User className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{who}</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          {when}
        </span>
      </span>
    );
  };

  const today = localIsoDate();
  const filtersActive = useMemo(() => {
    return Boolean(
      warehouseScopeEffectiveCategoryId(scope) != null ||
        scope.parentProductId != null ||
        scope.productId != null ||
        dateFrom !== today ||
        dateTo !== today ||
        (dateFrom === "" && dateTo === "")
    );
  }, [scope, dateFrom, dateTo, today]);

  const stockDrawerFilterCount = useMemo(() => {
    const scopeNarrowed = Boolean(
      warehouseScopeEffectiveCategoryId(scope) != null ||
        (scope.parentProductId != null && scope.parentProductId > 0) ||
        (scope.productId != null && scope.productId > 0)
    );
    const datesNonDefault =
      dateFrom !== today || dateTo !== today || (dateFrom === "" && dateTo === "");
    return (scopeNarrowed ? 1 : 0) + (datesNonDefault ? 1 : 0);
  }, [scope, dateFrom, dateTo, today]);

  const stockFiltersSummaryLine = useMemo(() => {
    const dateLine =
      dateFrom.length === 10 || dateTo.length === 10
        ? `${dateFrom.length === 10 ? formatLocaleDate(dateFrom, locale) : "—"} — ${
            dateTo.length === 10 ? formatLocaleDate(dateTo, locale) : "—"
          }`
        : t("branch.filterAllDates");
    const scopeShort =
      warehouseScopeEffectiveCategoryId(scope) != null ||
      (scope.parentProductId != null && scope.parentProductId > 0) ||
      (scope.productId != null && scope.productId > 0)
        ? t("branch.stockFiltersScopeActiveShort")
        : t("branch.stockFiltersScopeAnyShort");
    return `${dateLine} · ${scopeShort}`;
  }, [scope, dateFrom, dateTo, locale, t]);

  const clearAllFilters = () => {
    setDateFrom("");
    setDateTo("");
    setScope({ ...EMPTY_SCOPE });
    setPage(1);
    void refetch();
  };

  const renderExpandedRowsMobile = (block: StockListBlock) => (
    <ul className="divide-y divide-zinc-100 border-t border-zinc-100 bg-zinc-50/40">
      {block.movements.map((row) => (
        <li key={row.id} className="px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {row.parentProductName?.trim() ? (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                  {row.parentProductName}
                </p>
              ) : null}
              <p className="truncate text-sm font-medium text-zinc-900">
                {row.productName}
                {row.unit ? (
                  <span className="ml-1 text-xs font-normal text-zinc-500">({row.unit})</span>
                ) : null}
              </p>
            </div>
            <span className="shrink-0 text-right">
              <span className="text-base font-bold tabular-nums text-zinc-900">{row.quantity}</span>
              {row.unit ? (
                <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {row.unit}
                </span>
              ) : null}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500">
            <span className="whitespace-nowrap">{fmtDate(row.movementDate)}</span>
            {row.warehouseName?.trim() ? (
              <>
                <span aria-hidden className="text-zinc-300">·</span>
                <span className="truncate font-medium text-violet-900">{row.warehouseName.trim()}</span>
              </>
            ) : null}
            {canSeeRecordMeta && row.createdByUserName?.trim() ? (
              <>
                <span aria-hidden className="text-zinc-300">·</span>
                <span className="truncate">{row.createdByUserName.trim()}</span>
              </>
            ) : null}
            {canSeeRecordMeta && row.createdAt ? (
              <>
                <span aria-hidden className="text-zinc-300">·</span>
                <span className="whitespace-nowrap text-zinc-400">{fmtDateTime(row.createdAt)}</span>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );

  const renderExpandedTableDesktop = (block: StockListBlock, safeKey: string) => {
    const movements = block.movements;
    const headerId = `br-grp-h-${safeKey}`;
    const regionId = `br-grp-${safeKey}`;
    return (
      <div
        className="border-t border-zinc-100 bg-zinc-50/60 px-3 py-3"
        id={regionId}
        role="region"
        aria-labelledby={headerId}
      >
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">{t("branch.stockColDate")}</th>
                <th className="px-3 py-2">{t("branch.stockColProduct")}</th>
                <th className="px-3 py-2 text-right">{t("branch.stockColQty")}</th>
                <th className="hidden px-3 py-2 md:table-cell">{t("branch.stockColWarehouse")}</th>
                {block.mode === "mainProduct" ? (
                  <th className="hidden px-3 py-2 lg:table-cell">{t("warehouse.movementBatchGroup")}</th>
                ) : null}
              </tr>
            </thead>
            {block.mode === "shipment" ? (
              <tbody className="divide-y divide-zinc-100">
                {groupReceiptMovementsByMainProduct(movements, t("branch.stockColProduct")).map(
                  (group) => {
                    const onlyChild =
                      group.movements.length === 1 &&
                      group.movements[0]?.productName?.trim() === group.label.trim();
                    const groupUnit =
                      group.movements.find((x) => x.unit?.trim())?.unit?.trim() || null;
                    return (
                      <Fragment key={group.key}>
                        <tr className="bg-violet-50/90">
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                            {fmtDate(group.movements[0].movementDate)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 text-sm font-semibold text-violet-950">{group.label}</span>
                              {onlyChild ? renderOpenWarehouseDetailButton(group.movements[0]) : null}
                            </div>
                            {onlyChild ? null : (
                              <span className="mt-0.5 block text-[0.65rem] font-medium text-zinc-500">
                                {t("branch.stockShipmentModalGroupLineCount").replace(
                                  "{{count}}",
                                  String(group.movements.length)
                                )}
                              </span>
                            )}
                            {onlyChild ? renderLineRecordMeta(group.movements[0]) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-emerald-700">
                            {formatLocaleAmount(group.totalQty, locale)}
                            {groupUnit ? ` ${groupUnit}` : ""}
                          </td>
                          <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                            {group.movements[0].warehouseName?.trim() ?? "—"}
                          </td>
                        </tr>
                        {onlyChild
                          ? null
                          : group.movements.map((row) => (
                              <tr key={row.id} className="bg-white">
                                <td className="whitespace-nowrap px-3 py-1.5 pl-5 text-zinc-500">
                                  {fmtDate(row.movementDate)}
                                </td>
                                <td className="px-3 py-1.5 pl-5 font-medium text-zinc-800">
                                  <div className="flex items-center gap-2">
                                    <span className="min-w-0">
                                      {row.productName}
                                      {row.unit ? (
                                        <span className="font-normal text-zinc-500"> ({row.unit})</span>
                                      ) : null}
                                    </span>
                                    {renderOpenWarehouseDetailButton(row)}
                                  </div>
                                  {renderLineRecordMeta(row)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                                  {formatLocaleAmount(row.quantity, locale)}
                                </td>
                                <td className="hidden px-3 py-1.5 text-zinc-500 md:table-cell">
                                  {row.warehouseName?.trim() ?? "—"}
                                </td>
                              </tr>
                            ))}
                      </Fragment>
                    );
                  }
                )}
              </tbody>
            ) : (
              <tbody className="divide-y divide-zinc-100">
                {movements.map((row) => {
                  const batchCell = formatWarehouseShipmentDisplay(
                    row.inBatchGroupId ?? null,
                    row.warehouseMovementId ?? row.id
                  );
                  return (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-700">{fmtDate(row.movementDate)}</td>
                      <td className="px-3 py-2 font-medium text-zinc-900">
                        {row.parentProductName?.trim() ? (
                          <span className="mb-0.5 block text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
                            {row.parentProductName}
                          </span>
                        ) : null}
                        {row.productName}
                        {row.unit ? (
                          <span className="font-normal text-zinc-500"> ({row.unit})</span>
                        ) : null}
                        {renderLineRecordMeta(row)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                      <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                        {row.warehouseName?.trim() ?? "—"}
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <span className={shipmentIdLabelClassName}>{batchCell.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>
    );
  };

  const openDetailModal = (block: StockListBlock) => {
    setDetailModalViewMode("lines");
    if (block.mode === "shipment") {
      const batchCell = block.batchCell;
      setDetailModal({
        movements: block.movements,
        title: t("branch.stockShipmentModalTitle"),
        shipmentIdText: batchCell.text,
        source: "shipment",
      });
      return;
    }
    setDetailModal({
      movements: block.movements,
      title: t("branch.stockDetailModalTitleMainProduct"),
      description: t("branch.stockDetailModalHintMainProduct").replace("{{name}}", block.label),
      source: "mainProduct",
    });
  };

  const toggleExpanded = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleBreakdownParent = (productId: number) => {
    setExpandedBreakdownParents((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {(() => {
        const todayIso = localIsoDate();
        const isToday = dateFrom === todayIso && dateTo === todayIso;
        const isAllDates = dateFrom === "" && dateTo === "";
        return (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9 12 4l9 5v10H3z" />
                      <path d="M9 13h6M9 17h6" />
                    </svg>
                  </span>
                  <span className="truncate text-sm font-semibold text-zinc-900">
                    {t("branch.stockInboundSectionTitle")}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 text-zinc-400 transition group-open:rotate-180"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-600 sm:px-4">
                {t("branch.stockHint")}
              </p>
            </details>

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 p-2.5 sm:p-3">
              <div
                className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5"
                role="tablist"
                aria-label={t("branch.stockListViewModeAria")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={listViewMode === "shipment"}
                  className={cn(
                    "min-h-9 flex-1 rounded-md px-3 text-xs font-semibold touch-manipulation transition sm:flex-none",
                    listViewMode === "shipment"
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-white"
                  )}
                  onClick={() => setListViewMode("shipment")}
                >
                  {t("branch.stockListViewShipment")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={listViewMode === "mainProduct"}
                  className={cn(
                    "min-h-9 flex-1 rounded-md px-3 text-xs font-semibold touch-manipulation transition sm:flex-none",
                    listViewMode === "mainProduct"
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-white"
                  )}
                  onClick={() => setListViewMode("mainProduct")}
                >
                  {t("branch.stockListViewMainProduct")}
                </button>
              </div>

              <ToggleButton
                active={isToday}
                className="!min-h-9 px-3 text-xs"
                onClick={() => {
                  setDateFrom(todayIso);
                  setDateTo(todayIso);
                  setPage(1);
                }}
              >
                {t("branch.filterToday")}
              </ToggleButton>
              <ToggleButton
                active={isAllDates}
                tone="zinc"
                className="!min-h-9 px-3 text-xs"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                {t("branch.filterAllDates")}
              </ToggleButton>

              <Button
                type="button"
                variant="secondary"
                className="relative min-h-9 !w-auto shrink-0 touch-manipulation px-3 text-xs sm:ml-auto"
                aria-label={`${t("branch.stockFiltersDrawerOpenButton")} (${stockDrawerFilterCount})`}
                onClick={() => setStockFiltersDrawerOpen(true)}
              >
                {`${t("branch.stockFiltersDrawerOpenButton")} · ${stockDrawerFilterCount}`}
                {filtersActive ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                    aria-hidden
                  />
                ) : null}
              </Button>
            </div>

            {filtersActive ? (
              <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] leading-snug text-zinc-500 sm:px-4">
                {stockFiltersSummaryLine}
              </p>
            ) : null}
          </div>
        );
      })()}

      <RightDrawer
        open={stockFiltersDrawerOpen}
        onClose={() => setStockFiltersDrawerOpen(false)}
        title={t("branch.stockFiltersDrawerTitle")}
        closeLabel={t("common.close")}
        showFooterCloseButton={false}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
      >
        <div className="space-y-5">
          <p className="text-xs leading-relaxed text-zinc-600">{t("branch.stockFiltersDrawerHint")}</p>
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-800">{t("branch.stockScopeFiltersLead")}</p>
            <WarehouseProductScopeFilters value={scope} onChange={setScope} menuZIndex={340} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-800">{t("branch.stockDateFiltersLead")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField
                label={t("branch.filterDateFrom")}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-0"
              />
              <DateField
                label={t("branch.filterDateTo")}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-w-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation"
              onClick={() => {
                clearAllFilters();
                setStockFiltersDrawerOpen(false);
              }}
            >
              {t("branch.stockFiltersResetInDrawer")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation"
              onClick={() => {
                void refetch();
                setStockFiltersDrawerOpen(false);
              }}
            >
              {t("branch.stockFiltersApplyClose")}
            </Button>
          </div>
        </div>
      </RightDrawer>

      {dateFrom.length === 10 && dateFrom === dateTo ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-950">
          {t("branch.stockSingleDayBanner").replace("{date}", dateFrom)}
        </p>
      ) : null}

      {isError && <p className="text-sm text-red-600">{toErrorMessage(error)}</p>}

      {isPending && !data ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !isError && data ? (
        <>
          <div
            className={cn(
              "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4",
              isFetching && "opacity-70"
            )}
          >
            <p className="text-xs font-semibold text-zinc-800 sm:text-sm">
              {t("branch.stockReceiptsTotalsTitle")}
            </p>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                  {t("branch.stockReceiptsFilteredTotalQty")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-emerald-950 sm:text-xl">
                  {formatLocaleAmount(filteredTotalQty, locale)}
                </p>
              </div>
              {summaryPending && !summaryData ? (
                <p className="text-xs text-zinc-500 lg:col-span-2">{t("common.loading")}</p>
              ) : null}
              {mainProductBreakdown.length > 0 ? (
                <div className="min-w-0 rounded-lg border border-violet-200/80 bg-violet-50/60 px-3 py-2.5 lg:col-span-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-900">
                    {t("branch.stockReceiptsParentBreakdownTitle")}
                  </p>
                  <ul className="mt-1.5 space-y-1.5 text-xs sm:text-sm">
                    {mainProductBreakdown.map((g) => {
                      const hasChildren = g.children.length > 0;
                      const open = expandedBreakdownParents.has(g.productId);
                      return (
                        <li key={`parent-${g.productId}`}>
                          {hasChildren ? (
                            <button
                              type="button"
                              className="flex w-full items-baseline justify-between gap-3 rounded-md py-0.5 text-left transition-colors hover:bg-violet-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                              aria-expanded={open}
                              aria-label={t(
                                "branch.stockReceiptsParentBreakdownChildrenToggle"
                              ).replace("{{name}}", g.productName)}
                              onClick={() => toggleBreakdownParent(g.productId)}
                            >
                              <span className="flex min-w-0 items-baseline gap-1.5">
                                <span
                                  className={cn(
                                    "shrink-0 self-center text-violet-400 transition-transform duration-200",
                                    open && "rotate-180"
                                  )}
                                  aria-hidden
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                      fillRule="evenodd"
                                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </span>
                                <span className="min-w-0 truncate text-zinc-800">
                                  {g.productName}
                                  {g.unit ? <span className="text-zinc-400"> ({g.unit})</span> : null}
                                </span>
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-violet-950">
                                {formatLocaleAmount(g.quantity, locale)}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-baseline justify-between gap-3 py-0.5 pl-[1.25rem]">
                              <span className="min-w-0 truncate text-zinc-800">
                                {g.productName}
                                {g.unit ? <span className="text-zinc-400"> ({g.unit})</span> : null}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-violet-950">
                                {formatLocaleAmount(g.quantity, locale)}
                              </span>
                            </div>
                          )}
                          {hasChildren && open ? (
                            <ul className="mb-1 ml-[0.4rem] mt-1 space-y-1 border-l border-violet-200 pl-3">
                              {g.children.map((c) => (
                                <li
                                  key={`child-${g.productId}-${c.productId}`}
                                  className="flex items-baseline justify-between gap-3"
                                >
                                  <span className="min-w-0 truncate text-zinc-600">
                                    {c.productName}
                                    {c.unit ? <span className="text-zinc-400"> ({c.unit})</span> : null}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-violet-900/80">
                                    {formatLocaleAmount(c.quantity, locale)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[0.65rem] leading-snug text-violet-900/80 sm:text-xs">
                    {t("branch.stockReceiptsParentBreakdownHint").replace(
                      "{{qty}}",
                      formatLocaleAmount(mainProductBreakdownTotal, locale)
                    )}
                  </p>
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
              {t("branch.stockReceiptsTotalsHint")}
            </p>
            {summaryFetching ? (
              <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">{t("common.loading")}</p>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div
              role="status"
              className="rounded-2xl border border-dashed border-zinc-300/90 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 px-4 py-10 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] sm:py-12"
            >
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                  aria-hidden
                >
                  <Package className="h-7 w-7 stroke-[1.5]" />
                </span>
                <p className="text-base font-semibold leading-snug text-zinc-900">{t("branch.stockEmptyTitle")}</p>
                <p className="text-sm leading-relaxed text-zinc-600">{t("branch.stockEmptyHint")}</p>
                {filtersActive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-1 min-h-11 w-full max-w-xs touch-manipulation"
                    onClick={clearAllFilters}
                  >
                    {t("branch.stockEmptyClearFilters")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 sm:text-sm">
                {listViewMode === "shipment"
                  ? t("branch.stockReceiptsPageShipmentSummary")
                      .replace("{{shipments}}", String(listBlocks.length))
                      .replace("{{lines}}", String(items.length))
                  : t("branch.stockReceiptsPageMainProductSummary")
                      .replace("{{groups}}", String(listBlocks.length))
                      .replace("{{lines}}", String(items.length))}
              </p>
              <p className="text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                {t("branch.stockReceiptsParentBreakdownPageOnly")}
              </p>

              <div className="flex min-h-0 min-w-0 flex-col gap-2 sm:hidden">
                {listBlocks.map((block) => {
                  const open = expandedGroupKeys.has(block.key);
                  return (
                    <div
                      key={block.key}
                      className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.03]"
                    >
                      <button
                        type="button"
                        className="flex w-full min-w-0 touch-manipulation flex-col gap-1.5 px-3 py-2.5 text-left transition hover:bg-zinc-50/70"
                        aria-expanded={open}
                        aria-label={
                          block.mode === "shipment"
                            ? t("warehouse.shipmentGroupToggleAria")
                            : t("branch.stockListViewMainProduct")
                        }
                        onClick={() => toggleExpanded(block.key)}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition-transform duration-200",
                              open && "rotate-180"
                            )}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          {block.mode === "shipment" ? (
                            <span className={cn("min-w-0 flex-1 truncate", shipmentIdLabelClassName)} title={block.batchCell.text}>
                              {block.batchCell.text}
                            </span>
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-violet-950">
                              {block.label}
                            </span>
                          )}
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-emerald-900 ring-1 ring-emerald-200/80">
                            {t("products.typeIn")}
                          </span>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 pl-8 text-[11px] text-zinc-500">
                          <span className="shrink-0 whitespace-nowrap">
                            {fmtDate(block.sample.movementDate)}
                          </span>
                          <span aria-hidden className="text-zinc-300">·</span>
                          <span className="shrink-0 tabular-nums">
                            {block.movements.length}×
                          </span>
                          {block.mode === "mainProduct" ? (
                            <>
                              <span aria-hidden className="text-zinc-300">·</span>
                              <span className="shrink-0 tabular-nums font-semibold text-zinc-700">
                                Σ {formatLocaleAmount(block.totalQty, locale)}
                              </span>
                            </>
                          ) : null}
                          <span className="min-w-0 flex-1 basis-full truncate text-zinc-600">
                            {block.preview}
                          </span>
                          {block.mode === "shipment" ? renderGroupRecordMeta(block.sample) : null}
                        </div>
                      </button>
                      <div className="flex border-t border-zinc-100 bg-zinc-50/40">
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-white"
                          onClick={() => openDetailModal(block)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {t("branch.stockShipmentQuickOpen")}
                        </button>
                      </div>
                      {open ? renderExpandedRowsMobile(block) : null}
                    </div>
                  );
                })}
              </div>

              <div className="hidden min-h-0 min-w-0 flex-1 flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:flex">
                {listBlocks.map((block) => {
                  const open = expandedGroupKeys.has(block.key);
                  const safeKey = block.key.replace(/[^a-zA-Z0-9_-]/g, "_");
                  const headerId = `br-grp-h-${safeKey}`;
                  return (
                    <div key={block.key} className="min-w-0 bg-white first:rounded-t-xl last:rounded-b-xl">
                      <div className="flex w-full items-stretch gap-1.5 px-1.5 py-1">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-zinc-50 sm:gap-x-3 sm:py-1.5"
                          aria-expanded={open}
                          aria-label={
                            block.mode === "shipment"
                              ? t("warehouse.shipmentGroupToggleAria")
                              : t("branch.stockListViewMainProduct")
                          }
                          aria-controls={`br-grp-${safeKey}`}
                          id={headerId}
                          onClick={() => toggleExpanded(block.key)}
                        >
                          <span
                            className={cn(
                              "shrink-0 text-zinc-400 transition-transform duration-200",
                              open && "rotate-180"
                            )}
                            aria-hidden
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          {block.mode === "shipment" ? (
                            <span className={cn("min-w-0 max-w-full basis-full sm:basis-auto sm:max-w-[min(100%,24rem)]", shipmentIdLabelClassName)}>
                              {block.batchCell.text}
                            </span>
                          ) : (
                            <span className="min-w-0 max-w-[18rem] truncate text-sm font-semibold text-violet-950">
                              {block.label}
                            </span>
                          )}
                          <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 sm:text-sm">
                            {fmtDate(block.sample.movementDate)}
                          </span>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-emerald-900 ring-1 ring-emerald-200/80 sm:text-xs">
                            {t("products.typeIn")}
                          </span>
                          <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                            {block.movements.length}×
                          </span>
                          {block.mode === "mainProduct" ? (
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-800">
                              Σ {formatLocaleAmount(block.totalQty, locale)}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 basis-[min(100%,12rem)] truncate text-xs text-zinc-600 sm:text-sm">
                            {block.preview}
                          </span>
                          {block.mode === "shipment" ? renderGroupRecordMeta(block.sample) : null}
                        </button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 shrink-0 self-center px-2.5 text-xs"
                          onClick={() => openDetailModal(block)}
                        >
                          {t("branch.stockShipmentQuickOpen")}
                        </Button>
                      </div>
                      {open ? renderExpandedTableDesktop(block, safeKey) : null}
                    </div>
                  );
                })}
              </div>

              {totalCount > 0 ? (
                <TablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalCount={totalCount}
                  onPageChange={setPage}
                />
              ) : null}
            </>
          )}

          <Modal
            open={detailModal != null}
            onClose={() => {
              setDetailModal(null);
              setDetailModalViewMode("lines");
            }}
            titleId="branch-stock-detail-modal-title"
            title={detailModal?.title ?? ""}
            description={detailModal?.source === "mainProduct" ? detailModal?.description : undefined}
            closeButtonLabel={t("common.close")}
          >
            {detailModal ? (
              <div className="mt-4 max-h-[min(75dvh,38rem)] overflow-y-auto">
                {detailModal.source === "shipment" && detailModal.shipmentIdText ? (
                  <p className="-mt-1 mb-3 text-xs text-zinc-600 sm:mb-4">
                    <span className="font-semibold text-zinc-700">{t("branch.stockShipmentModalHintLead")}</span>
                    <span className={cn("mt-1 block", shipmentIdLabelClassName)}>
                      {detailModal.shipmentIdText}
                    </span>
                  </p>
                ) : null}
                {canOpenWarehouseDetail && detailModalWarehouseId && warehouseDetailOverlay ? (
                  <div className="mb-3 flex justify-stretch sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 text-xs sm:w-auto"
                      onClick={openWarehouseDetailFromModal}
                    >
                      <Warehouse className="h-4 w-4 shrink-0" aria-hidden />
                      {t("branch.stockShipmentModalOpenWarehouse")}
                    </Button>
                  </div>
                ) : null}
                {canOpenWarehouseDetail && detailShipmentPhoto ? (
                  <div className="mb-3 rounded-lg border border-violet-200/80 bg-violet-50/50 p-3">
                    <p className="text-xs font-semibold text-violet-900">
                      {t("branch.stockShipmentPhotoHeading")}
                    </p>
                    {detailShipmentPhoto.hasPhoto && detailShipmentPhoto.anchorMovementId > 0 ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <a
                          href={warehouseMovementInvoicePhotoUrl(detailShipmentPhoto.anchorMovementId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full overflow-hidden rounded-lg border border-zinc-200 bg-white sm:w-48"
                        >
                          <img
                            src={warehouseMovementInvoicePhotoUrl(detailShipmentPhoto.anchorMovementId)}
                            alt=""
                            className="aspect-[3/4] w-full object-contain"
                            loading="lazy"
                          />
                        </a>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <a
                            href={warehouseMovementInvoicePhotoUrl(detailShipmentPhoto.anchorMovementId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-violet-900 underline decoration-violet-300 underline-offset-2 hover:decoration-violet-600"
                          >
                            {t("warehouse.openInvoicePhoto")}
                          </a>
                          <button
                            type="button"
                            className="font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:decoration-red-600 disabled:opacity-50"
                            disabled={shipmentPhotoBusy}
                            onClick={() => void onClearShipmentPhoto()}
                          >
                            {t("branch.stockShipmentPhotoRemove")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-600">{t("branch.stockShipmentPhotoNone")}</p>
                    )}
                    <label
                      htmlFor="branch-shipment-photo"
                      className="mt-2 block text-[0.65rem] font-medium text-zinc-600"
                    >
                      {detailShipmentPhoto.hasPhoto
                        ? t("branch.stockShipmentPhotoReplaceHint")
                        : t("branch.stockShipmentPhotoAddHint")}
                    </label>
                    <input
                      id="branch-shipment-photo"
                      name="branch-shipment-photo"
                      type="file"
                      accept={IMAGE_FILE_INPUT_ACCEPT}
                      className="mt-1 block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:opacity-50"
                      disabled={shipmentPhotoBusy}
                      onChange={(e) => {
                        const input = e.target;
                        const f = input.files?.[0] ?? null;
                        input.value = "";
                        if (f) void onUploadShipmentPhoto(f);
                      }}
                    />
                  </div>
                ) : null}
                {detailModal.source === "shipment" ? (
                  <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
                    <p className="text-xs font-semibold text-zinc-700">
                      {t("branch.stockShipmentModalViewHint")}
                    </p>
                    <div
                      className="mt-2 inline-flex w-full rounded-lg border border-zinc-200 bg-white p-1 sm:w-auto"
                      role="tablist"
                      aria-label={t("branch.stockShipmentModalViewAria")}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={detailModalViewMode === "lines"}
                        className={cn(
                          "min-h-10 flex-1 rounded-md px-3 py-2 text-xs font-semibold touch-manipulation sm:min-h-0 sm:flex-none sm:py-1.5",
                          detailModalViewMode === "lines"
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-700 hover:bg-zinc-50"
                        )}
                        onClick={() => setDetailModalViewMode("lines")}
                      >
                        {t("branch.stockShipmentModalViewLines")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={detailModalViewMode === "mainProduct"}
                        className={cn(
                          "min-h-10 flex-1 rounded-md px-3 py-2 text-xs font-semibold touch-manipulation sm:min-h-0 sm:flex-none sm:py-1.5",
                          detailModalViewMode === "mainProduct"
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-700 hover:bg-zinc-50"
                        )}
                        onClick={() => setDetailModalViewMode("mainProduct")}
                      >
                        {t("branch.stockShipmentModalViewMainProduct")}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">{t("branch.stockColDate")}</th>
                        <th className="px-3 py-2">{t("branch.stockColProduct")}</th>
                        <th className="px-3 py-2 text-right">{t("branch.stockColQty")}</th>
                        <th className="hidden px-3 py-2 md:table-cell">{t("branch.stockColWarehouse")}</th>
                        {detailModal.source === "mainProduct" ? (
                          <th className="hidden px-3 py-2 lg:table-cell">
                            {t("warehouse.movementBatchGroup")}
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    {detailModal.source === "shipment" && detailModalViewMode === "mainProduct" ? (
                      <tbody className="divide-y divide-zinc-100">
                        {detailModalMainProductGroups.map((group) => (
                          <Fragment key={group.key}>
                            <tr className="bg-violet-50/90">
                              <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                                {fmtDate(group.movements[0].movementDate)}
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-sm font-semibold text-violet-950">{group.label}</span>
                                <span className="mt-0.5 block text-[0.65rem] font-medium text-zinc-500">
                                  {t("branch.stockShipmentModalGroupLineCount").replace(
                                    "{{count}}",
                                    String(group.movements.length)
                                  )}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-zinc-900">
                                {formatLocaleAmount(group.totalQty, locale)}
                              </td>
                              <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                                {group.movements[0].warehouseName?.trim() ?? "—"}
                              </td>
                            </tr>
                            {group.movements.map((row) => (
                              <tr key={row.id} className="bg-white">
                                <td className="whitespace-nowrap px-3 py-1.5 pl-5 text-zinc-500">
                                  {fmtDate(row.movementDate)}
                                </td>
                                <td className="px-3 py-1.5 pl-5 font-medium text-zinc-800">
                                  {row.productName}
                                  {row.unit ? (
                                    <span className="font-normal text-zinc-500"> ({row.unit})</span>
                                  ) : null}
                                  {renderLineRecordMeta(row)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                                  {row.quantity}
                                </td>
                                <td className="hidden px-3 py-1.5 text-zinc-500 md:table-cell">
                                  {row.warehouseName?.trim() ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    ) : (
                      <tbody className="divide-y divide-zinc-100">
                        {detailModal.movements.map((row) => {
                          const batchCell = formatWarehouseShipmentDisplay(
                            row.inBatchGroupId ?? null,
                            row.warehouseMovementId ?? row.id
                          );
                          const showParentOnLine =
                            detailModal.source === "mainProduct" ||
                            (detailModal.source === "shipment" && detailModalViewMode === "lines");
                          return (
                            <tr key={row.id}>
                              <td className="whitespace-nowrap px-3 py-2 text-zinc-700">
                                {fmtDate(row.movementDate)}
                              </td>
                              <td className="px-3 py-2 font-medium text-zinc-900">
                                {showParentOnLine && row.parentProductName?.trim() ? (
                                  <span className="mb-0.5 block text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
                                    {row.parentProductName}
                                  </span>
                                ) : null}
                                {row.productName}
                                {row.unit ? (
                                  <span className="font-normal text-zinc-500"> ({row.unit})</span>
                                ) : null}
                                {renderLineRecordMeta(row)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                              <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                                {row.warehouseName?.trim() ?? "—"}
                              </td>
                              {detailModal.source === "mainProduct" ? (
                                <td className="hidden px-3 py-2 lg:table-cell">
                                  <span className={shipmentIdLabelClassName}>{batchCell.text}</span>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    )}
                  </table>
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      ) : null}
    </div>
  );
}
