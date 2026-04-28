"use client";

import { useI18n } from "@/i18n/context";
import {
  deleteBranchDocument,
  fetchBranchDocumentBlob,
  fetchBranchDocuments,
} from "@/modules/branch/api/branch-documents-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  deleteOutboundInvoice,
  fetchOutboundInvoices,
  fetchOutboundInvoiceReceipts,
  fetchCounterpartySummaryReport,
  type CounterpartySummaryFilters,
  type CounterpartySummaryReport,
  type CounterpartySuggestionRow,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  companyBrandingLogoUrl,
  fetchSystemBranding,
} from "@/modules/admin/api/system-branding-api";
import { downloadCounterpartyInvoiceStylePdf } from "@/modules/order-account-statement/lib/download-counterparty-invoice-style-pdf";
import { toErrorMessage } from "@/shared/lib/error-message";
import { currencySelectOptions } from "@/shared/lib/currency-select-options";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { apiFetch } from "@/shared/api/client";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { EyeIcon, detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
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

function parseInvoiceIdFromNote(note: string | null | undefined): number | null {
  const raw = String(note ?? "");
  if (!raw) return null;
  const m = raw.match(/(?:^|[;,\s])invoiceId=(\d+)(?:$|[;,\s])/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseInvoiceNoFromNote(note: string | null | undefined): string | null {
  const raw = String(note ?? "");
  if (!raw) return null;
  const m = raw.match(/(?:^|[;,\s])invoiceNo=([^;,\s]+)(?:$|[;,\s])/i);
  if (!m) return null;
  const value = String(m[1] ?? "").trim();
  return value || null;
}

export function CounterpartySummaryReportScreen() {
  const { t, locale } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const [report, setReport] = useState<CounterpartySummaryReport>(defaultReport);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [pdfBusyKey, setPdfBusyKey] = useState("");
  const [errorText, setErrorText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
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

  const branchOptions = useMemo<RichComboboxOption[]>(
    () => [
      {
        value: "",
        title: t("reports.counterpartySummaryBranchAll"),
        description: t("reports.counterpartySummaryBranchAllHint"),
      },
      ...branches.map((b) => ({
        value: String(b.id),
        title: b.name,
        description: `${t("reports.counterpartySummaryTypeBranch")} #${b.id}`,
      })),
    ],
    [branches, t]
  );

  const reportItems = useMemo(() => {
    const branchId = Number.parseInt(selectedBranchId, 10);
    if (!Number.isFinite(branchId) || branchId <= 0) return report.items;
    return report.items.filter(
      (row) => row.counterpartyType === "branch" && row.counterpartyId === branchId
    );
  }, [report.items, selectedBranchId]);

  const reportTotals = useMemo(
    () =>
      reportItems.reduce(
        (acc, row) => {
          acc.invoicedTotal += row.invoicedTotal;
          acc.paidTotal += row.paidTotal;
          acc.openAmountTotal += row.openAmount;
          acc.counterpartyCount += 1;
          acc.invoiceCount += Number(
            row.lastDocumentNumber && String(row.lastDocumentNumber).trim() !== "" ? 1 : 0
          );
          return acc;
        },
        {
          invoicedTotal: 0,
          paidTotal: 0,
          openAmountTotal: 0,
          counterpartyCount: 0,
          invoiceCount: 0,
        }
      ),
    [reportItems]
  );

  const resolveBranchInvoiceArtifacts = useCallback(async (row: CounterpartySuggestionRow) => {
    const invoices = await fetchOutboundInvoices();
    const invoice = invoices.find(
      (x) =>
        x.documentNumber === row.lastDocumentNumber &&
        x.counterpartyType === "branch" &&
        x.counterpartyId === row.counterpartyId
    );
    const docs = await fetchBranchDocuments(row.counterpartyId);
    const preferredInvoiceId = invoice?.id ?? null;
    const normalizedInvoiceNo = String(row.lastDocumentNumber ?? "").trim();
    const document =
      docs.find((d) => {
        if (d.contentType !== "application/pdf") return false;
        const parsedInvoiceId = parseInvoiceIdFromNote(d.notes);
        const parsedInvoiceNo = parseInvoiceNoFromNote(d.notes);
        if (preferredInvoiceId != null && parsedInvoiceId === preferredInvoiceId) return true;
        if (normalizedInvoiceNo && parsedInvoiceNo === normalizedInvoiceNo) return true;
        return false;
      }) ?? null;
    return { invoice: invoice ?? null, document };
  }, []);

  const openLastInvoicePdf = useCallback(
    async (row: CounterpartySuggestionRow) => {
      if (row.counterpartyType !== "branch" || !row.lastDocumentNumber) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`;
      setPdfBusyKey(key);
      try {
        const normalizedInvoiceNo = String(row.lastDocumentNumber).trim();
        const { document: target } = await resolveBranchInvoiceArtifacts(row);

        if (!target) {
          setErrorText(t("reports.counterpartySummaryPdfNotFound"));
          return;
        }

        const { blob } = await fetchBranchDocumentBlob(row.counterpartyId, target.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${normalizedInvoiceNo || "invoice"}.pdf`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        setErrorText(toErrorMessage(error));
      } finally {
        setPdfBusyKey("");
      }
    },
    [resolveBranchInvoiceArtifacts, t]
  );

  const previewLastInvoicePdf = useCallback(
    async (row: CounterpartySuggestionRow) => {
      if (row.counterpartyType !== "branch" || !row.lastDocumentNumber) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`;
      setPdfBusyKey(key);
      try {
        const normalizedInvoiceNo = String(row.lastDocumentNumber).trim();
        const { document: target } = await resolveBranchInvoiceArtifacts(row);
        if (!target) {
          setErrorText(t("reports.counterpartySummaryPdfNotFound"));
          return;
        }
        const { blob } = await fetchBranchDocumentBlob(row.counterpartyId, target.id);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } catch (error) {
        setErrorText(toErrorMessage(error));
      } finally {
        setPdfBusyKey("");
      }
    },
    [resolveBranchInvoiceArtifacts, t]
  );

  const deleteLastInvoiceWithPdf = useCallback(
    async (row: CounterpartySuggestionRow) => {
      if (row.counterpartyType !== "branch" || !row.lastDocumentNumber) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`;
      const confirmed = window.confirm(
        t("reports.counterpartySummaryDeleteConfirm") ||
          "Bu fatura, bağlı cari kaydı ve PDF kaydı soft-delete edilecek. Devam edilsin mi?"
      );
      if (!confirmed) return;
      setPdfBusyKey(key);
      setErrorText("");
      try {
        const { invoice, document } = await resolveBranchInvoiceArtifacts(row);
        if (!invoice) {
          setErrorText(t("reports.counterpartySummaryDeleteInvoiceNotFound"));
          return;
        }
        if (document) {
          await deleteBranchDocument(row.counterpartyId, document.id);
        }
        await deleteOutboundInvoice(invoice.id);
        await load(filters);
      } catch (error) {
        setErrorText(toErrorMessage(error));
      } finally {
        setPdfBusyKey("");
      }
    },
    [filters, load, resolveBranchInvoiceArtifacts, t]
  );

  const downloadSummaryPdf = useCallback(async () => {
    setExportBusy(true);
    setErrorText("");
    try {
      const invoices = await fetchOutboundInvoices();
      const selectedBranchNumericId = Number.parseInt(selectedBranchId, 10);
      const selectedCounterpartyType = (filters.counterpartyType ?? "").trim();
      const selectedCurrency = (filters.currencyCode ?? "").trim().toUpperCase();
      const selectedSearch = (filters.search ?? "").trim().toLowerCase();

      const filteredInvoices = invoices.filter((invoice) => {
        if (selectedCounterpartyType && invoice.counterpartyType !== selectedCounterpartyType) return false;
        if (selectedCurrency && invoice.currencyCode.toUpperCase() !== selectedCurrency) return false;
        if (filters.issueDateFrom && invoice.issueDate < filters.issueDateFrom) return false;
        if (filters.issueDateTo && invoice.issueDate > filters.issueDateTo) return false;
        if (
          Number.isFinite(selectedBranchNumericId) &&
          selectedBranchNumericId > 0 &&
          invoice.counterpartyType === "branch" &&
          invoice.counterpartyId !== selectedBranchNumericId
        ) {
          return false;
        }
        if (selectedSearch) {
          const haystack = `${invoice.counterpartyName} ${invoice.documentNumber}`.toLowerCase();
          if (!haystack.includes(selectedSearch)) return false;
        }
        if (filters.onlyWithOpenBalance && Number(invoice.openAmount) <= 0) return false;
        return true;
      });

      if (filteredInvoices.length === 0) {
        setErrorText(t("reports.counterpartySummaryEmpty"));
        return;
      }

      const rows = await Promise.all(
        filteredInvoices.map(async (invoice) => {
          const receipts = await fetchOutboundInvoiceReceipts(invoice.id);
          const lastPaymentDate = receipts.length > 0 ? receipts[0]?.receiptDate ?? null : null;
          return {
            counterpartyName: invoice.counterpartyName,
            counterpartyTypeLabel:
              invoice.counterpartyType === "branch"
                ? t("reports.counterpartySummaryTypeBranch")
                : t("reports.counterpartySummaryTypeCustomer"),
            documentNumber: invoice.documentNumber,
            issueDate: formatLocaleDate(invoice.issueDate, locale),
            invoiceAmount: formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode || "TRY"),
            paidAmount: formatLocaleAmount(invoice.paidTotal, locale, invoice.currencyCode || "TRY"),
            openAmount: formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode || "TRY"),
            paymentDate: lastPaymentDate ? formatLocaleDate(lastPaymentDate, locale) : "—",
          };
        })
      );

      const invoiceTotal = filteredInvoices.reduce((acc, item) => acc + (Number(item.linesTotal) || 0), 0);
      const paidTotal = filteredInvoices.reduce((acc, item) => acc + (Number(item.paidTotal) || 0), 0);
      const openTotal = filteredInvoices.reduce((acc, item) => acc + (Number(item.openAmount) || 0), 0);
      const branchName =
        Number.isFinite(selectedBranchNumericId) && selectedBranchNumericId > 0
          ? branches.find((b) => b.id === selectedBranchNumericId)?.name ?? `#${selectedBranchNumericId}`
          : t("reports.counterpartySummaryBranchAll");

      const branding = await fetchSystemBranding().catch(() => null);
      const companyName = branding?.companyName?.trim() || "—";
      let logoDataUrl = "";
      if (branding?.hasLogo) {
        try {
          const res = await apiFetch(companyBrandingLogoUrl(branding.updatedAtUtc));
          if (res.ok) {
            const blob = await res.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
              reader.onerror = () => reject(reader.error ?? new Error("logo-read-failed"));
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          logoDataUrl = "";
        }
      }

      await downloadCounterpartyInvoiceStylePdf(rows, {
        companyName,
        branchName,
        logoDataUrl,
        title: t("reports.counterpartySummaryPdfTitle"),
        issuedAtLabel: `${t("reports.counterpartySummaryPdfGeneratedAt")}: ${new Date().toLocaleDateString(locale)}`,
        filtersLabel: `${t("reports.counterpartySummaryPdfFilters")}: ${[
          selectedCounterpartyType || t("reports.counterpartySummaryTypeAll"),
          selectedCurrency || "TRY",
          filters.issueDateFrom || "—",
          filters.issueDateTo || "—",
        ].join(" · ")}`,
        totalsLabel: `${t("reports.counterpartySummaryPdfTotals")}: ${formatLocaleAmount(invoiceTotal, locale, selectedCurrency || "TRY")} / ${formatLocaleAmount(paidTotal, locale, selectedCurrency || "TRY")} / ${formatLocaleAmount(openTotal, locale, selectedCurrency || "TRY")}`,
        fileName: `cari_hesap_faturasi_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (error) {
      setErrorText(toErrorMessage(error));
    } finally {
      setExportBusy(false);
    }
  }, [branches, filters, locale, selectedBranchId, t]);

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
        <div className="flex min-w-0 shrink-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-[15rem] max-w-full flex-1 sm:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              {t("reports.counterpartySummaryBranchFilterLabel")}
            </label>
            <RichCombobox
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={branchOptions}
              placeholder={t("reports.counterpartySummaryBranchFilterPlaceholder")}
              searchPlaceholder={t("reports.counterpartySummaryBranchFilterSearch")}
              emptyText={t("reports.counterpartySummaryBranchFilterEmpty")}
            />
          </div>
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
          <Button
            type="button"
            variant="secondary"
            className="h-11 px-3"
            onClick={() => void downloadSummaryPdf()}
            disabled={busy || exportBusy}
          >
            {exportBusy ? t("common.loading") : t("reports.counterpartySummaryExportPdf")}
          </Button>
        </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard title={t("reports.counterpartySummaryInvoicedTotal")} value={formatLocaleAmount(reportTotals.invoicedTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryPaidTotal")} value={formatLocaleAmount(reportTotals.paidTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryOpenTotal")} value={formatLocaleAmount(reportTotals.openAmountTotal, locale, filters.currencyCode || "TRY")} />
        <SummaryCard title={t("reports.counterpartySummaryCounterpartyCount")} value={String(reportTotals.counterpartyCount)} />
        <SummaryCard title={t("reports.counterpartySummaryInvoiceCount")} value={String(reportTotals.invoiceCount)} />
      </div>

      {errorText ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      {busy ? <p className="text-sm text-zinc-500">{t("reports.loading")}</p> : null}

      <div className="space-y-3 md:hidden">
        {reportItems.map((row) => (
          <div
            key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`}
            className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{row.counterpartyName}</p>
                <p className="text-xs text-zinc-600">
                  {row.counterpartyType === "branch"
                    ? t("reports.counterpartySummaryTypeBranch")
                    : t("reports.counterpartySummaryTypeCustomer")}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-violet-800">
                {formatLocaleAmount(row.openAmount, locale, row.currencyCode || "TRY")}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColInvoiced")}</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatLocaleAmount(row.invoicedTotal, locale, row.currencyCode || "TRY")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColPaid")}</dt>
                <dd className="font-medium tabular-nums text-zinc-900">
                  {formatLocaleAmount(row.paidTotal, locale, row.currencyCode || "TRY")}
                </dd>
              </div>
            </dl>
            <p className="mt-2 truncate text-xs text-zinc-600 sm:text-sm">
              {row.lastDocumentNumber ? `${row.lastDocumentNumber} · ${row.lastInvoiceDate ?? "—"}` : "—"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className={detailOpenIconButtonClass}
                aria-label={t("reports.counterpartySummaryPdfPreview")}
                disabled={
                  row.counterpartyType !== "branch" ||
                  !row.lastDocumentNumber ||
                  pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                }
                onClick={() => void previewLastInvoicePdf(row)}
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={detailOpenIconButtonClass}
                aria-label={t("reports.counterpartySummaryPdfDownload")}
                disabled={
                  row.counterpartyType !== "branch" ||
                  !row.lastDocumentNumber ||
                  pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                }
                onClick={() => void openLastInvoicePdf(row)}
              >
                <svg
                  aria-hidden
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={detailOpenIconButtonClass}
                aria-label={t("reports.counterpartySummaryDeleteInvoice")}
                disabled={
                  row.counterpartyType !== "branch" ||
                  !row.lastDocumentNumber ||
                  pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                }
                onClick={() => void deleteLastInvoiceWithPdf(row)}
              >
                <svg
                  aria-hidden
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
        {reportItems.length === 0 && !busy ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500">
            {t("reports.counterpartySummaryEmpty")}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
        <table className="w-full min-w-0 lg:min-w-[780px] text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColName")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColType")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColInvoiced")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPaid")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColOpen")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColLastInvoice")}</th>
              <th className="px-3 py-2 text-center">{t("reports.counterpartySummaryColPdf")}</th>
              <th className="px-3 py-2 text-center">{t("reports.counterpartySummaryDeleteInvoice")}</th>
            </tr>
          </thead>
          <tbody>
            {reportItems.map((row) => (
              <tr
                key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`}
                className="border-t border-zinc-100"
              >
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
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className={detailOpenIconButtonClass}
                      aria-label={t("reports.counterpartySummaryPdfPreview")}
                      disabled={
                        row.counterpartyType !== "branch" ||
                        !row.lastDocumentNumber ||
                        pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                      }
                      onClick={() => void previewLastInvoicePdf(row)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={detailOpenIconButtonClass}
                      aria-label={t("reports.counterpartySummaryPdfDownload")}
                      disabled={
                        row.counterpartyType !== "branch" ||
                        !row.lastDocumentNumber ||
                        pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                      }
                      onClick={() => void openLastInvoicePdf(row)}
                    >
                      <svg
                        aria-hidden
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                      </svg>
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    type="button"
                    variant="secondary"
                    className={detailOpenIconButtonClass}
                    aria-label={t("reports.counterpartySummaryDeleteInvoice")}
                    disabled={
                      row.counterpartyType !== "branch" ||
                      !row.lastDocumentNumber ||
                      pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                    }
                    onClick={() => void deleteLastInvoiceWithPdf(row)}
                  >
                    <svg
                      aria-hidden
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </Button>
                </td>
              </tr>
            ))}
            {reportItems.length === 0 && !busy ? (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-500" colSpan={8}>
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
              className="mt-1 h-10 min-h-[44px] w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 sm:h-11 sm:text-base"
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
