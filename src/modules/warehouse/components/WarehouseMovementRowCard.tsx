"use client";

import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { cn } from "@/lib/cn";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PencilIcon, detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { formatWarehouseShipmentDisplay } from "@/shared/lib/in-batch-group-label";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { WarehouseMovementItem } from "@/types/warehouse";
import { useEffect, useState, type ReactNode } from "react";

function movementKv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}

type Props = {
  m: WarehouseMovementItem;
  fmtDate: (iso: string) => string;
  t: (key: string) => string;
  hideShipmentGroup?: boolean;
  hideAuditMeta?: boolean;
  hideInvoiceSection?: boolean;
  /** Depo hareketleri sekmesinde GİRİŞ satırı tam düzenleme / silme. */
  warehouseId?: number;
  onEditInboundFull?: (m: WarehouseMovementItem) => void;
  onDeleteInbound?: (m: WarehouseMovementItem) => void;
  /** Depo→şube sevkiyat OUT satırı (isDepotToBranchShipment). */
  onEditOutboundShipment?: (m: WarehouseMovementItem) => void;
  onDeleteOutboundShipment?: (m: WarehouseMovementItem) => void;
  onCreateInvoiceFromShipment?: (m: WarehouseMovementItem) => void;
  onPreviewInvoice?: (m: WarehouseMovementItem) => void;
};

export function WarehouseMovementRowCard({
  m,
  fmtDate,
  t,
  hideShipmentGroup,
  hideAuditMeta = false,
  hideInvoiceSection = false,
  warehouseId,
  onEditInboundFull,
  onDeleteInbound,
  onEditOutboundShipment,
  onDeleteOutboundShipment,
  onCreateInvoiceFromShipment,
  onPreviewInvoice,
}: Props) {
  const [thumbFailed, setThumbFailed] = useState(false);
  useEffect(() => {
    setThumbFailed(false);
  }, [m.id]);

  const typeIn = m.type === "IN";
  const typeLabel = typeIn ? t("products.typeIn") : t("products.typeOut");
  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
  const photoUrl = warehouseMovementInvoicePhotoUrl(m.id);

  const showInboundActions =
    typeIn && warehouseId != null && warehouseId > 0 && (onEditInboundFull != null || onDeleteInbound != null);

  const showOutboundShipmentActions =
    !typeIn &&
    m.isDepotToBranchShipment === true &&
    warehouseId != null &&
    warehouseId > 0 &&
    (onEditOutboundShipment != null || onDeleteOutboundShipment != null);
  const showCreateInvoiceAction =
    !typeIn && m.isDepotToBranchShipment === true && onCreateInvoiceFromShipment != null;

  return (
    <MobileListCard as="div" className="touch-manipulation shadow-zinc-900/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{fmtDate(m.movementDate)}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            typeIn ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
          )}
        >
          {typeLabel}
        </span>
      </div>
      {showInboundActions ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {onEditInboundFull ? (
            <Tooltip content={t("warehouse.editInboundFullOpenRow")} delayMs={220}>
              <button
                type="button"
                aria-label={t("warehouse.editInboundFullOpenRow")}
                className={cn(
                  detailOpenIconButtonClass,
                  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900"
                )}
                onClick={() => onEditInboundFull(m)}
              >
                <PencilIcon className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {onDeleteInbound ? (
            <Tooltip content={t("warehouse.editInboundFullDeleteAction")} delayMs={220}>
              <button
                type="button"
                aria-label={t("warehouse.editInboundFullDeleteAction")}
                className={cn(
                  trashIconActionButtonClass,
                  "rounded-lg border border-red-200/90 bg-red-50/80 text-red-900 shadow-sm"
                )}
                onClick={() => onDeleteInbound(m)}
              >
                <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      {showOutboundShipmentActions ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {showCreateInvoiceAction ? (
            <Tooltip content={t("warehouse.movementHistoryCreateInvoiceFromShipment")} delayMs={220}>
              <button
                type="button"
                aria-label={t("warehouse.movementHistoryCreateInvoiceFromShipment")}
                className={cn(
                  detailOpenIconButtonClass,
                  "inline-flex items-center justify-center rounded-lg border border-indigo-200/90 bg-indigo-50/80 text-indigo-900 shadow-sm transition hover:bg-indigo-100"
                )}
                onClick={() => onCreateInvoiceFromShipment?.(m)}
              >
                <PencilIcon className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {onEditOutboundShipment ? (
            <Tooltip content={t("warehouse.editOutboundShipmentOpenRow")} delayMs={220}>
              <button
                type="button"
                aria-label={t("warehouse.editOutboundShipmentOpenRow")}
                className={cn(
                  detailOpenIconButtonClass,
                  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-900"
                )}
                onClick={() => onEditOutboundShipment(m)}
              >
                <PencilIcon className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {onDeleteOutboundShipment ? (
            <Tooltip content={t("warehouse.editOutboundShipmentDeleteAction")} delayMs={220}>
              <button
                type="button"
                aria-label={t("warehouse.editOutboundShipmentDeleteAction")}
                className={cn(
                  trashIconActionButtonClass,
                  "rounded-lg border border-red-200/90 bg-red-50/80 text-red-900 shadow-sm"
                )}
                onClick={() => onDeleteOutboundShipment(m)}
              >
                <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3">
        {m.parentProductName?.trim() ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            {m.parentProductName}
          </p>
        ) : null}
        <p className="min-w-0 break-words text-base font-semibold leading-snug text-zinc-900">
          {m.productName}
          {m.unit ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">({m.unit})</span>
          ) : null}
        </p>
      </div>
      {m.hasInvoicePhoto && !hideInvoiceSection ? (
        <div className="mt-3 min-w-0 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 shadow-sm ring-1 ring-zinc-900/[0.03]">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
            {t("warehouse.attachmentsHeading")}
          </p>
          <div className="mt-2 flex min-w-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2.5">
            <p className="text-xs leading-relaxed text-zinc-600">{t("warehouse.movementInvoicePreviewHint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {onPreviewInvoice ? (
                <button
                  type="button"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                  onClick={() => onPreviewInvoice(m)}
                >
                  {t("warehouse.openInvoicePhoto")}
                </button>
              ) : (
                <a
                  href={photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                >
                  {t("warehouse.openInvoicePhoto")}
                </a>
              )}
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                  {t("warehouse.details")}
                </summary>
                <div className="mt-2 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 sm:w-40">
                  {!thumbFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt=""
                      className="aspect-[3/4] w-full object-contain"
                      loading="lazy"
                      onError={() => setThumbFailed(true)}
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-xs text-zinc-500">
                      {t("common.noData")}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{m.quantity}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("products.colQty")}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-4 border-t border-zinc-100 pt-3">
        {!hideShipmentGroup
          ? movementKv(
              t("warehouse.movementBatchGroup"),
              <span className="font-mono text-xs" title={batchCell.title}>
                {batchCell.text}
              </span>
            )
          : null}
        {m.type === "OUT" && m.outDestinationBranchName?.trim()
          ? movementKv(
              t("warehouse.movementOutBranch"),
              <span className="text-sm font-medium text-violet-900">{m.outDestinationBranchName.trim()}</span>
            )
          : null}
        {!hideAuditMeta ? movementKv(t("warehouse.movementNote"), m.description?.trim() ? m.description : "—") : null}
        {!hideAuditMeta ? movementKv(t("warehouse.movementCheckedBy"), m.checkedByPersonnelName ?? "—") : null}
        {!hideAuditMeta ? movementKv(t("warehouse.movementApprovedBy"), m.approvedByPersonnelName ?? "—") : null}
      </div>
    </MobileListCard>
  );
}
