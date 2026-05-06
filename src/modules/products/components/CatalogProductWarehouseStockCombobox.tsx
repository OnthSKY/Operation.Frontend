"use client";

import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";
import type { Locale } from "@/i18n/messages";
import type { ProductListItem } from "@/types/product";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export type CatalogProductWarehouseStockComboboxProps = {
  warehouseId: number;
  value: string;
  onChange: (productId: string) => void;
  /** Modal açıkken sorgu çalışsın; kapalıyken sıfırlanır. */
  enabled: boolean;
  locale: Locale;
  t: (key: string) => string;
  disabled?: boolean;
  className?: string;
};

function quantityAtWarehouse(p: ProductListItem, warehouseId: number): number {
  const hit = p.byWarehouse?.find((w) => w.warehouseId === warehouseId);
  return hit != null ? Number(hit.quantity) || 0 : 0;
}

function productToRichOption(
  p: ProductListItem,
  warehouseId: number,
  locale: Locale,
  t: (key: string) => string
): RichComboboxOption {
  const parent = p.parentProductName?.trim();
  const productName = p.name.trim();
  const title = parent && parent !== productName ? `${parent} › ${productName}` : productName;
  const unit = p.unit?.trim();
  const cat = p.categoryName?.trim();
  const description = cat || (unit ? `(${unit})` : undefined);
  const qty = quantityAtWarehouse(p, warehouseId);
  const qtyLabel = formatLocaleAmount(qty, locale);
  const detail = `${t("warehouse.appendLineProductStockPrefix")}: ${qtyLabel}${unit ? ` ${unit}` : ""}`;
  return { value: String(p.id), title, description, detail };
}

export function CatalogProductWarehouseStockCombobox({
  warehouseId,
  value,
  onChange,
  enabled,
  locale,
  t,
  disabled,
  className,
}: CatalogProductWarehouseStockComboboxProps) {
  const [pickerDraft, setPickerDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ProductListItem[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(pickerDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pickerDraft]);

  useEffect(() => {
    if (!enabled) {
      setPickerDraft("");
      setDebouncedSearch("");
      setPage(1);
      setAccumulated([]);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, enabled]);

  const { data: pageData, isFetching, isPending } = useProductsCatalogPaged(
    page,
    PAGE_SIZE,
    debouncedSearch,
    enabled,
    false
  );

  useEffect(() => {
    if (!pageData || !enabled) return;
    if (page === 1) {
      setAccumulated(pageData.items);
      return;
    }
    setAccumulated((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...pageData.items.filter((x) => !ids.has(x.id))];
    });
  }, [pageData, page, enabled]);

  const totalCount = pageData?.totalCount ?? 0;
  const hasMore = accumulated.length < totalCount;

  const handleOpenChange = useCallback((open: boolean) => {
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

  const listBusy = (isPending || isFetching) && accumulated.length === 0 && enabled;
  const hasSearchQuery = debouncedSearch.trim().length > 0;
  const emptyListMessage = hasSearchQuery
    ? t("products.catalogSearchNoResults")
    : t("products.emptyCatalog");

  const richOptions = useMemo((): RichComboboxOption[] => {
    const sid = Number.parseInt(value, 10);
    const head: RichComboboxOption[] = [];
    if (Number.isFinite(sid) && sid > 0 && !accumulated.some((x) => x.id === sid)) {
      head.push({
        value: String(sid),
        title: t("warehouse.appendLineProductUnknownTitle").replace("{{id}}", String(sid)),
        detail: t("warehouse.listQuickPickProduct"),
      });
    }
    return [...head, ...accumulated.map((p) => productToRichOption(p, warehouseId, locale, t))];
  }, [accumulated, locale, t, value, warehouseId]);

  return (
    <RichCombobox
      className={cn("w-full", className)}
      value={value}
      onChange={onChange}
      options={richOptions}
      placeholder={t("warehouse.listQuickPickProduct")}
      searchPlaceholder={t("products.catalogSearchPlaceholder")}
      emptyText={listBusy ? t("common.loading") : emptyListMessage}
      query={pickerDraft}
      onQueryChange={setPickerDraft}
      serverSideFilter
      clearQueryOnOpen={false}
      onOpenChange={handleOpenChange}
      hasMore={hasMore}
      isLoadingMore={Boolean(isFetching && page > 1)}
      onReachEnd={onReachEnd}
      loadingText={t("common.loading")}
      disabled={disabled}
    />
  );
}
