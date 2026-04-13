"use client";

import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import { TableCell, TableRow } from "@/shared/ui/Table";
import type { WarehouseStockUnitTotal } from "@/modules/warehouse/lib/warehouse-stock-grouped-sections";

function totalsLine(unitTotals: WarehouseStockUnitTotal[], locale: Locale): string {
  if (unitTotals.length === 0) return "";
  return unitTotals
    .map((x) => {
      const n = formatLocaleAmount(x.qty, locale);
      return x.unit?.trim() ? `${n} ${x.unit.trim()}` : n;
    })
    .join(" · ");
}

type Props = {
  title: string;
  unitTotals: WarehouseStockUnitTotal[];
  variant: "card" | "table";
};

export function WarehouseStockSectionHeader({ title, unitTotals, variant }: Props) {
  const { t, locale } = useI18n();
  const line = totalsLine(unitTotals, locale);

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-emerald-200/75 bg-gradient-to-br from-emerald-50/90 to-white px-3 py-2.5 shadow-sm ring-1 ring-emerald-100/50 sm:px-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900/80">
          {t("warehouse.stockSectionEyebrow")}
        </p>
        <p className="mt-0.5 text-base font-semibold leading-snug text-zinc-900">{title}</p>
        {line ? (
          <p className="mt-1 text-sm tabular-nums text-emerald-950/90">{line}</p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">{t("warehouse.stockSectionNoQty")}</p>
        )}
      </div>
    );
  }

  return (
    <TableRow className="bg-emerald-50/35">
      <TableCell colSpan={4} className="py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900/80">
          {t("warehouse.stockSectionEyebrow")}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-zinc-900">{title}</p>
        {line ? (
          <p className="mt-1 text-sm tabular-nums text-emerald-950/90">{line}</p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">{t("warehouse.stockSectionNoQty")}</p>
        )}
      </TableCell>
    </TableRow>
  );
}
