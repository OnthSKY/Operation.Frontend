"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { usePersonnelManagementSnapshot } from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { PersonnelCurrencySnapshot } from "@/types/personnel-management-snapshot";
import type { Personnel } from "@/types/personnel";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useMemo } from "react";

function formatHireShort(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso ?? "—";
  return new Date(d + "T12:00:00").toLocaleDateString();
}

function signedMoney(
  n: number,
  dash: string,
  locale: Locale,
  currencyCode: string
): string {
  const abs = formatMoneyDash(Math.abs(n), dash, locale, currencyCode);
  if (n === 0) return abs;
  return n > 0 ? `+${abs}` : `−${abs}`;
}

function emptyRow(ccy: string): PersonnelCurrencySnapshot {
  return {
    currencyCode: ccy,
    totalAdvanceAllTime: 0,
    totalSalaryAllTime: 0,
    netSalaryMinusAdvanceAllTime: 0,
    totalAdvanceYearToDate: 0,
    totalSalaryYearToDate: 0,
    netSalaryMinusAdvanceYearToDate: 0,
    totalCashHandoverAsResponsibleAllTime: 0,
    totalCashHandoverAsResponsibleYearToDate: 0,
  };
}

function pickPrimaryCurrency(
  snap: { primaryCurrencyCode: string; byCurrency: PersonnelCurrencySnapshot[] }
): PersonnelCurrencySnapshot {
  const pc = snap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
  const hit = snap.byCurrency.find((c) => c.currencyCode.toUpperCase() === pc);
  if (hit) return hit;
  return snap.byCurrency[0] ?? emptyRow(pc);
}

/** Ana para biriminde kasa devri yoksa bile, devredilen tutarı olan ilk satırı seçer. */
function pickHandoverCurrencyRow(
  snap: { primaryCurrencyCode: string; byCurrency: PersonnelCurrencySnapshot[] }
): PersonnelCurrencySnapshot | null {
  const pc = snap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
  const withHand = snap.byCurrency.filter((r) => r.totalCashHandoverAsResponsibleAllTime > 0);
  if (withHand.length === 0) return null;
  return withHand.find((r) => r.currencyCode.toUpperCase() === pc) ?? withHand[0] ?? null;
}

function MetricTile({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: "neutral" | "positive" | "negative" | "violet" | "sky";
}) {
  const border =
    emphasis === "positive"
      ? "border-emerald-200/90 bg-emerald-50/50"
      : emphasis === "negative"
        ? "border-amber-200/90 bg-amber-50/50"
        : emphasis === "violet"
          ? "border-violet-200/90 bg-violet-50/40"
          : emphasis === "sky"
            ? "border-sky-400/95 bg-sky-50/70 ring-1 ring-sky-300/60"
            : "border-zinc-200/90 bg-zinc-50/80";
  return (
    <div className={cn("rounded-xl border p-3 shadow-sm shadow-zinc-900/5 sm:p-4", border)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

type Props = {
  personnel: Personnel;
  open: boolean;
};

export function PersonnelManagementSnapshotSection({ personnel, open }: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const { data, isPending, isError, error, refetch } = usePersonnelManagementSnapshot(
    personnel.id,
    open
  );

  const snap = data;
  const primary = useMemo(() => (snap ? pickPrimaryCurrency(snap) : null), [snap]);
  const handoverRow = useMemo(() => (snap ? pickHandoverCurrencyRow(snap) : null), [snap]);

  const netAll = primary?.netSalaryMinusAdvanceAllTime ?? 0;
  const netTone =
    netAll > 0 ? ("positive" as const) : netAll < 0 ? ("negative" as const) : ("neutral" as const);

  const storyNet = useMemo(() => {
    if (!primary || !snap) return "";
    const ccy = primary.currencyCode;
    const netLabel = signedMoney(netAll, dash, locale, ccy);
    if (netAll > 0) return t("personnel.detailMgmtNetPositive").replace("{net}", netLabel);
    if (netAll < 0) return t("personnel.detailMgmtNetNegative").replace("{net}", netLabel);
    return t("personnel.detailMgmtNetZero").replace("{ccy}", ccy);
  }, [primary, snap, netAll, dash, locale, t]);

  const ytdLine = useMemo(() => {
    if (!primary || !snap) return "";
    return t("personnel.detailMgmtYtdLine")
      .replace("{year}", String(snap.currentCalendarYear))
      .replace(
        "{sal}",
        formatMoneyDash(primary.totalSalaryYearToDate, dash, locale, primary.currencyCode)
      )
      .replace(
        "{adv}",
        formatMoneyDash(primary.totalAdvanceYearToDate, dash, locale, primary.currencyCode)
      )
      .replace(
        "{net}",
        signedMoney(primary.netSalaryMinusAdvanceYearToDate, dash, locale, primary.currencyCode)
      );
  }, [primary, snap, dash, locale, t]);

  const handoverHint = useMemo(() => {
    if (!handoverRow || !snap) return "";
    const ytd = formatMoneyDash(
      handoverRow.totalCashHandoverAsResponsibleYearToDate,
      dash,
      locale,
      handoverRow.currencyCode
    );
    return `${t("personnel.detailMgmtTileCashHandoverHint")} · ${String(snap.currentCalendarYear)}: ${ytd} · ${t("personnel.detailProfileCashHandoverCount").replace("{n}", String(snap.cashHandoverResponsibleRecordCount))}`;
  }, [handoverRow, snap, dash, locale, t]);

  if (!open) return null;

  return (
    <section
      className="mb-3 shrink-0 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-md shadow-zinc-900/10 sm:p-5"
      aria-labelledby="personnel-mgmt-snapshot-title"
    >
      <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id="personnel-mgmt-snapshot-title"
          className="text-base font-semibold tracking-tight text-zinc-900"
        >
          {t("personnel.detailMgmtTitle")}
        </h3>
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
          {t("personnel.detailMgmtBadge")}
        </p>
      </div>

      {isPending ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
          <Button type="button" variant="secondary" className="w-full min-h-10 sm:w-auto" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && snap && primary ? (
        <div className="mt-4 space-y-4">
          <div
            className={cn(
              "rounded-xl border-l-4 p-4 sm:p-5",
              netTone === "positive" && "border-l-emerald-500 bg-emerald-50/35",
              netTone === "negative" && "border-l-amber-500 bg-amber-50/35",
              netTone === "neutral" && "border-l-zinc-400 bg-zinc-50/90"
            )}
          >
            <p className="text-sm font-medium leading-relaxed text-zinc-900">
              {t("personnel.detailMgmtStoryP1")
                .replace("{name}", personnelDisplayName(personnel))
                .replace("{days}", String(snap.tenureDaysInclusive))
                .replace("{hire}", formatHireShort(snap.hireDate))}
            </p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-900">{storyNet}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{ytdLine}</p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t("personnel.detailMgmtFootnote")}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {handoverRow ? (
              <div className="col-span-2 lg:col-span-3 xl:col-span-6">
                <MetricTile
                  label={t("personnel.detailMgmtTileCashHandover")}
                  value={formatMoneyDash(
                    handoverRow.totalCashHandoverAsResponsibleAllTime,
                    dash,
                    locale,
                    handoverRow.currencyCode
                  )}
                  hint={handoverHint}
                  emphasis="sky"
                />
              </div>
            ) : null}
            <MetricTile
              label={t("personnel.detailMgmtTileTenure")}
              value={`${snap.tenureDaysInclusive}`}
              hint={t("personnel.detailMgmtTileTenureHint")}
              emphasis="violet"
            />
            <MetricTile
              label={t("personnel.detailMgmtTileAdvanceTotal")}
              value={formatMoneyDash(
                primary.totalAdvanceAllTime,
                dash,
                locale,
                primary.currencyCode
              )}
              hint={primary.currencyCode}
            />
            <MetricTile
              label={t("personnel.detailMgmtTileSalaryTotal")}
              value={formatMoneyDash(
                primary.totalSalaryAllTime,
                dash,
                locale,
                primary.currencyCode
              )}
              hint={primary.currencyCode}
            />
            <MetricTile
              label={t("personnel.detailMgmtTileNetAll")}
              value={signedMoney(netAll, dash, locale, primary.currencyCode)}
              hint={t("personnel.detailMgmtTileNetHint")}
              emphasis={netTone === "neutral" ? "violet" : netTone}
            />
            <MetricTile
              label={t("personnel.detailMgmtTileRecords")}
              value={`${snap.advanceRecordCount + snap.salaryPaymentRecordCount}`}
              hint={t("personnel.detailMgmtTileRecordsHint")
                .replace("{adv}", String(snap.advanceRecordCount))
                .replace("{sal}", String(snap.salaryPaymentRecordCount))}
            />
            <MetricTile
              label={t("personnel.detailMgmtTileWarehouses")}
              value={`${snap.warehouseResponsibilityCount}`}
              hint={t("personnel.detailMgmtTileWarehousesHint")}
            />
          </div>

          {(snap.cashHandoverLines?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-sky-200/90 bg-sky-50/40 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-900/80">
                {t("personnel.detailMgmtHandoverLinesTitle")}
              </p>
              <div className="mt-3 md:hidden space-y-2">
                {(snap.cashHandoverLines ?? []).map((row) => {
                  const cat = [row.mainCategory, row.category].filter(Boolean).join(" · ");
                  return (
                    <article
                      key={row.transactionId}
                      className="rounded-lg border border-sky-200/70 bg-white/90 p-3 text-sm shadow-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-700">
                          {formatLocaleDate(row.transactionDate, locale, dash)}
                        </span>
                        <span className="font-mono font-semibold text-zinc-900">
                          {formatMoneyDash(row.cashAmount, dash, locale, row.currencyCode)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">{row.branchName?.trim() || dash}</p>
                      {cat ? <p className="mt-0.5 text-xs text-zinc-500">{cat}</p> : null}
                      {row.description?.trim() ? (
                        <p className="mt-1 text-xs text-zinc-600">{row.description.trim()}</p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <div className="mt-3 hidden md:block overflow-x-auto">
                <Table className="min-w-[44rem]">
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("personnel.detailMgmtHandoverColDate")}</TableHeader>
                      <TableHeader>{t("personnel.detailMgmtHandoverColBranch")}</TableHeader>
                      <TableHeader className="text-right">{t("personnel.detailMgmtHandoverColAmount")}</TableHeader>
                      <TableHeader>{t("personnel.detailMgmtHandoverColCategory")}</TableHeader>
                      <TableHeader>{t("personnel.detailMgmtHandoverColNote")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(snap.cashHandoverLines ?? []).map((row) => {
                      const cat = [row.mainCategory, row.category].filter(Boolean).join(" · ");
                      return (
                        <TableRow key={row.transactionId}>
                          <TableCell className="whitespace-nowrap">
                            {formatLocaleDate(row.transactionDate, locale, dash)}
                          </TableCell>
                          <TableCell>{row.branchName?.trim() || dash}</TableCell>
                          <TableCell className="text-right tabular-nums font-mono">
                            {formatMoneyDash(row.cashAmount, dash, locale, row.currencyCode)}
                          </TableCell>
                          <TableCell className="max-w-[12rem] text-zinc-600">{cat || dash}</TableCell>
                          <TableCell className="max-w-[14rem] text-zinc-600">
                            {row.description?.trim() || dash}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {snap.byCurrency.length > 1 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("personnel.detailMgmtMultiTitle")}
              </p>
              <ul className="mt-2 space-y-2 text-sm text-zinc-800">
                {snap.byCurrency.map((row) => (
                  <li
                    key={row.currencyCode}
                    className="flex flex-col gap-0.5 border-b border-zinc-200/80 py-2 last:border-0 last:pb-0"
                  >
                    <span className="font-semibold">{row.currencyCode}</span>
                    <span className="text-xs text-zinc-600">
                      {t("personnel.detailMgmtMultiLine")
                        .replace(
                          "{adv}",
                          formatMoneyDash(row.totalAdvanceAllTime, dash, locale, row.currencyCode)
                        )
                        .replace(
                          "{sal}",
                          formatMoneyDash(row.totalSalaryAllTime, dash, locale, row.currencyCode)
                        )
                        .replace(
                          "{net}",
                          signedMoney(
                            row.netSalaryMinusAdvanceAllTime,
                            dash,
                            locale,
                            row.currencyCode
                          )
                        )}
                      {row.totalCashHandoverAsResponsibleAllTime > 0
                        ? ` · ${t("personnel.detailMgmtMultiHandover").replace(
                            "{hand}",
                            formatMoneyDash(
                              row.totalCashHandoverAsResponsibleAllTime,
                              dash,
                              locale,
                              row.currencyCode
                            )
                          )}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
