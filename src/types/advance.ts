export type CreateAdvanceInput = {
  personnelId: number;
  branchId: number;
  sourceType?: string;
  amount: number;
  advanceDate: string;
  effectiveDate: string;
  description?: string | null;
};

export type Advance = {
  id: number;
  personnelId: number;
  branchId: number;
  sourceType: string;
  amount: number;
  advanceDate: string;
  effectiveDate: string;
  description: string | null;
};
