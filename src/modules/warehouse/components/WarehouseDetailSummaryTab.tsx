"use client";

import { WarehouseOverviewStorySection } from "@/modules/warehouse/components/WarehouseOverviewStorySection";
import { WarehouseSummaryKpiCards } from "@/modules/warehouse/components/WarehouseSummaryKpiCards";
import { useProductCategories, useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";

type Props = {
  warehouseId: number;
  enabled: boolean;
  onOpenMovementsTab?: () => void;
};

export function WarehouseDetailSummaryTab({ warehouseId, enabled, onOpenMovementsTab }: Props) {
  const { t } = useI18n();
  const { data: productCatalog = [] } = useProductsCatalog();
  const { data: productCategories = [] } = useProductCategories(enabled);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200/85 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-5">
        <WarehouseSummaryKpiCards
          warehouseId={warehouseId}
          enabled={enabled}
          onOpenMovementsTab={onOpenMovementsTab}
        />
      </div>
      <div className="rounded-2xl border border-zinc-200/85 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-5">
        <WarehouseOverviewStorySection
          warehouseId={warehouseId}
          active={enabled}
          productCatalog={productCatalog}
          productCategories={productCategories}
          onOpenMovementsTab={onOpenMovementsTab}
          storyTitle={t("warehouse.overviewBreakdownSectionTitle")}
          storyDescription={t("warehouse.overviewBreakdownSectionDesc")}
        />
      </div>
    </div>
  );
}
