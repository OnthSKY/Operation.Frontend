"use client";

import { useState } from "react";
import type {
  CounterpartySuggestionRow,
  SalesPriceHistoryRow,
  SalesPriceSuggestion,
} from "@/modules/order-account-statement/api/outbound-invoices-api";

/**
 * Karşı taraf önerileri (counterparty) + satır bazlı satış fiyatı önerileri ve
 * ürün fiyat geçmişi modal'ının state container'ı.
 *
 * SRP: state. Suggestion fetch'leri orchestrator'da kalır; ileride
 * useSuggestionsLoader olarak da çıkarılabilir.
 */
export function useOasSuggestions() {
  const [suggestions, setSuggestions] = useState<CounterpartySuggestionRow[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);

  const [linePriceSuggestionByLineId, setLinePriceSuggestionByLineId] = useState<
    Record<string, SalesPriceSuggestion | undefined>
  >({});

  const [productPricingOpen, setProductPricingOpen] = useState(false);
  const [productPricingLineId, setProductPricingLineId] = useState<string | null>(null);
  const [productPricingProductId, setProductPricingProductId] = useState(0);
  const [productPricingTitle, setProductPricingTitle] = useState("");

  const [priceHistoryRows, setPriceHistoryRows] = useState<SalesPriceHistoryRow[]>([]);
  const [priceHistoryBusy, setPriceHistoryBusy] = useState(false);

  return {
    suggestions,
    setSuggestions,
    suggestionsBusy,
    setSuggestionsBusy,

    linePriceSuggestionByLineId,
    setLinePriceSuggestionByLineId,

    productPricingOpen,
    setProductPricingOpen,
    productPricingLineId,
    setProductPricingLineId,
    productPricingProductId,
    setProductPricingProductId,
    productPricingTitle,
    setProductPricingTitle,

    priceHistoryRows,
    setPriceHistoryRows,
    priceHistoryBusy,
    setPriceHistoryBusy,
  };
}
