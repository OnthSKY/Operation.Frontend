"use client";

import { useI18n } from "@/i18n/context";
import { TableCell, TableRow } from "@/shared/ui/Table";
import { Fragment } from "react";

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
      <p className="mt-1 max-w-[18rem] text-right text-xs font-medium leading-snug tabular-nums text-zinc-700">
        <span>
          {t("warehouse.stockGroupLabelVariants")}: {fmt(variantsSumQty)}
        </span>
        <span className="mx-1.5 text-zinc-400">·</span>
        <span>
          {t("warehouse.stockGroupLabelParentDirect")}: {fmt(parentDirectQty)}
        </span>
      </p>
    );
  }
  if (parentDirectQty > 0 && variantsSumQty === 0 && hasVariantsInCatalog) {
    return (
      <p className="mt-1 max-w-[18rem] text-right text-xs leading-snug text-zinc-600">
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
      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("warehouse.stockGroupTotal")}
            </p>
            <p className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 sm:text-lg">{parentName}</p>
            {unit?.trim() ? (
              <p className="text-xs text-zinc-600">
                {t("warehouse.productUnit")}: {unit}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold tabular-nums text-zinc-900">{totalStr}</p>
            <div className="mt-1 flex flex-col items-end">{breakdown}</div>
          </div>
        </div>
        {hasVariantsInCatalog ? (
          <p className="mt-2 border-t border-zinc-200/80 pt-2 text-[0.65rem] leading-snug text-zinc-600">
            {t("warehouse.stockGroupHeaderChildRowsHint")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Fragment>
      <TableRow className="bg-zinc-50/90">
        <TableCell>
          <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
            {t("warehouse.stockGroupTotal")}
          </div>
          <div className="text-base font-semibold leading-snug text-zinc-900">{parentName}</div>
        </TableCell>
        <TableCell className="align-top text-zinc-700">{unit?.trim() ? unit : "—"}</TableCell>
        <TableCell className="align-top text-right">
          <div className="text-base font-bold tabular-nums text-zinc-900">{totalStr}</div>
          <div className="mt-1 flex flex-col items-end text-right">{breakdown}</div>
        </TableCell>
        <TableCell className="text-sm text-zinc-400">—</TableCell>
      </TableRow>
      {hasVariantsInCatalog ? (
        <TableRow className="bg-zinc-50/40">
          <TableCell colSpan={4} className="py-1.5 text-[0.65rem] leading-snug text-zinc-600">
            {t("warehouse.stockGroupHeaderChildRowsHint")}
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
