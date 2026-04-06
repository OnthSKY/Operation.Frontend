"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { WarehouseStockLine } from "@/modules/warehouse/components/WarehouseStockLine";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  useRegisterWarehouseMovement,
  useSoftDeleteWarehouse,
  useTransferWarehouseToBranch,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useEffect, useMemo, useState } from "react";

type Props = {
  warehouseId: number;
  active: boolean;
  onOpenAddProduct: () => void;
  onDeleted: () => void;
};

export function WarehouseOperationsTab({
  warehouseId,
  active,
  onOpenAddProduct,
  onDeleted,
}: Props) {
  const { t } = useI18n();
  const [movementDate, setMovementDate] = useState(() => localIsoDate());

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
    active ? warehouseId : null
  );
  const { data: branches = [], isPending: branchesLoading } = useBranchesList();
  const { isPending: catLoading } = useProductsCatalog();
  const { data: personnelRaw = [], isPending: personnelLoading } = usePersonnelList();
  const personnelOptions = useMemo(
    () =>
      personnelRaw
        .filter((p) => !p.isDeleted)
        .map((p) => ({ value: String(p.id), label: p.fullName })),
    [personnelRaw]
  );

  useEffect(() => {
    if (active) setMovementDate(localIsoDate());
  }, [active, warehouseId]);

  const delWh = useSoftDeleteWarehouse();
  const movement = useRegisterWarehouseMovement();
  const toBranch = useTransferWarehouseToBranch();

  const quickDisabled = stockLoading || catLoading || personnelLoading;
  const branchOptions = branches.map((b) => ({
    value: String(b.id),
    label: b.name,
  }));
  const branchesReady = !branchesLoading && branches.length > 0;

  const onDeleteWarehouse = async () => {
    if (!window.confirm(t("warehouse.confirmDeleteWarehouse"))) return;
    try {
      await delWh.mutateAsync(warehouseId);
      notify.success(t("toast.warehouseDeleted"));
      onDeleted();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">{t("warehouse.stockHint")}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-full sm:max-w-xs sm:flex-1">
          <Input
            type="date"
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

      <h3 className="text-sm font-semibold text-zinc-900">{t("warehouse.stockTitle")}</h3>

      {stockLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {stockRows.map((r) => (
              <WarehouseStockLine
                key={r.productId}
                variant="card"
                row={r}
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
                {stockRows.map((r) => (
                  <WarehouseStockLine
                    key={r.productId}
                    variant="table"
                    row={r}
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
          onClick={() => void onDeleteWarehouse()}
          disabled={delWh.isPending}
        >
          {t("warehouse.deleteWarehouse")}
        </Button>
      </div>
    </div>
  );
}
