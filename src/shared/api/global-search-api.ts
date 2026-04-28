import { apiRequest } from "@/shared/api/client";

export type GlobalSearchHit = {
  kind:
    | "branch"
    | "personnel"
    | "warehouse"
    | "vehicle"
    | "product"
    | "advance"
    | "user"
    | "supplierInvoice"
    | "branchTransaction"
    | "warehouseMovement"
    | "document";
  id: number;
  title: string;
  subtitle: string | null;
  route: string | null;
  score: number;
};

type GlobalSearchResponse = {
  items: GlobalSearchHit[];
};

export async function fetchGlobalSearch(
  q: string,
  limitPerType = 8,
  options?: { types?: string[]; limitTotal?: number }
): Promise<GlobalSearchHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const sp = new URLSearchParams({ q: query, limitPerType: String(limitPerType) });
  const types = options?.types?.map((x) => x.trim()).filter(Boolean) ?? [];
  if (types.length > 0) sp.set("types", types.join(","));
  if (options?.limitTotal != null && options.limitTotal > 0) {
    sp.set("limitTotal", String(options.limitTotal));
  }
  const data = await apiRequest<GlobalSearchResponse>(`/search/global?${sp.toString()}`);
  return Array.isArray(data.items) ? data.items : [];
}
