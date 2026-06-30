"use client";

import { useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import {
  fetchSalesPriceHistory,
  fetchSalesPriceSuggestion,
  fetchSalesPriceSuggestionsBatch,
  type SalesPriceSuggestion,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";
import type { ProductCostHistoryRow } from "@/types/product-cost";
import type { useOasSuggestions } from "@/modules/order-account-statement/hooks/useOasSuggestions";

/**
 * Ürün maliyet & satış fiyatı önerileri + bunları satıra uygulayan akış.
 *
 * Tasarım notları (regresyon hatırlatması):
 *  - `loadSalesSuggestionForLine` deps'inde tüm `suggestions` objesini TUTMA.
 *    Parent her render'da yeni obje verir → callback yenilenir → effect
 *    yeniden tetiklenir → fetch → setState → render → SONSUZ DÖNGÜ + 429.
 *    Sadece kullandığımız `setLinePriceSuggestionByLineId` setter referansını al;
 *    useState setter'ları zaten kararlıdır.
 *  - Counterparty değişimine reaktif effect, satır-başına N istek yerine
 *    TEK batch isteği atar (`fetchSalesPriceSuggestionsBatch`).
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
  const {
    setLinePriceSuggestionByLineId,
    productPricingOpen,
    productPricingProductId,
    setPriceHistoryBusy,
    setPriceHistoryRows,
  } = p.suggestions;

  const latestCostByProductId = useMemo(() => {
    const map = new Map<number, ProductCostHistoryRow>();
    for (const row of p.costHistoryRows) {
      if (!map.has(row.productId)) map.set(row.productId, row);
    }
    return map;
  }, [p.costHistoryRows]);

  const productPricingCostRows = useMemo(() => {
    if (productPricingProductId <= 0) return [];
    return p.costHistoryRows
      .filter((r) => r.productId === productPricingProductId)
      .slice()
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [p.costHistoryRows, productPricingProductId]);

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
        setLinePriceSuggestionByLineId((prev) => ({
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
            return { ...line, unitPriceText: normalizedSuggested };
          })
        );
      } catch {
        setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      }
    },
    [activeCounterparty, p.locale, p.setLines, setLinePriceSuggestionByLineId]
  );

  /** Modaldaki "Bu fiyatı kullan": ekranda görünen öneriyi satırın birim
   *  fiyatına (üzerine yazarak) uygular. Yeniden fetch etmez. */
  const applySuggestedSalesPriceToLine = useCallback(
    (lineId: string, suggestion: SalesPriceSuggestion | null | undefined) => {
      if (!suggestion) return;
      const normalized = formatLocaleAmountInput(
        Math.max(0, Number(suggestion.suggestedUnitPrice) || 0),
        p.locale
      );
      p.setLines((prev) =>
        prev.map((line) => (line.id === lineId ? { ...line, unitPriceText: normalized } : line))
      );
    },
    [p.locale, p.setLines]
  );

  /** Üstteki "Tüm fiyatları getir": ürünü olan tüm satırlar için tek batch
   *  isteğiyle satış önerisini çekip, mevcut fiyatların ÜZERİNE yazar. */
  const applyAllSalesSuggestions = useCallback(async () => {
    if (!activeCounterparty) {
      notify.error("Önce bir cari (şube/müşteri) seçin.");
      return;
    }
    const lineList = p.linesRef.current;
    const lineByProduct = new Map<number, string[]>();
    for (const line of lineList) {
      const pid = line.selectedProductId ?? 0;
      if (pid <= 0) continue;
      const arr = lineByProduct.get(pid) ?? [];
      arr.push(line.id);
      lineByProduct.set(pid, arr);
    }
    const productIds = Array.from(lineByProduct.keys());
    if (productIds.length === 0) {
      notify.error("Fiyat getirilecek ürünlü satır yok.");
      return;
    }
    try {
      const mapByProduct = await fetchSalesPriceSuggestionsBatch({
        productIds,
        counterpartyType: activeCounterparty.counterpartyType,
        counterpartyId: activeCounterparty.counterpartyId,
        currencyCode: "TRY",
        lookbackDays: 90,
      });
      setLinePriceSuggestionByLineId((prev) => {
        const next = { ...prev };
        for (const [pid, lineIds] of lineByProduct) {
          const suggestion = mapByProduct[pid];
          for (const lid of lineIds) next[lid] = suggestion ?? undefined;
        }
        return next;
      });
      const priceByLineId = new Map<string, string>();
      for (const [pid, lineIds] of lineByProduct) {
        const suggestion = mapByProduct[pid];
        if (!suggestion) continue;
        const normalized = formatLocaleAmountInput(
          Math.max(0, Number(suggestion.suggestedUnitPrice) || 0),
          p.locale
        );
        for (const lid of lineIds) priceByLineId.set(lid, normalized);
      }
      if (priceByLineId.size === 0) {
        notify.info("Bu cariye uygun satış önerisi bulunamadı.");
        return;
      }
      p.setLines((prev) =>
        prev.map((line) =>
          priceByLineId.has(line.id)
            ? { ...line, unitPriceText: priceByLineId.get(line.id)! }
            : line
        )
      );
      notify.success(`${priceByLineId.size} satırın fiyatı güncellendi.`);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [activeCounterparty, p.linesRef, p.locale, p.setLines, setLinePriceSuggestionByLineId]);

  // Ürün-fiyat modal açıkken ilgili price history'yi çek.
  useEffect(() => {
    if (!productPricingOpen) return;
    if (!activeCounterparty || productPricingProductId <= 0) return;
    let cancelled = false;
    setPriceHistoryBusy(true);
    void fetchSalesPriceHistory({
      productId: productPricingProductId,
      counterpartyType: activeCounterparty.counterpartyType,
      counterpartyId: activeCounterparty.counterpartyId,
      currencyCode: "TRY",
      limit: 50,
    })
      .then((page) => {
        if (!cancelled) setPriceHistoryRows(page.items);
      })
      .catch((e) => {
        if (!cancelled) notify.error(toErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setPriceHistoryBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    productPricingOpen,
    productPricingProductId,
    activeCounterparty,
    setPriceHistoryBusy,
    setPriceHistoryRows,
  ]);

  // Counterparty değişimine reaktif: tüm mevcut satırlar için TEK batch çağrısı.
  useEffect(() => {
    if (!activeCounterparty) return;
    const lineList = p.linesRef.current;
    const lineByProduct = new Map<number, string[]>();
    for (const line of lineList) {
      const pid = line.selectedProductId ?? 0;
      if (pid <= 0) continue;
      const arr = lineByProduct.get(pid) ?? [];
      arr.push(line.id);
      lineByProduct.set(pid, arr);
    }
    const productIds = Array.from(lineByProduct.keys());
    if (productIds.length === 0) return;

    let cancelled = false;
    void fetchSalesPriceSuggestionsBatch({
      productIds,
      counterpartyType: activeCounterparty.counterpartyType,
      counterpartyId: activeCounterparty.counterpartyId,
      currencyCode: "TRY",
      lookbackDays: 90,
    })
      .then((mapByProduct) => {
        if (cancelled) return;
        setLinePriceSuggestionByLineId((prev) => {
          const next = { ...prev };
          for (const [pid, lineIds] of lineByProduct) {
            const suggestion = mapByProduct[pid];
            for (const lid of lineIds) next[lid] = suggestion ?? undefined;
          }
          return next;
        });
      })
      .catch((e) => {
        // Satırı bozmuyoruz ama kullanıcı "öneri neden gelmedi" diye sormasın diye
        // görünür bir uyarı bırakıyoruz. 429 buraya da düşer.
        if (!cancelled) notify.info(toErrorMessage(e));
      });

    return () => {
      cancelled = true;
    };
  }, [activeCounterparty, setLinePriceSuggestionByLineId, p.linesRef]);

  return {
    latestCostByProductId,
    productPricingCostRows,
    activeCounterparty,
    loadSalesSuggestionForLine,
    applySuggestedSalesPriceToLine,
    applyAllSalesSuggestions,
  };
}
