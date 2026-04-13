"use client";

import { estimateWarehouseTransferGoodsValuation } from "@/modules/warehouse/api/warehouse-transfer-api";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import { useEffect, useState } from "react";

type Line = { productId: number; quantity: number };

type Props = {
  warehouseId: number | null;
  lines: Line[];
  enabled: boolean;
  onApplySuggestedFreight: (amountDecimalString: string) => void;
};

export function WarehouseTransferFreightValuationBar({
  warehouseId,
  lines,
  enabled,
  onApplySuggestedFreight,
}: Props) {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof estimateWarehouseTransferGoodsValuation>> | null>(
    null
  );

  useEffect(() => {
    if (!enabled || warehouseId == null || warehouseId <= 0 || lines.length === 0) {
      setData(null);
      return;
    }
    const ac = new AbortController();
    const tmr = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const r = await estimateWarehouseTransferGoodsValuation(
            { warehouseId, lines },
            ac.signal
          );
          if (!ac.signal.aborted) setData(r);
        } catch {
          if (!ac.signal.aborted) setData(null);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, 350);
    return () => {
      ac.abort();
      window.clearTimeout(tmr);
    };
  }, [enabled, warehouseId, lines]);

  if (!enabled || warehouseId == null || warehouseId <= 0 || lines.length === 0) return null;

  if (loading && !data) {
    return (
      <p className="text-xs text-zinc-500">{t("warehouse.transferValuationLoading")}</p>
    );
  }

  if (!data || data.estimatedGoodsValue <= 0) {
    return (
      <p className="text-xs text-zinc-500">{t("warehouse.transferValuationUnavailable")}</p>
    );
  }

  const cur = data.currencyCode?.trim() || "TRY";
  const goods = formatLocaleAmount(data.estimatedGoodsValue, locale, cur);
  const sugg = formatLocaleAmount(data.suggestedFreightAmount, locale, cur);

  return (
    <div className="rounded-lg border border-violet-200/80 bg-violet-50/50 px-3 py-2.5 text-xs leading-snug text-zinc-700">
      <p>
        <span className="font-semibold text-zinc-800">{t("warehouse.transferValuationGoods")}</span>{" "}
        {goods}
      </p>
      <p className="mt-1">
        <span className="font-semibold text-zinc-800">{t("warehouse.transferValuationFreightSuggest")}</span>{" "}
        {sugg}
        <span className="text-zinc-500"> ({t("warehouse.transferValuationFreightRateHint")})</span>
      </p>
      {data.mixedCurrency ? (
        <p className="mt-1 font-medium text-amber-800">{t("warehouse.transferValuationMixedCurrency")}</p>
      ) : null}
      {data.linesWithoutValuation > 0 ? (
        <p className="mt-1 text-zinc-600">
          {t("warehouse.transferValuationPartialLines")} ({data.linesWithoutValuation})
        </p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="mt-2 min-h-9 w-full text-xs sm:w-auto"
        onClick={() => onApplySuggestedFreight(String(data.suggestedFreightAmount))}
      >
        {t("warehouse.transferValuationApplyFreight")}
      </Button>
    </div>
  );
}
