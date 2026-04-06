"use client";

import { useI18n } from "@/i18n/context";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch, BranchSeasonStatus } from "@/types/branch";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { detailOpenIconButtonClass, EyeIcon } from "@/shared/ui/EyeIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import { AddBranchModal } from "./AddBranchModal";
import { AddBranchTransactionModal } from "./AddBranchTransactionModal";
import { BranchDetailSheet } from "./BranchDetailSheet";
import { QuickExpenseIcon, QuickIncomeIcon } from "./BranchTableTxIcons";

function seasonLabel(status: BranchSeasonStatus, t: (key: string) => string): string {
  switch (status) {
    case "OPEN":
      return t("branch.seasonOpen");
    case "PLANNED":
      return t("branch.seasonPlanned");
    case "CLOSED":
      return t("branch.seasonClosed");
    default:
      return t("branch.seasonNone");
  }
}

function seasonBadgeClass(status: BranchSeasonStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-emerald-100 text-emerald-900";
    case "PLANNED":
      return "bg-amber-100 text-amber-950";
    case "CLOSED":
      return "bg-zinc-200 text-zinc-800";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function staffTableLine(b: Branch, t: (key: string) => string): string {
  const total = b.personnelAssignedCount;
  const started = b.personnelStartedCount;
  const pending = b.personnelNotStartedCount;
  if (total <= 0) return t("branch.staffLineNone");
  if (pending > 0 && started > 0) {
    return t("branch.staffLineMixed")
      .replace("{total}", String(total))
      .replace("{started}", String(started))
      .replace("{pending}", String(pending));
  }
  if (pending > 0) {
    return t("branch.staffLinePendingOnly")
      .replace("{total}", String(total))
      .replace("{pending}", String(pending));
  }
  return t("branch.staffLineAllActive")
    .replace("{total}", String(total))
    .replace("{n}", String(started));
}

export function BranchScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const { data, isPending, isError, error, refetch } = useBranchesList();
  const { data: personnelData } = usePersonnelList(!personnelPortal);
  const list = useMemo(() => data ?? [], [data]);
  const personnel = useMemo(() => personnelData ?? [], [personnelData]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quickTx, setQuickTx] = useState<{
    branchId: number;
    type: "IN" | "OUT";
    nonce: number;
  } | null>(null);

  const openBranchDetail = useCallback((id: number) => {
    setSelectedId(id);
    setQuickTx(null);
  }, []);

  const openBranchQuickTx = useCallback((id: number, type: "IN" | "OUT") => {
    setQuickTx({ branchId: id, type, nonce: Date.now() });
  }, []);

  const selected = useMemo(
    () => list.find((b) => b.id === selectedId) ?? null,
    [list, selectedId]
  );

  const staff = useMemo(
    () => personnel.filter((p) => p.branchId === selectedId),
    [personnel, selectedId]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-24 sm:pb-8 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {t("branch.title")}
          </h1>
          <p className="text-sm text-zinc-500">
            {t("branch.subtitle")}{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">GET /branches</code>
          </p>
        </div>
        {!personnelPortal ? (
          <Button type="button" onClick={() => setAddOpen(true)}>
            {t("branch.add")}
          </Button>
        ) : null}
      </div>

      <Card title={t("branch.listTitle")} description={t("branch.listDesc")}>
        {isPending && (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        )}
        {isError && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}
        {!isPending && !isError && list.length === 0 && (
          <p className="text-sm text-zinc-500">{t("branch.noData")}</p>
        )}
        {!isPending && !isError && list.length > 0 && (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {list.map((b) => {
                const active = selectedId === b.id;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "touch-manipulation overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-[border-color,box-shadow]",
                      active && "border-violet-200 ring-1 ring-violet-200/60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openBranchDetail(b.id)}
                      className={cn(
                        "w-full px-4 pb-1 pt-4 text-left outline-none transition-colors active:bg-zinc-50",
                        "focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
                        active && "bg-violet-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-zinc-900">
                            {b.name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-zinc-500">
                            {t("branch.tableId")} · {b.id}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                            seasonBadgeClass(b.seasonStatus)
                          )}
                        >
                          {seasonLabel(b.seasonStatus, t)}
                        </span>
                      </div>
                      <p
                        className="mt-3 text-sm leading-snug text-zinc-700"
                        title={t("branch.tableStaffHint")}
                      >
                        {staffTableLine(b, t)}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-1 border-t border-zinc-100 px-3 py-3">
                      <Tooltip content={t("branch.quickAddIncome")} delayMs={200}>
                        <Button
                          type="button"
                          variant="secondary"
                          className={cn(
                            detailOpenIconButtonClass,
                            "min-h-11 min-w-11 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
                          )}
                          aria-label={t("branch.quickAddIncome")}
                          title={t("branch.quickAddIncome")}
                          onClick={() => openBranchQuickTx(b.id, "IN")}
                        >
                          <QuickIncomeIcon />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t("branch.quickAddExpense")} delayMs={200}>
                        <Button
                          type="button"
                          variant="secondary"
                          className={cn(
                            detailOpenIconButtonClass,
                            "min-h-11 min-w-11 text-red-700 hover:border-red-200 hover:bg-red-50"
                          )}
                          aria-label={t("branch.quickAddExpense")}
                          title={t("branch.quickAddExpense")}
                          onClick={() => openBranchQuickTx(b.id, "OUT")}
                        >
                          <QuickExpenseIcon />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                        <Button
                          type="button"
                          variant="secondary"
                          className={cn(
                            detailOpenIconButtonClass,
                            "min-h-11 min-w-11"
                          )}
                          aria-haspopup="dialog"
                          aria-expanded={active}
                          aria-label={t("common.openDetailsDialog")}
                          title={t("common.openDetailsDialog")}
                          onClick={() => openBranchDetail(b.id)}
                        >
                          <EyeIcon />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="-mx-1 hidden overflow-x-auto px-1 md:block sm:mx-0 sm:overflow-visible sm:px-0">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("branch.tableId")}</TableHeader>
                    <TableHeader>{t("branch.tableName")}</TableHeader>
                    <TableHeader
                      className="hidden min-w-[8.5rem] lg:table-cell"
                      title={t("branch.tableSeasonHint")}
                    >
                      {t("branch.tableSeason")}
                    </TableHeader>
                    <TableHeader
                      className="min-w-[10rem]"
                      title={t("branch.tableStaffHint")}
                    >
                      {t("branch.tableStaff")}
                    </TableHeader>
                    <TableHeader className="w-[1%] whitespace-nowrap text-right">
                      {t("branch.tableActions")}
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((b) => {
                    const active = selectedId === b.id;
                    return (
                      <TableRow
                        key={b.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-zinc-50 active:bg-zinc-100",
                          active && "bg-zinc-50"
                        )}
                        onClick={() => openBranchDetail(b.id)}
                      >
                        <TableCell className="font-mono text-zinc-600">
                          {b.id}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900">
                          {b.name}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              seasonBadgeClass(b.seasonStatus)
                            )}
                          >
                            {seasonLabel(b.seasonStatus, t)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[16rem] text-sm text-zinc-700">
                          <span className="lg:hidden">
                            <span
                              className={cn(
                                "mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                                seasonBadgeClass(b.seasonStatus)
                              )}
                            >
                              {seasonLabel(b.seasonStatus, t)}
                            </span>
                          </span>
                          {staffTableLine(b, t)}
                        </TableCell>
                        <TableCell
                          className="w-[1%] whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                            <Tooltip content={t("branch.quickAddIncome")} delayMs={200}>
                              <Button
                                type="button"
                                variant="secondary"
                                className={cn(
                                  detailOpenIconButtonClass,
                                  "text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
                                )}
                                aria-label={t("branch.quickAddIncome")}
                                title={t("branch.quickAddIncome")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBranchQuickTx(b.id, "IN");
                                }}
                              >
                                <QuickIncomeIcon />
                              </Button>
                            </Tooltip>
                            <Tooltip content={t("branch.quickAddExpense")} delayMs={200}>
                              <Button
                                type="button"
                                variant="secondary"
                                className={cn(
                                  detailOpenIconButtonClass,
                                  "text-red-700 hover:border-red-200 hover:bg-red-50"
                                )}
                                aria-label={t("branch.quickAddExpense")}
                                title={t("branch.quickAddExpense")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBranchQuickTx(b.id, "OUT");
                                }}
                              >
                                <QuickExpenseIcon />
                              </Button>
                            </Tooltip>
                            <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                              <Button
                                type="button"
                                variant="secondary"
                                className={detailOpenIconButtonClass}
                                aria-haspopup="dialog"
                                aria-expanded={active}
                                aria-label={t("common.openDetailsDialog")}
                                title={t("common.openDetailsDialog")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBranchDetail(b.id);
                                }}
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
          </>
        )}
        {!isPending && !isError && list.length > 0 && !selectedId && (
          <p className="mt-3 text-sm text-zinc-500">{t("branch.selectHint")}</p>
        )}
      </Card>

      {selected ? (
        <BranchDetailSheet
          open
          branch={selected}
          staff={staff}
          employeeSelfService={personnelPortal}
          onClose={() => {
            setSelectedId(null);
          }}
        />
      ) : null}

      {quickTx ? (
        <AddBranchTransactionModal
          key={`${quickTx.branchId}-${quickTx.nonce}`}
          open
          branchId={quickTx.branchId}
          defaultType={quickTx.type}
          defaultTransactionDate={localIsoDate()}
          onClose={() => setQuickTx(null)}
        />
      ) : null}

      {!personnelPortal ? (
        <AddBranchModal open={addOpen} onClose={() => setAddOpen(false)} />
      ) : null}
    </div>
  );
}
