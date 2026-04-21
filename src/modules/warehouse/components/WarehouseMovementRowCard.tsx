"use client";

import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { cn } from "@/lib/cn";
import { formatWarehouseShipmentDisplay } from "@/shared/lib/in-batch-group-label";
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
};

export function WarehouseMovementRowCard({ m, fmtDate, t, hideShipmentGroup }: Props) {
  const [thumbFailed, setThumbFailed] = useState(false);
  useEffect(() => {
    setThumbFailed(false);
  }, [m.id]);

  const typeIn = m.type === "IN";
  const typeLabel = typeIn ? t("products.typeIn") : t("products.typeOut");
  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
  const photoUrl = warehouseMovementInvoicePhotoUrl(m.id);

  return (
    <div className="touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
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
      <div className="mt-3">
        {m.parentProductName?.trim() ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            {m.parentProductName}
          </p>
        ) : null}
        <p className="text-base font-semibold leading-snug text-zinc-900">
          {m.productName}
          {m.unit ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">({m.unit})</span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{m.quantity}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("products.colQty")}
        </span>
      </div>
      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
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
        {movementKv(t("warehouse.movementNote"), m.description?.trim() ? m.description : "—")}
        {movementKv(t("warehouse.movementCheckedBy"), m.checkedByPersonnelName ?? "—")}
        {movementKv(t("warehouse.movementApprovedBy"), m.approvedByPersonnelName ?? "—")}
        {m.type === "IN" && m.hasInvoicePhoto ? (
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("warehouse.attachmentsHeading")}
            </p>
            <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              {!thumbFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="max-h-44 w-full max-w-full rounded-lg border border-zinc-200 bg-zinc-50 object-contain sm:max-w-xs"
                  loading="lazy"
                  onError={() => setThumbFailed(true)}
                />
              ) : null}
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
              >
                {t("warehouse.openInvoicePhoto")}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
