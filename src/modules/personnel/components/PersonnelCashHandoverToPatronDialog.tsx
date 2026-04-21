"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import {
  fetchPersonnelCashHandoverLinesPaged,
  fetchPersonnelManagementSnapshot,
} from "@/modules/personnel/api/personnel-api";
import { personnelKeys } from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type { Personnel } from "@/types/personnel";
import type {
  PersonnelCashHandoverLine,
  PersonnelManagementSnapshot,
} from "@/types/personnel-management-snapshot";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const TITLE_ID = "personnel-cash-handover-to-patron-title";

/** Şube atanmış olsa bile havuz başka şubede olabilir; patrona ödeme için en uygun şubeyi seçer. */
function pickEffectiveHandoverBranch(
  snap: PersonnelManagementSnapshot | undefined,
  assignedBranchId: number,
  currencyCode: string
): { effectiveBranchId: number; effectivePool: number; assignedPool: number } {
  const ccy = currencyCode.trim().toUpperCase() || "TRY";
  const pool = snap?.cashHandoverPoolRemainingByBranch ?? [];
  const rows = pool.filter((r) => r.currencyCode.trim().toUpperCase() === ccy);
  let assignedPool = 0;
  if (assignedBranchId > 0) {
    const on = rows.find((r) => r.branchId === assignedBranchId);
    assignedPool = Number(on?.totalRemainingHandover ?? 0) || 0;
    if (assignedPool > 0.009) {
      return {
        effectiveBranchId: assignedBranchId,
        effectivePool: assignedPool,
        assignedPool,
      };
    }
  }
  let bestId = assignedBranchId;
  let bestAmt = 0;
  for (const r of rows) {
    const a = Number(r.totalRemainingHandover) || 0;
    if (a > bestAmt) {
      bestAmt = a;
      bestId = r.branchId;
    }
  }
  if (bestAmt > 0.009) {
    return {
      effectiveBranchId: bestId,
      effectivePool: bestAmt,
      assignedPool,
    };
  }
  return { effectiveBranchId: assignedBranchId, effectivePool: 0, assignedPool };
}

async function fetchAllHandoverLinesPaged(
  personnelId: number,
  currencyCode: string,
  /** Verilmez veya 0: tüm şubeler (API `BranchId` null). */
  branchFilter?: number
): Promise<PersonnelCashHandoverLine[]> {
  const ccy = currencyCode.trim().toUpperCase() || "TRY";
  const acc: PersonnelCashHandoverLine[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const r = await fetchPersonnelCashHandoverLinesPaged(personnelId, {
      page,
      pageSize,
      ...(branchFilter != null && branchFilter > 0 ? { branchId: branchFilter } : {}),
      currencyCode: ccy,
    });
    acc.push(...r.items);
    if (r.items.length === 0 || page * pageSize >= r.totalCount) break;
    page += 1;
    if (page > 40) break;
  }
  return acc;
}

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel;
  /** Atanan şube adı (kartta bağlam). */
  branchName?: string;
  onOpenPatronRegister: (ctx: {
    personnel: Personnel;
    branchId: number;
    branchName?: string;
    currencyCode: string;
    suggestedAmount: number;
  }) => void;
};

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "branch" | "all";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5",
        tone === "branch"
          ? "border-sky-200/90 bg-gradient-to-br from-sky-50/95 via-white to-white"
          : "border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-white"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl",
          tone === "branch" ? "bg-sky-300/60" : "bg-violet-300/50"
        )}
        aria-hidden
      />
      <p className="relative text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="relative mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-950 sm:text-3xl">
        {value}
      </p>
      {sub ? (
        <p className="relative mt-2 text-xs leading-relaxed text-zinc-600">{sub}</p>
      ) : null}
    </div>
  );
}

export function PersonnelCashHandoverToPatronDialog({
  open,
  onClose,
  personnel,
  branchName,
  onOpenPatronRegister,
}: Props) {
  const { t, locale } = useI18n();
  const loc = locale as Locale;
  const assignedBranchId = personnel.branchId ?? 0;
  const personnelId = personnel.id;
  const ccy = personnel.currencyCode?.trim().toUpperCase() || "TRY";
  const dialogOpen = open && !personnel.isDeleted && personnelId > 0;

  const snapQuery = useQuery({
    queryKey: personnelKeys.managementSnapshot(personnelId),
    queryFn: () => fetchPersonnelManagementSnapshot(personnelId),
    enabled: dialogOpen,
    staleTime: 10_000,
  });

  const effectiveBranch = useMemo(
    () => pickEffectiveHandoverBranch(snapQuery.data, assignedBranchId, ccy),
    [snapQuery.data, assignedBranchId, ccy]
  );

  const poolTotalThisBranch = useMemo(() => {
    const snap = snapQuery.data;
    if (!snap) return 0;
    const row = snap.cashHandoverPoolRemainingByBranch?.find(
      (r) => r.branchId === assignedBranchId && r.currencyCode === ccy
    );
    return Number(row?.totalRemainingHandover ?? 0) || 0;
  }, [snapQuery.data, assignedBranchId, ccy]);

  const poolTotalAllBranchesSameCcy = useMemo(() => {
    const snap = snapQuery.data;
    if (!snap) return 0;
    return snap.cashHandoverPoolRemainingByBranch
      .filter((r) => r.currencyCode.trim().toUpperCase() === ccy)
      .reduce((s, r) => s + (Number(r.totalRemainingHandover) || 0), 0);
  }, [snapQuery.data, ccy]);

  const poolBreakdownSameCcy = useMemo(() => {
    const snap = snapQuery.data;
    if (!snap) return [];
    const fb = (id: number) =>
      t("personnel.cashHandoverToPatronDialogBranchFallback").replace("{id}", String(id));
    return snap.cashHandoverPoolRemainingByBranch
      .filter(
        (r) =>
          r.currencyCode.trim().toUpperCase() === ccy &&
          (Number(r.totalRemainingHandover) || 0) > 0.009
      )
      .map((r) => ({
        branchId: r.branchId,
        label: r.branchName?.trim() || fb(r.branchId),
        amount: Number(r.totalRemainingHandover) || 0,
      }))
      .sort((a, b) => {
        if (a.branchId === assignedBranchId) return -1;
        if (b.branchId === assignedBranchId) return 1;
        return b.amount - a.amount || a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      });
  }, [snapQuery.data, ccy, assignedBranchId, t]);

  const linesBranchFilter = effectiveBranch.effectiveBranchId;

  const linesQuery = useQuery({
    queryKey: [
      "personnel",
      "cash-handover-overview-lines",
      personnelId,
      linesBranchFilter,
      ccy,
    ],
    queryFn: () => fetchAllHandoverLinesPaged(personnelId, ccy, linesBranchFilter),
    /** Özet gelmeden çekme; havuz yoksa IN listesine istek atma. */
    enabled:
      dialogOpen &&
      !snapQuery.isPending &&
      poolTotalAllBranchesSameCcy > 0.009,
    staleTime: 10_000,
  });

  const lines = linesQuery.data ?? [];
  const dash = t("personnel.dash");
  const displayName = personnelDisplayName(personnel);
  const branchLabel =
    branchName?.trim() ||
    t("personnel.cashHandoverToPatronDialogBranchFallback").replace("{id}", String(assignedBranchId));

  const effectiveBranchLabel =
    linesBranchFilter > 0
      ? snapQuery.data?.cashHandoverPoolRemainingByBranch?.find((r) => r.branchId === linesBranchFilter)
          ?.branchName?.trim() ||
        t("personnel.cashHandoverToPatronDialogBranchFallback").replace("{id}", String(linesBranchFilter))
      : branchLabel;

  const registerDisabled =
    snapQuery.isPending ||
    poolTotalAllBranchesSameCcy <= 0.009 ||
    snapQuery.isError ||
    effectiveBranch.effectiveBranchId <= 0;

  const showAssignedPoolMismatch =
    !snapQuery.isPending &&
    !snapQuery.isError &&
    poolTotalAllBranchesSameCcy > 0.009 &&
    poolTotalThisBranch <= 0.009 &&
    poolTotalAllBranchesSameCcy > poolTotalThisBranch + 0.009;

  return (
    <Modal
      open={dialogOpen}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("personnel.cashHandoverToPatronDialogTitle")}
      description={t("personnel.cashHandoverToPatronDialogLead")}
      wide
      wideExpanded
      nested
    >
      <div className="space-y-5 text-sm sm:space-y-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.pocketClaimDialogFromLabel")}
            </p>
            <p className="truncate text-base font-semibold text-zinc-900">{displayName}</p>
          </div>
          <div className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600">
            {branchLabel} · {ccy}
          </div>
        </div>

        {showAssignedPoolMismatch ? (
          <p className="rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950">
            {t("personnel.cashHandoverToPatronDialogAssignedBranchPoolZeroHint")}
          </p>
        ) : null}

        {snapQuery.isPending ? (
          <p className="text-sm text-zinc-500">{t("personnel.cashHandoverToPatronDialogLoading")}</p>
        ) : snapQuery.isError ? (
          <p className="text-sm text-amber-800">{t("personnel.cashHandoverToPatronDialogError")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <StatCard
                tone="branch"
                label={t("personnel.cashHandoverToPatronDialogBranchPoolLabel").replace(
                  "{branch}",
                  branchLabel
                )}
                value={formatLocaleAmount(poolTotalThisBranch, loc, ccy)}
                sub={t("personnel.cashHandoverToPatronDialogBranchPoolSub")}
              />
              <StatCard
                tone="all"
                label={t("personnel.cashHandoverToPatronDialogAllBranchesPoolLabel").replace(
                  "{ccy}",
                  ccy
                )}
                value={formatLocaleAmount(poolTotalAllBranchesSameCcy, loc, ccy)}
                sub={t("personnel.cashHandoverToPatronDialogAllBranchesPoolSub")}
              />
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm shadow-zinc-900/5 sm:px-5 sm:py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                {t("personnel.cashHandoverToPatronDialogPoolByBranchTitle").replace("{ccy}", ccy)}
              </p>
              {poolBreakdownSameCcy.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {t("personnel.cashHandoverToPatronDialogPoolByBranchEmpty")}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {poolBreakdownSameCcy.map((row) => (
                    <li
                      key={row.branchId}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0"
                    >
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm font-medium text-zinc-800",
                          row.branchId === assignedBranchId && "text-sky-900"
                        )}
                      >
                        {row.label}
                        {row.branchId === assignedBranchId ? (
                          <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
                            {t("personnel.cashHandoverToPatronDialogPoolThisBranchBadge")}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-950">
                        {formatLocaleAmount(row.amount, loc, ccy)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-200 pt-3">
                <span className="text-sm font-bold text-zinc-900">
                  {t("personnel.cashHandoverToPatronDialogPoolTotalLabel")}
                </span>
                <span className="text-base font-bold tabular-nums text-zinc-950 sm:text-lg">
                  {formatLocaleAmount(poolTotalAllBranchesSameCcy, loc, ccy)}
                </span>
              </div>
            </div>
          </>
        )}

        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-600">
              {t("personnel.cashHandoverToPatronDialogTableTitle")}
            </h4>
            <p className="text-[0.7rem] leading-snug text-zinc-500 sm:text-right">
              {t("personnel.cashHandoverToPatronDialogTableScopeHint").replace("{branch}", effectiveBranchLabel)}
            </p>
          </div>
          {linesQuery.isPending ? (
            <p className="text-sm text-zinc-500">{t("personnel.cashHandoverToPatronDialogTableLoading")}</p>
          ) : linesQuery.isError ? (
            <p className="text-sm text-amber-800">{t("personnel.cashHandoverToPatronDialogTableError")}</p>
          ) : lines.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-zinc-600">
              {t("personnel.cashHandoverToPatronDialogTableEmpty")}
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5 sm:mx-0">
              <div className="min-w-[28rem]">
                <Table>
                  <TableHead>
                    <TableRow className="bg-zinc-50/95">
                      <TableHeader className="whitespace-nowrap">
                        {t("personnel.detailMgmtHandoverColDate")}
                      </TableHeader>
                      <TableHeader className="whitespace-nowrap">IN</TableHeader>
                      <TableHeader className="whitespace-nowrap text-right">
                        {t("personnel.detailMgmtHandoverColAmount")}
                      </TableHeader>
                      <TableHeader className="whitespace-nowrap text-right">
                        {t("personnel.detailMgmtHandoverColSettled")}
                      </TableHeader>
                      <TableHeader className="whitespace-nowrap text-right">
                        {t("personnel.detailMgmtHandoverColRemaining")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((row, idx) => (
                      <TableRow
                        key={row.transactionId}
                        className={cn(idx % 2 === 1 && "bg-zinc-50/40")}
                      >
                        <TableCell className="whitespace-nowrap text-zinc-700">
                          {formatLocaleDate(row.transactionDate, loc, dash)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600">
                          #{row.transactionId}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-zinc-800">
                          {formatLocaleAmount(row.cashAmount, loc, ccy)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-zinc-800">
                          {formatLocaleAmount(row.settledFromHandoverAmount, loc, ccy)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-zinc-950">
                          {formatLocaleAmount(row.remainingHandoverAmount, loc, ccy)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-11 w-full sm:w-auto"
            disabled={registerDisabled}
            onClick={() => {
              onOpenPatronRegister({
                personnel,
                branchId: effectiveBranch.effectiveBranchId,
                branchName: effectiveBranchLabel,
                currencyCode: ccy,
                suggestedAmount: effectiveBranch.effectivePool,
              });
            }}
          >
            {t("personnel.cashHandoverToPatronDialogOpenRegister")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
