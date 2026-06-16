"use client";

import { useCallback } from "react";
import { formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import {
  emptyLine,
  newId,
} from "@/modules/order-account-statement/components/oas-helpers";
import {
  SAMPLE_LINES,
  SAMPLE_CAFE,
  SAMPLE_BAKERY,
  SAMPLE_CATERING,
} from "@/modules/order-account-statement/components/oas-sample-data";
import type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";
import type { useOasInvoicing } from "@/modules/order-account-statement/hooks/useOasInvoicing";
import type { useOasLines } from "@/modules/order-account-statement/hooks/useOasLines";
import type { useOasPreview } from "@/modules/order-account-statement/hooks/useOasPreview";
import type { useOasShipmentSelection } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";

/**
 * Hazır şablon (TEKİN, Cafe, Bakery, Catering) doldurma + içerik preset uygulama +
 * form sıfırlama handler'larını tek noktada toplar.
 *
 * State hook'larını "bucket" olarak alır (DI). Bu sayede preset davranışı tek dosyada,
 * orchestrator'ı bu detaylardan arındırır (SRP).
 */
type Params = {
  locale: "tr" | "en";
  identity: ReturnType<typeof useOasIdentity>;
  invoicing: ReturnType<typeof useOasInvoicing>;
  linesState: ReturnType<typeof useOasLines>;
  preview: ReturnType<typeof useOasPreview>;
  shipment: ReturnType<typeof useOasShipmentSelection>;
  setOrderDocumentKey: React.Dispatch<React.SetStateAction<string>>;
  /** URL'den shipment prefill geliyorsa resetForm bunu shipmentBased modunda korur. */
  shipmentPrefillActive: boolean;
};

export function useOasSamplePresets(params: Params) {
  const {
    locale,
    identity,
    invoicing,
    linesState,
    preview,
    shipment,
    setOrderDocumentKey,
    shipmentPrefillActive,
  } = params;

  const fillTekinSample = useCallback(() => {
    identity.setCompanyName("TEKİN USTA DONDURMA");
    identity.setBranchName("Denizli Şubesi");
    identity.setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    linesState.setLines(
      SAMPLE_LINES.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
        // Preset amount'larını koruyalım — auto-apply qty*price ile ezmesin.
        amountTouched: s.amount > 0,
      }))
    );
    linesState.setPromoLines([
      {
        id: newId(),
        description: "Kira",
        amount: 750_000,
        amountText: formatLocaleAmountInput(750_000, locale),
      },
    ]);
    linesState.setAdvanceText(formatLocaleAmountInput(250_000, locale));
    linesState.setPreviousBalanceText(formatLocaleAmountInput(180_000, locale));
    linesState.setPaidLines([
      {
        id: newId(),
        description: "6 Adet Difiriz",
        amount: 306_000,
        amountText: formatLocaleAmountInput(306_000, locale),
      },
    ]);
    preview.setShowQuantityColumn(true);
    preview.setContentPreset("tekin");
  }, [identity, linesState, locale, preview]);

  const fillCafeSample = useCallback(() => {
    identity.setCompanyName("Örnek İşletme A.Ş.");
    identity.setBranchName("Merkez Şube");
    identity.setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    linesState.setLines(
      SAMPLE_CAFE.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    linesState.setPromoLines([]);
    linesState.setAdvanceText("");
    linesState.setPreviousBalanceText("");
    linesState.setPaidLines([]);
    preview.setShowQuantityColumn(true);
    preview.setContentPreset("cafe");
  }, [identity, linesState, locale, preview]);

  const fillBakerySample = useCallback(() => {
    identity.setCompanyName(locale === "tr" ? "Örnek Fırın Unlu Mamuller" : "Sample Bakery Co.");
    identity.setBranchName(locale === "tr" ? "Merkez üretim" : "Central production");
    identity.setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    linesState.setLines(
      SAMPLE_BAKERY.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    linesState.setPromoLines([
      {
        id: newId(),
        description: locale === "tr" ? "Bayi kampanya indirimi" : "Promotional discount",
        amount: 1_200,
        amountText: formatLocaleAmountInput(1_200, locale),
      },
    ]);
    linesState.setAdvanceText("");
    linesState.setPreviousBalanceText("");
    linesState.setPaidLines([]);
    preview.setShowQuantityColumn(true);
    preview.setContentPreset("bakery");
  }, [identity, linesState, locale, preview]);

  const fillCateringSample = useCallback(() => {
    identity.setCompanyName(locale === "tr" ? "Örnek Catering Hizmetleri" : "Sample Catering Services");
    identity.setBranchName(locale === "tr" ? "Etkinlik: Gala gecesi" : "Event: gala dinner");
    identity.setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    linesState.setLines(
      SAMPLE_CATERING.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    linesState.setPromoLines([]);
    linesState.setAdvanceText(formatLocaleAmountInput(50_000, locale));
    linesState.setPreviousBalanceText("");
    linesState.setPaidLines([
      {
        id: newId(),
        description: locale === "tr" ? "Nakliye (dışarıdan ödenen)" : "Transport (paid externally)",
        amount: 9_500,
        amountText: formatLocaleAmountInput(9_500, locale),
      },
    ]);
    preview.setShowQuantityColumn(true);
    preview.setContentPreset("catering");
  }, [identity, linesState, locale, preview]);

  const applyContentPreset = useCallback(
    (v: OrderAccountContentPreset) => {
      if (v === "custom") preview.setContentPreset("custom");
      else if (v === "tekin") fillTekinSample();
      else if (v === "cafe") fillCafeSample();
      else if (v === "bakery") fillBakerySample();
      else if (v === "catering") fillCateringSample();
    },
    [fillBakerySample, fillCafeSample, fillCateringSample, fillTekinSample, preview]
  );

  /** Sihirli düğme: seçilen örnek şablona göre formu doldurur; "Özel" seçiliyken varsayılan toptan örneğini uygular. */
  const applySampleFromPreset = useCallback(() => {
    if (preview.contentPreset === "custom") {
      fillTekinSample();
      return;
    }
    applyContentPreset(preview.contentPreset);
  }, [applyContentPreset, fillTekinSample, preview.contentPreset]);

  const resetForm = useCallback(() => {
    identity.setCompanyName(identity.defaultCompanyName);
    identity.setBranchName("");
    identity.setLinkedBranchId("");
    invoicing.setSaveToSystem(true);
    invoicing.setSaveAsInvoice(false);
    invoicing.setInvoiceAutoPost(true);
    invoicing.setCustomerAccountIdText("");
    invoicing.setPaymentIban("");
    invoicing.setPaymentAccountHolder("");
    invoicing.setPaymentBankName("");
    invoicing.setPaymentNote("");
    invoicing.setShowPaymentOnPdf(true);
    invoicing.setLastCreatedInvoiceNo("");
    invoicing.setLastCreatedInvoiceId(null);
    invoicing.setLastSavedDocumentId(null);
    setOrderDocumentKey(`oas-${Date.now().toString(36)}`);
    identity.setEmblemDataUrl(identity.defaultEmblemDataUrl);
    identity.setDocumentTitle(identity.defaultCompanyName);
    identity.setShowDocumentTagline(true);
    linesState.setLines([emptyLine()]);
    linesState.setPaidLines([]);
    linesState.setPromoLines([]);
    linesState.setAdvanceText("");
    linesState.setPreviousBalanceText("");
    preview.setContentPreset("custom");
    preview.setLayoutVariant("corporate");
    shipment.setCreationMode(shipmentPrefillActive ? "shipmentBased" : "manual");
    shipment.setShipmentLinkMode("strict");
    shipment.setSelectedShipmentSource(null);
    shipment.setSelectedShipmentProductKind("unknown");
    shipment.setShipmentInvoiceability([]);
    preview.setShowQuantityColumn(true);
  }, [
    identity,
    invoicing,
    linesState,
    preview,
    setOrderDocumentKey,
    shipment,
    shipmentPrefillActive,
  ]);

  return {
    fillTekinSample,
    fillCafeSample,
    fillBakerySample,
    fillCateringSample,
    applyContentPreset,
    applySampleFromPreset,
    resetForm,
  };
}
