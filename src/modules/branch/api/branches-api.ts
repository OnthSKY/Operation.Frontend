import {
  warehouseScopeEffectiveCategoryId,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { apiRequest } from "@/shared/api/client";
import type {
  Branch,
  BranchDashboard,
  BranchRegisterSummary,
  BranchResponsiblePerson,
  BranchSeasonStatus,
  BranchStockReceiptRow,
  BranchStockReceiptsPaged,
  BranchTransactionsPaged,
  CreateBranchInput,
  UpdateBranchInput,
} from "@/types/branch";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type { BranchTransaction } from "@/types/branch-transaction";
import type {
  BranchPosSettlementProfile,
  UpsertBranchPosSettlementInput,
} from "@/types/patron-flow";

function normalizeSeasonStatus(v: unknown): BranchSeasonStatus {
  const u = String(v ?? "NONE").trim().toUpperCase();
  if (u === "OPEN" || u === "PLANNED" || u === "CLOSED" || u === "NONE") return u;
  return "NONE";
}

function normalizeResponsibles(raw: unknown): BranchResponsiblePerson[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = x as { personnelId?: unknown; fullName?: unknown };
      return {
        personnelId: Number(o.personnelId) || 0,
        fullName: String(o.fullName ?? "").trim(),
      };
    })
    .filter((x) => x.personnelId > 0);
}

function normalizeBranchListRow(
  r: Omit<
    Branch,
    | "personnelAssignedCount"
    | "personnelStartedCount"
    | "personnelNotStartedCount"
    | "seasonStatus"
    | "address"
    | "responsibles"
  > &
    Partial<
      Pick<
        Branch,
        | "personnelAssignedCount"
        | "personnelStartedCount"
        | "personnelNotStartedCount"
        | "seasonStatus"
        | "address"
        | "responsibles"
      >
    >
): Branch {
  const addr =
    r.address != null && String(r.address).trim() ? String(r.address).trim() : null;
  return {
    ...r,
    address: addr,
    responsibles: normalizeResponsibles(r.responsibles),
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

/** Merkez (şubesiz) gider — şube filtresi olmadan bağlanabilir avanslar */
export async function fetchPersonnelOrgExpenseLinkAdvances(
  personnelId: number
): Promise<ExpenseLinkAdvanceOption[]> {
  const rows = await apiRequest<
    Array<
      Omit<ExpenseLinkAdvanceOption, "currencyCode"> & {
        currencyCode?: string;
      }
    >
  >(`/personnel/${personnelId}/expense-links/advances`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
  }));
}

export async function fetchPersonnelOrgExpenseLinkSalaryPayments(
  personnelId: number
): Promise<ExpenseLinkSalaryPaymentOption[]> {
  const rows = await apiRequest<
    Array<
      Omit<ExpenseLinkSalaryPaymentOption, "currencyCode"> & {
        currencyCode?: string;
      }
    >
  >(`/personnel/${personnelId}/expense-links/salary-payments`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
  }));
}

export async function fetchBranches(): Promise<Branch[]> {
  const raw = await apiRequest<
    Array<
      Omit<
        Branch,
        | "personnelAssignedCount"
        | "personnelStartedCount"
        | "personnelNotStartedCount"
        | "seasonStatus"
        | "address"
        | "responsibles"
      > &
        Partial<
          Pick<
            Branch,
            | "personnelAssignedCount"
            | "personnelStartedCount"
            | "personnelNotStartedCount"
            | "seasonStatus"
            | "address"
            | "responsibles"
          >
        >
    >
  >("/branches");
  return raw.map(normalizeBranchListRow);
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const r = await apiRequest<
    Omit<
      Branch,
      | "personnelAssignedCount"
      | "personnelStartedCount"
      | "personnelNotStartedCount"
      | "seasonStatus"
      | "address"
      | "responsibles"
    > &
      Partial<
        Pick<
          Branch,
          | "personnelAssignedCount"
          | "personnelStartedCount"
          | "personnelNotStartedCount"
          | "seasonStatus"
          | "address"
          | "responsibles"
        >
      >
  >("/branches", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      address:
        input.address != null && String(input.address).trim()
          ? String(input.address).trim()
          : null,
      posSettlementBeneficiaryType: input.posSettlementBeneficiaryType,
      posSettlementBeneficiaryPersonnelId:
        input.posSettlementBeneficiaryPersonnelId != null &&
        input.posSettlementBeneficiaryPersonnelId > 0
          ? input.posSettlementBeneficiaryPersonnelId
          : null,
      posSettlementNotes:
        input.posSettlementNotes != null && String(input.posSettlementNotes).trim()
          ? String(input.posSettlementNotes).trim()
          : null,
    }),
  });
  return normalizeBranchListRow(r);
}

export async function updateBranch(
  id: number,
  input: UpdateBranchInput
): Promise<Branch> {
  const r = await apiRequest<
    Omit<
      Branch,
      | "personnelAssignedCount"
      | "personnelStartedCount"
      | "personnelNotStartedCount"
      | "seasonStatus"
      | "address"
      | "responsibles"
    > &
      Partial<
        Pick<
          Branch,
          | "personnelAssignedCount"
          | "personnelStartedCount"
          | "personnelNotStartedCount"
          | "seasonStatus"
          | "address"
          | "responsibles"
        >
      >
  >(`/branches/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: input.name.trim(),
      address: input.address?.trim() ? input.address.trim() : null,
      responsiblePersonnelIds: input.responsiblePersonnelIds,
    }),
  });
  return normalizeBranchListRow(r);
}

export async function fetchBranchRegisterSummary(
  branchId: number,
  date: string
): Promise<BranchRegisterSummary> {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid branch id");
  }
  const q = new URLSearchParams({ date });
  const r = await apiRequest<BranchRegisterSummary>(
    `/branches/${id}/register-summary?${q.toString()}`
  );
  return {
    ...r,
    dayRegisterOwesPersonnel: Number(r.dayRegisterOwesPersonnel ?? 0) || 0,
    dayPersonnelPocketRepaidFromRegister: Number(r.dayPersonnelPocketRepaidFromRegister ?? 0) || 0,
    dayPersonnelPocketRepaidFromPatron: Number(r.dayPersonnelPocketRepaidFromPatron ?? 0) || 0,
    dayNetRegisterOwesPersonnelPocket: Number(r.dayNetRegisterOwesPersonnelPocket ?? 0) || 0,
    dayRegisterOwesPatron: Number(r.dayRegisterOwesPatron ?? 0) || 0,
    dayPatronDebtRepaidFromRegister: Number(r.dayPatronDebtRepaidFromRegister ?? 0) || 0,
    dayNetRegisterOwesPatron: Number(r.dayNetRegisterOwesPatron ?? 0) || 0,
    dayTotalOutExpense: Number(r.dayTotalOutExpense ?? 0) || 0,
    dayNetAfterAllRegisterOut: Number(r.dayNetAfterAllRegisterOut ?? 0) || 0,
    dayTopExpenseMainCategory:
      r.dayTopExpenseMainCategory != null && String(r.dayTopExpenseMainCategory).trim()
        ? String(r.dayTopExpenseMainCategory).trim()
        : null,
    dayTopExpenseAmount: Number(r.dayTopExpenseAmount ?? 0) || 0,
    cumulativeIncomeTotalThroughAsOf:
      Number(r.cumulativeIncomeTotalThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashThroughAsOf:
      Number(r.cumulativeIncomeCashThroughAsOf ?? 0) || 0,
    cumulativeIncomeCardThroughAsOf:
      Number(r.cumulativeIncomeCardThroughAsOf ?? 0) || 0,
  };
}

export async function fetchBranchPersonnelMoneySummaries(
  branchId: number
): Promise<BranchPersonnelMoneySummaryItem[]> {
  const rows = await apiRequest<BranchPersonnelMoneySummaryItem[]>(
    `/branches/${branchId}/personnel-money-summaries`
  );
  return rows.map((r) => ({
    personnelId: Number(r.personnelId) || 0,
    totalAdvances: r.totalAdvances != null ? Number(r.totalAdvances) : null,
    advancesCurrencyCode: r.advancesCurrencyCode?.trim() || null,
    advancesMixedCurrencies: Boolean(r.advancesMixedCurrencies),
    grossPocketExpense: Number(r.grossPocketExpense ?? 0) || 0,
    pocketRepaidFromRegister: Number(r.pocketRepaidFromRegister ?? 0) || 0,
    pocketRepaidFromPatron: Number(r.pocketRepaidFromPatron ?? 0) || 0,
    netRegisterOwesPocket: Number(r.netRegisterOwesPocket ?? 0) || 0,
    pocketCurrencyCode: r.pocketCurrencyCode?.trim() || null,
    pocketMixedCurrencies: Boolean(r.pocketMixedCurrencies),
  }));
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
    linkedSupplierInvoiceLineId: normalizeOptionalPositiveId(
      (r as { linkedSupplierInvoiceLineId?: unknown }).linkedSupplierInvoiceLineId
    ),
    linkedVehicleExpenseId: normalizeOptionalPositiveId(
      (r as { linkedVehicleExpenseId?: unknown }).linkedVehicleExpenseId
    ),
    linkedVehicleId: normalizeOptionalPositiveId((r as { linkedVehicleId?: unknown }).linkedVehicleId),
    linkedVehiclePlateNumber: (() => {
      const v = (r as { linkedVehiclePlateNumber?: unknown }).linkedVehiclePlateNumber;
      return typeof v === "string" && v.trim() ? v.trim() : null;
    })(),
    generalOverheadPoolId: normalizeOptionalPositiveId(
      (r as { generalOverheadPoolId?: unknown }).generalOverheadPoolId
    ),
  };
}

/** Stok girişi toplamı için dashboard sorgu kapsamı (depo filtreleriyle aynı mantık). */
export type BranchDashboardStockScope = WarehouseScopeFiltersValue;

export function branchDashboardScopeKey(s: BranchDashboardStockScope): string {
  return `m${s.mainCategoryId ?? ""}-s${s.subCategoryId ?? ""}-p${s.parentProductId ?? ""}-u${s.productId ?? ""}`;
}

export function branchDashboardScopeActive(s: BranchDashboardStockScope): boolean {
  return (
    warehouseScopeEffectiveCategoryId(s) != null ||
    (s.parentProductId != null && s.parentProductId > 0) ||
    (s.productId != null && s.productId > 0)
  );
}

function appendDashboardScope(
  sp: URLSearchParams,
  scope: BranchDashboardStockScope | null | undefined
): void {
  if (!scope) return;
  const cid = warehouseScopeEffectiveCategoryId(scope);
  if (cid != null) {
    sp.set("categoryId", String(cid));
  }
  if (scope.parentProductId != null && scope.parentProductId > 0) {
    sp.set("parentProductId", String(scope.parentProductId));
  }
  if (scope.productId != null && scope.productId > 0) {
    sp.set("productId", String(scope.productId));
  }
}

export async function fetchBranchDashboard(
  branchId: number,
  month?: string,
  scope?: BranchDashboardStockScope | null
): Promise<BranchDashboard> {
  const sp = new URLSearchParams();
  if (month && month.length === 7) sp.set("month", month);
  appendDashboardScope(sp, scope ?? null);
  const q = sp.toString();
  const r = await apiRequest<BranchDashboard>(
    `/branches/${branchId}/dashboard${q ? `?${q}` : ""}`
  );
  const optNum = (v: unknown): number | null => {
    if (v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ...r,
    allTimeNetProfit: optNum(r.allTimeNetProfit),
    stockInboundScopeTotal: optNum(r.stockInboundScopeTotal),
  };
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
  expensePocketPersonnelId?: number;
  excludeSettledPocketExpenses?: boolean;
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
  if (
    params.expensePocketPersonnelId != null &&
    params.expensePocketPersonnelId > 0
  )
    q.set("expensePocketPersonnelId", String(params.expensePocketPersonnelId));
  if (params.excludeSettledPocketExpenses === true)
    q.set("excludeSettledPocketExpenses", "true");
  const raw = await apiRequest<{
    patronExpenseTotal?: number;
    patronIncomeToPatron?: {
      total?: number;
      cash?: number;
      card?: number;
      unspecified?: number;
    } | null;
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
  const pin = raw.patronIncomeToPatron;
  return {
    ...raw,
    patronExpenseTotal:
      typeof raw.patronExpenseTotal === "number" && Number.isFinite(raw.patronExpenseTotal)
        ? raw.patronExpenseTotal
        : 0,
    patronIncomeToPatron:
      pin != null
        ? {
            total: Number(pin.total) || 0,
            cash: Number(pin.cash) || 0,
            card: Number(pin.card) || 0,
            unspecified: Number(pin.unspecified) || 0,
          }
        : null,
    items: raw.items.map(normalizeBranchTx),
  };
}

export type BranchStockPageParams = {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: number;
  parentProductId?: number;
  productId?: number;
};

function normalizeBranchStockReceiptRow(r: Record<string, unknown>): BranchStockReceiptRow {
  const id = Number(r.id);
  const pid = Number(r.productId);
  const ppid = r.parentProductId != null ? Number(r.parentProductId) : null;
  const wmid = r.warehouseMovementId != null ? Number(r.warehouseMovementId) : null;
  const guid =
    r.inBatchGroupId != null && String(r.inBatchGroupId).trim()
      ? String(r.inBatchGroupId).trim()
      : null;
  return {
    id: Number.isFinite(id) ? id : 0,
    productId: Number.isFinite(pid) ? pid : 0,
    productName: String(r.productName ?? ""),
    unit: r.unit != null && String(r.unit).trim() ? String(r.unit).trim() : null,
    parentProductId: ppid != null && Number.isFinite(ppid) && ppid > 0 ? ppid : null,
    parentProductName:
      r.parentProductName != null && String(r.parentProductName).trim()
        ? String(r.parentProductName).trim()
        : null,
    quantity: Number(r.quantity) || 0,
    movementDate: String(r.movementDate ?? ""),
    warehouseId:
      r.warehouseId != null && r.warehouseId !== ""
        ? Number(r.warehouseId)
        : null,
    warehouseName:
      r.warehouseName != null && String(r.warehouseName).trim()
        ? String(r.warehouseName).trim()
        : null,
    warehouseMovementId: wmid != null && Number.isFinite(wmid) && wmid > 0 ? wmid : null,
    inBatchGroupId: guid,
    supplierUnitPrice: optFiniteNum(r.supplierUnitPrice),
    valuationCurrencyCode:
      r.valuationCurrencyCode != null && String(r.valuationCurrencyCode).trim()
        ? String(r.valuationCurrencyCode).trim().toUpperCase()
        : null,
    valuationLineEstimate: optFiniteNum(r.valuationLineEstimate),
  };
}

function optFiniteNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const BRANCH_PDF_PAGE_SIZE = 100;

export async function fetchAllBranchStockReceipts(
  branchId: number
): Promise<BranchStockReceiptRow[]> {
  const out: BranchStockReceiptRow[] = [];
  let page = 1;
  for (;;) {
    const r = await fetchBranchStockReceiptsPaged(branchId, {
      page,
      pageSize: BRANCH_PDF_PAGE_SIZE,
    });
    out.push(...r.items);
    if (out.length >= r.totalCount || r.items.length === 0) break;
    page += 1;
  }
  return out;
}

export async function fetchAllBranchTransactionsPaged(
  branchId: number
): Promise<BranchTransaction[]> {
  const out: BranchTransaction[] = [];
  let page = 1;
  for (;;) {
    const r = await fetchBranchTransactionsPaged(branchId, {
      page,
      pageSize: BRANCH_PDF_PAGE_SIZE,
    });
    out.push(...r.items);
    if (out.length >= r.totalCount || r.items.length === 0) break;
    page += 1;
  }
  return out;
}

export async function fetchBranchStockReceiptsPaged(
  branchId: number,
  params: BranchStockPageParams
): Promise<BranchStockReceiptsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  if (params.categoryId != null && params.categoryId > 0)
    q.set("categoryId", String(params.categoryId));
  if (params.parentProductId != null && params.parentProductId > 0)
    q.set("parentProductId", String(params.parentProductId));
  if (params.productId != null && params.productId > 0)
    q.set("productId", String(params.productId));
  const raw = await apiRequest<Record<string, unknown>>(
    `/branches/${branchId}/stock-receipts?${q.toString()}`
  );
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  return {
    items: itemsRaw.map((x) => normalizeBranchStockReceiptRow(x as Record<string, unknown>)),
    totalCount: Number(raw.totalCount) || 0,
    page: Number(raw.page) || 1,
    pageSize: Number(raw.pageSize) || params.pageSize,
    filteredTotalQuantity: Number(raw.filteredTotalQuantity ?? 0) || 0,
  };
}

export type ZReportAccountingMonthStatus = {
  month: number;
  status: string;
  sentToAccountingAt: string | null;
  sentToAccountingBy: string | null;
};

export type ZReportAccountingYearPayload = {
  year: number;
  months: ZReportAccountingMonthStatus[];
};

export function fetchBranchZReportAccountingYear(branchId: number, year: number) {
  const q = new URLSearchParams({ year: String(year) });
  return apiRequest<ZReportAccountingYearPayload>(
    `/branches/${branchId}/z-report-accounting?${q}`
  );
}

export async function upsertBranchPosSettlementProfile(
  branchId: number,
  body: UpsertBranchPosSettlementInput
): Promise<BranchPosSettlementProfile> {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid branch id");
  const notes = body.notes?.trim() ? body.notes.trim() : null;
  return apiRequest<BranchPosSettlementProfile>(
    `/branches/${id}/pos-settlement-profile`,
    {
      method: "PUT",
      body: JSON.stringify({
        beneficiaryType: body.beneficiaryType,
        beneficiaryPersonnelId:
          body.beneficiaryPersonnelId != null && body.beneficiaryPersonnelId > 0
            ? body.beneficiaryPersonnelId
            : null,
        notes,
      }),
    }
  );
}
