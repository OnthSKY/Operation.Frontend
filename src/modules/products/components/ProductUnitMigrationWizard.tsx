"use client";

import {
  useApplyProductUnitMigration,
  useProductUnitMigrationPreview,
} from "@/modules/products/hooks/useProductQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { ProductUnitType } from "@/types/product";
import { useEffect, useMemo, useState } from "react";

type Props = {
  productId: number;
  /** Sihirbaz başarıyla tamamlandığında parent bilgilendirilsin (örn. tab refresh). */
  onCompleted?: () => void;
};

const UNIT_TYPE_OPTIONS: { value: ProductUnitType; label: string }[] = [
  { value: "ANY", label: "Her bağlam" },
  { value: "PURCHASE", label: "Alış" },
  { value: "TRANSFER", label: "Sevkiyat" },
  { value: "SALE", label: "Satış" },
];

/**
 * Çoklu birim ilk kurulumu için sihirbaz. Geçmiş hareketlerin yeni temel birime
 * doğru çevrilmesini garanti eder. Kullanıcı onaylamadan birim listesi açılmaz.
 *
 * Kapsam:
 *  - Stock unit henüz boş ve ürünün entered_unit IS NULL hareketleri varsa
 *    render edilir (`preview.requiresMigration`).
 *  - Aksi halde null döner; üst tab normal birim yöneticisini gösterir.
 */
export function ProductUnitMigrationWizard({ productId, onCompleted }: Props) {
  const { data: preview, isPending, isError, error } = useProductUnitMigrationPreview(productId, true);
  const applyMut = useApplyProductUnitMigration();

  const [baseUnit, setBaseUnit] = useState("");
  const [legacyUnitName, setLegacyUnitName] = useState("");
  const [factorText, setFactorText] = useState("");
  const [legacyUnitType, setLegacyUnitType] = useState<ProductUnitType>("PURCHASE");

  // Preview geldiğinde alanları akıllı default'larla doldur:
  //   - legacy isim için: kullanıcının "Paket (25'li)" gibi serbest girdiğini kısalt
  //     etmek doğru değil — sadece taslak öner, kullanıcı düzenler.
  //   - faktör için: "(\d+)" yakalanabiliyorsa varsayılan; aksi halde boş.
  useEffect(() => {
    if (!preview || !preview.requiresMigration) return;
    if (legacyUnitName === "") setLegacyUnitName(preview.legacyUnitLabel ?? "");
    if (factorText === "") {
      const match = (preview.legacyUnitLabel ?? "").match(/(\d+(?:[.,]\d+)?)/);
      if (match) setFactorText(match[1].replace(",", "."));
    }
  }, [preview, legacyUnitName, factorText]);

  const totalMovements = useMemo(() => {
    if (!preview) return 0;
    return (
      preview.legacyWarehouseMovementCount +
      preview.legacyBranchStockMovementCount +
      preview.legacyBranchStockConsumptionCount
    );
  }, [preview]);

  if (isPending) {
    return <p className="text-sm text-zinc-500">Geçmiş hareketler taranıyor...</p>;
  }
  if (isError) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        Hareket geçmişi yüklenemedi: {toErrorMessage(error)}
      </p>
    );
  }
  if (!preview || !preview.requiresMigration) {
    // Hizalı return — üst tab normal yöneticiyi render eder.
    return null;
  }

  const factor = Number(factorText.replace(",", "."));
  const factorValid = Number.isFinite(factor) && factor > 0;
  const baseValid = baseUnit.trim().length > 0;
  const legacyValid = legacyUnitName.trim().length > 0;
  const sameUnit =
    baseUnit.trim().toLowerCase() === legacyUnitName.trim().toLowerCase() && baseValid;
  const factorContradicts = sameUnit && factor !== 1;
  const canApply = factorValid && baseValid && legacyValid && !factorContradicts && !applyMut.isPending;

  const applyConversion = async () => {
    try {
      const result = await applyMut.mutateAsync({
        productId,
        input: {
          baseUnit: baseUnit.trim(),
          legacyUnitName: legacyUnitName.trim(),
          legacyToBaseFactor: factor,
          legacyUnitType,
        },
      });
      notify.success(
        `Çevrim tamam: ${result.updatedWarehouseMovements} depo + ${result.updatedBranchStockMovements} şube + ${result.updatedBranchStockConsumptions} tüketim hareketi güncellendi.`,
      );
      onCompleted?.();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onSubmit = () => {
    if (!canApply) return;
    notifyConfirmToast({
      toastId: `product-unit-migration-${productId}`,
      message: `${totalMovements} geçmiş hareketin miktarları "${legacyUnitName.trim()}" → "${baseUnit.trim()}" dönüşümü ile (×${factor}) güncellenecek. Onaylıyor musunuz?`,
      cancelLabel: "İptal",
      confirmLabel: "Onayla ve çevir",
      tone: "warning",
      onConfirm: () => {
        void applyConversion();
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:p-4">
      <div>
        <p className="text-sm font-semibold text-amber-900">Çoklu birime geçiş gerekli</p>
        <p className="mt-1 text-xs text-amber-800">
          Bu ürün için <strong>{totalMovements}</strong> hareket eski tek-birim modunda
          kaydedilmiş. Eski kayıtların hangi birim ile girildiğini ve yeni temel birime
          nasıl çevrileceğini belirtin.
        </p>
        <ul className="mt-2 text-xs text-amber-800">
          <li>Depo hareketleri: {preview.legacyWarehouseMovementCount}</li>
          <li>Şube alış (sevkiyat) hareketleri: {preview.legacyBranchStockMovementCount}</li>
          <li>Şube tüketim/sayım hareketleri: {preview.legacyBranchStockConsumptionCount}</li>
        </ul>
      </div>

      <div className="space-y-2 rounded-md border border-amber-300 bg-white p-3">
        <p className="text-xs font-semibold text-amber-900">
          1. Yeni temel stok birimi
        </p>
        <p className="text-[11px] text-amber-800">
          En küçük, <strong>bölünemez</strong> birim. Tüm satışlar/sevkiyatlar bu birim
          cinsinden saklanacak. Örn. paket içinde ürün varsa <code>adet</code>; kg'la
          satılıyorsa <code>gram</code>.
        </p>
        <Input
          label=""
          placeholder="adet"
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value)}
          autoComplete="off"
          maxLength={30}
        />
      </div>

      <div className="space-y-2 rounded-md border border-amber-300 bg-white p-3">
        <p className="text-xs font-semibold text-amber-900">
          2. Eski hareketlerin birim adı
        </p>
        <p className="text-[11px] text-amber-800">
          Şu ana kadar yazdığın hareketler hangi birimde girilmişti? (Genelde ürün
          kartındaki eski "birim" yazısı: <strong>{preview.legacyUnitLabel ?? "—"}</strong>)
        </p>
        <Input
          label=""
          placeholder="paket"
          value={legacyUnitName}
          onChange={(e) => setLegacyUnitName(e.target.value)}
          autoComplete="off"
          maxLength={30}
        />
      </div>

      <div className="space-y-2 rounded-md border border-amber-300 bg-white p-3">
        <p className="text-xs font-semibold text-amber-900">
          3. Katsayı: 1 {legacyUnitName.trim() || "[eski]"} = kaç {baseUnit.trim() || "[temel]"}?
        </p>
        <p className="text-[11px] text-amber-800">
          Örn. paket 25'li ise <code>25</code>; kg → gram için <code>1000</code>.
        </p>
        <Input
          label=""
          placeholder="25"
          inputMode="decimal"
          value={factorText}
          onChange={(e) => setFactorText(e.target.value)}
          autoComplete="off"
        />
        <Select
          label="Eski birim hangi bağlamda kullanılır?"
          name="legacy-unit-type"
          options={UNIT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={legacyUnitType}
          onChange={(e) => setLegacyUnitType(e.target.value as ProductUnitType)}
          onBlur={() => {}}
        />
      </div>

      {factorContradicts ? (
        <p className="text-xs text-red-700">
          Temel birim ile eski birim aynıysa katsayı 1 olmalı.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-amber-800">
          Önizleme: {totalMovements} hareket{" "}
          <span className="font-medium">
            {factorValid ? `× ${factor}` : "×?"}
          </span>{" "}
          ile çevrilecek.
        </p>
        <Button type="button" onClick={onSubmit} disabled={!canApply} className="w-full sm:w-auto">
          {applyMut.isPending ? "Uygulanıyor..." : "Çevir ve devam et"}
        </Button>
      </div>
    </div>
  );
}
