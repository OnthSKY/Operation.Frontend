"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { vehicleExpenseBranchPostingDetail } from "@/modules/vehicles/lib/vehicle-formatters";
import type {
  VehicleExpense,
  VehicleExpenseSummaryRow,
  VehicleListItem,
} from "@/types/vehicle";

export type VehicleDetailCostsSubTab = "ledger" | "report";

export type VehicleDetailCostsBranchOption = { id: number; name: string };

/**
 * Detay overlay → Costs tab. İki alt sekme:
 *  - Ledger: gider listesi (mobil kart / masaüstü tablo + edit/delete)
 *  - Report: yıl/ay/araç/şube filtresi + özet tablo
 */
export function VehicleDetailCostsTab({
  expenses,
  subTab,
  onSubTabChange,
  canEdit,
  locale,
  // Ledger callback'leri
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  // Report state + opsiyonları
  sumYear,
  sumMonth,
  sumVehicleId,
  sumBranchId,
  onSumYearChange,
  onSumMonthChange,
  onSumVehicleIdChange,
  onSumBranchIdChange,
  onApplyReportFilters,
  vehicleOptions,
  branchOptions,
  summaryRows,
  summaryPending,
  summaryQueryEnabled,
  t,
}: {
  expenses: VehicleExpense[];
  subTab: VehicleDetailCostsSubTab;
  onSubTabChange: (v: VehicleDetailCostsSubTab) => void;
  canEdit: boolean;
  locale: Locale;
  onAddExpense: () => void;
  onEditExpense: (x: VehicleExpense) => void;
  onDeleteExpense: (expenseId: number) => void;
  sumYear: string;
  sumMonth: string;
  sumVehicleId: string;
  sumBranchId: string;
  onSumYearChange: (v: string) => void;
  onSumMonthChange: (v: string) => void;
  onSumVehicleIdChange: (v: string) => void;
  onSumBranchIdChange: (v: string) => void;
  onApplyReportFilters: () => void;
  vehicleOptions: VehicleListItem[];
  branchOptions: VehicleDetailCostsBranchOption[];
  summaryRows: VehicleExpenseSummaryRow[];
  summaryPending: boolean;
  summaryQueryEnabled: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div
          className="flex w-full max-w-md flex-wrap gap-1 rounded-xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/80"
          role="tablist"
          aria-label={t("vehicles.tabCosts")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "ledger"}
            className={cn(
              "min-h-10 flex-1 touch-manipulation rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              subTab === "ledger"
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:text-zinc-900",
            )}
            onClick={() => onSubTabChange("ledger")}
          >
            {t("vehicles.costsSubLedger")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "report"}
            className={cn(
              "min-h-10 flex-1 touch-manipulation rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              subTab === "report"
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                : "text-zinc-600 hover:text-zinc-900",
            )}
            onClick={() => onSubTabChange("report")}
          >
            {t("vehicles.costsSubReport")}
          </button>
        </div>
      ) : null}

      {!canEdit || subTab === "ledger" ? (
        <div className="flex flex-col gap-3">
          {canEdit ? (
            <Button
              type="button"
              className="w-full !min-h-11 self-stretch px-3 text-sm sm:w-auto sm:!min-h-9 sm:self-start"
              onClick={onAddExpense}
            >
              {t("vehicles.addExpense")}
            </Button>
          ) : null}
          {expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {t("vehicles.emptyExpenses")}
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-4 md:hidden">
                {expenses.map((x) => {
                  const postingDetail = vehicleExpenseBranchPostingDetail(x, t);
                  return (
                    <MobileListCard
                      as="li"
                      key={x.id}
                      className="flex flex-col gap-2 bg-white"
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-semibold text-zinc-900">
                            {x.expenseType}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {x.expenseDate.slice(0, 10)}
                          </p>
                          {x.postedBranchName?.trim() ? (
                            <p className="mt-0.5 text-[11px] text-sky-800">
                              {t("vehicles.expensePostedBranch")}:{" "}
                              {x.postedBranchName.trim()}
                              {postingDetail ? (
                                <span className="ml-1 font-semibold">
                                  · {postingDetail}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 tabular-nums text-sm font-medium text-zinc-800">
                          {formatLocaleAmount(x.amount, locale, x.currencyCode)}
                        </p>
                      </div>
                      {x.description?.trim() ? (
                        <p className="mt-2 break-words text-xs text-zinc-600">
                          {x.description}
                        </p>
                      ) : null}
                      {canEdit ? (
                        <div className="mt-2 flex min-w-0 flex-col flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full !min-h-11 touch-manipulation"
                            onClick={() => onEditExpense(x)}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full !min-h-11 touch-manipulation text-red-700 ring-red-200 hover:bg-red-50"
                            onClick={() => onDeleteExpense(x.id)}
                          >
                            {t("vehicles.delete")}
                          </Button>
                        </div>
                      ) : null}
                    </MobileListCard>
                  );
                })}
              </ul>
              <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                <Table className="min-w-[34rem] text-sm sm:min-w-0 sm:text-base">
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("vehicles.expenseDate")}</TableHeader>
                      <TableHeader>{t("vehicles.expenseType")}</TableHeader>
                      <TableHeader>{t("vehicles.amount")}</TableHeader>
                      <TableHeader className="w-[1%]" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((x) => {
                      const postingDetail = vehicleExpenseBranchPostingDetail(
                        x,
                        t,
                      );
                      return (
                        <TableRow key={x.id}>
                          <TableCell>{x.expenseDate.slice(0, 10)}</TableCell>
                          <TableCell>
                            <div>{x.expenseType}</div>
                            {x.postedBranchName?.trim() ? (
                              <div className="mt-0.5 text-xs text-sky-800">
                                {x.postedBranchName.trim()}
                                {postingDetail ? (
                                  <span className="ml-1 font-semibold">
                                    · {postingDetail}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatLocaleAmount(
                              x.amount,
                              locale,
                              x.currencyCode,
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {canEdit ? (
                              <div className="flex min-w-[7rem] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                  onClick={() => onEditExpense(x)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                  onClick={() => onDeleteExpense(x.id)}
                                >
                                  {t("vehicles.delete")}
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      ) : null}

      {canEdit && subTab === "report" ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-3 ring-1 ring-zinc-100/60 sm:p-4">
          <p className="text-pretty text-sm leading-relaxed text-zinc-600">
            {t("vehicles.vehicleExpenseReportHint")}
          </p>
          <p className="text-xs text-zinc-500">{t("vehicles.branchFilterHint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label={t("vehicles.filterYear")}
              value={sumYear}
              onChange={(e) => onSumYearChange(e.target.value)}
            />
            <Input
              label={t("vehicles.filterMonth")}
              value={sumMonth}
              onChange={(e) => onSumMonthChange(e.target.value)}
              placeholder={t("vehicles.filterMonthOptional")}
            />
            <Select
              name="veh-sum-vehicle"
              label={t("vehicles.filterVehicle")}
              value={sumVehicleId}
              onBlur={() => {}}
              onChange={(e) => onSumVehicleIdChange(e.target.value)}
              options={[
                { value: "", label: t("common.all") },
                ...vehicleOptions.map((r) => ({
                  value: String(r.id),
                  label: r.plateNumber,
                })),
              ]}
            />
            <Select
              name="veh-sum-branch"
              label={t("vehicles.filterBranch")}
              value={sumBranchId}
              onBlur={() => {}}
              onChange={(e) => onSumBranchIdChange(e.target.value)}
              options={[
                { value: "", label: t("vehicles.allBranches") },
                ...branchOptions.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })),
              ]}
            />
          </div>
          <Button
            type="button"
            className="w-full !min-h-11 touch-manipulation sm:w-auto sm:!min-h-10"
            onClick={() => onApplyReportFilters()}
          >
            {t("vehicles.applyExpenseReport")}
          </Button>
          {!summaryQueryEnabled || summaryPending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : summaryRows.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("vehicles.emptySummary")}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-4 md:hidden">
                {summaryRows.map((s, i) => (
                  <MobileListCard
                    as="li"
                    key={`${s.vehicleId}-${s.year}-${s.month}-${s.expenseType}-${s.currencyCode}-${i}`}
                    className="flex flex-col gap-1 bg-zinc-50/40 text-sm"
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <p className="truncate font-mono font-semibold text-zinc-900">
                        {s.plateNumber}
                      </p>
                      <p className="tabular-nums font-medium text-zinc-800">
                        {formatLocaleAmount(s.totalAmount, locale, s.currencyCode)}
                      </p>
                    </div>
                    <p className="mt-1 break-words text-xs text-zinc-600">
                      {s.expenseType} · {s.year}/
                      {String(s.month).padStart(2, "0")}
                    </p>
                  </MobileListCard>
                ))}
              </ul>
              <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                <Table className="min-w-[36rem] text-sm sm:min-w-0 sm:text-base">
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("vehicles.plate")}</TableHeader>
                      <TableHeader>{t("vehicles.filterYear")}</TableHeader>
                      <TableHeader>{t("vehicles.filterMonth")}</TableHeader>
                      <TableHeader>{t("vehicles.expenseType")}</TableHeader>
                      <TableHeader>{t("vehicles.amount")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryRows.map((s, i) => (
                      <TableRow
                        key={`${s.vehicleId}-${s.year}-${s.month}-${s.expenseType}-${s.currencyCode}-${i}`}
                      >
                        <TableCell className="max-w-[8rem] truncate sm:max-w-none">
                          {s.plateNumber}
                        </TableCell>
                        <TableCell>{s.year}</TableCell>
                        <TableCell>{s.month}</TableCell>
                        <TableCell className="max-w-[7rem] truncate sm:max-w-none">
                          {s.expenseType}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatLocaleAmount(
                            s.totalAmount,
                            locale,
                            s.currencyCode,
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
      ) : null}
    </div>
  );
}
