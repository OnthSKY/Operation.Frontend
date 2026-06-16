"use client";

import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import {
  fetchOutboundInvoice,
  fetchOutboundInvoices,
  fetchOutboundInvoiceReceipts,
  type OutboundInvoiceReceiptResponse,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { addOutboundInvoiceReceipt } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { BranchGeneralReceiptModal } from "./BranchGeneralReceiptModal";
import { computePriorOpenBalanceForInvoice } from "@/modules/order-account-statement/lib/compute-prior-open-balance-for-invoice";
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
import {
  useBranchDocuments,
  useDeleteBranchDocument,
  useUploadBranchDocument,
} from "@/modules/branch/hooks/useBranchQueries";
import { CurrentAccountReceiptModal } from "@/modules/order-account-statement/components/CurrentAccountReceiptModal";
import { BranchCurrentAccountReceiptsPanel } from "./BranchCurrentAccountReceiptsPanel";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { apiFetch } from "@/shared/api/client";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatAmountInputOnBlur, formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { buildPdfFileName } from "@/shared/lib/pdf-file-name";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
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

/** Tahsilatlı (v2) olarak kaydedilmiş türetilmiş PDF belgesi mi? */
function isOrderAccountPdfV2Note(note: string | null | undefined): boolean {
  return /(?:^|[;,\s·])version=v2(?:$|[;,\s·])/i.test(String(note ?? ""));
}

/** Tahsilat kümesinin imzası: «adet-toplamKuruş». Tahsilat değişince v2 tazelenir. */
function receiptsSignature(lines: ReadonlyArray<{ amount: number }>): string {
  const count = lines.length;
  const totalCents = lines.reduce(
    (sum, l) => sum + Math.round((Number(l.amount) || 0) * 100),
    0
  );
  return `${count}-${totalCents}`;
}

/** Kayıtlı v2 belgesinin notundan tahsilat imzasını okur (yoksa null). */
function parseReceiptSigFromNote(note: string | null | undefined): string | null {
  const m = String(note ?? "").match(/(?:^|[;,\s·])receiptSig=(\d+-\d+)(?:$|[;,\s·])/i);
  return m ? m[1] : null;
}

type CurrentAccountSubTabId = "invoices" | "receipts";

export function BranchDetailCurrentAccountTab({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const [subTab, setSubTab] = useState<CurrentAccountSubTabId>("invoices");
  const [receiptInvoice, setReceiptInvoice] = useState<OutboundInvoiceResponse | null>(null);
  const [receiptDate, setReceiptDate] = useState(localIsoDate());
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [receiptTransferImage, setReceiptTransferImage] = useState<File | null>(null);
  const [pdfOpeningId, setPdfOpeningId] = useState<number | null>(null);
  const [pdfChoice, setPdfChoice] = useState<{ invoiceId: number; mode: "view" | "download" } | null>(null);
  // İndirme/görüntüleme sürümü: "v1" = faturalandırma PDF'i (orijinal), "v2" = tahsilatlı sürüm.
  const [pdfChoiceVariant, setPdfChoiceVariant] = useState<"v1" | "v2">("v1");
  const [transferOpeningId, setTransferOpeningId] = useState<number | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generalReceiptOpen, setGeneralReceiptOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<CurrentAccountPdfOptions>({
    showLogo: true,
    showCompanyName: true,
    showIban: false,
    iban: "",
    accountHolder: "",
    bankName: "",
    note: "",
  });
  const [selectedPdfInvoiceIds, setSelectedPdfInvoiceIds] = useState<Set<number>>(new Set());
  const [receiptPromoByInvoiceId, setReceiptPromoByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const [receiptAdvanceByInvoiceId, setReceiptAdvanceByInvoiceId] = useState<Map<number, number>>(() => new Map());
  const uploadBranchDocumentMut = useUploadBranchDocument(branchId);
  const deleteBranchDocumentMut = useDeleteBranchDocument(branchId);

  const invoicesQuery = useQuery({
    queryKey: ["branchCurrentAccountInvoices", branchId],
    queryFn: fetchOutboundInvoices,
    enabled: active && branchId > 0,
  });
  const docsQuery = useBranchDocuments(branchId, active);

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

  // Tahsilatlı (v2) olarak daha önce kaydedilmiş türetilmiş PDF — en yenisi tutulur.
  const pdfV2DocByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    const sorted = [...(docsQuery.data ?? [])].sort((a, b) => {
      const aTs = Date.parse(a.createdAt ?? "") || 0;
      const bTs = Date.parse(b.createdAt ?? "") || 0;
      return bTs - aTs;
    });
    for (const doc of sorted) {
      if (doc.contentType !== "application/pdf") continue;
      if (!isOrderAccountPdfV2Note(doc.notes)) continue;
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

  const totalsRaw = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.invoiced += Number(r.linesTotal) || 0;
          acc.paidRaw += Number(r.paidTotal) || 0;
          acc.open += Number(r.openAmount) || 0;
          return acc;
        },
        { invoiced: 0, paidRaw: 0, open: 0 }
      ),
    [rows]
  );

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

  // Toplam breakdown — şu mantıkla ayrıştırıyoruz:
  //   paidRaw (invoice_receipts.SUM)  =  nakit (cash/bank/check)  +  promosyon  +  ön ödeme
  // Promosyon ve ön ödemeyi (fatura-bazlı kolondan veya receipt'lerden) ayrı topluyoruz,
  // kalanı "tahsil edilen" (gerçek para) olarak gösteriyoruz. Hediye fatura-bazlı kolondan.
  const totals = useMemo(() => {
    let promo = 0;
    let advance = 0;
    let gift = 0;
    rows.forEach((r) => {
      promo += Math.max(
        promoDeductionByInvoiceId.get(r.id) ?? 0,
        receiptPromoByInvoiceId.get(r.id) ?? 0
      );
      advance += Math.max(
        advanceDeductionByInvoiceId.get(r.id) ?? 0,
        receiptAdvanceByInvoiceId.get(r.id) ?? 0
      );
      gift += giftByInvoiceId.get(r.id) ?? 0;
    });
    const cash = Math.max(0, totalsRaw.paidRaw - promo - advance);
    return {
      invoiced: totalsRaw.invoiced,
      cash,
      promo,
      advance,
      gift,
      open: totalsRaw.open,
    };
  }, [
    rows,
    totalsRaw,
    promoDeductionByInvoiceId,
    advanceDeductionByInvoiceId,
    giftByInvoiceId,
    receiptPromoByInvoiceId,
    receiptAdvanceByInvoiceId,
  ]);

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
      let savedV2 = false;

      // v2 (tahsilatlı): kayıtlı v2 güncel tahsilatlarla eşleşiyorsa onu kullan; tahsilatlar
      // değişmiş ya da v2 yoksa, tahsilatları ekleyerek yeniden üret ve indirilirken kaydet
      // (bayat v2 varsa tazesiyle değiştir).
      if (variant === "v2") {
        // Güncel tahsilatları al — hem imza karşılaştırması hem de (gerekirse) üretim için.
        let receiptLines: { id: string; description: string; amount: number }[] = [];
        try {
          const receipts = await fetchOutboundInvoiceReceipts(invoiceId);
          receiptLines = receipts
            .filter((r) => (Number(r.amount) || 0) > 0.009)
            .map((r) => ({
              id: `receipt-${r.id}`,
              description: `${formatLocaleDate(r.receiptDate, locale)} · ${receiptKindLabel(r.receiptKind)}`,
              amount: Number(r.amount) || 0,
            }));
        } catch {
          receiptLines = [];
        }
        const currentSig = receiptsSignature(receiptLines);
        const existingV2Id = pdfV2DocByInvoiceId.get(invoiceId) ?? null;
        const existingV2Doc =
          existingV2Id != null ? (docsQuery.data ?? []).find((d) => d.id === existingV2Id) : undefined;
        const existingV2Sig = existingV2Doc ? parseReceiptSigFromNote(existingV2Doc.notes) : null;

        if (existingV2Id != null && existingV2Sig === currentSig) {
          // Kayıtlı v2 güncel (tahsilatlar değişmemiş) — yeniden üretmeden indir/aç.
          const stored = await fetchBranchDocumentBlob(branchId, existingV2Id);
          blob = stored.blob;
        } else if (listInvoice && doc && isOrderAccountStatementPdfNote(doc.notes)) {
          try {
            const detail = await fetchOutboundInvoice(invoiceId);
            if ((detail.lines ?? []).length > 0) {
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
                priorOpenBalance: priorOpen,
                includePriorBalance: true,
                showReceipts: true,
                receipts: receiptLines,
                receiptsLabel: t("branch.currentAccountPdfReceiptsSection"),
                remainingLabel: t("branch.currentAccountPdfRemaining"),
                labels: orderAccountPdfLabels,
              });
              // İndirilirken güncel v2'yi (v1'den ayrı) kalıcı kaydet; bayat v2 varsa değiştir.
              if (blob && mode === "download") {
                try {
                  const v2Name = buildPdfFileName(
                    [
                      listInvoice?.counterpartyName,
                      t("branch.currentAccountPdfFileShipmentLabel"),
                      listInvoice?.documentNumber,
                      "v2",
                      listInvoice?.issueDate,
                    ],
                    { fallback: t("branch.currentAccountPdfFileShipmentLabel") }
                  );
                  // v2 notu kısa ve kendine yeter: tanıma + fatura bağı + sürüm + tahsilat imzası.
                  const v2Notes = [
                    "Sipariş-hesap dökümü PDF",
                    `invoiceId=${invoiceId}`,
                    "version=v2",
                    `parentDocumentId=${documentId}`,
                    `receiptSig=${currentSig}`,
                  ].join(" · ");
                  // Önce bayat v2'yi sil (varsa); silinemese bile en yeni v2 listede kazanır.
                  if (existingV2Id != null) {
                    try {
                      await deleteBranchDocumentMut.mutateAsync(existingV2Id);
                    } catch {
                      /* bayat v2 silinemedi; yine de yenisini yükle */
                    }
                  }
                  await uploadBranchDocumentMut.mutateAsync({
                    file: new File([blob], v2Name, { type: "application/pdf" }),
                    kind: "OTHER",
                    notes: v2Notes,
                  });
                  savedV2 = true;
                } catch (e) {
                  notify.error(toErrorMessage(e));
                }
              }
            }
          } catch {
            blob = null;
          }
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
      if (savedV2) notify.success(t("branch.currentAccountPdfV2Saved"));
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

  const submitReceipt = async () => {
    if (!receiptInvoice) return;
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
    const currencyCode = receiptInvoice.currencyCode;
    // Faturaya bağlı tahsilat → legacy endpoint (invoice_receipts + customer_account_receipts'e
    // dual-write yapar). openAmount tutarlı kalır, drift olmaz.
    setReceiptSaving(true);
    try {
      await addOutboundInvoiceReceipt(receiptInvoice.id, {
        receiptDate,
        amount,
        currencyCode,
        receiptKind: "cash",
        notes: receiptNote.trim() || null,
      });
      if (receiptTransferImage) {
        await uploadBranchDocumentMut.mutateAsync({
          file: receiptTransferImage,
          kind: "OTHER",
          notes: `title=banka_dekontu · source=current_account_receipt · invoiceId=${receiptInvoice.id} · receiptDate=${receiptDate}`,
        });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices", branchId] }),
        qc.invalidateQueries({ queryKey: ["customerAccountBalance", "branch", branchId] }),
      ]);
      notify.success(t("branch.currentAccountReceiptDistributedSaved")
        .replace("{n}", "1")
        .replace("{amount}", formatLocaleAmount(amount, locale, currencyCode))
      );
      setReceiptInvoice(null);
      setReceiptDate(localIsoDate());
      setReceiptAmount("");
      setReceiptNote("");
      setReceiptTransferImage(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setReceiptSaving(false);
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
        return {
          counterpartyName: invoice.counterpartyName,
          counterpartyTypeLabel: t("reports.counterpartySummaryTypeBranch"),
          documentNumber: invoice.documentNumber,
          issueDate: formatLocaleDate(invoice.issueDate, locale),
          invoiceAmount: formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode),
          paidAmount: formatLocaleAmount(invoice.paidTotal, locale, invoice.currencyCode),
          openAmount: formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode),
          paymentDate: paymentDate ? formatLocaleDate(paymentDate, locale) : "—",
        };
      })
    );

    const selectedTotals = selectedRows.reduce(
      (acc, row) => {
        acc.invoiced += Number(row.linesTotal) || 0;
        acc.paid += Number(row.paidTotal) || 0;
        acc.open += Number(row.openAmount) || 0;
        return acc;
      },
      { invoiced: 0, paid: 0, open: 0 }
    );

    const footerTotals = {
      invoicedLabel: t("branch.currentAccountInvoicedTotal"),
      invoicedValue: formatLocaleAmount(selectedTotals.invoiced, locale, "TRY"),
      paidLabel: t("branch.currentAccountPaidTotal"),
      paidValue: formatLocaleAmount(selectedTotals.paid, locale, "TRY"),
      openLabel: t("branch.currentAccountOpenTotal"),
      openValue: formatLocaleAmount(selectedTotals.open, locale, "TRY"),
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
        totalsLabel: `${t("branch.currentAccountPdfTotals")}: ${footerTotals.invoicedValue} / ${footerTotals.paidValue} / ${footerTotals.openValue}`,
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
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t("branch.currentAccountSubTabsAria")}
          className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            onClick={() => setGeneralReceiptOpen(true)}
          >
            {t("branch.ledgerAddGeneralReceipt")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px]"
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
        </div>
      </div>

      <BranchGeneralReceiptModal
        open={generalReceiptOpen}
        onClose={() => setGeneralReceiptOpen(false)}
        counterpartyType="branch"
        counterpartyId={branchId}
        currency="TRY"
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountInvoicedTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">
            {formatLocaleAmount(totals.invoiced, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColPaid")}</div>
          <div className="mt-1 text-lg font-semibold text-emerald-700">
            {formatLocaleAmount(totals.cash, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColAdvance")}</div>
          <div className="mt-1 text-lg font-semibold text-sky-700">
            {formatLocaleAmount(totals.advance, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColPromo")}</div>
          <div className="mt-1 text-lg font-semibold text-violet-700">
            {formatLocaleAmount(totals.promo, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountColGiftAmount")}</div>
          <div className="mt-1 text-lg font-semibold text-fuchsia-700">
            {formatLocaleAmount(totals.gift, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountOpenTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {formatLocaleAmount(totals.open, locale, "TRY")}
          </div>
        </div>
      </div>

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
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColGiftAmount")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColAdvance")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColOpen")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColPdfStatus")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColReceiptImageStatus")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColActions")}</th>
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
                      {formatLocaleAmount(r.linesTotal, locale, r.currencyCode)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      <div>{formatLocaleAmount(cashCollected, locale, r.currencyCode)}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-violet-700">
                      {promoDeduction > 0
                        ? formatLocaleAmount(promoDeduction, locale, r.currencyCode)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-fuchsia-700">
                      {giftAmount > 0 ? formatLocaleAmount(giftAmount, locale, r.currencyCode) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-sky-700">
                      {advanceDeduction > 0
                        ? formatLocaleAmount(advanceDeduction, locale, r.currencyCode)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {formatLocaleAmount(r.openAmount, locale, r.currencyCode)}
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
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs"
                        disabled={Number(r.openAmount) <= 0}
                        onClick={() => {
                          setReceiptInvoice(r);
                          setReceiptDate(localIsoDate());
                          setReceiptAmount("");
                          setReceiptNote("");
                          setReceiptTransferImage(null);
                        }}
                      >
                        {t("branch.currentAccountAddReceipt")}
                      </Button>
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
                      {formatLocaleAmount(r.linesTotal, locale, r.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColPaid")}</span>
                    <span className="font-medium text-emerald-700">
                      {formatLocaleAmount(cashCollected, locale, r.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColPromo")}</span>
                    <span className="font-medium text-violet-700">
                      {promoDeduction > 0
                        ? formatLocaleAmount(promoDeduction, locale, r.currencyCode)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColGiftAmount")}</span>
                    <span className="font-medium text-fuchsia-700">
                      {giftAmount > 0 ? formatLocaleAmount(giftAmount, locale, r.currencyCode) : "—"}
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColOpen")}</span>
                    <span className="font-medium text-amber-700">
                      {formatLocaleAmount(r.openAmount, locale, r.currencyCode)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {hasPdf ? (
                    <div className="flex items-center gap-2">
                      {renderPdfIconButton({ hasPdf, action: "view", invoiceId: r.id })}
                      {renderPdfIconButton({ hasPdf, action: "download", invoiceId: r.id })}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-zinc-400">—</div>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-[44px] min-w-[44px] px-2 py-2 text-xs"
                    disabled={Number(r.openAmount) <= 0}
                    onClick={() => {
                      setReceiptInvoice(r);
                      setReceiptDate(localIsoDate());
                      setReceiptAmount("");
                      setReceiptNote("");
                      setReceiptTransferImage(null);
                    }}
                  >
                    {t("branch.currentAccountAddReceipt")}
                  </Button>
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
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="branch-ca-pdf-variant"
                className="mt-0.5"
                checked={pdfChoiceVariant === "v2"}
                onChange={() => setPdfChoiceVariant("v2")}
              />
              <span>
                <span className="block font-medium text-zinc-800">
                  {t("branch.currentAccountPdfChoiceV2")}
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
          <div className="grid gap-2 sm:grid-cols-3">
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

      <CurrentAccountReceiptModal
        open={receiptInvoice != null}
        onClose={() => setReceiptInvoice(null)}
        titleId="branch-current-account-receipt-modal-title"
        title={t("branch.currentAccountReceiptModalTitle")}
        closeButtonLabel={t("common.close")}
        summaryText={
          receiptInvoice
            ? `${receiptInvoice.documentNumber} - ${formatLocaleAmount(
                receiptInvoice.openAmount,
                locale,
                receiptInvoice.currencyCode
              )}`
            : ""
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
          receiptInvoice
            ? () =>
                setReceiptAmount(
                  formatAmountInputOnBlur(String(receiptInvoice.openAmount ?? ""), locale)
                )
            : undefined
        }
        receiptNoteLabel={t("branch.currentAccountReceiptNote")}
        receiptNote={receiptNote}
        onReceiptNoteChange={setReceiptNote}
        showImageUpload
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
