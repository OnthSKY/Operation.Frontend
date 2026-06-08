"use client";

import { fetchAllBranchPatronExpenses } from "@/modules/branch/api/branches-api";
import { fetchAllNonAdvancePersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  fetchGeneralOverheadPools,
  type GeneralOverheadPoolRow,
} from "@/modules/general-overhead/api/general-overhead-api";
import { fetchAllAdvances } from "@/modules/personnel/api/advances-api";
import { reportsKeys } from "@/modules/reports/query-keys";
import {
  fetchPatronSupplierPayments,
  type PatronSupplierPayment,
} from "@/modules/suppliers/api/suppliers-api";
import type { AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type PatronExpenseRow = BranchTransaction & {
  branchName: string | null;
  /** Standalone Advance row that has no linked branch_transaction. */
  derivedFromAdvanceId?: number;
  /** Unallocated general-overhead pool row (status=OPEN). */
  derivedFromOverheadPoolId?: number;
  /** supplier_payments row where source_type=PATRON; no branch_transaction exists. */
  derivedFromSupplierPaymentId?: number;
  /** Tedarikçi-bağlı satırlar için ad — UI ana etiket olarak kullanır. */
  supplierName?: string | null;
};

export type PatronExpensesPartialFailure = {
  /** Which data source failed. */
  source:
    | "branch"
    | "advances"
    | "overheadPools"
    | "centralPersonnelExpenses"
    | "supplierPayments";
  /** Branch name (when source="branch") or null. */
  branchName?: string | null;
  message: unknown;
};

export type PatronExpensesState =
  | { kind: "loading" }
  | { kind: "error"; message: unknown }
  | { kind: "empty"; partialFailures?: PatronExpensesPartialFailure[] }
  | {
      kind: "ok";
      rows: PatronExpenseRow[];
      branchCount: number;
      partialFailures?: PatronExpensesPartialFailure[];
    };

/**
 * Hedef kategori (bucket) grubu — patron raporundaki üst filtre. UI birden çok
 * bucket'ı tek seçenekte birleştirir; hook ise alakasız kaynakları (advances,
 * centralPersonnel, overheadPools, supplierPayments) hiç fetch etmez.
 *
 * "branch_ops" ve "vehicle" yalnız branch_transactions üzerinden gelir, yani diğer
 * 4 kaynak skip edilir; "supplier"/"overhead" gibi gruplar ilgili özel kaynağı
 * branch_transactions'la birlikte tutar.
 */
export type PatronExpenseBucketGroup =
  | "all"
  | "supplier"
  | "overhead"
  | "branch"
  | "personnel"
  | "vehicle";

type SourceToggles = {
  branchTx: boolean;
  advances: boolean;
  overheadPools: boolean;
  centralPersonnel: boolean;
  supplierPayments: boolean;
};

function togglesForGroup(group: PatronExpenseBucketGroup): SourceToggles {
  switch (group) {
    case "supplier":
      return {
        branchTx: true,
        advances: false,
        overheadPools: false,
        centralPersonnel: false,
        supplierPayments: true,
      };
    case "overhead":
      return {
        branchTx: true,
        advances: false,
        overheadPools: true,
        centralPersonnel: false,
        supplierPayments: false,
      };
    case "branch":
      return {
        branchTx: true,
        advances: false,
        overheadPools: false,
        centralPersonnel: false,
        supplierPayments: false,
      };
    case "personnel":
      return {
        branchTx: true,
        advances: true,
        overheadPools: false,
        centralPersonnel: true,
        supplierPayments: false,
      };
    case "vehicle":
      return {
        branchTx: true,
        advances: false,
        overheadPools: false,
        centralPersonnel: false,
        supplierPayments: false,
      };
    case "all":
    default:
      return {
        branchTx: true,
        advances: true,
        overheadPools: true,
        centralPersonnel: true,
        supplierPayments: true,
      };
  }
}

type Params = {
  dateFrom: string;
  dateTo: string;
  /** "" or undefined = all branches; otherwise single branch id. */
  branchFilterId?: string | undefined;
  /** Hedef kategori grubu; "all" tüm kaynakları fetch eder. */
  bucketGroup?: PatronExpenseBucketGroup;
  enabled: boolean;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function overheadPoolToPatronExpenseRow(
  pool: GeneralOverheadPoolRow
): PatronExpenseRow {
  return {
    // Far-negative id to avoid collision with branch_transactions (positive) and
    // advance-derived rows (small negative).
    id: -1_000_000_000 - pool.id,
    branchId: null,
    type: "OUT",
    mainCategory: pool.mainCategory || "OUT_OPS",
    category: pool.category || null,
    amount: pool.amountTotal,
    cashAmount: null,
    cardAmount: null,
    currencyCode: pool.currencyCode,
    transactionDate: pool.expenseDate,
    description: pool.notes ? `${pool.title} — ${pool.notes}` : pool.title,
    cashSettlementParty: null,
    cashSettlementPersonnelId: null,
    cashSettlementPersonnelFullName: null,
    cashSettlementPersonnelJobTitle: null,
    expensePaymentSource: "PATRON",
    invoicePaymentStatus: null,
    expensePocketPersonnelId: null,
    expensePocketPersonnelFullName: null,
    expensePocketPersonnelJobTitle: null,
    hasReceiptPhoto: false,
    linkedAdvanceId: null,
    linkedSalaryPaymentId: null,
    linkedAdvancePersonnelId: null,
    linkedSalaryPersonnelId: null,
    linkedAdvancePersonnelFullName: null,
    linkedSalaryPersonnelFullName: null,
    linkedPersonnelId: null,
    linkedPersonnelFullName: null,
    generalOverheadPoolId: pool.id,
    branchName: null,
    derivedFromOverheadPoolId: pool.id,
  };
}

function supplierPaymentToPatronExpenseRow(
  pay: PatronSupplierPayment,
): PatronExpenseRow {
  const parts: string[] = [];
  if (pay.supplierNames) parts.push(pay.supplierNames);
  if (pay.invoiceDocumentNumbers) parts.push(`#${pay.invoiceDocumentNumbers}`);
  if (pay.description) parts.push(pay.description);
  const desc = parts.join(" — ") || null;
  return {
    // Distinct negative-id band to avoid collisions: branch_transactions are positive,
    // advance-derived use -id, overhead pools use -1_000_000_000-id, central
    // personnel use real positive ids. Supplier payments take -2_000_000_000-id.
    id: -2_000_000_000 - pay.id,
    branchId: pay.branchId ?? null,
    type: "OUT",
    // OUT_GOODS keeps "stock purchase" semantics; bucketFromRow classifies via
    // derivedFromSupplierPaymentId, so mainCategory is informational only.
    mainCategory: "OUT_GOODS",
    category: null,
    amount: pay.amount,
    cashAmount: null,
    cardAmount: null,
    currencyCode: pay.currencyCode,
    transactionDate: pay.paymentDate,
    description: desc,
    cashSettlementParty: null,
    cashSettlementPersonnelId: null,
    cashSettlementPersonnelFullName: null,
    cashSettlementPersonnelJobTitle: null,
    expensePaymentSource: "PATRON",
    invoicePaymentStatus: null,
    expensePocketPersonnelId: null,
    expensePocketPersonnelFullName: null,
    expensePocketPersonnelJobTitle: null,
    hasReceiptPhoto: false,
    linkedAdvanceId: null,
    linkedSalaryPaymentId: null,
    linkedAdvancePersonnelId: null,
    linkedSalaryPersonnelId: null,
    linkedAdvancePersonnelFullName: null,
    linkedSalaryPersonnelFullName: null,
    linkedPersonnelId: null,
    linkedPersonnelFullName: null,
    branchName: pay.branchName,
    derivedFromSupplierPaymentId: pay.id,
    supplierName: pay.supplierNames ?? null,
  };
}

function advanceToPatronExpenseRow(adv: AdvanceListItem): PatronExpenseRow {
  return {
    // Negative id keeps React keys unique vs real branch_transactions.
    id: -adv.id,
    branchId: adv.branchId,
    type: "OUT",
    mainCategory: "OUT_PERSONNEL",
    category: "PER_ADVANCE",
    amount: adv.amount,
    cashAmount: null,
    cardAmount: null,
    currencyCode: adv.currencyCode,
    transactionDate: adv.advanceDate,
    description: adv.description,
    cashSettlementParty: null,
    cashSettlementPersonnelId: null,
    cashSettlementPersonnelFullName: null,
    cashSettlementPersonnelJobTitle: null,
    expensePaymentSource: "PATRON",
    invoicePaymentStatus: null,
    expensePocketPersonnelId: null,
    expensePocketPersonnelFullName: null,
    expensePocketPersonnelJobTitle: null,
    hasReceiptPhoto: false,
    linkedAdvanceId: adv.id,
    linkedSalaryPaymentId: null,
    linkedAdvancePersonnelId: adv.personnelId,
    linkedSalaryPersonnelId: null,
    linkedAdvancePersonnelFullName: adv.personnelFullName,
    linkedSalaryPersonnelFullName: null,
    linkedPersonnelId: adv.personnelId,
    linkedPersonnelFullName: adv.personnelFullName,
    branchName: adv.branchName,
    derivedFromAdvanceId: adv.id,
  };
}

export function useAllBranchesPatronExpenses({
  dateFrom,
  dateTo,
  branchFilterId,
  bucketGroup = "all",
  enabled,
}: Params) {
  const toggles = useMemo(() => togglesForGroup(bucketGroup), [bucketGroup]);
  const {
    data: allBranches = [],
    isPending: branchesPending,
    isError: branchesError,
    error: branchesErr,
  } = useBranchesList();

  const datesOk = ISO_RE.test(dateFrom) && ISO_RE.test(dateTo) && dateFrom <= dateTo;

  const targetBranches = useMemo(() => {
    if (!branchFilterId) return allBranches;
    const id = Number.parseInt(branchFilterId, 10);
    if (!Number.isFinite(id) || id <= 0) return allBranches;
    return allBranches.filter((b) => b.id === id);
  }, [allBranches, branchFilterId]);

  const fetchEnabled =
    enabled &&
    !branchesPending &&
    !branchesError &&
    datesOk &&
    targetBranches.length > 0;

  const txResults = useQueries({
    queries: targetBranches.map((b) => ({
      queryKey: reportsKeys.patronExpensesForBranch(b.id, dateFrom, dateTo),
      queryFn: () => fetchAllBranchPatronExpenses(b.id, dateFrom, dateTo),
      enabled: fetchEnabled && toggles.branchTx,
    })),
  });

  // Advances API is year-keyed (not date-range); fetch all once, filter client-side.
  // Patron-paid advances may not have a corresponding branch_transaction row, so we
  // need to pull them from the Advance table directly.
  const advancesQuery = useQuery({
    queryKey: reportsKeys.patronStandaloneAdvances,
    queryFn: () => fetchAllAdvances({ limit: 1000 }),
    enabled: fetchEnabled && toggles.advances,
  });

  // OPEN general-overhead pools: not yet allocated, so no branch_transactions exist;
  // we assume these are patron-paid (allocation default is PATRON).
  const openPoolsQuery = useQuery({
    queryKey: reportsKeys.patronOpenOverheadPools,
    queryFn: () => fetchGeneralOverheadPools("OPEN"),
    enabled: fetchEnabled && toggles.overheadPools,
  });

  // Central (branchId=null) personnel expenses: the per-branch endpoint can't see
  // these. fetchAllNonAdvancePersonnelAttributedExpenses returns every personnel-
  // attributed expense across the org including branchless ones — we filter for
  // branchId=null + PATRON + date range to surface what the per-branch loop misses.
  const centralPersonnelExpensesQuery = useQuery({
    queryKey: reportsKeys.patronCentralPersonnelExpenses,
    queryFn: () => fetchAllNonAdvancePersonnelAttributedExpenses(),
    enabled: fetchEnabled && toggles.centralPersonnel,
  });

  // PATRON-paid supplier_payments: not written to branch_transactions, so the
  // per-branch endpoint can't see these. Server-side filtered by date + optional branch.
  const supplierPaymentBranchFilter = useMemo(() => {
    if (!branchFilterId) return null;
    const n = Number.parseInt(branchFilterId, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [branchFilterId]);
  const supplierPaymentsQuery = useQuery({
    queryKey: reportsKeys.patronSupplierPayments(
      dateFrom,
      dateTo,
      supplierPaymentBranchFilter,
    ),
    queryFn: () =>
      fetchPatronSupplierPayments({
        dateFrom,
        dateTo,
        branchId: supplierPaymentBranchFilter,
      }),
    enabled: fetchEnabled && toggles.supplierPayments,
  });

  const state = useMemo((): PatronExpensesState => {
    if (!enabled) return { kind: "empty" };
    if (branchesPending) return { kind: "loading" };
    if (branchesError) return { kind: "error", message: branchesErr };
    if (!datesOk) return { kind: "empty" };
    if (targetBranches.length === 0) return { kind: "empty" };
    // enabled:false sorgular kalıcı pending görünür — toggle kapalıyken atla.
    if (toggles.branchTx && txResults.some((r) => r.isPending))
      return { kind: "loading" };
    if (toggles.advances && advancesQuery.isPending) return { kind: "loading" };
    if (toggles.overheadPools && openPoolsQuery.isPending)
      return { kind: "loading" };
    if (toggles.centralPersonnel && centralPersonnelExpensesQuery.isPending)
      return { kind: "loading" };
    if (toggles.supplierPayments && supplierPaymentsQuery.isPending)
      return { kind: "loading" };

    // Collect partial failures: don't reject the whole page if some sources fail —
    // show what we have and warn the user about what's missing.
    const partialFailures: PatronExpensesPartialFailure[] = [];
    let successfulBranchCount = 0;
    for (let i = 0; i < targetBranches.length; i++) {
      const r = txResults[i];
      if (r?.isError) {
        partialFailures.push({
          source: "branch",
          branchName: targetBranches[i].name,
          message: r.error,
        });
      } else {
        successfulBranchCount += 1;
      }
    }
    if (advancesQuery.isError) {
      partialFailures.push({
        source: "advances",
        message: advancesQuery.error,
      });
    }
    if (openPoolsQuery.isError) {
      partialFailures.push({
        source: "overheadPools",
        message: openPoolsQuery.error,
      });
    }
    if (centralPersonnelExpensesQuery.isError) {
      partialFailures.push({
        source: "centralPersonnelExpenses",
        message: centralPersonnelExpensesQuery.error,
      });
    }
    if (supplierPaymentsQuery.isError) {
      partialFailures.push({
        source: "supplierPayments",
        message: supplierPaymentsQuery.error,
      });
    }

    // If every source failed, surface a hard error rather than misleading "empty".
    const allBranchesFailed =
      targetBranches.length > 0 && successfulBranchCount === 0;
    const advancesUnusable = advancesQuery.isError;
    const poolsUnusable = openPoolsQuery.isError;
    if (allBranchesFailed && advancesUnusable && poolsUnusable) {
      return {
        kind: "error",
        message: partialFailures[0]?.message ?? "all sources failed",
      };
    }

    const rows: PatronExpenseRow[] = [];

    // 1) branch_transactions with expensePaymentSource=PATRON (only successful branches)
    for (let i = 0; i < targetBranches.length; i++) {
      const r = txResults[i];
      if (r?.isError) continue;
      const b = targetBranches[i];
      const data = r?.data ?? [];
      for (const tx of data) {
        rows.push({ ...tx, branchName: b.name });
      }
    }

    // 2) standalone PATRON advances (sourceType=PATRON, no linked branch_transaction)
    const branchFilterIdNum = branchFilterId
      ? Number.parseInt(branchFilterId, 10)
      : NaN;
    const branchFilterActive =
      Number.isFinite(branchFilterIdNum) && branchFilterIdNum > 0;
    if (!advancesUnusable) {
      const advances = advancesQuery.data ?? [];
      for (const adv of advances) {
        if ((adv.sourceType ?? "").toUpperCase() !== "PATRON") continue;
        if (adv.linkedBranchTransactionId != null) continue; // already in branch_transactions
        // Backend may return either "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ssZ"; slice
        // to date-only before lexicographic compare against the filter range.
        const advDate = (adv.advanceDate ?? "").slice(0, 10);
        if (advDate < dateFrom || advDate > dateTo) continue;
        if (branchFilterActive && adv.branchId !== branchFilterIdNum) continue;
        rows.push(advanceToPatronExpenseRow(adv));
      }
    }

    // 3) OPEN general-overhead pools (assumed patron-paid; branchless).
    // When a branch filter is active, skip pools entirely (they are central, not branch-bound).
    if (!branchFilterActive && !poolsUnusable) {
      const pools = openPoolsQuery.data ?? [];
      for (const pool of pools) {
        if ((pool.status ?? "").toUpperCase() !== "OPEN") continue;
        const poolDate = (pool.expenseDate ?? "").slice(0, 10);
        if (poolDate < dateFrom || poolDate > dateTo) continue;
        rows.push(overheadPoolToPatronExpenseRow(pool));
      }
    }

    // 4) Central (branchId=null) personnel expenses — per-branch endpoint can't reach
    // these. Skip when a branch filter is active (these are by definition branchless).
    if (!branchFilterActive && !centralPersonnelExpensesQuery.isError) {
      const seenIds = new Set<number>();
      for (const r of rows) {
        if (r.id > 0) seenIds.add(r.id);
      }
      const centrals = centralPersonnelExpensesQuery.data ?? [];
      for (const tx of centrals) {
        if (tx.branchId != null && tx.branchId > 0) continue; // not central
        if ((tx.expensePaymentSource ?? "").toUpperCase() !== "PATRON") continue;
        if ((tx.type ?? "").toUpperCase() !== "OUT") continue;
        const date = (tx.transactionDate ?? "").slice(0, 10);
        if (date < dateFrom || date > dateTo) continue;
        if (seenIds.has(tx.id)) continue; // already counted (defensive)
        rows.push({ ...tx, branchName: null });
      }
    }

    // 5) PATRON-paid supplier_payments — server already filtered by date/branch.
    if (!supplierPaymentsQuery.isError) {
      const pays = supplierPaymentsQuery.data ?? [];
      for (const pay of pays) {
        rows.push(supplierPaymentToPatronExpenseRow(pay));
      }
    }

    if (rows.length === 0) {
      return partialFailures.length > 0
        ? { kind: "empty", partialFailures }
        : { kind: "empty" };
    }
    return {
      kind: "ok",
      rows,
      branchCount: targetBranches.length,
      ...(partialFailures.length > 0 ? { partialFailures } : {}),
    };
  }, [
    enabled,
    branchesPending,
    branchesError,
    branchesErr,
    datesOk,
    targetBranches,
    txResults,
    advancesQuery.data,
    advancesQuery.isPending,
    advancesQuery.isError,
    advancesQuery.error,
    openPoolsQuery.data,
    openPoolsQuery.isPending,
    openPoolsQuery.isError,
    openPoolsQuery.error,
    centralPersonnelExpensesQuery.data,
    centralPersonnelExpensesQuery.isPending,
    centralPersonnelExpensesQuery.isError,
    centralPersonnelExpensesQuery.error,
    supplierPaymentsQuery.data,
    supplierPaymentsQuery.isPending,
    supplierPaymentsQuery.isError,
    supplierPaymentsQuery.error,
    branchFilterId,
    dateFrom,
    dateTo,
    toggles,
  ]);

  const isFetching =
    branchesPending ||
    txResults.some((r) => r.isFetching) ||
    advancesQuery.isFetching ||
    openPoolsQuery.isFetching ||
    centralPersonnelExpensesQuery.isFetching ||
    supplierPaymentsQuery.isFetching;
  const refetch = () => {
    for (const r of txResults) void r.refetch();
    void advancesQuery.refetch();
    void openPoolsQuery.refetch();
    void centralPersonnelExpensesQuery.refetch();
    void supplierPaymentsQuery.refetch();
  };

  return { state, isFetching, refetch };
}
