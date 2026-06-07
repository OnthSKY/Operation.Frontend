"use client";

import { Input } from "@/shared/ui/Input";

type Props = {
  stockUnit: string;
  onStockUnitChange: (next: string) => void;
  disabled?: boolean;
};

/**
 * Ürünün multi-unit temel stok birimi alanı. Stok düşüm modu (anlık vs gün sonu) ürün
 * tanım anında erken karar olduğu için UI'da sorulmaz; backend default olarak INHERIT
 * yazar (şirket varsayılanı). İleride manuel düşüm + satış akışları ayrıştırılınca
 * yeniden eklenebilir.
 */
export function ProductStockSettingsFields({
  stockUnit,
  onStockUnitChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <Input
        label="Temel stok birimi"
        placeholder="örn. adet, gram, ml"
        value={stockUnit}
        onChange={(e) => onStockUnitChange(e.target.value)}
        autoComplete="off"
        maxLength={30}
        disabled={disabled}
      />
      <p className="-mt-1 text-xs text-zinc-500">
        Stok bu birim cinsinden tutulur. Boş bırakırsanız sistem eski tek-birim
        davranışını sürdürür. Alternatif birimleri (paket, kg, top, ...) ürün
        kaydedildikten sonra detay ekranından tanımlayabilirsiniz.
      </p>
    </div>
  );
}
