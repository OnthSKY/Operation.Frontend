import type {
  OrderAccountLine,
  PaidOnBehalfLine,
  PromoDeductionLine,
} from "@/modules/order-account-statement/lib/compute-order-account-totals";

/**
 * Order Account Statement formunun "draft" (düzenleme sırasındaki) satır tipleri.
 * Domain satırlarının üzerine form-only metin alanlarını ekler.
 * (OrderAccountStatementScreen.tsx'ten Faz-1 refactor kapsamında çıkarıldı.)
 */

export type LineDraft = OrderAccountLine & {
  amountText: string;
  /** Form alanı: PDF adet sütununa yansır (boş bırakılabilir) */
  quantityText: string;
  /** Form alanı: PDF birim sütununa yansır (ör. kg, koli, adet). */
  unitText?: string;
  /** Tutar önerisi: parça mı kg mı hesaplanacak */
  priceCalcMode: "piece" | "kg";
  qtyText: string;
  unitPriceText: string;
  kgText: string;
  tryPerKgText: string;
  selectedProductId?: number | null;
  parentProductId?: number | null;
  parentProductName?: string | null;
  lineSource?: "shipment" | "manual";
  manualReasonCode?: string | null;
  sourceShipmentLineId?: number | null;
  sourceWarehouseMovementId?: number | null;
};

export type PaidDraft = PaidOnBehalfLine & { amountText: string };
export type PromoDraft = PromoDeductionLine & { amountText: string };

/** İçerik şablonu seçimi (örnek doldurma / boş başlama). */
export type OrderAccountContentPreset = "custom" | "tekin" | "cafe" | "bakery" | "catering";
