"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductCategories, useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import {
  warehouseScopeEffectiveCategoryId,
  warehouseScopeFiltersActive,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { WarehouseStockGroupHeader } from "@/modules/warehouse/components/WarehouseStockGroupHeader";
import { WarehouseStockLine } from "@/modules/warehouse/components/WarehouseStockLine";
import { WarehouseOperationsRecentMovements } from "@/modules/warehouse/components/WarehouseOperationsRecentMovements";
import { WarehouseStockSectionHeader } from "@/modules/warehouse/components/WarehouseStockSectionHeader";
import {
  buildWarehouseStockGroupedSections,
  isUncategorizedSection,
  type WarehouseStockGroupMode,
} from "@/modules/warehouse/lib/warehouse-stock-grouped-sections";
import {
  usePreviewWarehouseTransferToBranch,
  useRegisterWarehouseMovement,
  useSoftDeleteWarehouse,
  useTransferWarehouseToBranch,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { notifyWarehouseDeleteConfirm } from "@/shared/lib/notify-warehouse-delete";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { WarehouseProductStockRow } from "@/types/product";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Fragment, useEffect, useMemo, useState } from "react";

const STOCK_UNIT_NONE = "__none__";
const DRAWER_SELECT_Z = 280;

function parseOptionalQty(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normSearch(s: string) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFD");
}

function filterWarehouseStockRowsClient(
  rows: WarehouseProductStockRow[],
  opts: {
    q: string;
    minQty: number | null;
    maxQty: number | null;
    level: "all" | "positive" | "zero";
    unit: string;
  }
): WarehouseProductStockRow[] {
  const qn = normSearch(opts.q.trim());
  return rows.filter((r) => {
    if (qn) {
      const hay = normSearch(`${r.productName ?? ""} ${r.parentProductName ?? ""}`);
      if (!hay.includes(qn)) return false;
    }
    const qty = Number(r.quantity);
    if (opts.level === "positive" && !(qty > 0)) return false;
    if (opts.level === "zero" && qty !== 0) return false;
    if (opts.minQty != null && qty < opts.minQty) return false;
    if (opts.maxQty != null && qty > opts.maxQty) return false;
    if (opts.unit) {
      const u = (r.unit ?? "").trim();
      if (opts.unit === STOCK_UNIT_NONE) {
        if (u.length > 0) return false;
      } else if (u !== opts.unit) return false;
    }
    return true;
  });
}

type Props = {
  warehouseId: number;
  warehouseName: string;
  active: boolean;
  onDeleted: () => void;
  /** Son hareket kartları; depo hareketleri sekmesiyle birleştirildiğinde false. */
  hideRecentMovements?: boolean;
  onOpenMovementsTab?: () => void;
  /** Genel bilgi sekmesine taşındığında false (alt kısımdaki «Depoyu sil» gizlenir). */
  showDeleteWarehouseButton?: boolean;
};

export function WarehouseOperationsTab({
  warehouseId,
  warehouseName,
  active,
  onDeleted,
  hideRecentMovements = false,
  onOpenMovementsTab,
  showDeleteWarehouseButton = true,
}: Props) {
  const { t } = useI18n();
  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [stockGroupMode, setStockGroupMode] = useState<WarehouseStockGroupMode>("parent");
  const [stockSearch, setStockSearch] = useState("");
  const [stockMinQty, setStockMinQty] = useState("");
  const [stockMaxQty, setStockMaxQty] = useState("");
  const [stockLevel, setStockLevel] = useState<"all" | "positive" | "zero">("all");
  const [stockUnit, setStockUnit] = useState("");

  const stockFilters = useMemo(
    () => ({
      categoryId: warehouseScopeEffectiveCategoryId(scope) ?? undefined,
      parentProductId: scope.parentProductId ?? undefined,
      productId: scope.productId ?? undefined,
    }),
    [scope]
  );

  const { data: stockRowsRaw = [], isPending: stockLoading } = useWarehouseStock(
    active ? warehouseId : null,
    stockFilters
  );
  const { data: branches = [], isPending: branchesLoading } = useBranchesList();
  const { data: productCatalog = [], isPending: catLoading } = useProductsCatalog();
  const { data: productCategories = [] } = useProductCategories(active);
  const { data: peopleRaw = [], isPending: peopleLoading } = useWarehousePeopleOptions(active);
  const personnelOptions = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );

  useEffect(() => {
    if (active) setMovementDate(localIsoDate());
  }, [active, warehouseId]);

  useEffect(() => {
    setScope({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    });
    setFiltersDrawerOpen(false);
    setStockSearch("");
    setStockMinQty("");
    setStockMaxQty("");
    setStockLevel("all");
    setStockUnit("");
  }, [warehouseId]);

  useEffect(() => {
    setStockGroupMode("parent");
  }, [warehouseId]);

  const minQtyParsed = useMemo(() => parseOptionalQty(stockMinQty), [stockMinQty]);
  const maxQtyParsed = useMemo(() => parseOptionalQty(stockMaxQty), [stockMaxQty]);

  const stockRowsFiltered = useMemo(
    () =>
      filterWarehouseStockRowsClient(stockRowsRaw, {
        q: stockSearch,
        minQty: minQtyParsed,
        maxQty: maxQtyParsed,
        level: stockLevel,
        unit: stockUnit,
      }),
    [stockRowsRaw, stockSearch, minQtyParsed, maxQtyParsed, stockLevel, stockUnit]
  );

  const stockOpsFiltersActive = useMemo(() => {
    if (warehouseScopeFiltersActive(scope)) return true;
    if (stockGroupMode !== "parent") return true;
    if (stockSearch.trim().length > 0) return true;
    if (minQtyParsed != null || maxQtyParsed != null) return true;
    if (stockLevel !== "all") return true;
    if (stockUnit !== "") return true;
    return false;
  }, [scope, stockGroupMode, stockSearch, minQtyParsed, maxQtyParsed, stockLevel, stockUnit]);

  const stockUnitOptions: SelectOption[] = useMemo(() => {
    const withUnit = new Set<string>();
    let hasEmpty = false;
    for (const r of stockRowsRaw) {
      const u = (r.unit ?? "").trim();
      if (!u) hasEmpty = true;
      else withUnit.add(u);
    }
    const sorted = [...withUnit].sort((a, b) => a.localeCompare(b, "tr"));
    const opts: SelectOption[] = [{ value: "", label: t("warehouse.stockOpsFilterUnitAll") }];
    if (hasEmpty) opts.push({ value: STOCK_UNIT_NONE, label: t("warehouse.stockOpsFilterUnitNone") });
    for (const u of sorted) opts.push({ value: u, label: u });
    return opts;
  }, [stockRowsRaw, t]);

  const stockLevelOptions: SelectOption[] = useMemo(
    () => [
      { value: "all", label: t("warehouse.stockOpsFilterStockLevelAll") },
      { value: "positive", label: t("warehouse.stockOpsFilterStockLevelPositive") },
      { value: "zero", label: t("warehouse.stockOpsFilterStockLevelZero") },
    ],
    [t]
  );

  const clearAllStockOpsFilters = () => {
    setScope({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    });
    setStockGroupMode("parent");
    setStockSearch("");
    setStockMinQty("");
    setStockMaxQty("");
    setStockLevel("all");
    setStockUnit("");
    setFiltersDrawerOpen(false);
  };

  useEffect(() => {
    if (stockUnit === "") return;
    const valid = stockUnitOptions.some((o) => o.value === stockUnit);
    if (!valid) setStockUnit("");
  }, [stockUnit, stockUnitOptions]);

  const delWh = useSoftDeleteWarehouse();
  const movement = useRegisterWarehouseMovement();
  const transferPreview = usePreviewWarehouseTransferToBranch();
  const toBranch = useTransferWarehouseToBranch();

  const quickDisabled = stockLoading || catLoading || peopleLoading;

  const stockSections = useMemo(
    () =>
      buildWarehouseStockGroupedSections(
        stockGroupMode,
        stockRowsFiltered,
        productCatalog,
        productCategories
      ),
    [stockGroupMode, stockRowsFiltered, productCatalog, productCategories]
  );

  const showStockSectionHeaders =
    stockGroupMode === "category" || stockGroupMode === "subcategory";

  const stockGroupOptions = useMemo(
    () => [
      { value: "parent", label: t("warehouse.stockGroupByParent") },
      { value: "category", label: t("warehouse.stockGroupByCategory") },
      { value: "subcategory", label: t("warehouse.stockGroupBySubcategory") },
      { value: "product", label: t("warehouse.stockGroupByProduct") },
    ],
    [t]
  );
  const branchOptions = branches.map((b) => ({
    value: String(b.id),
    label: b.name,
  }));
  const branchesReady = !branchesLoading && branches.length > 0;

  const onDeleteWarehouse = () => {
    notifyWarehouseDeleteConfirm({
      warehouseId,
      name: warehouseName,
      title: t("warehouse.deleteWarehouse"),
      body: t("warehouse.confirmDeleteWarehouse"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await delWh.mutateAsync(warehouseId);
          notify.success(t("toast.warehouseDeleted"));
          onDeleted();
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {!hideRecentMovements && onOpenMovementsTab ? (
        <WarehouseOperationsRecentMovements
          warehouseId={warehouseId}
          enabled={active}
          onViewAllMovements={onOpenMovementsTab}
        />
      ) : null}

      <p className="text-sm text-zinc-500">{t("warehouse.stockHint")}</p>

      <div className="max-w-full sm:max-w-xs">
        <DateField
          label={t("warehouse.quickMovementDate")}
          labelRequired
          required
          value={movementDate}
          onChange={(e) => setMovementDate(e.target.value)}
          disabled={quickDisabled}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-b border-zinc-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h3 className="min-w-0 text-sm font-semibold text-zinc-900 sm:text-base">{t("warehouse.stockTitle")}</h3>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Tooltip content={t("warehouse.stockOpsFiltersToggle")} delayMs={220}>
            <button
              type="button"
              className="relative flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              aria-expanded={filtersDrawerOpen}
              aria-haspopup="dialog"
              aria-label={t("warehouse.stockOpsFiltersToggle")}
              onClick={() => setFiltersDrawerOpen(true)}
            >
              <FilterFunnelIcon className="h-5 w-5" />
              {stockOpsFiltersActive ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </button>
          </Tooltip>
        </div>
      </div>
      {stockRowsRaw.length > 0 && stockRowsFiltered.length !== stockRowsRaw.length ? (
        <p className="text-xs text-zinc-600 sm:text-sm">
          {t("warehouse.stockOpsShowingFiltered")
            .replace("{{shown}}", String(stockRowsFiltered.length))
            .replace("{{total}}", String(stockRowsRaw.length))}
        </p>
      ) : null}

      <RightDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        title={t("warehouse.stockOpsFiltersTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">{t("warehouse.stockOpsFiltersDrawerHint")}</p>
          <WarehouseProductScopeFilters
            value={scope}
            onChange={setScope}
            disabled={quickDisabled}
            menuZIndex={DRAWER_SELECT_Z}
          />
          <div className="min-w-0">
            <Select
              name="wh-stock-group-mode"
              label={t("warehouse.stockGroupByLabel")}
              options={stockGroupOptions}
              value={stockGroupMode}
              onChange={(e) => setStockGroupMode(e.target.value as WarehouseStockGroupMode)}
              onBlur={() => {}}
              disabled={quickDisabled}
              menuZIndex={DRAWER_SELECT_Z}
              className="min-w-0 max-w-full"
            />
            <p className="mt-1.5 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
              {t("warehouse.stockGroupByHint")}
            </p>
          </div>
          <Input
            name="wh-stock-search"
            label={t("warehouse.stockOpsFilterSearchLabel")}
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder={t("warehouse.stockOpsFilterSearchPlaceholder")}
            disabled={quickDisabled}
            autoComplete="off"
            className="min-h-11 text-base sm:text-sm"
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              name="wh-stock-min-qty"
              label={t("warehouse.stockOpsFilterMinQty")}
              value={stockMinQty}
              onChange={(e) => setStockMinQty(e.target.value)}
              inputMode="decimal"
              disabled={quickDisabled}
              className="min-h-11 text-base sm:text-sm"
            />
            <Input
              name="wh-stock-max-qty"
              label={t("warehouse.stockOpsFilterMaxQty")}
              value={stockMaxQty}
              onChange={(e) => setStockMaxQty(e.target.value)}
              inputMode="decimal"
              disabled={quickDisabled}
              className="min-h-11 text-base sm:text-sm"
            />
          </div>
          <p className="text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">{t("warehouse.stockOpsFilterQtyHelp")}</p>
          <Select
            name="wh-stock-level"
            label={t("warehouse.stockOpsFilterStockLevel")}
            options={stockLevelOptions}
            value={stockLevel}
            onChange={(e) => setStockLevel(e.target.value as "all" | "positive" | "zero")}
            onBlur={() => {}}
            disabled={quickDisabled}
            menuZIndex={DRAWER_SELECT_Z}
            className="min-w-0 max-w-full"
          />
          <Select
            name="wh-stock-unit"
            label={t("warehouse.stockOpsFilterUnit")}
            options={stockUnitOptions}
            value={stockUnit}
            onChange={(e) => setStockUnit(e.target.value)}
            onBlur={() => {}}
            disabled={quickDisabled || stockUnitOptions.length <= 1}
            menuZIndex={DRAWER_SELECT_Z}
            className="min-w-0 max-w-full"
          />
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="min-h-11 w-full"
              onClick={() => setFiltersDrawerOpen(false)}
            >
              {t("warehouse.stockOpsFiltersApplyClose")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              disabled={!stockOpsFiltersActive}
              onClick={clearAllStockOpsFilters}
            >
              {t("warehouse.stockOpsFiltersClearAll")}
            </Button>
          </div>
        </div>
      </RightDrawer>

      {stockLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {stockSections.map((sec) => (
              <div key={sec.sectionId} className="flex flex-col gap-2">
                {showStockSectionHeaders ? (
                  <WarehouseStockSectionHeader
                    variant="card"
                    title={
                      isUncategorizedSection(sec.sectionId)
                        ? t("warehouse.stockSectionUncategorized")
                        : sec.title
                    }
                    unitTotals={sec.unitTotals}
                  />
                ) : null}
                {sec.blocks.map((b) =>
                  b.kind === "group" ? (
                    <div key={`g-${b.parentId}`} className="flex flex-col gap-2">
                      <WarehouseStockGroupHeader
                        variant="card"
                        parentName={b.parentName}
                        unit={b.unit}
                        totalQty={b.totalQty}
                        variantsSumQty={b.variantsSumQty}
                        parentDirectQty={b.parentDirectQty}
                        hasVariantsInCatalog={b.hasVariantsInCatalog}
                      />
                      {b.children.map((r) => (
                        <WarehouseStockLine
                          key={r.productId}
                          variant="card"
                          row={r}
                          isVariantLine
                          warehouseId={warehouseId}
                          movementDate={movementDate}
                          branchOptions={branchOptions}
                          branchesReady={branchesReady}
                          disabled={quickDisabled}
                          movementMutate={movement.mutateAsync}
                          transferPreviewMutate={transferPreview.mutateAsync}
                          transferMutate={toBranch.mutateAsync}
                          personnelOptions={personnelOptions}
                        />
                      ))}
                    </div>
                  ) : (
                    <WarehouseStockLine
                      key={b.row.productId}
                      variant="card"
                      row={b.row}
                      warehouseId={warehouseId}
                      movementDate={movementDate}
                      branchOptions={branchOptions}
                      branchesReady={branchesReady}
                      disabled={quickDisabled}
                      movementMutate={movement.mutateAsync}
                      transferPreviewMutate={transferPreview.mutateAsync}
                      transferMutate={toBranch.mutateAsync}
                      personnelOptions={personnelOptions}
                    />
                  )
                )}
              </div>
            ))}
          </div>

          <div className="-mx-1 hidden overflow-x-auto md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("warehouse.productName")}</TableHeader>
                  <TableHeader>{t("warehouse.productUnit")}</TableHeader>
                  <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                  <TableHeader className="min-w-[240px] text-right">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockSections.map((sec) => (
                  <Fragment key={sec.sectionId}>
                    {showStockSectionHeaders ? (
                      <WarehouseStockSectionHeader
                        variant="table"
                        title={
                          isUncategorizedSection(sec.sectionId)
                            ? t("warehouse.stockSectionUncategorized")
                            : sec.title
                        }
                        unitTotals={sec.unitTotals}
                      />
                    ) : null}
                    {sec.blocks.map((b) =>
                      b.kind === "group" ? (
                        <Fragment key={`g-${b.parentId}`}>
                          <WarehouseStockGroupHeader
                            variant="table"
                            parentName={b.parentName}
                            unit={b.unit}
                            totalQty={b.totalQty}
                            variantsSumQty={b.variantsSumQty}
                            parentDirectQty={b.parentDirectQty}
                            hasVariantsInCatalog={b.hasVariantsInCatalog}
                          />
                          {b.children.map((r) => (
                            <WarehouseStockLine
                              key={r.productId}
                              variant="table"
                              row={r}
                              isVariantLine
                              warehouseId={warehouseId}
                              movementDate={movementDate}
                              branchOptions={branchOptions}
                              branchesReady={branchesReady}
                              disabled={quickDisabled}
                              movementMutate={movement.mutateAsync}
                              transferPreviewMutate={transferPreview.mutateAsync}
                              transferMutate={toBranch.mutateAsync}
                              personnelOptions={personnelOptions}
                            />
                          ))}
                        </Fragment>
                      ) : (
                        <WarehouseStockLine
                          key={b.row.productId}
                          variant="table"
                          row={b.row}
                          warehouseId={warehouseId}
                          movementDate={movementDate}
                          branchOptions={branchOptions}
                          branchesReady={branchesReady}
                          disabled={quickDisabled}
                          movementMutate={movement.mutateAsync}
                          transferPreviewMutate={transferPreview.mutateAsync}
                          transferMutate={toBranch.mutateAsync}
                          personnelOptions={personnelOptions}
                        />
                      )
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {showDeleteWarehouseButton ? (
        <div className="border-t border-zinc-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full text-red-700 ring-red-200 hover:bg-red-50"
            onClick={onDeleteWarehouse}
            disabled={delWh.isPending}
          >
            {t("warehouse.deleteWarehouse")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
