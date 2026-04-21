"use client";

import { WarehouseMovementRowCard } from "@/modules/warehouse/components/WarehouseMovementRowCard";
import { useWarehouseMovementsPage } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import type { WarehouseMovementsPageParams } from "@/types/warehouse";
import { useMemo } from "react";

const PAGE_SIZE = 8;

type Props = {
  warehouseId: number;
  enabled: boolean;
  onViewAllMovements: () => void;
};

export function WarehouseOperationsRecentMovements({
  warehouseId,
  enabled,
  onViewAllMovements,
}: Props) {
  const { t, locale } = useI18n();
  const params = useMemo(
    (): WarehouseMovementsPageParams => ({
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    []
  );

  const { data, isPending, isError, error } = useWarehouseMovementsPage(
    warehouseId,
    params,
    enabled
  );

  const items = data?.items ?? [];
  const fmtDate = (iso: string) => formatLocaleDate(iso, locale);

  return (
    <div className="rounded-2xl border border-zinc-200/85 bg-zinc-50/40 p-4 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{t("warehouse.operationsRecentMovementsTitle")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">{t("warehouse.operationsRecentMovementsHint")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full shrink-0 sm:min-h-10 sm:w-auto"
          onClick={onViewAllMovements}
        >
          {t("warehouse.operationsViewAllMovements")}
        </Button>
      </div>
      {isError ? (
        <p className="mt-3 text-sm text-red-600">{toErrorMessage(error)}</p>
      ) : isPending && !data ? (
        <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">{t("warehouse.movementsEmpty")}</p>
      ) : (
        <ul className="mt-4 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {items.map((m) => (
            <li key={m.id} className="min-w-0">
              <WarehouseMovementRowCard m={m} fmtDate={fmtDate} t={t} hideShipmentGroup />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
