export type CreateAdvanceInput = {
  personnelId: number;
  /** Required for branch cash (CASH); optional for BANK/PATRON (server uses personnel branch when omitted). */
  branchId?: number;
  sourceType?: string;
  amount: number;
  currencyCode?: string | null;
  advanceDate: string;
  effectiveYear: number;
  description?: string | null;
};

export type Advance = {
  id: number;
  personnelId: number;
  branchId: number;
  sourceType: string;
  amount: number;
  currencyCode: string;
  advanceDate: string;
  effectiveYear: number;
  description: string | null;
  /** Kasadan düşen şube gider satırına bağlı */
  hasLinkedRegisterExpense?: boolean;
};

export type AdvanceListItem = Advance & {
  personnelFullName: string;
  branchName: string;
};
