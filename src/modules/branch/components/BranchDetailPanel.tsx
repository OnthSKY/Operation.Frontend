"use client";

import { useI18n } from "@/i18n/context";
import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import { personnelKeys } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { Card } from "@/shared/components/Card";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AddBranchTransactionModal } from "./AddBranchTransactionModal";

function formatMoney(n: number, dash: string) {
  if (n == null || Number.isNaN(n)) return dash;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type Props = {
  branch: Branch;
  staff: Personnel[];
  onClose: () => void;
};

export function BranchDetailPanel({ branch, staff, onClose }: Props) {
  const { t } = useI18n();
  const [txDate, setTxDate] = useState(() => localIsoDate());
  const [txModalOpen, setTxModalOpen] = useState(false);

  const {
    data: transactions = [],
    isPending: txLoading,
    isError: txError,
    error: txErr,
    refetch: refetchTx,
  } = useBranchTransactions(branch.id, txDate);

  const advanceQueries = useQueries({
    queries: staff.map((p) => ({
      queryKey: personnelKeys.advances(p.id, txDate),
      queryFn: () => fetchAdvancesByPersonnel(p.id, txDate),
    })),
  });

  const staffRows = useMemo(() => {
    return staff.map((p, i) => {
      const q = advanceQueries[i];
      const rows = (q?.data ?? []).filter((a) => a.branchId === branch.id);
      const total = rows.reduce((s, a) => s + a.amount, 0);
      return {
        personnel: p,
        total,
        count: rows.length,
        pending: q?.isPending ?? false,
        failed: q?.isError ?? false,
      };
    });
  }, [staff, advanceQueries]);

  const branchAdvanceTotal = useMemo(
    () => staffRows.reduce((s, r) => s + r.total, 0),
    [staffRows]
  );

  const incomeTotal = useMemo(
    () =>
      transactions
        .filter((x) => x.type.toUpperCase() === "IN")
        .reduce((s, x) => s + x.amount, 0),
    [transactions]
  );

  const expenseTotal = useMemo(
    () =>
      transactions
        .filter((x) => x.type.toUpperCase() === "OUT")
        .reduce((s, x) => s + x.amount, 0),
    [transactions]
  );

  const advancesLoading = advanceQueries.some((q) => q.isPending);

  return (
    <>
      <Card
        className="border-zinc-300"
        title={branch.name}
        description={t("branch.detailDesc")}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              type="date"
              label={t("branch.txDate")}
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-auto min-w-[10rem]"
            />
            <Button
              type="button"
              variant="secondary"
              className="min-h-12"
              onClick={() => refetchTx()}
            >
              {t("branch.refreshTx")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setTxModalOpen(true)}>
              {t("branch.addTx")}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("branch.closeDetail")}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.dayIncome")}
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-800">
              {formatMoney(incomeTotal, t("personnel.dash"))}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.dayExpense")}
            </p>
            <p className="mt-1 text-lg font-semibold text-red-800">
              {formatMoney(expenseTotal, t("personnel.dash"))}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.dayNet")}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMoney(incomeTotal - expenseTotal, t("personnel.dash"))}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("branch.txList")}
          </h3>
          {txLoading && (
            <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
          )}
          {txError && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-sm text-red-600">{toErrorMessage(txErr)}</p>
              <Button type="button" variant="secondary" onClick={() => refetchTx()}>
                {t("common.retry")}
              </Button>
            </div>
          )}
          {!txLoading && !txError && transactions.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">{t("branch.noTx")}</p>
          )}
          {!txLoading && !txError && transactions.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("branch.txColType")}</TableHeader>
                    <TableHeader>{t("branch.txColAmount")}</TableHeader>
                    <TableHeader>{t("branch.txColCategory")}</TableHeader>
                    <TableHeader>{t("branch.txColNote")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span
                          className={
                            row.type.toUpperCase() === "IN"
                              ? "font-medium text-emerald-800"
                              : "font-medium text-red-800"
                          }
                        >
                          {row.type.toUpperCase() === "IN"
                            ? t("branch.txTypeIn")
                            : t("branch.txTypeOut")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatMoney(row.amount, t("personnel.dash"))}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {row.category ?? t("personnel.dash")}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-zinc-600">
                        {row.description ?? t("personnel.dash")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t("branch.staffTitle")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/personnel"
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t("branch.openPersonnel")}
              </Link>
              <Link
                href="/personnel#personnel-advance"
                className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                {t("branch.giveAdvance")}
              </Link>
            </div>
          </div>

          {staff.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("branch.staffNone")}</p>
          ) : (
            <>
              <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-xs text-zinc-500">
                  {t("branch.totalAdvancesBranchPeriod")}
                </p>
                <p className="text-base font-semibold text-zinc-900">
                  {advancesLoading
                    ? t("common.loading")
                    : formatMoney(branchAdvanceTotal, t("personnel.dash"))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("branch.staffName")}</TableHeader>
                      <TableHeader>{t("branch.staffAdvTotal")}</TableHeader>
                      <TableHeader>{t("branch.staffAdvCount")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffRows.map((r) => (
                      <TableRow key={r.personnel.id}>
                        <TableCell className="font-medium text-zinc-900">
                          {r.personnel.fullName}
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.pending
                            ? t("common.loading")
                            : r.failed
                              ? "—"
                              : formatMoney(r.total, t("personnel.dash"))}
                        </TableCell>
                        <TableCell>
                          {r.pending
                            ? t("common.loading")
                            : r.failed
                              ? "—"
                              : r.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </Card>

      <AddBranchTransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        branchId={branch.id}
        defaultTransactionDate={txDate}
      />
    </>
  );
}
