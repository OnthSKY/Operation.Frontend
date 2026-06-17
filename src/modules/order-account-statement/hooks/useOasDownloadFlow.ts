"use client";

import { useCallback, useState, type RefObject } from "react";
import type { useRouter } from "next/navigation";
import type { OpenBranchDetailOptions } from "@/shared/branch-detail";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import {
  isoDateOnly,
  isoDateStamp,
  buildOrderAccountDocumentMetadata,
} from "@/modules/order-account-statement/components/oas-helpers";
import {
  buildOrderAccountPdfFileName,
  buildHtmlNodeSinglePagePdfBlob,
} from "@/modules/order-account-statement/lib/download-preview-as-pdf";
import {
  createOutboundInvoice,
  createShipmentInvoice,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { uploadBranchDocument } from "@/modules/branch/api/branch-documents-api";
import type {
  LineDraft,
} from "@/modules/order-account-statement/components/oas-types";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";
import type { useOasInvoicing } from "@/modules/order-account-statement/hooks/useOasInvoicing";
import type { useOasMultiAction } from "@/modules/order-account-statement/hooks/useOasMultiAction";
import type { useOasShipmentSelection } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";
import type { useOasSuggestions } from "@/modules/order-account-statement/hooks/useOasSuggestions";

/**
 * "PDF indir + fatura kes + sisteme kaydet" ana submit akışı. Bu hook orchestrator'ın
 * en büyük tek callback'iydi; tüm yan etkiler (PDF üretimi, OutboundInvoice oluşturma,
 * receipt ekleme, dokuman yükleme, audit ile multi-action progress) burada toplandı.
 *
 * SRP: tek bir use-case (download + persist). Pure değil — IO + state etkileşimi var.
 * Test edilebilirlik için bağımlılıklar (apilar, hook'lar) parametre olarak alınır.
 */
type Params = {
  t: (k: string) => string;
  locale: "tr" | "en";
  previewRef: RefObject<HTMLDivElement | null>;
  router: ReturnType<typeof useRouter>;
  openBranchDetail: (branchId: number, options?: OpenBranchDetailOptions) => void;

  identity: ReturnType<typeof useOasIdentity>;
  invoicing: ReturnType<typeof useOasInvoicing>;
  multiAction: ReturnType<typeof useOasMultiAction>;
  shipment: ReturnType<typeof useOasShipmentSelection>;
  suggestionsState: ReturnType<typeof useOasSuggestions>;

  /** Hesaplanmış değerler — orchestrator'da türetildi. */
  lines: LineDraft[];
  parsedLines: ReturnType<typeof import("@/modules/order-account-statement/components/oas-helpers").parseLines>;
  parsedPaid: ReturnType<typeof import("@/modules/order-account-statement/components/oas-helpers").parsePaid>;
  parsedPromo: ReturnType<typeof import("@/modules/order-account-statement/components/oas-helpers").parsePromo>;
  advanceDeduction: number;
  previousBalance: number;
  totals: { giftLinesSum: number; promoLinesSum: number };

  /** Reset/dosya etiketi için. */
  orderDocumentKey: string;
  receivedAdvancePostToLedger: boolean;
  statementDate: Date;
};

export function useOasDownloadFlow(p: Params) {
  const {
    t,
    locale,
    previewRef,
    router,
    openBranchDetail,
    identity,
    invoicing,
    multiAction,
    shipment,
    suggestionsState,
    lines,
    parsedLines,
    parsedPaid,
    parsedPromo,
    advanceDeduction,
    previousBalance,
    totals,
    orderDocumentKey,
    receivedAdvancePostToLedger,
    statementDate,
  } = p;

  const [busy, setBusy] = useState(false);
  const hasMultipleActions = invoicing.saveAsInvoice || invoicing.saveToSystem;

  const onDownloadPdf = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    setBusy(true);
    const showMultiActionProgress = hasMultipleActions;
    if (showMultiActionProgress) {
      multiAction.begin([
        { id: "download", label: t("reports.orderAccountStatementActionDownloadPdf"), state: "pending" },
        {
          id: "invoice",
          label: t("reports.orderAccountStatementActionCreateInvoice"),
          state: invoicing.saveAsInvoice ? "pending" : "skipped",
        },
        {
          id: "system",
          label: t("reports.orderAccountStatementActionSaveSystem"),
          state: invoicing.saveToSystem ? "pending" : "skipped",
        },
      ]);
    }
    const setStepState = (id: "download" | "invoice" | "system", state: "pending" | "running" | "done" | "skipped") => {
      if (!showMultiActionProgress) return;
      multiAction.setStepState(id, state);
    };

    try {
      setStepState("download", "running");
      const name = buildOrderAccountPdfFileName(
        identity.companyName.trim() || "HesapOzeti",
        identity.branchName.trim() || "Şube",
        isoDateStamp(new Date())
      );
      const docBlob = await buildHtmlNodeSinglePagePdfBlob(el);
      const dlUrl = URL.createObjectURL(docBlob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = name;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStepState("download", "done");

      const safeCompany = identity.companyName.trim() || "—";
      const safeBranch = identity.branchName.trim() || "—";
      const safeTitle = identity.documentTitle.trim();
      const parsedBranchId = parseInt(identity.linkedBranchId, 10);
      const parsedCustomerId = parseInt(invoicing.customerAccountIdText, 10);
      const useBranchCounterparty = Number.isFinite(parsedBranchId) && parsedBranchId > 0;
      const counterpartyType: "branch" | "customer" = useBranchCounterparty ? "branch" : "customer";
      const counterpartyId = useBranchCounterparty ? parsedBranchId : parsedCustomerId;
      let createdInvoice: OutboundInvoiceResponse | null = null;

      if (invoicing.saveAsInvoice) {
        setStepState("invoice", "running");
        if (!useBranchCounterparty && (!Number.isFinite(parsedCustomerId) || parsedCustomerId <= 0)) {
          notify.error(t("reports.orderAccountStatementInvoiceCounterpartyRequired"));
          setStepState("invoice", "pending");
          return;
        }
        const invalidLineCount = lines.filter(
          (l) => l.description.trim().length === 0 || !Number.isFinite(l.amount) || l.amount <= 0
        ).length;
        const payloadLines = lines
          .filter(
            (l) =>
              !l.isGift &&
              l.description.trim().length > 0 &&
              Number.isFinite(l.amount) &&
              l.amount > 0
          )
          .map((l) => ({
            productId: l.selectedProductId ?? null,
            description: l.description.trim(),
            quantity: Math.max(1, parseLocaleAmount((l.quantityText ?? "").trim(), locale) || 1),
            unit: (l.unitText ?? "").trim() || null,
            unitPrice: Math.max(0, parseLocaleAmount((l.unitPriceText ?? "").trim(), locale) || l.amount),
            lineAmount: Math.max(0, l.amount),
            lineSource: l.lineSource === "shipment" ? ("shipment" as const) : ("manual" as const),
            manualReasonCode: l.lineSource === "shipment" ? null : (l.manualReasonCode ?? "OPS_OTHER"),
            sourceShipmentLineId: l.sourceShipmentLineId ?? null,
          }));
        parsedPaid
          .filter((l) => l.description.trim().length > 0 && Number.isFinite(l.amount) && l.amount > 0)
          .forEach((l) => {
            payloadLines.push({
              productId: null,
              description: l.description.trim(),
              quantity: 1,
              unit: "adet",
              unitPrice: Math.max(0, l.amount),
              lineAmount: Math.max(0, l.amount),
              lineSource: "manual",
              manualReasonCode: "OPS_OTHER",
              sourceShipmentLineId: null,
            });
          });
        if (payloadLines.length === 0) {
          notify.error(
            t("reports.orderAccountStatementInvoiceLinesRequiredDetailed").replace(
              "{invalidCount}",
              String(invalidLineCount || lines.length)
            )
          );
          setStepState("invoice", "pending");
          return;
        }
        const hasManualLine = payloadLines.some((x) => x.lineSource === "manual");
        const effectiveShipmentLinkMode =
          shipment.creationMode === "shipmentBased" && hasManualLine ? "partial" : shipment.shipmentLinkMode;
        const giftDeductionTotal = parsedLines.reduce(
          (sum, row) => sum + (row.isGift ? Math.max(0, row.amount) : 0),
          0
        );
        const promoDeductionTotal = parsedPromo.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
        const advanceLedgerDeduction = Math.max(0, advanceDeduction);
        const invoicePayload = {
          counterpartyType,
          counterpartyId,
          issueDate: isoDateOnly(statementDate),
          currencyCode: "TRY",
          shipmentLinkMode: effectiveShipmentLinkMode,
          autoPostLedger: invoicing.invoiceAutoPost,
          // Promo, gift ve advance — hepsi outbound_invoices header kolonlarına yazılır.
          // Eskiden advance ayrıca receipt olarak da yazılıyordu (otomatik); kaldırdık.
          // Kullanıcı fiilen alınan ön ödeme nakdini "+ Genel Tahsilat Al" → kind=advance_payment
          // ile ayrıca girer (izlenebilirlik için), ama bu header değeri zaten fatura için
          // beklenen ön ödeme tutarını kaydeder ve Cari Hesaplar sayfasında görünür.
          promoAmount: promoDeductionTotal,
          giftAmount: giftDeductionTotal,
          advanceAmount: advanceLedgerDeduction,
          notes: buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            counterpartyLabel: `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: shipment.selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: shipment.selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: shipment.selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
            giftAmount: giftDeductionTotal,
            promoAmount: promoDeductionTotal,
            advanceAmount: advanceLedgerDeduction,
          }),
          paymentInfo: {
            iban: invoicing.paymentIban.trim() || null,
            accountHolder: invoicing.paymentAccountHolder.trim() || null,
            bankName: invoicing.paymentBankName.trim() || null,
            paymentNote: invoicing.paymentNote.trim() || null,
            showOnPdf: invoicing.showPaymentOnPdf,
          },
          lines: payloadLines,
        };
        const useShipmentEndpoint =
          shipment.creationMode === "shipmentBased" &&
          shipment.selectedShipmentSource != null &&
          payloadLines.some((x) => x.lineSource === "shipment");
        createdInvoice = useShipmentEndpoint
          ? await createShipmentInvoice(shipment.selectedShipmentSource!.primaryMovementId, {
              ...invoicePayload,
              shipmentLinks:
                shipment.selectedShipmentSource != null
                  ? shipment.selectedShipmentSource.movementIds.map((movementId) => ({
                      warehouseMovementId: movementId,
                      quantity: 0,
                    }))
                  : [],
            })
          : await createOutboundInvoice(invoicePayload);
        if (!createdInvoice) {
          throw new Error("Invoice creation returned no result.");
        }
        // Advance (ön ödeme) — artık OAS akışı otomatik tahsilat yazmıyor.
        // Kullanıcı PDF üretimi sonrası "+ Genel Tahsilat Al" ile receiptKind='advance_payment'
        // seçerek manuel girer. Bu sayede her tahsilat kullanıcı kontrolünde, izlenebilir,
        // ve invoice_receipts tablosuna yazılmayan tek tek source-of-truth: customer_account_receipts.
        const created = createdInvoice;
        invoicing.setLastCreatedInvoiceNo(created.documentNumber);
        invoicing.setLastCreatedInvoiceId(created.id);
        const createdCounterpartyType = created.counterpartyType;
        const createdCounterpartyId = created.counterpartyId;
        suggestionsState.setSuggestions((prev) =>
          [
            {
              counterpartyType: created.counterpartyType,
              counterpartyId: created.counterpartyId,
              counterpartyName: created.counterpartyName,
              currencyCode: created.currencyCode,
              invoicedTotal: created.linesTotal,
              paidTotal: created.paidTotal,
              openAmount: created.openAmount,
              lastInvoiceDate: created.issueDate,
              lastDocumentNumber: created.documentNumber,
            },
            ...prev.filter(
              (x) =>
                !(x.counterpartyType === createdCounterpartyType && x.counterpartyId === createdCounterpartyId)
            ),
          ].slice(0, 10)
        );
        notify.success(t("reports.orderAccountStatementInvoiceSaved"));
        setStepState("invoice", "done");
      }

      if (invoicing.saveToSystem) {
        setStepState("system", "running");
        const branchId = parsedBranchId;
        if (!Number.isFinite(branchId) || branchId <= 0) {
          notify.error(t("reports.orderAccountStatementSystemBranchRequired"));
          setStepState("system", "pending");
        } else {
          const pdfDocumentNo = `CRP-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
          const systemFile = new File([docBlob], name, { type: "application/pdf" });
          const note = buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            pdfDocumentNo,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            invoiceId: createdInvoice?.id,
            invoiceNo: createdInvoice?.documentNumber,
            counterpartyLabel:
              createdInvoice != null
                ? `${createdInvoice.counterpartyType}:${createdInvoice.counterpartyId}`
                : `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: shipment.selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: shipment.selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: shipment.selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
            giftAmount: totals.giftLinesSum,
            promoAmount: totals.promoLinesSum,
            advanceAmount: Math.max(0, advanceDeduction),
            previousBalance,
          });
          const saved = await uploadBranchDocument(branchId, {
            file: systemFile,
            kind: "OTHER",
            notes: note,
          });
          invoicing.setLastSavedDocumentId(saved.id);
          notify.success(t("reports.orderAccountStatementSystemSaved"));
          setStepState("system", "done");
        }
      }

      if (invoicing.saveToSystem && Number.isFinite(parsedBranchId) && parsedBranchId > 0) {
        openBranchDetail(parsedBranchId, { initialTab: "currentAccount" });
      } else if (invoicing.saveAsInvoice) {
        router.push("/products/order-account-statement/summary");
      }
    } catch (error) {
      if (showMultiActionProgress) multiAction.setError(toErrorMessage(error));
      notify.error(toErrorMessage(error));
    } finally {
      if (showMultiActionProgress) multiAction.setRunning(false);
      setBusy(false);
    }
  }, [
    advanceDeduction,
    hasMultipleActions,
    identity,
    invoicing,
    lines,
    locale,
    multiAction,
    openBranchDetail,
    orderDocumentKey,
    parsedLines,
    parsedPaid,
    parsedPromo,
    previewRef,
    previousBalance,
    receivedAdvancePostToLedger,
    router,
    shipment,
    statementDate,
    suggestionsState,
    t,
    totals,
  ]);

  const onDownloadPdfClick = useCallback(() => {
    if (!hasMultipleActions) {
      void onDownloadPdf();
      return;
    }
    multiAction.openConfirm();
    void onDownloadPdf();
  }, [hasMultipleActions, multiAction, onDownloadPdf]);

  return {
    busy,
    setBusy,
    hasMultipleActions,
    onDownloadPdf,
    onDownloadPdfClick,
  };
}

// Re-export parsed types if oas-types doesn't already expose them.
// (Hook depends on these structurally; ensure no surprise breaks.)
