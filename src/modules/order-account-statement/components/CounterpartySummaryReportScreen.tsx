"use client";

import { useI18n } from "@/i18n/context";
import {
  deleteBranchDocument,
  fetchBranchDocumentBlob,
  fetchBranchDocuments,
  uploadBranchDocument,
} from "@/modules/branch/api/branch-documents-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  addOutboundInvoiceReceipt,
  deleteCustomerAccount,
  deleteOutboundInvoice,
  fetchOutboundInvoices,
  fetchOutboundInvoiceReceipts,
  fetchCounterpartySummaryReport,
  type CounterpartySummaryFilters,
  type CounterpartySummaryReport,
  type CounterpartySuggestionRow,
  type OutboundInvoiceReceiptResponse,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  companyBrandingLogoUrl,
  fetchSystemBranding,
} from "@/modules/admin/api/system-branding-api";
import { downloadCounterpartyInvoiceStylePdf } from "@/modules/order-account-statement/lib/download-counterparty-invoice-style-pdf";
import { CurrentAccountReceiptModal } from "@/modules/order-account-statement/components/CurrentAccountReceiptModal";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { currencySelectOptions } from "@/shared/lib/currency-select-options";
import { formatAmountInputOnBlur, formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
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

type TableRow = CounterpartySuggestionRow & {
  invoiceId?: number;
  promoTotal?: number;
  giftTotal?: number;
  advanceTotal?: number;
};

type BranchInvoiceArtifacts = {
  invoice: OutboundInvoiceResponse | null;
  pdfDocument: { id: number; notes?: string | null; contentType: string; createdAt?: string } | null;
  receiptImageDocument: { id: number; notes?: string | null; contentType: string; createdAt?: string } | null;
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

function isOpenBalance(openAmount: number): boolean {
  return Number.isFinite(openAmount) && openAmount > 0.009;
}

export function CounterpartySummaryReportScreen() {
  const { t, locale } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const [report, setReport] = useState<CounterpartySummaryReport>(defaultReport);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [pdfBusyKey, setPdfBusyKey] = useState("");
  const [invoiceRows, setInvoiceRows] = useState<OutboundInvoiceResponse[]>([]);
  const [promoByInvoiceId, setPromoByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const [advanceByInvoiceId, setAdvanceByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const [giftByInvoiceId, setGiftByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const [promoByCounterparty, setPromoByCounterparty] = useState<Map<string, number>>(() => new Map());
  const [advanceByCounterparty, setAdvanceByCounterparty] = useState<Map<string, number>>(() => new Map());
  const [giftByCounterparty, setGiftByCounterparty] = useState<Map<string, number>>(() => new Map());
  const [showInvoiceRows, setShowInvoiceRows] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<CounterpartySuggestionRow | null>(null);
  const [receiptDate, setReceiptDate] = useState(localIsoDate());
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [receiptTransferImage, setReceiptTransferImage] = useState<File | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [filters, setFilters] = useState<CounterpartySummaryFilters>({
    counterpartyType: "",
    currencyCode: "TRY",
    search: "",
    onlyWithOpenBalance: false,
    limit: 100,
  });

  const counterpartyKey = useCallback(
    (counterpartyType: string, counterpartyId: number, currencyCode: string) =>
      `${counterpartyType}:${counterpartyId}:${(currencyCode || "TRY").trim().toUpperCase()}`,
    []
  );

  const parseNoteAmount = useCallback((note: string | null | undefined, key: string): number => {
    const raw = String(note ?? "");
    const m = raw.match(new RegExp(`(?:^|[;,\\s·])${key}=([0-9]+(?:\\.[0-9]+)?)`, "i"));
    if (!m) return 0;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const isPromoReceipt = useCallback((receipt: OutboundInvoiceReceiptResponse): boolean => {
    if (receipt.receiptKind === "promo_discount") return true;
    const note = String(receipt.notes ?? "").trim().toLowerCase();
    if (!note) return false;
    return note.includes("source=promo_discount") || note.includes("promosyon") || note.includes("iskonto") || note.includes("indirim");
  }, []);

  const isAdvanceReceipt = useCallback((receipt: OutboundInvoiceReceiptResponse): boolean => {
    if (receipt.receiptKind === "advance_payment") return true;
    const note = String(receipt.notes ?? "").trim().toLowerCase();
    if (!note) return false;
    return note.includes("source=advance_payment") || note.includes("ön ödeme") || note.includes("on odeme");
  }, []);

  const load = useCallback(async (nextFilters: CounterpartySummaryFilters) => {
    setBusy(true);
    setErrorText("");
    try {
      const [data, invoices] = await Promise.all([
        fetchCounterpartySummaryReport(nextFilters),
        fetchOutboundInvoices(),
      ]);
      const invoiceBreakdown = invoices.map((invoice) => {
        const promoTotal =
          Number.isFinite(Number(invoice.promoAmount)) && Number(invoice.promoAmount) > 0
            ? Number(invoice.promoAmount)
            : parseNoteAmount(invoice.notes, "promoAmount");
        const advanceTotal =
          Number.isFinite(Number(invoice.advanceAmount)) && Number(invoice.advanceAmount) > 0
            ? Number(invoice.advanceAmount)
            : parseNoteAmount(invoice.notes, "advanceAmount");
        const giftTotal =
          Number.isFinite(Number(invoice.giftAmount)) && Number(invoice.giftAmount) > 0
            ? Number(invoice.giftAmount)
            : parseNoteAmount(invoice.notes, "giftAmount");
        return [invoice.id, { promoTotal, advanceTotal, giftTotal }] as const;
      });

      const unresolved = invoices.filter((invoice) => {
        const promo = invoiceBreakdown.find(([id]) => id === invoice.id)?.[1].promoTotal ?? 0;
        const advance = invoiceBreakdown.find(([id]) => id === invoice.id)?.[1].advanceTotal ?? 0;
        return promo <= 0.009 && advance <= 0.009 && (Number(invoice.paidTotal) || 0) > 0.009;
      });

      if (unresolved.length > 0) {
        const receiptBreakdown = new Map<number, { promo: number; advance: number }>();
        const concurrency = 6;
        for (let i = 0; i < unresolved.length; i += concurrency) {
          const chunk = unresolved.slice(i, i + concurrency);
          const chunkResults = await Promise.all(
            chunk.map(async (invoice) => {
              const receipts = await fetchOutboundInvoiceReceipts(invoice.id);
              const promo = receipts.reduce((sum, receipt) => {
                if (!isPromoReceipt(receipt)) return sum;
                return sum + Math.max(0, Number(receipt.amount) || 0);
              }, 0);
              const advance = receipts.reduce((sum, receipt) => {
                if (!isAdvanceReceipt(receipt)) return sum;
                return sum + Math.max(0, Number(receipt.amount) || 0);
              }, 0);
              return [invoice.id, { promo, advance }] as const;
            })
          );
          for (const [invoiceId, values] of chunkResults) {
            receiptBreakdown.set(invoiceId, values);
          }
        }

        for (let i = 0; i < invoiceBreakdown.length; i += 1) {
          const [invoiceId, totals] = invoiceBreakdown[i];
          const receiptValues = receiptBreakdown.get(invoiceId);
          if (!receiptValues) continue;
          invoiceBreakdown[i] = [
            invoiceId,
            {
              ...totals,
              promoTotal: totals.promoTotal <= 0.009 ? receiptValues.promo : totals.promoTotal,
              advanceTotal: totals.advanceTotal <= 0.009 ? receiptValues.advance : totals.advanceTotal,
            },
          ] as const;
        }
      }
      const nextPromoByInvoiceId = new Map<number, number>(invoiceBreakdown.map(([id, x]) => [id, x.promoTotal]));
      const nextAdvanceByInvoiceId = new Map<number, number>(invoiceBreakdown.map(([id, x]) => [id, x.advanceTotal]));
      const nextGiftByInvoiceId = new Map<number, number>(invoiceBreakdown.map(([id, x]) => [id, x.giftTotal]));
      const nextPromoByCounterparty = new Map<string, number>();
      const nextAdvanceByCounterparty = new Map<string, number>();
      const nextGiftByCounterparty = new Map<string, number>();
      for (const invoice of invoices) {
        const k = counterpartyKey(invoice.counterpartyType, invoice.counterpartyId, invoice.currencyCode || "TRY");
        nextPromoByCounterparty.set(k, (nextPromoByCounterparty.get(k) ?? 0) + (nextPromoByInvoiceId.get(invoice.id) ?? 0));
        nextAdvanceByCounterparty.set(k, (nextAdvanceByCounterparty.get(k) ?? 0) + (nextAdvanceByInvoiceId.get(invoice.id) ?? 0));
        nextGiftByCounterparty.set(k, (nextGiftByCounterparty.get(k) ?? 0) + (nextGiftByInvoiceId.get(invoice.id) ?? 0));
      }
      setReport(data);
      setInvoiceRows(invoices);
      setPromoByInvoiceId(nextPromoByInvoiceId);
      setAdvanceByInvoiceId(nextAdvanceByInvoiceId);
      setGiftByInvoiceId(nextGiftByInvoiceId);
      setPromoByCounterparty(nextPromoByCounterparty);
      setAdvanceByCounterparty(nextAdvanceByCounterparty);
      setGiftByCounterparty(nextGiftByCounterparty);
    } catch (error) {
      setErrorText(toErrorMessage(error));
      setReport(defaultReport);
      setInvoiceRows([]);
      setPromoByInvoiceId(new Map());
      setAdvanceByInvoiceId(new Map());
      setGiftByInvoiceId(new Map());
      setPromoByCounterparty(new Map());
      setAdvanceByCounterparty(new Map());
      setGiftByCounterparty(new Map());
    } finally {
      setBusy(false);
    }
  }, [counterpartyKey, isAdvanceReceipt, isPromoReceipt, parseNoteAmount]);

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

  const reportItems = useMemo<TableRow[]>(() => {
    const branchId = Number.parseInt(selectedBranchId, 10);
    const rows = !Number.isFinite(branchId) || branchId <= 0
      ? report.items
      : report.items.filter(
      (row) => row.counterpartyType === "branch" && row.counterpartyId === branchId
    );
    return rows.map((row) => ({
      ...row,
      promoTotal: promoByCounterparty.get(counterpartyKey(row.counterpartyType, row.counterpartyId, row.currencyCode || "TRY")) ?? 0,
      giftTotal: giftByCounterparty.get(counterpartyKey(row.counterpartyType, row.counterpartyId, row.currencyCode || "TRY")) ?? 0,
      advanceTotal: advanceByCounterparty.get(counterpartyKey(row.counterpartyType, row.counterpartyId, row.currencyCode || "TRY")) ?? 0,
    }));
  }, [advanceByCounterparty, counterpartyKey, giftByCounterparty, promoByCounterparty, report.items, selectedBranchId]);

  const invoiceItems = useMemo<TableRow[]>(() => {
    const selectedBranchNumericId = Number.parseInt(selectedBranchId, 10);
    const selectedCounterpartyType = (filters.counterpartyType ?? "").trim();
    const selectedCurrency = (filters.currencyCode ?? "").trim().toUpperCase();
    const selectedSearch = (filters.search ?? "").trim().toLowerCase();
    return invoiceRows
      .filter((invoice) => {
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
      })
      .map((invoice) => ({
        invoiceId: invoice.id,
        counterpartyType: invoice.counterpartyType,
        counterpartyId: invoice.counterpartyId,
        counterpartyName: invoice.counterpartyName,
        currencyCode: invoice.currencyCode,
        invoicedTotal: invoice.linesTotal,
        paidTotal: invoice.paidTotal,
        promoTotal: promoByInvoiceId.get(invoice.id) ?? 0,
        giftTotal: giftByInvoiceId.get(invoice.id) ?? 0,
        advanceTotal: advanceByInvoiceId.get(invoice.id) ?? 0,
        openAmount: invoice.openAmount,
        lastInvoiceDate: invoice.issueDate,
        lastDocumentNumber: invoice.documentNumber,
      }));
  }, [advanceByInvoiceId, filters, giftByInvoiceId, invoiceRows, promoByInvoiceId, selectedBranchId]);

  const tableItems = showInvoiceRows ? invoiceItems : reportItems;

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

  const resolveBranchInvoiceArtifacts = useCallback(async (row: CounterpartySuggestionRow): Promise<BranchInvoiceArtifacts> => {
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
    const pdfDocument =
      docs.find((d) => {
        if (d.contentType !== "application/pdf") return false;
        const parsedInvoiceId = parseInvoiceIdFromNote(d.notes);
        const parsedInvoiceNo = parseInvoiceNoFromNote(d.notes);
        if (preferredInvoiceId != null && parsedInvoiceId === preferredInvoiceId) return true;
        if (normalizedInvoiceNo && parsedInvoiceNo === normalizedInvoiceNo) return true;
        return false;
      }) ?? null;
    const receiptImageDocument =
      docs
        .filter((d) => d.contentType.startsWith("image/"))
        .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0))
        .find((d) => {
          const parsedInvoiceId = parseInvoiceIdFromNote(d.notes);
          const parsedInvoiceNo = parseInvoiceNoFromNote(d.notes);
          if (preferredInvoiceId != null && parsedInvoiceId === preferredInvoiceId) return true;
          if (normalizedInvoiceNo && parsedInvoiceNo === normalizedInvoiceNo) return true;
          return false;
        }) ?? null;
    return { invoice: invoice ?? null, pdfDocument, receiptImageDocument };
  }, []);

  const openLastInvoicePdf = useCallback(
    async (row: CounterpartySuggestionRow) => {
      if (row.counterpartyType !== "branch" || !row.lastDocumentNumber) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`;
      setPdfBusyKey(key);
      try {
        const normalizedInvoiceNo = String(row.lastDocumentNumber).trim();
        const { pdfDocument: target } = await resolveBranchInvoiceArtifacts(row);

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
        const { pdfDocument: target } = await resolveBranchInvoiceArtifacts(row);
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
      notifyConfirmToast({
        toastId: `counterparty-delete-invoice-${key}`,
        title: t("reports.counterpartySummaryDeleteInvoice"),
        message:
          t("reports.counterpartySummaryDeleteConfirm") ||
          "Bu fatura, bağlı cari kaydı ve PDF kaydı soft-delete edilecek. Devam edilsin mi?",
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          setPdfBusyKey(key);
          setErrorText("");
          try {
            const { invoice, pdfDocument } = await resolveBranchInvoiceArtifacts(row);
            if (!invoice) {
              const msg = t("reports.counterpartySummaryDeleteInvoiceNotFound");
              setErrorText(msg);
              notify.error(msg);
              return;
            }
            if (pdfDocument) {
              await deleteBranchDocument(row.counterpartyId, pdfDocument.id);
            }
            await deleteOutboundInvoice(invoice.id);
            await load(filters);
            notify.success(t("common.deleted"));
          } catch (error) {
            const msg = toErrorMessage(error);
            setErrorText(msg);
            notify.error(msg);
          } finally {
            setPdfBusyKey("");
          }
        },
      });
    },
    [filters, load, resolveBranchInvoiceArtifacts, t]
  );

  const openLastReceiptImage = useCallback(
    async (row: CounterpartySuggestionRow, mode: "view" | "download") => {
      if (row.counterpartyType !== "branch" || !row.lastDocumentNumber) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-receipt-${mode}`;
      setPdfBusyKey(key);
      try {
        const { receiptImageDocument } = await resolveBranchInvoiceArtifacts(row);
        if (!receiptImageDocument) {
          notify.error(t("branch.currentAccountReceiptImageStatusMissing"));
          return;
        }
        const { blob, contentType } = await fetchBranchDocumentBlob(row.counterpartyId, receiptImageDocument.id);
        const url = URL.createObjectURL(blob);
        if (mode === "view") {
          window.open(url, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
          return;
        }
        const ext = (contentType.split("/")[1] || "img").replace(/[^a-z0-9]/gi, "").toLowerCase() || "img";
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-transfer-${row.lastDocumentNumber || row.counterpartyId}.${ext}`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        notify.error(toErrorMessage(error));
      } finally {
        setPdfBusyKey("");
      }
    },
    [resolveBranchInvoiceArtifacts, t]
  );

  const deleteCustomerCounterparty = useCallback(
    async (row: CounterpartySuggestionRow) => {
      if (row.counterpartyType !== "customer" || row.counterpartyId <= 0) return;
      const key = `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`;
      notifyConfirmToast({
        toastId: `counterparty-delete-customer-${key}`,
        title: "Cari hesabı sil",
        message: `"${row.counterpartyName}" cari hesabı soft-delete yapılacak.`,
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          setPdfBusyKey(key);
          setErrorText("");
          try {
            await deleteCustomerAccount(row.counterpartyId);
            await load(filters);
            notify.success(t("common.deleted"));
          } catch (error) {
            const msg = toErrorMessage(error);
            setErrorText(msg);
            notify.error(msg);
          } finally {
            setPdfBusyKey("");
          }
        },
      });
    },
    [filters, load, t]
  );

  const openReceiptModal = useCallback((row: CounterpartySuggestionRow) => {
    setReceiptTarget(row);
    setReceiptDate(localIsoDate());
    setReceiptAmount("");
    setReceiptNote("");
    setReceiptTransferImage(null);
  }, []);

  const submitReceipt = useCallback(async () => {
    if (!receiptTarget) return;
    const amount = parseLocaleAmount(receiptAmount, locale);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(t("branch.currentAccountInvalidReceiptAmount"));
      return;
    }
    if (receiptTransferImage) {
      const v = await validateImageFileForUpload(receiptTransferImage);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }
    const currencyCode = (receiptTarget.currencyCode || "TRY").trim().toUpperCase();
    setReceiptSaving(true);
    setErrorText("");
    try {
      const invoices = await fetchOutboundInvoices();
      const openRows = invoices
        .filter(
          (r) =>
            r.counterpartyType === receiptTarget.counterpartyType &&
            r.counterpartyId === receiptTarget.counterpartyId &&
            (r.currencyCode || "TRY").trim().toUpperCase() === currencyCode &&
            Number.isFinite(Number(r.openAmount)) &&
            Number(r.openAmount) > 0.009
        )
        .sort((a, b) => {
          const d = a.issueDate.localeCompare(b.issueDate);
          return d !== 0 ? d : a.id - b.id;
        });
      if (openRows.length === 0) {
        notify.error(t("branch.currentAccountNoOpenInvoicesForAllocation"));
        return;
      }
      const prioritized = [
        ...openRows.filter((r) => r.documentNumber === receiptTarget.lastDocumentNumber),
        ...openRows.filter((r) => r.documentNumber !== receiptTarget.lastDocumentNumber),
      ];
      let remaining = amount;
      let appliedTotal = 0;
      let appliedCount = 0;
      for (const r of prioritized) {
        if (remaining <= 0.009) break;
        const open = Number(r.openAmount) || 0;
        if (open <= 0.009) continue;
        const apply = Math.min(remaining, open);
        await addOutboundInvoiceReceipt(r.id, {
          receiptDate,
          amount: apply,
          currencyCode,
          receiptKind: "cash",
          notes: receiptNote.trim() || null,
        });
        if (receiptTransferImage && receiptTarget.counterpartyType === "branch") {
          await uploadBranchDocument(receiptTarget.counterpartyId, {
            file: receiptTransferImage,
            kind: "OTHER",
            notes: `title=banka_dekontu · source=current_account_receipt · invoiceId=${r.id} · receiptDate=${receiptDate}`,
          });
        }
        appliedTotal += apply;
        appliedCount += 1;
        remaining -= apply;
      }
      await load(filters);
      notify.success(
        t("branch.currentAccountReceiptDistributedSaved")
          .replace("{n}", String(appliedCount))
          .replace("{amount}", formatLocaleAmount(appliedTotal, locale, currencyCode))
      );
      if (remaining > 0.009) {
        notify.info(
          t("branch.currentAccountReceiptUnappliedRemainder").replace(
            "{amount}",
            formatLocaleAmount(remaining, locale, currencyCode)
          )
        );
      }
      setReceiptTarget(null);
      setReceiptTransferImage(null);
    } catch (error) {
      const msg = toErrorMessage(error);
      setErrorText(msg);
      notify.error(msg);
    } finally {
      setReceiptSaving(false);
    }
  }, [filters, load, locale, receiptAmount, receiptDate, receiptNote, receiptTarget, receiptTransferImage, t]);

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
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-700">
            <Checkbox checked={showInvoiceRows} onCheckedChange={(v) => setShowInvoiceRows(v === true)} />
            Fatura bazli liste
          </label>
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
        {tableItems.map((row) => (
          <div
            key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-${row.lastDocumentNumber ?? "summary"}`}
            className={`rounded-xl border p-3 sm:p-4 ${
              isOpenBalance(Number(row.openAmount))
                ? "border-amber-200 bg-amber-50/30"
                : "border-emerald-200 bg-emerald-50/30"
            }`}
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
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  isOpenBalance(Number(row.openAmount))
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {isOpenBalance(Number(row.openAmount))
                  ? t("reports.counterpartySummaryBalanceOpenBadge")
                  : t("reports.counterpartySummaryBalanceClosedBadge")}
              </span>
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
                  {formatLocaleAmount(
                    Math.max(
                      0,
                      (Number(row.paidTotal) || 0) -
                        (Number(row.promoTotal) || 0) -
                        (Number(row.advanceTotal) || 0)
                    ),
                    locale,
                    row.currencyCode || "TRY"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColPromo")}</dt>
                <dd className="font-medium tabular-nums text-violet-700">
                  {(Number(row.promoTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.promoTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColGiftAmount")}</dt>
                <dd className="font-medium tabular-nums text-fuchsia-700">
                  {(Number(row.giftTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.giftTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColAdvance")}</dt>
                <dd className="font-medium tabular-nums text-sky-700">
                  {(Number(row.advanceTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.advanceTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColInvoiceRef")}</dt>
                <dd className="font-medium tabular-nums text-zinc-900">{row.lastDocumentNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("reports.counterpartySummaryColIssueDate")}</dt>
                <dd className="font-medium tabular-nums text-zinc-900">{row.lastInvoiceDate || "—"}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className={detailOpenIconButtonClass}
                aria-label={t("branch.currentAccountAddReceipt")}
                disabled={Number(row.openAmount) <= 0}
                onClick={() => openReceiptModal(row)}
              >
                +
              </Button>
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
                  (row.counterpartyType === "branch" && !row.lastDocumentNumber) ||
                  (row.counterpartyType !== "branch" && row.counterpartyType !== "customer") ||
                  pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                }
                onClick={() =>
                  row.counterpartyType === "customer"
                    ? void deleteCustomerCounterparty(row)
                    : void deleteLastInvoiceWithPdf(row)
                }
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
        {tableItems.length === 0 && !busy ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500">
            {t("reports.counterpartySummaryEmpty")}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
        <table className="w-full min-w-0 lg:min-w-[780px] text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColInvoiceRef")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColIssueDate")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColName")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColType")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColInvoiced")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPaid")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPromo")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColGiftAmount")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColAdvance")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColOpen")}</th>
              <th className="px-3 py-2 text-center">{t("branch.currentAccountColPdfStatus")}</th>
              <th className="px-3 py-2 text-center">{t("branch.currentAccountColReceiptImageStatus")}</th>
              <th className="px-3 py-2 text-center">{t("branch.currentAccountColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map((row) => (
              <tr
                key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-${row.lastDocumentNumber ?? "summary"}`}
                className={`border-t ${
                  isOpenBalance(Number(row.openAmount))
                    ? "border-amber-100 bg-amber-50/20"
                    : "border-emerald-100 bg-emerald-50/20"
                }`}
              >
                {(() => {
                  const hasPdfAsset =
                    row.counterpartyType === "branch" && Boolean(row.lastDocumentNumber);
                  const hasReceiptAsset =
                    row.counterpartyType === "branch" &&
                    Boolean(row.lastDocumentNumber) &&
                    Number(row.paidTotal) > 0;
                  return (
                    <>
                <td className="px-3 py-2 text-zinc-600">{row.lastDocumentNumber || "—"}</td>
                <td className="px-3 py-2 text-zinc-600">{row.lastInvoiceDate || "—"}</td>
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
                  {formatLocaleAmount(
                    Math.max(
                      0,
                      (Number(row.paidTotal) || 0) -
                        (Number(row.promoTotal) || 0) -
                        (Number(row.advanceTotal) || 0)
                    ),
                    locale,
                    row.currencyCode || "TRY"
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-violet-700">
                  {(Number(row.promoTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.promoTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-fuchsia-700">
                  {(Number(row.giftTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.giftTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-sky-700">
                  {(Number(row.advanceTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.advanceTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-violet-800">
                  <div>{formatLocaleAmount(row.openAmount, locale, row.currencyCode || "TRY")}</div>
                  <div
                    className={`mt-0.5 text-[11px] font-semibold ${
                      isOpenBalance(Number(row.openAmount)) ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {isOpenBalance(Number(row.openAmount))
                      ? t("reports.counterpartySummaryBalanceOpenBadge")
                      : t("reports.counterpartySummaryBalanceClosedBadge")}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="mb-1 text-xs text-zinc-500">
                    {hasPdfAsset
                      ? t("branch.currentAccountPdfStatusSaved")
                      : t("branch.currentAccountPdfStatusMissing")}
                  </div>
                  {hasPdfAsset ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("reports.counterpartySummaryPdfPreview")}
                        title={t("reports.counterpartySummaryPdfPreview")}
                        disabled={pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`}
                        onClick={() => void previewLastInvoicePdf(row)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("reports.counterpartySummaryPdfDownload")}
                        title={t("reports.counterpartySummaryPdfDownload")}
                        disabled={pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`}
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
                  ) : (
                    <span className="inline-block text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="mb-1 text-xs text-zinc-500">
                    {hasReceiptAsset
                      ? t("branch.currentAccountReceiptImageStatusSaved")
                      : t("branch.currentAccountReceiptImageStatusMissing")}
                  </div>
                  {hasReceiptAsset ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("branch.currentAccountReceiptImageView")}
                        title={t("branch.currentAccountReceiptImageView")}
                        disabled={pdfBusyKey.startsWith(
                          `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-receipt-`
                        )}
                        onClick={() => void openLastReceiptImage(row, "view")}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("branch.currentAccountReceiptImageDownload")}
                        title={t("branch.currentAccountReceiptImageDownload")}
                        disabled={pdfBusyKey.startsWith(
                          `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-receipt-`
                        )}
                        onClick={() => void openLastReceiptImage(row, "download")}
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
                  ) : (
                    <span className="inline-block text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="primary"
                      className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs"
                      aria-label={t("branch.currentAccountAddReceipt")}
                      title={t("branch.currentAccountAddReceipt")}
                      disabled={Number(row.openAmount) <= 0}
                      onClick={() => openReceiptModal(row)}
                    >
                      {t("branch.currentAccountAddReceipt")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={detailOpenIconButtonClass}
                      aria-label={t("reports.counterpartySummaryDeleteInvoice")}
                      title={t("reports.counterpartySummaryDeleteInvoice")}
                      disabled={
                        (row.counterpartyType === "branch" && !row.lastDocumentNumber) ||
                        (row.counterpartyType !== "branch" && row.counterpartyType !== "customer") ||
                        pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                      }
                      onClick={() =>
                        row.counterpartyType === "customer"
                          ? void deleteCustomerCounterparty(row)
                          : void deleteLastInvoiceWithPdf(row)
                      }
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
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
            {tableItems.length === 0 && !busy ? (
              <tr>
                <td className="px-3 py-4 text-center text-zinc-500" colSpan={13}>
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

      <CurrentAccountReceiptModal
        open={receiptTarget != null}
        onClose={() => setReceiptTarget(null)}
        titleId="counterparty-summary-receipt-modal-title"
        title={t("branch.currentAccountReceiptModalTitle")}
        closeButtonLabel={t("common.close")}
        summaryText={
          receiptTarget
            ? `${receiptTarget.counterpartyName} · ${formatLocaleAmount(
                receiptTarget.openAmount,
                locale,
                receiptTarget.currencyCode || "TRY"
              )}`
            : "—"
        }
        receiptDateLabel={t("branch.currentAccountReceiptDate")}
        receiptDate={receiptDate}
        onReceiptDateChange={setReceiptDate}
        receiptAmountLabel={t("branch.currentAccountReceiptAmount")}
        receiptAmount={receiptAmount}
        onReceiptAmountChange={setReceiptAmount}
        onReceiptAmountBlur={() => setReceiptAmount((x) => formatAmountInputOnBlur(x, locale))}
        fillOpenAmountLabel={t("branch.currentAccountReceiptFillOpenAmount")}
        onFillOpenAmount={
          receiptTarget
            ? () =>
                setReceiptAmount(
                  formatAmountInputOnBlur(String(receiptTarget.openAmount ?? ""), locale)
                )
            : undefined
        }
        receiptNoteLabel={t("branch.currentAccountReceiptNote")}
        receiptNote={receiptNote}
        onReceiptNoteChange={setReceiptNote}
        showImageUpload={receiptTarget?.counterpartyType === "branch"}
        receiptImageLabel={t("branch.currentAccountReceiptImage")}
        receiptImageFile={receiptTransferImage}
        onReceiptImageChange={setReceiptTransferImage}
        cancelLabel={t("common.cancel")}
        saveLabel={t("branch.currentAccountSaveReceipt")}
        loadingLabel={t("common.loading")}
        saving={receiptSaving}
        onSubmit={() => void submitReceipt()}
      />
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
