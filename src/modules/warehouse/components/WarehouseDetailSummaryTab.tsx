"use client";

import { WarehouseOverviewStorySection } from "@/modules/warehouse/components/WarehouseOverviewStorySection";
import { WarehouseSummaryKpiCards } from "@/modules/warehouse/components/WarehouseSummaryKpiCards";
import { useProductCategories, useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";

type Props = {
  warehouseId: number;
  enabled: boolean;
  onOpenMovementsTab?: () => void;
  onOpenInboundMovementsTab?: () => void;
};

export function WarehouseDetailSummaryTab({
  warehouseId,
  enabled,
  onOpenMovementsTab,
  onOpenInboundMovementsTab,
}: Props) {
  const { t } = useI18n();
  const { data: productCatalog = [] } = useProductsCatalog();
  const { data: productCategories = [] } = useProductCategories(enabled);

  return (
    <div className="flex min-h-0 flex-col gap-4 max-sm:gap-3">
      <section className="rounded-xl border border-zinc-200/85 bg-white p-3 shadow-sm ring-1 ring-zinc-950/[0.04] sm:rounded-2xl sm:p-5">
        <WarehouseSummaryKpiCards
          warehouseId={warehouseId}
          enabled={enabled}
          onOpenMovementsTab={onOpenMovementsTab}
          onOpenInboundMovementsTab={onOpenInboundMovementsTab}
        />
      </section>
      <section className="rounded-xl border border-zinc-200/85 bg-white p-3 shadow-sm ring-1 ring-zinc-950/[0.04] sm:rounded-2xl sm:p-5">
        <WarehouseOverviewStorySection
          warehouseId={warehouseId}
          active={enabled}
          productCatalog={productCatalog}
          productCategories={productCategories}
          onOpenMovementsTab={onOpenMovementsTab}
          storyTitle={t("warehouse.overviewBreakdownSectionTitle")}
          storyDescription={t("warehouse.overviewBreakdownSectionDesc")}
        />
      </section>
    </div>
  );
}
