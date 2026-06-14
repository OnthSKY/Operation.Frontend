"use client";

import { useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import {
  fetchSalesPriceHistory,
  fetchSalesPriceSuggestion,
  type SalesPriceSuggestion,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";
import type { ProductCostHistoryRow } from "@/types/product-cost";
import type { useOasSuggestions } from "@/modules/order-account-statement/hooks/useOasSuggestions";

/**
 * Ürün maliyet & satış fiyatı önerileri + bunları satıra uygulayan akış:
 *  - latestCostByProductId map'i (cost history ilk satırı = en güncel),
 *  - productPricingCostRows (modal için filtrelenmiş geçmiş),
 *  - activeCounterparty (linkedBranchId / customerAccountIdText),
 *  - loadSalesSuggestionForLine helper'ı,
 *  - productPricingOpen iken price history fetch effect'i,
 *  - activeCounterparty değişince mevcut satırlar için (sessiz) öneri yükle.
 *
 * SRP: yalnızca fiyat türetme + yan etki. Counterparty değişimine reaktif.
 */
type Params = {
  locale: "tr" | "en";
  linkedBranchId: string;
  customerAccountIdText: string;
  costHistoryRows: ProductCostHistoryRow[];
  suggestions: ReturnType<typeof useOasSuggestions>;
  setLines: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  /** Mevcut satırların ref'i — closure-stale önlemek için. */
  linesRef: MutableRefObject<LineDraft[]>;
};

export function useOasPricingEffects(p: Params) {
  const latestCostByProductId = useMemo(() => {
    const map = new Map<number, ProductCostHistoryRow>();
    for (const row of p.costHistoryRows) {
      if (!map.has(row.productId)) map.set(row.productId, row);
    }
    return map;
  }, [p.costHistoryRows]);

  const productPricingCostRows = useMemo(() => {
    if (p.suggestions.productPricingProductId <= 0) return [];
    return p.costHistoryRows
      .filter((r) => r.productId === p.suggestions.productPricingProductId)
      .slice()
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [p.costHistoryRows, p.suggestions.productPricingProductId]);

  const activeCounterparty = useMemo(() => {
    const branchId = Number.parseInt(p.linkedBranchId, 10);
    if (Number.isFinite(branchId) && branchId > 0) {
      return { counterpartyType: "branch" as const, counterpartyId: branchId };
    }
    const customerId = Number.parseInt(p.customerAccountIdText, 10);
    if (Number.isFinite(customerId) && customerId > 0) {
      return { counterpartyType: "customer" as const, counterpartyId: customerId };
    }
    return null;
  }, [p.linkedBranchId, p.customerAccountIdText]);

  const loadSalesSuggestionForLine = useCallback(
    async (lineId: string, productId: number, applyIfEmpty = true) => {
      if (!activeCounterparty || !Number.isFinite(productId) || productId <= 0) return;
      try {
        const suggestion: SalesPriceSuggestion | null = await fetchSalesPriceSuggestion({
          productId,
          counterpartyType: activeCounterparty.counterpartyType,
          counterpartyId: activeCounterparty.counterpartyId,
          currencyCode: "TRY",
          lookbackDays: 90,
        });
        p.suggestions.setLinePriceSuggestionByLineId((prev) => ({
          ...prev,
          [lineId]: suggestion ?? undefined,
        }));
        if (!suggestion || !applyIfEmpty) return;
        const normalizedSuggested = formatLocaleAmountInput(
          Math.max(0, Number(suggestion.suggestedUnitPrice) || 0),
          p.locale
        );
        p.setLines((prev) =>
          prev.map((line) => {
            if (line.id !== lineId) return line;
            const current = (line.unitPriceText ?? "").trim();
            if (current.length > 0) return line;
            return {
              ...line,
              unitPriceText: normalizedSuggested,
              tryPerKgText: line.priceCalcMode === "kg" ? normalizedSuggested : line.tryPerKgText,
            };
          })
        );
      } catch {
        p.suggestions.setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      }
    },
    [activeCounterparty, p.locale, p.setLines, p.suggestions]
  );

  // Ürün-fiyat modal açıkken ilgili price history'yi çek.
  useEffect(() => {
    if (!p.suggestions.productPricingOpen) return;
    if (!activeCounterparty || p.suggestions.productPricingProductId <= 0) return;
    let cancelled = false;
    p.suggestions.setPriceHistoryBusy(true);
    void fetchSalesPriceHistory({
      productId: p.suggestions.productPricingProductId,
      counterpartyType: activeCounterparty.counterpartyType,
      counterpartyId: activeCounterparty.counterpartyId,
      currencyCode: "TRY",
      limit: 50,
    })
      .then((page) => {
        if (!cancelled) p.suggestions.setPriceHistoryRows(page.items);
      })
      .catch((e) => {
        if (!cancelled) notify.error(toErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) p.suggestions.setPriceHistoryBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.suggestions.productPricingOpen, p.suggestions.productPricingProductId, activeCounterparty]);

  // Counterparty değişimine reaktif: mevcut satırlar için sessiz öneri yükle.
  useEffect(() => {
    if (!activeCounterparty) return;
    for (const line of p.linesRef.current) {
      const pid = line.selectedProductId ?? 0;
      if (pid <= 0) continue;
      void loadSalesSuggestionForLine(line.id, pid, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCounterparty, loadSalesSuggestionForLine]);

  return {
    latestCostByProductId,
    productPricingCostRows,
    activeCounterparty,
    loadSalesSuggestionForLine,
  };
}
