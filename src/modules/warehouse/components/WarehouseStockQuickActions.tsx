"use client";

import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { useState } from "react";

type MoveInput = {
  warehouseId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  direction: "in" | "out";
};

type Props = {
  productId: number;
  warehouseId: number;
  movementDate: string;
  disabled: boolean;
  mutateAsync: (input: MoveInput) => Promise<unknown>;
};

export function WarehouseStockQuickActions({
  productId,
  warehouseId,
  movementDate,
  disabled,
  mutateAsync,
}: Props) {
  const { t } = useI18n();
  const [qty, setQty] = useState("1");
  const [pending, setPending] = useState(false);

  const run = async (direction: "in" | "out") => {
    const n = Number(qty.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    setPending(true);
    try {
      await mutateAsync({
        warehouseId,
        productId,
        quantity: n,
        movementDate,
        direction,
      });
      notify.success(
        direction === "in" ? t("toast.warehouseInOk") : t("toast.warehouseOutOk")
      );
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const off = disabled || pending;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={off}
        aria-label={t("warehouse.movementQuantity")}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="h-9 w-[4.5rem] shrink-0 rounded-lg border border-zinc-300 bg-white px-2 text-center text-sm text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2 disabled:opacity-50"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={off}
        onClick={() => void run("out")}
        className="min-h-9 min-w-0 shrink-0 px-3 py-1.5 text-sm"
      >
        {t("products.typeOut")}
      </Button>
      <Button
        type="button"
        disabled={off}
        onClick={() => void run("in")}
        className="min-h-9 min-w-0 shrink-0 px-3 py-1.5 text-sm"
      >
        {t("products.typeIn")}
      </Button>
    </div>
  );
}
