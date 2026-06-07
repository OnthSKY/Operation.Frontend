"use client";

import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { cn } from "@/lib/cn";
import { MobileListCard } from "@/shared/components/MobileListCard";
import {
  formatWarehouseShipmentDisplay,
  shipmentIdLabelClassName,
} from "@/shared/lib/in-batch-group-label";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { Locale } from "@/i18n/messages";

/**
 * Bir depo hareketinin mobil-zengin kart gösterimi. Tablonun label/value
 * indirgemesi yerine kart alanının tamamını kullanır — IN/OUT rozet, tarih,
 * depo adı, büyük miktar, sevkiyat ID, açıklama (dönüşüm notunu da
 * çok-satır gösterir), kontrol/onay personelleri ve fatura linki.
 *
 * `labels` prop'u ile etiketleri yerelleştirilmiş hâle dışarıdan paslar — bu
 * sayede component "ürün detay" dışı bağlamlarda (genel depo hareket listesi,
 * raporlar vs.) yeniden kullanılabilir.
 */
export type WarehouseMovementCardData = {
  id: number;
  type: "IN" | "OUT";
  warehouseName: string;
  quantity: number;
  movementDate: string;
  description: string | null;
  checkedByPersonnelName?: string | null;
  approvedByPersonnelName?: string | null;
  hasInvoicePhoto?: boolean;
  inBatchGroupId?: string | null;
};

export type WarehouseMovementCardLabels = {
  in: string;
  out: string;
  quantity: string;
  shipment: string;
  checkedBy: string;
  approvedBy: string;
  openInvoicePhoto: string;
};

type Props = {
  m: WarehouseMovementCardData;
  labels: WarehouseMovementCardLabels;
  locale: Locale;
  className?: string;
};

export function WarehouseMovementMobileCard({ m, labels, locale, className }: Props) {
  const isIn = m.type === "IN";
  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId ?? null, m.id);

  return (
    <MobileListCard as="article" className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                isIn
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              )}
            >
              {isIn ? labels.in : labels.out}
            </span>
            <span className="text-xs text-zinc-500">
              {formatLocaleDate(m.movementDate, locale)}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-zinc-900">{m.warehouseName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-500">
            {labels.quantity}
          </p>
          <p className="text-lg font-bold tabular-nums text-zinc-950">{m.quantity}</p>
        </div>
      </div>

      {batchCell.text ? (
        <div className="rounded-md bg-zinc-50 px-2 py-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
            {labels.shipment}:{" "}
          </span>
          <span className={cn("break-all text-xs", shipmentIdLabelClassName)}>
            {batchCell.text}
          </span>
        </div>
      ) : null}

      {m.description?.trim() ? (
        <div className="whitespace-pre-line break-words text-xs text-zinc-700">
          {m.description}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2 text-xs">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-500">
            {labels.checkedBy}
          </p>
          <p className="truncate text-zinc-700">{m.checkedByPersonnelName ?? "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-500">
            {labels.approvedBy}
          </p>
          <p className="truncate text-zinc-700">{m.approvedByPersonnelName ?? "—"}</p>
        </div>
      </div>

      {isIn && m.hasInvoicePhoto ? (
        <a
          href={warehouseMovementInvoicePhotoUrl(m.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2"
        >
          {labels.openInvoicePhoto}
        </a>
      ) : null}
    </MobileListCard>
  );
}
