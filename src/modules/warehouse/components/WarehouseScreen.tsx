"use client";

import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { AddWarehouseModal } from "@/modules/warehouse/components/AddWarehouseModal";
import {
  WarehouseListDepoInModal,
  WarehouseListTransferModal,
} from "@/modules/warehouse/components/WarehouseListQuickModals";
import { WarehouseDetailModal } from "@/modules/warehouse/components/WarehouseDetailModal";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/components/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { detailOpenIconButtonClass, EyeIcon } from "@/shared/ui/EyeIcon";
import { BranchTransferListIcon, PlusProductIcon } from "@/shared/ui/WarehouseListIcons";
import { Tooltip } from "@/shared/ui/Tooltip";
import { cn } from "@/lib/cn";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { WarehouseListItem } from "@/types/warehouse";
import { useEffect, useState } from "react";

function warehouseLocationLine(w: WarehouseListItem): string | null {
  const city = w.city?.trim();
  const addr = w.address?.trim();
  if (city && addr) return `${city} · ${addr}`;
  return city || addr || null;
}

function warehouseResponsiblesLine(w: WarehouseListItem): string | null {
  const m = w.responsibleManagerDisplayName?.trim();
  const u = w.responsibleMasterDisplayName?.trim();
  if (m && u) return `${m} · ${u}`;
  return m || u || null;
}

export function WarehouseScreen() {
  const { t, locale } = useI18n();
  const [whModal, setWhModal] = useState(false);
  const [prodModal, setProdModal] = useState(false);
  const [detailWarehouseId, setDetailWarehouseId] = useState<number | null>(null);
  const [quickDepoTarget, setQuickDepoTarget] = useState<{ id: number; name: string } | null>(null);
  const [quickTransferTarget, setQuickTransferTarget] = useState<{ id: number; name: string } | null>(
    null
  );

  const { data: warehouses = [], isPending: whLoading, isError: whError, error: whErr } =
    useWarehousesList();

  useEffect(() => {
    if (detailWarehouseId == null) return;
    if (!warehouses.some((w) => w.id === detailWarehouseId)) setDetailWarehouseId(null);
  }, [warehouses, detailWarehouseId]);

  const openDetail = (id: number) => setDetailWarehouseId(id);

  return (
    <div className="mx-auto w-full max-w-5xl p-3 pb-24 sm:pb-10 sm:p-4 lg:max-w-6xl xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{t("warehouse.title")}</h1>
          <p className="text-sm text-zinc-500">{t("warehouse.subtitle")}</p>
        </div>
        <Button type="button" className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => setWhModal(true)}>
          {t("warehouse.addWarehouse")}
        </Button>
      </div>

      {whError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(whErr)}</p>
      ) : whLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : warehouses.length === 0 ? (
        <Card className="mt-4" title={t("warehouse.noWarehouses")}>
          <p className="text-sm text-zinc-600">{t("warehouse.noWarehousesHint")}</p>
        </Card>
      ) : (
        <Card className="mt-4" title={t("warehouse.listTitle")} description={t("warehouse.listDesc")}>
          <div className="-mx-1 hidden overflow-x-auto px-1 md:mx-0 md:block md:overflow-visible md:px-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("warehouse.fieldName")}</TableHeader>
                  <TableHeader className="hidden min-w-[8rem] lg:table-cell">
                    {t("warehouse.fieldCity")}
                  </TableHeader>
                  <TableHeader className="hidden xl:table-cell">{t("warehouse.fieldAddress")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap text-right">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {warehouses.map((w) => {
                  const loc = warehouseLocationLine(w);
                  const active = detailWarehouseId === w.id;
                  const depoQuickOpen = quickDepoTarget?.id === w.id;
                  const transferQuickOpen = quickTransferTarget?.id === w.id;
                  return (
                    <TableRow
                      key={w.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-zinc-50 active:bg-zinc-100",
                        active && "bg-zinc-50"
                      )}
                      onClick={() => openDetail(w.id)}
                    >
                      <TableCell className="max-w-[min(100%,14rem)] font-medium text-zinc-900 sm:max-w-none">
                        <span className="line-clamp-2 sm:line-clamp-none">{w.name}</span>
                        {loc ? (
                          <p className="mt-1 line-clamp-2 text-xs font-normal text-zinc-500 lg:hidden">
                            {loc}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden text-sm text-zinc-600 lg:table-cell">
                        {w.city?.trim() ? (
                          <span className="line-clamp-2">{w.city.trim()}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm text-zinc-600 xl:table-cell">
                        {w.address?.trim() ? (
                          <span className="line-clamp-2">{w.address.trim()}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell
                        className="w-[1%] whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          <Tooltip
                            className="shrink-0"
                            content={t("warehouse.listActionDepoProductIn")}
                            delayMs={200}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-haspopup="dialog"
                              aria-expanded={depoQuickOpen}
                              aria-label={t("warehouse.listActionDepoProductIn")}
                              title={t("warehouse.listActionDepoProductIn")}
                              onClick={() => setQuickDepoTarget({ id: w.id, name: w.name })}
                            >
                              <PlusProductIcon />
                            </Button>
                          </Tooltip>
                          <Tooltip
                            className="shrink-0"
                            content={t("warehouse.listActionBranchTransfer")}
                            delayMs={200}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-haspopup="dialog"
                              aria-expanded={transferQuickOpen}
                              aria-label={t("warehouse.listActionBranchTransfer")}
                              title={t("warehouse.listActionBranchTransfer")}
                              onClick={() => setQuickTransferTarget({ id: w.id, name: w.name })}
                            >
                              <BranchTransferListIcon />
                            </Button>
                          </Tooltip>
                          <Tooltip className="shrink-0" content={t("common.openDetailsDialog")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-haspopup="dialog"
                              aria-expanded={active}
                              aria-label={t("common.openDetailsDialog")}
                              title={t("common.openDetailsDialog")}
                              onClick={() => openDetail(w.id)}
                            >
                              <EyeIcon />
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-2 md:hidden">
            {warehouses.map((w) => {
              const loc = warehouseLocationLine(w);
              const resp = warehouseResponsiblesLine(w);
              const active = detailWarehouseId === w.id;
              const depoQuickOpen = quickDepoTarget?.id === w.id;
              const transferQuickOpen = quickTransferTarget?.id === w.id;
              const createdRaw = formatLocaleDate(w.createdAt, locale);
              const created = createdRaw !== "—" ? createdRaw : null;
              return (
                <li key={w.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={active}
                    onClick={() => openDetail(w.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(w.id);
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm ring-1 ring-zinc-100 transition-colors active:bg-zinc-50",
                      active && "border-zinc-300 bg-zinc-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold leading-snug text-zinc-900">{w.name}</p>
                      {loc ? (
                        <p className="mt-1 line-clamp-3 text-sm text-zinc-600">{loc}</p>
                      ) : null}
                      {resp ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{resp}</p>
                      ) : null}
                      {created ? (
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {t("warehouse.createdAtLabel")}: {created}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 flex-row flex-nowrap items-start gap-1 pt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip className="shrink-0" content={t("warehouse.listActionDepoProductIn")} delayMs={200}>
                        <Button
                          type="button"
                          variant="secondary"
                          className={detailOpenIconButtonClass}
                          aria-haspopup="dialog"
                          aria-expanded={depoQuickOpen}
                          aria-label={t("warehouse.listActionDepoProductIn")}
                          title={t("warehouse.listActionDepoProductIn")}
                          onClick={() => setQuickDepoTarget({ id: w.id, name: w.name })}
                        >
                          <PlusProductIcon />
                        </Button>
                      </Tooltip>
                      <Tooltip
                        className="shrink-0"
                        content={t("warehouse.listActionBranchTransfer")}
                        delayMs={200}
                      >
                        <Button
                          type="button"
                          variant="secondary"
                          className={detailOpenIconButtonClass}
                          aria-haspopup="dialog"
                          aria-expanded={transferQuickOpen}
                          aria-label={t("warehouse.listActionBranchTransfer")}
                          title={t("warehouse.listActionBranchTransfer")}
                          onClick={() => setQuickTransferTarget({ id: w.id, name: w.name })}
                        >
                          <BranchTransferListIcon />
                        </Button>
                      </Tooltip>
                      <Tooltip className="shrink-0" content={t("common.openDetailsDialog")} delayMs={200}>
                        <Button
                          type="button"
                          variant="secondary"
                          className={detailOpenIconButtonClass}
                          aria-haspopup="dialog"
                          aria-expanded={active}
                          aria-label={t("common.openDetailsDialog")}
                          title={t("common.openDetailsDialog")}
                          onClick={() => openDetail(w.id)}
                        >
                          <EyeIcon />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <WarehouseListDepoInModal target={quickDepoTarget} onClose={() => setQuickDepoTarget(null)} />
      <WarehouseListTransferModal
        target={quickTransferTarget}
        onClose={() => setQuickTransferTarget(null)}
      />

      <AddWarehouseModal open={whModal} onClose={() => setWhModal(false)} />
      {detailWarehouseId != null ? (
        <WarehouseDetailModal
          open
          warehouseId={detailWarehouseId}
          onClose={() => setDetailWarehouseId(null)}
          onOpenAddProduct={() => setProdModal(true)}
        />
      ) : null}
      <AddProductModal
        open={prodModal}
        onClose={() => setProdModal(false)}
        descriptionKey="warehouse.addProductHint"
      />
    </div>
  );
}
