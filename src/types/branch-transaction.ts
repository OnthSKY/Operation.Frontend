export type BranchTransaction = {
  id: number;
  branchId: number;
  type: string;
  mainCategory: string | null;
  category: string | null;
  amount: number;
  cashAmount: number | null;
  cardAmount: number | null;
  currencyCode: string;
  transactionDate: string;
  description: string | null;
};

export type CreateBranchTransactionInput = {
  branchId: number;
  type: string;
  mainCategory?: string | null;
  category?: string | null;
  amount: number;
  cashAmount?: number | null;
  cardAmount?: number | null;
  currencyCode?: string | null;
  transactionDate: string;
  description?: string | null;
};
