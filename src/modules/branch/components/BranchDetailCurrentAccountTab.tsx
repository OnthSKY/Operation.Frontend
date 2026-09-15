"use client";

import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import {
  fetchOutboundInvoice,
  fetchOutboundInvoices,
  fetchOutboundInvoiceReceipts,
  type OutboundInvoiceReceiptResponse,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { fetchCustomerAccountBalance } from "@/modules/order-account-statement/api/customer-accounts-api";
import { GeneralReceiptModal } from "@/modules/order-account-statement/components/GeneralReceiptModal";
import { computePriorOpenBalanceForInvoice } from "@/modules/order-account-statement/lib/compute-prior-open-balance-for-invoice";
import {
  reconcileBranchCurrentAccount,
  type ReconIssue,
} from "@/modules/order-account-statement/lib/reconcile-current-account";
import {
  isOrderAccountStatementPdfNote,
  parseOrderAccountDocumentMetadata,
} from "@/modules/order-account-statement/lib/parse-order-account-document-metadata";
import { regenerateSavedOrderAccountPdfBlob } from "@/modules/order-account-statement/lib/regenerate-saved-order-account-pdf";
import {
  companyBrandingLogoUrl,
  fetchSystemBranding,
} from "@/modules/admin/api/system-branding-api";
import {
  buildCounterpartyInvoiceStylePdfBlob,
  downloadCounterpartyInvoiceStylePdf,
} from "@/modules/order-account-statement/lib/download-counterparty-invoice-style-pdf";
import { useBranchDocuments } from "@/modules/branch/hooks/useBranchQueries";
import { BranchCurrentAccountReceiptsPanel } from "./BranchCurrentAccountReceiptsPanel";
import { useBranchUninvoicedShipments } from "@/modules/branch/hooks/useBranchUninvoicedShipments";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { apiFetch } from "@/shared/api/client";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { buildPdfFileName } from "@/shared/lib/pdf-file-name";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Modal } from "@/shared/ui/Modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Download, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  branchId: number;
  active: boolean;
};

type CurrentAccountPdfOptions = {
  showLogo: boolean;
  showCompanyName: boolean;
  showIban: boolean;
  /** Tahsilatları tarih-tarih ayrı bir listede göster (genel havuz dahil). */
  showReceipts: boolean;
  iban: string;
  accountHolder: string;
  bankName: string;
  note: string;
};

function parseInvoiceIdFromNote(note: string | null | undefined): number | null {
  const raw = String(note ?? "");
  if (!raw) return null;
  const m = raw.match(/(?:^|[;,\s])invoiceId=(\d+)(?:$|[;,\s])/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Eski akışta kaydedilmiş türetilmiş (v2) PDF belgesi mi? Artık v2 kaydedilmiyor; bu kontrol
 *  yalnızca eski kayıtlı v2'leri v1 (orijinal) listesinden dışlamak için tutuluyor. */
function isOrderAccountPdfV2Note(note: string | null | undefined): boolean {
  return /(?:^|[;,\s·])version=v2(?:$|[;,\s·])/i.test(String(note ?? ""));
}

type CurrentAccountSubTabId = "invoices" | "receipts";

export function BranchDetailCurrentAccountTab({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const [subTab, setSubTab] = useState<CurrentAccountSubTabId>("invoices");
  const [pdfOpeningId, setPdfOpeningId] = useState<number | null>(null);
  const [pdfChoice, setPdfChoice] = useState<{ invoiceId: number; mode: "view" | "download" } | null>(null);
  // İndirme/görüntüleme sürümü: "v1" = faturalandırma PDF'i (orijinal), "v2" = tahsilatlı sürüm.
  const [pdfChoiceVariant, setPdfChoiceVariant] = useState<"v1" | "v2">("v1");
  const [transferOpeningId, setTransferOpeningId] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generalReceiptOpen, setGeneralReceiptOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<CurrentAccountPdfOptions>({
    showLogo: true,
    showCompanyName: true,
    showIban: false,
    showReceipts: false,
    iban: "",
    accountHolder: "",
    bankName: "",
    note: "",
  });
  const [selectedPdfInvoiceIds, setSelectedPdfInvoiceIds] = useState<Set<number>>(new Set());
  const [receiptPromoByInvoiceId, setReceiptPromoByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const [receiptAdvanceByInvoiceId, setReceiptAdvanceByInvoiceId] = useState<Map<number, number>>(() => new Map());

  const invoicesQuery = useQuery({
    queryKey: ["branchCurrentAccountInvoices", branchId],
    queryFn: fetchOutboundInvoices,
    enabled: active && branchId > 0,
  });

  // Genel ödemeler (NULL-link customer_account_receipts) için bakiye query'si.
  // Tahsilatlar tab ile aynı queryKey → modal'ın invalidate'i her ikisini de tetikler.
  const balanceQuery = useQuery({
    queryKey: ["customerAccountBalance", "branch", branchId],
    queryFn: () => fetchCustomerAccountBalance("branch", branchId),
    enabled: active && branchId > 0,
  });
  const docsQuery = useBranchDocuments(branchId, active);
  const { summary: uninvoicedSummary } = useBranchUninvoicedShipments(branchId, active);
  const [uninvoicedOpen, setUninvoicedOpen] = useState(false);
  const [reconOpen, setReconOpen] = useState(false);
  const router = useRouter();

  // Faturasız sevkiyat satırlarını gerçek sevkiyat (movement_batch_id) bazında grupla:
  // her sevkiyat = bir fatura adayı. Batch yoksa hareket id'sine düşülür.
  const uninvoicedShipments = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        warehouseId: number | null;
        warehouseName: string | null;
        movementDate: string;
        movementIds: number[];
        lines: typeof uninvoicedSummary.lines;
      }
    >();
    for (const l of uninvoicedSummary.lines) {
      const key = l.movementBatchId ?? `wm-${l.warehouseMovementId}`;
      const prev = map.get(key);
      if (prev) {
        prev.movementIds.push(l.warehouseMovementId);
        prev.lines.push(l);
        // En erken sevkiyat tarihini koru (aynı batch normalde tek tarih).
        if (l.movementDate < prev.movementDate) prev.movementDate = l.movementDate;
      } else {
        map.set(key, {
          key,
          warehouseId: l.warehouseId ?? null,
          warehouseName: l.warehouseName ?? null,
          movementDate: l.movementDate,
          movementIds: [l.warehouseMovementId],
          lines: [l],
        });
      }
    }
    return Array.from(map.values());
  }, [uninvoicedSummary.lines]);

  // Mevcut "sevkiyattan faturala" akışını yeniden kullan: OAS sayfasına aynı query paramlarıyla
  // yönlendir — sayfa sevkiyatı çekip ana ürünlere birleştirip fiyatlandırıyor.
  const openInvoiceDraftForShipment = useCallback(
    (shipment: (typeof uninvoicedShipments)[number]) => {
      const warehouseId = shipment.warehouseId;
      const primaryMovementId = shipment.movementIds[0];
      if (!warehouseId || warehouseId <= 0 || !primaryMovementId) {
        notify.error(t("branch.uninvoicedShipmentInvoiceMissingWarehouse"));
        return;
      }
      const params = new URLSearchParams({
        shipmentWarehouseId: String(warehouseId),
        shipmentMovementId: String(primaryMovementId),
        invoiceDraft: "1",
      });
      const ids = Array.from(new Set(shipment.movementIds.filter((n) => n > 0)));
      if (ids.length > 1) params.set("shipmentMovementIds", ids.join(","));
      router.push(`/products/order-account-statement?${params.toString()}`);
    },
    [router, t]
  );

  const rows = useMemo(
    () =>
      (invoicesQuery.data ?? []).filter(
        (x) => x.counterpartyType === "branch" && x.counterpartyId === branchId
      ),
    [invoicesQuery.data, branchId]
  );

  // Orijinal (faturalandırma) PDF'i — türetilmiş v2 belgeleri hariç tutulur.
  const pdfDocByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    for (const doc of docsQuery.data ?? []) {
      if (doc.contentType !== "application/pdf") continue;
      if (isOrderAccountPdfV2Note(doc.notes)) continue;
      const invoiceId = parseInvoiceIdFromNote(doc.notes);
      if (invoiceId == null || map.has(invoiceId)) continue;
      map.set(invoiceId, doc.id);
    }
    return map;
  }, [docsQuery.data]);

  const transferDocByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    const docs = docsQuery.data ?? [];
    const sorted = [...docs].sort((a, b) => {
      const aTs = Date.parse(a.createdAt ?? "") || 0;
      const bTs = Date.parse(b.createdAt ?? "") || 0;
      return bTs - aTs;
    });
    for (const doc of sorted) {
      if (!doc.contentType.startsWith("image/")) continue;
      const invoiceId = parseInvoiceIdFromNote(doc.notes);
      if (invoiceId == null || map.has(invoiceId)) continue;
      map.set(invoiceId, doc.id);
    }
    return map;
  }, [docsQuery.data]);


  const parseNoteAmount = useCallback((note: string | null | undefined, key: string): number => {
    const raw = String(note ?? "");
    const m = raw.match(new RegExp(`(?:^|[;,\\s·])${key}=([0-9]+(?:\\.[0-9]+)?)`, "i"));
    if (!m) return 0;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const isPromoOrDiscountReceipt = useCallback((receipt: OutboundInvoiceReceiptResponse): boolean => {
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

  const promoDeductionByInvoiceId = useMemo(
    () =>
      new Map(
        rows.map((invoice) => {
          const promoAmount =
            Number.isFinite(Number(invoice.promoAmount)) && Number(invoice.promoAmount) > 0
              ? Number(invoice.promoAmount)
              : parseNoteAmount(invoice.notes, "promoAmount");
          return [invoice.id, promoAmount] as const;
        })
      ),
    [parseNoteAmount, rows]
  );

  const advanceDeductionByInvoiceId = useMemo(
    () =>
      new Map(
        rows.map((invoice) => {
          const advanceAmount =
            Number.isFinite(Number(invoice.advanceAmount)) && Number(invoice.advanceAmount) > 0
              ? Number(invoice.advanceAmount)
              : parseNoteAmount(invoice.notes, "advanceAmount");
          return [invoice.id, advanceAmount] as const;
        })
      ),
    [parseNoteAmount, rows]
  );

  const giftByInvoiceId = useMemo(
    () =>
      new Map(
        rows.map((invoice) => {
          const giftAmount =
            Number.isFinite(Number(invoice.giftAmount)) && Number(invoice.giftAmount) > 0
              ? Number(invoice.giftAmount)
              : parseNoteAmount(invoice.notes, "giftAmount");
          return [invoice.id, giftAmount] as const;
        })
      ),
    [parseNoteAmount, rows]
  );

  // Toplamlar backend canonical: fetchCustomerAccountBalance kırılımı döner.
  // UI'da hesap YOK — tek source of truth backend.
  const totals = useMemo(() => {
    const b = balanceQuery.data;
    if (!b) {
      return { invoiced: 0, cash: 0, promo: 0, advance: 0, gift: 0, open: 0 };
    }
    return {
      invoiced: Number(b.totalCharged) || 0,
      cash: Number(b.cashTotal) || 0,
      promo: Number(b.promoTotal) || 0,
      advance: Number(b.advanceTotal) || 0,
      gift: Number(b.giftTotal) || 0,
      open: Math.max(0, Number(b.openBalance) || 0),
    };
  }, [balanceQuery.data]);

  // Anlık mutabakat: faturalar (invoicesQuery) ile hesap bakiyesi/tahsilatlar (balanceQuery)
  // BAĞIMSIZ kaynaklar olarak çapraz kontrol edilir; indirim/promo/avans/tahsilat sonucu doğru mu?
  const reconciliation = useMemo(
    () => reconcileBranchCurrentAccount(rows, balanceQuery.data),
    [rows, balanceQuery.data]
  );
  const reconCcy = balanceQuery.data?.currencyCode ?? "TRY";
  const formatReconIssue = useCallback(
    (issue: ReconIssue): string => {
      const p = issue.params;
      const money = (k: string) => formatLocaleAmount(Number(p[k] ?? 0), locale, reconCcy);
      let s = t(`branch.currentAccountRecon${issue.code}`);
      if (p.doc != null) s = s.replace("{doc}", String(p.doc));
      if (p.stored != null) s = s.replace("{stored}", money("stored"));
      if (p.computed != null) s = s.replace("{computed}", money("computed"));
      if (p.amount != null) s = s.replace("{amount}", money("amount"));
      return s;
    },
    [locale, reconCcy, t]
  );

  useEffect(() => {
    let alive = true;
    const unresolved = rows.filter((invoice) => {
      const promo = promoDeductionByInvoiceId.get(invoice.id) ?? 0;
      const advance = advanceDeductionByInvoiceId.get(invoice.id) ?? 0;
      return promo <= 0.009 && advance <= 0.009 && (Number(invoice.paidTotal) || 0) > 0.009;
    });
    if (!active || unresolved.length === 0) {
      setReceiptPromoByInvoiceId(new Map());
      setReceiptAdvanceByInvoiceId(new Map());
      return;
    }
    void (async () => {
      const promoMap = new Map<number, number>();
      const advanceMap = new Map<number, number>();
      try {
        const concurrency = 6;
        for (let i = 0; i < unresolved.length; i += concurrency) {
          const chunk = unresolved.slice(i, i + concurrency);
          const results = await Promise.all(
            chunk.map(async (invoice) => {
              const receipts = await fetchOutboundInvoiceReceipts(invoice.id);
              const promo = receipts.reduce((sum, receipt) => {
                if (!isPromoOrDiscountReceipt(receipt)) return sum;
                return sum + Math.max(0, Number(receipt.amount) || 0);
              }, 0);
              const advance = receipts.reduce((sum, receipt) => {
                if (!isAdvanceReceipt(receipt)) return sum;
                return sum + Math.max(0, Number(receipt.amount) || 0);
              }, 0);
              return [invoice.id, { promo, advance }] as const;
            })
          );
          for (const [invoiceId, x] of results) {
            promoMap.set(invoiceId, x.promo);
            advanceMap.set(invoiceId, x.advance);
          }
        }
        if (!alive) return;
        setReceiptPromoByInvoiceId(promoMap);
        setReceiptAdvanceByInvoiceId(advanceMap);
      } catch {
        if (!alive) return;
        setReceiptPromoByInvoiceId(new Map());
        setReceiptAdvanceByInvoiceId(new Map());
      }
    })();
    return () => {
      alive = false;
    };
  }, [active, advanceDeductionByInvoiceId, isAdvanceReceipt, isPromoOrDiscountReceipt, promoDeductionByInvoiceId, rows]);

  const orderAccountPdfLabels = useMemo(
    () => ({
      headerCompany: t("reports.orderAccountStatementHeaderCompany"),
      headerBranch: t("reports.orderAccountStatementHeaderBranch"),
      documentTagline: t("reports.orderAccountStatementDocumentTagline"),
      issuedPrefix: t("reports.orderAccountStatementIssuedPrefix"),
      productCol: t("reports.orderAccountStatementColProduct"),
      qtyCol: t("reports.orderAccountStatementColQty"),
      unitCol: t("reports.orderAccountStatementUnit"),
      unitPriceCol: t("reports.orderAccountStatementUnitPrice"),
      amountCol: t("reports.orderAccountStatementColAmount"),
      gross: t("reports.orderAccountStatementGross"),
      giftTotal: t("reports.orderAccountStatementGiftTotalLine"),
      advance: t("reports.orderAccountStatementAdvanceLine"),
      subtotal: t("reports.orderAccountStatementSubtotal"),
      previousBalance: t("reports.orderAccountStatementPreviousBalanceLine"),
      net: t("reports.orderAccountStatementNet"),
      giftSuffix: t("reports.orderAccountStatementGiftSuffix"),
      paidSection: t("reports.orderAccountStatementPaidSectionPdf"),
      promoLineFallback: t("reports.orderAccountStatementPromoLineFallback"),
      emptyHint: t("reports.orderAccountStatementPreviewEmpty"),
      paymentSection: "Ödeme bilgileri",
      paymentIban: t("reports.orderAccountStatementPaymentIban"),
      paymentAccountHolder: t("reports.orderAccountStatementPaymentAccountHolder"),
      paymentBankName: t("reports.orderAccountStatementPaymentBankName"),
      paymentNote: t("reports.orderAccountStatementPaymentNote"),
    }),
    [t]
  );

  const receiptKindLabel = useCallback(
    (kind?: string) => {
      switch (kind) {
        case "promo_discount":
          return t("branch.currentAccountReceiptKindPromo");
        case "advance_payment":
          return t("branch.currentAccountReceiptKindAdvance");
        case "other":
          return t("branch.currentAccountReceiptKindOther");
        default:
          return t("branch.currentAccountReceiptKindCash");
      }
    },
    [t]
  );

  const openPdf = async (
    invoiceId: number,
    mode: "view" | "download",
    opts?: { variant?: "v1" | "v2" }
  ) => {
    const documentId = pdfDocByInvoiceId.get(invoiceId);
    if (!documentId) return;
    const variant = opts?.variant ?? "v1";
    const listInvoice = rows.find((r) => r.id === invoiceId);
    const doc = (docsQuery.data ?? []).find((d) => d.id === documentId);
    setPdfOpeningId(invoiceId);
    // Görüntüle: sekmeyi tıklama hareketi (gesture) içinde, await'lerden önce aç —
    // aksi halde PDF üretiminden sonraki window.open popup engelleyiciye takılıp açılmıyor.
    const viewWindow = mode === "view" ? window.open("", "_blank") : null;
    try {
      let blob: Blob | null = null;

      // v2 (tahsilatlı): her açılışta CANLI üretilir — belge olarak kaydedilmez. Böylece bayatlama
      // (receiptSig) ve çift-kaynak sınıfı ortadan kalkar; sayılar her zaman günceldir.
      // Promo/avans genelde tahsilat olarak tutulduğundan invoice alanlarına GÜVENİLMEZ; gerçek
      // değerler tablo satırıyla aynı biçimde hesaplanıp gövdede AÇIKÇA indirim olarak düşülür.
      if (variant === "v2" && listInvoice && doc && isOrderAccountStatementPdfNote(doc.notes)) {
        try {
          const detail = await fetchOutboundInvoice(invoiceId);
          if ((detail.lines ?? []).length > 0) {
            // Tahsilatları türe göre ayır: promo/avans gövdede indirim satırı olur; yalnızca NAKİT
            // tahsilatlar "Tahsilatlar" listesinde listelenir (promo/avans hem gövdede hem listede
            // çıkarsa çift sayılırdı).
            let cashReceiptLines: { id: string; description: string; amount: number }[] = [];
            let promoFromReceipts = 0;
            let advanceFromReceipts = 0;
            try {
              const receipts = await fetchOutboundInvoiceReceipts(invoiceId);
              for (const r of receipts) {
                const amount = Number(r.amount) || 0;
                if (amount <= 0.009) continue;
                if (isPromoOrDiscountReceipt(r)) {
                  promoFromReceipts += amount;
                } else if (isAdvanceReceipt(r)) {
                  advanceFromReceipts += amount;
                } else {
                  cashReceiptLines.push({
                    id: `receipt-${r.id}`,
                    description: `${formatLocaleDate(r.receiptDate, locale)} · ${receiptKindLabel(r.receiptKind)}`,
                    amount,
                  });
                }
              }
            } catch {
              cashReceiptLines = [];
            }
            // Tablo satırıyla birebir: fatura alanı VEYA receipt toplamı — hangisi büyükse.
            const effectivePromo = Math.max(
              promoDeductionByInvoiceId.get(invoiceId) ?? 0,
              promoFromReceipts
            );
            const effectiveAdvance = Math.max(
              advanceDeductionByInvoiceId.get(invoiceId) ?? 0,
              advanceFromReceipts
            );
            const effectiveGift = giftByInvoiceId.get(invoiceId) ?? 0;

            const meta = parseOrderAccountDocumentMetadata(doc.notes);
            const priorOpen = computePriorOpenBalanceForInvoice(rows, listInvoice);
            let emblemDataUrl: string | undefined;
            try {
              const branding = await fetchSystemBranding();
              const logoRes = await apiFetch(companyBrandingLogoUrl(branding.updatedAtUtc));
              if (logoRes.ok) {
                const logoBlob = await logoRes.blob();
                emblemDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result ?? ""));
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(logoBlob);
                });
              }
            } catch {
              /* optional emblem */
            }
            blob = await regenerateSavedOrderAccountPdfBlob({
              locale,
              companyName: meta.company || detail.counterpartyName || "—",
              branchName: meta.branch || detail.counterpartyName || "—",
              documentTitle: meta.title || t("reports.orderAccountStatementDocTitle"),
              emblemDataUrl,
              orderDocumentKey: meta.orderKey || meta.pdfDocumentNo || `invoice-${invoiceId}`,
              systemDocumentId: documentId,
              invoice: detail,
              giftAmountOverride: effectiveGift,
              promoAmountOverride: effectivePromo,
              advanceAmountOverride: effectiveAdvance,
              priorOpenBalance: priorOpen,
              includePriorBalance: true,
              showReceipts: true,
              receipts: cashReceiptLines,
              receiptsLabel: t("branch.currentAccountPdfReceiptsSection"),
              remainingLabel: t("branch.currentAccountPdfRemaining"),
              labels: orderAccountPdfLabels,
            });
          }
        } catch {
          blob = null;
        }
      }

      // v1 (orijinal faturalandırma PDF'i) veya v2 üretilemediyse: kayıtlı belgeyi olduğu gibi indir/aç.
      if (!blob) {
        const stored = await fetchBranchDocumentBlob(branchId, documentId);
        blob = stored.blob;
      }

      // Düzgün dosya adı: «Şube ismi - Sevkiyat - Belge no - [v2] - Tarih.pdf» (id/«invoice-» kullanılmaz).
      const fileName = buildPdfFileName(
        [
          listInvoice?.counterpartyName,
          t("branch.currentAccountPdfFileShipmentLabel"),
          listInvoice?.documentNumber,
          variant === "v2" ? "v2" : undefined,
          listInvoice?.issueDate,
        ],
        { fallback: t("branch.currentAccountPdfFileShipmentLabel") }
      );
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        if (viewWindow && !viewWindow.closed) {
          viewWindow.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.rel = "noopener";
        // Bazı tarayıcılar (Firefox vb.) yalnızca DOM'a bağlı anchor'da indirmeyi tetikler.
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 1_500);
    } catch (e) {
      if (viewWindow && !viewWindow.closed) viewWindow.close();
      notify.error(toErrorMessage(e));
    } finally {
      setPdfOpeningId(null);
    }
  };

  const isRegenerableStatement = useCallback(
    (invoiceId: number) => {
      const documentId = pdfDocByInvoiceId.get(invoiceId);
      if (!documentId) return false;
      const doc = (docsQuery.data ?? []).find((d) => d.id === documentId);
      return Boolean(doc && isOrderAccountStatementPdfNote(doc.notes));
    },
    [docsQuery.data, pdfDocByInvoiceId]
  );

  /** Görüntüle/İndir: yeniden üretilebilir sevkiyat belgesiyse sürüm seçim penceresini aç
   *  (v1 orijinal / v2 tahsilatlı); değilse (kayıtlı ham PDF) doğrudan indir/aç. */
  const requestPdf = (invoiceId: number, mode: "view" | "download") => {
    if (isRegenerableStatement(invoiceId)) {
      setPdfChoiceVariant("v1"); // varsayılan: faturalandırma PDF'i (orijinal)
      setPdfChoice({ invoiceId, mode });
    } else {
      void openPdf(invoiceId, mode);
    }
  };


  const buildCurrentAccountPdfPayload = async () => {
    const selectedRows = rows.filter((r) => selectedPdfInvoiceIds.has(r.id));
    if (selectedRows.length === 0) {
      throw new Error(t("branch.currentAccountPdfNoSelection"));
    }
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

    const pdfRows = await Promise.all(
      selectedRows.map(async (invoice) => {
        const receipts = await fetchOutboundInvoiceReceipts(invoice.id);
        const paymentDate = receipts.length > 0 ? receipts[0]?.receiptDate ?? null : null;
        const promo = Math.max(
          promoDeductionByInvoiceId.get(invoice.id) ?? 0,
          receiptPromoByInvoiceId.get(invoice.id) ?? 0
        );
        const advance = Math.max(
          advanceDeductionByInvoiceId.get(invoice.id) ?? 0,
          receiptAdvanceByInvoiceId.get(invoice.id) ?? 0
        );
        const gift = giftByInvoiceId.get(invoice.id) ?? 0;
        const cashPaid = Math.max(0, (Number(invoice.paidTotal) || 0) - promo - advance);
        return {
          counterpartyName: invoice.counterpartyName,
          counterpartyTypeLabel: t("reports.counterpartySummaryTypeBranch"),
          documentNumber: invoice.documentNumber,
          issueDate: formatLocaleDate(invoice.issueDate, locale),
          shipmentDate: invoice.shipmentDate ? formatLocaleDate(invoice.shipmentDate, locale) : "—",
          invoiceAmount: formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode),
          paidAmount: formatLocaleAmount(cashPaid, locale, invoice.currencyCode),
          advanceAmount:
            advance > 0 ? formatLocaleAmount(advance, locale, invoice.currencyCode) : "—",
          promoAmount: promo > 0 ? formatLocaleAmount(promo, locale, invoice.currencyCode) : "—",
          giftAmount: gift > 0 ? formatLocaleAmount(gift, locale, invoice.currencyCode) : "—",
          promoCombinedAmount:
            promo + gift > 0
              ? formatLocaleAmount(promo + gift, locale, invoice.currencyCode)
              : "—",
          openAmount: formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode),
          paymentDate: paymentDate ? formatLocaleDate(paymentDate, locale) : "—",
        };
      })
    );

    const selectedTotals = selectedRows.reduce(
      (acc, row) => {
        acc.invoiced += Number(row.linesTotal) || 0;
        const promo = Math.max(
          promoDeductionByInvoiceId.get(row.id) ?? 0,
          receiptPromoByInvoiceId.get(row.id) ?? 0
        );
        const advance = Math.max(
          advanceDeductionByInvoiceId.get(row.id) ?? 0,
          receiptAdvanceByInvoiceId.get(row.id) ?? 0
        );
        const gift = giftByInvoiceId.get(row.id) ?? 0;
        const cashPaid = Math.max(0, (Number(row.paidTotal) || 0) - promo - advance);
        acc.paid += cashPaid;
        acc.advance += advance;
        acc.promo += promo;
        acc.gift += gift;
        return acc;
      },
      { invoiced: 0, paid: 0, advance: 0, promo: 0, gift: 0 }
    );

    // Genel ödemeleri (NULL-link customer_account_receipts) de footer toplamlarına ekle.
    for (const r of balanceQuery.data?.receipts ?? []) {
      if (r.linkedOutboundInvoiceId != null) continue;
      const amt = Number(r.amount) || 0;
      switch (r.receiptKind) {
        case "advance_payment":
          selectedTotals.advance += amt;
          break;
        case "promo_discount":
          selectedTotals.promo += amt;
          break;
        default:
          selectedTotals.paid += amt;
      }
    }
    const computedOpen = Math.max(
      0,
      selectedTotals.invoiced - selectedTotals.paid - selectedTotals.promo - selectedTotals.advance
    );

    const footerTotals = {
      invoicedLabel: t("branch.currentAccountInvoicedTotal"),
      invoicedValue: formatLocaleAmount(selectedTotals.invoiced, locale, "TRY"),
      paidLabel: t("branch.currentAccountColPaid"),
      paidValue: formatLocaleAmount(selectedTotals.paid, locale, "TRY"),
      advanceLabel: t("branch.currentAccountColAdvance"),
      advanceValue: formatLocaleAmount(selectedTotals.advance, locale, "TRY"),
      promoLabel: t("branch.currentAccountColPromo"),
      promoValue: formatLocaleAmount(selectedTotals.promo, locale, "TRY"),
      giftLabel: t("branch.currentAccountColGiftAmount"),
      giftValue: formatLocaleAmount(selectedTotals.gift, locale, "TRY"),
      promoCombinedValue: formatLocaleAmount(
        selectedTotals.promo + selectedTotals.gift,
        locale,
        "TRY"
      ),
      openLabel: t("branch.currentAccountOpenTotal"),
      openValue: formatLocaleAmount(computedOpen, locale, "TRY"),
    };

    return {
      pdfRows,
      meta: {
        companyName,
        branchName: selectedRows[0]?.counterpartyName?.trim() || `#${branchId}`,
        logoDataUrl,
        title: t("branch.currentAccountPdfDocumentTitle"),
        issuedAtLabel: `${t("branch.currentAccountPdfGeneratedAt")}: ${new Date().toLocaleDateString(locale)}`,
        filtersLabel: `${t("branch.currentAccountPdfScope")}: ${t("branch.currentAccountPdfScopeBranchOnly")}`,
        totalsLabel: `${t("branch.currentAccountPdfTotals")}: ${footerTotals.invoicedValue} / ${footerTotals.paidValue} / ${footerTotals.openValue}`.trim(),
        fileName: buildPdfFileName(
          [
            selectedRows[0]?.counterpartyName,
            t("branch.currentAccountPdfFileAccountLabel"),
            localIsoDate(),
          ],
          { fallback: t("branch.currentAccountPdfFileAccountLabel") }
        ),
        showLogo: pdfOptions.showLogo,
        showCompanyName: pdfOptions.showCompanyName,
        // Şube cari: tahsilat artık genel havuz → per-satır "Tahsil Edilen" ve "Ödeme Tarihi" kolonları gizli.
        hidePaidColumn: true,
        hidePaymentDateColumn: true,
        // "Sipariş Tarihi" yanıltıcıydı (aslında fatura kesim tarihi) → "Fatura Tarihi" + ayrı "Sevkiyat Tarihi".
        dateHeaderLabel: "Fatura Tarihi",
        showShipmentDateColumn: true,
        // İsteğe bağlı: tüm tahsilatları (genel havuz dahil) tarih-tarih listele.
        receiptsList: pdfOptions.showReceipts
          ? {
              title: t("branch.currentAccountPdfReceiptsSection"),
              rows: [...(balanceQuery.data?.receipts ?? [])]
                .filter((r) => (Number(r.amount) || 0) > 0.009 && (!r.currencyCode || r.currencyCode === "TRY"))
                .sort((a, b) => String(a.receiptDate).localeCompare(String(b.receiptDate)))
                .map((r) => ({
                  date: formatLocaleDate(r.receiptDate, locale),
                  amount: formatLocaleAmount(Number(r.amount) || 0, locale, r.currencyCode || "TRY"),
                  kindLabel: receiptKindLabel(r.receiptKind),
                })),
            }
          : undefined,
        footerTotals,
        paymentInfo: pdfOptions.showIban
          ? {
              iban: pdfOptions.iban,
              accountHolder: pdfOptions.accountHolder,
              bankName: pdfOptions.bankName,
              note: pdfOptions.note,
            }
          : undefined,
      },
    };
  };

  const exportCurrentAccountPdf = async () => {
    if (rows.length === 0) return;
    setExportingPdf(true);
    try {
      const { pdfRows, meta } = await buildCurrentAccountPdfPayload();
      await downloadCounterpartyInvoiceStylePdf(pdfRows, meta);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setExportingPdf(false);
    }
  };

  const previewCurrentAccountPdf = async () => {
    if (rows.length === 0) return;
    if (selectedPdfInvoiceIds.size === 0) {
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      return;
    }
    setPdfPreviewLoading(true);
    try {
      const { pdfRows, meta } = await buildCurrentAccountPdfPayload();
      const blob = await buildCounterpartyInvoiceStylePdfBlob(pdfRows, meta);
      const nextUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  const allPdfRowsSelected =
    rows.length > 0 && rows.every((row) => selectedPdfInvoiceIds.has(row.id));

  useEffect(() => {
    if (!pdfModalOpen) return;
    const timer = window.setTimeout(() => {
      void previewCurrentAccountPdf();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pdfModalOpen, pdfOptions, selectedPdfInvoiceIds, rows]);

  const openTransferImage = async (invoiceId: number, mode: "view" | "download") => {
    const documentId = transferDocByInvoiceId.get(invoiceId);
    if (!documentId) return;
    setTransferOpeningId(invoiceId);
    try {
      const { blob, contentType } = await fetchBranchDocumentBlob(branchId, documentId);
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        const ext =
          contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : "jpg";
        a.download = `receipt-transfer-${invoiceId}.${ext}`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 1_500);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setTransferOpeningId(null);
    }
  };

  const isLoading = invoicesQuery.isPending || docsQuery.isPending;
  const isError = invoicesQuery.isError || docsQuery.isError;
  const errorText = invoicesQuery.isError
    ? toErrorMessage(invoicesQuery.error)
    : docsQuery.isError
      ? toErrorMessage(docsQuery.error)
      : null;

  const renderPdfIconButton = (opts: {
    hasPdf: boolean;
    action: "view" | "download";
    invoiceId: number;
    compact?: boolean;
  }) => {
    const { hasPdf, action, invoiceId, compact } = opts;
    const loading = pdfOpeningId === invoiceId;
    const baseClass = compact
      ? "min-h-[44px] h-11 w-11 min-w-0 p-0"
      : "min-h-[44px] h-11 w-11 min-w-0 p-0";
    const labelKey =
      action === "view" ? "branch.currentAccountPdfView" : "branch.currentAccountPdfDownload";
    const Icon = !hasPdf ? CircleOff : action === "view" ? Eye : Download;
    return (
      <Button
        type="button"
        variant="secondary"
        className={baseClass}
        title={!hasPdf ? t("branch.currentAccountPdfMissing") : t(labelKey)}
        aria-label={!hasPdf ? t("branch.currentAccountPdfMissing") : t(labelKey)}
        disabled={!hasPdf || loading}
        onClick={() => {
          if (!hasPdf) return;
          requestPdf(invoiceId, action);
        }}
      >
        {loading ? (
          <span className="text-[10px] font-medium">{t("common.loading")}</span>
        ) : (
          <Icon className="h-4 w-4" aria-hidden />
        )}
      </Button>
    );
  };

  const subTabs: { id: CurrentAccountSubTabId; label: string }[] = [
    { id: "invoices", label: t("branch.currentAccountSubTabInvoices") },
    { id: "receipts", label: t("branch.currentAccountSubTabReceipts") },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div
          role="tablist"
          aria-label={t("branch.currentAccountSubTabsAria")}
          className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {subTabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={subTab === x.id}
              className={cn(
                "min-h-[44px] shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                subTab === x.id
                  ? "bg-zinc-900 text-white shadow-sm shadow-zinc-900/25 ring-1 ring-zinc-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              )}
              onClick={() => setSubTab(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="primary"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:w-auto"
            onClick={() => setGeneralReceiptOpen(true)}
          >
            <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {/* Banknote — "tahsilat / para alma" */}
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            <span>{t("branch.ledgerAddGeneralReceipt")}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] w-full justify-center sm:w-auto"
            onClick={() => {
              setSelectedPdfInvoiceIds(new Set(rows.map((r) => r.id)));
              setPdfPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return "";
              });
              setPdfModalOpen(true);
            }}
            disabled={isLoading || rows.length === 0 || exportingPdf}
          >
            {exportingPdf ? t("common.loading") : t("branch.currentAccountExportPdf")}
          </Button>
          {/* Sevkiyat sayfalarına şube bağlamıyla (branchId) yönlendirme. Hedef ekranlar bu paramla filtrelenir. */}
          <Button
            type="button"
            variant="secondary"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:w-auto"
            onClick={() => router.push(`/warehouses/movements?branchId=${branchId}&type=OUT`)}
          >
            <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {/* Truck — sevkiyat */}
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h1a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.29-.7l-2.67-2.67a1 1 0 0 0-.71-.29H14v8h1" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
            </svg>
            <span>{t("branch.currentAccountNavShipmentMovements")}</span>
          </Button>
        </div>
      </div>

      {uninvoicedSummary.shipmentCount > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-4">
          <div className="flex items-start gap-2.5">
            <svg
              aria-hidden
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {t("branch.uninvoicedShipmentsBannerTitle")
                  .replace("{{shipments}}", String(uninvoicedSummary.shipmentCount))
                  .replace("{{lines}}", String(uninvoicedSummary.lineCount))}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {t("branch.uninvoicedShipmentsBannerHint")}
              </p>
              <button
                type="button"
                className="mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                aria-expanded={uninvoicedOpen}
                onClick={() => setUninvoicedOpen((v) => !v)}
              >
                {uninvoicedOpen
                  ? t("branch.uninvoicedShipmentsHideList")
                  : t("branch.uninvoicedShipmentsShowList")}
                <svg
                  aria-hidden
                  className={cn("h-3.5 w-3.5 transition-transform", uninvoicedOpen && "rotate-180")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {uninvoicedOpen ? (
                <div className="mt-2.5 border-t border-amber-200 pt-2.5">
                  {/* Yatay kaydırılabilir kart şeridi: sevkiyat sayısı arttıkça sayfa uzamaz. */}
                  <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1.5">
                    {uninvoicedShipments.map((s) => (
                      <div
                        key={s.key}
                        className="flex w-[15rem] shrink-0 snap-start flex-col rounded-xl border border-amber-200 bg-white p-3 shadow-sm shadow-amber-900/5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tabular-nums text-amber-900">
                            {formatLocaleDate(s.movementDate, locale)}
                          </span>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {t("branch.uninvoicedShipmentCardLines").replace(
                              "{count}",
                              String(s.lines.length),
                            )}
                          </span>
                        </div>
                        {s.warehouseName ? (
                          <p className="mt-0.5 truncate text-[11px] text-amber-500">
                            {s.warehouseName}
                          </p>
                        ) : null}
                        <ul className="mt-2 max-h-32 flex-1 space-y-1 overflow-y-auto pr-0.5 text-xs">
                          {s.lines.map((l) => (
                            <li
                              key={l.warehouseMovementId}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="min-w-0 truncate text-amber-900">
                                {l.productName}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-amber-900">
                                {formatLocaleAmount(l.remainingQuantity, locale)}
                                {l.unit ? (
                                  <span className="font-normal text-amber-500"> {l.unit}</span>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          type="button"
                          variant="primary"
                          className="mt-2.5 min-h-[36px] w-full px-2.5 py-1 text-xs"
                          onClick={() => openInvoiceDraftForShipment(s)}
                        >
                          {t("branch.uninvoicedShipmentInvoiceCta")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <GeneralReceiptModal
        open={generalReceiptOpen}
        onClose={() => setGeneralReceiptOpen(false)}
        counterparty={{
          mode: "fixed",
          counterpartyType: "branch",
          counterpartyId: branchId,
          currency: "TRY",
        }}
        locale={locale as Locale}
        t={t}
      />

      {subTab === "receipts" ? (
        <BranchCurrentAccountReceiptsPanel
          invoices={rows}
          branchId={branchId}
          locale={locale as Locale}
          t={t}
          canEdit
          active={active && subTab === "receipts"}
        />
      ) : null}

      {subTab !== "invoices" ? null : (
      <>
      <p className="text-sm text-zinc-600">{t("branch.currentAccountHint")}</p>

      {/* Para akışı hikayesi: Faturalanan → Ön ödeme → Tahsil → Promosyon → Açık.
          Cari Hesaplar sayfası ile tutarlı sıra. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountInvoicedTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">
            {/* Tam kalemler tutarı = invoiced + gift (promo ayrı indirim, eklenmez). */}
            {formatLocaleAmount(totals.invoiced + totals.gift, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColAdvance")}</div>
          <div className="mt-1 text-lg font-semibold text-sky-700">
            {formatLocaleAmount(totals.advance, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColPaid")}</div>
          <div className="mt-1 text-lg font-semibold text-emerald-700">
            {formatLocaleAmount(totals.cash, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColPromo")}</div>
          <div className="mt-1 text-lg font-semibold text-violet-700">
            {formatLocaleAmount(totals.promo + totals.gift, locale, "TRY")}
          </div>
          {totals.gift > 0 || totals.promo > 0 ? (
            <div className="mt-1 text-[11px] leading-tight text-zinc-500">
              {t("branch.currentAccountColPromoMoney")}: {formatLocaleAmount(totals.promo, locale, "TRY")}
              {" · "}
              {t("branch.currentAccountColGiftAmount")}: {formatLocaleAmount(totals.gift, locale, "TRY")}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountOpenTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {formatLocaleAmount(totals.open, locale, "TRY")}
          </div>
        </div>
      </div>

      {/* Anlık mutabakat rozeti: cari sonucu doğru mu? (indirim/promo/avans/tahsilat çapraz kontrol) */}
      {balanceQuery.data ? (
        reconciliation.ok ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="font-semibold">{t("branch.currentAccountReconOk")}</span>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-xl border p-3 sm:p-4",
              reconciliation.errorCount > 0 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
            )}
          >
            <div className="flex items-start gap-2.5">
              <svg
                aria-hidden
                className={cn(
                  "mt-0.5 h-5 w-5 shrink-0",
                  reconciliation.errorCount > 0 ? "text-red-600" : "text-amber-600"
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    reconciliation.errorCount > 0 ? "text-red-900" : "text-amber-900"
                  )}
                >
                  {t("branch.currentAccountReconIssues").replace("{n}", String(reconciliation.issues.length))}
                </p>
                <button
                  type="button"
                  className={cn(
                    "mt-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold transition",
                    reconciliation.errorCount > 0
                      ? "border-red-300 text-red-800 hover:bg-red-100"
                      : "border-amber-300 text-amber-800 hover:bg-amber-100"
                  )}
                  aria-expanded={reconOpen}
                  onClick={() => setReconOpen((v) => !v)}
                >
                  {reconOpen ? t("branch.currentAccountReconHide") : t("branch.currentAccountReconShow")}
                  <svg
                    aria-hidden
                    className={cn("h-3.5 w-3.5 transition-transform", reconOpen && "rotate-180")}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {reconOpen ? (
                  <ul
                    className={cn(
                      "mt-2.5 space-y-1.5 border-t pt-2.5 text-xs",
                      reconciliation.errorCount > 0 ? "border-red-200" : "border-amber-200"
                    )}
                  >
                    {reconciliation.issues.map((issue, i) => (
                      <li key={`${issue.code}-${i}`} className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                            issue.severity === "error" ? "bg-red-500" : "bg-amber-500"
                          )}
                        />
                        <span className={issue.severity === "error" ? "text-red-900" : "text-amber-900"}>
                          {formatReconIssue(issue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        )
      ) : null}

      {isError && errorText ? <p className="text-sm text-red-600">{errorText}</p> : null}
      {isLoading ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branch.currentAccountEmpty")}</p>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">{t("branch.currentAccountColDate")}</th>
                <th className="px-3 py-2 text-left">{t("branch.currentAccountColInvoiceNo")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColInvoiceTotal")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColPaid")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColPromo")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColAdvance")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColPdfStatus")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColReceiptImageStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasPdf = pdfDocByInvoiceId.has(r.id);
                const hasTransfer = transferDocByInvoiceId.has(r.id);
                const promoDeduction = Math.max(
                  promoDeductionByInvoiceId.get(r.id) ?? 0,
                  receiptPromoByInvoiceId.get(r.id) ?? 0
                );
                const advanceDeduction = Math.max(
                  advanceDeductionByInvoiceId.get(r.id) ?? 0,
                  receiptAdvanceByInvoiceId.get(r.id) ?? 0
                );
                const giftAmount = giftByInvoiceId.get(r.id) ?? 0;
                const cashCollected = Math.max(0, (Number(r.paidTotal) || 0) - promoDeduction - advanceDeduction);
                const isCollected =
                  Number.isFinite(Number(r.paidTotal)) &&
                  Number.isFinite(Number(r.openAmount)) &&
                  Number(r.paidTotal) > 0.009 &&
                  Number(r.openAmount) <= 0.009;
                return (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{formatLocaleDate(r.issueDate, locale)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{r.documentNumber}</div>
                      {isCollected ? (
                        <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {t("branch.currentAccountCollectedBadge")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {/* Tam kalemler tutarı = lines_total + gift = (kalemler-gift)+difiriz+gift
                          = kalemler + difiriz. promo ayrı bir indirim, kalem değil — eklenmez. */}
                      {formatLocaleAmount(
                        (Number(r.linesTotal) || 0) + giftAmount,
                        locale,
                        r.currencyCode,
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      <div>{formatLocaleAmount(cashCollected, locale, r.currencyCode)}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-violet-700">
                      {promoDeduction + giftAmount > 0 ? (
                        <div>
                          <div className="font-semibold">
                            {formatLocaleAmount(
                              promoDeduction + giftAmount,
                              locale,
                              r.currencyCode
                            )}
                          </div>
                          {promoDeduction > 0 || giftAmount > 0 ? (
                            <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">
                              {t("branch.currentAccountColPromoMoney")}:{" "}
                              {formatLocaleAmount(promoDeduction, locale, r.currencyCode)}
                              <br />
                              {t("branch.currentAccountColGiftAmount")}:{" "}
                              {formatLocaleAmount(giftAmount, locale, r.currencyCode)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-sky-700">
                      {advanceDeduction > 0
                        ? formatLocaleAmount(advanceDeduction, locale, r.currencyCode)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="mb-1 text-xs text-zinc-500">
                        {hasPdf
                          ? t("branch.currentAccountPdfStatusSaved")
                          : t("branch.currentAccountPdfStatusMissing")}
                      </div>
                      {hasPdf ? (
                        <div className="flex items-center justify-center gap-1">
                          {renderPdfIconButton({ hasPdf, action: "view", invoiceId: r.id, compact: true })}
                          {renderPdfIconButton({
                            hasPdf,
                            action: "download",
                            invoiceId: r.id,
                            compact: true,
                          })}
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="mb-1 text-xs text-zinc-500">
                        {hasTransfer
                          ? t("branch.currentAccountReceiptImageStatusSaved")
                          : t("branch.currentAccountReceiptImageStatusMissing")}
                      </div>
                      {hasTransfer ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] h-11 w-11 min-w-0 p-0"
                            title={t("branch.currentAccountReceiptImageView")}
                            aria-label={t("branch.currentAccountReceiptImageView")}
                            disabled={transferOpeningId === r.id}
                            onClick={() => void openTransferImage(r.id, "view")}
                          >
                            {transferOpeningId === r.id ? (
                              <span className="text-[10px] font-medium">{t("common.loading")}</span>
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] h-11 w-11 min-w-0 p-0"
                            title={t("branch.currentAccountReceiptImageDownload")}
                            aria-label={t("branch.currentAccountReceiptImageDownload")}
                            disabled={transferOpeningId === r.id}
                            onClick={() => void openTransferImage(r.id, "download")}
                          >
                            {transferOpeningId === r.id ? (
                              <span className="text-[10px] font-medium">{t("common.loading")}</span>
                            ) : (
                              <Download className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="space-y-3 md:hidden">
          {rows.map((r) => {
            const hasPdf = pdfDocByInvoiceId.has(r.id);
            const hasTransfer = transferDocByInvoiceId.has(r.id);
            const promoDeduction = Math.max(
              promoDeductionByInvoiceId.get(r.id) ?? 0,
              receiptPromoByInvoiceId.get(r.id) ?? 0
            );
            const advanceDeduction = Math.max(
              advanceDeductionByInvoiceId.get(r.id) ?? 0,
              receiptAdvanceByInvoiceId.get(r.id) ?? 0
            );
            const giftAmount = giftByInvoiceId.get(r.id) ?? 0;
            const cashCollected = Math.max(0, (Number(r.paidTotal) || 0) - promoDeduction - advanceDeduction);
            const isCollected =
              Number.isFinite(Number(r.paidTotal)) &&
              Number.isFinite(Number(r.openAmount)) &&
              Number(r.paidTotal) > 0.009 &&
              Number(r.openAmount) <= 0.009;
            return (
              <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-zinc-500">{formatLocaleDate(r.issueDate, locale)}</div>
                    <div className="text-sm font-semibold text-zinc-900">{r.documentNumber}</div>
                    {isCollected ? (
                      <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {t("branch.currentAccountCollectedBadge")}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      hasPdf ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {hasPdf
                      ? t("branch.currentAccountPdfStatusSaved")
                      : t("branch.currentAccountPdfStatusMissing")}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColInvoiceNo")}</span>
                    <span className="font-medium text-zinc-900">{r.documentNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColDate")}</span>
                    <span className="font-medium text-zinc-900">{formatLocaleDate(r.issueDate, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColInvoiceTotal")}</span>
                    <span className="font-medium text-zinc-900">
                      {/* Tam kalemler tutarı = lines_total + gift (promo ayrı indirim, eklenmez). */}
                      {formatLocaleAmount(
                        (Number(r.linesTotal) || 0) + giftAmount,
                        locale,
                        r.currencyCode,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColPaid")}</span>
                    <span className="font-medium text-emerald-700">
                      {formatLocaleAmount(cashCollected, locale, r.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColPromo")}</span>
                    <span className="text-right">
                      <span className="block font-medium text-violet-700">
                        {promoDeduction + giftAmount > 0
                          ? formatLocaleAmount(promoDeduction + giftAmount, locale, r.currencyCode)
                          : "—"}
                      </span>
                      {promoDeduction > 0 || giftAmount > 0 ? (
                        <span className="mt-0.5 block text-[11px] leading-tight text-zinc-500">
                          {t("branch.currentAccountColPromoMoney")}:{" "}
                          {formatLocaleAmount(promoDeduction, locale, r.currencyCode)}
                          {" · "}
                          {t("branch.currentAccountColGiftAmount")}:{" "}
                          {formatLocaleAmount(giftAmount, locale, r.currencyCode)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColAdvance")}</span>
                    <span className="font-medium text-sky-700">
                      {advanceDeduction > 0
                        ? formatLocaleAmount(advanceDeduction, locale, r.currencyCode)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  {hasPdf ? (
                    <div className="flex items-center gap-2">
                      {renderPdfIconButton({ hasPdf, action: "view", invoiceId: r.id })}
                      {renderPdfIconButton({ hasPdf, action: "download", invoiceId: r.id })}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-zinc-400">—</div>
                  )}
                </div>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                  {hasTransfer
                    ? t("branch.currentAccountReceiptImageStatusSaved")
                    : t("branch.currentAccountReceiptImageStatusMissing")}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      </>
      )}

      <Modal
        open={pdfChoice != null}
        onClose={() => setPdfChoice(null)}
        titleId="branch-current-account-pdf-choice-title"
        title={t("branch.currentAccountPdfChoiceTitle")}
        closeButtonLabel={t("common.close")}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{t("branch.currentAccountPdfChoiceHint")}</p>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              {t("branch.currentAccountPdfChoiceContentLabel")}
            </legend>
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="branch-ca-pdf-variant"
                className="mt-0.5"
                checked={pdfChoiceVariant === "v1"}
                onChange={() => setPdfChoiceVariant("v1")}
              />
              <span>
                <span className="block font-medium text-zinc-800">
                  {t("branch.currentAccountPdfChoiceV1")}
                </span>
                <span className="block text-xs text-zinc-500">
                  {t("branch.currentAccountPdfChoiceV1Hint")}
                </span>
              </span>
            </label>
            <label className="flex cursor-not-allowed items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm opacity-60">
              <input
                type="radio"
                name="branch-ca-pdf-variant"
                className="mt-0.5"
                checked={pdfChoiceVariant === "v2"}
                onChange={() => setPdfChoiceVariant("v2")}
                disabled
              />
              <span>
                <span className="block font-medium text-zinc-800">
                  {t("branch.currentAccountPdfChoiceV2")}
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    {t("branch.currentAccountPdfChoiceComingSoon")}
                  </span>
                </span>
                <span className="block text-xs text-zinc-500">
                  {t("branch.currentAccountPdfChoiceV2Hint")}
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setPdfChoice(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (!pdfChoice) return;
                const { invoiceId, mode } = pdfChoice;
                const variant = pdfChoiceVariant;
                setPdfChoice(null);
                void openPdf(invoiceId, mode, { variant });
              }}
            >
              {pdfChoice?.mode === "download"
                ? t("branch.currentAccountPdfDownload")
                : t("branch.currentAccountPdfView")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setPdfPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return "";
          });
        }}
        titleId="branch-current-account-pdf-modal-title"
        title={t("branch.currentAccountPdfOptionsTitle")}
        closeButtonLabel={t("common.close")}
        className="max-w-5xl"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">{t("branch.currentAccountPdfOptionsHint")}</p>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {t("branch.currentAccountPdfRecordsTitle")}
              </p>
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs">
                <Checkbox
                  checked={allPdfRowsSelected}
                  onCheckedChange={(checked) =>
                    setSelectedPdfInvoiceIds(checked ? new Set(rows.map((r) => r.id)) : new Set())
                  }
                />
                <span className="font-medium text-zinc-700">{t("branch.currentAccountPdfSelectAll")}</span>
              </label>
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-auto rounded-md border border-zinc-200 bg-white p-2">
              {rows.map((row) => {
                const checked = selectedPdfInvoiceIds.has(row.id);
                return (
                  <label
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          setSelectedPdfInvoiceIds((prev) => {
                            const updated = new Set(prev);
                            if (next) updated.add(row.id);
                            else updated.delete(row.id);
                            return updated;
                          })
                        }
                      />
                      <span className="text-xs font-medium text-zinc-800">{row.documentNumber}</span>
                    </span>
                    <span className="text-xs tabular-nums text-zinc-600">
                      {formatLocaleAmount(row.openAmount, locale, row.currencyCode)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs">
              <Checkbox
                checked={pdfOptions.showCompanyName}
                onCheckedChange={(checked) =>
                  setPdfOptions((x) => ({ ...x, showCompanyName: checked }))
                }
              />
              <span className="font-medium text-zinc-700">{t("branch.currentAccountPdfShowCompanyName")}</span>
            </label>
            <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs">
              <Checkbox
                checked={pdfOptions.showLogo}
                onCheckedChange={(checked) => setPdfOptions((x) => ({ ...x, showLogo: checked }))}
              />
              <span className="font-medium text-zinc-700">{t("branch.currentAccountPdfShowLogo")}</span>
            </label>
            <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs">
              <Checkbox
                checked={pdfOptions.showIban}
                onCheckedChange={(checked) => setPdfOptions((x) => ({ ...x, showIban: checked }))}
              />
              <span className="font-medium text-zinc-700">{t("branch.currentAccountPdfShowIban")}</span>
            </label>
            <label className="flex min-h-10 items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs">
              <Checkbox
                checked={pdfOptions.showReceipts}
                onCheckedChange={(checked) => setPdfOptions((x) => ({ ...x, showReceipts: checked }))}
              />
              <span className="font-medium text-zinc-700">{t("branch.currentAccountPdfShowReceipts")}</span>
            </label>
          </div>
          {pdfOptions.showIban ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
                placeholder="IBAN"
                value={pdfOptions.iban}
                onChange={(e) => setPdfOptions((x) => ({ ...x, iban: e.target.value }))}
              />
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
                placeholder={t("branch.currentAccountPdfIbanAccountHolder")}
                value={pdfOptions.accountHolder}
                onChange={(e) => setPdfOptions((x) => ({ ...x, accountHolder: e.target.value }))}
              />
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
                placeholder={t("branch.currentAccountPdfIbanBankName")}
                value={pdfOptions.bankName}
                onChange={(e) => setPdfOptions((x) => ({ ...x, bankName: e.target.value }))}
              />
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
                placeholder={t("branch.currentAccountPdfIbanNote")}
                value={pdfOptions.note}
                onChange={(e) => setPdfOptions((x) => ({ ...x, note: e.target.value }))}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" disabled={pdfPreviewLoading || exportingPdf || selectedPdfInvoiceIds.size === 0} onClick={() => void previewCurrentAccountPdf()}>
              {pdfPreviewLoading ? t("common.loading") : t("branch.currentAccountPdfPreview")}
            </Button>
            <Button type="button" variant="primary" disabled={pdfPreviewLoading || exportingPdf || selectedPdfInvoiceIds.size === 0} onClick={() => void exportCurrentAccountPdf()}>
              {exportingPdf ? t("common.loading") : t("branch.currentAccountPdfExport")}
            </Button>
          </div>
          <div className="h-[60vh] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {pdfPreviewUrl ? (
              <iframe title="branch-current-account-pdf-preview" src={pdfPreviewUrl} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-sm text-zinc-500">
                {t("branch.currentAccountPdfPreviewHint")}
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
