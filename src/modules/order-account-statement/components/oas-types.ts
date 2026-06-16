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
  /**
   * Kullanıcı tutar alanına bir kez elle dokunduysa true olur.
   * `LineCalcBlock` öneri auto-apply effect'i bu flag true ise yazma yapmaz —
   * istisnai durumlarda (yuvarlama, iskonto vb.) elle girilen değer korunur.
   * Calc modal'ından "Uygula" yine flag'i false'a çekerek auto kontrolü geri alır.
   */
  amountTouched?: boolean;
  /** Form alanı: PDF adet sütununa yansır (boş bırakılabilir) */
  quantityText: string;
  /** Form alanı: PDF birim sütununa yansır (ör. kg, koli, adet). */
  unitText?: string;
  unitPriceText: string;
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
