import { txCodeLabel } from "@/modules/branch/lib/branch-transaction-options";
import type { FinancialCategoryBreakdownRow } from "@/types/reports";

/** Rapor kırılımında kategori: API etiket anahtarı veya şube kasası kod sözlüğü. */
export function financialBreakdownCategoryLabel(
  row: Pick<FinancialCategoryBreakdownRow, "category" | "categoryLabelKey">,
  t: (key: string) => string
): string {
  if (row.categoryLabelKey) {
    const v = t(row.categoryLabelKey);
    if (v !== row.categoryLabelKey) return v;
  }
  const c = (row.category ?? "").trim();
  if (!c) return "—";
  return txCodeLabel(c, t) || c;
}

export function financialBreakdownMainLabel(
  main: string | null | undefined,
  t: (key: string) => string
): string {
  const m = (main ?? "").trim();
  if (!m) return "—";
  return txCodeLabel(m, t) || m;
}

/** Maliyet davranışı etiketi: FIXED / VARIABLE / CAPEX / NONE. Gelir/transfer satırları için '—'. */
export function financialCostBehaviorLabel(
  behavior: string | null | undefined,
  t: (key: string) => string
): string {
  const b = (behavior ?? "").trim().toUpperCase();
  if (b === "FIXED") return t("reports.costBehavior.fixed");
  if (b === "VARIABLE") return t("reports.costBehavior.variable");
  if (b === "CAPEX") return t("reports.costBehavior.capex");
  return "—";
}

export function financialBreakdownTypeLabel(
  type: string,
  typeLabelKey: string | undefined,
  t: (key: string) => string
): string {
  if (typeLabelKey) {
    const v = t(typeLabelKey);
    if (v !== typeLabelKey) return v;
  }
  const u = type.trim().toUpperCase();
  if (u === "IN") return t("reports.finance.direction.in");
  if (u === "OUT") return t("reports.finance.direction.out");
  return type;
}
