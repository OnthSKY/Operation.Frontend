import { apiRequest } from "@/shared/api/client";

export type PersonnelCostsListItemKind = "advance" | "expense" | "contractorPayment";

export type PersonnelCostsListItem = {
  kind: PersonnelCostsListItemKind;
  id: number;
  /** ISO date-time string */
  transactionDate: string;
  amount: number;
  currencyCode: string;
  personnelId: number | null;
  personnelFullName: string | null;
  branchId: number | null;
  branchName: string | null;
  contractorCounterpartyId: number | null;
  contractorName: string | null;
  /** advance.source_type veya contractor_payment.payment_source */
  sourceType: string | null;
  /** expense classification_code (OUT_PER_*) */
  classificationCode: string | null;
  /** expense.expense_payment_source */
  expensePaymentSource: string | null;
  description: string | null;
  effectiveYear: number | null;
  createdByUserId: number | null;
  createdByDisplayName: string | null;
  createdAt: string | null;
};

export type PersonnelCostsListResponse = {
  items: PersonnelCostsListItem[];
  totalCount: number;
};

export type FetchPersonnelCostsParams = {
  search?: string;
  kind?: PersonnelCostsListItemKind;
  personnelId?: number;
  branchId?: number;
  effectiveYear?: number;
  offset?: number;
  limit?: number;
};

export async function fetchPersonnelCosts(
  params: FetchPersonnelCostsParams
): Promise<PersonnelCostsListResponse> {
  const q = new URLSearchParams();
  const s = params.search?.trim();
  if (s) q.set("search", s);
  if (params.kind) q.set("kind", params.kind);
  if (params.personnelId != null && params.personnelId > 0)
    q.set("personnelId", String(Math.trunc(params.personnelId)));
  if (params.branchId != null && params.branchId > 0)
    q.set("branchId", String(Math.trunc(params.branchId)));
  if (params.effectiveYear != null && Number.isFinite(params.effectiveYear))
    q.set("effectiveYear", String(Math.trunc(params.effectiveYear)));
  if (params.offset != null && params.offset >= 0)
    q.set("offset", String(Math.trunc(params.offset)));
  if (params.limit != null && params.limit >= 1)
    q.set("limit", String(Math.trunc(params.limit)));
  const qs = q.toString();
  const path = qs ? `/personnel/costs?${qs}` : "/personnel/costs";
  const raw = await apiRequest<{
    items?: Array<Record<string, unknown>>;
    totalCount?: number | string;
  }>(path);
  const items: PersonnelCostsListItem[] = (raw.items ?? []).map((r) => {
    const get = <T>(key: string): T => r[key] as T;
    return {
      kind: String(get<string>("kind") ?? "expense") as PersonnelCostsListItemKind,
      id: Number(get<number | string>("id") ?? 0),
      transactionDate: String(get<string>("transactionDate") ?? ""),
      amount: Number(get<number | string>("amount") ?? 0),
      currencyCode:
        String(get<string>("currencyCode") ?? "TRY").trim().toUpperCase() || "TRY",
      personnelId: numOrNull(get("personnelId")),
      personnelFullName: strOrNull(get("personnelFullName")),
      branchId: numOrNull(get("branchId")),
      branchName: strOrNull(get("branchName")),
      contractorCounterpartyId: numOrNull(get("contractorCounterpartyId")),
      contractorName: strOrNull(get("contractorName")),
      sourceType: strOrNull(get("sourceType")),
      classificationCode: strOrNull(get("classificationCode")),
      expensePaymentSource: strOrNull(get("expensePaymentSource")),
      description: strOrNull(get("description")),
      effectiveYear: numOrNull(get("effectiveYear")),
      createdByUserId: numOrNull(get("createdByUserId")),
      createdByDisplayName: strOrNull(get("createdByDisplayName")),
      createdAt: strOrNull(get("createdAt")),
    };
  });
  return {
    items,
    totalCount: Number(raw.totalCount ?? 0),
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
