"use client";

import {
  useProductUnits,
  useProductsCatalog,
} from "@/modules/products/hooks/useProductQueries";
import { Select } from "@/shared/ui/Select";
import type { ProductUnitType } from "@/types/product";
import { useMemo } from "react";

type Props = {
  productId: number | null | undefined;
  /** Ürünün temel stok birimi (multi-unit kurulduysa) — dropdown'a ilk seçenek olarak eklenir. */
  baseUnit?: string | null;
  /** Ürünün legacy unit alanı; multi-unit kurulmamışsa fallback olarak kullanılır. */
  legacyUnit?: string | null;
  /** Tercih edilen bağlam: bu type'da `isDefault` olan birim ilk açılışta seçili gelir. */
  preferredContext?: ProductUnitType;
  value: string;
  onChange: (unitName: string) => void;
  disabled?: boolean;
  label?: string;
};

/**
 * Hareket formlarında ortak birim seçici. Tek seam:
 *   - product_units boş → dropdown göstermeye değmez, gizli/disabled döner ve
 *     parent'a "legacy mod" sinyali olarak boş string verir (backend `unitName=null`
 *     → passthrough yolu).
 *   - product_units dolu → temel birim + alternatif birimler listelenir; preferredContext
 *     varsa o type'taki default ilk seçili.
 *
 * Çoklu form (consume/snapshot/adjust + ileride warehouse) buradan tek noktadan beslenir → DRY.
 */
export function ProductUnitPicker({
  productId,
  baseUnit,
  legacyUnit,
  preferredContext = "ANY",
  value,
  onChange,
  disabled,
  label = "Birim",
}: Props) {
  const { data: units = [] } = useProductUnits(productId ?? null);
  // Caller baseUnit/legacyUnit paslamadıysa catalog'tan çek — başka tüm formda
  // her seferinde caller'ın resolve etmesi gerekmesin (DRY).
  const { data: catalog = [] } = useProductsCatalog(productId != null && productId > 0);
  const productInCatalog = useMemo(
    () => (productId ? catalog.find((p) => p.id === productId) : null),
    [catalog, productId]
  );

  const base = (
    baseUnit?.trim() ||
    productInCatalog?.stockUnit?.trim() ||
    legacyUnit?.trim() ||
    productInCatalog?.unit?.trim() ||
    ""
  ).trim();

  const options = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    if (base) list.push({ value: base, label: base });
    for (const u of units) {
      if (u.unitName.toLowerCase() === base.toLowerCase()) continue;
      list.push({
        value: u.unitName,
        label: `${u.unitName} (= ${u.toBaseFactor}${base ? ` × ${base}` : ""})`,
      });
    }
    return list;
  }, [units, base]);

  // Multi-unit yok ve legacy birim de yok → seçici göstermek anlamsız.
  if (options.length <= 1 && units.length === 0) {
    return null;
  }

  // Tek seçenek varsa (yalnız temel birim, alternatif yok) yine gizle — parent
  // empty string'le çalışır, backend legacy yolda kalır.
  if (options.length === 1) return null;

  // İlk render: değer boş ve productId varsa preferredContext default'una set et.
  const initial = (() => {
    if (value) return value;
    const ctxDefault = units.find((u) => u.unitType === preferredContext && u.isDefault);
    if (ctxDefault) return ctxDefault.unitName;
    const anyDefault = units.find((u) => u.isDefault);
    return anyDefault?.unitName ?? base;
  })();

  if (initial && initial !== value) {
    // İlk seçimi parent'a aktar — controlled component pattern'ine uygun
    queueMicrotask(() => onChange(initial));
  }

  return (
    <Select
      label={label}
      name="product-unit-picker"
      options={options}
      value={value || initial}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {}}
      disabled={disabled}
    />
  );
}
