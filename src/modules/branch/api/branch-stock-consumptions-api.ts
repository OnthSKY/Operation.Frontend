import { apiRequest } from "@/shared/api/client";

export type BranchStockConsumptionType = "CONSUMPTION" | "SNAPSHOT" | "ADJUSTMENT";
export type BranchStockDirection = "OUT" | "IN";

export type BranchStockConsumptionRow = {
  id: number;
  productId: number;
  productName: string;
  productUnit: string | null;
  /** Ana ürün (varsa); gün özeti alt ürünleri ana ürün altında toplar. null = kendisi ana üründür. */
  parentProductId: number | null;
  parentProductName: string | null;
  type: BranchStockConsumptionType;
  direction: BranchStockDirection;
  quantity: number;
  snapshotValue: number | null;
  preBalance: number | null;
  consumptionDate: string;
  note: string | null;
  createdAt: string;
  createdByUserId: number | null;
  createdByName: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
  /** Kullanıcının seçtiği birim (örn. "paket"); null = ürünün temel/legacy birimi. */
  enteredUnit: string | null;
  enteredQuantity: number | null;
};

export type BranchProductBalanceRow = {
  productId: number;
  productName: string;
  productUnit: string | null;
  balance: number;
  /** Şubeye sevkiyatla net giren miktar (depo→şube IN − şube→depo OUT). IN düzeltme tavanı: netShippedIn − balance. */
  netShippedIn: number;
  /** Ana ürün (varsa); UI bakiyeleri ana ürün altında alt ürün olarak gruplar. */
  parentProductId: number | null;
  parentProductName: string | null;
};

export type BranchStockConsumptionListPage = {
  items: BranchStockConsumptionRow[];
  totalCount: number;
};

export type ConsumeInput = {
  productId: number;
  quantity: number;
  consumptionDate: string;
  note?: string | null;
  /** Alternatif birim adı (paket, kg, top, ...); null/boş = ürünün temel/legacy birimi varsayılır. */
  unitName?: string | null;
};

export type SnapshotInput = {
  productId: number;
  snapshotValue: number;
  consumptionDate: string;
  note?: string | null;
  unitName?: string | null;
};

export type AdjustInput = {
  productId: number;
  direction: BranchStockDirection;
  quantity: number;
  consumptionDate: string;
  note?: string | null;
  unitName?: string | null;
};

function normalizeRow(r: Record<string, unknown>): BranchStockConsumptionRow {
  return {
    id: Number(r.id ?? r.Id) || 0,
    productId: Number(r.productId ?? r.ProductId) || 0,
    productName: String(r.productName ?? r.ProductName ?? "").trim(),
    productUnit:
      r.productUnit != null && String(r.productUnit).trim() !== ""
        ? String(r.productUnit).trim()
        : null,
    parentProductId:
      (Number(r.parentProductId ?? r.ParentProductId) || 0) > 0
        ? Number(r.parentProductId ?? r.ParentProductId)
        : null,
    parentProductName:
      r.parentProductName != null && String(r.parentProductName).trim() !== ""
        ? String(r.parentProductName).trim()
        : r.ParentProductName != null && String(r.ParentProductName).trim() !== ""
          ? String(r.ParentProductName).trim()
          : null,
    type: String(r.type ?? r.Type ?? "CONSUMPTION") as BranchStockConsumptionType,
    direction: String(r.direction ?? r.Direction ?? "OUT") as BranchStockDirection,
    quantity: Number(r.quantity ?? r.Quantity ?? 0) || 0,
    snapshotValue:
      r.snapshotValue == null && r.SnapshotValue == null
        ? null
        : Number(r.snapshotValue ?? r.SnapshotValue),
    preBalance:
      r.preBalance == null && r.PreBalance == null
        ? null
        : Number(r.preBalance ?? r.PreBalance),
    consumptionDate: String(r.consumptionDate ?? r.ConsumptionDate ?? "").slice(0, 10),
    note:
      r.note != null && String(r.note).trim() !== "" ? String(r.note).trim() : null,
    createdAt: String(r.createdAt ?? r.CreatedAt ?? ""),
    createdByUserId:
      r.createdByUserId == null && r.CreatedByUserId == null
        ? null
        : Number(r.createdByUserId ?? r.CreatedByUserId),
    createdByName:
      r.createdByName != null && String(r.createdByName).trim() !== ""
        ? String(r.createdByName).trim()
        : null,
    isDeleted: Boolean(r.isDeleted ?? r.IsDeleted ?? false),
    deletedAt: r.deletedAt != null ? String(r.deletedAt) : r.DeletedAt != null ? String(r.DeletedAt) : null,
    deletedBy:
      r.deletedBy == null && r.DeletedBy == null
        ? null
        : Number(r.deletedBy ?? r.DeletedBy),
    deletedByName:
      r.deletedByName != null && String(r.deletedByName).trim() !== ""
        ? String(r.deletedByName).trim()
        : null,
    enteredUnit:
      r.enteredUnit != null && String(r.enteredUnit).trim() !== ""
        ? String(r.enteredUnit).trim()
        : r.EnteredUnit != null && String(r.EnteredUnit).trim() !== ""
          ? String(r.EnteredUnit).trim()
          : null,
    enteredQuantity:
      r.enteredQuantity == null && r.EnteredQuantity == null
        ? null
        : Number(r.enteredQuantity ?? r.EnteredQuantity),
  };
}

function normalizeBalance(r: Record<string, unknown>): BranchProductBalanceRow {
  return {
    productId: Number(r.productId ?? r.ProductId) || 0,
    productName: String(r.productName ?? r.ProductName ?? "").trim(),
    productUnit:
      r.productUnit != null && String(r.productUnit).trim() !== ""
        ? String(r.productUnit).trim()
        : null,
    balance: Number(r.balance ?? r.Balance ?? 0) || 0,
    netShippedIn: Number(r.netShippedIn ?? r.NetShippedIn ?? 0) || 0,
    parentProductId:
      (Number(r.parentProductId ?? r.ParentProductId) || 0) > 0
        ? Number(r.parentProductId ?? r.ParentProductId)
        : null,
    parentProductName:
      r.parentProductName != null && String(r.parentProductName).trim() !== ""
        ? String(r.parentProductName).trim()
        : r.ParentProductName != null && String(r.ParentProductName).trim() !== ""
          ? String(r.ParentProductName).trim()
          : null,
  };
}

export async function fetchBranchStockConsumptions(
  branchId: number,
  params: {
    dateFrom?: string;
    dateTo?: string;
    includeDeleted?: boolean;
    page: number;
    pageSize: number;
  }
): Promise<BranchStockConsumptionListPage> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.includeDeleted) q.set("includeDeleted", "true");
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));

  const result = await apiRequest<{ items: Record<string, unknown>[]; totalCount: number }>(
    `/branches/${branchId}/stock-consumptions?${q.toString()}`
  );
  return {
    items: (result.items ?? []).map(normalizeRow),
    totalCount: Number(result.totalCount ?? 0) || 0,
  };
}

export async function fetchBranchProductBalances(
  branchId: number,
  productIds?: number[]
): Promise<BranchProductBalanceRow[]> {
  const q = new URLSearchParams();
  if (productIds && productIds.length > 0) {
    for (const id of productIds) q.append("productIds", String(id));
  }
  const qs = q.toString();
  const rows = await apiRequest<Record<string, unknown>[]>(
    `/branches/${branchId}/stock-balances${qs ? `?${qs}` : ""}`
  );
  return (rows ?? []).map(normalizeBalance);
}

export type BranchProductConsumedRow = {
  productId: number;
  productName: string;
  productUnit: string | null;
  totalConsumed: number;
  parentProductId: number | null;
  parentProductName: string | null;
};

function normalizeConsumed(r: Record<string, unknown>): BranchProductConsumedRow {
  return {
    productId: Number(r.productId ?? r.ProductId) || 0,
    productName: String(r.productName ?? r.ProductName ?? "").trim(),
    productUnit:
      r.productUnit != null && String(r.productUnit).trim() !== ""
        ? String(r.productUnit).trim()
        : null,
    totalConsumed: Number(r.totalConsumed ?? r.TotalConsumed ?? 0) || 0,
    parentProductId:
      (Number(r.parentProductId ?? r.ParentProductId) || 0) > 0
        ? Number(r.parentProductId ?? r.ParentProductId)
        : null,
    parentProductName:
      r.parentProductName != null && String(r.parentProductName).trim() !== ""
        ? String(r.parentProductName).trim()
        : r.ParentProductName != null && String(r.ParentProductName).trim() !== ""
          ? String(r.ParentProductName).trim()
          : null,
  };
}

export async function fetchBranchConsumedTotals(
  branchId: number,
  params?: { dateFrom?: string; dateTo?: string }
): Promise<BranchProductConsumedRow[]> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  const qs = q.toString();
  const rows = await apiRequest<Record<string, unknown>[]>(
    `/branches/${branchId}/stock-consumed-totals${qs ? `?${qs}` : ""}`
  );
  return (rows ?? []).map(normalizeConsumed);
}

export async function recordBranchStockConsumption(
  branchId: number,
  input: ConsumeInput
): Promise<BranchStockConsumptionRow> {
  const row = await apiRequest<Record<string, unknown>>(
    `/branches/${branchId}/stock-consumptions/consume`,
    {
      method: "POST",
      body: JSON.stringify({
        branchId,
        productId: input.productId,
        quantity: input.quantity,
        consumptionDate: input.consumptionDate,
        note: input.note ?? null,
        unitName: input.unitName?.trim() || null,
      }),
    }
  );
  return normalizeRow(row);
}

/**
 * Bakiye eşitse backend null döndürür (no-op); UI bunu "kaydedilecek değişiklik yok" olarak gösterir.
 */
export async function recordBranchStockSnapshot(
  branchId: number,
  input: SnapshotInput
): Promise<BranchStockConsumptionRow | null> {
  const row = await apiRequest<Record<string, unknown> | null>(
    `/branches/${branchId}/stock-consumptions/snapshot`,
    {
      method: "POST",
      body: JSON.stringify({
        branchId,
        productId: input.productId,
        snapshotValue: input.snapshotValue,
        consumptionDate: input.consumptionDate,
        note: input.note ?? null,
        unitName: input.unitName?.trim() || null,
      }),
    }
  );
  return row ? normalizeRow(row) : null;
}

export async function recordBranchStockAdjustment(
  branchId: number,
  input: AdjustInput
): Promise<BranchStockConsumptionRow> {
  const row = await apiRequest<Record<string, unknown>>(
    `/branches/${branchId}/stock-consumptions/adjust`,
    {
      method: "POST",
      body: JSON.stringify({
        branchId,
        productId: input.productId,
        direction: input.direction,
        quantity: input.quantity,
        consumptionDate: input.consumptionDate,
        note: input.note ?? null,
        unitName: input.unitName?.trim() || null,
      }),
    }
  );
  return normalizeRow(row);
}

export async function softDeleteBranchStockConsumption(
  branchId: number,
  id: number
): Promise<void> {
  await apiRequest<null>(`/branches/${branchId}/stock-consumptions/${id}`, {
    method: "DELETE",
  });
}

export async function restoreBranchStockConsumption(
  branchId: number,
  id: number
): Promise<void> {
  await apiRequest<null>(`/branches/${branchId}/stock-consumptions/${id}/restore`, {
    method: "POST",
  });
}
