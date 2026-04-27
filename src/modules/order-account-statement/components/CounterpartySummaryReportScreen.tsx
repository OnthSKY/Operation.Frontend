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
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
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
  const [filters, setFilters] = useState<CounterpartySummaryFilters>({
    counterpartyType: "",
    currencyCode: "TRY",
    search: "",
    onlyWithOpenBalance: true,
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

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 md:grid-cols-6">
        <Select
          name="counterpartyType"
          label={t("reports.counterpartySummaryType")}
          options={options}
          value={filters.counterpartyType ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, counterpartyType: e.target.value as "branch" | "customer" | "" }))}
          onBlur={() => {}}
          className="md:col-span-1"
        />
        <Select
          name="currencyCode"
          label={t("reports.counterpartySummaryCurrency")}
          options={currencyOptions}
          value={(filters.currencyCode ?? "TRY").trim().toUpperCase() || "TRY"}
          onChange={(e) => setFilters((p) => ({ ...p, currencyCode: e.target.value }))}
          onBlur={() => {}}
          className="md:col-span-1"
        />
        <label className="block md:col-span-2">
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
          className="md:col-span-1"
        />
        <DateField
          label={t("reports.counterpartySummaryDateTo")}
          value={filters.issueDateTo ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, issueDateTo: e.target.value }))}
          className="md:col-span-1"
        />
        <label className="flex cursor-pointer items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(filters.onlyWithOpenBalance)}
            onChange={(e) => setFilters((p) => ({ ...p, onlyWithOpenBalance: e.target.checked }))}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700">{t("reports.counterpartySummaryOnlyOpen")}</span>
        </label>
        <div className="md:col-span-1 md:justify-self-end">
          <Button type="button" variant="secondary" onClick={() => void load(filters)} disabled={busy}>
            {t("reports.counterpartySummaryRefresh")}
          </Button>
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
