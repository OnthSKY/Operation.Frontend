import type { AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { ContractorPaymentListItem } from "@/modules/contractors/api/contractors-api";
import type { NonAdvanceExpenseSort } from "@/modules/personnel/lib/non-advance-expense-sort";
import { DEFAULT_NON_ADVANCE_EXPENSE_SORT } from "@/modules/personnel/lib/non-advance-expense-sort";

export type PersonnelCostRow =
  | { kind: "advance"; key: string; advance: AdvanceListItem }
  | { kind: "expense"; key: string; expense: BranchTransaction }
  | { kind: "contractorPayment"; key: string; payment: ContractorPaymentListItem };

export type CostsTab = "all" | "advances" | "expenses" | "contractorPayments";

export function rowDateIso(row: PersonnelCostRow): string {
  if (row.kind === "advance") return row.advance.advanceDate;
  if (row.kind === "contractorPayment") return row.payment.paymentDate;
  return row.expense.transactionDate;
}

export type RowDateTemporal = "future" | "today" | "thisMonth" | "past";

/** Satır tarihinin bugüne göre dönemi (tag/öne-çıkarma için). todayIso = YYYY-MM-DD. */
export function rowDateTemporal(dateIso: string, todayIso: string): RowDateTemporal {
  const d = (dateIso ?? "").slice(0, 10);
  if (d.length < 10 || !todayIso) return "past";
  if (d > todayIso) return "future";
  if (d === todayIso) return "today";
  if (d.slice(0, 7) === todayIso.slice(0, 7)) return "thisMonth";
  return "past";
}

function rowAmount(row: PersonnelCostRow): number {
  if (row.kind === "advance") return row.advance.amount;
  if (row.kind === "contractorPayment") return row.payment.amount;
  return row.expense.amount;
}

export function sortPersonnelCostRows(
  rows: PersonnelCostRow[],
  sort: NonAdvanceExpenseSort
): PersonnelCostRow[] {
  const out = rows.slice();
  if (sort === "categoryTotalDesc") {
    return out;
  }
  out.sort((a, b) => {
    if (sort === "dateDesc" || sort === "dateAsc") {
      const desc = sort === "dateDesc";
      const c = rowDateIso(a).localeCompare(rowDateIso(b));
      return desc ? -c : c;
    }
    const desc = sort === "amountDesc";
    return compareAmount(rowAmount(a), rowAmount(b), desc);
  });
  return out;
}

function compareAmount(a: number, b: number, desc: boolean): number {
  if (a === b) return 0;
  if (desc) return a > b ? -1 : 1;
  return a < b ? -1 : 1;
}

export function buildPersonnelCostRows(
  advances: AdvanceListItem[],
  expenses: BranchTransaction[],
  tab: CostsTab,
  /** "all" görünümünde tabloya eklenecek dış çalışan ödemeleri (avans/gider sekmelerinde gizli). */
  contractorPayments: ContractorPaymentListItem[] = []
): PersonnelCostRow[] {
  const adv = advances.map(
    (advance): PersonnelCostRow => ({
      kind: "advance",
      key: `a-${advance.id}`,
      advance,
    })
  );
  const exp = expenses.map(
    (expense): PersonnelCostRow => ({
      kind: "expense",
      key: `e-${expense.id}`,
      expense,
    })
  );
  if (tab === "advances") return adv;
  if (tab === "expenses") return exp;
  const cp = contractorPayments.map(
    (payment): PersonnelCostRow => ({
      kind: "contractorPayment",
      key: `c-${payment.id}`,
      payment,
    })
  );
  if (tab === "contractorPayments") return cp;
  return [...adv, ...exp, ...cp];
}

export function clampSortForTab(
  tab: CostsTab,
  sort: NonAdvanceExpenseSort
): NonAdvanceExpenseSort {
  if (sort === "categoryTotalDesc" && tab !== "expenses") {
    return DEFAULT_NON_ADVANCE_EXPENSE_SORT;
  }
  return sort;
}

export function expenseApiSortForTab(
  tab: CostsTab,
  sort: NonAdvanceExpenseSort
): NonAdvanceExpenseSort {
  if (tab === "expenses") return clampSortForTab(tab, sort);
  return DEFAULT_NON_ADVANCE_EXPENSE_SORT;
}

function normalizeCcy(ccy: string | null | undefined): string {
  return String(ccy ?? "TRY").trim().toUpperCase() || "TRY";
}

function rowCurrency(row: PersonnelCostRow): string {
  if (row.kind === "advance") return normalizeCcy(row.advance.currencyCode);
  if (row.kind === "contractorPayment") return normalizeCcy(row.payment.currencyCode);
  return normalizeCcy(row.expense.currencyCode);
}

export type CategoryBucket = {
  /** Stable key (kind + category text). */
  key: string;
  /** Display label. */
  label: string;
  /** True when bucket represents advance rows. */
  isAdvance: boolean;
  count: number;
  totals: Map<string, number>;
};

/**
 * Avans satırlarını "Avans" altında toplar; gider satırlarını mainCategory →
 * category fallback ile gruplar. Tutarsız sınıflandırılmış satırlar
 * `uncategorizedLabel` altında toplanır.
 */
export function groupRowsByCategory(
  rows: PersonnelCostRow[],
  advanceLabel: string,
  uncategorizedLabel: string,
  /** Ham classification kodunu (OUT_PER_UNIFORM vb.) okunaklı etikete çevirir; verilmezse ham kod. */
  resolveExpenseLabel?: (rawCode: string) => string
): CategoryBucket[] {
  const buckets = new Map<string, CategoryBucket>();

  const touch = (key: string, label: string, isAdvance: boolean) => {
    let b = buckets.get(key);
    if (!b) {
      b = { key, label, isAdvance, count: 0, totals: new Map() };
      buckets.set(key, b);
    }
    return b;
  };

  for (const row of rows) {
    if (row.kind === "advance") {
      const b = touch("advance", advanceLabel, true);
      const n = Number(row.advance.amount);
      if (Number.isFinite(n)) {
        const ccy = normalizeCcy(row.advance.currencyCode);
        b.totals.set(ccy, (b.totals.get(ccy) ?? 0) + n);
        b.count += 1;
      }
      continue;
    }
    // Dış çalışan ödemeleri kategori kırılımına girmez (personel-özel breakdown).
    if (row.kind === "contractorPayment") continue;
    const raw =
      row.expense.mainCategory?.trim() ||
      row.expense.category?.trim() ||
      "";
    const label = raw ? resolveExpenseLabel?.(raw) ?? raw : uncategorizedLabel;
    const key = `expense:${raw || "__none__"}`;
    const b = touch(key, label, false);
    const n = Number(row.expense.amount);
    if (Number.isFinite(n)) {
      const ccy = normalizeCcy(row.expense.currencyCode);
      b.totals.set(ccy, (b.totals.get(ccy) ?? 0) + n);
      b.count += 1;
    }
  }

  const arr = [...buckets.values()];
  arr.sort((a, b) => {
    const tryA = a.totals.get("TRY") ?? 0;
    const tryB = b.totals.get("TRY") ?? 0;
    if (tryA !== tryB) return tryB - tryA;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
  return arr;
}

export type MonthBucket = {
  /** YYYY-MM */
  ym: string;
  count: number;
  advanceTotals: Map<string, number>;
  expenseTotals: Map<string, number>;
  totals: Map<string, number>;
};

function ymOfRow(row: PersonnelCostRow): string | null {
  const iso = rowDateIso(row);
  if (typeof iso !== "string" || iso.length < 7) return null;
  const ym = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(ym) ? ym : null;
}

/**
 * Satırları YYYY-AA dönemlerine böler. Sonuç en yeni dönem önde gelecek
 * şekilde sıralanır. Tarih ayrıştırılamayan satırlar atlanır.
 */
export function groupRowsByMonth(rows: PersonnelCostRow[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const row of rows) {
    const ym = ymOfRow(row);
    if (!ym) continue;
    let b = map.get(ym);
    if (!b) {
      b = {
        ym,
        count: 0,
        advanceTotals: new Map(),
        expenseTotals: new Map(),
        totals: new Map(),
      };
      map.set(ym, b);
    }
    const amount = Number(rowAmount(row));
    if (!Number.isFinite(amount)) continue;
    const ccy = rowCurrency(row);
    const target = row.kind === "advance" ? b.advanceTotals : b.expenseTotals;
    target.set(ccy, (target.get(ccy) ?? 0) + amount);
    b.totals.set(ccy, (b.totals.get(ccy) ?? 0) + amount);
    b.count += 1;
  }
  const arr = [...map.values()];
  arr.sort((a, b) => b.ym.localeCompare(a.ym));
  return arr;
}

export function filterRowsByMonth(
  rows: PersonnelCostRow[],
  ym: string | null
): PersonnelCostRow[] {
  if (!ym) return rows;
  return rows.filter((r) => ymOfRow(r) === ym);
}

/** Satırları YYYY-AA-GG tarih aralığına göre süzer (from/to dahil, boş = sınırsız). */
export function filterRowsByDateRange(
  rows: PersonnelCostRow[],
  from: string | null,
  to: string | null
): PersonnelCostRow[] {
  const f = from?.trim() || "";
  const t = to?.trim() || "";
  if (!f && !t) return rows;
  return rows.filter((r) => {
    const d = rowDateIso(r).slice(0, 10);
    if (d.length < 10) return false;
    if (f && d < f) return false;
    if (t && d > t) return false;
    return true;
  });
}

export function sumRowsByCurrency(
  rows: PersonnelCostRow[]
): { totals: Map<string, number>; count: number } {
  const totals = new Map<string, number>();
  let count = 0;
  for (const row of rows) {
    const n = Number(rowAmount(row));
    if (!Number.isFinite(n)) continue;
    const ccy = rowCurrency(row);
    totals.set(ccy, (totals.get(ccy) ?? 0) + n);
    count += 1;
  }
  return { totals, count };
}
