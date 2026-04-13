export type CreateAdvanceInput = {
  personnelId: number;
  /** CASH için zorunlu; PATRON için opsiyonel (personel şubesi veya şubesiz). */
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
  branchId: number | null;
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
  branchName: string | null;
};
