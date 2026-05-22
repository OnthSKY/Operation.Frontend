"use client";

import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";
import { useWarehouseStock } from "@/modules/warehouse/hooks/useWarehouseQueries";
import type { Locale } from "@/i18n/messages";
import type { ProductListItem } from "@/types/product";
import type { WarehouseProductStockRow } from "@/types/product";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export type CatalogProductWarehouseStockPickMode = "catalog" | "warehouseStockPositive";

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
  /**
   * `warehouseStockPositive`: depo stok API + yerel arama (sevkiyata satır ekleme).
   * `catalog`: sayfalı katalog + sunucu araması (depo girişi vb.).
   */
  pickMode?: CatalogProductWarehouseStockPickMode;
};

function normSearch(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function quantityAtWarehouse(p: ProductListItem, warehouseId: number): number {
  const hit = p.byWarehouse?.find((w) => w.warehouseId === warehouseId);
  return hit != null ? Number(hit.quantity) || 0 : 0;
}

function catalogRowMatchesQuery(p: ProductListItem, q: string): boolean {
  if (!q) return true;
  const hay = normSearch(
    `${p.name} ${p.parentProductName ?? ""} ${p.categoryName ?? ""} ${p.unit ?? ""}`
  );
  return hay.includes(q);
}

function stockRowMatchesQuery(r: WarehouseProductStockRow, q: string): boolean {
  if (!q) return true;
  const hay = normSearch(
    `${r.productName} ${r.parentProductName ?? ""} ${r.categoryName ?? ""} ${r.unit ?? ""}`
  );
  return hay.includes(q);
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

function stockRowToRichOption(
  r: WarehouseProductStockRow,
  locale: Locale,
  t: (key: string) => string
): RichComboboxOption {
  const parent = r.parentProductName?.trim();
  const productName = r.productName.trim();
  const title = parent && parent !== productName ? `${parent} › ${productName}` : productName;
  const unit = r.unit?.trim();
  const cat = r.categoryName?.trim();
  const description = cat || (unit ? `(${unit})` : undefined);
  const qtyLabel = formatLocaleAmount(r.quantity, locale);
  const detail = `${t("warehouse.appendLineProductStockPrefix")}: ${qtyLabel}${unit ? ` ${unit}` : ""}`;
  return { value: String(r.productId), title, description, detail };
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
  pickMode = "catalog",
}: CatalogProductWarehouseStockComboboxProps) {
  const useWarehouseStockPick = pickMode === "warehouseStockPositive";

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
    if (!enabled || useWarehouseStockPick) return;
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, enabled, useWarehouseStockPick]);

  const { data: stockRows = [], isPending: stockPending, isFetching: stockFetching } = useWarehouseStock(
    enabled && useWarehouseStockPick && warehouseId > 0 ? warehouseId : null,
    {}
  );

  const { data: pageData, isFetching: catalogFetching, isPending: catalogPending } = useProductsCatalogPaged(
    page,
    PAGE_SIZE,
    debouncedSearch,
    enabled && !useWarehouseStockPick,
    true
  );

  useEffect(() => {
    if (!pageData || !enabled || useWarehouseStockPick) return;
    if (page === 1) {
      setAccumulated(pageData.items);
      return;
    }
    setAccumulated((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...pageData.items.filter((x) => !ids.has(x.id))];
    });
  }, [pageData, page, enabled, useWarehouseStockPick]);

  const totalCount = pageData?.totalCount ?? 0;
  const hasMore = !useWarehouseStockPick && accumulated.length < totalCount;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPickerDraft("");
      setDebouncedSearch("");
      setPage(1);
      setAccumulated([]);
    }
  }, []);

  const onReachEnd = useCallback(() => {
    if (useWarehouseStockPick || catalogFetching || !hasMore) return;
    setPage((p) => p + 1);
  }, [useWarehouseStockPick, catalogFetching, hasMore]);

  const draftNorm = normSearch(pickerDraft.trim());

  const stockOptions = useMemo((): RichComboboxOption[] => {
    const positive = stockRows.filter((r) => r.quantity > 0);
    const filtered = positive.filter((r) => stockRowMatchesQuery(r, draftNorm));
    const sorted = [...filtered].sort((a, b) => {
      const la = normSearch(
        `${a.parentProductName ?? ""} ${a.productName}`.trim() || String(a.productId)
      );
      const lb = normSearch(
        `${b.parentProductName ?? ""} ${b.productName}`.trim() || String(b.productId)
      );
      return la.localeCompare(lb, "tr-TR", { sensitivity: "base" });
    });
    return sorted.map((r) => stockRowToRichOption(r, locale, t));
  }, [stockRows, draftNorm, locale, t]);

  const catalogOptions = useMemo((): RichComboboxOption[] => {
    const sid = Number.parseInt(value, 10);
    const head: RichComboboxOption[] = [];
    if (Number.isFinite(sid) && sid > 0 && !accumulated.some((x) => x.id === sid)) {
      head.push({
        value: String(sid),
        title: t("warehouse.appendLineProductUnknownTitle").replace("{{id}}", String(sid)),
        detail: t("warehouse.listQuickPickProduct"),
      });
    }
    const filtered = accumulated.filter((p) => catalogRowMatchesQuery(p, draftNorm));
    return [...head, ...filtered.map((p) => productToRichOption(p, warehouseId, locale, t))];
  }, [accumulated, draftNorm, locale, t, value, warehouseId]);

  const richOptions = useWarehouseStockPick ? stockOptions : catalogOptions;

  const listBusy = useWarehouseStockPick
    ? (stockPending || stockFetching) && stockOptions.length === 0 && enabled
    : (catalogPending || catalogFetching) && richOptions.length === 0 && enabled;

  const hasSearchQuery = pickerDraft.trim().length > 0;
  const emptyListMessage = useWarehouseStockPick
    ? hasSearchQuery
      ? t("products.catalogSearchNoResults")
      : t("warehouse.listQuickTransferNoStock")
    : hasSearchQuery
      ? t("products.catalogSearchNoResults")
      : t("products.emptyCatalog");

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
      serverSideFilter={!useWarehouseStockPick}
      clearQueryOnOpen={false}
      onOpenChange={handleOpenChange}
      hasMore={hasMore}
      isLoadingMore={Boolean(!useWarehouseStockPick && catalogFetching && page > 1)}
      onReachEnd={onReachEnd}
      loadingText={t("common.loading")}
      disabled={disabled}
    />
  );
}
