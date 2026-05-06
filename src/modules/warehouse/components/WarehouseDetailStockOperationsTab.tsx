"use client";

import { WarehouseOperationsTab } from "@/modules/warehouse/components/WarehouseOperationsTab";

type Props = {
  warehouseId: number;
  warehouseName: string;
  enabled: boolean;
  onDeleted: () => void;
};

/** Depo detay modalı — «Stok işlemleri» sekmesi (giriş / şubeye çıkış). */
export function WarehouseDetailStockOperationsTab({
  warehouseId,
  warehouseName,
  enabled,
  onDeleted,
}: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <WarehouseOperationsTab
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        active={enabled}
        onDeleted={onDeleted}
        hideRecentMovements
        showDeleteWarehouseButton={false}
      />
    </div>
  );
}
