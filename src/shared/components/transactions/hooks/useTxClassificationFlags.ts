"use client";

import { useMemo } from "react";
import {
  isNonPnlMemoClassificationMain,
  isOutPersonnelClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
  outPersonnelCategoryEffective,
  outPersonnelSubcategoryNeedsFinancialLink,
} from "@/modules/branch/lib/branch-transaction-options";

/**
 * Form mainCategory + category + txType + akış flag'lerinden türetilen «satır türü
 * sınıflandırma» flag'leri. Tek noktada hesaplanır → modal içinde 10+ değişken
 * dropbox gibi inline if-zincirlerinin yerine geçer.
 */
export type UseTxClassificationFlagsInput = {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  categoryWatch: string | null | undefined;
  personnelExpenseFlow: boolean;
  personnelLinkedExpenseContext: boolean;
};

export type UseTxClassificationFlagsResult = {
  mainCat: string;
  subCat: string;
  /** Şemsiye veya granüler OUT_POCKET_REPAY. */
  isPocketRepayMain: boolean;
  /** Yalnızca şemsiye OUT_PERSONNEL_POCKET_REPAY: önceki cep satırları picker'ı görünür. */
  isPocketRepaySettlementUmbrellaMain: boolean;
  isPocketClaimTransferMain: boolean;
  isPatronDebtRepayMain: boolean;
  isNonPnlMemoMain: boolean;
  needsExpenseAdvancePick: boolean;
  needsExpenseSalaryPick: boolean;
  needsExpenseFinancialPersonnelPick: boolean;
  needsDirectPersonnelPickForPersonnelExpense: boolean;
};

export function useTxClassificationFlags(
  input: UseTxClassificationFlagsInput
): UseTxClassificationFlagsResult {
  const {
    txType,
    mainCategoryWatch,
    categoryWatch,
    personnelExpenseFlow,
    personnelLinkedExpenseContext,
  } = input;

  const tyUpper = txType.toUpperCase();
  const mainCat = String(mainCategoryWatch ?? "").trim();
  const mainUpper = mainCat.toUpperCase();

  const isPocketRepayMain =
    tyUpper === "OUT" && isPersonnelPocketRepayClassificationMain(mainCat);
  const isPocketRepaySettlementUmbrellaMain =
    tyUpper === "OUT" && mainUpper === "OUT_PERSONNEL_POCKET_REPAY";
  const isPocketClaimTransferMain =
    tyUpper === "OUT" && isPocketClaimTransferClassificationMain(mainCat);
  const isPatronDebtRepayMain =
    tyUpper === "OUT" && isPatronDebtRepayClassificationMain(mainCat);
  const isNonPnlMemoMain = tyUpper === "OUT" && isNonPnlMemoClassificationMain(mainCat);

  const subCat = outPersonnelCategoryEffective(mainCat, categoryWatch).toUpperCase();
  const needsExpenseAdvancePick =
    tyUpper === "OUT" &&
    isOutPersonnelClassificationMain(mainCat) &&
    subCat === "PER_ADVANCE";
  const needsExpenseSalaryPick =
    tyUpper === "OUT" &&
    isOutPersonnelClassificationMain(mainCat) &&
    (subCat === "PER_SALARY" || subCat === "PER_BONUS");
  const needsExpenseFinancialPersonnelPick =
    needsExpenseAdvancePick || needsExpenseSalaryPick;

  const needsDirectPersonnelPickForPersonnelExpense = useMemo(() => {
    if (!personnelExpenseFlow || personnelLinkedExpenseContext) return false;
    if (tyUpper !== "OUT") return false;
    if (!isOutPersonnelClassificationMain(mainCat)) return false;
    if (!subCat) return false;
    if (needsExpenseFinancialPersonnelPick) return false;
    return !outPersonnelSubcategoryNeedsFinancialLink(subCat);
  }, [
    personnelExpenseFlow,
    personnelLinkedExpenseContext,
    tyUpper,
    mainCat,
    subCat,
    needsExpenseFinancialPersonnelPick,
  ]);

  return {
    mainCat,
    subCat,
    isPocketRepayMain,
    isPocketRepaySettlementUmbrellaMain,
    isPocketClaimTransferMain,
    isPatronDebtRepayMain,
    isNonPnlMemoMain,
    needsExpenseAdvancePick,
    needsExpenseSalaryPick,
    needsExpenseFinancialPersonnelPick,
    needsDirectPersonnelPickForPersonnelExpense,
  };
}
