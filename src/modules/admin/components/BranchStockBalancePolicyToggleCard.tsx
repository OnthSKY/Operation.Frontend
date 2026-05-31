"use client";

import {
  useBranchStockBalancePolicyQuery,
  useUpdateBranchStockBalancePolicyMutation,
} from "@/modules/admin/hooks/useBranchStockBalancePolicyQuery";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Switch } from "@/shared/ui/Switch";

/**
 * Settings hub'ında basit inline toggle: şube stok bakiyesinin negatife düşmesine izin.
 * Varsayılan KAPALI (negatif yasak). Backend zaten enforce eder; bu kart sadece admin'in açıp
 * kapatmasını sağlar. Anında kaydeder (ayrı save butonu yok).
 */
export function BranchStockBalancePolicyToggleCard() {
  const { data, isPending } = useBranchStockBalancePolicyQuery(true);
  const mut = useUpdateBranchStockBalancePolicyMutation();

  const checked = data?.allowNegativeBalance ?? false;
  const busy = isPending || mut.isPending;

  const onToggle = async (next: boolean) => {
    // Yalnız AÇARKEN onay iste — kazara tek tıkla negatif bakiyeyi açmayı önler.
    // Kapatmak (güvenli varsayılana dönmek) onaysız.
    if (next && !window.confirm(
      "Negatif stok bakiyesine izin verilecek. Tüketim/düşüm şube bakiyesini eksiye düşürebilecek. Emin misiniz?"
    )) {
      return;
    }
    try {
      await mut.mutateAsync({ allowNegativeBalance: next });
      notify.success(next ? "Negatif bakiyeye izin verildi." : "Negatif bakiye kapatıldı.");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Card className="h-full min-h-[4.5rem] p-4 ring-1 ring-zinc-200/80 sm:col-span-2 sm:p-5 lg:col-span-1">
      <label className="flex cursor-pointer gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-zinc-900">Negatif stok bakiyesi</span>
          <span className="mt-2 block text-sm leading-relaxed text-zinc-600">
            Kapalıyken (varsayılan) bir tüketim/düşüm şube bakiyesini negatife süremez. Açarsanız,
            kayıt girilmeden önce tüketim gibi durumlar için negatif bakiyeye izin verilir.
          </span>
        </span>
        <Switch
          checked={checked}
          disabled={busy}
          onCheckedChange={(next) => void onToggle(next)}
          className="self-start"
        />
      </label>
    </Card>
  );
}
