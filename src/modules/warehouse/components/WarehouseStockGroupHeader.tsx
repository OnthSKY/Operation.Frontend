"use client";

import { useI18n } from "@/i18n/context";
import { TableCell, TableRow } from "@/shared/ui/Table";

type Props = {
  parentName: string;
  unit: string | null;
  totalQty: number;
  variantsSumQty: number;
  parentDirectQty: number;
  hasVariantsInCatalog: boolean;
  variant: "card" | "table";
};

function formatWarehouseStockQty(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function StockGroupQtyBreakdown({
  variantsSumQty,
  parentDirectQty,
  hasVariantsInCatalog,
  t,
}: {
  variantsSumQty: number;
  parentDirectQty: number;
  hasVariantsInCatalog: boolean;
  t: (key: string) => string;
}) {
  const fmt = formatWarehouseStockQty;
  if (variantsSumQty > 0 && parentDirectQty > 0) {
    return (
      <p className="mt-1 max-w-[18rem] text-right text-xs font-medium leading-snug tabular-nums text-violet-900/90">
        <span>
          {t("warehouse.stockGroupLabelVariants")}: {fmt(variantsSumQty)}
        </span>
        <span className="mx-1.5 text-violet-700/70">·</span>
        <span>
          {t("warehouse.stockGroupLabelParentDirect")}: {fmt(parentDirectQty)}
        </span>
      </p>
    );
  }
  if (parentDirectQty > 0 && variantsSumQty === 0 && hasVariantsInCatalog) {
    return (
      <p className="mt-1 max-w-[18rem] text-right text-xs leading-snug text-violet-900/80">
        {t("warehouse.stockGroupParentDirectOnlyNote")}
      </p>
    );
  }
  return null;
}

export function WarehouseStockGroupHeader({
  parentName,
  unit,
  totalQty,
  variantsSumQty,
  parentDirectQty,
  hasVariantsInCatalog,
  variant,
}: Props) {
  const { t } = useI18n();
  const totalStr = formatWarehouseStockQty(totalQty);
  const breakdown = (
    <StockGroupQtyBreakdown
      variantsSumQty={variantsSumQty}
      parentDirectQty={parentDirectQty}
      hasVariantsInCatalog={hasVariantsInCatalog}
      t={t}
    />
  );

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 px-3 py-2.5 ring-1 ring-violet-100">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
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
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold tabular-nums text-violet-950">{totalStr}</p>
            <div className="mt-1 flex flex-col items-end">{breakdown}</div>
          </div>
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
      <TableCell className="align-top text-violet-900/90">{unit?.trim() ? unit : "—"}</TableCell>
      <TableCell className="align-top text-right">
        <div className="text-base font-bold tabular-nums text-violet-950">{totalStr}</div>
        <div className="mt-1 flex flex-col items-end text-right">{breakdown}</div>
      </TableCell>
      <TableCell className="text-sm text-zinc-400">—</TableCell>
    </TableRow>
  );
}
