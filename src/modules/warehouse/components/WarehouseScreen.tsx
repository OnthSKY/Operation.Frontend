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
import { TablePagination } from "@/shared/ui/TablePagination";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const WAREHOUSE_DEEP_LINK_KEYS = ["openWarehouse", "openWarehouseTab", "openMovementId"] as const;
const WAREHOUSE_LIST_PAGE_SIZE = 25;

export function WarehouseScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [whModal, setWhModal] = useState(false);
  const [detailWarehouseId, setDetailWarehouseId] = useState<number | null>(null);
  /** URL’den bir kez okunan sekme / hareket niyeti; adres çubuğu temizlendikten sonra modal için saklanır. */
  const [detailLinkIntent, setDetailLinkIntent] = useState<{
    tab: "history" | null;
    movementId: number | null;
  }>({ tab: null, movementId: null });
  const [quickDepoTarget, setQuickDepoTarget] = useState<{ id: number; name: string } | null>(null);
  const [quickTransferTarget, setQuickTransferTarget] = useState<{ id: number; name: string } | null>(
    null
  );
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);

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

  const listPageTotal = Math.max(1, Math.ceil(displayWarehouses.length / WAREHOUSE_LIST_PAGE_SIZE));
  const pagedWarehouses = useMemo(() => {
    const start = (listPage - 1) * WAREHOUSE_LIST_PAGE_SIZE;
    return displayWarehouses.slice(start, start + WAREHOUSE_LIST_PAGE_SIZE);
  }, [displayWarehouses, listPage]);

  // Arama değişince başa dön; sayfa sayısı düşerse taşmayı düzelt.
  useEffect(() => {
    setListPage(1);
  }, [listSearch]);
  useEffect(() => {
    if (listPage > listPageTotal) setListPage(listPageTotal);
  }, [listPage, listPageTotal]);

  useEffect(() => {
    if (detailWarehouseId == null) return;
    if (!warehouses.some((w) => w.id === detailWarehouseId)) {
      setDetailWarehouseId(null);
      setDetailLinkIntent({ tab: null, movementId: null });
    }
  }, [warehouses, detailWarehouseId]);

  const stripWarehouseDeepLinkFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of WAREHOUSE_DEEP_LINK_KEYS) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const raw = searchParams.get("openWarehouse");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) {
      stripWarehouseDeepLinkFromUrl();
      return;
    }
    if (warehouses.length === 0) return;
    if (!warehouses.some((w) => w.id === id)) {
      stripWarehouseDeepLinkFromUrl();
      return;
    }
    const tabRaw = searchParams.get("openWarehouseTab");
    const tab: "history" | null = tabRaw === "history" ? "history" : null;
    const movRaw = searchParams.get("openMovementId");
    let movementId: number | null = null;
    if (movRaw) {
      const parsed = Number.parseInt(movRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0) movementId = parsed;
    }
    setDetailWarehouseId(id);
    setDetailLinkIntent({ tab, movementId });
    stripWarehouseDeepLinkFromUrl();
  }, [searchParams, warehouses, stripWarehouseDeepLinkFromUrl]);

  const closeWarehouseDetail = useCallback(() => {
    setDetailWarehouseId(null);
    setDetailLinkIntent({ tab: null, movementId: null });
    stripWarehouseDeepLinkFromUrl();
  }, [stripWarehouseDeepLinkFromUrl]);

  const openDetail = useCallback((id: number) => {
    setDetailLinkIntent({ tab: null, movementId: null });
    setDetailWarehouseId(id);
  }, []);

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
          if (detailWarehouseId === w.id) closeWarehouseDetail();
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };
  const actionIconClass = "h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]";

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
                      <PlusIcon className={actionIconClass} />
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
                      <PlusIcon className={actionIconClass} />
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
            <Table mobileCards={false}>
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
                {pagedWarehouses.map((w) => {
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
                              <PlusProductIcon className={actionIconClass} />
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
                              <BranchTransferListIcon className={actionIconClass} />
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
                              <EyeIcon className={actionIconClass} />
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
                              <TrashIcon className={actionIconClass} />
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
            {pagedWarehouses.map((w) => {
              const loc = warehouseLocationLine(w);
              const resp = warehouseResponsiblesLine(w);
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
                      "flex w-full cursor-pointer flex-col gap-3 text-left transition-colors active:bg-zinc-50",
                      active && "border-zinc-300 bg-zinc-50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="line-clamp-2 min-w-0 break-words text-base font-semibold leading-snug text-zinc-900">
                          {w.name}
                        </p>
                        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700">
                          No: {w.id}
                        </span>
                      </div>
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
                      {created ? (
                        <p className="mt-1 text-xs text-zinc-400">
                          {t("warehouse.createdAtLabel")}: {created}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className="flex w-full flex-row flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip
                        className="shrink-0"
                        content={t("warehouse.listActionDeleteWarehouse")}
                        delayMs={200}
                      >
                        <button
                          type="button"
                          className={cn(
                            trashIconActionButtonClass,
                            "min-h-11 min-w-11 border-2 border-red-200 bg-white shadow-sm ring-1 ring-red-100/80 hover:border-red-300 hover:bg-red-50/90 active:bg-red-100"
                          )}
                          aria-label={t("warehouse.listActionDeleteWarehouse")}
                          onClick={() => onDeleteWarehouseRow(w)}
                          disabled={delWh.isPending}
                        >
                          <TrashIcon className={actionIconClass} />
                        </button>
                      </Tooltip>
                      <div className="inline-flex flex-row flex-wrap items-center justify-end gap-2">
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
                            <PlusProductIcon className={actionIconClass} />
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
                            <BranchTransferListIcon className={actionIconClass} />
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
                            <EyeIcon className={actionIconClass} />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  </MobileListCard>
                </li>
              );
            })}
          </ul>

          <TablePagination
            className="mt-4"
            page={listPage}
            pageSize={WAREHOUSE_LIST_PAGE_SIZE}
            totalCount={displayWarehouses.length}
            onPageChange={setListPage}
          />
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
          initialTabIntent={detailLinkIntent.tab}
          openMovementIdIntent={detailLinkIntent.movementId}
          onClose={closeWarehouseDetail}
        />
      ) : null}
    </>
  );
}
