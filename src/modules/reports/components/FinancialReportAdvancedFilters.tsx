"use client";

import { useI18n } from "@/i18n/context";
import {
  expensePaymentSourceLabel,
  txCodeLabel,
} from "@/modules/branch/lib/branch-transaction-options";
import { useFinancialReportFilterOptions } from "@/modules/reports/hooks/useReportsQueries";
import type { SelectOption } from "@/shared/ui/Select";
import { Select } from "@/shared/ui/Select";
import { useMemo } from "react";

function mergeSelectedOption(
  options: SelectOption[],
  value: string,
  labelForValue?: string
): SelectOption[] {
  if (!value) return options;
  if (options.some((o) => o.value === value)) return options;
  return [...options, { value, label: labelForValue ?? value }];
}

export type FinancialReportAdvancedFilterValues = {
  currencyCode: string;
  transactionType: string;
  mainCategory: string;
  category: string;
  expensePaymentSource: string;
};

export function FinancialReportAdvancedFilters({
  dateFrom,
  dateTo,
  branchId,
  values,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
  values: FinancialReportAdvancedFilterValues;
  onChange: (patch: Partial<FinancialReportAdvancedFilterValues>) => void;
}) {
  const { t } = useI18n();
  const optsQ = useFinancialReportFilterOptions(
    {
      dateFrom,
      dateTo,
      branchId,
      mainCategory: values.mainCategory || undefined,
    },
    Boolean(dateFrom && dateTo)
  );

  const currencyOptions = useMemo(() => {
    const emptyLabel = t("reports.finFilterAny");
    const fromApi = (optsQ.data?.currencies ?? [])
      .filter((c) => c != null && String(c).trim() !== "")
      .map((c) => {
        const v = String(c).trim();
        return { value: v, label: v };
      });
    return mergeSelectedOption(
      [{ value: "", label: emptyLabel }, ...fromApi],
      values.currencyCode
    );
  }, [optsQ.data?.currencies, values.currencyCode, t]);

  const mainCategoryOptions = useMemo(() => {
    const emptyLabel = t("reports.finFilterAny");
    const fromApi = (optsQ.data?.mainCategories ?? [])
      .filter((c) => c != null && String(c).trim() !== "")
      .map((c) => {
        const v = String(c).trim();
        return { value: v, label: txCodeLabel(v, t) || v };
      });
    return mergeSelectedOption(
      [{ value: "", label: emptyLabel }, ...fromApi],
      values.mainCategory,
      values.mainCategory
        ? txCodeLabel(values.mainCategory, t) || values.mainCategory
        : undefined
    );
  }, [optsQ.data?.mainCategories, values.mainCategory, t]);

  const categoryOptions = useMemo(() => {
    const emptyLabel = t("reports.finFilterAny");
    const fromApi = (optsQ.data?.categories ?? [])
      .filter((c) => c != null && String(c).trim() !== "")
      .map((c) => {
        const v = String(c).trim();
        return { value: v, label: txCodeLabel(v, t) || v };
      });
    return mergeSelectedOption(
      [{ value: "", label: emptyLabel }, ...fromApi],
      values.category,
      values.category
        ? txCodeLabel(values.category, t) || values.category
        : undefined
    );
  }, [optsQ.data?.categories, values.category, t]);

  const directionOptions = useMemo(
    () => [
      { value: "", label: t("reports.finDirectionAll") },
      { value: "IN", label: t("reports.finDirectionIn") },
      { value: "OUT", label: t("reports.finDirectionOut") },
    ],
    [t]
  );

  const expenseOptions = useMemo(
    () => [
      { value: "", label: t("reports.finExpenseAll") },
      {
        value: "REGISTER",
        label: expensePaymentSourceLabel("REGISTER", t),
      },
      { value: "PATRON", label: expensePaymentSourceLabel("PATRON", t) },
      {
        value: "PERSONNEL_POCKET",
        label: expensePaymentSourceLabel("PERSONNEL_POCKET", t),
      },
      { value: "UNSET", label: t("branch.expensePaymentUnset") },
    ],
    [t]
  );

  return (
    <details className="rounded-xl border border-zinc-200 bg-white [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-zinc-800 touch-manipulation">
        <span className="flex items-center justify-between gap-2">
          <span>{t("reports.finAdvancedFilters")}</span>
          <span className="text-zinc-400" aria-hidden>
            +
          </span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-zinc-100 px-3 pb-3 pt-3">
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("reports.finAdvancedFiltersHint")}
        </p>
        {optsQ.isError ? (
          <p className="text-xs text-amber-800">{t("reports.finFilterOptionsError")}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            name="finFilterCurrency"
            label={t("reports.finFilterCurrency")}
            options={currencyOptions}
            value={values.currencyCode}
            onChange={(e) => onChange({ currencyCode: e.target.value })}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <Select
            name="finFilterDirection"
            label={t("reports.finFilterDirection")}
            options={directionOptions}
            value={values.transactionType}
            onChange={(e) => onChange({ transactionType: e.target.value })}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <Select
            name="finFilterMainCategory"
            label={t("reports.finFilterMainCategory")}
            options={mainCategoryOptions}
            value={values.mainCategory}
            onChange={(e) => onChange({ mainCategory: e.target.value })}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <Select
            name="finFilterCategory"
            label={t("reports.finFilterCategory")}
            options={categoryOptions}
            value={values.category}
            onChange={(e) => onChange({ category: e.target.value })}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <div className="min-w-0 sm:col-span-2">
            <Select
              name="finFilterExpenseSource"
              label={t("reports.finFilterExpenseSource")}
              options={expenseOptions}
              value={values.expensePaymentSource}
              onChange={(e) =>
                onChange({ expensePaymentSource: e.target.value })
              }
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
        </div>
      </div>
    </details>
  );
}
