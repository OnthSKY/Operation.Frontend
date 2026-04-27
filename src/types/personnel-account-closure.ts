/** GET /api/personnel/{id}/salary-terms */
export type PersonnelEmploymentTerm = {
  id: number;
  validFrom: string;
  validTo: string | null;
  arrivalDate: string;
  branchId: number | null;
  salary: number | null;
  currencyCode: string;
  salaryType: string;
  employmentType: string;
  isManualEmployerCostOverride: boolean;
  manualTotalEmployerCost: number | null;
  manualOverrideNote: string | null;
  isOpen: boolean;
};

/** POST /api/personnel/{id}/salary-terms */
export type CreatePersonnelEmploymentTermBody = {
  validFrom: string;
  arrivalDate: string;
  branchId?: number | null;
  salary?: number | null;
  currencyCode: string;
  salaryType: string;
  employmentType: string;
  isManualEmployerCostOverride: boolean;
  manualTotalEmployerCost?: number | null;
  manualOverrideNote?: string | null;
};

/** PUT /api/personnel/{id}/salary-terms/{termId} */
export type UpdatePersonnelEmploymentTermBody = {
  validFrom?: string | null;
  arrivalDate?: string | null;
  clearArrivalDate?: boolean;
  branchId?: number | null;
  salary?: number | null;
  currencyCode: string;
  salaryType: string;
  employmentType: string;
  isManualEmployerCostOverride: boolean;
  manualTotalEmployerCost?: number | null;
  manualOverrideNote?: string | null;
};

/** GET /api/personnel/{id}/account-closure-preview */
export type PersonnelAccountClosurePreview = {
  personnelId: number;
  employmentTermId: number;
  periodStartInclusive: string;
  periodEndInclusive: string;
  isOpenTerm: boolean;
  generatedAtUtc: string;
  lines: PersonnelAccountClosureCurrencyLine[];
};

export type PersonnelAccountClosureCurrencyLine = {
  currencyCode: string;
  advancesTotal: number;
  salaryPaymentsTotal: number;
  personnelAttributedNonAdvanceExpenseTotal: number;
  cashHandoverInTotal: number;
  suggestedEmployerOffset: number;
};

/** GET /api/personnel/{id}/year-account/preview?year= */
export type PersonnelYearAccountPreview = {
  personnelId: number;
  closureYear: number;
  generatedAtUtc: string;
  isYearClosed: boolean;
  closedAtUtc: string | null;
  closureNotes: string | null;
  /** Yıl kapalıyken: kapanışta PDF mutabakatı onaylandı mı. */
  settlementPdfAcknowledged: boolean;
  closureWorkedDays: number | null;
  closureExpectedSalaryAmount: number | null;
  closureExpectedSalaryCurrency: string | null;
  salaryBalanceSettled: boolean | null;
  salaryPaymentSourceType: string | null;
  salarySettlementNote: string | null;
  /** Kapalı yıl: beklenen − (avans + maaş ödemeleri + gider). */
  closureSalaryNetRemaining: number | null;
  lines: PersonnelAccountClosureCurrencyLine[];
};

/** GET /api/personnel/{id}/year-account/closures */
export type PersonnelYearAccountClosureListItem = {
  id: number;
  closureYear: number;
  notes: string | null;
  settlementPdfAcknowledged: boolean;
  closureWorkedDays: number | null;
  closureExpectedSalaryAmount: number | null;
  closureExpectedSalaryCurrency: string;
  salaryBalanceSettled: boolean;
  salaryPaymentSourceType: string | null;
  salarySettlementNote: string | null;
  closedAtUtc: string;
  closedByUserId: number;
  closedByFullName: string | null;
  /** Sunucuda kapanış anında yazılan JSON arşivi (indirilebilir). */
  hasClosureArchive?: boolean;
  /** İsteğe bağlı yüklenmiş PDF (yazdır → PDF). */
  hasClosurePdf?: boolean;
};
