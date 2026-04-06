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
  /** IN + kasa sorumlusu: bu personele devredilen nakit (yeniden eskiye, en fazla 50). */
  cashHandoverLines: PersonnelCashHandoverLine[];
};
