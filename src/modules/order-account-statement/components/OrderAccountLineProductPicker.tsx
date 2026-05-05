"use client";

import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";
import type { Locale } from "@/i18n/messages";
import type { ProductListItem } from "@/types/product";
import type { ProductCostHistoryRow } from "@/types/product-cost";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  lineId: string;
  selectedProductId: number | null | undefined;
  description: string;
  parentProductName?: string | null;
  onSelectProduct: (product: ProductListItem) => void;
  latestCostByProductId: Map<number, ProductCostHistoryRow>;
  locale: Locale;
  t: (key: string) => string;
  emptyResultsText: string;
  loadingListText: string;
  enabled: boolean;
  className?: string;
};

function productToRichOption(
  p: ProductListItem,
  locale: Locale,
  t: (key: string) => string,
  latestCostByProductId: Map<number, ProductCostHistoryRow>
): RichComboboxOption {
  const unit = p.unit?.trim() || "—";
  const cost = latestCostByProductId.get(p.id);
  const costPart = cost
    ? formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)
    : t("reports.orderAccountStatementCostSuggestionMissing");
  const parentHint =
    p.parentProductId != null && p.parentProductId > 0
      ? p.parentProductName?.trim()
        ? `Ana ürün: ${p.parentProductName.trim()}`
        : `Ana ürün #${p.parentProductId}`
      : p.hasChildren
        ? "Ana ürün"
        : undefined;
  return {
    value: String(p.id),
    title: p.name.trim() || `Ürün #${p.id}`,
    description: parentHint,
    detail: `${t("reports.orderAccountStatementUnit")}: ${unit} · ${t("reports.orderAccountStatementSuggestedCostShort")}: ${costPart}`,
  };
}

export function OrderAccountLineProductPicker({
  lineId: _lineId,
  selectedProductId,
  description,
  parentProductName,
  onSelectProduct,
  latestCostByProductId,
  locale,
  t,
  emptyResultsText,
  loadingListText,
  enabled,
  className,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ProductListItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(pickerDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pickerDraft]);

  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch]);

  const { data: pageData, isFetching, isPending } = useProductsCatalogPaged(
    page,
    PAGE_SIZE,
    debouncedSearch,
    enabled && menuOpen
  );

  useEffect(() => {
    if (!pageData) return;
    if (page === 1) {
      setAccumulated(pageData.items);
      return;
    }
    setAccumulated((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...pageData.items.filter((x) => !ids.has(x.id))];
    });
  }, [pageData, page]);

  const totalCount = pageData?.totalCount ?? 0;
  const hasMore = accumulated.length < totalCount;

  const handleOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open);
    if (!open) {
      setPickerDraft("");
      setDebouncedSearch("");
      setPage(1);
      setAccumulated([]);
    }
  }, []);

  const onReachEnd = useCallback(() => {
    if (isFetching || !hasMore) return;
    setPage((p) => p + 1);
  }, [isFetching, hasMore]);

  const listBusy = (isPending || isFetching) && accumulated.length === 0 && menuOpen;

  const richOptions = useMemo((): RichComboboxOption[] => {
    const sid = selectedProductId ?? 0;
    const head: RichComboboxOption[] = [];
    if (sid > 0 && !accumulated.some((x) => x.id === sid)) {
      head.push({
        value: String(sid),
        title: description.trim() || `Ürün #${sid}`,
        description: parentProductName?.trim() || undefined,
        detail: t("reports.orderAccountStatementPickProduct"),
      });
    }
    return [...head, ...accumulated.map((p) => productToRichOption(p, locale, t, latestCostByProductId))];
  }, [
    accumulated,
    description,
    latestCostByProductId,
    locale,
    parentProductName,
    selectedProductId,
    t,
  ]);

  const value = selectedProductId != null && selectedProductId > 0 ? String(selectedProductId) : "";

  return (
    <RichCombobox
      className={cn("relative z-[45]", className)}
      value={value}
      onChange={(raw) => {
        const id = Number.parseInt(raw, 10);
        const picked = accumulated.find((x) => x.id === id);
        if (picked) onSelectProduct(picked);
      }}
      options={richOptions}
      placeholder={t("reports.orderAccountStatementCatalogNone")}
      searchPlaceholder={t("reports.orderAccountStatementPickProduct")}
      emptyText={listBusy ? loadingListText : emptyResultsText}
      query={pickerDraft}
      onQueryChange={setPickerDraft}
      serverSideFilter
      clearQueryOnOpen={false}
      onOpenChange={handleOpenChange}
      hasMore={hasMore}
      isLoadingMore={isFetching && page > 1}
      onReachEnd={onReachEnd}
      loadingText={t("common.loading")}
      disabled={!enabled}
    />
  );
}
