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
  /** PATRON | BRANCH_MANAGER | REMAINS_AT_BRANCH */
  cashSettlementParty: string | null;
  cashSettlementPersonnelId: number | null;
  cashSettlementPersonnelFullName: string | null;
  cashSettlementPersonnelJobTitle: string | null;
  /** OUT: REGISTER | PATRON | PERSONNEL_POCKET */
  expensePaymentSource: string | null;
  expensePocketPersonnelId: number | null;
  expensePocketPersonnelFullName: string | null;
  expensePocketPersonnelJobTitle: string | null;
  hasReceiptPhoto: boolean;
  linkedAdvanceId: number | null;
  linkedSalaryPaymentId: number | null;
  linkedAdvancePersonnelId: number | null;
  linkedSalaryPersonnelId: number | null;
  linkedAdvancePersonnelFullName: string | null;
  linkedSalaryPersonnelFullName: string | null;
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
  cashSettlementParty?: string | null;
  cashSettlementPersonnelId?: number | null;
  expensePaymentSource?: string | null;
  expensePocketPersonnelId?: number | null;
  /** OUT only; JPG/PNG/WebP */
  receiptPhoto?: File | null;
  linkedAdvanceId?: number | null;
  linkedSalaryPaymentId?: number | null;
  linkedFinancialPersonnelId?: number | null;
};
