/** Şube + para biriminde kasa devri IN kalanları toplamı. */
export type PersonnelCashHandoverPoolRemaining = {
  branchId: number;
  branchName: string;
  currencyCode: string;
  totalRemainingHandover: number;
};

/** API: HELD_REGISTER_CASH | SETTLES_HANDOVER_IN */
export type PersonnelCashHandoverOutflowKind =
  | "HELD_REGISTER_CASH"
  | "SETTLES_HANDOVER_IN";

export type PersonnelCashHandoverOutflow = {
  transactionId: number;
  branchId: number;
  branchName: string;
  transactionDate: string;
  amount: number;
  currencyCode: string;
  mainCategory?: string | null;
  category?: string | null;
  description?: string | null;
  outflowKind: PersonnelCashHandoverOutflowKind;
  settlesCashHandoverTransactionId: number | null;
  /** Şube+para biriminde satır öncesi havuz (sayfalı API; tarih filtresi bakiyeyi değiştirmez). */
  balanceBefore?: number | null;
  /** Satır sonrası havuz (güncel kalanla tutarlı). */
  balanceAfter?: number | null;
};

export type PersonnelCashHandoverLine = {
  transactionId: number;
  branchId: number;
  branchName: string;
  /** ISO yyyy-MM-dd */
  transactionDate: string;
  cashAmount: number;
  currencyCode: string;
  mainCategory?: string | null;
  category?: string | null;
  description?: string | null;
  /** Bu IN satırına bağlı OUT gider toplamı (kasa devri düşümü). */
  settledFromHandoverAmount: number;
  /** Nakit devir tutarı − yerleşen; alt sınır 0. */
  remainingHandoverAmount: number;
};

export type PersonnelCurrencySnapshot = {
  currencyCode: string;
  totalAdvanceAllTime: number;
  totalSalaryAllTime: number;
  netSalaryMinusAdvanceAllTime: number;
  totalAdvanceYearToDate: number;
  totalSalaryYearToDate: number;
  netSalaryMinusAdvanceYearToDate: number;
  /** Kasa gelir/gün sonu satırında bu personele «sorumlu» olarak işaretlenen fiziksel nakit. */
  totalCashHandoverAsResponsibleAllTime: number;
  totalCashHandoverAsResponsibleYearToDate: number;
};

export type PersonnelManagementSnapshot = {
  personnelId: number;
  primaryCurrencyCode: string;
  hireDate: string;
  tenureDaysInclusive: number;
  currentCalendarYear: number;
  warehouseResponsibilityCount: number;
  advanceRecordCount: number;
  salaryPaymentRecordCount: number;
  cashHandoverResponsibleRecordCount: number;
  /** Kayıtlarda geçen şubeler (atama, istihdam, avans, maaş). */
  linkedBranchIds: number[];
  byCurrency: PersonnelCurrencySnapshot[];
  /** IN + kasa sorumlusu: özet için örnek satırlar (yeniden eskiye, en fazla 50). Tam liste: cash-handover-lines API. */
  cashHandoverLines: PersonnelCashHandoverLine[];
  /** Şube ve para birimine göre kalan devir toplamları (havuz). */
  cashHandoverPoolRemainingByBranch: PersonnelCashHandoverPoolRemaining[];
  /** Kasadan / devri kapatan OUT örnekleri (en fazla 50). Tam liste: cash-handover-outflows API. */
  cashHandoverOutflows: PersonnelCashHandoverOutflow[];
};

export type PersonnelCashHandoverLinesPagedResponse = {
  items: PersonnelCashHandoverLine[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type PersonnelCashHandoverOutflowsPagedResponse = {
  items: PersonnelCashHandoverOutflow[];
  totalCount: number;
  page: number;
  pageSize: number;
};
