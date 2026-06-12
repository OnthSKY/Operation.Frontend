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
import { ToggleButton } from "@/shared/ui/ToggleButton";
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
  const zStatusBadgeClass = (s: string) => {
    if (s === "PENDING") return "bg-amber-50 text-amber-800 ring-amber-200";
    if (s === "SENT") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    if (s === "UPCOMING") return "bg-zinc-50 text-zinc-600 ring-zinc-200";
    return "bg-zinc-50 text-zinc-400 ring-zinc-200";
  };
  const statusLabel = (s: string) =>
    s === "NOT_APPLICABLE"
      ? t("branch.zReportStatusNa")
      : s === "UPCOMING"
        ? t("branch.zReportStatusUpcoming")
        : s === "PENDING"
          ? t("branch.zReportStatusPending")
          : s === "SENT"
            ? t("branch.zReportStatusSent")
            : s;

  const allYearsActive = yearFilter.trim() === "";

  return (
    <div className="flex flex-col gap-3">
      <details className="group rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden sm:px-4">
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8.5h.01M11 12h1v4.5h1" />
              </svg>
            </span>
            <span className="truncate text-sm font-medium text-zinc-900">
              {t("branch.zReportAccountingTitle")}
            </span>
          </span>
          <span
            aria-hidden
            className="shrink-0 text-zinc-400 transition group-open:rotate-180"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <p className="border-t border-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-600 sm:px-4">
          {t("branch.zReportAccountingHint")}
        </p>
      </details>

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ring-1 ring-zinc-950/[0.03] sm:flex-row sm:items-end sm:gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
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
        <div className="flex gap-2">
          <ToggleButton
            active={allYearsActive}
            fullWidth
            onClick={() => setYearFilter("")}
          >
            {t("branch.zReportTabResetYear")}
          </ToggleButton>
        </div>
      </div>
      {yearInvalid ? (
        <p className="px-1 text-xs text-amber-800">{t("branch.tSeasonFilterYearInvalid")}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-zinc-500">
          <span className="font-semibold text-zinc-900">{zReportYear}</span>
          {!effectiveYear ? (
            <span className="text-zinc-400"> · {t("branch.zReportTabFilterYearPh")}</span>
          ) : null}
        </p>
      </div>

      {zAccPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : zAccError ? (
        <p className="text-sm text-red-600">{toErrorMessage(zAccErr)}</p>
      ) : zAcc ? (
        <>
          <ul className="flex flex-col gap-1.5 sm:hidden">
            {zAcc.months.map((row) => {
              const isMarking =
                markM.isPending &&
                markM.variables?.branchId === branchId &&
                markM.variables?.year === zReportYear &&
                markM.variables?.month === row.month;
              return (
                <li
                  key={row.month}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.03]"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">
                        {new Date(zReportYear, row.month - 1, 1).toLocaleDateString(
                          locale === "tr" ? "tr-TR" : "en-US",
                          { month: "long" }
                        )}
                      </p>
                      {row.sentToAccountingAt || row.sentToAccountingBy ? (
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {row.sentToAccountingAt
                            ? formatLocaleDateTime(row.sentToAccountingAt, locale)
                            : ""}
                          {row.sentToAccountingAt && row.sentToAccountingBy ? (
                            <span aria-hidden className="mx-1 text-zinc-300">·</span>
                          ) : null}
                          {row.sentToAccountingBy?.trim() ?? ""}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                        zStatusBadgeClass(row.status)
                      )}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  {row.status === "PENDING" ? (
                    <button
                      type="button"
                      disabled={isMarking}
                      onClick={() =>
                        markM.mutate({ branchId, year: zReportYear, month: row.month })
                      }
                      className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-100 bg-emerald-50/50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {isMarking ? t("reminders.marking") : t("reminders.markSent")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.03] sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("branch.zReportColMonth")}</TableHeader>
                  <TableHeader>{t("branch.zReportColStatus")}</TableHeader>
                  <TableHeader>{t("branch.zReportColSentAt")}</TableHeader>
                  <TableHeader className="hidden md:table-cell">{t("branch.zReportColSentBy")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap">{t("branch.tableActions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {zAcc.months.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {new Date(zReportYear, row.month - 1, 1).toLocaleDateString(
                        locale === "tr" ? "tr-TR" : "en-US",
                        { month: "long" }
                      )}
                    </TableCell>
                    <TableCell className={cn("text-sm font-medium", zStatusClass(row.status))}>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                          zStatusBadgeClass(row.status)
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                      {row.sentToAccountingAt
                        ? formatLocaleDateTime(row.sentToAccountingAt, locale)
                        : dash}
                    </TableCell>
                    <TableCell className="hidden text-sm text-zinc-600 md:table-cell">
                      {row.sentToAccountingBy?.trim() ? row.sentToAccountingBy.trim() : dash}
                    </TableCell>
                    <TableCell className="whitespace-nowrap p-2 align-middle">
                      {row.status === "PENDING" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!w-auto min-h-[36px] px-3 text-xs"
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
        </>
      ) : null}
    </div>
  );
}
