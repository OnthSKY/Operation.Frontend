export type BranchTransaction = {
  id: number;
  /** Null = merkez / şubesiz gider */
  branchId: number | null;
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
  /** OUT + OUT_OPS + OPS_INVOICE: UNPAID | PAID */
  invoicePaymentStatus: string | null;
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
  linkedPersonnelId: number | null;
  linkedPersonnelFullName: string | null;
  /** Otomatik satırda kaynak işlem (örn. gün sonu geliri). */
  sourceTransactionId?: number | null;
  linkedSupplierInvoiceLineId?: number | null;
  /** Araç giderinden şube kasasına yansıyan satır. */
  linkedVehicleExpenseId?: number | null;
  linkedVehicleId?: number | null;
  linkedVehiclePlateNumber?: string | null;
  /** Gelir–gider özetlerine dahil değil (franchise / POS ortak notu). */
  excludedFromProfitAndLoss?: boolean;
  /** Genel gider havuzundan paylaştırılmış şube satırı. */
  generalOverheadPoolId?: number | null;
};

export type CreateBranchTransactionInput = {
  /** Atlanırsa veya null: şubesiz merkez gideri (yalnız OUT) */
  branchId?: number | null;
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
  invoicePaymentStatus?: string | null;
  expensePocketPersonnelId?: number | null;
  /** OUT only; JPG/PNG/WebP */
  receiptPhoto?: File | null;
  linkedAdvanceId?: number | null;
  linkedSalaryPaymentId?: number | null;
  linkedFinancialPersonnelId?: number | null;
  /** OUT_PERSONNEL: maaş/prim/avans dışı PER_* veya PER_OTHER — personel kartı */
  linkedPersonnelId?: number | null;
  /** OUT_PERSONNEL_POCKET_REPAY: kapatılan cepten gider satır id’leri */
  linkedPocketExpenseTransactionIds?: number[];
  /** Gün sonu + PATRON: kasadan patron borcu düşümü (varsayılan API’de true) */
  applyPatronDebtRepayFromDayClose?: boolean;
};
