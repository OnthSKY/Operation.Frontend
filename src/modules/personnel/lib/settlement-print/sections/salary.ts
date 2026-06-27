/** Maaş — gösteriş amaçlı işveren maliyeti (sistem tahmini) bölümü. */
import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { PersonnelSalaryCostEstimate } from "@/types/personnel-salary-cost-estimate";
import { emptyNote } from "../options";

function salaryTypeLabel(t: (k: string) => string, salaryType: string): string {
  const u = String(salaryType ?? "").toUpperCase();
  if (u === "NET") return t("personnel.settlementSalaryCostSalaryTypeNet");
  return t("personnel.settlementSalaryCostSalaryTypeGross");
}

function renderSalaryDisclaimerBlock(
  t: (k: string) => string,
  escape: (s: string) => string
): string {
  return `<div class="salary-cost-disclaimer" role="note">
  <div class="salary-cost-disclaimer-title">${escape(t("personnel.settlementSalaryCostDisclaimerTitle"))}</div>
  <p class="salary-cost-disclaimer-body">${escape(t("personnel.settlementSalaryCostDisclaimerBody"))}</p>
</div>`;
}

export function renderPersonnelSalaryCostSection(
  est: PersonnelSalaryCostEstimate,
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  escape: (s: string) => string
): string {
  const secTitle = escape(t("personnel.settlementPrintSectionSalaryCost"));
  const disclaimer = renderSalaryDisclaimerBlock(t, escape);
  const ccy = String(est.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";

  if (!est.hasEstimate) {
    let msg = t("personnel.settlementSalaryCostNoSalary");
    if (est.messageCode === "no_parameter_set")
      msg = t("personnel.settlementSalaryCostNoParameterSet");
    return `<section class="salary-cost-section">
  <h2 class="sec-salary">${secTitle}</h2>
  ${disclaimer}
  <p class="meta salary-cost-meta">${escape(msg)}</p>
</section>`;
  }

  const row = (label: string, amount: number | null | undefined) =>
    amount == null || !Number.isFinite(amount)
      ? ""
      : `<tr><td>${escape(label)}</td><td class="num">${escape(formatMoneyDash(amount, dash, locale, ccy))}</td></tr>`;

  const asOfIso = String(est.asOfDate ?? "").slice(0, 10);
  const asOfDisp =
    asOfIso && /^\d{4}-\d{2}-\d{2}$/.test(asOfIso)
      ? formatLocaleDate(asOfIso, locale, dash)
      : dash;
  const paramLine =
    est.parameterSetCode?.trim() != null && est.parameterSetCode.trim() !== ""
      ? `<p class="meta salary-cost-meta"><span class="mk">${escape(t("personnel.settlementSalaryCostParamSet"))}</span> ${escape(est.parameterSetCode.trim())} · <span class="mk">${escape(t("personnel.settlementSalaryCostAsOf"))}</span> ${escape(asOfDisp)}</p>`
      : `<p class="meta salary-cost-meta"><span class="mk">${escape(t("personnel.settlementSalaryCostAsOf"))}</span> ${escape(asOfDisp)}</p>`;

  const basis = `${salaryTypeLabel(t, est.salaryType)} — ${t("personnel.settlementSalaryCostEnteredBasis")}`;
  const entered = est.enteredSalaryAmount;

  const manualRows =
    est.usesManualEmployerCostOverride === true &&
    est.manualTotalEmployerCost != null
      ? `<tr class="salary-cost-highlight-row"><td>${escape(t("personnel.settlementSalaryCostManualOverride"))}</td><td class="num">${escape(formatMoneyDash(est.manualTotalEmployerCost, dash, locale, ccy))}</td></tr>`
      : "";

  const indicative = est.indicativeTotalEmployerCost;
  const indicativeRow =
    indicative != null && Number.isFinite(indicative)
      ? `<tr class="salary-cost-total-row"><td>${escape(t("personnel.settlementSalaryCostIndicativeTotal"))}</td><td class="num">${escape(formatMoneyDash(indicative, dash, locale, ccy))}</td></tr>`
      : "";

  return `<section class="salary-cost-section">
  <h2 class="sec-salary">${secTitle}</h2>
  ${disclaimer}
  ${paramLine}
  <table class="salary-cost-table">
    <thead><tr><th>${escape(t("personnel.settlementSalaryCostColConcept"))}</th><th class="num">${escape(t("personnel.settlementSalaryCostColAmount"))} (${escape(ccy)})</th></tr></thead>
    <tbody>
      <tr><td>${escape(basis)}</td><td class="num">${entered != null && Number.isFinite(entered) ? escape(formatMoneyDash(entered, dash, locale, ccy)) : escape(dash)}</td></tr>
      ${row(t("personnel.settlementSalaryCostGross"), est.grossSalary)}
      ${row(t("personnel.settlementSalaryCostNet"), est.netSalary)}
      ${row(t("personnel.settlementSalaryCostEmployeeSgk"), est.employeeSgkDeduction)}
      ${row(t("personnel.settlementSalaryCostEmployeeUnemp"), est.employeeUnemploymentDeduction)}
      ${row(t("personnel.settlementSalaryCostIncomeTax"), est.incomeTax)}
      ${row(t("personnel.settlementSalaryCostStamp"), est.stampTax)}
      ${row(t("personnel.settlementSalaryCostEmployerSgk"), est.employerSgkCost)}
      ${row(t("personnel.settlementSalaryCostEmployerUnemp"), est.employerUnemploymentCost)}
      <tr><td>${escape(t("personnel.settlementSalaryCostCalculatedEmployerTotal"))}</td><td class="num">${est.calculatedTotalEmployerCost != null && Number.isFinite(est.calculatedTotalEmployerCost) ? escape(formatMoneyDash(est.calculatedTotalEmployerCost, dash, locale, ccy)) : escape(dash)}</td></tr>
      ${manualRows}
      ${indicativeRow}
    </tbody>
  </table>
</section>`;
}

export function renderBranchSalaryCostSection(
  items: PersonnelSalaryCostEstimate[],
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  escape: (s: string) => string
): string {
  const secTitle = escape(t("personnel.settlementPrintSectionSalaryCost"));
  const disclaimer = renderSalaryDisclaimerBlock(t, escape);
  const hint = escape(t("personnel.settlementSalaryCostBranchTableHint"));
  const colName = escape(t("personnel.settlementPrintColPersonnel"));
  const colType = escape(t("personnel.settlementSalaryCostColSalaryType"));
  const colEntered = escape(t("personnel.nonAdvanceExpensesColAmount"));
  const colIndicative = escape(t("personnel.settlementSalaryCostIndicativeTotal"));
  const colCcy = escape(t("personnel.nonAdvanceExpensesColCurrency"));

  const body = items
    .map((est) => {
      const name = escape(est.personnelFullName?.trim() || dash);
      const ccy =
        String(est.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
      const type = escape(salaryTypeLabel(t, est.salaryType));
      const ent =
        est.enteredSalaryAmount != null && Number.isFinite(est.enteredSalaryAmount)
          ? escape(formatMoneyDash(est.enteredSalaryAmount, dash, locale, ccy))
          : escape(dash);
      const ind =
        est.hasEstimate === true &&
        est.indicativeTotalEmployerCost != null &&
        Number.isFinite(est.indicativeTotalEmployerCost)
          ? escape(
              formatMoneyDash(est.indicativeTotalEmployerCost, dash, locale, ccy)
            )
          : escape(dash);
      return `<tr><td>${name}</td><td>${type}</td><td class="num">${ent}</td><td class="num">${ind}</td><td>${escape(ccy)}</td></tr>`;
    })
    .join("");

  // Boşsa (genelde avans olarak kişiye yazılır): koca disclaimer'ı gösterme, kompakt kal.
  if (!body)
    return `<section class="salary-cost-section">
  <h2 class="sec-salary">${secTitle}</h2>
  ${emptyNote(t)}
</section>`;
  return `<section class="salary-cost-section">
  <h2 class="sec-salary">${secTitle}</h2>
  ${disclaimer}
  <p class="meta meta-compact salary-cost-meta">${hint}</p>
  <table class="salary-cost-table">
    <thead><tr><th>${colName}</th><th>${colType}</th><th class="num">${colEntered}</th><th class="num">${colIndicative}</th><th>${colCcy}</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
</section>`;
}

export function renderSalaryCostLoadFailedSection(
  t: (k: string) => string,
  escape: (s: string) => string
): string {
  return `<section class="salary-cost-section">
  <h2 class="sec-salary">${escape(t("personnel.settlementPrintSectionSalaryCost"))}</h2>
  ${renderSalaryDisclaimerBlock(t, escape)}
  <p class="meta salary-cost-meta">${escape(t("personnel.settlementSalaryCostLoadFailed"))}</p>
</section>`;
}
