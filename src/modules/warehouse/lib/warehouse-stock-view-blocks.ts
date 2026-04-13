import type { ProductListItem, WarehouseProductStockRow } from "@/types/product";

export type WarehouseStockViewBlock =
  | {
      kind: "group";
      parentId: number;
      parentName: string;
      unit: string | null;
      totalQty: number;
      children: WarehouseProductStockRow[];
    }
  | { kind: "single"; row: WarehouseProductStockRow };

function catalogHasChild(catalog: ProductListItem[], parentId: number) {
  return catalog.some((p) => p.parentProductId === parentId);
}

/** Depo stok listesi: ana ürün satırında alt varyantların toplamı; detay satırları varyant. */
export function buildWarehouseStockViewBlocks(
  rows: WarehouseProductStockRow[],
  catalog: ProductListItem[]
): WarehouseStockViewBlock[] {
  const byId = new Map(rows.map((r) => [r.productId, r]));
  const positive = rows.filter((r) => r.quantity > 0);

  const parentIds = new Set<number>();
  for (const r of positive) {
    if (r.parentProductId != null) parentIds.add(r.parentProductId);
  }
  for (const r of positive) {
    if (r.parentProductId == null && catalogHasChild(catalog, r.productId)) {
      parentIds.add(r.productId);
    }
  }

  const groups: WarehouseStockViewBlock[] = [];
  for (const pid of parentIds) {
    const parentRow = byId.get(pid);
    if (!parentRow) continue;
    const children = positive
      .filter((r) => r.parentProductId === pid)
      .slice()
      .sort((a, b) =>
        a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" })
      );
    const own = parentRow.quantity;
    const childSum = children.reduce((s, c) => s + c.quantity, 0);
    if (own <= 0 && children.length === 0) continue;
    groups.push({
      kind: "group",
      parentId: pid,
      parentName: parentRow.productName,
      unit: parentRow.unit,
      totalQty: own + childSum,
      children,
    });
  }

  const groupedChildIds = new Set(
    groups.flatMap((g) => (g.kind === "group" ? g.children.map((c) => c.productId) : []))
  );
  const groupParentIds = new Set(
    groups.map((g) => (g.kind === "group" ? g.parentId : -1))
  );

  const singles: WarehouseStockViewBlock[] = [];
  for (const r of rows) {
    if (groupedChildIds.has(r.productId)) continue;
    if (groupParentIds.has(r.productId)) continue;
    singles.push({ kind: "single", row: r });
  }

  const label = (b: WarehouseStockViewBlock) =>
    b.kind === "group" ? b.parentName : b.row.productName;
  return [...groups, ...singles].sort((a, b) =>
    label(a).localeCompare(label(b), undefined, { sensitivity: "base" })
  );
}
