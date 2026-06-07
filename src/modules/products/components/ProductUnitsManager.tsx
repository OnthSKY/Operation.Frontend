"use client";

import {
  useAddProductUnit,
  useDeleteProductUnit,
  useProductUnits,
} from "@/modules/products/hooks/useProductQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { ProductUnitType } from "@/types/product";
import { useState } from "react";

type Props = {
  productId: number;
  /** Görüntüde "= N × {baseUnitLabel}" göstermek için; null iken yalnız sayısal gösterim. */
  baseUnitLabel: string | null;
};

const UNIT_TYPE_OPTIONS: { value: ProductUnitType; label: string }[] = [
  { value: "ANY", label: "Her bağlam" },
  { value: "PURCHASE", label: "Alış" },
  { value: "TRANSFER", label: "Sevkiyat" },
  { value: "SALE", label: "Satış" },
];

/**
 * Üründe alternatif birim tanımları (paket=25 adet, kg=1000 gram, ...) için liste +
 * ekleme + silme. Ürün düzenleme akışına gömülü çalışır; her satır kendi mutasyonunu
 * tetikler — birim CRUD'ı ürün CRUD'ından bağımsız tut (SRP).
 */
export function ProductUnitsManager({ productId, baseUnitLabel }: Props) {
  const { data: units = [], isPending, isError } = useProductUnits(productId);
  const addMut = useAddProductUnit();
  const deleteMut = useDeleteProductUnit();

  const [newName, setNewName] = useState("");
  const [newFactor, setNewFactor] = useState("");
  const [newType, setNewType] = useState<ProductUnitType>("ANY");
  const [newIsDefault, setNewIsDefault] = useState(false);

  const baseSuffix = baseUnitLabel ? `× ${baseUnitLabel}` : "× temel birim";

  const onAdd = async () => {
    const name = newName.trim();
    const factor = Number(newFactor);
    if (!name) {
      notify.error("Birim adı zorunlu.");
      return;
    }
    if (!Number.isFinite(factor) || factor <= 0) {
      notify.error("Katsayı pozitif bir sayı olmalı.");
      return;
    }
    try {
      await addMut.mutateAsync({
        productId,
        input: {
          unitName: name,
          toBaseFactor: factor,
          unitType: newType,
          isDefault: newIsDefault,
          displayOrder: units.length,
        },
      });
      setNewName("");
      setNewFactor("");
      setNewType("ANY");
      setNewIsDefault(false);
      notify.success("Birim eklendi.");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = (unitId: number, label: string) => {
    notifyConfirmToast({
      toastId: `product-unit-delete-${productId}-${unitId}`,
      message: `"${label}" birimi silinsin mi?`,
      cancelLabel: "Vazgeç",
      confirmLabel: "Sil",
      tone: "warning",
      onConfirm: () => {
        void (async () => {
          try {
            await deleteMut.mutateAsync({ productId, unitId });
            notify.success("Birim silindi.");
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        })();
      },
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">Alternatif birimler</p>
        <span className="text-xs text-zinc-500">{units.length} tanımlı</span>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500">Yükleniyor...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Birimler yüklenemedi.</p>
      ) : units.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Henüz alternatif birim yok. Aşağıdan ekleyebilirsiniz (örn. paket = 25 adet).
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {units.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-800 break-words">
                  <span className="font-medium">{u.unitName}</span>{" "}
                  <span className="text-zinc-500">
                    = {u.toBaseFactor} {baseSuffix}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  {UNIT_TYPE_OPTIONS.find((o) => o.value === u.unitType)?.label ?? u.unitType}
                  {u.isDefault ? " · varsayılan" : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={deleteMut.isPending}
                onClick={() => onDelete(u.id, u.unitName)}
                className="w-full sm:w-auto"
              >
                Sil
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-2 border-t border-zinc-100 pt-2 sm:grid-cols-2">
        <Input
          label="Birim adı"
          placeholder="paket, kg, top"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoComplete="off"
          maxLength={30}
        />
        <Input
          label={`Katsayı (${baseSuffix})`}
          placeholder="25"
          inputMode="decimal"
          value={newFactor}
          onChange={(e) => setNewFactor(e.target.value)}
          autoComplete="off"
        />
        <Select
          label="Bağlam"
          name="new-product-unit-type"
          options={UNIT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={newType}
          onChange={(e) => setNewType(e.target.value as ProductUnitType)}
          onBlur={() => {}}
        />
        <div className="flex items-start gap-2.5 rounded-md border border-zinc-200 px-3 py-2.5 sm:col-span-2">
          <Checkbox
            checked={newIsDefault}
            onCheckedChange={setNewIsDefault}
            aria-label="Bu bağlamda varsayılan"
          />
          <p className="text-xs text-zinc-700">Bu bağlamda varsayılan</p>
        </div>
        <Button
          type="button"
          onClick={() => void onAdd()}
          disabled={addMut.isPending}
          className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end"
        >
          {addMut.isPending ? "Ekleniyor..." : "Ekle"}
        </Button>
      </div>
    </div>
  );
}
