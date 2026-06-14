"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import type {
  PersonnelEmploymentTerm,
  PersonnelYearAccountClosureListItem,
} from "@/types/personnel-account-closure";

function salaryHistoryTypeLabel(
  t: (k: string) => string,
  raw: string,
): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (u === "NET") return t("personnel.settlementSalaryCostSalaryTypeNet");
  if (u === "GROSS") return t("personnel.settlementSalaryCostSalaryTypeGross");
  return raw?.trim() || "";
}

export type PersonnelSalaryHistoryViewProps = {
  currentSalary: number | null | undefined;
  currencyCode: string;
  terms: PersonnelEmploymentTerm[];
  termsLoading: boolean;
  termsError: boolean;
  termsErr: unknown;
  closures: PersonnelYearAccountClosureListItem[];
  closuresLoading: boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
};

/**
 * Personel maaş geçmişi sekmesi içeriği: mevcut maaş + dönemler + sezon bazlı kapanış.
 * Saf, prop'lardan beslenen sunum bileşeni — modal/sekme orchestration'undan bağımsız.
 */
export function PersonnelSalaryHistoryView({
  currentSalary,
  currencyCode,
  terms,
  termsLoading,
  termsError,
  termsErr,
  closures,
  closuresLoading,
  t,
  locale,
  dash,
}: PersonnelSalaryHistoryViewProps) {
  const sortedTerms = [...terms].sort((a, b) =>
    b.validFrom.slice(0, 10).localeCompare(a.validFrom.slice(0, 10)),
  );
  const seasonRows = [...closures]
    .filter((c) => c.closureExpectedSalaryAmount != null)
    .sort((a, b) => b.closureYear - a.closureYear);
  const cur = (currencyCode ?? "TRY").trim() || "TRY";
  const rowCls =
    "flex flex-wrap items-baseline justify-between gap-2 px-4 py-3";
  const listCls =
    "divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white";

  return (
    <div className="min-w-0 space-y-5 pb-2">
      <p className="text-sm leading-relaxed text-zinc-600">
        {t("personnel.salaryHistoryIntro")}
      </p>

      <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white px-4 py-3 shadow-sm shadow-zinc-900/5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("personnel.salaryHistoryCurrentLabel")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
          {currentSalary != null
            ? formatLocaleAmount(currentSalary, locale, cur)
            : dash}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("personnel.salaryHistoryTermsTitle")}
        </h3>
        {termsLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : termsError ? (
          <p className="text-sm text-red-600">{toErrorMessage(termsErr)}</p>
        ) : sortedTerms.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("personnel.salaryHistoryTermsEmpty")}
          </p>
        ) : (
          <ul className={listCls}>
            {sortedTerms.map((term) => {
              const from = formatLocaleDate(
                term.validFrom.slice(0, 10),
                locale,
                dash,
              );
              const to = term.isOpen
                ? t("personnel.salaryHistoryOpen")
                : term.validTo
                  ? formatLocaleDate(term.validTo.slice(0, 10), locale, dash)
                  : dash;
              const typeLabel = salaryHistoryTypeLabel(t, term.salaryType);
              return (
                <li key={term.id} className={rowCls}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {from} – {to}
                    </p>
                    {typeLabel ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{typeLabel}</p>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-zinc-900">
                    {term.salary != null
                      ? formatLocaleAmount(
                          term.salary,
                          locale,
                          term.currencyCode || cur,
                        )
                      : dash}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("personnel.salaryHistorySeasonTitle")}
        </h3>
        {closuresLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : seasonRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("personnel.salaryHistorySeasonEmpty")}
          </p>
        ) : (
          <ul className={listCls}>
            {seasonRows.map((c) => (
              <li key={c.id} className={rowCls}>
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums text-zinc-900">
                    {c.closureYear}
                  </p>
                  {c.closureWorkedDays != null ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("personnel.salaryHistoryWorkedDays").replace(
                        "{n}",
                        String(c.closureWorkedDays),
                      )}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold tabular-nums text-zinc-900">
                  {formatLocaleAmount(
                    c.closureExpectedSalaryAmount ?? 0,
                    locale,
                    c.closureExpectedSalaryCurrency || cur,
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
