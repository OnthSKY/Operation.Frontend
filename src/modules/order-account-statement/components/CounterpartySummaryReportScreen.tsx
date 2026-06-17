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
  deleteCustomerAccount,
  deleteOutboundInvoice,
  fetchOutboundInvoices,
  type CounterpartySummaryFilters,
  type CounterpartySummaryReport,
  type CounterpartySuggestionRow,
  type OutboundInvoiceReceiptResponse,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  addCustomerAccountReceipt,
  fetchCounterpartyLedgerSummary,
  fetchCustomerAccountReceiptsByInvoice,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import {
  companyBrandingLogoUrl,
  fetchSystemBranding,
} from "@/modules/admin/api/system-branding-api";
import { downloadCounterpartyInvoiceStylePdf } from "@/modules/order-account-statement/lib/download-counterparty-invoice-style-pdf";
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
import {
  GeneralReceiptModal,
  type CounterpartyOption,
} from "@/modules/order-account-statement/components/GeneralReceiptModal";
import { buildPdfFileName } from "@/shared/lib/pdf-file-name";
import { AllReceiptsTab } from "@/modules/order-account-statement/components/AllReceiptsTab";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  /** Gerçek nakit tahsilat (paid - promo - advance). Backend canonical. */
  cashTotal?: number;
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
  // URL query param `?tab=receipts` ile sidebar'dan direkt erişim destekli.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = searchParams?.get("tab") === "receipts" ? "receipts" : "summary";
  const [activeTab, setActiveTab] = useState<"summary" | "receipts">(initialTab);
  // URL param değişirse (sidebar tıklaması), tab'i senkronla.
  useEffect(() => {
    const next = searchParams?.get("tab") === "receipts" ? "receipts" : "summary";
    setActiveTab(next);
  }, [searchParams]);
  // Tab değişimini URL'e yansıt (deep-link / paylaşılabilir).
  const handleTabChange = useCallback(
    (next: "summary" | "receipts") => {
      setActiveTab(next);
      const sp = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      if (next === "receipts") sp.set("tab", "receipts");
      else sp.delete("tab");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const [errorText, setErrorText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [generalReceiptOpen, setGeneralReceiptOpen] = useState(false);
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
      // C planı: yeni cari endpoint'i. Shape uyumlu (items + totals).
      const [ledger, invoices] = await Promise.all([
        fetchCounterpartyLedgerSummary(nextFilters),
        fetchOutboundInvoices(),
      ]);
      const data: CounterpartySummaryReport = {
        items: ledger.items as unknown as CounterpartySuggestionRow[],
        totals: ledger.totals,
      };
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
              const receipts = await fetchCustomerAccountReceiptsByInvoice(invoice.id);
              const promo = receipts.reduce((sum, receipt) => {
                if (!isPromoReceipt(receipt as unknown as OutboundInvoiceReceiptResponse)) return sum;
                return sum + Math.max(0, Number(receipt.amount) || 0);
              }, 0);
              const advance = receipts.reduce((sum, receipt) => {
                if (!isAdvanceReceipt(receipt as unknown as OutboundInvoiceReceiptResponse)) return sum;
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
    // Backend canonical: advanceTotal/promoTotal/giftTotal/cashTotal hepsi report.items içinde gelir.
    // FE override yok — UI'da hesap yapmıyoruz.
    return rows.map((row) => ({ ...row }));
  }, [report.items, selectedBranchId]);

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

  // Toplamlar backend'den geliyor (canonical). UI'da hesap yok — tek source of truth backend.
  // report.totals: { invoicedTotal, paidTotal, cashTotal, advanceTotal, promoTotal, giftTotal,
  //                  openAmountTotal, counterpartyCount, invoiceCount }
  const reportTotals = report.totals;

  // Genel tahsilat modal'ında counterparty seçmek için unique liste — name'e göre sıralı.
  // Kaynaklar: ham `report.items` (filtresiz, backend ledger summary) + `invoiceRows`
  // (tüm faturalar). Sayfa filtreleri (counterpartyType / currency / branch) burada
  // UYGULANMAZ — modal her zaman tüm cariler arasından seçim sunsun.
  const counterpartyOptions = useMemo<CounterpartyOption[]>(() => {
    const m = new Map<string, CounterpartyOption>();
    for (const row of report.items) {
      const key = `${row.counterpartyType}:${row.counterpartyId}`;
      if (m.has(key)) continue;
      m.set(key, {
        counterpartyType: row.counterpartyType as "branch" | "customer",
        counterpartyId: row.counterpartyId,
        name: row.counterpartyName,
        currencyCode: row.currencyCode || "TRY",
      });
    }
    for (const inv of invoiceRows) {
      const key = `${inv.counterpartyType}:${inv.counterpartyId}`;
      if (m.has(key)) continue;
      m.set(key, {
        counterpartyType: inv.counterpartyType as "branch" | "customer",
        counterpartyId: inv.counterpartyId,
        name: inv.counterpartyName,
        currencyCode: inv.currencyCode || "TRY",
      });
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [report.items, invoiceRows, locale]);

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


  const downloadSummaryPdf = useCallback(async (mode: "invoice" | "counterparty") => {
    setExportBusy(true);
    setErrorText("");
    try {
      const selectedBranchNumericId = Number.parseInt(selectedBranchId, 10);
      const selectedCounterpartyType = (filters.counterpartyType ?? "").trim();
      const selectedCurrency = (filters.currencyCode ?? "").trim().toUpperCase();
      const selectedSearch = (filters.search ?? "").trim().toLowerCase();

      const useInvoiceMode = mode === "invoice";

      // Counterparty modu için tableItems'in counterparty hali — checkbox state'inden bağımsız
      const counterpartyItems = useInvoiceMode ? [] : reportItems;
      if (!useInvoiceMode && counterpartyItems.length === 0) {
        setErrorText(t("reports.counterpartySummaryEmpty"));
        return;
      }

      const kindLabel = (k?: string) => {
        switch (k) {
          case "cash":
            return t("branch.ledgerModalKindCash");
          case "bank_transfer":
            return t("branch.ledgerModalKindBankTransfer");
          case "check":
            return t("branch.ledgerModalKindCheck");
          case "promo_discount":
            return t("branch.ledgerModalKindPromo");
          case "advance_payment":
            return t("branch.ledgerModalKindAdvance");
          default:
            return t("branch.ledgerModalKindOther");
        }
      };

      // INVOICE MODE — her invoice ayrı satır + alt tahsilat detayı
      // COUNTERPARTY MODE — her cari ayrı satır, tahsilat detayı yok (toplam)
      const invoicesForPdf = useInvoiceMode
        ? (await fetchOutboundInvoices()).filter((invoice) => {
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
        : [];

      if (useInvoiceMode && invoicesForPdf.length === 0) {
        setErrorText(t("reports.counterpartySummaryEmpty"));
        return;
      }

      const invoiceModeRows = await Promise.all(
        invoicesForPdf.map(async (invoice) => {
          const receipts = await fetchCustomerAccountReceiptsByInvoice(invoice.id);
          const lastPaymentDate = receipts.length > 0 ? receipts[0]?.receiptDate ?? null : null;
          const ccy = invoice.currencyCode || "TRY";
          const advance = Number(invoice.advanceAmount) || 0;
          const promo = Number(invoice.promoAmount) || 0;
          const gift = Number(invoice.giftAmount) || 0;
          const linkedReceipts = receipts
            .filter(
              (r) =>
                r.receiptKind === "cash" ||
                r.receiptKind === "bank_transfer" ||
                r.receiptKind === "check" ||
                r.receiptKind === "other"
            )
            .reduce((s, r) => s + (Number(r.amount) || 0), 0);
          const receiptItems = [...receipts]
            .sort((a, b) => (b.receiptDate ?? "").localeCompare(a.receiptDate ?? ""))
            .map((r) => ({
              date: formatLocaleDate(r.receiptDate, locale),
              amount: formatLocaleAmount(Number(r.amount) || 0, locale, ccy),
              kindLabel: kindLabel(r.receiptKind),
            }));
          return {
            counterpartyName: invoice.counterpartyName,
            counterpartyTypeLabel:
              invoice.counterpartyType === "branch"
                ? t("reports.counterpartySummaryTypeBranch")
                : t("reports.counterpartySummaryTypeCustomer"),
            documentNumber: invoice.documentNumber,
            issueDate: formatLocaleDate(invoice.issueDate, locale),
            invoiceAmount: formatLocaleAmount(invoice.linesTotal, locale, ccy),
            paidAmount: formatLocaleAmount(linkedReceipts, locale, ccy),
            advanceAmount: advance > 0 ? formatLocaleAmount(advance, locale, ccy) : "—",
            promoAmount: promo > 0 ? formatLocaleAmount(promo, locale, ccy) : "—",
            giftAmount: gift > 0 ? formatLocaleAmount(gift, locale, ccy) : "—",
            promoCombinedAmount:
              promo + gift > 0 ? formatLocaleAmount(promo + gift, locale, ccy) : "—",
            openAmount: formatLocaleAmount(invoice.openAmount, locale, ccy),
            paymentDate: lastPaymentDate ? formatLocaleDate(lastPaymentDate, locale) : "—",
            receipts: receiptItems,
            // Raw values — PDF lib alt toplam satırı için
            _raw: {
              lines: Number(invoice.linesTotal) || 0,
              cash: linkedReceipts,
              advance,
              promo,
              gift,
              open: Number(invoice.openAmount) || 0,
            },
          };
        })
      );

      // COUNTERPARTY MODE — reportItems'tan canonical kırılım ile satır türet
      const counterpartyModeRows = useInvoiceMode
        ? []
        : counterpartyItems.map((row) => {
            const ccy = row.currencyCode || "TRY";
            const invoiced = Number(row.invoicedTotal) || 0;
            const cash = Number(row.cashTotal) || 0;
            const advance = Number(row.advanceTotal) || 0;
            const promo = Number(row.promoTotal) || 0;
            const gift = Number(row.giftTotal) || 0;
            const open = Number(row.openAmount) || 0;
            return {
              counterpartyName: row.counterpartyName,
              counterpartyTypeLabel:
                row.counterpartyType === "branch"
                  ? t("reports.counterpartySummaryTypeBranch")
                  : t("reports.counterpartySummaryTypeCustomer"),
              documentNumber: row.lastDocumentNumber || "—",
              issueDate: row.lastInvoiceDate ?? "—",
              invoiceAmount: formatLocaleAmount(invoiced, locale, ccy),
              paidAmount: formatLocaleAmount(cash, locale, ccy),
              advanceAmount: advance > 0 ? formatLocaleAmount(advance, locale, ccy) : "—",
              promoAmount: promo > 0 ? formatLocaleAmount(promo, locale, ccy) : "—",
              giftAmount: gift > 0 ? formatLocaleAmount(gift, locale, ccy) : "—",
              promoCombinedAmount:
                promo + gift > 0 ? formatLocaleAmount(promo + gift, locale, ccy) : "—",
              openAmount: formatLocaleAmount(open, locale, ccy),
              paymentDate: "—", // cari toplamda anlamsız
              receipts: undefined, // counterparty modunda alt-satır tahsilat detayı yok
              _raw: { lines: invoiced, cash, advance, promo, gift, open },
            };
          });

      const rows = useInvoiceMode ? invoiceModeRows : counterpartyModeRows;

      const invoiceTotal = rows.reduce((s, r) => s + r._raw.lines, 0);
      const cashTotal = rows.reduce((s, r) => s + r._raw.cash, 0);
      const advanceTotalSum = rows.reduce((s, r) => s + r._raw.advance, 0);
      const promoTotalSum = rows.reduce((s, r) => s + r._raw.promo, 0);
      const giftTotalSum = rows.reduce((s, r) => s + r._raw.gift, 0);
      const openTotal = rows.reduce((s, r) => s + r._raw.open, 0);
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

      const pdfCurrency = selectedCurrency || "TRY";
      await downloadCounterpartyInvoiceStylePdf(rows, {
        companyName,
        branchName,
        logoDataUrl,
        title: t("reports.counterpartySummaryPdfTitle"),
        issuedAtLabel: `${t("reports.counterpartySummaryPdfGeneratedAt")}: ${new Date().toLocaleDateString(locale)}`,
        filtersLabel: `${t("reports.counterpartySummaryPdfFilters")}: ${[
          useInvoiceMode ? "Fatura bazlı" : "Cari bazlı",
          selectedCounterpartyType || t("reports.counterpartySummaryTypeAll"),
          selectedCurrency || "TRY",
          filters.issueDateFrom || "—",
          filters.issueDateTo || "—",
        ].join(" · ")}`,
        // Üst-sağ "Toplamlar" satırı kaldırıldı — alt toplam satırı table footer'da.
        totalsLabel: "",
        footerTotals: {
          invoicedLabel: t("branch.currentAccountInvoicedTotal"),
          invoicedValue: formatLocaleAmount(invoiceTotal, locale, pdfCurrency),
          paidLabel: t("branch.currentAccountColPaid"),
          paidValue: formatLocaleAmount(cashTotal, locale, pdfCurrency),
          advanceLabel: t("branch.currentAccountColAdvance"),
          advanceValue: formatLocaleAmount(advanceTotalSum, locale, pdfCurrency),
          promoLabel: t("branch.currentAccountColPromo"),
          promoValue: formatLocaleAmount(promoTotalSum, locale, pdfCurrency),
          giftLabel: t("branch.currentAccountColGiftAmount"),
          giftValue: formatLocaleAmount(giftTotalSum, locale, pdfCurrency),
          promoCombinedValue: formatLocaleAmount(promoTotalSum + giftTotalSum, locale, pdfCurrency),
          openLabel: t("branch.currentAccountOpenTotal"),
          openValue: formatLocaleAmount(openTotal, locale, pdfCurrency),
        },
        fileName: buildPdfFileName(
          [
            t("reports.counterpartySummaryPdfTitle"),
            useInvoiceMode
              ? t("reports.counterpartySummaryExportPdfInvoice")
              : t("reports.counterpartySummaryExportPdfCounterparty"),
            // Spesifik şube seçiliyse adı, değilse "Tüm şubeler"
            Number.isFinite(selectedBranchNumericId) && selectedBranchNumericId > 0
              ? branchName
              : null,
            // Tarih aralığı varsa
            filters.issueDateFrom || filters.issueDateTo
              ? `${filters.issueDateFrom || "…"}_${filters.issueDateTo || "…"}`
              : null,
            // Üretim tarihi (yerel ISO)
            localIsoDate(),
          ],
          { fallback: "cari-hareket-ozeti" }
        ),
      });
    } catch (error) {
      setErrorText(toErrorMessage(error));
    } finally {
      setExportBusy(false);
    }
  }, [branches, filters, locale, reportItems, selectedBranchId, t]);

  return (
    <div className="min-w-0 w-full space-y-4 pb-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-zinc-900">{t("reports.counterpartySummaryTitle")}</h1>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{t("reports.counterpartySummarySubtitle")}</p>
        </div>
        <Link
          href="/products/order-account-statement"
          className="shrink-0 text-sm font-medium text-violet-700 underline decoration-violet-700/40 underline-offset-2 transition hover:decoration-violet-700 sm:pt-0.5 sm:text-right"
        >
          {t("reports.counterpartySummaryBackToStatement")}
        </Link>
      </div>

      {/* Tab switcher — Cariler / Tahsilatlar */}
      <div className="flex w-full gap-1 overflow-x-auto" role="tablist">
        {([
          { id: "summary" as const, label: t("reports.counterpartySummaryTabSummary") },
          { id: "receipts" as const, label: t("reports.counterpartySummaryTabReceipts") },
        ]).map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={activeTab === x.id}
            onClick={() => handleTabChange(x.id)}
            className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === x.id
                ? "bg-zinc-900 text-white shadow-sm shadow-zinc-900/25 ring-1 ring-zinc-800"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {activeTab === "receipts" ? (
        <AllReceiptsTab
          initialFilters={{
            counterpartyType: (filters.counterpartyType as "branch" | "customer" | "") || "",
            currencyCode: filters.currencyCode || "TRY",
          }}
          counterpartyOptions={counterpartyOptions}
        />
      ) : null}

      {activeTab !== "summary" ? null : (
      <>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 sm:p-4">
        {/* Mobil: 2 sıkı satır. Desktop (lg): tek satır geniş layout. */}
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-3">
          {/* Satır 1 — label (sadece desktop) ÜSTTE, altta combobox + funnel aynı baseline'da */}
          <div className="min-w-0 lg:max-w-md lg:flex-1">
            <label className="mb-0.5 hidden text-xs font-medium text-zinc-600 lg:block">
              {t("reports.counterpartySummaryBranchFilterLabel")}
            </label>
            <div className="flex min-w-0 items-center gap-1.5 lg:gap-2">
              <div className="min-w-0 flex-1">
                <RichCombobox
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  options={branchOptions}
                  placeholder={t("reports.counterpartySummaryBranchFilterPlaceholder")}
                  searchPlaceholder={t("reports.counterpartySummaryBranchFilterSearch")}
                  emptyText={t("reports.counterpartySummaryBranchFilterEmpty")}
                />
              </div>
              <Tooltip content={t("common.filters")} delayMs={200}>
                <button
                  type="button"
                  className="relative flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                  aria-label={t("common.filters")}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen(true)}
                >
                  <FilterFunnelIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                  {filtersActive ? (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Satır 2 — Fatura bazlı checkbox (sol) + iconlar (sağ).
              Mobilde tüm aksiyon butonları icon-only; desktop'ta metin ile birlikte. */}
          <div className="flex min-w-0 items-center justify-between gap-1.5 lg:justify-end lg:gap-2">
            <label className="inline-flex h-10 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] leading-tight text-zinc-700 lg:h-11 lg:gap-2 lg:rounded-xl lg:px-3 lg:text-xs">
              <Checkbox checked={showInvoiceRows} onCheckedChange={(v) => setShowInvoiceRows(v === true)} />
              <span className="whitespace-nowrap">Fatura bazlı</span>
            </label>
            <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
              <Tooltip content={t("branch.ledgerAddGeneralReceipt")} delayMs={200}>
                <Button
                  type="button"
                  variant="primary"
                  className="inline-flex h-10 w-10 min-h-0 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg p-0 lg:h-11 lg:w-auto lg:rounded-xl lg:px-3 lg:min-w-[9rem]"
                  onClick={() => setGeneralReceiptOpen(true)}
                  disabled={busy}
                  aria-label={t("branch.ledgerAddGeneralReceipt")}
                >
                  <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* Banknote — "tahsilat / para alma" */}
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  <span className="hidden lg:inline">{t("branch.ledgerAddGeneralReceipt")}</span>
                </Button>
              </Tooltip>
              {/* İki ayrı PDF butonu — kullanıcı mode'u seçer (UI checkbox'tan bağımsız) */}
              <Tooltip content={t("reports.counterpartySummaryExportPdfCounterparty")} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className="inline-flex h-10 w-10 min-h-0 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg p-0 lg:h-11 lg:w-auto lg:rounded-xl lg:px-3"
                  onClick={() => void downloadSummaryPdf("counterparty")}
                  disabled={busy || exportBusy}
                  aria-label={t("reports.counterpartySummaryExportPdfCounterparty")}
                >
                  <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* Users (cari/grup) ikonu + indir oku */}
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 11v6" />
                    <path d="m19 14 3 3 3-3" transform="translate(-3 0)" />
                  </svg>
                  <span className="hidden lg:inline">
                    {exportBusy ? t("common.loading") : t("reports.counterpartySummaryExportPdfCounterparty")}
                  </span>
                </Button>
              </Tooltip>
              <Tooltip content={t("reports.counterpartySummaryExportPdfInvoice")} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className="inline-flex h-10 w-10 min-h-0 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg p-0 lg:h-11 lg:w-auto lg:rounded-xl lg:px-3"
                  onClick={() => void downloadSummaryPdf("invoice")}
                  disabled={busy || exportBusy}
                  aria-label={t("reports.counterpartySummaryExportPdfInvoice")}
                >
                  <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* Fatura (file) ikonu + indir oku */}
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                  <span className="hidden lg:inline">
                    {exportBusy ? t("common.loading") : t("reports.counterpartySummaryExportPdfInvoice")}
                  </span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Para akışı hikayesi: ne kesildi → ne ile düşüldü (önceden alınan + sonra alınan + indirim) → kalan
          Sıra: Faturalanan → Ön ödeme → Tahsil edilen → Promosyon → Açık bakiye */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          title={t("reports.counterpartySummaryInvoicedTotal")}
          value={formatLocaleAmount(reportTotals.invoicedTotal, locale, filters.currencyCode || "TRY")}
        />
        <SummaryCard
          title={t("branch.currentAccountColAdvance")}
          value={formatLocaleAmount(reportTotals.advanceTotal ?? 0, locale, filters.currencyCode || "TRY")}
          valueClassName="text-sky-700"
        />
        <SummaryCard
          title={t("branch.currentAccountColPaid")}
          value={formatLocaleAmount(reportTotals.cashTotal ?? 0, locale, filters.currencyCode || "TRY")}
          valueClassName="text-emerald-700"
        />
        <SummaryCard
          title={t("branch.currentAccountColPromo")}
          value={formatLocaleAmount(
            (reportTotals.promoTotal ?? 0) + (reportTotals.giftTotal ?? 0),
            locale,
            filters.currencyCode || "TRY"
          )}
          valueClassName="text-violet-700"
          detail={
            (reportTotals.promoTotal ?? 0) > 0 || (reportTotals.giftTotal ?? 0) > 0
              ? `${t("branch.currentAccountColPromoMoney")}: ${formatLocaleAmount(
                  reportTotals.promoTotal ?? 0,
                  locale,
                  filters.currencyCode || "TRY"
                )} · ${t("branch.currentAccountColGiftAmount")}: ${formatLocaleAmount(
                  reportTotals.giftTotal ?? 0,
                  locale,
                  filters.currencyCode || "TRY"
                )}`
              : undefined
          }
        />
        <SummaryCard
          title={t("reports.counterpartySummaryOpenTotal")}
          value={formatLocaleAmount(reportTotals.openAmountTotal, locale, filters.currencyCode || "TRY")}
          valueClassName="text-amber-700"
          detail={`${t("reports.counterpartySummaryCounterpartyCount")}: ${reportTotals.counterpartyCount} · ${t(
            "reports.counterpartySummaryInvoiceCount"
          )}: ${reportTotals.invoiceCount}`}
        />
      </div>

      {errorText ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      {busy ? <p className="text-sm text-zinc-500">{t("reports.loading")}</p> : null}

      <div className="space-y-2 lg:hidden">
        {tableItems.map((row) => {
          const currency = row.currencyCode || "TRY";
          const open = Number(row.openAmount) || 0;
          const isOpen = isOpenBalance(open);
          // Backend canonical değerler — UI hesap yapmıyor
          const advance = Number(row.advanceTotal) || 0;
          const promoCombined = (Number(row.promoTotal) || 0) + (Number(row.giftTotal) || 0);
          const cash = Number(row.cashTotal) || 0;
          return (
            <div
              key={`${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}-${row.lastDocumentNumber ?? "summary"}`}
              className={`min-w-0 rounded-xl border bg-white p-2.5 shadow-sm ${
                showInvoiceRows
                  ? "border-zinc-200"
                  : isOpen
                    ? "border-amber-200"
                    : "border-emerald-200"
              }`}
            >
              {/* Üst satır: isim + tip · ref/tarih (sol) | açık bakiye (sağ) */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold leading-tight text-zinc-900">
                    {row.counterpartyType === "branch" ? "🏢 " : "👤 "}
                    {row.counterpartyName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {row.lastDocumentNumber || "—"}
                    {row.lastInvoiceDate ? ` · ${row.lastInvoiceDate}` : ""}
                  </p>
                </div>
                {/* Açık bakiye sağ üstte SADECE counterparty modunda — fatura modunda yanıltıcı
                    (genel ödemeler per-invoice düşülmediği için). */}
                {!showInvoiceRows ? (
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-base font-bold tabular-nums leading-tight ${
                        isOpen ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {formatLocaleAmount(open, locale, currency)}
                    </p>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        isOpen ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      {isOpen
                        ? t("reports.counterpartySummaryBalanceOpenBadge")
                        : t("reports.counterpartySummaryBalanceClosedBadge")}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Alt grid: 4 kompakt sütun — Faturalanan → Ön ödeme → Tahsil → Promosyon (üst kartlarla aynı sıra) */}
              <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-lg bg-zinc-50 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="text-[10px] leading-tight text-zinc-500">
                    {t("reports.counterpartySummaryColInvoiced")}
                  </p>
                  <p className="truncate text-xs font-semibold tabular-nums text-zinc-900">
                    {formatLocaleAmount(row.invoicedTotal, locale, currency)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] leading-tight text-zinc-500">{t("branch.currentAccountColAdvance")}</p>
                  <p className="truncate text-xs font-semibold tabular-nums text-sky-700">
                    {advance > 0 ? formatLocaleAmount(advance, locale, currency) : "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] leading-tight text-zinc-500">{t("branch.currentAccountColPaid")}</p>
                  <p className="truncate text-xs font-semibold tabular-nums text-emerald-700">
                    {formatLocaleAmount(cash, locale, currency)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] leading-tight text-zinc-500">{t("branch.currentAccountColPromo")}</p>
                  <p className="truncate text-xs font-semibold tabular-nums text-violet-700">
                    {promoCombined > 0 ? formatLocaleAmount(promoCombined, locale, currency) : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 min-h-0 min-w-0 p-0"
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
                  className="h-9 w-9 min-h-0 min-w-0 p-0"
                  aria-label={t("reports.counterpartySummaryPdfDownload")}
                  disabled={
                    row.counterpartyType !== "branch" ||
                    !row.lastDocumentNumber ||
                    pdfBusyKey === `${row.counterpartyType}-${row.counterpartyId}-${row.currencyCode}`
                  }
                  onClick={() => void openLastInvoicePdf(row)}
                >
                  <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 min-h-0 min-w-0 p-0 text-rose-600"
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
                  <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </Button>
              </div>
            </div>
          );
        })}
        {tableItems.length === 0 && !busy ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center text-sm text-zinc-500">
            {t("reports.counterpartySummaryEmpty")}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white lg:block">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColInvoiceRef")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColIssueDate")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColName")}</th>
              <th className="px-3 py-2 text-left">{t("reports.counterpartySummaryColType")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColInvoiced")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColAdvance")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPaid")}</th>
              <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColPromo")}</th>
              {/* "Açık" sadece counterparty modunda anlamlı — fatura modunda genel ödemeler
                  düşülmediği için per-invoice açık yanıltıcı olur. */}
              {!showInvoiceRows ? (
                <th className="px-3 py-2 text-right">{t("reports.counterpartySummaryColOpen")}</th>
              ) : null}
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
                <td className="px-3 py-2 text-right tabular-nums text-sky-700">
                  {(Number(row.advanceTotal) || 0) > 0
                    ? formatLocaleAmount(Number(row.advanceTotal) || 0, locale, row.currencyCode || "TRY")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                  {formatLocaleAmount(Number(row.cashTotal) || 0, locale, row.currencyCode || "TRY")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-violet-700">
                  {(() => {
                    const promo = Number(row.promoTotal) || 0;
                    const gift = Number(row.giftTotal) || 0;
                    const total = promo + gift;
                    if (total <= 0) return "—";
                    return (
                      <div>
                        <div className="font-semibold">
                          {formatLocaleAmount(total, locale, row.currencyCode || "TRY")}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-tight font-normal text-zinc-500">
                          {t("branch.currentAccountColPromoMoney")}:{" "}
                          {formatLocaleAmount(promo, locale, row.currencyCode || "TRY")}
                          <br />
                          {t("branch.currentAccountColGiftAmount")}:{" "}
                          {formatLocaleAmount(gift, locale, row.currencyCode || "TRY")}
                        </div>
                      </div>
                    );
                  })()}
                </td>
                {!showInvoiceRows ? (
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
                ) : null}
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
      </>
      )}

      <GeneralReceiptModal
        open={generalReceiptOpen}
        onClose={() => setGeneralReceiptOpen(false)}
        counterparty={{ mode: "selectable", options: counterpartyOptions }}
        locale={locale}
        t={t}
        onSaved={() => load(filters)}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  valueClassName,
}: {
  title: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">{title}</p>
      <p className={`mt-1 break-words text-base font-semibold tabular-nums sm:text-lg ${valueClassName ?? "text-zinc-900"}`}>
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-[10px] leading-tight text-zinc-500">{detail}</p> : null}
    </div>
  );
}
