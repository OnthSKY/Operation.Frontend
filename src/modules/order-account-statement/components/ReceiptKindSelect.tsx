"use client";

import { useI18n } from "@/i18n/context";
import type { CustomerAccountReceiptKind } from "@/modules/order-account-statement/api/customer-accounts-api";

const KIND_KEYS: { value: CustomerAccountReceiptKind; labelKey: string }[] = [
  { value: "cash", labelKey: "branch.ledgerModalKindCash" },
  { value: "bank_transfer", labelKey: "branch.ledgerModalKindBankTransfer" },
  { value: "check", labelKey: "branch.ledgerModalKindCheck" },
  { value: "promo_discount", labelKey: "branch.ledgerModalKindPromo" },
  { value: "advance_payment", labelKey: "branch.ledgerModalKindAdvance" },
  { value: "other", labelKey: "branch.ledgerModalKindOther" },
];

type Props = {
  value: CustomerAccountReceiptKind;
  onChange: (value: CustomerAccountReceiptKind) => void;
  label?: string;
  /** Sadece belirli kindları göstermek için filtre. Boş ise hepsi gösterilir. */
  allowedKinds?: CustomerAccountReceiptKind[];
};

/**
 * Tahsilat türü seçici — Faturalar tab'inde fatura bazlı tahsilat dialog'unda
 * ve "+ Genel Tahsilat Al" modal'ında ortak kullanılır. Tek kaynak → tutarlı UX.
 */
export function ReceiptKindSelect({ value, onChange, label, allowedKinds }: Props) {
  const { t } = useI18n();
  const items = allowedKinds
    ? KIND_KEYS.filter((k) => allowedKinds.includes(k.value))
    : KIND_KEYS;
  const heading = label ?? t("branch.ledgerModalKind");
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{heading}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CustomerAccountReceiptKind)}
        className="block h-11 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/80 sm:h-12 sm:text-base"
      >
        {items.map((k) => (
          <option key={k.value} value={k.value}>
            {t(k.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
