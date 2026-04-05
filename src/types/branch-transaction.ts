export type BranchTransaction = {
  id: number;
  branchId: number;
  type: string;
  category: string | null;
  amount: number;
  transactionDate: string;
  description: string | null;
};

export type CreateBranchTransactionInput = {
  branchId: number;
  type: string;
  category?: string | null;
  amount: number;
  transactionDate: string;
  description?: string | null;
};
