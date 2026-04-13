"use client";

import { useI18n } from "@/i18n/context";
import { TableCell, TableRow } from "@/shared/ui/Table";

type Props = {
  parentName: string;
  unit: string | null;
  totalQty: number;
  variant: "card" | "table";
};

export function WarehouseStockGroupHeader({ parentName, unit, totalQty, variant }: Props) {
  const { t } = useI18n();
  if (variant === "card") {
    return (
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 px-3 py-2.5 ring-1 ring-violet-100">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
              {t("warehouse.stockGroupTotal")}
            </p>
            <p className="mt-0.5 font-semibold text-violet-950">{parentName}</p>
            {unit?.trim() ? (
              <p className="text-xs text-violet-800/80">
                {t("warehouse.productUnit")}: {unit}
              </p>
            ) : null}
          </div>
          <p className="text-xl font-bold tabular-nums text-violet-950">{totalQty}</p>
        </div>
      </div>
    );
  }

  return (
    <TableRow className="bg-violet-50/40">
      <TableCell>
        <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
          {t("warehouse.stockGroupTotal")}
        </div>
        <div className="font-semibold text-violet-950">{parentName}</div>
      </TableCell>
      <TableCell className="text-violet-900/90">{unit?.trim() ? unit : "—"}</TableCell>
      <TableCell className="text-right text-base font-bold tabular-nums text-violet-950">
        {totalQty}
      </TableCell>
      <TableCell className="text-sm text-zinc-400">—</TableCell>
    </TableRow>
  );
}
