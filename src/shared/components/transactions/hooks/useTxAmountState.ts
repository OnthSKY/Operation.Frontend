"use client";

import { useMemo } from "react";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import {
  isPatronCashIncomeMain,
  isRegisterDayCloseIncomeRow,
} from "@/modules/branch/lib/branch-transaction-options";
import type { Locale } from "@/i18n/messages";
import type { BranchRegisterSummary } from "@/types/branch";
import type { DayCloseBundledConfirmedLine } from "../lib/tx-form-types";

/**
 * Form'daki tutar-ilişkili türetilmiş state'leri tek noktada hesaplar.
 * Modal'daki 6-7 ayrı useMemo'u birleştirir.
 *
 * Çıktı:
 *  - patronCashIncomeMainActive: IN + IN_PATRON / IN_PATRON_CASH
 *  - incomeSplitActive: IN + nakit veya kart kırılımı dolu
 *  - registerDayClose: IN_DAY_CLOSE satırı mı
 *  - splitTotal: nakit + kart toplamı (split mod aktifken)
 *  - financialAmountLocked: tutar readOnly olmalı mı?
 *  - priorRegisterExpenses + bundledRegisterExpenses + totalDeductible
 *  - enteredCashIncome: form'a girilen nakit (split veya tek)
 *  - netCashHandover: gün sonu kasa devri net tutarı
 *  - parsedCashPositive: nakit > 0 mu (cash settlement görünürlüğü için)
 */
export type UseTxAmountStateInput = {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  categoryWatch: string | null | undefined;
  amountWatch: string | null | undefined;
  amountCashWatch: string | null | undefined;
  amountCardWatch: string | null | undefined;
  expenseFinancialLinkWatch: string | null | undefined;
  locale: Locale;
  /** Önceki cep satırı seçimi aktif (umbrella POCKET_REPAY) — amount kilitli. */
  isPocketRepaySettlementUmbrellaMain: boolean;
  needsExpenseSalaryPick: boolean;
  needsExpenseAdvanceExisting: boolean;
  /** Gün sonu için: gün içi kasa giderlerini toplayan query özeti. */
  registerSummary: BranchRegisterSummary | undefined;
  /** Gün sonu için: bundled gider satırları. */
  dayCloseBundledConfirmedLines: DayCloseBundledConfirmedLine[];
};

export type UseTxAmountStateResult = {
  patronCashIncomeMainActive: boolean;
  incomeSplitActive: boolean;
  registerDayClose: boolean;
  splitTotal: number | null;
  financialAmountLocked: boolean;
  priorRegisterExpenses: number;
  bundledRegisterExpenses: number;
  totalDeductibleRegisterExpenses: number;
  enteredCashIncome: number;
  netCashHandover: number;
  parsedCashPositive: boolean;
};

export function useTxAmountState(input: UseTxAmountStateInput): UseTxAmountStateResult {
  const {
    txType,
    mainCategoryWatch,
    categoryWatch,
    amountWatch,
    amountCashWatch,
    amountCardWatch,
    expenseFinancialLinkWatch,
    locale,
    isPocketRepaySettlementUmbrellaMain,
    needsExpenseSalaryPick,
    needsExpenseAdvanceExisting,
    registerSummary,
    dayCloseBundledConfirmedLines,
  } = input;

  const tyUpper = txType.toUpperCase();

  const patronCashIncomeMainActive =
    tyUpper === "IN" && isPatronCashIncomeMain(mainCategoryWatch);

  const incomeSplitActive =
    tyUpper === "IN" &&
    !patronCashIncomeMainActive &&
    (String(amountCashWatch ?? "").trim() !== "" ||
      String(amountCardWatch ?? "").trim() !== "");

  const registerDayClose = isRegisterDayCloseIncomeRow(
    txType,
    mainCategoryWatch,
    categoryWatch
  );

  const splitTotal = useMemo<number | null>(() => {
    if (!incomeSplitActive) return null;
    const c = parseLocaleAmount(String(amountCashWatch ?? ""), locale);
    const k = parseLocaleAmount(String(amountCardWatch ?? ""), locale);
    if (!Number.isFinite(c) || !Number.isFinite(k) || c < 0 || k < 0) return null;
    return c + k;
  }, [incomeSplitActive, amountCashWatch, amountCardWatch, locale]);

  const financialAmountLocked = useMemo(() => {
    if (isPocketRepaySettlementUmbrellaMain) return true;
    const link = String(expenseFinancialLinkWatch ?? "").trim();
    if (needsExpenseSalaryPick && link.startsWith("sal:")) return true;
    if (needsExpenseAdvanceExisting && link.startsWith("adv:")) return true;
    return false;
  }, [
    isPocketRepaySettlementUmbrellaMain,
    needsExpenseSalaryPick,
    needsExpenseAdvanceExisting,
    expenseFinancialLinkWatch,
  ]);

  const priorRegisterExpenses = registerDayClose
    ? registerSummary?.dayCashOutFromRegister ?? 0
    : 0;

  const bundledRegisterExpenses = useMemo(() => {
    if (!registerDayClose) return 0;
    return dayCloseBundledConfirmedLines.reduce(
      (sum, row) => (row.paymentSource === "REGISTER" ? sum + row.amount : sum),
      0
    );
  }, [registerDayClose, dayCloseBundledConfirmedLines]);

  const totalDeductibleRegisterExpenses = priorRegisterExpenses + bundledRegisterExpenses;

  const enteredCashIncome = useMemo(() => {
    if (!registerDayClose) return 0;
    if (incomeSplitActive) {
      const c = parseLocaleAmount(String(amountCashWatch ?? ""), locale);
      return Number.isFinite(c) && c > 0 ? c : 0;
    }
    const a = parseLocaleAmount(String(amountWatch ?? ""), locale);
    return Number.isFinite(a) && a > 0 ? a : 0;
  }, [registerDayClose, incomeSplitActive, amountCashWatch, amountWatch, locale]);

  const netCashHandover = Math.max(0, enteredCashIncome - totalDeductibleRegisterExpenses);

  const parsedCashPositive = useMemo(() => {
    if (tyUpper !== "IN") return false;
    const c = parseLocaleAmount(String(amountCashWatch ?? ""), locale);
    return Number.isFinite(c) && c > 0;
  }, [tyUpper, amountCashWatch, locale]);

  return {
    patronCashIncomeMainActive,
    incomeSplitActive,
    registerDayClose,
    splitTotal,
    financialAmountLocked,
    priorRegisterExpenses,
    bundledRegisterExpenses,
    totalDeductibleRegisterExpenses,
    enteredCashIncome,
    netCashHandover,
    parsedCashPositive,
  };
}
