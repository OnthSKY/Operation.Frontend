import type { SelectOption } from "@/shared/ui/Select";

/** ISO 4217 — şube/personel/avans formlarında seçim. */
export const DEFAULT_CURRENCY = "TRY";

export const currencySelectOptions = (): SelectOption[] => [
  { value: "TRY", label: "₺ TRY" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];
