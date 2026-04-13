import { categoryOptionLabel } from "@/modules/products/lib/category-labels";
import type { ProductCategory } from "@/modules/products/api/product-categories-api";
import type { ProductListItem, WarehouseProductStockRow } from "@/types/product";
import {
  buildWarehouseStockViewBlocks,
  type WarehouseStockViewBlock,
} from "@/modules/warehouse/lib/warehouse-stock-view-blocks";

export type WarehouseStockGroupMode = "parent" | "category" | "subcategory" | "product";

export type WarehouseStockUnitTotal = {
  unit: string | null;
  qty: number;
};

export type WarehouseStockSection = {
  sectionId: string;
  /** Display title; empty when uncategorized sentinel or single-section modes. */
  title: string;
  unitTotals: WarehouseStockUnitTotal[];
  blocks: WarehouseStockViewBlock[];
};

const UNCAT = "__none__";

function catalogById(catalog: ProductListItem[]): Map<number, ProductListItem> {
  return new Map(catalog.map((p) => [p.id, p]));
}

export function effectiveProductCategoryId(
  row: WarehouseProductStockRow,
  byId: Map<number, ProductListItem>
): number | null {
  if (row.categoryId != null && row.categoryId > 0) return row.categoryId;
  const self = byId.get(row.productId);
  if (self?.categoryId != null && self.categoryId > 0) return self.categoryId;
  if (row.parentProductId != null) {
    const par = byId.get(row.parentProductId);
    if (par?.categoryId != null && par.categoryId > 0) return par.categoryId;
  }
  return null;
}

function rootCategoryId(leafId: number | null, categories: ProductCategory[]): number | null {
  if (leafId == null || leafId <= 0) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  let c = byId.get(leafId);
  if (!c) return leafId;
  while (c.parentCategoryId != null) {
    const p = byId.get(c.parentCategoryId);
    if (!p) break;
    c = p;
  }
  return c.id;
}

export function aggregateStockUnitTotals(rows: WarehouseProductStockRow[]): WarehouseStockUnitTotal[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const u = r.unit?.trim() || "";
    const key = u || "\0";
    m.set(key, (m.get(key) ?? 0) + r.quantity);
  }
  return [...m.entries()]
    .map(([k, qty]) => ({ unit: k === "\0" ? null : k, qty }))
    .sort((a, b) => (a.unit ?? "").localeCompare(b.unit ?? "", undefined, { sensitivity: "base" }));
}

function buildFlatProductBlocks(rows: WarehouseProductStockRow[]): WarehouseStockViewBlock[] {
  return rows
    .slice()
    .sort((a, b) =>
      a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" })
    )
    .map((row) => ({ kind: "single" as const, row }));
}

function partitionKey(
  mode: "category" | "subcategory",
  row: WarehouseProductStockRow,
  byId: Map<number, ProductListItem>,
  categories: ProductCategory[]
): string {
  const leaf = effectiveProductCategoryId(row, byId);
  if (mode === "category") {
    const root = rootCategoryId(leaf, categories);
    return root == null ? UNCAT : `r-${root}`;
  }
  return leaf == null ? UNCAT : `l-${leaf}`;
}

function sectionTitleForKey(
  key: string,
  mode: "category" | "subcategory",
  partRows: WarehouseProductStockRow[],
  categories: ProductCategory[]
): string {
  if (key === UNCAT) return "";
  if (mode === "category") {
    const rootId = Number.parseInt(key.slice(2), 10);
    if (!Number.isFinite(rootId)) return "";
    const cat = categories.find((c) => c.id === rootId);
    if (cat) return cat.name;
    const nm = partRows.find((r) => r.categoryName?.trim())?.categoryName?.trim();
    return nm || `#${rootId}`;
  }
  const leafId = Number.parseInt(key.slice(2), 10);
  if (!Number.isFinite(leafId)) return "";
  const leaf = categories.find((c) => c.id === leafId);
  if (leaf) return categoryOptionLabel(categories, leaf);
  const nm = partRows.find((r) => r.categoryName?.trim())?.categoryName?.trim();
  return nm || `#${leafId}`;
}

export function buildWarehouseStockGroupedSections(
  mode: WarehouseStockGroupMode,
  rows: WarehouseProductStockRow[],
  catalog: ProductListItem[],
  categories: ProductCategory[]
): WarehouseStockSection[] {
  if (mode === "parent") {
    return [
      {
        sectionId: "all",
        title: "",
        unitTotals: [],
        blocks: buildWarehouseStockViewBlocks(rows, catalog),
      },
    ];
  }
  if (mode === "product") {
    return [
      {
        sectionId: "all",
        title: "",
        unitTotals: [],
        blocks: buildFlatProductBlocks(rows),
      },
    ];
  }

  if (rows.length === 0) {
    return [
      {
        sectionId: "all",
        title: "",
        unitTotals: [],
        blocks: [],
      },
    ];
  }

  const byId = catalogById(catalog);
  const buckets = new Map<string, WarehouseProductStockRow[]>();
  for (const row of rows) {
    const k = partitionKey(mode, row, byId, categories);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(row);
  }

  const entries = [...buckets.entries()].map(([key, partRows]) => ({
    key,
    partRows,
    title: sectionTitleForKey(key, mode, partRows, categories),
    unitTotals: aggregateStockUnitTotals(partRows),
    sortKey:
      key === UNCAT
        ? "\uffff"
        : sectionTitleForKey(key, mode, partRows, categories).toLocaleLowerCase(),
  }));

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base" }));

  return entries.map((e) => ({
    sectionId: e.key,
    title: e.title,
    unitTotals: e.unitTotals,
    blocks: buildWarehouseStockViewBlocks(e.partRows, catalog),
  }));
}

export function isUncategorizedSection(sectionId: string): boolean {
  return sectionId === UNCAT;
}
