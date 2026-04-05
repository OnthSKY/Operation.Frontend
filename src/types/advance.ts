export type CreateAdvanceInput = {
  personnelId: number;
  branchId: number;
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
};

export type AdvanceListItem = Advance & {
  personnelFullName: string;
  branchName: string;
};
