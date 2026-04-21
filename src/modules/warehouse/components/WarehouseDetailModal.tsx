"use client";

import { WarehouseDetailAuditTab } from "@/modules/warehouse/components/WarehouseDetailAuditTab";
import { WarehouseDetailMovementsTab } from "@/modules/warehouse/components/WarehouseDetailMovementsTab";
import { WarehouseDetailSummaryTab } from "@/modules/warehouse/components/WarehouseDetailSummaryTab";
import { EditWarehouseModal } from "@/modules/warehouse/components/EditWarehouseModal";
import { useWarehouseDetail } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useState } from "react";
import type { WarehouseDetail } from "@/types/warehouse";

const TITLE_ID = "warehouse-detail-title";

function WarehouseDetailMetaCard({
  detail,
  t,
  locale,
}: {
  detail: WarehouseDetail;
  t: (key: string) => string;
  locale: Locale;
}) {
  const empty = t("warehouse.detailFieldEmpty");
  const addr = detail.address?.trim();
  const city = detail.city?.trim();
  const mgr = detail.responsibleManagerDisplayName?.trim();
  const master = detail.responsibleMasterDisplayName?.trim();
  const cell = (label: string, value: string, wide?: boolean) => (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm leading-snug whitespace-pre-wrap text-zinc-900">{value}</p>
    </div>
  );
  return (
    <div className="shrink-0 rounded-xl border border-zinc-200/70 bg-zinc-50/90 p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {t("warehouse.detailGeneralTitle")}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {cell(t("warehouse.detailWarehouseId"), String(detail.id))}
        {cell(t("warehouse.createdAtLabel"), formatLocaleDateTime(detail.createdAt, locale))}
        {cell(t("warehouse.fieldAddress"), addr || empty, true)}
        {cell(t("warehouse.fieldCity"), city || empty)}
        {cell(t("warehouse.responsibleManager"), mgr || empty)}
        {cell(t("warehouse.responsibleMaster"), master || empty)}
        {cell(t("warehouse.detailProductCountWithStock"), String(detail.productCountWithStock ?? 0))}
        {cell(
          t("warehouse.detailTotalOnHandQuantity"),
          formatLocaleAmount(Number(detail.totalOnHandQuantity ?? 0), locale)
        )}
      </div>
    </div>
  );
}

type Tab = "general" | "summary" | "movements" | "audit";

type Props = {
  open: boolean;
  warehouseId: number;
  onClose: () => void;
  onOpenAddProduct: () => void;
};

export function WarehouseDetailModal({ open, warehouseId, onClose, onOpenAddProduct }: Props) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("general");
  const [editOpen, setEditOpen] = useState(false);
  const { data: detail, isPending: detailLoading, isError, error } = useWarehouseDetail(
    open ? warehouseId : null,
    open
  );

  useEffect(() => {
    if (open) setTab("general");
  }, [open, warehouseId]);

  useEffect(() => {
    if (!open) setEditOpen(false);
  }, [open]);

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      className={cn(
        "min-h-11 shrink-0 whitespace-nowrap rounded-t-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
        tab === id
          ? "border-b-2 border-zinc-900 bg-zinc-50 text-zinc-900"
          : "border-b-2 border-transparent text-zinc-600 hover:bg-zinc-50/80"
      )}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        titleId={TITLE_ID}
        title={detail?.name ?? (detailLoading ? t("common.loading") : t("warehouse.title"))}
        description={undefined}
        closeButtonLabel={t("common.close")}
        wide
        wideFixedHeight
        wideExpanded
        className="!p-0"
      >
        <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 sm:px-6 sm:pb-4">
          {isError ? (
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
          ) : detailLoading && !detail ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : detail ? (
            <>
              <div
                role="tablist"
                className="-mx-1 flex min-h-[2.75rem] shrink-0 snap-x snap-mandatory gap-0.5 overflow-x-auto overflow-y-hidden border-b border-zinc-200 px-1 pb-px [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:gap-1 sm:overflow-visible sm:px-0 sm:pb-0"
              >
                {tabBtn("general", t("warehouse.tabGeneral"))}
                {tabBtn("summary", t("warehouse.tabSummary"))}
                {tabBtn("movements", t("warehouse.tabMovements"))}
                {tabBtn("audit", t("warehouse.tabAudit"))}
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2 [-webkit-overflow-scrolling:touch] sm:mt-4 sm:pb-4">
                {tab === "general" ? (
                  <div className="flex flex-col gap-3">
                    <WarehouseDetailMetaCard detail={detail} t={t} locale={locale} />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full sm:ml-auto sm:w-auto sm:self-end"
                      onClick={() => setEditOpen(true)}
                    >
                      {t("warehouse.editWarehouse")}
                    </Button>
                  </div>
                ) : null}
                {tab === "summary" ? (
                  <WarehouseDetailSummaryTab
                    warehouseId={warehouseId}
                    enabled={open && tab === "summary"}
                    onOpenMovementsTab={() => setTab("movements")}
                  />
                ) : null}
                {tab === "movements" ? (
                  <WarehouseDetailMovementsTab
                    warehouseId={warehouseId}
                    warehouseName={detail.name}
                    enabled={open && tab === "movements"}
                    onOpenAddProduct={onOpenAddProduct}
                    onDeleted={onClose}
                  />
                ) : null}
                {tab === "audit" ? (
                  <WarehouseDetailAuditTab
                    warehouseId={warehouseId}
                    enabled={open && tab === "audit"}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </Modal>
      <EditWarehouseModal
        open={editOpen && open}
        warehouseId={warehouseId}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
