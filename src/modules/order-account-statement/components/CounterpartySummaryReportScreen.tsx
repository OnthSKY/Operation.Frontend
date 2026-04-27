"use client";

import { useI18n } from "@/i18n/context";
import {
  fetchCounterpartySummaryReport,
  type CounterpartySummaryFilters,
  type CounterpartySummaryReport,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { toErrorMessage } from "@/shared/lib/error-message";
import { currencySelectOptions } from "@/shared/lib/currency-select-options";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const defaultReport: CounterpartySummaryReport = {
  items: [],
  totals: {
    invoicedTotal: 0,
    paidTotal: 0,
    openAmountTotal: 0,
    counterpartyCount: 0,
    invoiceCount: 0,
  },
};

export function CounterpartySummaryReportScreen() {
  const { t, locale } = useI18n();
  const [report, setReport] = useState<CounterpartySummaryReport>(defaultReport);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CounterpartySummaryFilters>({
    counterpartyType: "",
    currencyCode: "TRY",
    search: "",
    onlyWithOpenBalance: false,
    limit: 100,
  });

  const load = useCallback(async (nextFilters: CounterpartySummaryFilters) => {
    setBusy(true);
    setErrorText("");
    try {
      const data = await fetchCounterpartySummaryReport(nextFilters);
      setReport(data);
    } catch (error) {
      setErrorText(toErrorMessage(error));
      setReport(defaultReport);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const options = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("reports.counterpartySummaryTypeAll") },
      { value: "branch", label: t("reports.counterpartySummaryTypeBranch") },
      { value: "customer", label: t("reports.counterpartySummaryTypeCustomer") },
    ],
    [t]
  );
  const currencyOptions = useMemo<SelectOption[]>(
    () => currencySelectOptions(locale),
    [locale]
  );
  const filtersActive = Boolean(
    (filters.counterpartyType ?? "").trim() ||
      ((filters.currencyCode ?? "").trim().toUpperCase() !== "TRY" &&
        (filters.currencyCode ?? "").trim().length > 0) ||
      (filters.search ?? "").trim() ||
      filters.issueDateFrom ||
      filters.issueDateTo ||
      filters.onlyWithOpenBalance
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{t("reports.counterpartySummaryTitle")}</h1>
          <p className="text-sm text-zinc-600">{t("reports.counterpartySummarySubtitle")}</p>
        </div>
        <Link href="/products/order-account-statement" className="text-sm font-medium text-violet-700 underline">
          {t("reports.counterpartySummaryBackToStatement")}
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
          <Tooltip content={t("common.filters")} delayMs={200}>
            <button
              type="button"
              className="relative flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/90 text-zinc-700 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
              aria-label={t("common.filters")}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <FilterFunnelIcon className="h-5 w-5" />
              {filtersActive ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </button>
          </Tooltip>
          <Tooltip content={t("reports.counterpartySummaryRefresh")} delayMs={200}>
            <Button
              type="button"
              variant="secondary"
              className={TABLE_TOOLBAR_ICON_BTN}
              onClick={() => void load(filters)}
              disabled={busy}
              aria-label={t("reports.counterpartySummaryRefresh")}
            >
              <svg
                aria-hidden
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 11a8 8 0 1 0 2.3 5.7" />
                <path d="M20 4v7h-7" />
              </svg>
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard title={t("reports.counterpartySummaryInvoicedTotal")} value={formatLocaleAmount(report.totals.invoicedTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryPaidTotal")} value={formatLocaleAmount(report.totals.paidTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryOpenTotal")} value={formatLocaleAmount(report.totals.openAmountTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryCounterpartyCount")} value={String(report.totals.counterpartyCount)} />
        <SummaryCard title={t("reports.counterpartySummaryInvoiceCount")} value={String(report.totals.invoiceCount)} />
      </div>

      {errorText ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      {busy ? <p className="text-sm text-zinc-500">{t("reports.loading")}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColName")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColType")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColInvoiced")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPaid")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColOpen")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColLastInvoice")}</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((row) => (
              <tr key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-medium text-zinc-900">{row.counterpartyName}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {row.counterpartyType === "branch"
                    ? t("reports.counterpartySummaryTypeBranch")
                    : t("reports.counterpartySummaryTypeCustomer")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatLocaleAmount(row.invoicedTotal, locale, row.currencyCode || "TRY")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatLocaleAmount(row.paidTotal, locale, row.currencyCode || "TRY")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-violet-800">
                  {formatLocaleAmount(row.openAmount, locale, row.currencyCode || "TRY")}
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {row.lastDocumentNumber ? `${row.lastDocumentNumber} · ${row.lastInvoiceDate ?? "—"}` : "—"}
                </td>
              </tr>
            ))}
            {report.items.length === 0 && !busy ? (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-500" colSpan={6}>
                  {t("reports.counterpartySummaryEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("common.filters")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
      >
        <div className="space-y-4">
          <Select
            name="counterpartyType"
            label={t("reports.counterpartySummaryType")}
            options={options}
            value={filters.counterpartyType ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, counterpartyType: e.target.value as "branch" | "customer" | "" }))}
            onBlur={() => {}}
          />
          <Select
            name="currencyCode"
            label={t("reports.counterpartySummaryCurrency")}
            options={currencyOptions}
            value={(filters.currencyCode ?? "TRY").trim().toUpperCase() || "TRY"}
            onChange={(e) => setFilters((p) => ({ ...p, currencyCode: e.target.value }))}
            onBlur={() => {}}
          />
          <label className="block">
            <span className="text-sm text-zinc-600">{t("reports.counterpartySummarySearch")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              value={filters.search ?? ""}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder={t("reports.counterpartySummarySearchPlaceholder")}
            />
          </label>
          <DateField
            label={t("reports.counterpartySummaryDateFrom")}
            value={filters.issueDateFrom ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, issueDateFrom: e.target.value }))}
          />
          <DateField
            label={t("reports.counterpartySummaryDateTo")}
            value={filters.issueDateTo ?? ""}
            onChange={(e) => setFilters((p) => ({ ...p, issueDateTo: e.target.value }))}
          />
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={Boolean(filters.onlyWithOpenBalance)}
              onCheckedChange={(next) => setFilters((p) => ({ ...p, onlyWithOpenBalance: next }))}
            />
            <span className="text-sm text-zinc-700">{t("reports.counterpartySummaryOnlyOpen")}</span>
          </label>
        </div>
      </RightDrawer>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}
