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
