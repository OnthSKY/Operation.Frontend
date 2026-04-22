"use client";

import { useMemo } from "react";
import { PersonnelAdvanceHistory } from "@/modules/personnel/components/PersonnelAdvanceHistory";
import type { Personnel } from "@/types/personnel";
import { Button } from "@/shared/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { Branch } from "@/types/branch";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import {
  advanceSourceLabel,
  branchPersonnelMoneyAdvancesCell,
  branchPersonnelMoneyPocketCell,
  branchPersonnelMoneyRegisterOwesCell,
  PersonnelPocketRepayCta,
  DashCard,
} from "./BranchDetailTabs.shared";
import { MobileListCard } from "@/shared/components/MobileListCard";

type PersonnelSubTabId = "people" | "advances";

export type BranchDetailPersonnelTabProps = {
  t: (key: string) => string;
  locale: import("@/i18n/messages").Locale;
  branch: Branch;
  staff: Personnel[];
  personnelSubTab: PersonnelSubTabId;
  setPersonnelSubTab: (v: PersonnelSubTabId) => void;
  setAssignPersonnelOpen: (v: boolean) => void;
  activePersonnel: Personnel[];
  openAdvance: (personnelId?: number) => void;
  refetchBranchAdv: () => unknown;
  personnelMoneyById: Map<number, BranchPersonnelMoneySummaryItem>;
  personnelMoneyPending: boolean;
  staffRows: {
    personnel: Personnel;
    total: number;
    count: number;
    pending: boolean;
    failed: boolean;
    advCurrency?: string;
  }[];
  branchAdvanceTotal: number;
  branchAdvCurrency?: string;
  advancesLoading: boolean;
  branchAdvances: import("@/types/advance").AdvanceListItem[];
  branchAdvLoading: boolean;
  branchAdvError: boolean;
  branchAdvErr: unknown;
  openPocketRepayExpense: (personnelId: number, currencyCode: string) => void;
  personnelAdvanceFiscalYear: number;
};

export function BranchDetailPersonnelTab(props: BranchDetailPersonnelTabProps) {
  const {
    t,
    locale,
    branch,
    staff,
    personnelSubTab,
    setPersonnelSubTab,
    setAssignPersonnelOpen,
    activePersonnel,
    openAdvance,
    refetchBranchAdv,
    personnelMoneyById,
    personnelMoneyPending,
    staffRows,
    branchAdvanceTotal,
    branchAdvCurrency,
    advancesLoading,
    branchAdvances,
    branchAdvLoading,
    branchAdvError,
    branchAdvErr,
    openPocketRepayExpense,
    personnelAdvanceFiscalYear,
  } = props;

  const branchStaffStartedCount = useMemo(() => {
    const asOf = localIsoDate();
    let n = 0;
    for (const p of staff) {
      const hd = p.hireDate?.trim().slice(0, 10);
      if (hd && hd.length === 10 && hd <= asOf) n += 1;
    }
    return n;
  }, [staff]);

  const personnelMoneyAgg = useMemo(() => {
    let advMixed = false;
    const advByCur = new Map<string, number>();
    let pocketMixed = false;
    const pocketOutByCur = new Map<string, number>();
    const netOwesByCur = new Map<string, number>();
    for (const p of staff) {
      const pm = personnelMoneyById.get(p.id);
      if (!pm) continue;
      if (pm.advancesMixedCurrencies) advMixed = true;
      else if (
        pm.totalAdvances != null &&
        pm.totalAdvances > 0.009 &&
        pm.advancesCurrencyCode
      ) {
        const c = pm.advancesCurrencyCode.trim().toUpperCase() || "TRY";
        advByCur.set(c, (advByCur.get(c) ?? 0) + pm.totalAdvances);
      }
      if (pm.pocketMixedCurrencies) pocketMixed = true;
      else {
        if (pm.grossPocketExpense > 0.009) {
          const c = (pm.pocketCurrencyCode ?? "TRY").trim().toUpperCase() || "TRY";
          pocketOutByCur.set(c, (pocketOutByCur.get(c) ?? 0) + pm.grossPocketExpense);
        }
        if (Math.abs(pm.netRegisterOwesPocket) > 0.009) {
          const c = (pm.pocketCurrencyCode ?? "TRY").trim().toUpperCase() || "TRY";
          netOwesByCur.set(c, (netOwesByCur.get(c) ?? 0) + pm.netRegisterOwesPocket);
        }
      }
    }
    const fmtCurMap = (m: Map<string, number>): string | null => {
      if (m.size === 0) return null;
      if (m.size > 1) return "__MIXED__";
      const [[cur, sum]] = [...m.entries()];
      return formatMoneyDash(sum, t("personnel.dash"), locale, cur);
    };
    return { advMixed, advByCur, pocketMixed, pocketOutByCur, netOwesByCur, fmtCurMap };
  }, [staff, personnelMoneyById, t, locale]);

  const fiscalYearAdvanceCount = useMemo(() => {
    if (advancesLoading) return null as number | null;
    if (staffRows.some((r) => r.failed)) return null;
    return staffRows.reduce((s, r) => s + r.count, 0);
  }, [staffRows, advancesLoading]);

  return (
          <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                onClick={() => setAssignPersonnelOpen(true)}
              >
                {t("branch.assignPersonnelOpen")}
              </Button>
              <Button
                type="button"
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                disabled={activePersonnel.length === 0}
                onClick={() => openAdvance()}
              >
                {t("branch.giveAdvance")}
              </Button>
              {personnelSubTab === "advances" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                  onClick={() => void refetchBranchAdv()}
                >
                  {t("branch.refreshTx")}
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
              <DashCard
                compact
                label={t("branch.personnelSummaryCardAssigned")}
                value={String(staff.length)}
                tone="violet"
              />
              <DashCard
                compact
                label={t("branch.personnelSummaryCardStarted")}
                value={String(branchStaffStartedCount)}
                tone="violet"
              />
              <DashCard
                compact
                label={t("branch.personnelSummaryCardAdvancesLifetime")}
                value={
                  personnelMoneyPending
                    ? t("common.loading")
                    : personnelMoneyAgg.advMixed || personnelMoneyAgg.advByCur.size > 1
                      ? t("branch.personnelMoneyMixedCurrency")
                      : personnelMoneyAgg.fmtCurMap(personnelMoneyAgg.advByCur) ?? "—"
                }
                tone="amber"
              />
              <DashCard
                compact
                label={t("branch.personnelSummaryCardAdvancesFiscalYear").replace(
                  "{year}",
                  String(personnelAdvanceFiscalYear)
                )}
                value={
                  advancesLoading
                    ? t("common.loading")
                    : formatMoneyDash(
                        branchAdvanceTotal,
                        t("personnel.dash"),
                        locale,
                        branchAdvCurrency
                      )
                }
                hint={
                  fiscalYearAdvanceCount != null
                    ? t("branch.personnelSummaryFiscalAdvancesCountHint").replace(
                        "{n}",
                        String(fiscalYearAdvanceCount)
                      )
                    : undefined
                }
                tone="amber"
              />
              <DashCard
                compact
                label={t("branch.personnelSummaryCardPocketPaid")}
                value={
                  personnelMoneyPending
                    ? t("common.loading")
                    : personnelMoneyAgg.pocketMixed || personnelMoneyAgg.pocketOutByCur.size > 1
                      ? t("branch.personnelMoneyMixedCurrency")
                      : personnelMoneyAgg.fmtCurMap(personnelMoneyAgg.pocketOutByCur) ?? "—"
                }
                tone="violet"
              />
              <DashCard
                compact
                label={t("branch.personnelSummaryCardNetRegisterOwes")}
                value={
                  personnelMoneyPending
                    ? t("common.loading")
                    : personnelMoneyAgg.pocketMixed || personnelMoneyAgg.netOwesByCur.size > 1
                      ? t("branch.personnelMoneyMixedCurrency")
                      : personnelMoneyAgg.fmtCurMap(personnelMoneyAgg.netOwesByCur) ?? "—"
                }
                tone="violet"
              />
            </div>

            <div
              role="tablist"
              aria-orientation="horizontal"
              aria-label={t("branch.personnelSubTabsAria")}
              className="grid min-w-0 shrink-0 grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={personnelSubTab === "people"}
                className={cn(
                  "min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors touch-manipulation",
                  personnelSubTab === "people"
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/80"
                    : "text-zinc-600 hover:bg-white/70"
                )}
                onClick={() => setPersonnelSubTab("people")}
              >
                {t("branch.personnelSubTabPeople")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={personnelSubTab === "advances"}
                className={cn(
                  "min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors touch-manipulation",
                  personnelSubTab === "advances"
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/80"
                    : "text-zinc-600 hover:bg-white/70"
                )}
                onClick={() => setPersonnelSubTab("advances")}
              >
                {t("branch.personnelSubTabAdvances")}
              </button>
            </div>

            {personnelSubTab === "people" ? (
              <section className="min-h-0">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.staffTitle")}</h3>
                {staff.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">{t("branch.staffNone")}</p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-col gap-4 md:hidden">
                      {staff.map((p) => {
                        const pm = personnelMoneyById.get(p.id);
                        return (
                          <MobileListCard key={p.id} as="div" className="flex flex-col gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">{p.fullName}</p>
                            <dl className="mt-1 space-y-1 border-t border-zinc-100 pt-2 text-xs">
                              <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:justify-between min-[380px]:gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColAdvances")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:justify-between min-[380px]:gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColRegisterOwes")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-1">
                                <dt className="text-zinc-500">{t("branch.personnelMoneyColPocket")}</dt>
                                <dd className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-2 flex min-w-0 flex-col flex-wrap gap-2 border-t border-zinc-100 pt-3">
                              <PersonnelPocketRepayCta
                                personnelId={p.id}
                                moneyRow={pm}
                                loading={personnelMoneyPending}
                                onPay={openPocketRepayExpense}
                                t={t}
                                buttonClassName="w-full text-sm"
                              />
                              {!p.isDeleted ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-10 w-full text-sm"
                                  onClick={() => openAdvance(p.id)}
                                >
                                  {t("branch.staffGiveAdvanceRow")}
                                </Button>
                              ) : (
                                <span className="text-sm text-zinc-400">—</span>
                              )}
                            </div>
                          </MobileListCard>
                        );
                      })}
                    </div>
                    <div className="mt-3 hidden overflow-x-auto md:block">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("branch.staffName")}</TableHeader>
                            <TableHeader className="min-w-[7rem]">
                              {t("branch.personnelMoneyColAdvances")}
                            </TableHeader>
                            <TableHeader className="min-w-[7rem]">
                              {t("branch.personnelMoneyColRegisterOwes")}
                            </TableHeader>
                            <TableHeader className="min-w-[10rem]">
                              {t("branch.personnelMoneyColPocket")}
                            </TableHeader>
                            <TableHeader className="min-w-[9rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {staff.map((p) => {
                            const pm = personnelMoneyById.get(p.id);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium text-zinc-900">{p.fullName}</TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex min-w-[8rem] flex-col gap-2">
                                    <PersonnelPocketRepayCta
                                      personnelId={p.id}
                                      moneyRow={pm}
                                      loading={personnelMoneyPending}
                                      onPay={openPocketRepayExpense}
                                      t={t}
                                      buttonClassName="w-full px-2 py-1 text-xs"
                                    />
                                    {!p.isDeleted ? (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="min-h-9 px-2 py-1 text-xs"
                                        onClick={() => openAdvance(p.id)}
                                      >
                                        {t("branch.staffGiveAdvanceRow")}
                                      </Button>
                                    ) : (
                                      <span className="text-sm text-zinc-400">—</span>
                                    )}
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
              </section>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-6">
                <section>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.branchAdvancesTitle")}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{t("branch.branchAdvancesHint")}</p>
                  {branchAdvError && (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(branchAdvErr)}</p>
                  )}
                  {branchAdvLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : branchAdvances.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("branch.noBranchAdvances")}</p>
                  ) : (
                    <>
                      <div className="mt-2 flex flex-col gap-4 md:hidden">
                        {branchAdvances.map((a) => (
                          <MobileListCard key={a.id} as="div" className="flex flex-col gap-1">
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
                                {a.personnelFullName}
                              </p>
                              <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-900">
                                {formatMoneyDash(a.amount, t("personnel.dash"), locale, a.currencyCode)}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatLocaleDate(String(a.advanceDate), locale)}
                            </p>
                            <p className="mt-1 break-words text-xs text-zinc-600">
                              {t("branch.advColSource")}: {advanceSourceLabel(a.sourceType, t)}
                            </p>
                          </MobileListCard>
                        ))}
                      </div>
                      <div className="mt-2 hidden overflow-x-auto md:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("branch.advColDate")}</TableHeader>
                              <TableHeader>{t("branch.advColPerson")}</TableHeader>
                              <TableHeader>{t("branch.advColAmount")}</TableHeader>
                              <TableHeader className="hidden sm:table-cell">{t("branch.advColSource")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {branchAdvances.map((a) => (
                              <TableRow key={a.id}>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {formatLocaleDate(String(a.advanceDate), locale)}
                                </TableCell>
                                <TableCell className="text-sm font-medium">{a.personnelFullName}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {formatMoneyDash(a.amount, t("personnel.dash"), locale, a.currencyCode)}
                                </TableCell>
                                <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 text-sm text-zinc-600 md:table-cell">
                                  {advanceSourceLabel(a.sourceType, t)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.staffTitle")}</h3>
                  {staff.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("branch.staffNone")}</p>
                  ) : (
                    <>
                      <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <p className="text-xs text-zinc-500">{t("branch.totalAdvancesBranchPeriod")}</p>
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
                      <div className="mt-3 flex flex-col gap-4 md:hidden">
                        {staffRows.map((r) => (
                          <MobileListCard key={r.personnel.id} as="div" className="flex flex-col gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">{r.personnel.fullName}</p>
                            <dl className="mt-1 space-y-1 border-t border-zinc-100 pt-2 text-xs">
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColAdvances")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColRegisterOwes")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-1">
                                <dt className="text-zinc-500">{t("branch.personnelMoneyColPocket")}</dt>
                                <dd className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:justify-between min-[380px]:gap-3">
                                <dt className="text-zinc-500">{t("branch.staffAdvTotal")}</dt>
                                <dd className="font-mono text-sm font-medium text-zinc-800">
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
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:justify-between min-[380px]:gap-3">
                                <dt className="text-zinc-500">{t("branch.staffAdvCount")}</dt>
                                <dd className="font-medium text-zinc-800">
                                  {r.pending ? t("common.loading") : r.failed ? "—" : r.count}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-2 flex min-w-0 flex-col flex-wrap gap-2 border-t border-zinc-100 pt-3">
                              <PersonnelPocketRepayCta
                                personnelId={r.personnel.id}
                                moneyRow={personnelMoneyById.get(r.personnel.id)}
                                loading={personnelMoneyPending}
                                onPay={openPocketRepayExpense}
                                t={t}
                                buttonClassName="w-full text-sm"
                              />
                              {!r.personnel.isDeleted ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-10 w-full text-sm"
                                  onClick={() => openAdvance(r.personnel.id)}
                                >
                                  {t("branch.staffGiveAdvanceRow")}
                                </Button>
                              ) : null}
                              <PersonnelAdvanceHistory
                                personnelId={r.personnel.id}
                                branchIdFilter={branch.id}
                                variant="inline"
                                maxDetailRows={4}
                                showAttributedExpenses={false}
                              />
                            </div>
                          </MobileListCard>
                        ))}
                      </div>
                      <div className="mt-3 hidden overflow-x-auto md:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("branch.staffName")}</TableHeader>
                              <TableHeader className="min-w-[7rem]">
                                {t("branch.personnelMoneyColAdvances")}
                              </TableHeader>
                              <TableHeader className="min-w-[7rem]">
                                {t("branch.personnelMoneyColRegisterOwes")}
                              </TableHeader>
                              <TableHeader className="min-w-[10rem]">
                                {t("branch.personnelMoneyColPocket")}
                              </TableHeader>
                              <TableHeader>{t("branch.staffAdvTotal")}</TableHeader>
                              <TableHeader className="hidden sm:table-cell">{t("branch.staffAdvCount")}</TableHeader>
                              <TableHeader className="min-w-[10rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {staffRows.map((r) => (
                              <TableRow key={r.personnel.id}>
                                <TableCell className="font-medium text-zinc-900">{r.personnel.fullName}</TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
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
                                <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 sm:table-cell">
                                  {r.pending ? t("common.loading") : r.failed ? "—" : r.count}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex min-w-[8rem] flex-col gap-2">
                                    <PersonnelPocketRepayCta
                                      personnelId={r.personnel.id}
                                      moneyRow={personnelMoneyById.get(r.personnel.id)}
                                      loading={personnelMoneyPending}
                                      onPay={openPocketRepayExpense}
                                      t={t}
                                      buttonClassName="w-full px-2 py-1 text-xs"
                                    />
                                    {!r.personnel.isDeleted ? (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="min-h-9 px-2 py-1 text-xs"
                                        onClick={() => openAdvance(r.personnel.id)}
                                      >
                                        {t("branch.staffGiveAdvanceRow")}
                                      </Button>
                                    ) : null}
                                    <PersonnelAdvanceHistory
                                      personnelId={r.personnel.id}
                                      branchIdFilter={branch.id}
                                      variant="inline"
                                      maxDetailRows={4}
                                      showAttributedExpenses={false}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
  );
}
