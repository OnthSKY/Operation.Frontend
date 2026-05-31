import type { Locale } from "@/i18n/messages";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  OrderAccountLine,
  PaidOnBehalfLine,
  PromoDeductionLine,
} from "@/modules/order-account-statement/lib/compute-order-account-totals";
import type {
  LineDraft,
  PaidDraft,
  PromoDraft,
} from "@/modules/order-account-statement/components/oas-types";

/**
 * Order Account Statement formunun saf yardımcıları: draft fabrikaları, satır
 * parse'lama ve doküman metadata üretimi. Hiçbiri React state'ine bağlı değildir,
 * bu yüzden bağımsız olarak test edilebilirler.
 * (OrderAccountStatementScreen.tsx'ten Faz-1 refactor kapsamında çıkarıldı.)
 */

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyLine(): LineDraft {
  return {
    id: newId(),
    description: "",
    quantityText: "",
    unitText: "",
    amount: 0,
    amountText: "",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "",
    unitPriceText: "",
    kgText: "",
    tryPerKgText: "",
    selectedProductId: null,
    parentProductId: null,
    parentProductName: null,
    lineSource: "manual",
    manualReasonCode: "OPS_OTHER",
    sourceShipmentLineId: null,
    sourceWarehouseMovementId: null,
  };
}

export function emptyPaid(): PaidDraft {
  return { id: newId(), description: "", amount: 0, amountText: "" };
}

export function emptyPromo(): PromoDraft {
  return { id: newId(), description: "", amount: 0, amountText: "" };
}

const LINE_AMOUNT_MISMATCH_TOLERANCE = 0.01;

export function computeLineAmountMismatch(
  line: Pick<LineDraft, "quantityText" | "unitText" | "unitPriceText" | "amountText" | "amount">,
  locale: Locale
): { expected: number; actual: number; diff: number } | null {
  const qty = parseLocaleAmount((line.quantityText ?? "").trim(), locale);
  const unitPrice = parseLocaleAmount((line.unitPriceText ?? "").trim(), locale);
  const unit = (line.unitText ?? "").trim();
  const explicitAmount = parseLocaleAmount((line.amountText ?? "").trim(), locale);
  const actual = Number.isFinite(explicitAmount) ? explicitAmount : Number(line.amount) || 0;
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
  if (!unit) return null;
  if (!Number.isFinite(actual) || actual < 0) return null;
  const expected = qty * unitPrice;
  const diff = Math.abs(expected - actual);
  if (diff <= LINE_AMOUNT_MISMATCH_TOLERANCE) return null;
  return { expected, actual, diff };
}

export function isoDateStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function isoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildOrderAccountDocumentMetadata(input: {
  orderDocumentKey: string;
  pdfDocumentNo?: string | null;
  companyName: string;
  branchName: string;
  title: string;
  invoiceId?: number | null;
  invoiceNo?: string | null;
  counterpartyLabel?: string | null;
  receivedAdvanceAmount?: number | null;
  receivedAdvancePostToLedger?: boolean | null;
  giftAmount?: number | null;
  promoAmount?: number | null;
  advanceAmount?: number | null;
  previousBalance?: number | null;
  shipmentWarehouseId?: number | null;
  shipmentPrimaryMovementId?: number | null;
  shipmentMovementIds?: number[] | null;
}): string {
  const MAX_NOTE_LEN = 480;
  const parts = [
    "Sipariş-hesap dökümü PDF",
    `orderKey=${input.orderDocumentKey}`,
    `pdfDocumentNo=${input.pdfDocumentNo?.trim() || input.orderDocumentKey}`,
    `company=${input.companyName || "—"}`,
    `branch=${input.branchName || "—"}`,
    `title=${input.title || "—"}`,
  ];
  if (input.invoiceId && Number.isFinite(input.invoiceId)) parts.push(`invoiceId=${input.invoiceId}`);
  if (input.invoiceNo?.trim()) parts.push(`invoiceNo=${input.invoiceNo.trim()}`);
  if (input.counterpartyLabel?.trim()) parts.push(`counterparty=${input.counterpartyLabel.trim()}`);
  if (Number.isFinite(input.shipmentWarehouseId) && (input.shipmentWarehouseId ?? 0) > 0) {
    parts.push(`shipmentWarehouseId=${input.shipmentWarehouseId}`);
  }
  if (Number.isFinite(input.shipmentPrimaryMovementId) && (input.shipmentPrimaryMovementId ?? 0) > 0) {
    parts.push(`shipmentPrimaryMovementId=${input.shipmentPrimaryMovementId}`);
  }
  if (Array.isArray(input.shipmentMovementIds) && input.shipmentMovementIds.length > 0) {
    const ids = input.shipmentMovementIds.filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length > 0) {
      const preview = ids.slice(0, 12).join(",");
      const suffix = ids.length > 12 ? `...(+${ids.length - 12})` : "";
      parts.push(`shipmentMovementIds=${preview}${suffix}`);
    }
  }
  if (Number.isFinite(input.receivedAdvanceAmount) && (input.receivedAdvanceAmount ?? 0) > 0) {
    parts.push(`receivedAdvance=${input.receivedAdvanceAmount}`);
    if (input.receivedAdvancePostToLedger != null) {
      parts.push(`receivedAdvanceLedger=${input.receivedAdvancePostToLedger ? "yes" : "no"}`);
    }
  }
  if (Number.isFinite(input.giftAmount) && (input.giftAmount ?? 0) > 0) {
    parts.push(`giftAmount=${input.giftAmount}`);
  }
  if (Number.isFinite(input.promoAmount) && (input.promoAmount ?? 0) > 0) {
    parts.push(`promoAmount=${input.promoAmount}`);
  }
  if (Number.isFinite(input.advanceAmount) && (input.advanceAmount ?? 0) > 0) {
    parts.push(`advanceAmount=${input.advanceAmount}`);
  }
  if (Number.isFinite(input.previousBalance) && (input.previousBalance ?? 0) > 0) {
    parts.push(`previousBalance=${input.previousBalance}`);
  }
  const full = parts.join(" · ");
  if (full.length <= MAX_NOTE_LEN) return full;
  return `${full.slice(0, MAX_NOTE_LEN - 3)}...`;
}

export function parseLines(lines: LineDraft[], locale: Locale): OrderAccountLine[] {
  const resolveLineAmount = (line: LineDraft): number => {
    const explicitAmount = parseLocaleAmount((line.amountText ?? "").trim(), locale);
    if (Number.isFinite(explicitAmount) && explicitAmount > 0) return explicitAmount;

    const qty = parseLocaleAmount((line.quantityText ?? "").trim(), locale);
    const unitPrice = parseLocaleAmount((line.unitPriceText ?? "").trim(), locale);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
      return qty * unitPrice;
    }

    return Number.isFinite(line.amount) && line.amount > 0 ? line.amount : 0;
  };

  return lines.map((l) => {
    const q = (l.quantityText ?? "").trim();
    const unit = (l.unitText ?? "").trim();
    const u = (l.unitPriceText ?? "").trim();
    return {
      id: l.id,
      description: l.description.trim(),
      amount: resolveLineAmount(l),
      isGift: l.isGift,
      lineSource: l.lineSource ?? "manual",
      manualReasonCode: l.manualReasonCode ?? "OPS_OTHER",
      sourceShipmentLineId: l.sourceShipmentLineId ?? null,
      sourceWarehouseMovementId: l.sourceWarehouseMovementId ?? null,
      ...(q ? { quantityText: q } : {}),
      ...(unit ? { unitText: unit } : {}),
      ...(u ? { unitPriceText: u } : {}),
    };
  });
}

export function parsePaid(lines: PaidDraft[], locale: Locale): PaidOnBehalfLine[] {
  return lines.map((l) => ({
    id: l.id,
    description: l.description.trim(),
    amount: parseLocaleAmount(l.amountText, locale) || 0,
  }));
}

export function parsePromo(lines: PromoDraft[], locale: Locale): PromoDeductionLine[] {
  return lines.map((l) => ({
    id: l.id,
    description: l.description.trim(),
    amount: parseLocaleAmount(l.amountText, locale) || 0,
  }));
}
