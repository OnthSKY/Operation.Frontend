/** GET /personnel/{id}/salary-cost-estimate (indicative only). */
export type PersonnelSalaryCostEstimate = {
  hasEstimate: boolean;
  messageCode?: string | null;
  personnelId: number;
  personnelFullName?: string | null;
  salaryType: string;
  enteredSalaryAmount?: number | null;
  currencyCode: string;
  grossSalary?: number | null;
  netSalary?: number | null;
  employeeSgkDeduction?: number | null;
  employeeUnemploymentDeduction?: number | null;
  incomeTax?: number | null;
  stampTax?: number | null;
  employerSgkCost?: number | null;
  employerUnemploymentCost?: number | null;
  calculatedTotalEmployerCost?: number | null;
  usesManualEmployerCostOverride?: boolean;
  manualTotalEmployerCost?: number | null;
  indicativeTotalEmployerCost?: number | null;
  parameterSetCode?: string | null;
  asOfDate: string;
};

export type BranchPersonnelSalaryCostEstimates = {
  branchId: number;
  items: PersonnelSalaryCostEstimate[];
};
