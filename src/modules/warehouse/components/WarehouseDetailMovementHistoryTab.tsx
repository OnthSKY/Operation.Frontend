"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchBranchDocuments } from "@/modules/branch/api/branch-documents-api";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { EditWarehouseInboundBatchModal } from "@/modules/warehouse/components/EditWarehouseInboundBatchModal";
import { EditWarehouseInboundMovementFullModal } from "@/modules/warehouse/components/EditWarehouseInboundMovementFullModal";
import { EditWarehouseOutboundShipmentMovementModal } from "@/modules/warehouse/components/EditWarehouseOutboundShipmentMovementModal";
import { WarehouseMovementInvoicePreviewModal } from "@/modules/warehouse/components/WarehouseMovementInvoicePreviewModal";
import { WarehouseMovementRowCard } from "@/modules/warehouse/components/WarehouseMovementRowCard";
import { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";
import {
  useAppendWarehouseInboundLine,
  useAppendWarehouseOutboundShipmentLine,
  useSoftDeleteWarehouseInboundMovement,
  useSoftDeleteWarehouseOutboundShipmentMovement,
  useUpdateWarehouseInboundMovement,
  useUpdateWarehouseOutboundShipmentMovement,
  useWarehousePeopleOptions,
  warehouseKeys,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  mapWarehousePersonnelOptions,
  withWarehousePersonnelPickPlaceholder,
} from "@/modules/warehouse/lib/warehouse-personnel-select";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import { CatalogProductWarehouseStockCombobox } from "@/modules/products/components/CatalogProductWarehouseStockCombobox";
import type { WarehouseMovementItem, WarehouseMovementsPageParams } from "@/types/warehouse";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  formatWarehouseShipmentDisplay,
  shipmentIdLabelClassName,
  warehouseMovementShipmentGroupKey,
} from "@/shared/lib/in-batch-group-label";
import { EyeIcon } from "@/shared/ui/EyeIcon";
import { PlusIcon, detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Info,
  Pencil,
  Search,
  Store,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function shipmentListPreview(movements: WarehouseMovementItem[]): string {
  if (movements.length === 0) return "";
  if (movements.length === 1) {
    const m = movements[0];
    const u = m.unit?.trim() ? ` ${m.unit}` : "";
    return `${m.productName} · ${m.quantity}${u}`;
  }
  const head = movements.slice(0, 2).map((m) => m.productName);
  const more = movements.length - head.length;
  return more > 0 ? `${head.join(", ")} +${more}` : head.join(", ");
}

function shipmentMainProductTotals(
  movements: WarehouseMovementItem[]
): Array<{ key: string; name: string; quantity: number; unit: string | null }> {
  const map = new Map<string, { key: string; name: string; quantity: number; unit: string | null }>();
  for (const m of movements) {
    const key = movementMainProductKey(m);
    const signed = movementSignedQuantity(m);
    const prev = map.get(key);
    if (prev) {
      prev.quantity += signed;
      if (!prev.unit && m.unit?.trim()) prev.unit = m.unit.trim();
      continue;
    }
    map.set(key, {
      key,
      name: movementMainProductName(m),
      quantity: signed,
      unit: m.unit?.trim() || null,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function shipmentBranchSummary(movements: WarehouseMovementItem[]): string | null {
  const names = Array.from(
    movements
      .filter((m) => m.type === "OUT" && m.isDepotToBranchShipment)
      .map((m) => m.outDestinationBranchName?.trim())
      .filter((s): s is string => Boolean(s && s.length > 0))
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

function compactPeopleList(values: Array<string | null | undefined>): string {
  const uniq = Array.from(
    new Set(values.map((v) => v?.trim() ?? "").filter((v) => v.length > 0))
  );
  if (uniq.length === 0) return "—";
  if (uniq.length <= 2) return uniq.join(", ");
  return `${uniq.slice(0, 2).join(", ")} +${uniq.length - 2}`;
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

type GroupBalanceSummary = {
  id: string;
  name: string;
  unit: string | null;
  previous: number;
  delta: number;
  next: number;
  scope: "PRODUCT" | "MAIN";
};

function movementSignedQuantity(m: WarehouseMovementItem): number {
  return m.type === "IN" ? Number(m.quantity) : -Number(m.quantity);
}

function movementMainProductKey(m: WarehouseMovementItem): string {
  if (m.parentProductId != null && m.parentProductId > 0) return `parent:${m.parentProductId}`;
  return `product:${m.productId}`;
}

function movementMainProductName(m: WarehouseMovementItem): string {
  return m.parentProductName?.trim() || m.productName;
}

function movementProductKey(m: WarehouseMovementItem): string {
  return `product:${m.productId}`;
}

function buildShipmentGroups(items: WarehouseMovementItem[]) {
  const map = new Map<string, WarehouseMovementItem[]>();
  for (const m of items) {
    const k = warehouseMovementShipmentGroupKey(m.inBatchGroupId, m.id);
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
}

const GROUP_PAGE_SIZE = 10;
const MOVEMENTS_FETCH_PAGE_SIZE = 200;
const DRAWER_SELECT_Z = 280;
type Props = {
  warehouseId: number;
  warehouseName?: string;
  enabled: boolean;
  /** Özetten geçiş: ALL boş tür; IN/OUT giriş/çıkış segmenti. */
  historyTypeIntent?: "" | "ALL" | "IN" | "OUT";
  onHistoryTypeIntentConsumed?: () => void;
  openMovementIdIntent?: number | null;
  onOpenMovementIdIntentConsumed?: () => void;
};

/** Depo detay modalı — üst seviye «Hareket geçmişi» sekmesi (filtre çekmecesi + sayfalı liste). */
export function WarehouseDetailMovementHistoryTab({
  warehouseId,
  warehouseName,
  enabled,
  historyTypeIntent = "",
  onHistoryTypeIntentConsumed,
  openMovementIdIntent = null,
  onOpenMovementIdIntentConsumed,
}: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: branches = [] } = useBranchesList();
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [type, setType] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [editInboundOpen, setEditInboundOpen] = useState(false);
  const [editInboundTarget, setEditInboundTarget] = useState<{
    movementBatchId: string | null;
    soloMovementId: number | null;
    defaultBusinessDate: string;
  } | null>(null);
  const [inboundFullMovementId, setInboundFullMovementId] = useState<number | null>(null);
  const [outboundShipmentMovementId, setOutboundShipmentMovementId] = useState<number | null>(null);
  const [detailsGroupKey, setDetailsGroupKey] = useState<string | null>(null);
  const [detailsContentTab, setDetailsContentTab] = useState<"LINES" | "AUDIT">("LINES");
  const [detailLineQuery, setDetailLineQuery] = useState("");
  const [headerEditOpen, setHeaderEditOpen] = useState(false);
  const [headerEditBusinessDate, setHeaderEditBusinessDate] = useState("");
  const [headerEditDescription, setHeaderEditDescription] = useState("");
  const [headerEditCheckedBy, setHeaderEditCheckedBy] = useState("");
  const [headerEditApprovedBy, setHeaderEditApprovedBy] = useState("");
  const [invoicePreviewTarget, setInvoicePreviewTarget] = useState<{
    movementId: number;
    title: string;
    subtitle: string;
  } | null>(null);
  const softDeleteInboundM = useSoftDeleteWarehouseInboundMovement();
  const softDeleteOutboundShipmentM = useSoftDeleteWarehouseOutboundShipmentMovement();
  const appendInboundLineM = useAppendWarehouseInboundLine();
  const appendOutboundLineM = useAppendWarehouseOutboundShipmentLine();
  const updateInboundM = useUpdateWarehouseInboundMovement();
  const updateOutboundM = useUpdateWarehouseOutboundShipmentMovement();
  const { data: peopleRaw = [] } = useWarehousePeopleOptions(enabled);
  const [appendLineOpen, setAppendLineOpen] = useState(false);
  const [appendInboundLineOpen, setAppendInboundLineOpen] = useState(false);
  const [appendInboundProductId, setAppendInboundProductId] = useState("");
  const [appendInboundQty, setAppendInboundQty] = useState("1");
  const [appendProductId, setAppendProductId] = useState("");
  const [appendQty, setAppendQty] = useState("1");

  const confirmDeleteInboundFromRow = useCallback(
    (m: WarehouseMovementItem) => {
      if (m.type !== "IN") return;
      notifyConfirmToast({
        toastId: `wh-inbound-del-row-${warehouseId}-${m.id}`,
        title: t("warehouse.editInboundFullDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editInboundFullDeleteBody")}</p>
            <p className="mt-2 break-words font-medium text-zinc-900">{m.productName}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            await softDeleteInboundM.mutateAsync({ warehouseId, movementId: m.id });
            notify.success(t("warehouse.editInboundFullDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteInboundM, t, warehouseId]
  );

  const confirmDeleteWholeInboundShipment = useCallback(
    (group: { key: string; movements: WarehouseMovementItem[] } | null) => {
      if (!group) return;
      const inboundRows = group.movements.filter((m) => m.type === "IN");
      if (inboundRows.length === 0) return;
      notifyConfirmToast({
        toastId: `wh-inbound-del-group-${warehouseId}-${group.key}`,
        title: t("warehouse.editInboundFullDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editInboundFullDeleteBody")}</p>
            <p className="mt-2 text-sm text-zinc-700">
              {t("warehouse.movementLinesDialogTitle")}: {inboundRows.length}
            </p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            for (const row of inboundRows) {
              await softDeleteInboundM.mutateAsync({ warehouseId, movementId: row.id });
            }
            notify.success(t("warehouse.editInboundFullDeleted"));
            setDetailsGroupKey(null);
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteInboundM, t, warehouseId]
  );

  const confirmDeleteOutboundShipmentFromRow = useCallback(
    (m: WarehouseMovementItem) => {
      if (m.type !== "OUT" || !m.isDepotToBranchShipment) return;
      notifyConfirmToast({
        toastId: `wh-outbound-shipment-del-row-${warehouseId}-${m.id}`,
        title: t("warehouse.editOutboundShipmentDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editOutboundShipmentDeleteBody")}</p>
            <p className="mt-2 break-words font-medium text-zinc-900">{m.productName}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            await softDeleteOutboundShipmentM.mutateAsync({ warehouseId, movementId: m.id });
            notify.success(t("warehouse.editOutboundShipmentDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteOutboundShipmentM, t, warehouseId]
  );

  const confirmDeleteWholeOutboundShipment = useCallback(
    (group: { key: string; movements: WarehouseMovementItem[] } | null) => {
      if (!group) return;
      const shipmentRows = group.movements.filter((m) => m.type === "OUT" && m.isDepotToBranchShipment);
      if (shipmentRows.length === 0) return;
      const firstProduct = shipmentRows[0]?.productName?.trim() || "—";
      notifyConfirmToast({
        toastId: `wh-outbound-shipment-del-group-${warehouseId}-${group.key}`,
        title: t("warehouse.editOutboundShipmentDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editOutboundShipmentDeleteBody")}</p>
            <p className="mt-2 text-sm text-zinc-700">
              {t("warehouse.movementLinesDialogTitle")}: {shipmentRows.length}
            </p>
            <p className="break-words text-xs text-zinc-500">{firstProduct}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            for (const row of shipmentRows) {
              await softDeleteOutboundShipmentM.mutateAsync({ warehouseId, movementId: row.id });
            }
            notify.success(t("warehouse.editOutboundShipmentDeleted"));
            setDetailsGroupKey(null);
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteOutboundShipmentM, t, warehouseId]
  );

  const openInvoiceDraftFromShipment = useCallback(
    (movementId: number, movementIds?: number[] | null) => {
      if (!Number.isFinite(movementId) || movementId <= 0 || warehouseId <= 0) return;
      const validMovementIds = Array.from(
        new Set(
          (movementIds ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        )
      );
      const params = new URLSearchParams({
        shipmentWarehouseId: String(warehouseId),
        shipmentMovementId: String(movementId),
        invoiceDraft: "1",
      });
      if (validMovementIds.length > 0) {
        params.set("shipmentMovementIds", validMovementIds.join(","));
      }
      router.push(`/products/order-account-statement?${params.toString()}`);
    },
    [router, warehouseId]
  );
  const openRelatedShipmentPdfDocs = useCallback(
    (movementIds?: number[] | null) => {
      const validMovementIds = Array.from(
        new Set(
          (movementIds ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        )
      );
      if (validMovementIds.length === 0) return;
      const params = new URLSearchParams({ shipmentMovementIds: validMovementIds.join(",") });
      router.push(`/documents?${params.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    setFiltersDrawerOpen(false);
    setScope({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    });
    setType("");
    setBranchId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setInboundFullMovementId(null);
    setOutboundShipmentMovementId(null);
    setDetailsGroupKey(null);
    setDetailsContentTab("LINES");
    setDetailLineQuery("");
    setAppendInboundLineOpen(false);
    setAppendInboundProductId("");
    setAppendInboundQty("1");
    setAppendLineOpen(false);
    setAppendProductId("");
    setAppendQty("1");
  }, [warehouseId]);

  useEffect(() => {
    if (!enabled) return;
    const intent = historyTypeIntent;
    if (!intent) return;
    if (intent === "ALL") setType("");
    else if (intent === "IN" || intent === "OUT") setType(intent);
    onHistoryTypeIntentConsumed?.();
  }, [enabled, historyTypeIntent, onHistoryTypeIntentConsumed]);

  useEffect(() => {
    setPage(1);
    setDetailsGroupKey(null);
    setDetailsContentTab("LINES");
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (detailsGroupKey) setDetailsContentTab("LINES");
    if (!detailsGroupKey) setHeaderEditOpen(false);
    setDetailLineQuery("");
  }, [detailsGroupKey]);

  const movementFiltersActive = useMemo(() => {
    if (
      scope.mainCategoryId != null ||
      scope.subCategoryId != null ||
      scope.parentProductId != null ||
      scope.productId != null
    ) {
      return true;
    }
    if (type === "IN" || type === "OUT") return true;
    if (branchId !== "" && Number(branchId) > 0) return true;
    if (dateFrom.length === 10 || dateTo.length === 10) return true;
    return false;
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  const params = useMemo((): WarehouseMovementsPageParams => {
    const tNorm: "IN" | "OUT" | "" =
      type === "IN" || type === "OUT" ? type : "";
    const b =
      branchId !== "" && Number(branchId) > 0 ? Math.trunc(Number(branchId)) : undefined;
    const resolvedProductId =
      scope.productId != null && scope.productId > 0
        ? scope.productId
        : scope.parentProductId != null && scope.parentProductId > 0
          ? scope.parentProductId
          : undefined;
    const categoryId = warehouseScopeEffectiveCategoryId(scope) ?? undefined;
    return {
      page: 1,
      pageSize: MOVEMENTS_FETCH_PAGE_SIZE,
      categoryId,
      productId: resolvedProductId,
      type: tNorm,
      branchId: b,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    };
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  const historyQueryEnabled = enabled;
  const loadAllPages = useCallback(
    async (baseParams: WarehouseMovementsPageParams) => {
      let pageNo = 1;
      let totalCount = 0;
      const allItems: WarehouseMovementItem[] = [];
      let firstPageData: Awaited<ReturnType<typeof fetchWarehouseMovementsPage>> | null = null;
      do {
        const pageData = await fetchWarehouseMovementsPage(warehouseId, {
          ...baseParams,
          page: pageNo,
          pageSize: MOVEMENTS_FETCH_PAGE_SIZE,
        });
        if (!firstPageData) firstPageData = pageData;
        totalCount = pageData.totalCount ?? 0;
        allItems.push(...pageData.items);
        if (pageData.items.length === 0) break;
        pageNo += 1;
      } while (allItems.length < totalCount && pageNo <= 100);
      return {
        ...(firstPageData ?? {
          totalCount: 0,
          page: 1,
          pageSize: MOVEMENTS_FETCH_PAGE_SIZE,
          totalInQuantity: 0,
          totalOutQuantity: 0,
          inboundShipmentGroupCount: 0,
          outboundShipmentGroupCount: 0,
          outboundByBranch: [],
        }),
        page: 1,
        pageSize: MOVEMENTS_FETCH_PAGE_SIZE,
        totalCount,
        items: allItems,
      };
    },
    [warehouseId]
  );

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: [...warehouseKeys.all, "movementsHistoryAll", warehouseId, params] as const,
    queryFn: () => loadAllPages(params),
    enabled: historyQueryEnabled && warehouseId > 0,
    placeholderData: (prev) => prev,
  });

  const balanceParams = useMemo(
    (): WarehouseMovementsPageParams => ({
      page: 1,
      pageSize: MOVEMENTS_FETCH_PAGE_SIZE,
      categoryId: warehouseScopeEffectiveCategoryId(scope) ?? undefined,
      productId:
        scope.productId != null && scope.productId > 0
          ? scope.productId
          : scope.parentProductId != null && scope.parentProductId > 0
            ? scope.parentProductId
            : undefined,
      type: "",
      branchId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    }),
    [scope]
  );

  const { data: balanceData } = useQuery({
    queryKey: [...warehouseKeys.all, "movementsBalanceAll", warehouseId, balanceParams] as const,
    queryFn: () => loadAllPages(balanceParams),
    enabled: historyQueryEnabled && warehouseId > 0,
    placeholderData: (prev) => prev,
  });

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.filterAllBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const totalCount = data?.totalCount ?? 0;
  const items = data?.items ?? [];

  const shipmentGroups = useMemo(() => buildShipmentGroups(items), [items]);
  const balanceShipmentGroups = useMemo(
    () => buildShipmentGroups(balanceData?.items ?? []),
    [balanceData?.items]
  );

  const fmtDate = (iso: string) => formatLocaleDate(iso, locale);
  const totalInQty = Number(data?.totalInQuantity ?? 0);
  const totalOutQty = Number(data?.totalOutQuantity ?? 0);
  const filterInboundGroups = data?.inboundShipmentGroupCount ?? 0;
  const filterOutboundGroups = data?.outboundShipmentGroupCount ?? 0;
  const outboundByBranch = data?.outboundByBranch ?? [];
  const groupTotalCount = shipmentGroups.length;
  const totalPages = Math.max(1, Math.ceil(groupTotalCount / GROUP_PAGE_SIZE));
  const pageStart = (page - 1) * GROUP_PAGE_SIZE;
  const pagedShipmentGroups = shipmentGroups.slice(pageStart, pageStart + GROUP_PAGE_SIZE);
  const selectedDetailGroup = detailsGroupKey
    ? shipmentGroups.find((g) => g.key === detailsGroupKey) ?? null
    : null;
  const detailLineFilteredMovements = useMemo(() => {
    const all = selectedDetailGroup?.movements ?? [];
    const q = detailLineQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return all;
    return all.filter((m) =>
      `${m.productName} ${m.parentProductName ?? ""} ${m.unit ?? ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    );
  }, [selectedDetailGroup, detailLineQuery]);
  const selectedDetailType = selectedDetailGroup?.movements[0]?.type ?? null;
  const selectedDetailIsDepotToBranch =
    selectedDetailGroup != null &&
    selectedDetailGroup.movements.length > 0 &&
    selectedDetailGroup.movements.every((m) => m.type === "OUT" && m.isDepotToBranchShipment);
  const selectedDetailTypeLabel =
    selectedDetailType === "IN"
      ? t("warehouse.movementDetailTypeInbound")
      : selectedDetailType === "OUT"
        ? selectedDetailIsDepotToBranch
          ? t("warehouse.movementDetailTypeDepotToBranch")
          : t("warehouse.movementDetailTypeOutbound")
        : "—";
  const selectedDetailDestinationBranch = selectedDetailGroup
    ? shipmentBranchSummary(selectedDetailGroup.movements)
    : null;
  const selectedDetailSample = selectedDetailGroup?.movements[0] ?? null;
  const selectedDetailBatchCell = selectedDetailSample
    ? formatWarehouseShipmentDisplay(selectedDetailSample.inBatchGroupId, selectedDetailSample.id)
    : null;
  const selectedDetailInvoiceMovements = selectedDetailGroup
    ? selectedDetailGroup.movements.filter((m) => m.hasInvoicePhoto)
    : [];
  const canManageWholeOutboundShipment = useMemo(
    () =>
      selectedDetailGroup != null &&
      selectedDetailGroup.movements.length > 0 &&
      selectedDetailGroup.movements.every((m) => m.type === "OUT" && m.isDepotToBranchShipment),
    [selectedDetailGroup]
  );
  const canManageWholeInboundShipment = useMemo(
    () =>
      selectedDetailGroup != null &&
      selectedDetailGroup.movements.length > 0 &&
      selectedDetailGroup.movements.every((m) => m.type === "IN"),
    [selectedDetailGroup]
  );
  const selectedOutboundShipmentRepresentativeMovementId = canManageWholeOutboundShipment
    ? selectedDetailGroup?.movements[0]?.id ?? null
    : null;
  const selectedOutboundBranchName = canManageWholeOutboundShipment
    ? selectedDetailGroup?.movements[0]?.outDestinationBranchName?.trim() ?? ""
    : "";
  const selectedOutboundBranchId = useMemo(() => {
    if (!selectedOutboundBranchName) return null;
    const found = branches.find((b) => (b.name ?? "").trim().toLocaleLowerCase() === selectedOutboundBranchName.toLocaleLowerCase());
    return found?.id != null && found.id > 0 ? found.id : null;
  }, [branches, selectedOutboundBranchName]);
  const canEditHeaderInfo = useMemo(
    () => canManageWholeInboundShipment || canManageWholeOutboundShipment,
    [canManageWholeInboundShipment, canManageWholeOutboundShipment]
  );
  const personnelSelectOptions = useMemo<SelectOption[]>(
    () =>
      withWarehousePersonnelPickPlaceholder(
        mapWarehousePersonnelOptions(peopleRaw),
        t("warehouse.personnelPickPlaceholder")
      ),
    [peopleRaw, t]
  );
  const submitHeaderEdit = useCallback(async () => {
    if (!selectedDetailGroup || !canEditHeaderInfo) return;
    if (headerEditBusinessDate.length !== 10) {
      notify.error(t("warehouse.editInboundDateInvalid"));
      return;
    }
    const checkedById = Number(headerEditCheckedBy);
    const approvedById = Number(headerEditApprovedBy);
    if (!Number.isFinite(checkedById) || checkedById <= 0 || !Number.isFinite(approvedById) || approvedById <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    const desc = headerEditDescription.trim() ? headerEditDescription.trim() : null;
    try {
      let updated = 0;
      if (canManageWholeInboundShipment) {
        for (const m of selectedDetailGroup.movements) {
          if (m.type !== "IN") continue;
          await updateInboundM.mutateAsync({
            warehouseId,
            movementId: m.id,
            body: {
              productId: m.productId,
              quantity: Number(m.quantity),
              businessDate: headerEditBusinessDate,
              date: headerEditBusinessDate,
              description: desc,
              checkedByPersonnelId: checkedById,
              approvedByPersonnelId: approvedById,
              clearInvoicePhoto: false,
            },
          });
          updated += 1;
        }
      } else if (canManageWholeOutboundShipment) {
        const branchId = selectedOutboundBranchId;
        if (branchId == null || branchId <= 0) {
          notify.error(t("warehouse.movementHeaderEditBranchUnresolved"));
          return;
        }
        for (const m of selectedDetailGroup.movements) {
          if (m.type !== "OUT" || !m.isDepotToBranchShipment) continue;
          await updateOutboundM.mutateAsync({
            warehouseId,
            movementId: m.id,
            body: {
              branchId,
              productId: m.productId,
              quantity: Number(m.quantity),
              businessDate: headerEditBusinessDate,
              date: headerEditBusinessDate,
              description: desc,
              checkedByPersonnelId: checkedById,
              approvedByPersonnelId: approvedById,
              clearInvoicePhoto: false,
            },
          });
          updated += 1;
        }
      }
      notify.success(t("warehouse.movementHeaderEditSaved").replace("{{count}}", String(updated)));
      setHeaderEditOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    selectedDetailGroup,
    canEditHeaderInfo,
    canManageWholeInboundShipment,
    canManageWholeOutboundShipment,
    selectedOutboundBranchId,
    headerEditBusinessDate,
    headerEditDescription,
    headerEditCheckedBy,
    headerEditApprovedBy,
    updateInboundM,
    updateOutboundM,
    warehouseId,
    t,
  ]);
  const groupBalanceSummaryByKey = useMemo(() => {
    const byGroup = new Map<string, GroupBalanceSummary[]>();
    const targetKeys = new Set(shipmentGroups.map((g) => g.key));
    const runningProduct = new Map<string, number>();
    const runningMain = new Map<string, number>();
    const chronological = [...balanceShipmentGroups].reverse();
    for (const group of chronological) {
      const productRollup = new Map<
        string,
        { id: string; name: string; unit: string | null; delta: number }
      >();
      const mainRollup = new Map<
        string,
        { id: string; name: string; unit: string | null; delta: number }
      >();
      for (const m of group.movements) {
        const signed = movementSignedQuantity(m);
        const productId = movementProductKey(m);
        const p = productRollup.get(productId);
        if (p) {
          p.delta += signed;
        } else {
          productRollup.set(productId, {
            id: productId,
            name: m.productName,
            unit: m.unit?.trim() || null,
            delta: signed,
          });
        }

        const mainId = movementMainProductKey(m);
        const main = mainRollup.get(mainId);
        if (main) {
          main.delta += signed;
        } else {
          mainRollup.set(mainId, {
            id: mainId,
            name: movementMainProductName(m),
            unit: m.unit?.trim() || null,
            delta: signed,
          });
        }
      }
      const productRows: GroupBalanceSummary[] = Array.from(productRollup.values()).map((row) => {
        const prevQty = runningProduct.get(row.id) ?? 0;
        const nextQty = prevQty + row.delta;
        runningProduct.set(row.id, nextQty);
        return {
          id: `p-${row.id}`,
          name: row.name,
          unit: row.unit,
          previous: prevQty,
          delta: row.delta,
          next: nextQty,
          scope: "PRODUCT",
        };
      });

      const mainRows: GroupBalanceSummary[] = Array.from(mainRollup.values()).map((row) => {
        const prevQty = runningMain.get(row.id) ?? 0;
        const nextQty = prevQty + row.delta;
        runningMain.set(row.id, nextQty);
        return {
          id: `m-${row.id}`,
          name: row.name,
          unit: row.unit,
          previous: prevQty,
          delta: row.delta,
          next: nextQty,
          scope: "MAIN",
        };
      });

      const rows: GroupBalanceSummary[] = [...productRows, ...mainRows]
        .map((row) => {
          const prevQty = row.previous;
          const nextQty = prevQty + row.delta;
          return {
            ...row,
            name: row.name,
            unit: row.unit,
            previous: prevQty,
            delta: row.delta,
            next: nextQty,
            scope: row.scope,
          };
        })
        .sort((a, b) => {
          if (a.scope !== b.scope) return a.scope === "PRODUCT" ? -1 : 1;
          return a.name.localeCompare(b.name, locale);
        });
      if (targetKeys.has(group.key)) byGroup.set(group.key, rows);
    }
    return byGroup;
  }, [shipmentGroups, balanceShipmentGroups, locale]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    if (!enabled) return;
    const movementId = openMovementIdIntent ?? null;
    if (movementId == null || movementId <= 0) return;
    const target = shipmentGroups.find((g) => g.movements.some((m) => m.id === movementId));
    if (!target) return;
    setDetailsGroupKey(target.key);
    onOpenMovementIdIntentConsumed?.();
  }, [enabled, openMovementIdIntent, shipmentGroups, onOpenMovementIdIntentConsumed]);

  useEffect(() => {
    if (!headerEditOpen || !selectedDetailGroup) return;
    const first = selectedDetailGroup.movements[0];
    const findPersonnelId = (name?: string | null): string => {
      const target = (name ?? "").trim().toLocaleLowerCase();
      if (!target) return "";
      const matched = peopleRaw.find(
        (p) => (p.displayName ?? "").trim().toLocaleLowerCase() === target && (p.personnelId ?? 0) > 0
      );
      return matched?.personnelId != null ? String(matched.personnelId) : "";
    };
    const date = (first?.movementDate ?? "").slice(0, 10);
    setHeaderEditBusinessDate(date);
    setHeaderEditDescription(first?.description?.trim() ?? "");
    setHeaderEditCheckedBy(findPersonnelId(first?.checkedByPersonnelName));
    setHeaderEditApprovedBy(findPersonnelId(first?.approvedByPersonnelName));
  }, [headerEditOpen, selectedDetailGroup, peopleRaw]);

  const shipmentPdfQueryEnabled =
    canManageWholeOutboundShipment &&
    selectedOutboundBranchId != null &&
    selectedOutboundShipmentRepresentativeMovementId != null;
  const shipmentPdfDocsQ = useQuery({
    queryKey: [
      ...warehouseKeys.all,
      "shipmentPdfDocs",
      selectedOutboundBranchId ?? 0,
      selectedOutboundShipmentRepresentativeMovementId ?? 0,
    ] as const,
    queryFn: async () => await fetchBranchDocuments(selectedOutboundBranchId!),
    enabled: shipmentPdfQueryEnabled,
    staleTime: 30_000,
  });
  const hasShipmentPdfDoc = useMemo(() => {
    if (!shipmentPdfQueryEnabled || !shipmentPdfDocsQ.data) return false;
    const representativeId = selectedOutboundShipmentRepresentativeMovementId!;
    const groupMovementIds = new Set(selectedDetailGroup?.movements.map((m) => m.id) ?? []);
    return shipmentPdfDocsQ.data.some((doc) => {
      const ct = (doc.contentType ?? "").toLocaleLowerCase();
      if (!ct.includes("pdf")) return false;
      const meta = parseShipmentMetadataFromNotes(doc.notes);
      const primary = Number(meta.shipmentPrimaryMovementId ?? 0);
      if (primary > 0 && primary === representativeId) return true;
      const linked = String(meta.shipmentMovementIds ?? "")
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      return linked.some((movementId) => groupMovementIds.has(movementId));
    });
  }, [
    shipmentPdfQueryEnabled,
    shipmentPdfDocsQ.data,
    selectedOutboundShipmentRepresentativeMovementId,
    selectedDetailGroup,
  ]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <h2 className="min-w-0 text-sm font-semibold text-zinc-900 sm:text-base">
            {t("warehouse.movementsHistoryTitle")}
          </h2>
          <Tooltip
            content={
              <div className="text-left font-normal">
                <p className="mb-2 font-semibold">{t("warehouse.movementsHistoryEditGuideTitle")}</p>
                <ul className="list-disc space-y-1.5 pl-4 leading-relaxed">
                  <li>{t("warehouse.movementsHistoryEditGuide1")}</li>
                  <li>{t("warehouse.movementsHistoryEditGuide2")}</li>
                  <li>{t("warehouse.movementsHistoryEditGuide3")}</li>
                </ul>
              </div>
            }
            delayMs={200}
            side="bottom"
            panelClassName="max-w-[min(22rem,calc(100vw-1.25rem))] py-2.5"
          >
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200/90 bg-violet-50 text-violet-800 shadow-sm transition hover:bg-violet-100/90 sm:h-10 sm:w-10"
              aria-label={t("warehouse.movementsHistoryEditGuideTitle")}
            >
              <Info className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
            </button>
          </Tooltip>
        </div>

        <div className="flex min-h-[48px] w-full min-w-0 items-stretch gap-2 sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-end">
          <div
            role="tablist"
            aria-label={t("warehouse.movementsTypeSegmentAria")}
            className="flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory gap-1 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-zinc-100/80 p-1 shadow-inner [-webkit-overflow-scrolling:touch] sm:max-w-max sm:flex-none sm:flex-wrap sm:overflow-visible"
          >
            {(
              [
                { v: "" as const, label: t("warehouse.movementsTypeSegmentAll") },
                { v: "IN" as const, label: t("warehouse.movementsTypeSegmentInbound") },
                { v: "OUT" as const, label: t("warehouse.movementsTypeSegmentOutbound") },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={v || "all"}
                type="button"
                role="tab"
                aria-selected={type === v}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] shrink-0 snap-start items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 sm:text-sm",
                  type === v
                    ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-300/80"
                    : "bg-transparent text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                )}
                onClick={() => setType(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <Tooltip
            content={t("warehouse.movementsFiltersToggle")}
            delayMs={200}
            className="inline-flex shrink-0 self-stretch"
          >
            <button
              type="button"
              className="relative flex h-full min-h-[44px] w-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              aria-expanded={filtersDrawerOpen}
              aria-haspopup="dialog"
              aria-label={t("warehouse.movementsFilterIconAria")}
              onClick={() => setFiltersDrawerOpen(true)}
            >
              <FilterFunnelIcon className="h-5 w-5" />
              {movementFiltersActive ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </button>
          </Tooltip>
        </div>
      </div>

      <RightDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        title={t("warehouse.movementsFiltersTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-zinc-600">{t("warehouse.movementsFilterDrawerHint")}</p>
          <WarehouseProductScopeFilters
            value={scope}
            onChange={setScope}
            menuZIndex={DRAWER_SELECT_Z}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <Select
                label={t("warehouse.filterMovementBranch")}
                options={branchOptions}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                onBlur={() => {}}
                name="wh-mv-branch"
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500">
                {t("warehouse.filterMovementBranchHint")}
              </p>
            </div>
            <DateField
              label={t("products.filterDateFrom")}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-w-0 max-w-full"
            />
            <DateField
              label={t("products.filterDateTo")}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-w-0 max-w-full"
            />
          </div>
          <Button
            type="button"
            className="min-h-11 w-full"
            onClick={() => {
              void refetch();
              setFiltersDrawerOpen(false);
            }}
          >
            {t("warehouse.movementsFilterApplyClose")}
          </Button>
        </div>
      </RightDrawer>

      {isError && <p className="text-sm text-red-600">{toErrorMessage(error)}</p>}

      {isPending && !data ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !isError && data ? (
        <>
          <div
            className={cn(
              "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4",
              isFetching && "opacity-70"
            )}
          >
            <p className="text-xs font-semibold text-zinc-800 sm:text-sm">
              {t("warehouse.movementsTotalsTitle")}
            </p>
            <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
              <div className="min-w-0 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                  {t("warehouse.movementsTotalsIn")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-emerald-950 sm:text-xl">
                  {formatLocaleAmount(totalInQty, locale)}
                </p>
              </div>
              <div className="min-w-0 rounded-md border border-red-200/80 bg-red-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-red-900">
                  {t("warehouse.movementsTotalsOut")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-red-950 sm:text-xl">
                  {formatLocaleAmount(totalOutQty, locale)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
              {t("warehouse.movementsTotalsHint")}
            </p>
            <div className="mt-3 space-y-3 border-t border-zinc-200/80 pt-3">
              <p className="text-[0.65rem] leading-snug text-zinc-700 sm:text-xs">
                {t("warehouse.movementsFilterGroupCounts")
                  .replace("{{in}}", String(filterInboundGroups))
                  .replace("{{out}}", String(filterOutboundGroups))}
              </p>
              {outboundByBranch.length > 0 ? (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800">
                    {t("warehouse.movementsOutboundByBranchTitle")}
                  </p>
                  <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                    {t("warehouse.movementsOutboundByBranchHint")}
                  </p>
                  <div className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50/50">
                    <table className="w-full min-w-[260px] border-collapse text-left text-xs text-zinc-800">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-100/80">
                          <th className="px-2 py-1.5 font-semibold sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColBranch")}
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColQty")}
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColLines")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outboundByBranch.map((row) => (
                          <tr key={row.branchId} className="border-b border-zinc-200/80 last:border-0">
                            <td className="max-w-[10rem] truncate px-2 py-1.5 sm:max-w-none sm:px-3">
                              {row.branchName || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
                              {formatLocaleAmount(Number(row.totalQuantity), locale)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
                              {row.movementLineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("warehouse.movementsEmpty")}</p>
          ) : (
            <>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 sm:text-sm">
            {t("warehouse.movementsPageShipmentSummary")
              .replace("{{shipments}}", String(pagedShipmentGroups.length))
              .replace("{{lines}}", String(pagedShipmentGroups.reduce((acc, g) => acc + g.movements.length, 0)))}
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            {pagedShipmentGroups.map(({ key, movements }) => {
              const sample = movements[0];
              const batchCell = formatWarehouseShipmentDisplay(sample.inBatchGroupId, sample.id);
              const typeSet = new Set(movements.map((x) => x.type));
              const singleType = typeSet.size === 1 ? sample.type : null;
              const isDepotToBranchGroup =
                singleType === "OUT" && movements.every((x) => x.isDepotToBranchShipment);
              const typeLabel =
                singleType === "IN"
                  ? t("products.typeIn")
                  : singleType === "OUT"
                    ? isDepotToBranchGroup
                      ? t("warehouse.movementDetailTypeDepotToBranch")
                      : t("products.typeOut")
                    : `${t("products.typeIn")}/${t("products.typeOut")}`;
              const preview = shipmentListPreview(movements);
              const branchSummary = shipmentBranchSummary(movements);
              const balanceRows = groupBalanceSummaryByKey.get(key) ?? [];
              const mainAuditRows = balanceRows.filter((row) => row.scope === "MAIN");
              const productAuditRows = balanceRows.filter((row) => row.scope === "PRODUCT");
              const balanceRowCount = mainAuditRows.length + productAuditRows.length;
              const balanceDeltaTotal = mainAuditRows.reduce((acc, row) => acc + row.delta, 0);
              const renderBalanceFlowRow = (row: GroupBalanceSummary) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1"
                >
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums">
                    <span className="text-zinc-500">{formatLocaleAmount(row.previous, locale)}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-zinc-300" aria-hidden />
                    <span className="font-bold text-zinc-900">{formatLocaleAmount(row.next, locale)}</span>
                    <span
                      className={cn(
                        "ml-0.5 rounded px-1 py-px text-[10px] font-semibold",
                        row.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {row.delta >= 0 ? "+" : ""}
                      {formatLocaleAmount(row.delta, locale)}
                    </span>
                  </span>
                </div>
              );
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-stretch lg:gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <button
                        type="button"
                        className="group flex w-full min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-2.5 text-left text-sm touch-manipulation text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-100/80"
                        aria-label={t("common.openDetailsDialog")}
                        onClick={() => setDetailsGroupKey(key)}
                      >
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                          <span
                            className={cn(
                              "min-w-0 max-w-full basis-full sm:basis-auto sm:max-w-[min(100%,24rem)]",
                              shipmentIdLabelClassName
                            )}
                          >
                            {batchCell.text}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 sm:text-sm">
                            {fmtDate(sample.movementDate)}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight sm:text-xs",
                              singleType === "IN" && "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80",
                              singleType === "OUT" && "bg-red-100 text-red-900 ring-1 ring-red-200/80",
                              singleType === null && "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-300/80"
                            )}
                          >
                            {typeLabel}
                          </span>
                          {branchSummary ? (
                            <span
                              className="max-w-full shrink truncate rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold tracking-tight text-violet-950 ring-1 ring-violet-200/90 sm:max-w-[14rem] sm:text-xs"
                              title={branchSummary}
                            >
                              {branchSummary}
                            </span>
                          ) : null}
                          <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                            {movements.length}×
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 group-hover:border-zinc-300 group-hover:text-zinc-800">
                          <span className="hidden sm:inline">
                            {t("warehouse.details")}
                          </span>
                          <EyeIcon className="h-4 w-4" />
                        </span>
                      </button>

                      <div className="flex min-w-0 flex-col gap-2">
                        <div
                          className={cn(
                            "min-w-0 rounded-xl border px-2.5 py-2",
                            singleType === "IN" && "border-emerald-200/70 bg-emerald-50/40",
                            singleType === "OUT" && "border-red-200/70 bg-red-50/40",
                            singleType === null && "border-zinc-200 bg-zinc-50/60"
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                singleType === "IN" && "bg-emerald-500",
                                singleType === "OUT" && "bg-red-500",
                                singleType === null && "bg-zinc-400"
                              )}
                              aria-hidden
                            />
                            <p
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-wide",
                                singleType === "IN" && "text-emerald-800",
                                singleType === "OUT" && "text-red-800",
                                singleType === null && "text-zinc-500"
                              )}
                            >
                              {singleType === "IN"
                                ? t("warehouse.movementsTypeSegmentInbound")
                                : singleType === "OUT"
                                  ? t("warehouse.movementsTypeSegmentOutbound")
                                  : `${t("warehouse.movementsTypeSegmentInbound")} / ${t("warehouse.movementsTypeSegmentOutbound")}`}
                            </p>
                          </div>
                          <p className="mt-1 min-w-0 break-words text-sm font-medium leading-snug text-zinc-800 [overflow-wrap:anywhere]">
                            {preview}
                          </p>
                        </div>
                        {balanceRowCount > 0 ? (
                          <details className="group rounded-xl border border-zinc-200/80 bg-white">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 touch-manipulation sm:px-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <ChevronDown
                                  className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                                  aria-hidden
                                />
                                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                                  {t("warehouse.movementBalancesToggleTitle")}
                                </span>
                                <span className="shrink-0 tabular-nums text-[11px] text-zinc-400">
                                  {balanceRowCount}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                                  balanceDeltaTotal >= 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                )}
                              >
                                {balanceDeltaTotal >= 0 ? "+" : ""}
                                {formatLocaleAmount(balanceDeltaTotal, locale)}
                              </span>
                            </summary>
                            <div className="space-y-2 border-t border-zinc-100 px-2.5 py-2 sm:px-3">
                              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                <span className="shrink-0">{t("warehouse.movementMainBalancesPrev")}</span>
                                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="shrink-0">{t("warehouse.movementMainBalancesNext")}</span>
                                <span className="ml-auto shrink-0 normal-case tracking-normal">Δ</span>
                              </div>
                              {mainAuditRows.length > 0 ? (
                                <div>
                                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                                    {t("warehouse.movementMainBalancesScopeMain")}
                                  </p>
                                  <div className="space-y-1">{mainAuditRows.map(renderBalanceFlowRow)}</div>
                                </div>
                              ) : null}
                              {productAuditRows.length > 0 ? (
                                <div>
                                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
                                    {t("warehouse.movementMainBalancesScopeProduct")}
                                  </p>
                                  <div className="space-y-1">{productAuditRows.map(renderBalanceFlowRow)}</div>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </>
      ) : null}

      {!isPending && totalCount > 0 && (
        <div className="flex min-w-0 flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-zinc-600">
            {(page - 1) * GROUP_PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * GROUP_PAGE_SIZE, groupTotalCount)} · {t("products.pagingTotal")} {groupTotalCount}
          </p>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-[44px] px-3 touch-manipulation"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t("products.pagingPrev")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("products.pagingPrev")}</span>
            </Button>
            <span className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm tabular-nums text-zinc-700 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-[44px] px-3 touch-manipulation"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("products.pagingNext")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("products.pagingNext")}</span>
            </Button>
          </div>
        </div>
      )}
      {editInboundTarget ? (
        <EditWarehouseInboundBatchModal
          open={editInboundOpen}
          warehouseId={warehouseId}
          movementBatchId={editInboundTarget.movementBatchId}
          soloMovementId={editInboundTarget.soloMovementId}
          defaultBusinessDate={editInboundTarget.defaultBusinessDate}
          onClose={() => {
            setEditInboundOpen(false);
            setEditInboundTarget(null);
          }}
        />
      ) : null}

      <EditWarehouseInboundMovementFullModal
        open={inboundFullMovementId != null}
        warehouseId={warehouseId}
        movementId={inboundFullMovementId}
        lineOnly
        onClose={() => setInboundFullMovementId(null)}
      />

      <EditWarehouseOutboundShipmentMovementModal
        open={outboundShipmentMovementId != null}
        warehouseId={warehouseId}
        movementId={outboundShipmentMovementId}
        onClose={() => setOutboundShipmentMovementId(null)}
      />
      <WarehouseMovementInvoicePreviewModal
        open={invoicePreviewTarget != null}
        movementId={invoicePreviewTarget?.movementId ?? null}
        title={invoicePreviewTarget?.title ?? t("warehouse.movementInvoicePreviewTitle")}
        subtitle={invoicePreviewTarget?.subtitle}
        t={t}
        onClose={() => setInvoicePreviewTarget(null)}
      />
      <Modal
        open={headerEditOpen && canEditHeaderInfo && selectedDetailGroup != null}
        onClose={() => setHeaderEditOpen(false)}
        titleId="warehouse-movement-header-edit-title"
        title={t("warehouse.movementHeaderEditTitle")}
        closeButtonLabel={t("common.close")}
      >
        <div className="mt-3 flex flex-col gap-3">
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={headerEditBusinessDate}
            onChange={(e) => setHeaderEditBusinessDate(e.target.value)}
            disabled={updateInboundM.isPending || updateOutboundM.isPending}
          />
          <Input
            label={t("warehouse.movementNote")}
            type="text"
            value={headerEditDescription}
            onChange={(e) => setHeaderEditDescription(e.target.value)}
            disabled={updateInboundM.isPending || updateOutboundM.isPending}
          />
          <Select
            label={t("warehouse.checkedByPersonnel")}
            labelRequired
            name="wh-header-edit-ck"
            options={personnelSelectOptions}
            value={headerEditCheckedBy}
            onChange={(e) => setHeaderEditCheckedBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateInboundM.isPending || updateOutboundM.isPending}
          />
          <Select
            label={t("warehouse.approvedByPersonnel")}
            labelRequired
            name="wh-header-edit-ap"
            options={personnelSelectOptions}
            value={headerEditApprovedBy}
            onChange={(e) => setHeaderEditApprovedBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateInboundM.isPending || updateOutboundM.isPending}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={() => setHeaderEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={updateInboundM.isPending || updateOutboundM.isPending}
              onClick={() => void submitHeaderEdit()}
            >
              {t("warehouse.editInboundSave")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={selectedDetailGroup != null}
        onClose={() => setDetailsGroupKey(null)}
        titleId="warehouse-movement-detail-dialog-title"
        title={t("common.openDetailsDialog")}
        closeButtonLabel={t("common.close")}
        wide
        wideExpanded
        wideFixedHeight
      >
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pr-2 sm:mt-4 sm:px-4 sm:pb-4 sm:pr-3">
          {selectedDetailGroup ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="min-w-0 text-xs font-semibold leading-snug text-zinc-800">
                    {t("warehouse.movementHeaderInfoTitle")}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    {canEditHeaderInfo ? (
                      <Tooltip content={t("common.edit")} delayMs={200} className="inline-flex shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          className={detailOpenIconButtonClass}
                          onClick={() => setHeaderEditOpen(true)}
                          aria-label={t("common.edit")}
                        >
                          <Pencil className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="sr-only">{t("common.edit")}</span>
                        </Button>
                      </Tooltip>
                    ) : null}
                    {canManageWholeOutboundShipment ? (
                      <>
                        <Tooltip
                          content={t("warehouse.movementHistoryCreateInvoiceFromShipment")}
                          delayMs={200}
                          className="inline-flex shrink-0"
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn(
                              detailOpenIconButtonClass,
                              "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                            )}
                            aria-label={t("warehouse.movementHistoryCreateInvoiceFromShipment")}
                            onClick={() => {
                              if (selectedOutboundShipmentRepresentativeMovementId == null) return;
                              openInvoiceDraftFromShipment(
                                selectedOutboundShipmentRepresentativeMovementId,
                                selectedDetailGroup?.movements
                                  .map((m) => m.id)
                                  .filter((id) => Number.isFinite(id) && id > 0) ?? []
                              );
                            }}
                          >
                            <FilePlus2 className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="sr-only">{t("warehouse.movementHistoryCreateInvoiceFromShipment")}</span>
                          </Button>
                        </Tooltip>
                        {hasShipmentPdfDoc ? (
                          <Tooltip content={t("warehouse.movementHistoryOpenRelatedPdf")} delayMs={200} className="inline-flex shrink-0">
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-label={t("warehouse.movementHistoryOpenRelatedPdf")}
                              onClick={() => {
                                if (selectedOutboundShipmentRepresentativeMovementId == null) return;
                                openRelatedShipmentPdfDocs(
                                  selectedDetailGroup?.movements
                                    .map((m) => m.id)
                                    .filter((id) => Number.isFinite(id) && id > 0) ?? []
                                );
                              }}
                            >
                              <EyeIcon className="h-5 w-5" />
                              <span className="sr-only">{t("warehouse.movementHistoryOpenRelatedPdf")}</span>
                            </Button>
                          </Tooltip>
                        ) : null}
                        <Tooltip content={t("warehouse.transferAddLine")} delayMs={200} className="inline-flex shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("warehouse.transferAddLine")}
                            onClick={() => setAppendLineOpen(true)}
                          >
                            <PlusIcon className="h-5 w-5" />
                            <span className="sr-only">{t("warehouse.transferAddLine")}</span>
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("warehouse.editOutboundShipmentDeleteAction")} delayMs={200} className="inline-flex shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            className={trashIconActionButtonClass}
                            disabled={softDeleteOutboundShipmentM.isPending}
                            aria-label={t("warehouse.editOutboundShipmentDeleteAction")}
                            onClick={() => confirmDeleteWholeOutboundShipment(selectedDetailGroup)}
                          >
                            <TrashIcon className="h-5 w-5" />
                            <span className="sr-only">{t("warehouse.editOutboundShipmentDeleteAction")}</span>
                          </Button>
                        </Tooltip>
                      </>
                    ) : null}
                    {canManageWholeInboundShipment ? (
                      <>
                        <Tooltip content={t("warehouse.depoInAddLine")} delayMs={200} className="inline-flex shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("warehouse.depoInAddLine")}
                            onClick={() => setAppendInboundLineOpen(true)}
                          >
                            <PlusIcon className="h-5 w-5" />
                            <span className="sr-only">{t("warehouse.depoInAddLine")}</span>
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("warehouse.editInboundFullDeleteAction")} delayMs={200} className="inline-flex shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            className={trashIconActionButtonClass}
                            disabled={softDeleteInboundM.isPending}
                            aria-label={t("warehouse.editInboundFullDeleteAction")}
                            onClick={() => confirmDeleteWholeInboundShipment(selectedDetailGroup)}
                          >
                            <TrashIcon className="h-5 w-5" />
                            <span className="sr-only">{t("warehouse.editInboundFullDeleteAction")}</span>
                          </Button>
                        </Tooltip>
                      </>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:mt-1.5">{t("warehouse.movementHeaderInfoHint")}</p>
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm sm:p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDetailBatchCell ? (
                        <span className={cn(shipmentIdLabelClassName, "min-w-0 max-w-full truncate")}>
                          {selectedDetailBatchCell.text}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          selectedDetailType === "IN" && "bg-emerald-50 text-emerald-700 ring-emerald-100",
                          selectedDetailType === "OUT" && "bg-red-50 text-red-700 ring-red-100",
                          selectedDetailType !== "IN" &&
                            selectedDetailType !== "OUT" &&
                            "bg-zinc-100 text-zinc-700 ring-zinc-200"
                        )}
                      >
                        {selectedDetailTypeLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">
                        <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                        {fmtDate(selectedDetailGroup.movements[0]?.movementDate ?? "")}
                      </span>
                      <span
                        className="inline-flex min-w-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-100"
                        title={warehouseName?.trim() || undefined}
                      >
                        <WarehouseIcon className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate max-w-[10rem]">{warehouseName?.trim() || "—"}</span>
                      </span>
                      {selectedDetailType === "OUT" && selectedDetailDestinationBranch ? (
                        <span
                          className="inline-flex min-w-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-100"
                          title={selectedDetailDestinationBranch}
                        >
                          <Store className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate max-w-[10rem]">{selectedDetailDestinationBranch}</span>
                        </span>
                      ) : null}
                    </div>
                    {selectedDetailType === "IN" ? (
                      <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50/70 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          {t("warehouse.movementInvoicesDialogTitle")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {selectedDetailInvoiceMovements.length === 0 ? (
                            <p className="text-sm font-medium text-zinc-500">{t("warehouse.detailFieldEmpty")}</p>
                          ) : (
                            selectedDetailInvoiceMovements.map((m) => (
                              <div
                                key={`header-invoice-row-${m.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-1"
                              >
                                <span className="max-w-[11rem] truncate px-1 text-xs font-medium text-zinc-800" title={m.productName}>
                                  {m.productName}
                                </span>
                                <button
                                  type="button"
                                  className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
                                  onClick={() =>
                                    setInvoicePreviewTarget({
                                      movementId: m.id,
                                      title: t("warehouse.movementInvoicePreviewTitle"),
                                      subtitle: m.productName,
                                    })
                                  }
                                >
                                  {t("warehouse.openInvoicePhoto")}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                    <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5 sm:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t("warehouse.movementNote")}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-zinc-900">
                        {selectedDetailGroup.movements[0]?.description?.trim() || "—"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t("warehouse.movementCheckedBy")}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-zinc-900">
                        {compactPeopleList(selectedDetailGroup.movements.map((m) => m.checkedByPersonnelName))}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t("warehouse.movementApprovedBy")}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-zinc-900">
                        {compactPeopleList(selectedDetailGroup.movements.map((m) => m.approvedByPersonnelName))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("warehouse.movementSummaryDialogTitle")}
                </p>
                <div className="mt-2 space-y-1.5">
                  {shipmentMainProductTotals(selectedDetailGroup.movements).map((row) => (
                    <div
                      key={`dlg-main-${row.key}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900" title={row.name}>
                        {row.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ring-inset",
                          row.quantity >= 0
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-red-50 text-red-700 ring-red-100"
                        )}
                      >
                        {row.quantity >= 0 ? "+" : ""}
                        {formatLocaleAmount(row.quantity, locale)}
                        {row.unit ? ` ${row.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <div className="rounded-xl border border-zinc-200 bg-zinc-100/80 p-1">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <button
                      type="button"
                      className={cn(
                        "min-h-[44px] min-w-[44px] rounded-lg px-3 text-xs font-semibold transition-all duration-150",
                        detailsContentTab === "LINES"
                          ? "border border-zinc-300 bg-white text-zinc-900 shadow-sm"
                          : "border border-transparent bg-transparent text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                      )}
                      onClick={() => setDetailsContentTab("LINES")}
                    >
                      {t("warehouse.movementLinesDialogTitle")} ({selectedDetailGroup.movements.length})
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "min-h-[44px] min-w-[44px] rounded-lg px-3 text-xs font-semibold transition-all duration-150",
                        detailsContentTab === "AUDIT"
                          ? "border border-zinc-300 bg-white text-zinc-900 shadow-sm"
                          : "border border-transparent bg-transparent text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                      )}
                      onClick={() => setDetailsContentTab("AUDIT")}
                    >
                      {t("warehouse.movementAuditDialogTitle")} (
                      {(groupBalanceSummaryByKey.get(selectedDetailGroup.key) ?? []).length})
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {detailsContentTab === "LINES"
                    ? "Bu sekmede satir bazli duzenleme ve silme yapilir."
                    : "Bu sekme sadece onceki/sonraki stok denetimini gosterir."}
                </p>
                {detailsContentTab === "LINES" ? (
                  <div className="mt-2 space-y-2">
                    {selectedDetailGroup.movements.length > 1 ? (
                      <div className="sticky top-0 z-10 -mx-0.5 bg-zinc-50/95 px-0.5 pb-1 pt-0.5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/80">
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                            aria-hidden
                          />
                          <input
                            type="text"
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            value={detailLineQuery}
                            onChange={(e) => setDetailLineQuery(e.target.value)}
                            placeholder={t("warehouse.movementLineSearchPlaceholder")}
                            aria-label={t("warehouse.movementLineSearchPlaceholder")}
                            className="h-10 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-10 text-base text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 sm:h-11 sm:text-sm"
                          />
                          {detailLineQuery ? (
                            <button
                              type="button"
                              onClick={() => setDetailLineQuery("")}
                              aria-label={t("warehouse.movementLineSearchClear")}
                              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                        {detailLineQuery ? (
                          <p className="mt-1 px-1 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                            {t("warehouse.movementLineSearchCount")
                              .replace("{{shown}}", String(detailLineFilteredMovements.length))
                              .replace("{{total}}", String(selectedDetailGroup.movements.length))}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {detailLineFilteredMovements.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-6 text-center text-sm text-zinc-500">
                        {t("warehouse.movementLineSearchEmpty")}
                      </p>
                    ) : (
                      detailLineFilteredMovements.map((m) => (
                        <WarehouseMovementRowCard
                          key={`detail-${m.id}`}
                          m={m}
                          fmtDate={fmtDate}
                          t={t}
                          hideShipmentGroup
                          hideAuditMeta
                          hideInvoiceSection
                          hideOutBranch
                          warehouseId={warehouseId}
                          onEditInboundFull={(row) => {
                            if (row.type === "IN") setInboundFullMovementId(row.id);
                          }}
                          onDeleteInbound={confirmDeleteInboundFromRow}
                          onEditOutboundShipment={(row) => {
                            if (row.type === "OUT" && row.isDepotToBranchShipment) {
                              setOutboundShipmentMovementId(row.id);
                            }
                          }}
                          onDeleteOutboundShipment={confirmDeleteOutboundShipmentFromRow}
                          onPreviewInvoice={(row) => {
                            if (row.type !== "IN" || !row.hasInvoicePhoto) return;
                            setInvoicePreviewTarget({
                              movementId: row.id,
                              title: t("warehouse.movementInvoicePreviewTitle"),
                              subtitle: row.productName,
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {(groupBalanceSummaryByKey.get(selectedDetailGroup.key) ?? []).map((row) => (
                      <div key={`dlg-audit-${row.id}`} className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              row.scope === "MAIN" ? "bg-violet-500" : "bg-sky-500"
                            )}
                            aria-hidden
                          />
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900" title={row.name}>
                            {row.name}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                              row.scope === "MAIN"
                                ? "bg-violet-50 text-violet-700 ring-violet-100"
                                : "bg-sky-50 text-sky-700 ring-sky-100"
                            )}
                          >
                            {row.scope === "MAIN"
                              ? t("warehouse.movementMainBalancesScopeMain")
                              : t("warehouse.movementMainBalancesScopeProduct")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <div className="min-w-0 flex-1 rounded-lg bg-zinc-50 px-2 py-1.5 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                              {t("warehouse.movementMainBalancesPrev")}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-zinc-700">
                              {formatLocaleAmount(row.previous, locale)}
                            </p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-1 text-xs font-bold tabular-nums",
                              row.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}
                          >
                            {row.delta >= 0 ? "+" : ""}
                            {formatLocaleAmount(row.delta, locale)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                          <div className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-2 py-1.5 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                              {t("warehouse.movementMainBalancesNext")}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-white">
                              {formatLocaleAmount(row.next, locale)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={appendInboundLineOpen && selectedDetailGroup != null && canManageWholeInboundShipment}
        onClose={() => setAppendInboundLineOpen(false)}
        titleId="warehouse-inbound-add-line-title"
        title={t("warehouse.depoInAddLine")}
        closeButtonLabel={t("common.close")}
      >
        <div className="mt-3 flex flex-col gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800">
              {t("warehouse.movementProduct")} <span className="text-red-600">*</span>
            </p>
            <CatalogProductWarehouseStockCombobox
              warehouseId={warehouseId}
              value={appendInboundProductId}
              onChange={setAppendInboundProductId}
              enabled={
                appendInboundLineOpen &&
                selectedDetailGroup != null &&
                canManageWholeInboundShipment
              }
              locale={locale}
              t={t}
              disabled={appendInboundLineM.isPending}
            />
          </div>
          <Input
            label={t("warehouse.qtyLabelDepoIn")}
            labelRequired
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={appendInboundQty}
            onChange={(e) => setAppendInboundQty(e.target.value)}
            disabled={appendInboundLineM.isPending}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={() => setAppendInboundLineOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={appendInboundLineM.isPending}
              onClick={async () => {
                if (!selectedDetailGroup) return;
                const representativeMovementId = selectedDetailGroup.movements[0]?.id ?? 0;
                if (representativeMovementId <= 0) return;
                const pid = Number(appendInboundProductId);
                const qty = Number(appendInboundQty.replace(",", "."));
                if (!Number.isFinite(pid) || pid <= 0) {
                  notify.error(t("warehouse.listQuickPickProductError"));
                  return;
                }
                if (!Number.isFinite(qty) || qty <= 0) {
                  notify.error(t("warehouse.invalidQuantity"));
                  return;
                }
                try {
                  await appendInboundLineM.mutateAsync({
                    warehouseId,
                    movementId: representativeMovementId,
                    body: { productId: pid, quantity: qty },
                  });
                  notify.success(t("warehouse.appendInboundLineSaved"));
                  setAppendInboundLineOpen(false);
                  setAppendInboundProductId("");
                  setAppendInboundQty("1");
                } catch (e) {
                  notify.error(toErrorMessage(e));
                }
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={appendLineOpen && selectedDetailGroup != null && canManageWholeOutboundShipment}
        onClose={() => setAppendLineOpen(false)}
        titleId="warehouse-transfer-add-line-title"
        title={t("warehouse.transferAddLine")}
        closeButtonLabel={t("common.close")}
      >
        <div className="mt-3 flex flex-col gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800">
              {t("warehouse.movementProduct")} <span className="text-red-600">*</span>
            </p>
            <CatalogProductWarehouseStockCombobox
              warehouseId={warehouseId}
              value={appendProductId}
              onChange={setAppendProductId}
              pickMode="warehouseStockPositive"
              enabled={
                appendLineOpen && selectedDetailGroup != null && canManageWholeOutboundShipment
              }
              locale={locale}
              t={t}
              disabled={appendOutboundLineM.isPending}
            />
          </div>
          <Input
            label={t("warehouse.transferQty")}
            labelRequired
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={appendQty}
            onChange={(e) => setAppendQty(e.target.value)}
            disabled={appendOutboundLineM.isPending}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={() => setAppendLineOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={appendOutboundLineM.isPending}
              onClick={async () => {
                if (selectedOutboundShipmentRepresentativeMovementId == null) return;
                const pid = Number(appendProductId);
                const qty = Number(appendQty.replace(",", "."));
                if (!Number.isFinite(pid) || pid <= 0) {
                  notify.error(t("warehouse.listQuickPickProductError"));
                  return;
                }
                if (!Number.isFinite(qty) || qty <= 0) {
                  notify.error(t("warehouse.invalidQuantity"));
                  return;
                }
                try {
                  await appendOutboundLineM.mutateAsync({
                    warehouseId,
                    movementId: selectedOutboundShipmentRepresentativeMovementId,
                    body: { productId: pid, quantity: qty },
                  });
                  notify.success(t("warehouse.appendOutboundShipmentLineSaved"));
                  setAppendLineOpen(false);
                  setAppendProductId("");
                  setAppendQty("1");
                } catch (e) {
                  notify.error(toErrorMessage(e));
                }
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
