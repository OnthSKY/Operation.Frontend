"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";

/**
 * Modal başlığı + alt-açıklamasını props'lardan türetilen launchContext'e göre üretir.
 *
 * launchContext: hangi senaryodan açıldı?
 *   - dayClose: IN_DAY_CLOSE preset (Hızlı Gün Sonu)
 *   - pocketRepay: cep borcu kapatma akışı
 *   - pocketClaimTransfer: cep alacağı devri
 *   - handoverPatron | handoverExpense: kasa devri settle
 *   - newIncome | newExpense: tip preset
 *   - generic: özel preset yok
 */
export type TxLaunchContext =
  | "dayClose"
  | "pocketRepay"
  | "pocketClaimTransfer"
  | "handoverPatron"
  | "handoverExpense"
  | "newIncome"
  | "newExpense"
  | "generic";

export type UseTxDynamicTitleInput = {
  orgMode: boolean;
  defaultMainCategory?: string;
  defaultType?: "IN" | "OUT";
  defaultPocketRepayPersonnelId?: number;
  defaultHandoverSettleKind?: "expense_register" | "patron_register_debt_repay";
  /** Şubesiz merkez akışı için title/description fallback'ı için. */
  propBranchId: number | null;
  resolvedBranchId: number | null;
  personnelExpenseFlow: boolean;
};

export type UseTxDynamicTitleResult = {
  launchContext: TxLaunchContext;
  title: string;
  hint: string;
};

export function useTxDynamicTitle(
  input: UseTxDynamicTitleInput
): UseTxDynamicTitleResult {
  const { t } = useI18n();
  const {
    orgMode,
    defaultMainCategory,
    defaultType,
    defaultPocketRepayPersonnelId,
    defaultHandoverSettleKind,
  } = input;

  const launchContext = useMemo<TxLaunchContext>(() => {
    const mc = String(defaultMainCategory ?? "").trim().toUpperCase();
    const branchScoped = !orgMode;
    if (branchScoped && mc === "IN_DAY_CLOSE") return "dayClose";
    if (branchScoped && mc === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER") return "pocketClaimTransfer";
    if (
      branchScoped &&
      defaultPocketRepayPersonnelId != null &&
      defaultPocketRepayPersonnelId > 0
    )
      return "pocketRepay";
    if (branchScoped && defaultHandoverSettleKind === "patron_register_debt_repay")
      return "handoverPatron";
    if (branchScoped && defaultHandoverSettleKind === "expense_register")
      return "handoverExpense";
    const dt = String(defaultType ?? "").trim().toUpperCase();
    if (branchScoped && dt === "IN") return "newIncome";
    if (branchScoped && dt === "OUT") return "newExpense";
    return "generic";
  }, [
    defaultMainCategory,
    defaultPocketRepayPersonnelId,
    defaultHandoverSettleKind,
    defaultType,
    orgMode,
  ]);

  const isOrgFallback = input.propBranchId == null && input.resolvedBranchId == null;

  const title = useMemo(() => {
    if (isOrgFallback) {
      return input.personnelExpenseFlow
        ? t("branch.txOrgPersonnelModalTitle")
        : t("branch.txOrgModalTitle");
    }
    switch (launchContext) {
      case "dayClose":
        return t("branch.txModalTitleDayClose");
      case "pocketRepay":
        return t("branch.txModalTitlePocketRepay");
      case "pocketClaimTransfer":
        return t("branch.txModalTitlePocketClaimTransfer");
      case "handoverPatron":
        return t("branch.txModalTitleHandoverPatron");
      case "handoverExpense":
        return t("branch.txModalTitleHandoverExpense");
      case "newIncome":
        return t("branch.txModalTitleNewIncome");
      case "newExpense":
        return t("branch.txModalTitleNewExpense");
      default:
        return t("branch.txModalTitle");
    }
  }, [isOrgFallback, input.personnelExpenseFlow, launchContext, t]);

  const hint = useMemo(() => {
    if (isOrgFallback) {
      return input.personnelExpenseFlow
        ? t("branch.txOrgPersonnelModalHintShort")
        : t("branch.txOrgModalHintShort");
    }
    switch (launchContext) {
      case "dayClose":
        return t("branch.txModalHintDayClose");
      case "pocketRepay":
        return t("branch.txModalHintPocketRepay");
      case "pocketClaimTransfer":
        return t("branch.txModalHintPocketClaimTransfer");
      case "handoverPatron":
        return t("branch.txModalHintHandoverPatron");
      case "handoverExpense":
        return t("branch.txModalHintHandoverExpense");
      case "newIncome":
        return t("branch.txModalHintNewIncome");
      case "newExpense":
        return t("branch.txModalHintNewExpense");
      default:
        return t("branch.txModalHintShort");
    }
  }, [isOrgFallback, input.personnelExpenseFlow, launchContext, t]);

  return { launchContext, title, hint };
}
