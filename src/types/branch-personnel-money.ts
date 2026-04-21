/** GET /branches/{id}/personnel-money-summaries */
export type BranchPersonnelMoneySummaryItem = {
  personnelId: number;
  totalAdvances: number | null;
  advancesCurrencyCode: string | null;
  advancesMixedCurrencies: boolean;
  grossPocketExpense: number;
  pocketRepaidFromRegister: number;
  pocketRepaidFromPatron: number;
  /** OUT_PERSONNEL_POCKET_CLAIM_TRANSFER neti (+ alan, − devreden) */
  pocketClaimTransferNet: number;
  netRegisterOwesPocket: number;
  pocketCurrencyCode: string | null;
  pocketMixedCurrencies: boolean;
};
