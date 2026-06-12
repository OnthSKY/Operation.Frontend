"use client";

import { useI18n } from "@/i18n/context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { Locale } from "@/i18n/messages";
import type {
  BranchStockConsumptionRow,
  BranchStockConsumptionType,
  BranchStockDirection,
} from "@/modules/branch/api/branch-stock-consumptions-api";
import {
  useRestoreBranchStockConsumption,
  useSoftDeleteBranchStockConsumption,
} from "@/modules/branch/hooks/useBranchStockConsumptions";

type Props = {
  branchId: number;
  rows: BranchStockConsumptionRow[];
  loading: boolean;
  error: boolean;
  errorMessage?: unknown;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  canManage: boolean;
  locale: Locale;
};

function typeLabel(t: (k: string) => string, type: BranchStockConsumptionType): string {
  if (type === "CONSUMPTION") return t("branchStockConsumption.typeConsumption");
  if (type === "SNAPSHOT") return t("branchStockConsumption.typeSnapshot");
  return t("branchStockConsumption.typeAdjustment");
}

function directionBadgeClass(direction: BranchStockDirection): string {
  return direction === "OUT"
    ? "bg-rose-50 text-rose-800 ring-rose-200"
    : "bg-emerald-50 text-emerald-800 ring-emerald-200";
}

export function ConsumptionHistoryTable({
  branchId,
  rows,
  loading,
  error,
  errorMessage,
  page,
  pageSize,
  totalCount,
  onPageChange,
  canManage,
  locale,
}: Props) {
  const { t } = useI18n();
  const deleteMut = useSoftDeleteBranchStockConsumption(branchId);
  const restoreMut = useRestoreBranchStockConsumption(branchId);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const onDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
      notify.success(t("toast.branchStockConsumptionDeleted"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onRestore = async (id: number) => {
    try {
      await restoreMut.mutateAsync(id);
      notify.success(t("toast.branchStockConsumptionRestored"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
        {toErrorMessage(errorMessage) || t("branchStockConsumption.loadFailed")}
      </p>
    );
  }

  if (loading) {
    return (
      <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500">
        {t("common.loading")}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500">
        {t("branchStockConsumption.historyEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((r) => {
          const isDeleted = r.isDeleted;
          return (
            <li
              key={r.id}
              className={cn(
                "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.03]",
                isDeleted && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2 px-3 pt-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{r.productName}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {formatLocaleDate(r.consumptionDate, locale, "—")}
                    {r.createdByName ? (
                      <>
                        <span aria-hidden className="mx-1 text-zinc-300">·</span>
                        {r.createdByName}
                      </>
                    ) : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                    directionBadgeClass(r.direction)
                  )}
                >
                  {r.direction === "OUT" ? "−" : "+"} {typeLabel(t, r.type)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 px-3 pb-2 pt-1">
                <span className="text-lg font-bold tabular-nums text-zinc-900">
                  {r.quantity}
                  {r.productUnit ? (
                    <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      {r.productUnit}
                    </span>
                  ) : null}
                </span>
                {r.type === "SNAPSHOT" && r.snapshotValue != null && r.preBalance != null ? (
                  <span className="text-[11px] tabular-nums text-zinc-600">
                    {r.preBalance} → <span className="font-semibold text-zinc-900">{r.snapshotValue}</span>
                  </span>
                ) : null}
              </div>
              {r.note ? (
                <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-600">
                  {r.note}
                </p>
              ) : null}
              {isDeleted ? (
                <p className="border-t border-zinc-100 px-3 py-1.5 text-[10px] text-rose-700">
                  {t("branchStockConsumption.deletedAtBy")
                    .replace("{name}", r.deletedByName ?? "—")
                    .replace("{date}", r.deletedAt ? formatLocaleDateTime(r.deletedAt, locale) : "—")}
                </p>
              ) : null}
              {canManage ? (
                <div className="border-t border-zinc-100 bg-zinc-50/40">
                  {isDeleted ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-white"
                      onClick={() => onRestore(r.id)}
                      disabled={restoreMut.isPending}
                    >
                      {t("branchStockConsumption.restore")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                      onClick={() => onDelete(r.id)}
                      disabled={deleteMut.isPending}
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="hidden sm:block">
      <Table mobileCards>
        <TableHead>
          <TableRow>
            <TableHeader>{t("branchStockConsumption.colDate")}</TableHeader>
            <TableHeader>{t("branchStockConsumption.colProduct")}</TableHeader>
            <TableHeader>{t("branchStockConsumption.colType")}</TableHeader>
            <TableHeader className="text-right">{t("branchStockConsumption.colQuantity")}</TableHeader>
            <TableHeader>{t("branchStockConsumption.colSnapshot")}</TableHeader>
            <TableHeader>{t("branchStockConsumption.colCreatedBy")}</TableHeader>
            <TableHeader className="text-right">{t("common.actions")}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const isDeleted = r.isDeleted;
            return (
              <TableRow
                key={r.id}
                className={cn(isDeleted ? "opacity-60" : undefined)}
              >
                <TableCell dataLabel={t("branchStockConsumption.colDate")}>
                  {formatLocaleDate(r.consumptionDate, locale, "—")}
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.colProduct")}>
                  <div className="font-medium text-zinc-900">{r.productName}</div>
                  {r.note ? <div className="text-xs text-zinc-500">{r.note}</div> : null}
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.colType")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                        directionBadgeClass(r.direction)
                      )}
                    >
                      {r.direction === "OUT" ? "−" : "+"} {typeLabel(t, r.type)}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  dataLabel={t("branchStockConsumption.colQuantity")}
                  className="text-right tabular-nums"
                >
                  {r.quantity}
                  {r.productUnit ? <span className="ml-1 text-xs text-zinc-500">{r.productUnit}</span> : null}
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.colSnapshot")}>
                  {r.type === "SNAPSHOT" && r.snapshotValue != null && r.preBalance != null ? (
                    <span className="text-xs text-zinc-700">
                      {r.preBalance} → {r.snapshotValue}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.colCreatedBy")}>
                  <div className="text-xs text-zinc-700">{r.createdByName ?? "—"}</div>
                  <div className="text-[10px] text-zinc-400">
                    {formatLocaleDateTime(r.createdAt, locale)}
                  </div>
                  {isDeleted ? (
                    <div className="mt-1 text-[10px] text-rose-700">
                      {t("branchStockConsumption.deletedAtBy")
                        .replace("{name}", r.deletedByName ?? "—")
                        .replace("{date}", r.deletedAt ? formatLocaleDateTime(r.deletedAt, locale) : "—")}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell dataLabel={t("common.actions")} className="text-right">
                  {canManage ? (
                    isDeleted ? (
                      <Button
                        variant="secondary"
                        onClick={() => onRestore(r.id)}
                        disabled={restoreMut.isPending}
                      >
                        {t("branchStockConsumption.restore")}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => onDelete(r.id)}
                        disabled={deleteMut.isPending}
                      >
                        {t("common.delete")}
                      </Button>
                    )
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            {t("branchStockConsumption.paginationPrevious")}
          </Button>
          <span className="text-xs text-zinc-500">
            {t("branchStockConsumption.paginationPageOf")
              .replace("{page}", String(page))
              .replace("{total}", String(totalPages))}
          </span>
          <Button
            variant="secondary"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            {t("branchStockConsumption.paginationNext")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
