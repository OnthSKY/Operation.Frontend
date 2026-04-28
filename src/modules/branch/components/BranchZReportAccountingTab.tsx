"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { branchKeys, useBranchZReportAccountingYear } from "@/modules/branch/hooks/useBranchQueries";
import { markZReportAccountingSent } from "@/modules/reminders/api/reminders-api";
import { remindersKeys } from "@/modules/reminders/reminders-keys";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = { branchId: number; active: boolean };

export function BranchZReportAccountingTab({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [yearFilter, setYearFilter] = useState("");
  const effectiveYear = useMemo(() => {
    const s = yearFilter.trim();
    if (!s) return undefined;
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 1990 || n > 2100) return undefined;
    return n;
  }, [yearFilter]);
  const yearInvalid = yearFilter.trim().length > 0 && effectiveYear === undefined;

  const zReportYear = effectiveYear ?? new Date().getFullYear();
  const {
    data: zAcc,
    isPending: zAccPending,
    isError: zAccError,
    error: zAccErr,
    refetch,
  } = useBranchZReportAccountingYear(branchId, zReportYear, active);

  const markM = useMutation({
    mutationFn: markZReportAccountingSent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      notify.success(t("toast.remindersZReportMarked"));
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const dash = "—";
  const zStatusClass = (s: string) => {
    if (s === "PENDING") return "text-amber-800";
    if (s === "SENT") return "text-emerald-800";
    if (s === "UPCOMING") return "text-zinc-500";
    return "text-zinc-400";
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">{t("branch.zReportAccountingHint")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
          <Input
            name="zReportYearFilter"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2100}
            label={t("branch.zReportTabFilterYear")}
            placeholder={t("branch.zReportTabFilterYearPh")}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </div>
        {yearInvalid ? (
          <p className="text-sm text-amber-800">{t("branch.tSeasonFilterYearInvalid")}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => setYearFilter("")}>
            {t("branch.zReportTabResetYear")}
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refetch()}>
            {t("branch.filterApplyRefresh")}
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="text-sm font-semibold text-zinc-900">{t("branch.zReportAccountingTitle")}</h3>
        <p className="mt-2 text-xs text-zinc-600">
          <span className="font-medium text-zinc-700">{zReportYear}</span>
          {!effectiveYear ? (
            <span className="text-zinc-400"> · {t("branch.zReportTabFilterYearPh")}</span>
          ) : null}
        </p>
        {zAccPending ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : zAccError ? (
          <p className="mt-3 text-sm text-red-600">{toErrorMessage(zAccErr)}</p>
        ) : zAcc ? (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("branch.zReportColMonth")}</TableHeader>
                  <TableHeader>{t("branch.zReportColStatus")}</TableHeader>
                  <TableHeader className="hidden sm:table-cell">{t("branch.zReportColSentAt")}</TableHeader>
                  <TableHeader className="hidden md:table-cell">{t("branch.zReportColSentBy")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap">{t("branch.tableActions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {zAcc.months.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell dataLabel={t("branch.zReportColMonth")} className="whitespace-nowrap font-medium">
                      {new Date(zReportYear, row.month - 1, 1).toLocaleDateString(
                        locale === "tr" ? "tr-TR" : "en-US",
                        { month: "long" }
                      )}
                    </TableCell>
                    <TableCell dataLabel={t("branch.zReportColStatus")} className={cn("text-sm font-medium", zStatusClass(row.status))}>
                      {row.status === "NOT_APPLICABLE"
                        ? t("branch.zReportStatusNa")
                        : row.status === "UPCOMING"
                          ? t("branch.zReportStatusUpcoming")
                          : row.status === "PENDING"
                            ? t("branch.zReportStatusPending")
                            : row.status === "SENT"
                              ? t("branch.zReportStatusSent")
                              : row.status}
                    </TableCell>
                    <TableCell
                      dataLabel={t("branch.zReportColSentAt")}
                      className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 whitespace-nowrap text-sm text-zinc-600 md:table-cell"
                    >
                      {row.sentToAccountingAt
                        ? formatLocaleDateTime(row.sentToAccountingAt, locale)
                        : dash}
                    </TableCell>
                    <TableCell
                      dataLabel={t("branch.zReportColSentBy")}
                      className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-sm text-zinc-600 md:table-cell"
                    >
                      {row.sentToAccountingBy?.trim() ? row.sentToAccountingBy.trim() : dash}
                    </TableCell>
                    <TableCell dataLabel={t("branch.tableActions")} className="whitespace-nowrap p-2 align-middle">
                      {row.status === "PENDING" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px] min-w-[44px] px-3 text-sm sm:text-xs"
                          disabled={
                            markM.isPending &&
                            markM.variables?.branchId === branchId &&
                            markM.variables?.year === zReportYear &&
                            markM.variables?.month === row.month
                          }
                          onClick={() =>
                            markM.mutate({ branchId, year: zReportYear, month: row.month })
                          }
                        >
                          {markM.isPending &&
                          markM.variables?.branchId === branchId &&
                          markM.variables?.year === zReportYear &&
                          markM.variables?.month === row.month
                            ? t("reminders.marking")
                            : t("reminders.markSent")}
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-400">{dash}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
