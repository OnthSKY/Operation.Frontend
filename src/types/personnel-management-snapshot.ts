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
  linkedAdvanceId?: number | null;
  linkedAdvancePersonnelId?: number | null;
  linkedAdvancePersonnelFullName?: string | null;
  /** OUT satırında doğrudan bağlı personel (gider hedefi). */
  linkedPersonnelId?: number | null;
  linkedPersonnelFullName?: string | null;
  expensePocketPersonnelId?: number | null;
  expensePocketPersonnelFullName?: string | null;
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
  totalPersonnelExpenseAllTime: number;
  totalPersonnelExpenseYearToDate: number;
};

/**
 * Personel nakit kasa hesabı özeti — yeni ledger sistemi (personnel_cash_ledger) projeksiyonu.
 * "Kasa parası" sekmesindeki 3 kart için kaynak. CurrentBalance = TotalIn − TotalOut.
 * REVERSAL satırları (soft-delete sonrası ters girişler) sayılmaz.
 */
export type PersonnelCashAccountSummary = {
  currencyCode: string;
  /** Persisted projeksiyon cache; sapma şüphesinde recompute edilir. */
  currentBalance: number;
  /** IN entry'leri toplamı (handover + başka personelden devir). */
  totalIn: number;
  /** OUT entry'leri toplamı (şube/merkez/personel giderleri + patrona iade + başka personele devir). */
  totalOut: number;
  entryCount: number;
  /** ISO yyyy-MM-dd; satır yoksa null. */
  lastEntryDate: string | null;
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
  /**
   * Personel nakit kasa hesabı özeti — currency başına. Yeni ledger sisteminden gelir.
   * "Kasa parası" sekmesindeki 3 kart bu alandan beslenir.
   */
  cashAccountSummaries: PersonnelCashAccountSummary[];
};

export type PersonnelCashHandoverLinesPagedResponse = {
  items: PersonnelCashHandoverLine[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/** Yeni ledger sistemi: banka ekstresi satırı. */
export type PersonnelCashLedgerEntry = {
  id: number;
  currencyCode: string;
  /** ISO yyyy-MM-dd */
  entryDate: string;
  direction: "IN" | "OUT";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  sourceBranchTransactionId: number;
  /** Kaynak bt'nin bağlı avansı (varsa) — costs sekmesinde avansı işaretlemek için. */
  linkedAdvanceId: number | null;
  sourceBranchId: number | null;
  sourceBranchName: string | null;
  classificationCode: string;
  /** BRANCH_REGISTER | OTHER_PERSONNEL | BRANCH_EXPENSE | GENERAL_EXPENSE | PERSONNEL_PAYOUT | PATRON */
  counterpartyKind: string;
  counterpartyPersonnelId: number | null;
  counterpartyLabel: string | null;
  /** HANDOVER_IN | HELD_REGISTER_OUT | SETTLES_HANDOVER_IN | POCKET_CLAIM_TO_PATRON | POCKET_CLAIM_TRANSFER_OUT | POCKET_CLAIM_TRANSFER_IN | REVERSAL */
  entryKind: string;
  description: string | null;
  reversesLedgerId: number | null;
  seqPerAccount: number;
};

export type PersonnelCashLedgerPagedResponse = {
  items: PersonnelCashLedgerEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type PersonnelCashLedgerBranchBreakdown = {
  branchId: number | null;
  branchLabel: string;
  totalIn: number;
  totalOut: number;
  /** TotalIn − TotalOut */
  netContribution: number;
  entryCount: number;
};

export type PersonnelCashHandoverOutflowsPagedResponse = {
  items: PersonnelCashHandoverOutflow[];
  totalCount: number;
  page: number;
  pageSize: number;
};
