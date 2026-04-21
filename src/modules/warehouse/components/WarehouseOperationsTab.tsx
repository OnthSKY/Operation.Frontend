"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductCategories, useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
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
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Fragment, useEffect, useMemo, useState } from "react";

type Props = {
  warehouseId: number;
  warehouseName: string;
  active: boolean;
  onOpenAddProduct: () => void;
  onDeleted: () => void;
  /** Son hareket kartları; depo hareketleri sekmesiyle birleştirildiğinde false. */
  hideRecentMovements?: boolean;
  onOpenMovementsTab?: () => void;
};

export function WarehouseOperationsTab({
  warehouseId,
  warehouseName,
  active,
  onOpenAddProduct,
  onDeleted,
  hideRecentMovements = false,
  onOpenMovementsTab,
}: Props) {
  const { t } = useI18n();
  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [stockGroupMode, setStockGroupMode] = useState<WarehouseStockGroupMode>("parent");

  const stockFilters = useMemo(
    () => ({
      categoryId: warehouseScopeEffectiveCategoryId(scope) ?? undefined,
      parentProductId: scope.parentProductId ?? undefined,
      productId: scope.productId ?? undefined,
    }),
    [scope]
  );

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
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
  }, [warehouseId]);

  useEffect(() => {
    setStockGroupMode("parent");
  }, [warehouseId]);

  const delWh = useSoftDeleteWarehouse();
  const movement = useRegisterWarehouseMovement();
  const toBranch = useTransferWarehouseToBranch();

  const quickDisabled = stockLoading || catLoading || peopleLoading;

  const stockSections = useMemo(
    () =>
      buildWarehouseStockGroupedSections(
        stockGroupMode,
        stockRows,
        productCatalog,
        productCategories
      ),
    [stockGroupMode, stockRows, productCatalog, productCategories]
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-full sm:max-w-xs sm:flex-1">
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={quickDisabled}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full shrink-0 sm:min-h-10 sm:w-auto"
          onClick={onOpenAddProduct}
        >
          {t("warehouse.addProduct")}
        </Button>
      </div>

      <CollapsibleMobileFilters
        title={t("warehouse.scopeFiltersTitle")}
        toggleAriaLabel={t("warehouse.scopeFiltersToggle")}
        expandLabel={t("warehouse.scopeExpand")}
        collapseLabel={t("warehouse.scopeCollapse")}
        resetKey={warehouseId}
        active={warehouseScopeFiltersActive(scope)}
      >
        <WarehouseProductScopeFilters value={scope} onChange={setScope} disabled={quickDisabled} />
      </CollapsibleMobileFilters>

      <div className="flex flex-col gap-2">
        <Select
          name="wh-stock-group-mode"
          label={t("warehouse.stockGroupByLabel")}
          options={stockGroupOptions}
          value={stockGroupMode}
          onChange={(e) => setStockGroupMode(e.target.value as WarehouseStockGroupMode)}
          onBlur={() => {}}
          disabled={quickDisabled}
          className="min-h-11 sm:min-h-10 sm:max-w-md"
        />
        <p className="text-xs leading-relaxed text-zinc-500 sm:max-w-xl">
          {t("warehouse.stockGroupByHint")}
        </p>
      </div>

      <h3 className="text-sm font-semibold text-zinc-900">{t("warehouse.stockTitle")}</h3>

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
    </div>
  );
}
