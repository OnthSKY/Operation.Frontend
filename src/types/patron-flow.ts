export type PatronFlowLine = {
  id: number;
  branchId?: number | null;
  branchName?: string | null;
  transactionDate: string;
  flowKind: string;
  transactionType: string;
  mainCategory?: string | null;
  category?: string | null;
  amount: number;
  currencyCode: string;
  description?: string | null;
  linkedSupplierInvoiceLineId?: number | null;
  posBeneficiaryType?: string | null;
  posBeneficiaryPersonnelId?: number | null;
  posBeneficiaryPersonnelName?: string | null;
  posSettlementNotes?: string | null;
};

export type PatronFlowTotalsByKind = {
  flowKind: string;
  currencyCode: string;
  totalAmount: number;
};

export type PatronFlowOverview = {
  items: PatronFlowLine[];
  totalsByKind: PatronFlowTotalsByKind[];
};

export type BranchPosSettlementProfile = {
  branchId: number;
  branchName: string;
  beneficiaryType: string;
  beneficiaryPersonnelId?: number | null;
  beneficiaryPersonnelName?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
};

export type BranchPosSettlementBranchOption = {
  id: number;
  name: string;
};

export type BranchPosSettlementList = {
  profiles: BranchPosSettlementProfile[];
  branchesWithoutProfile: BranchPosSettlementBranchOption[];
};

export type UpsertBranchPosSettlementInput = {
  beneficiaryType: string;
  beneficiaryPersonnelId?: number | null;
  notes?: string | null;
};
