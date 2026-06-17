"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { RichCombobox } from "@/shared/ui/RichCombobox";
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
 * ve "+ Genel Tahsilat Al" modal'ında ortak kullanılır.
 * Shared RichCombobox üstüne — aramalı, modal-friendly z-index'li, codebase standardı.
 */
export function ReceiptKindSelect({ value, onChange, label, allowedKinds }: Props) {
  const { t } = useI18n();
  const items = useMemo(
    () => (allowedKinds ? KIND_KEYS.filter((k) => allowedKinds.includes(k.value)) : KIND_KEYS),
    [allowedKinds]
  );
  const options = useMemo(
    () => items.map((k) => ({ value: k.value, title: t(k.labelKey) })),
    [items, t]
  );
  const heading = label ?? t("branch.ledgerModalKind");
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{heading}</label>
      <RichCombobox
        value={value}
        onChange={(v) => onChange(v as CustomerAccountReceiptKind)}
        options={options}
        placeholder={t("common.select")}
        searchPlaceholder={t("common.search")}
        emptyText={t("common.noResults")}
      />
    </div>
  );
}
