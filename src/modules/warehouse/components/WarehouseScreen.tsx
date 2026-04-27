"use client";

import { AddWarehouseModal } from "@/modules/warehouse/components/AddWarehouseModal";
import {
  WarehouseListDepoInModal,
  WarehouseListTransferModal,
} from "@/modules/warehouse/components/WarehouseListQuickModals";
import { WarehouseDetailModal } from "@/modules/warehouse/components/WarehouseDetailModal";
import {
  useSoftDeleteWarehouse,
  useWarehousesList,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { Input } from "@/shared/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { notify } from "@/shared/lib/notify";
import { notifyWarehouseDeleteConfirm } from "@/shared/lib/notify-warehouse-delete";
import { detailOpenIconButtonClass, EyeIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { BranchTransferListIcon, PlusProductIcon } from "@/shared/ui/WarehouseListIcons";
import { Tooltip } from "@/shared/ui/Tooltip";
import { cn } from "@/lib/cn";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { WarehouseListItem } from "@/types/warehouse";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const searchParams = useSearchParams();
  const [whModal, setWhModal] = useState(false);
  const [detailWarehouseId, setDetailWarehouseId] = useState<number | null>(null);
  const [quickDepoTarget, setQuickDepoTarget] = useState<{ id: number; name: string } | null>(null);
  const [quickTransferTarget, setQuickTransferTarget] = useState<{ id: number; name: string } | null>(
    null
  );
  const [listSearch, setListSearch] = useState("");

  const { data: warehouses = [], isPending: whLoading, isError: whError, error: whErr } =
    useWarehousesList();
  const delWh = useSoftDeleteWarehouse();

  const displayWarehouses = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) => {
      const hay = [
        w.name,
        w.city,
        w.address,
        w.responsibleManagerDisplayName,
        w.responsibleMasterDisplayName,
      ]
        .map((s) => (s ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [warehouses, listSearch]);

  useEffect(() => {
    if (detailWarehouseId == null) return;
    if (!warehouses.some((w) => w.id === detailWarehouseId)) setDetailWarehouseId(null);
  }, [warehouses, detailWarehouseId]);

  useEffect(() => {
    const raw = searchParams.get("openWarehouse");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!warehouses.some((w) => w.id === id)) return;
    setDetailWarehouseId(id);
  }, [searchParams, warehouses]);

  const openDetail = (id: number) => setDetailWarehouseId(id);

  const onDeleteWarehouseRow = (w: WarehouseListItem) => {
    notifyWarehouseDeleteConfirm({
      warehouseId: w.id,
      name: w.name,
      title: t("warehouse.deleteWarehouse"),
      body: t("warehouse.confirmDeleteWarehouse"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await delWh.mutateAsync(w.id);
          notify.success(t("toast.warehouseDeleted"));
          if (detailWarehouseId === w.id) setDetailWarehouseId(null);
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  return (
    <>
      <PageScreenScaffold
        className="w-full p-3 pb-6 sm:pb-10 sm:p-4"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                {t("warehouse.title")}
              </h1>
              <p className="text-sm text-zinc-500">{t("warehouse.subtitle")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="warehouse"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.warehouse.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.warehouse.step1") },
                { text: t("pageHelp.warehouse.step2") },
                {
                  text: t("pageHelp.warehouse.step3"),
                  link: { href: "/products", label: t("pageHelp.warehouse.step3Link") },
                },
                { text: t("pageHelp.warehouse.step4") },
              ]}
            />
          </>
        }
        main={
          <>
            {whError ? (
              <p className="text-sm text-red-600">{toErrorMessage(whErr)}</p>
            ) : whLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : warehouses.length === 0 ? (
              <Card
                title={t("warehouse.noWarehouses")}
                headerActions={
                  <Tooltip content={t("warehouse.addWarehouse")} delayMs={200}>
                    <Button
                      type="button"
                      variant="primary"
                      className={TABLE_TOOLBAR_ICON_BTN}
                      onClick={() => setWhModal(true)}
                      aria-label={t("warehouse.addWarehouse")}
                    >
                      <PlusIcon />
                    </Button>
                  </Tooltip>
                }
              >
                <p className="text-sm text-zinc-600">{t("warehouse.noWarehousesHint")}</p>
              </Card>
            ) : (
              <Card
                title={t("warehouse.listTitle")}
                description={t("warehouse.listDesc")}
                headerActions={
                  <Tooltip content={t("warehouse.addWarehouse")} delayMs={200}>
                    <Button
                      type="button"
                      variant="primary"
                      className={TABLE_TOOLBAR_ICON_BTN}
                      onClick={() => setWhModal(true)}
                      aria-label={t("warehouse.addWarehouse")}
                    >
                      <PlusIcon />
                    </Button>
                  </Tooltip>
                }
              >
          <div className="mb-4">
            <Input
              name="warehouse-list-search"
              placeholder={t("warehouse.listSearchPlaceholder")}
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              autoComplete="off"
              aria-label={t("warehouse.listSearchPlaceholder")}
            />
          </div>
          {displayWarehouses.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("warehouse.listSearchNoResults")}</p>
          ) : (
            <>
          <div className="-mx-1 hidden overflow-x-auto px-1 lg:mx-0 lg:block lg:overflow-visible lg:px-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("warehouse.fieldName")}</TableHeader>
                  <TableHeader className="hidden min-w-[8rem] lg:table-cell">
                    {t("warehouse.fieldCity")}
                  </TableHeader>
                  <TableHeader className="hidden text-right lg:table-cell">
                    <Tooltip content={t("warehouse.listColTotalOnHandHint")} delayMs={200}>
                      <span className="cursor-help border-b border-dotted border-zinc-400">
                        {t("warehouse.listColTotalOnHand")}
                      </span>
                    </Tooltip>
                  </TableHeader>
                  <TableHeader className="hidden xl:table-cell">{t("warehouse.fieldAddress")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap text-right">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayWarehouses.map((w) => {
                  const loc = warehouseLocationLine(w);
                  const qty = w.totalOnHandQuantity ?? 0;
                  const qtyLabel = formatLocaleAmount(qty, locale);
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
                        <p className="mt-1 text-xs font-normal text-zinc-500 lg:hidden">
                          {t("warehouse.listColTotalOnHand")}: {qtyLabel}
                        </p>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-sm text-zinc-600 md:hidden lg:table-cell">
                        {w.city?.trim() ? (
                          <span className="line-clamp-2">{w.city.trim()}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-right text-sm tabular-nums text-zinc-700 md:hidden lg:table-cell">
                        {qtyLabel}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-sm text-zinc-600 md:hidden xl:table-cell">
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
                          <Tooltip
                            className="shrink-0"
                            content={t("warehouse.listActionDeleteWarehouse")}
                            delayMs={200}
                          >
                            <button
                              type="button"
                              className={`${trashIconActionButtonClass} min-h-11 min-w-11`}
                              aria-label={t("warehouse.listActionDeleteWarehouse")}
                              onClick={() => onDeleteWarehouseRow(w)}
                              disabled={delWh.isPending}
                            >
                              <TrashIcon />
                            </button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-4 lg:hidden">
            {displayWarehouses.map((w) => {
              const loc = warehouseLocationLine(w);
              const resp = warehouseResponsiblesLine(w);
              const qty = w.totalOnHandQuantity ?? 0;
              const qtyLabel = formatLocaleAmount(qty, locale);
              const active = detailWarehouseId === w.id;
              const depoQuickOpen = quickDepoTarget?.id === w.id;
              const transferQuickOpen = quickTransferTarget?.id === w.id;
              const createdRaw = formatLocaleDate(w.createdAt, locale);
              const created = createdRaw !== "—" ? createdRaw : null;
              return (
                <li key={w.id} className="min-w-0">
                  <MobileListCard
                    as="div"
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
                      "flex w-full cursor-pointer flex-col items-start gap-3 text-left transition-colors active:bg-zinc-50 sm:flex-row",
                      active && "border-zinc-300 bg-zinc-50"
                    )}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-base font-semibold leading-snug text-zinc-900">
                        {w.name}
                      </p>
                      {loc ? (
                        <p className="mt-1 line-clamp-3 break-words text-sm text-zinc-600">
                          {loc}
                        </p>
                      ) : null}
                      {resp ? (
                        <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-500">
                          {resp}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm tabular-nums text-zinc-700">
                        {t("warehouse.listColTotalOnHand")}: {qtyLabel}
                      </p>
                      {created ? (
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {t("warehouse.createdAtLabel")}: {created}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="flex w-full shrink-0 flex-row flex-wrap items-start justify-start gap-1 pt-0.5 sm:w-auto sm:justify-end"
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
                      <Tooltip
                        className="shrink-0"
                        content={t("warehouse.listActionDeleteWarehouse")}
                        delayMs={200}
                      >
                        <button
                          type="button"
                          className={`${trashIconActionButtonClass} min-h-11 min-w-11`}
                          aria-label={t("warehouse.listActionDeleteWarehouse")}
                          onClick={() => onDeleteWarehouseRow(w)}
                          disabled={delWh.isPending}
                        >
                          <TrashIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </MobileListCard>
                </li>
              );
            })}
          </ul>
            </>
          )}
        </Card>
            )}
          </>
        }
      />

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
        />
      ) : null}
    </>
  );
}
