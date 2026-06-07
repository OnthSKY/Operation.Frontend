"use client";

import { useProductUnits } from "@/modules/products/hooks/useProductQueries";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useMemo } from "react";

type Props = {
  productId: number | null;
  /**
   * Ürünün TEMEL birim adı (stock_unit) — combobox'ın ilk seçeneği.
   * Caller catalog'dan p.stockUnit ?? p.unit olarak çekmeli.
   */
  baseUnit?: string | null;
  /** Eski legacy/serbest metin — fallback olarak listeye eklenir (kayıp olmasın). */
  fallbackUnit?: string | null;
  value: string;
  onChange: (next: string) => void;
  /** Combobox veya text input için ortak class. */
  className?: string;
  placeholder?: string;
  /** Picker name (shared Select'ten formdaki tekillik için). */
  name?: string;
};

/**
 * OAS satır birim girişi. Ürün için product_units tablosunda kayıt varsa shared
 * `Select` combobox'ı render eder (temel + alternatifler); yoksa serbest metin
 * input'una düşer (eski davranış korunur).
 */
export function OasLineUnitInput({
  productId,
  baseUnit,
  fallbackUnit,
  value,
  onChange,
  className,
  placeholder,
  name = "oas-line-unit",
}: Props) {
  const enabled = productId != null && productId > 0;
  const { data: units = [] } = useProductUnits(enabled ? productId : null);

  const valueTrim = value.trim();

  const selectOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    const push = (label: string) => {
      const v = label.trim();
      if (!v) return;
      const key = v.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ value: v, label: v });
    };
    // Sıralama: önce TEMEL birim (stock_unit), sonra legacy/fallback, sonra alternatifler.
    push(baseUnit ?? "");
    push(fallbackUnit ?? "");
    for (const u of units) push(u.unitName);
    // Kullanıcının eski manuel girişi listede yoksa onu da göster.
    push(valueTrim);
    return out;
  }, [units, baseUnit, fallbackUnit, valueTrim]);

  // Alternatif birim tanımı yoksa serbest text girilebilsin (eski davranış).
  if (units.length === 0) {
    return (
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    );
  }

  // Shared Select default'u uzun (min-h 44px, sm:48px) — OAS satırındaki diğer
  // inputlarla aynı kompakt yükseklikte göstermek için `!` override ile sıkıştırıyoruz.
  // Görsel olarak miktar / birim tutarı input'larıyla aynı hizada durur.
  const compactOverrides =
    "!h-auto !min-h-0 !rounded-md !border-zinc-200 !pl-2 !pr-7 !py-1.5 !text-sm sm:!text-sm md:!h-auto";

  return (
    <Select
      name={name}
      ariaLabel={placeholder ?? "Birim"}
      options={selectOptions}
      value={valueTrim}
      onChange={(ev) => onChange(ev.target.value)}
      onBlur={() => {}}
      className={`${compactOverrides} ${className ?? ""}`}
    />
  );
}
