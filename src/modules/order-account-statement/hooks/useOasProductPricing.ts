"use client";

import { useCallback } from "react";
import {
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { newId } from "@/modules/order-account-statement/components/oas-helpers";
import type {
  LineDraft,
} from "@/modules/order-account-statement/components/oas-types";
import type { ProductListItem } from "@/types/product";
import type { ProductCostHistoryRow } from "@/types/product-cost";
import type { useOasSuggestions } from "@/modules/order-account-statement/hooks/useOasSuggestions";

/**
 * Ürün/fiyat panel yönetimi + seçilen ürünü satıra uygulama + alt ürünleri
 * parent ürüne göre gruplama.
 *
 * SRP: ürün-fiyat alanına özgü davranış. Counterparty + catalog gibi geniş
 * bağımlılıklar parametre olarak alınır; hook saf davranıştır.
 */
type Params = {
  t: (k: string) => string;
  locale: "tr" | "en";
  suggestions: ReturnType<typeof useOasSuggestions>;
  lines: LineDraft[];
  setLines: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  catalog: ProductListItem[];
  latestCostByProductId: Map<number, ProductCostHistoryRow>;
  activeCounterparty: { counterpartyType: string; counterpartyId: number } | null;
  loadSalesSuggestionForLine: (
    lineId: string,
    productId: number,
    force: boolean,
    unit?: string
  ) => Promise<void>;
};

export function useOasProductPricing(params: Params) {
  const {
    t,
    locale,
    suggestions,
    lines,
    setLines,
    catalog,
    latestCostByProductId,
    activeCounterparty,
    loadSalesSuggestionForLine,
  } = params;

  const closeProductPricingPanel = useCallback(() => {
    suggestions.setProductPricingOpen(false);
    suggestions.setProductPricingLineId(null);
    suggestions.setProductPricingProductId(0);
    suggestions.setPriceHistoryRows([]);
  }, [suggestions]);

  const openProductPricingPanel = useCallback(
    (line: LineDraft) => {
      const productId = line.selectedProductId ?? 0;
      if (productId <= 0) return;
      suggestions.setProductPricingLineId(line.id);
      suggestions.setProductPricingProductId(productId);
      suggestions.setProductPricingTitle(
        line.description?.trim() || t("reports.orderAccountStatementPickProduct")
      );
      suggestions.setPriceHistoryRows([]);
      suggestions.setProductPricingOpen(true);
    },
    [suggestions, t]
  );

  const applyProductListItemToLine = useCallback(
    (lineId: string, p: ProductListItem) => {
      if (!Number.isFinite(p.id) || p.id <= 0) return;
      const suggestion = latestCostByProductId.get(p.id);
      setLines((prev) =>
        prev.map((x) => {
          if (x.id !== lineId) return x;
          const nextUnitText = p.unit?.trim() || x.unitText || "";
          const suggestedUnitPrice = suggestion
            ? formatLocaleAmountInput(Math.max(0, Number(suggestion.unitCostExcludingVat) || 0), locale)
            : x.unitPriceText;
          return {
            ...x,
            selectedProductId: p.id,
            parentProductId: p.parentProductId ?? null,
            parentProductName: p.parentProductName ?? null,
            description: p.name,
            unitText: nextUnitText,
            unitPriceText: suggestedUnitPrice,
          };
        })
      );
      suggestions.setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      if (activeCounterparty) {
        // Yeni seçilen ürünün birimini açıkça geçir (state henüz güncel olmayabilir).
        void loadSalesSuggestionForLine(lineId, p.id, true, p.unit?.trim() || undefined);
      }
    },
    [activeCounterparty, latestCostByProductId, loadSalesSuggestionForLine, locale, setLines, suggestions]
  );

  const collapseLinesToParentProduct = useCallback(() => {
    const productById = new Map(catalog.map((p) => [p.id, p] as const));
    const normalize = (v: string) =>
      v
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
    const productByName = new Map(
      catalog
        .map((p) => [normalize(p.name ?? ""), p] as const)
        .filter(([k]) => k.length > 0)
    );
    const grouped = new Map<string, LineDraft>();
    const passthrough: LineDraft[] = [];
    let changed = false;
    for (const line of lines) {
      const productId = line.selectedProductId ?? 0;
      const guessedByName = productByName.get(normalize(line.description ?? ""));
      const product = productById.get(productId) ?? guessedByName;
      const parentId = line.parentProductId ?? product?.parentProductId ?? null;
      const parentProduct = parentId ? productById.get(parentId) : null;
      const parentName = (
        line.parentProductName ??
        product?.parentProductName ??
        parentProduct?.name ??
        ""
      ).trim();
      if (!parentId || !parentName) {
        passthrough.push({ ...line });
        continue;
      }
      changed = true;
      const parentCostSuggestion = latestCostByProductId.get(parentId);
      const suggestedFromCost = parentCostSuggestion
        ? formatLocaleAmountInput(Math.max(0, Number(parentCostSuggestion.unitCostExcludingVat) || 0), locale)
        : "";
      const key = `${parentId}:${(line.unitText ?? "").trim().toLowerCase()}`;
      const qty = Math.max(0, parseLocaleAmount((line.quantityText ?? "").trim(), locale) || 0);
      const amount = Number.isFinite(line.amount) ? line.amount : parseLocaleAmount(line.amountText, locale) || 0;
      const prev = grouped.get(key);
      if (!prev) {
        grouped.set(key, {
          ...line,
          id: newId(),
          description: parentName,
          quantityText: qty > 0 ? formatLocaleAmountInput(qty, locale) : "",
          amount: Math.max(0, amount),
          amountText: amount > 0 ? formatLocaleAmountInput(amount, locale) : "",
          // Parent-merge: amount çocuk satırların toplamı; qty*unitPrice değil.
          // Auto-apply'ı kilitle ki LineCalcBlock öneriyi üzerine yazmasın.
          amountTouched: amount > 0,
          selectedProductId: parentId,
          parentProductId: null,
          parentProductName: null,
          unitPriceText: suggestedFromCost || line.unitPriceText || "",
          lineSource: "manual",
          manualReasonCode: "OPS_PARENT_MERGE",
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        });
      } else {
        const prevQty = Math.max(0, parseLocaleAmount((prev.quantityText ?? "").trim(), locale) || 0);
        const prevAmount = Number.isFinite(prev.amount) ? prev.amount : parseLocaleAmount(prev.amountText, locale) || 0;
        const mergedQty = prevQty + qty;
        const mergedAmount = Math.max(0, prevAmount + amount);
        grouped.set(key, {
          ...prev,
          quantityText: mergedQty > 0 ? formatLocaleAmountInput(mergedQty, locale) : "",
          amount: mergedAmount,
          amountText: mergedAmount > 0 ? formatLocaleAmountInput(mergedAmount, locale) : "",
          amountTouched: mergedAmount > 0,
        });
      }
    }
    const merged = [...passthrough, ...grouped.values()];
    if (!changed) {
      notify.error(t("reports.orderAccountStatementParentMergeNoop"));
      return;
    }
    setLines(merged);
    notify.success(t("reports.orderAccountStatementParentMergeApplied"));
    if (activeCounterparty) {
      window.setTimeout(() => {
        for (const l of merged) {
          const pid = l.selectedProductId ?? 0;
          if (pid > 0) void loadSalesSuggestionForLine(l.id, pid, false, l.unitText);
        }
      }, 0);
    }
  }, [activeCounterparty, catalog, latestCostByProductId, lines, loadSalesSuggestionForLine, locale, setLines, t]);

  return {
    closeProductPricingPanel,
    openProductPricingPanel,
    applyProductListItemToLine,
    collapseLinesToParentProduct,
  };
}
