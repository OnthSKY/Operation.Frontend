"use client";

import {
  useProductUnitMigrationPreview,
  useSetProductStockUnit,
} from "@/modules/products/hooks/useProductQueries";
import { ProductUnitMigrationWizard } from "@/modules/products/components/ProductUnitMigrationWizard";
import { ProductUnitsManager } from "@/modules/products/components/ProductUnitsManager";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { useState } from "react";

type Props = {
  productId: number;
  legacyUnitLabel: string | null;
};

type Mode = "choose" | "set-only" | "convert";

/**
 * Birimler tab gövdesi. Kullanıcı şu üç durumdan birinde olur:
 *  - Hiç hareket yok ya da stock_unit set → manager direkt görünür.
 *  - stock_unit boş + geçmiş hareket var → kullanıcıya seçim ekranı:
 *      A) Sadece çoklu birim ekle (eskiler ESKİ KALIR)
 *      B) Eskileri de yeni temel birime çevir (sihirbaz)
 *  - stock_unit boş + hareket yok → minik "temel birim belirle" widget'ı.
 */
export function ProductUnitsTabContent({ productId, legacyUnitLabel }: Props) {
  const { data: preview, isPending } = useProductUnitMigrationPreview(productId, true);
  const setStockUnit = useSetProductStockUnit();
  const [newBaseUnit, setNewBaseUnit] = useState("");
  const [mode, setMode] = useState<Mode>("choose");

  if (isPending) {
    return <p className="text-sm text-zinc-500">Yükleniyor...</p>;
  }

  const stockUnit = preview?.currentStockUnit ?? null;
  const totalLegacy =
    (preview?.legacyWarehouseMovementCount ?? 0) +
    (preview?.legacyBranchStockMovementCount ?? 0) +
    (preview?.legacyBranchStockConsumptionCount ?? 0);

  const onSetStockUnit = async () => {
    const v = newBaseUnit.trim();
    if (!v) return;
    try {
      await setStockUnit.mutateAsync({ productId, baseUnit: v });
      notify.success("Temel stok birimi kaydedildi.");
      setNewBaseUnit("");
      setMode("choose");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  // 1) stock_unit zaten kurulmuş → direkt manager.
  if (stockUnit) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <span className="font-medium">Temel stok birimi:</span> {stockUnit}
        </div>
        <ProductUnitsManager productId={productId} baseUnitLabel={stockUnit} />
      </div>
    );
  }

  // 2) stock_unit boş + geçmiş hareket yok → sade "set" widget'ı.
  if (totalLegacy === 0) {
    return (
      <div className="space-y-3">
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Önce temel stok birimini belirleyin
          </p>
          <p className="text-[11px] text-amber-800">
            Alternatif birimler bu birime göre tanımlanır (örn. <code>adet</code>,
            <code>gram</code>).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label=""
              placeholder="adet"
              value={newBaseUnit}
              onChange={(e) => setNewBaseUnit(e.target.value)}
              autoComplete="off"
              maxLength={30}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => void onSetStockUnit()}
              disabled={!newBaseUnit.trim() || setStockUnit.isPending}
              className="w-full sm:w-auto"
            >
              {setStockUnit.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
        <ProductUnitsManager productId={productId} baseUnitLabel={legacyUnitLabel} />
      </div>
    );
  }

  // 3) stock_unit boş + geçmiş hareket var → kullanıcı seçimi.
  if (mode === "convert") {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMode("choose")}
          className="self-start"
        >
          ← Geri (seçim ekranı)
        </Button>
        <ProductUnitMigrationWizard
          productId={productId}
          onCompleted={() => setMode("choose")}
        />
      </div>
    );
  }

  if (mode === "set-only") {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMode("choose")}
          className="self-start"
        >
          ← Geri (seçim ekranı)
        </Button>
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Yeni temel stok birimi
          </p>
          <p className="text-[11px] text-amber-800">
            Eski {totalLegacy} hareket olduğu gibi kalacak — rakamlar artık bu birim
            cinsinden yorumlanacak. Bu seçenek yalnız eskileri "doğru zaten bu birimde"
            kabul ediyorsan uygundur.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label=""
              placeholder="adet"
              value={newBaseUnit}
              onChange={(e) => setNewBaseUnit(e.target.value)}
              autoComplete="off"
              maxLength={30}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => void onSetStockUnit()}
              disabled={!newBaseUnit.trim() || setStockUnit.isPending}
              className="w-full sm:w-auto"
            >
              {setStockUnit.isPending ? "Kaydediliyor..." : "Onayla ve devam et"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // mode === "choose"
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        Bu ürünün <strong>{totalLegacy}</strong> eski hareketi var. Çoklu birime
        geçmeden önce eski kayıtların nasıl ele alınacağını seçin.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            A · Sadece çoklu birim ekle
          </p>
          <p className="text-[11px] text-emerald-900">
            Eski {totalLegacy} hareketin rakamları değişmez. Yeni temel birim olarak
            ne girdiysen, eski rakamlar da o birim cinsinden yorumlanır.
          </p>
          <p className="text-[11px] text-emerald-800">
            Örn. eski "20" rakamı yeni "adet" birimi varsayımıyla 20 adet sayılır.
          </p>
          <Button
            type="button"
            onClick={() => setMode("set-only")}
            className="mt-auto w-full"
          >
            Bu seçenekle devam et
          </Button>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            B · Eskileri de çevir
          </p>
          <p className="text-[11px] text-amber-900">
            Eski {totalLegacy} hareketin rakamları katsayı ile çarpılarak yeni temel
            birime çevrilir. Açıklamalarına dönüşüm notu eklenir.
          </p>
          <p className="text-[11px] text-amber-800">
            Örn. 20 paket × 25 = 500 adet olarak güncellenir.
          </p>
          <Button
            type="button"
            onClick={() => setMode("convert")}
            className="mt-auto w-full"
          >
            Sihirbazı aç
          </Button>
        </div>
      </div>
    </div>
  );
}
