import { apiRequest } from "@/shared/api/client";
import type {
  Branch,
  BranchDashboard,
  BranchRegisterSummary,
  BranchSeasonStatus,
  BranchStockReceiptsPaged,
  BranchTransactionsPaged,
  CreateBranchInput,
} from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";

function normalizeSeasonStatus(v: unknown): BranchSeasonStatus {
  const u = String(v ?? "NONE").trim().toUpperCase();
  if (u === "OPEN" || u === "PLANNED" || u === "CLOSED" || u === "NONE") return u;
  return "NONE";
}

function normalizeBranchListRow(
  r: Omit<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus"> &
    Partial<Pick<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus">>
): Branch {
  return {
    ...r,
    personnelAssignedCount: Number(r.personnelAssignedCount ?? 0) || 0,
    personnelStartedCount: Number(r.personnelStartedCount ?? 0) || 0,
    personnelNotStartedCount: Number(r.personnelNotStartedCount ?? 0) || 0,
    seasonStatus: normalizeSeasonStatus(r.seasonStatus),
  };
}

export type ExpenseLinkAdvanceOption = {
  id: number;
  personnelId: number;
  personnelFullName: string;
  amount: number;
  currencyCode: string;
  advanceDate: string;
  sourceType: string;
};

export type ExpenseLinkSalaryPaymentOption = {
  id: number;
  personnelId: number;
  personnelFullName: string;
  amount: number;
  currencyCode: string;
  paymentDate: string;
  period: string;
  sourceType: string;
};

export async function fetchBranchExpenseLinkAdvances(
  branchId: number,
  personnelId: number
): Promise<ExpenseLinkAdvanceOption[]> {
  const q = new URLSearchParams({ personnelId: String(personnelId) });
  const rows = await apiRequest<
    Array<
      Omit<ExpenseLinkAdvanceOption, "currencyCode"> & {
        currencyCode?: string;
      }
    >
  >(`/branches/${branchId}/expense-links/advances?${q}`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
  }));
}

export async function fetchBranchExpenseLinkSalaryPayments(
  branchId: number,
  personnelId: number
): Promise<ExpenseLinkSalaryPaymentOption[]> {
  const q = new URLSearchParams({ personnelId: String(personnelId) });
  const rows = await apiRequest<
    Array<
      Omit<ExpenseLinkSalaryPaymentOption, "currencyCode"> & {
        currencyCode?: string;
      }
    >
  >(`/branches/${branchId}/expense-links/salary-payments?${q}`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
  }));
}

export async function fetchBranches(): Promise<Branch[]> {
  const raw = await apiRequest<
    Array<
      Omit<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus"> &
        Partial<Pick<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus">>
    >
  >("/branches");
  return raw.map(normalizeBranchListRow);
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const r = await apiRequest<
    Omit<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus"> &
      Partial<Pick<Branch, "personnelAssignedCount" | "personnelStartedCount" | "personnelNotStartedCount" | "seasonStatus">>
  >("/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeBranchListRow(r);
}

export async function fetchBranchRegisterSummary(
  branchId: number,
  date: string
): Promise<BranchRegisterSummary> {
  const q = new URLSearchParams({ date });
  const r = await apiRequest<BranchRegisterSummary>(
    `/branches/${branchId}/register-summary?${q.toString()}`
  );
  return {
    ...r,
    dayRegisterOwesPersonnel: Number(r.dayRegisterOwesPersonnel ?? 0) || 0,
    dayRegisterOwesPatron: Number(r.dayRegisterOwesPatron ?? 0) || 0,
    dayTotalOutExpense: Number(r.dayTotalOutExpense ?? 0) || 0,
    dayNetAfterAllRegisterOut: Number(r.dayNetAfterAllRegisterOut ?? 0) || 0,
  };
}

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

function normalizePositivePersonnelId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeOptionalPositiveId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeBranchTx(
  r: Omit<
    BranchTransaction,
    | "currencyCode"
    | "cashSettlementParty"
    | "cashSettlementPersonnelId"
    | "cashSettlementPersonnelFullName"
    | "cashSettlementPersonnelJobTitle"
    | "expensePaymentSource"
    | "expensePocketPersonnelId"
    | "expensePocketPersonnelFullName"
    | "expensePocketPersonnelJobTitle"
    | "hasReceiptPhoto"
    | "linkedAdvanceId"
    | "linkedSalaryPaymentId"
    | "linkedAdvancePersonnelId"
    | "linkedSalaryPersonnelId"
    | "linkedAdvancePersonnelFullName"
    | "linkedSalaryPersonnelFullName"
  > & {
    currencyCode?: string;
    cashAmount?: number | null;
    cardAmount?: number | null;
    cashSettlementParty?: string | null;
    cashSettlementPersonnelId?: number | null;
    cashSettlementPersonnelFullName?: string | null;
    cashSettlementPersonnelJobTitle?: string | null;
    expensePaymentSource?: string | null;
    expensePocketPersonnelId?: number | null;
    expensePocketPersonnelFullName?: string | null;
    expensePocketPersonnelJobTitle?: string | null;
    hasReceiptPhoto?: boolean;
    linkedAdvanceId?: number | null;
    linkedSalaryPaymentId?: number | null;
    linkedAdvancePersonnelId?: number | null;
    linkedSalaryPersonnelId?: number | null;
    linkedAdvancePersonnelFullName?: string | null;
    linkedSalaryPersonnelFullName?: string | null;
  }
): BranchTransaction {
  const pid = normalizePositivePersonnelId(r.cashSettlementPersonnelId);
  const fn =
    typeof r.cashSettlementPersonnelFullName === "string" && r.cashSettlementPersonnelFullName.trim()
      ? r.cashSettlementPersonnelFullName.trim()
      : null;
  const jt =
    typeof r.cashSettlementPersonnelJobTitle === "string" && r.cashSettlementPersonnelJobTitle.trim()
      ? r.cashSettlementPersonnelJobTitle.trim().toUpperCase()
      : null;
  return {
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
    cashAmount: r.cashAmount ?? null,
    cardAmount: r.cardAmount ?? null,
    cashSettlementParty:
      r.cashSettlementParty != null && String(r.cashSettlementParty).trim()
        ? String(r.cashSettlementParty).trim().toUpperCase()
        : null,
    cashSettlementPersonnelId: pid,
    cashSettlementPersonnelFullName: fn,
    cashSettlementPersonnelJobTitle: jt,
    expensePaymentSource:
      r.expensePaymentSource != null && String(r.expensePaymentSource).trim()
        ? String(r.expensePaymentSource).trim().toUpperCase()
        : null,
    expensePocketPersonnelId: normalizeOptionalPositiveId(r.expensePocketPersonnelId),
    expensePocketPersonnelFullName:
      typeof r.expensePocketPersonnelFullName === "string" && r.expensePocketPersonnelFullName.trim()
        ? r.expensePocketPersonnelFullName.trim()
        : null,
    expensePocketPersonnelJobTitle:
      typeof r.expensePocketPersonnelJobTitle === "string" && r.expensePocketPersonnelJobTitle.trim()
        ? r.expensePocketPersonnelJobTitle.trim().toUpperCase()
        : null,
    hasReceiptPhoto: Boolean(r.hasReceiptPhoto),
    linkedAdvanceId: r.linkedAdvanceId != null && r.linkedAdvanceId > 0 ? r.linkedAdvanceId : null,
    linkedSalaryPaymentId:
      r.linkedSalaryPaymentId != null && r.linkedSalaryPaymentId > 0 ? r.linkedSalaryPaymentId : null,
    linkedAdvancePersonnelId: normalizePositivePersonnelId(r.linkedAdvancePersonnelId),
    linkedSalaryPersonnelId: normalizePositivePersonnelId(r.linkedSalaryPersonnelId),
    linkedAdvancePersonnelFullName:
      typeof r.linkedAdvancePersonnelFullName === "string" && r.linkedAdvancePersonnelFullName.trim()
        ? r.linkedAdvancePersonnelFullName.trim()
        : null,
    linkedSalaryPersonnelFullName:
      typeof r.linkedSalaryPersonnelFullName === "string" && r.linkedSalaryPersonnelFullName.trim()
        ? r.linkedSalaryPersonnelFullName.trim()
        : null,
  };
}

export async function fetchBranchDashboard(
  branchId: number,
  month?: string
): Promise<BranchDashboard> {
  const q = month && month.length === 7 ? `?month=${encodeURIComponent(month)}` : "";
  return apiRequest<BranchDashboard>(`/branches/${branchId}/dashboard${q}`);
}

export type BranchTxPageParams = {
  page: number;
  pageSize: number;
  type?: "IN" | "OUT";
  dateFrom?: string;
  dateTo?: string;
  mainCategory?: string;
  cashSettlementParty?: string;
  expensePaymentSource?: string;
};

export async function fetchBranchTransactionsPaged(
  branchId: number,
  params: BranchTxPageParams
): Promise<BranchTransactionsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.type === "IN" || params.type === "OUT") q.set("type", params.type);
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  if (params.mainCategory?.trim()) q.set("mainCategory", params.mainCategory.trim());
  if (params.cashSettlementParty?.trim())
    q.set("cashSettlementParty", params.cashSettlementParty.trim());
  if (params.expensePaymentSource?.trim())
    q.set("expensePaymentSource", params.expensePaymentSource.trim());
  const raw = await apiRequest<{
    items: Array<
      Omit<
        BranchTransaction,
        | "currencyCode"
        | "hasReceiptPhoto"
        | "linkedAdvanceId"
        | "linkedSalaryPaymentId"
        | "linkedAdvancePersonnelId"
        | "linkedSalaryPersonnelId"
        | "linkedAdvancePersonnelFullName"
        | "linkedSalaryPersonnelFullName"
      > & {
        currencyCode?: string;
        cashAmount?: number | null;
        cardAmount?: number | null;
        expensePaymentSource?: string | null;
        hasReceiptPhoto?: boolean;
        linkedAdvanceId?: number | null;
        linkedSalaryPaymentId?: number | null;
        linkedAdvancePersonnelId?: number | null;
        linkedSalaryPersonnelId?: number | null;
        linkedAdvancePersonnelFullName?: string | null;
        linkedSalaryPersonnelFullName?: string | null;
      }
    >;
    totalCount: number;
    page: number;
    pageSize: number;
  }>(`/branches/${branchId}/transactions/paged?${q.toString()}`);
  return {
    ...raw,
    items: raw.items.map(normalizeBranchTx),
  };
}

export type BranchStockPageParams = {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
};

export async function fetchBranchStockReceiptsPaged(
  branchId: number,
  params: BranchStockPageParams
): Promise<BranchStockReceiptsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  return apiRequest<BranchStockReceiptsPaged>(
    `/branches/${branchId}/stock-receipts?${q.toString()}`
  );
}
