"use client";

import { WarehouseOperationsTab } from "@/modules/warehouse/components/WarehouseOperationsTab";
import { useI18n } from "@/i18n/context";

type Props = {
  warehouseId: number;
  warehouseName: string;
  enabled: boolean;
  onDeleted: () => void;
};

/** Depo detay modalı — üst seviye «Stok işlemleri» sekmesi (giriş / şubeye çıkış). */
export function WarehouseDetailStockOperationsTab({
  warehouseId,
  warehouseName,
  enabled,
  onDeleted,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <section
        className="rounded-2xl border border-zinc-200/90 bg-zinc-50/30 p-4 shadow-sm ring-1 ring-zinc-950/[0.03] sm:p-5"
        aria-label={t("warehouse.movementsIntegratedStockTitle")}
      >
        <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">
          {t("warehouse.movementsIntegratedStockTitle")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
          {t("warehouse.movementsIntegratedStockHint")}
        </p>
        <div className="mt-4">
          <WarehouseOperationsTab
            warehouseId={warehouseId}
            warehouseName={warehouseName}
            active={enabled}
            onDeleted={onDeleted}
            hideRecentMovements
            showDeleteWarehouseButton={false}
          />
        </div>
      </section>
    </div>
  );
}
