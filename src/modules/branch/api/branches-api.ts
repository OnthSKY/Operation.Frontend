import {
  warehouseScopeEffectiveCategoryId,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { apiRequest } from "@/shared/api/client";
import type {
  Branch,
  BranchDashboard,
  BranchIncomePeriodSummary,
  BranchListResponse,
  BranchListSort,
  BranchRegisterSummary,
  BranchResponsiblePerson,
  ExpenseGeneralOverheadLine,
  ExpenseTabBranchOperatingLine,
  ExpenseTabPeriodBreakdown,
  ExpenseTabPeriodInsights,
  BranchSeasonStatus,
  BranchStockReceiptRow,
  BranchStockReceiptsPaged,
  BranchStockReceiptsSummary,
  BranchTransactionsPaged,
  CreateBranchInput,
  IncomeCashBranchManagerPersonRow,
  UpdateBranchInput,
} from "@/types/branch";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type { BranchTransaction } from "@/types/branch-transaction";
import { branchTxDirectionAndClassificationFromApi } from "@/modules/branch/lib/map-branch-tx-from-api";
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

function normalizeIncomeCashBranchManagerByPersonRows(
  raw: unknown
): IncomeCashBranchManagerPersonRow[] {
  if (!Array.isArray(raw)) return [];
  const out: IncomeCashBranchManagerPersonRow[] = [];
  for (const x of raw) {
    const o = x as Record<string, unknown>;
    const pidRaw = o.personnelId ?? o.PersonnelId;
    let personnelId: number | null = null;
    if (pidRaw != null && pidRaw !== "") {
      const n = typeof pidRaw === "number" ? pidRaw : parseInt(String(pidRaw).trim(), 10);
      if (Number.isFinite(n) && n > 0) personnelId = n;
    }
    const fullName = String(o.fullName ?? o.FullName ?? "").trim();
    const amount = Number(o.amount ?? o.Amount ?? 0) || 0;
    if (Math.abs(amount) <= 0.005) continue;
    out.push({ personnelId, fullName, amount });
  }
  return out;
}

function numField(o: Record<string, unknown>, camel: string, pascal: string): number {
  const v = o[camel] ?? o[pascal];
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const EMPTY_EXPENSE_INSIGHTS: ExpenseTabPeriodInsights = {
  topExpenseMainCategory: null,
  topExpenseAmount: 0,
  economicOutTransactionCount: 0,
  generalOverheadLines: [],
  branchOperatingExpenseLines: [],
  generalOverheadPaidByPatronAmount: 0,
  generalOverheadPaidFromRegisterAmount: 0,
  generalOverheadPaidFromPersonnelPocketAmount: 0,
  generalOverheadAmountInBranchOperatingMains: 0,
};

function normalizeExpenseGeneralOverheadLines(raw: unknown): ExpenseGeneralOverheadLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ExpenseGeneralOverheadLine[] = [];
  for (const x of raw) {
    const r = x as Record<string, unknown>;
    const branchTransactionId =
      Number(r.branchTransactionId ?? r.BranchTransactionId ?? 0) || 0;
    const poolId = Number(r.poolId ?? r.PoolId ?? 0) || 0;
    const amount = Number(r.amount ?? r.Amount ?? 0) || 0;
    const poolTitle = String(r.poolTitle ?? r.PoolTitle ?? "").trim();
    const transactionDate = String(r.transactionDate ?? r.TransactionDate ?? "").trim();
    const description = r.description ?? r.Description;
    const mc =
      r.classificationCode ??
      r.ClassificationCode ??
      r.mainCategory ??
      r.MainCategory;
    const cat = r.category ?? r.Category;
    const eps = r.expensePaymentSource ?? r.ExpensePaymentSource;
    const ips = r.invoicePaymentStatus ?? r.InvoicePaymentStatus;
    out.push({
      branchTransactionId,
      poolId,
      poolTitle,
      amount,
      transactionDate,
      description: description != null && String(description).trim() ? String(description).trim() : null,
      mainCategory: mc != null && String(mc).trim() ? String(mc).trim() : null,
      category: cat != null && String(cat).trim() ? String(cat).trim() : null,
      expensePaymentSource: eps != null && String(eps).trim() ? String(eps).trim() : null,
      invoicePaymentStatus: ips != null && String(ips).trim() ? String(ips).trim() : null,
    });
  }
  return out;
}

function normalizeBranchOperatingExpenseLines(raw: unknown): ExpenseTabBranchOperatingLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ExpenseTabBranchOperatingLine[] = [];
  for (const x of raw) {
    const r = x as Record<string, unknown>;
    const branchTransactionId =
      Number(r.branchTransactionId ?? r.BranchTransactionId ?? 0) || 0;
    const amount = Number(r.amount ?? r.Amount ?? 0) || 0;
    const transactionDate = String(r.transactionDate ?? r.TransactionDate ?? "").trim();
    const description = r.description ?? r.Description;
    const mc =
      r.classificationCode ??
      r.ClassificationCode ??
      r.mainCategory ??
      r.MainCategory;
    const cat = r.category ?? r.Category;
    const eps = r.expensePaymentSource ?? r.ExpensePaymentSource;
    const ips = r.invoicePaymentStatus ?? r.InvoicePaymentStatus;
    const pidRaw = r.poolId ?? r.PoolId;
    const poolId =
      pidRaw != null && pidRaw !== ""
        ? (() => {
            const n = typeof pidRaw === "number" ? pidRaw : Number(pidRaw);
            return Number.isFinite(n) && n > 0 ? n : null;
          })()
        : null;
    const poolTitle = String(r.poolTitle ?? r.PoolTitle ?? "").trim();
    const goRaw = r.isGeneralOverheadShare ?? r.IsGeneralOverheadShare;
    const isGeneralOverheadShare =
      typeof goRaw === "boolean"
        ? goRaw
        : String(goRaw ?? "")
            .trim()
            .toLowerCase() === "true";
    out.push({
      branchTransactionId,
      amount,
      transactionDate,
      description: description != null && String(description).trim() ? String(description).trim() : null,
      mainCategory: mc != null && String(mc).trim() ? String(mc).trim() : null,
      category: cat != null && String(cat).trim() ? String(cat).trim() : null,
      expensePaymentSource: eps != null && String(eps).trim() ? String(eps).trim() : null,
      invoicePaymentStatus: ips != null && String(ips).trim() ? String(ips).trim() : null,
      poolId,
      poolTitle,
      isGeneralOverheadShare,
    });
  }
  return out;
}

function normalizeExpenseTabPeriodInsights(raw: unknown): ExpenseTabPeriodInsights {
  if (!raw || typeof raw !== "object") return EMPTY_EXPENSE_INSIGHTS;
  const o = raw as Record<string, unknown>;
  const tm = o.topExpenseMainCategory ?? o.TopExpenseMainCategory;
  const topExpenseMainCategory = tm != null && String(tm).trim() ? String(tm).trim() : null;
  return {
    topExpenseMainCategory,
    topExpenseAmount: numField(o, "topExpenseAmount", "TopExpenseAmount") || 0,
    economicOutTransactionCount:
      Math.round(numField(o, "economicOutTransactionCount", "EconomicOutTransactionCount")) || 0,
    generalOverheadLines: normalizeExpenseGeneralOverheadLines(
      o.generalOverheadLines ?? o.GeneralOverheadLines
    ),
    branchOperatingExpenseLines: normalizeBranchOperatingExpenseLines(
      o.branchOperatingExpenseLines ?? o.BranchOperatingExpenseLines
    ),
    generalOverheadPaidByPatronAmount:
      numField(o, "generalOverheadPaidByPatronAmount", "GeneralOverheadPaidByPatronAmount") || 0,
    generalOverheadPaidFromRegisterAmount:
      numField(o, "generalOverheadPaidFromRegisterAmount", "GeneralOverheadPaidFromRegisterAmount") || 0,
    generalOverheadPaidFromPersonnelPocketAmount:
      numField(
        o,
        "generalOverheadPaidFromPersonnelPocketAmount",
        "GeneralOverheadPaidFromPersonnelPocketAmount"
      ) || 0,
    generalOverheadAmountInBranchOperatingMains:
      numField(
        o,
        "generalOverheadAmountInBranchOperatingMains",
        "GeneralOverheadAmountInBranchOperatingMains"
      ) || 0,
  };
}

function normalizeExpenseTabPeriodBreakdown(raw: unknown): ExpenseTabPeriodBreakdown {
  if (!raw || typeof raw !== "object") {
    return {
      totalIncome: 0,
      outPaidFromRegister: 0,
      outPaidFromPatron: 0,
      outPaidFromPersonnelPocket: 0,
      outPersonnelExpense: 0,
      outBranchExpense: 0,
      outAdvanceNonPnl: 0,
      outAdvanceNonPnlFromRegister: 0,
      outAdvanceNonPnlFromPatron: 0,
      outAdvanceNonPnlFromPersonnelPocket: 0,
      outGeneralOverheadAllocated: 0,
      insights: EMPTY_EXPENSE_INSIGHTS,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    totalIncome: numField(o, "totalIncome", "TotalIncome") || 0,
    outPaidFromRegister: numField(o, "outPaidFromRegister", "OutPaidFromRegister") || 0,
    outPaidFromPatron: numField(o, "outPaidFromPatron", "OutPaidFromPatron") || 0,
    outPaidFromPersonnelPocket:
      numField(o, "outPaidFromPersonnelPocket", "OutPaidFromPersonnelPocket") || 0,
    outPersonnelExpense: numField(o, "outPersonnelExpense", "OutPersonnelExpense") || 0,
    outBranchExpense: numField(o, "outBranchExpense", "OutBranchExpense") || 0,
    outAdvanceNonPnl: numField(o, "outAdvanceNonPnl", "OutAdvanceNonPnl") || 0,
    outAdvanceNonPnlFromRegister:
      numField(o, "outAdvanceNonPnlFromRegister", "OutAdvanceNonPnlFromRegister") || 0,
    outAdvanceNonPnlFromPatron:
      numField(o, "outAdvanceNonPnlFromPatron", "OutAdvanceNonPnlFromPatron") || 0,
    outAdvanceNonPnlFromPersonnelPocket:
      numField(
        o,
        "outAdvanceNonPnlFromPersonnelPocket",
        "OutAdvanceNonPnlFromPersonnelPocket"
      ) || 0,
    outGeneralOverheadAllocated:
      numField(o, "outGeneralOverheadAllocated", "OutGeneralOverheadAllocated") || 0,
    insights: normalizeExpenseTabPeriodInsights(o.insights ?? o.Insights),
  };
}

function normalizeExpenseTabPeriodBreakdownOptional(raw: unknown): ExpenseTabPeriodBreakdown | null {
  if (raw == null) return null;
  return normalizeExpenseTabPeriodBreakdown(raw);
}

type BranchListRowApi = Omit<
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
  >;

function normalizeBranchListRow(r: BranchListRowApi): Branch {
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

function normalizeBranchListApiResponse(raw: unknown): BranchListResponse {
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items ?? o.Items;
  const totalRaw = o.totalCount ?? o.TotalCount;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as BranchListRowApi[]).map(normalizeBranchListRow)
    : [];
  const n = typeof totalRaw === "number" ? totalRaw : Number(totalRaw ?? 0);
  const totalCount = Number.isFinite(n) ? Math.trunc(n) : 0;
  return { items, totalCount };
}

export type BranchListQuery = {
  page?: number;
  pageSize?: number;
  sort?: BranchListSort;
  seasonAndPersonnelEffectiveDate?: string;
};

export async function fetchBranchList(
  params?: BranchListQuery
): Promise<BranchListResponse> {
  const q = new URLSearchParams();
  if (params?.page != null && params.page >= 1) q.set("page", String(params.page));
  if (params?.pageSize != null && params.pageSize >= 1)
    q.set("pageSize", String(params.pageSize));
  if (params?.sort != null && String(params.sort).trim())
    q.set("sort", String(params.sort).trim());
  const d = params?.seasonAndPersonnelEffectiveDate?.trim();
  if (d) q.set("seasonAndPersonnelEffectiveDate", d);
  const qs = q.toString();
  const raw = await apiRequest<unknown>(qs ? `/branches?${qs}` : "/branches");
  return normalizeBranchListApiResponse(raw);
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
  const { items } = await fetchBranchList();
  return items;
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

/** DELETE /branches/{id} — soft delete; API yalnızca şubede atanmış aktif personel yoksa izin verir. */
export async function deleteBranch(id: number): Promise<void> {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid branch id");
  await apiRequest<unknown>(`/branches/${n}`, { method: "DELETE" });
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
  const ro = r as Record<string, unknown>;
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
    dayNonRegisterAdvancePatron:
      numField(ro, "dayNonRegisterAdvancePatron", "DayNonRegisterAdvancePatron") || 0,
    dayNonRegisterAdvanceBank:
      numField(ro, "dayNonRegisterAdvanceBank", "DayNonRegisterAdvanceBank") || 0,
    cumulativeIncomeTotalThroughAsOf:
      Number(r.cumulativeIncomeTotalThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashThroughAsOf:
      Number(r.cumulativeIncomeCashThroughAsOf ?? 0) || 0,
    cumulativeIncomeCardThroughAsOf:
      Number(r.cumulativeIncomeCardThroughAsOf ?? 0) || 0,
    hasActiveTourismSeasonForAsOf: Boolean(r.hasActiveTourismSeasonForAsOf),
    activeTourismSeasonYear:
      r.activeTourismSeasonYear != null ? Number(r.activeTourismSeasonYear) : null,
    activeTourismSeasonOpenedOn:
      r.activeTourismSeasonOpenedOn != null && String(r.activeTourismSeasonOpenedOn).trim()
        ? String(r.activeTourismSeasonOpenedOn).trim()
        : null,
    activeTourismSeasonClosedOn:
      r.activeTourismSeasonClosedOn != null && String(r.activeTourismSeasonClosedOn).trim()
        ? String(r.activeTourismSeasonClosedOn).trim()
        : null,
    seasonCumulativeIncomeTotalThroughAsOf:
      Number(r.seasonCumulativeIncomeTotalThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCashThroughAsOf:
      Number(r.seasonCumulativeIncomeCashThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCardThroughAsOf:
      Number(r.seasonCumulativeIncomeCardThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashPatronThroughAsOf:
      Number(r.cumulativeIncomeCashPatronThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashBranchManagerThroughAsOf:
      Number(r.cumulativeIncomeCashBranchManagerThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashRemainsAtBranchThroughAsOf:
      Number(r.cumulativeIncomeCashRemainsAtBranchThroughAsOf ?? 0) || 0,
    cumulativeIncomeCashUnspecifiedThroughAsOf:
      Number(r.cumulativeIncomeCashUnspecifiedThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCashPatronThroughAsOf:
      Number(r.seasonCumulativeIncomeCashPatronThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCashBranchManagerThroughAsOf:
      Number(r.seasonCumulativeIncomeCashBranchManagerThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCashRemainsAtBranchThroughAsOf:
      Number(r.seasonCumulativeIncomeCashRemainsAtBranchThroughAsOf ?? 0) || 0,
    seasonCumulativeIncomeCashUnspecifiedThroughAsOf:
      Number(r.seasonCumulativeIncomeCashUnspecifiedThroughAsOf ?? 0) || 0,
    dayIncomeCashPatron: Number(r.dayIncomeCashPatron ?? 0) || 0,
    dayIncomeCashBranchManager: Number(r.dayIncomeCashBranchManager ?? 0) || 0,
    dayIncomeCashRemainsAtBranch: Number(r.dayIncomeCashRemainsAtBranch ?? 0) || 0,
    dayIncomeCashUnspecified: Number(r.dayIncomeCashUnspecified ?? 0) || 0,
    cumulativeIncomeCashBranchManagerByPersonThroughAsOf:
      normalizeIncomeCashBranchManagerByPersonRows(
        (r as BranchRegisterSummary).cumulativeIncomeCashBranchManagerByPersonThroughAsOf
      ),
    seasonCumulativeIncomeCashBranchManagerByPersonThroughAsOf:
      normalizeIncomeCashBranchManagerByPersonRows(
        (r as BranchRegisterSummary).seasonCumulativeIncomeCashBranchManagerByPersonThroughAsOf
      ),
    dayIncomeCashBranchManagerByPerson: normalizeIncomeCashBranchManagerByPersonRows(
      (r as BranchRegisterSummary).dayIncomeCashBranchManagerByPerson
    ),
    expenseOverviewLifetimeThroughAsOf: normalizeExpenseTabPeriodBreakdown(
      (r as Record<string, unknown>).expenseOverviewLifetimeThroughAsOf ??
        (r as Record<string, unknown>).ExpenseOverviewLifetimeThroughAsOf
    ),
    expenseOverviewSeasonThroughAsOf: normalizeExpenseTabPeriodBreakdownOptional(
      (r as Record<string, unknown>).expenseOverviewSeasonThroughAsOf ??
        (r as Record<string, unknown>).ExpenseOverviewSeasonThroughAsOf
    ),
    expenseOverviewOnAsOfDay: normalizeExpenseTabPeriodBreakdown(
      (r as Record<string, unknown>).expenseOverviewOnAsOfDay ??
        (r as Record<string, unknown>).ExpenseOverviewOnAsOfDay
    ),
  };
}

export async function fetchBranchIncomePeriodSummary(
  branchId: number,
  from: string,
  to: string
): Promise<BranchIncomePeriodSummary> {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid branch id");
  }
  const q = new URLSearchParams({ from, to });
  const r = await apiRequest<BranchIncomePeriodSummary>(
    `/branches/${id}/income-period-summary?${q.toString()}`
  );
  return {
    ...r,
    totalIncome: Number(r.totalIncome ?? 0) || 0,
    incomeCash: Number(r.incomeCash ?? 0) || 0,
    incomeCard: Number(r.incomeCard ?? 0) || 0,
    incomeCashPatron: Number(r.incomeCashPatron ?? 0) || 0,
    incomeCashBranchManager: Number(r.incomeCashBranchManager ?? 0) || 0,
    incomeCashRemainsAtBranch: Number(r.incomeCashRemainsAtBranch ?? 0) || 0,
    incomeCashUnspecified: Number(r.incomeCashUnspecified ?? 0) || 0,
    incomeCashBranchManagerByPerson: normalizeIncomeCashBranchManagerByPersonRows(
      (r as BranchIncomePeriodSummary).incomeCashBranchManagerByPerson
    ),
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
    pocketClaimTransferNet: Number(r.pocketClaimTransferNet ?? 0) || 0,
    netRegisterOwesPocket: Number(r.netRegisterOwesPocket ?? 0) || 0,
    pocketCurrencyCode: r.pocketCurrencyCode?.trim() || null,
    pocketMixedCurrencies: Boolean(r.pocketMixedCurrencies),
  }));
}

/** GET /branches/{id}/held-register-cash-by-person — seçilen tarihe kadar net kasa parası (tutar &gt; 0). */
export async function fetchBranchHeldRegisterCashByPerson(
  branchId: number,
  asOfIsoDate: string
): Promise<IncomeCashBranchManagerPersonRow[]> {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid branch id");
  }
  const q = new URLSearchParams({ asOfDate: asOfIsoDate });
  const raw = await apiRequest<unknown>(
    `/branches/${id}/held-register-cash-by-person?${q.toString()}`
  );
  return normalizeIncomeCashBranchManagerByPersonRows(raw);
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
  const { type: mappedType, mainCategory: mappedMain } =
    branchTxDirectionAndClassificationFromApi(r as Record<string, unknown>);
  return {
    ...r,
    type: mappedType,
    mainCategory: mappedMain,
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
  /** Şube gider sekmesi: patron/cep borç kapatma OUT satırlarını gizler; ana kategori filtresi varken API yine listeler. */
  excludeDebtClosureOuts?: boolean;
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
  if (params.excludeDebtClosureOuts === true) q.set("excludeDebtClosureOuts", "true");
  const raw = await apiRequest<{
    filteredAmountTotal?: number;
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
    filteredAmountTotal:
      typeof raw.filteredAmountTotal === "number" && Number.isFinite(raw.filteredAmountTotal)
        ? raw.filteredAmountTotal
        : 0,
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

export type BranchStockSummaryParams = Omit<BranchStockPageParams, "page" | "pageSize">;

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

export async function fetchBranchStockReceiptsSummary(
  branchId: number,
  params: BranchStockSummaryParams
): Promise<BranchStockReceiptsSummary> {
  const PAGE_SIZE = 200;
  let page = 1;
  let filteredTotalQuantity = 0;
  const groups = new Map<number, { productId: number; productName: string; quantity: number }>();

  for (;;) {
    const res = await fetchBranchStockReceiptsPaged(branchId, {
      ...params,
      page,
      pageSize: PAGE_SIZE,
    });
    if (page === 1) {
      filteredTotalQuantity = Number(res.filteredTotalQuantity ?? 0) || 0;
    }
    for (const row of res.items) {
      const hasParent = row.parentProductId != null && row.parentProductId > 0;
      const productId = hasParent ? row.parentProductId! : row.productId;
      const productName = hasParent
        ? row.parentProductName?.trim() || row.productName.trim()
        : row.productName.trim();
      const current = groups.get(productId);
      if (current) {
        current.quantity += row.quantity;
      } else {
        groups.set(productId, {
          productId,
          productName: productName.length > 0 ? productName : `#${productId}`,
          quantity: row.quantity,
        });
      }
    }
    if (res.items.length === 0 || page * PAGE_SIZE >= res.totalCount) break;
    page += 1;
  }

  const parentBreakdown = Array.from(groups.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" });
  });
  return { filteredTotalQuantity, parentBreakdown };
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
