"use client";

import { txCodeLabel } from "@/modules/branch/lib/branch-transaction-options";
import { useI18n } from "@/i18n/context";
import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { PersonnelAdvanceHistory } from "@/modules/personnel/components/PersonnelAdvanceHistory";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { Card } from "@/shared/components/Card";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
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

type Props = {
  branch: Branch;
  staff: Personnel[];
  onClose: () => void;
};

export function BranchDetailPanel({ branch, staff, onClose }: Props) {
  const { t, locale } = useI18n();
  const { data: personnelData = [] } = usePersonnelList();
  const activePersonnel = useMemo(
    () => personnelData.filter((p) => !p.isDeleted),
    [personnelData]
  );

  const [txDate, setTxDate] = useState(() => localIsoDate());
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceInitialPersonId, setAdvanceInitialPersonId] = useState<
    number | null
  >(null);

  const {
    data: transactions = [],
    isPending: txLoading,
    isError: txError,
    error: txErr,
    refetch: refetchTx,
  } = useBranchTransactions(branch.id, txDate);

  const advanceYear = useMemo(() => {
    const y = Math.trunc(Number(txDate.slice(0, 4)));
    return Number.isFinite(y) && y >= 1900 ? y : new Date().getFullYear();
  }, [txDate]);

  const advanceQueries = useQueries({
    queries: staff.map((p) => ({
      queryKey: personnelKeys.advances(p.id),
      queryFn: () => fetchAdvancesByPersonnel(p.id),
    })),
  });

  const staffRows = useMemo(() => {
    return staff.map((p, i) => {
      const q = advanceQueries[i];
      const allBranch = (q?.data ?? []).filter((a) => a.branchId === branch.id);
      const rows = allBranch.filter((a) => a.effectiveYear === advanceYear);
      const codes = [
        ...new Set(
          rows.map((a) =>
            String(a.currencyCode || "TRY")
              .trim()
              .toUpperCase()
          )
        ),
      ];
      const advCurrency = codes.length === 1 ? codes[0] : undefined;
      const total = rows.reduce((s, a) => s + a.amount, 0);
      return {
        personnel: p,
        total,
        count: rows.length,
        pending: q?.isPending ?? false,
        failed: q?.isError ?? false,
        advCurrency,
      };
    });
  }, [staff, advanceQueries, branch.id, advanceYear]);

  const { branchAdvanceTotal, branchAdvCurrency } = useMemo(() => {
    const all = staff.flatMap((p, i) => {
      const q = advanceQueries[i];
      return (q?.data ?? []).filter(
        (a) => a.branchId === branch.id && a.effectiveYear === advanceYear
      );
    });
    const codes = [
      ...new Set(
        all.map((a) =>
          String(a.currencyCode || "TRY")
            .trim()
            .toUpperCase()
        )
      ),
    ];
    return {
      branchAdvanceTotal: all.reduce((s, a) => s + a.amount, 0),
      branchAdvCurrency: codes.length === 1 ? codes[0] : undefined,
    };
  }, [staff, advanceQueries, branch.id, advanceYear]);

  const dayTxCurrency = useMemo(() => {
    if (!transactions.length) return undefined;
    const codes = [
      ...new Set(
        transactions.map((x) =>
          String(x.currencyCode || "TRY")
            .trim()
            .toUpperCase()
        )
      ),
    ];
    return codes.length === 1 ? codes[0] : undefined;
  }, [transactions]);

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

  const openAdvance = (personnelId?: number) => {
    setAdvanceInitialPersonId(
      personnelId != null && personnelId > 0 ? personnelId : null
    );
    setAdvanceOpen(true);
  };

  const closeAdvance = () => {
    setAdvanceOpen(false);
    setAdvanceInitialPersonId(null);
  };

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
              {formatMoneyDash(
                incomeTotal,
                t("personnel.dash"),
                locale,
                dayTxCurrency
              )}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.dayExpense")}
            </p>
            <p className="mt-1 text-lg font-semibold text-red-800">
              {formatMoneyDash(
                expenseTotal,
                t("personnel.dash"),
                locale,
                dayTxCurrency
              )}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.dayNet")}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMoneyDash(
                incomeTotal - expenseTotal,
                t("personnel.dash"),
                locale,
                dayTxCurrency
              )}
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
                    <TableHeader>{t("branch.txColCashCard")}</TableHeader>
                    <TableHeader>{t("branch.txColMainCategory")}</TableHeader>
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
                        {formatMoneyDash(
                          row.amount,
                          t("personnel.dash"),
                          locale,
                          row.currencyCode
                        )}
                      </TableCell>
                      <TableCell className="max-w-[14rem] font-mono text-xs text-zinc-600">
                        {row.cashAmount != null &&
                        row.cardAmount != null &&
                        row.type.toUpperCase() === "IN" ? (
                          <span>
                            {t("branch.txCashShort")}:{" "}
                            {formatMoneyDash(
                              row.cashAmount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                            <br />
                            {t("branch.txCardShort")}:{" "}
                            {formatMoneyDash(
                              row.cardAmount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                          </span>
                        ) : (
                          t("personnel.dash")
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {txCodeLabel(row.mainCategory, t) || t("personnel.dash")}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {txCodeLabel(row.category, t) || t("personnel.dash")}
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
              <Button
                type="button"
                className="min-h-11"
                disabled={activePersonnel.length === 0}
                onClick={() => openAdvance()}
              >
                {t("branch.giveAdvance")}
              </Button>
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
                    : formatMoneyDash(
                        branchAdvanceTotal,
                        t("personnel.dash"),
                        locale,
                        branchAdvCurrency
                      )}
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("branch.staffName")}</TableHeader>
                      <TableHeader>{t("branch.staffAdvTotal")}</TableHeader>
                      <TableHeader>{t("branch.staffAdvCount")}</TableHeader>
                      <TableHeader className="min-w-[14rem] max-w-[20rem]">
                        {t("branch.staffAdvHistory")}
                      </TableHeader>
                      <TableHeader className="w-[1%] whitespace-nowrap">
                        {t("branch.staffGiveAdvanceRow")}
                      </TableHeader>
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
                              : formatMoneyDash(
                                  r.total,
                                  t("personnel.dash"),
                                  locale,
                                  r.advCurrency
                                )}
                        </TableCell>
                        <TableCell>
                          {r.pending
                            ? t("common.loading")
                            : r.failed
                              ? "—"
                              : r.count}
                        </TableCell>
                        <TableCell className="max-w-[20rem] align-top">
                          <PersonnelAdvanceHistory
                            personnelId={r.personnel.id}
                            branchIdFilter={branch.id}
                            variant="inline"
                            maxDetailRows={6}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          {!r.personnel.isDeleted ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-9 whitespace-nowrap px-2 py-1 text-xs"
                              onClick={() => openAdvance(r.personnel.id)}
                            >
                              {t("branch.staffGiveAdvanceRow")}
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
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

      <AdvancePersonnelModal
        open={advanceOpen}
        onClose={closeAdvance}
        personnel={activePersonnel}
        initialPersonnelId={advanceInitialPersonId}
      />
    </>
  );
}
