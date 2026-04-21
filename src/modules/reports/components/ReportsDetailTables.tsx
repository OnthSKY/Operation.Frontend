"use client";

import {
  financialBreakdownCategoryLabel,
  financialBreakdownMainLabel,
  financialBreakdownTypeLabel,
} from "@/modules/reports/lib/financial-breakdown-labels";
import { reportBranchLabel } from "@/modules/reports/lib/report-branch-label";
import {
  ExpensePaymentSourceTag,
  expensePaymentSourceReportLabel,
  sortExpensePaymentRows,
} from "@/modules/reports/lib/report-expense-payment";
import { ReportInteractiveRows } from "@/modules/reports/components/ReportInteractiveRows";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  FinancialExpensePaymentSourceRow,
  FinancialGeneralOverheadAllocatedRow,
  FinancialReport,
  StockReport,
} from "@/types/reports";
import type { Locale } from "@/i18n/messages";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

const tableWrap =
  "touch-pan-x overflow-x-auto overscroll-x-contain rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]";
const th =
  "border-b border-zinc-200 bg-zinc-50 px-2 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600 sm:px-3 sm:text-xs";
const td =
  "border-b border-zinc-100 px-2 py-2 text-xs text-zinc-800 sm:px-3 sm:text-sm";

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm lg:hidden";
const mobileCardStack = "flex flex-col gap-3 lg:hidden";

function MobileKv({
  label,
  children,
  valueClassName = "",
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className={`text-sm text-zinc-900 ${valueClassName}`}>{children}</dd>
    </div>
  );
}

function MobileCard({ children }: { children: ReactNode }) {
  return (
    <article className={mobileCard}>
      <dl className="space-y-2">{children}</dl>
    </article>
  );
}

type TFn = (key: string) => string;

/** Finans tabloları tek sayfada (`all`) veya alt sayfa (`panel`) için. */
export type FinancialReportTablesPanel =
  | "all"
  | "totals"
  | "branches"
  | "expense-payment"
  | "by-category"
  | "overhead"
  | "supplier-payments"
  | "vehicle-off-register"
  | "advances";

function supplierPaySourceLabel(sourceType: string, t: TFn): string {
  const u = sourceType.trim().toUpperCase();
  if (u === "CASH") return t("reports.supplierPaySourceCash");
  if (u === "BANK") return t("reports.supplierPaySourceBank");
  if (u === "PATRON") return t("reports.supplierPaySourcePatron");
  return sourceType;
}

export function FinancialReportDetailTables({
  data,
  branchTrendMap,
  t,
  locale,
  interactive = false,
  panel = "all",
}: {
  data: FinancialReport;
  branchTrendMap: Map<string, number>;
  t: TFn;
  locale: Locale;
  interactive?: boolean;
  panel?: FinancialReportTablesPanel;
}) {
  const show = (p: Exclude<FinancialReportTablesPanel, "all">) =>
    panel === "all" || panel === p;

  const expensePayRows = useMemo(() => {
    const raw = data.byExpensePaymentSource ?? [];
    const codes = [...new Set(raw.map((r) => r.currencyCode))].sort();
    const out: FinancialExpensePaymentSourceRow[] = [];
    for (const c of codes) {
      out.push(...sortExpensePaymentRows(raw.filter((r) => r.currencyCode === c)));
    }
    return out;
  }, [data.byExpensePaymentSource]);

  return (
    <>
      {show("totals") ? (
      <Card
        title={t("reports.sectionTotals")}
        description={t("reports.sectionTotalsFinancialKpiNote")}
      >
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.totalsByCurrency}
          defaultSortKey="net"
          sortOptions={[
            { id: "currency", label: t("reports.colCurrency") },
            { id: "income", label: t("reports.colIncome") },
            { id: "expense", label: t("reports.colExpense") },
            { id: "supplierReg", label: t("reports.colSupplierRegisterPaid") },
            { id: "net", label: t("reports.colNet") },
            { id: "inCount", label: t("reports.colInCount") },
            { id: "outCount", label: t("reports.colOutCount") },
          ]}
          getSearchHaystack={(r) => r.currencyCode}
          getSortValue={(r, key) => {
            switch (key) {
              case "currency":
                return r.currencyCode;
              case "income":
                return r.totalIncome;
              case "expense":
                return r.totalExpense;
              case "supplierReg":
                return r.totalSupplierRegisterCashPaid ?? 0;
              case "net":
                return r.netCash;
              case "inCount":
                return r.incomeTransactionCount;
              case "outCount":
                return r.expenseTransactionCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.totalsByCurrency.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard key={r.currencyCode}>
                        <MobileKv label={t("reports.colCurrency")}>
                          {r.currencyCode}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colIncome")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalIncome,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colExpense")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalExpense,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colSupplierRegisterPaid")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalSupplierRegisterCashPaid ?? 0,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colNet")}
                          valueClassName={`tabular-nums font-medium ${
                            r.netCash < 0 ? "text-red-700" : "text-emerald-800"
                          }`}
                        >
                          {formatLocaleAmount(r.netCash, locale, r.currencyCode)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colInCount")}
                          valueClassName="tabular-nums"
                        >
                          {r.incomeTransactionCount}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colOutCount")}
                          valueClassName="tabular-nums"
                        >
                          {r.expenseTransactionCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colIncome")}</th>
                          <th className={th}>{t("reports.colExpense")}</th>
                          <th className={th}>
                            {t("reports.colSupplierRegisterPaid")}
                          </th>
                          <th className={th}>{t("reports.colNet")}</th>
                          <th className={th}>{t("reports.colInCount")}</th>
                          <th className={th}>{t("reports.colOutCount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={r.currencyCode}>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalIncome,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalExpense,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalSupplierRegisterCashPaid ?? 0,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td
                              className={`${td} tabular-nums font-medium ${
                                r.netCash < 0 ? "text-red-700" : "text-emerald-800"
                              }`}
                            >
                              {formatLocaleAmount(
                                r.netCash,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.incomeTransactionCount}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.expenseTransactionCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("branches") ? (
      <Card
        title={t("reports.sectionByBranch")}
        description={t("reports.sectionTotalsFinancialKpiNote")}
      >
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.byBranch}
          defaultSortKey="net"
          sortOptions={[
            { id: "branch", label: t("reports.colBranch") },
            { id: "currency", label: t("reports.colCurrency") },
            { id: "income", label: t("reports.colIncome") },
            { id: "expense", label: t("reports.colExpense") },
            { id: "supplierReg", label: t("reports.colSupplierRegisterPaid") },
            { id: "net", label: t("reports.colNet") },
            { id: "delta", label: t("reports.colDeltaPrior") },
          ]}
          getSearchHaystack={(r) =>
            `${reportBranchLabel(r.branchId, r.branchName, t)} ${r.currencyCode}`
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "branch":
                return reportBranchLabel(r.branchId, r.branchName, t);
              case "currency":
                return r.currencyCode;
              case "income":
                return r.totalIncome;
              case "expense":
                return r.totalExpense;
              case "supplierReg":
                return r.totalSupplierRegisterCashPaid ?? 0;
              case "net":
                return r.netCash;
              case "delta":
                return (
                  branchTrendMap.get(`${r.branchId}:${r.currencyCode}`) ?? 0
                );
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.byBranch.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => {
                      const trend = branchTrendMap.get(
                        `${r.branchId}:${r.currencyCode}`
                      );
                      const trendClass =
                        (trend ?? 0) < 0
                          ? "text-red-700"
                          : (trend ?? 0) > 0
                            ? "text-emerald-800"
                            : "";
                      return (
                        <MobileCard key={`${r.branchId}-${r.currencyCode}`}>
                          <MobileKv label={t("reports.colBranch")}>
                            {reportBranchLabel(r.branchId, r.branchName, t)}
                          </MobileKv>
                          <MobileKv label={t("reports.colCurrency")}>
                            {r.currencyCode}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colIncome")}
                            valueClassName="tabular-nums"
                          >
                            {formatLocaleAmount(
                              r.totalIncome,
                              locale,
                              r.currencyCode
                            )}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colExpense")}
                            valueClassName="tabular-nums"
                          >
                            {formatLocaleAmount(
                              r.totalExpense,
                              locale,
                              r.currencyCode
                            )}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colSupplierRegisterPaid")}
                            valueClassName="tabular-nums"
                          >
                            {formatLocaleAmount(
                              r.totalSupplierRegisterCashPaid ?? 0,
                              locale,
                              r.currencyCode
                            )}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colNet")}
                            valueClassName={`tabular-nums ${
                              r.netCash < 0 ? "text-red-700" : ""
                            }`}
                          >
                            {formatLocaleAmount(
                              r.netCash,
                              locale,
                              r.currencyCode
                            )}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colDeltaPrior")}
                            valueClassName={`tabular-nums font-medium ${trendClass}`}
                          >
                            {branchTrendMap.has(
                              `${r.branchId}:${r.currencyCode}`
                            ) && trend !== undefined
                              ? formatLocaleAmount(
                                  trend,
                                  locale,
                                  r.currencyCode
                                )
                              : "—"}
                          </MobileKv>
                          <MobileKv label={t("common.openDetails")}>
                            <Link
                              href="/branches"
                              className="text-sm font-semibold text-violet-700 hover:underline"
                            >
                              {t("reports.linkBranchTx")}
                            </Link>
                          </MobileKv>
                        </MobileCard>
                      );
                    })}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colBranch")}</th>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colIncome")}</th>
                          <th className={th}>{t("reports.colExpense")}</th>
                          <th className={th}>
                            {t("reports.colSupplierRegisterPaid")}
                          </th>
                          <th className={th}>{t("reports.colNet")}</th>
                          <th className={th}>{t("reports.colDeltaPrior")}</th>
                          <th className={th} />
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={`${r.branchId}-${r.currencyCode}`}>
                            <td className={td}>
                              {reportBranchLabel(
                                r.branchId,
                                r.branchName,
                                t
                              )}
                            </td>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalIncome,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalExpense,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalSupplierRegisterCashPaid ?? 0,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td
                              className={`${td} tabular-nums ${
                                r.netCash < 0 ? "text-red-700" : ""
                              }`}
                            >
                              {formatLocaleAmount(
                                r.netCash,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td
                              className={`${td} tabular-nums font-medium ${
                                (branchTrendMap.get(
                                  `${r.branchId}:${r.currencyCode}`
                                ) ?? 0) < 0
                                  ? "text-red-700"
                                  : (branchTrendMap.get(
                                        `${r.branchId}:${r.currencyCode}`
                                      ) ?? 0) > 0
                                    ? "text-emerald-800"
                                    : ""
                              }`}
                            >
                              {branchTrendMap.has(
                                `${r.branchId}:${r.currencyCode}`
                              )
                                ? formatLocaleAmount(
                                    branchTrendMap.get(
                                      `${r.branchId}:${r.currencyCode}`
                                    )!,
                                    locale,
                                    r.currencyCode
                                  )
                                : "—"}
                            </td>
                            <td className={td}>
                              <Link
                                href="/branches"
                                className="text-xs font-semibold text-violet-700 hover:underline"
                              >
                                {t("reports.linkBranchTx")}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("expense-payment") ? (
      <Card
        title={t("reports.sectionExpensePayment")}
        description={t("reports.sectionExpensePaymentDesc")}
      >
        <ReportInteractiveRows
          interactive={interactive}
          rows={expensePayRows}
          defaultSortKey="amount"
          sortOptions={[
            { id: "source", label: t("reports.colExpensePayTag") },
            { id: "label", label: t("branch.txColExpensePayment") },
            { id: "currency", label: t("reports.colCurrency") },
            { id: "amount", label: t("reports.colAmount") },
            { id: "lines", label: t("reports.colLines") },
          ]}
          getSearchHaystack={(r) =>
            [
              r.expensePaymentSource,
              expensePaymentSourceReportLabel(r.expensePaymentSource, t),
              r.currencyCode,
            ].join(" ")
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "source":
                return r.expensePaymentSource;
              case "label":
                return expensePaymentSourceReportLabel(r.expensePaymentSource, t);
              case "currency":
                return r.currencyCode;
              case "amount":
                return r.totalAmount;
              case "lines":
                return r.lineCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {expensePayRows.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => {
                      const short =
                        r.expensePaymentSource.trim().toUpperCase() ===
                        "REGISTER"
                          ? t("branch.expensePayRegisterShort")
                          : r.expensePaymentSource.trim().toUpperCase() ===
                              "PATRON"
                            ? t("branch.expensePayPatronShort")
                            : r.expensePaymentSource.trim().toUpperCase() ===
                                "PERSONNEL_POCKET"
                              ? t("branch.expensePayPersonnelPocketShort")
                              : t("branch.expensePaymentUnset");
                      return (
                        <MobileCard
                          key={`${r.currencyCode}-${r.expensePaymentSource}`}
                        >
                          <MobileKv label={t("reports.colExpensePayTag")}>
                            <div className="flex flex-wrap items-center gap-2">
                              <ExpensePaymentSourceTag
                                code={r.expensePaymentSource}
                                label={short}
                              />
                            </div>
                          </MobileKv>
                          <MobileKv label={t("branch.txColExpensePayment")}>
                            {expensePaymentSourceReportLabel(
                              r.expensePaymentSource,
                              t
                            )}
                          </MobileKv>
                          <MobileKv label={t("reports.colCurrency")}>
                            {r.currencyCode}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colAmount")}
                            valueClassName="tabular-nums"
                          >
                            {formatLocaleAmount(
                              r.totalAmount,
                              locale,
                              r.currencyCode
                            )}
                          </MobileKv>
                          <MobileKv
                            label={t("reports.colLines")}
                            valueClassName="tabular-nums"
                          >
                            {r.lineCount}
                          </MobileKv>
                        </MobileCard>
                      );
                    })}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colExpensePayTag")}</th>
                          <th className={th}>
                            {t("branch.txColExpensePayment")}
                          </th>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colAmount")}</th>
                          <th className={th}>{t("reports.colLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => {
                          const short =
                            r.expensePaymentSource.trim().toUpperCase() ===
                            "REGISTER"
                              ? t("branch.expensePayRegisterShort")
                              : r.expensePaymentSource.trim().toUpperCase() ===
                                  "PATRON"
                                ? t("branch.expensePayPatronShort")
                                : r.expensePaymentSource.trim().toUpperCase() ===
                                    "PERSONNEL_POCKET"
                                  ? t("branch.expensePayPersonnelPocketShort")
                                  : t("branch.expensePaymentUnset");
                          return (
                            <tr
                              key={`${r.currencyCode}-${r.expensePaymentSource}`}
                            >
                              <td className={`${td} align-middle`}>
                                <ExpensePaymentSourceTag
                                  code={r.expensePaymentSource}
                                  label={short}
                                />
                              </td>
                              <td className={td}>
                                {expensePaymentSourceReportLabel(
                                  r.expensePaymentSource,
                                  t
                                )}
                              </td>
                              <td className={td}>{r.currencyCode}</td>
                              <td className={`${td} tabular-nums`}>
                                {formatLocaleAmount(
                                  r.totalAmount,
                                  locale,
                                  r.currencyCode
                                )}
                              </td>
                              <td className={`${td} tabular-nums`}>
                                {r.lineCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("by-category") ? (
      <Card title={t("reports.sectionByCategory")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.byCategory}
          defaultSortKey="amount"
          sortOptions={[
            { id: "type", label: t("reports.colType") },
            { id: "main", label: t("reports.colMainCat") },
            { id: "category", label: t("reports.colCategory") },
            { id: "currency", label: t("reports.colCurrency") },
            { id: "amount", label: t("reports.colAmount") },
            { id: "lines", label: t("reports.colLines") },
          ]}
          getSearchHaystack={(r) =>
            [
              financialBreakdownTypeLabel(r.type, r.typeLabelKey, t),
              financialBreakdownMainLabel(r.mainCategory, t),
              financialBreakdownCategoryLabel(r, t),
              r.currencyCode,
            ].join(" ")
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "type":
                return financialBreakdownTypeLabel(
                  r.type,
                  r.typeLabelKey,
                  t
                );
              case "main":
                return financialBreakdownMainLabel(r.mainCategory, t);
              case "category":
                return financialBreakdownCategoryLabel(r, t);
              case "currency":
                return r.currencyCode;
              case "amount":
                return r.totalAmount;
              case "lines":
                return r.lineCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r, idx) => (
                      <MobileCard
                        key={`${r.type}-${r.category}-${r.currencyCode}-${idx}`}
                      >
                        <MobileKv label={t("reports.colType")}>
                          {financialBreakdownTypeLabel(
                            r.type,
                            r.typeLabelKey,
                            t
                          )}
                        </MobileKv>
                        <MobileKv label={t("reports.colMainCat")}>
                          {financialBreakdownMainLabel(r.mainCategory, t)}
                        </MobileKv>
                        <MobileKv label={t("reports.colCategory")}>
                          {financialBreakdownCategoryLabel(r, t)}
                        </MobileKv>
                        <MobileKv label={t("reports.colCurrency")}>
                          {r.currencyCode}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colAmount")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalAmount,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colLines")}
                          valueClassName="tabular-nums"
                        >
                          {r.lineCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colType")}</th>
                          <th className={th}>{t("reports.colMainCat")}</th>
                          <th className={th}>{t("reports.colCategory")}</th>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colAmount")}</th>
                          <th className={th}>{t("reports.colLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r, idx) => (
                          <tr
                            key={`${r.type}-${r.category}-${r.currencyCode}-${idx}`}
                          >
                            <td className={td}>
                              {financialBreakdownTypeLabel(
                                r.type,
                                r.typeLabelKey,
                                t
                              )}
                            </td>
                            <td className={td}>
                              {financialBreakdownMainLabel(r.mainCategory, t)}
                            </td>
                            <td className={td}>
                              {financialBreakdownCategoryLabel(r, t)}
                            </td>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.lineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("overhead") ? (
      <Card title={t("reports.sectionGeneralOverheadAllocated")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.generalOverheadAllocated ?? []}
          defaultSortKey="amount"
          sortOptions={[
            { id: "poolDate", label: t("reports.colOverheadPoolDate") },
            { id: "title", label: t("reports.colOverheadPoolTitle") },
            { id: "currency", label: t("reports.colCurrency") },
            { id: "amount", label: t("reports.colAmount") },
            { id: "count", label: t("reports.colLines") },
          ]}
          getSearchHaystack={(r: FinancialGeneralOverheadAllocatedRow) =>
            `${r.title} ${r.poolExpenseDate} ${r.currencyCode}`
          }
          getSortValue={(r: FinancialGeneralOverheadAllocatedRow, key) => {
            switch (key) {
              case "poolDate":
                return r.poolExpenseDate;
              case "title":
                return r.title;
              case "currency":
                return r.currencyCode;
              case "amount":
                return r.totalAmount;
              case "count":
                return r.lineCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {(data.generalOverheadAllocated ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard key={`${r.poolId}-${r.currencyCode}`}>
                        <MobileKv label={t("reports.colOverheadPoolTitle")}>
                          {r.title}
                        </MobileKv>
                        <MobileKv label={t("reports.colOverheadPoolDate")}>
                          {r.poolExpenseDate}
                        </MobileKv>
                        <MobileKv label={t("reports.colCurrency")}>
                          {r.currencyCode}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colAmount")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalAmount,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colLines")}
                          valueClassName="tabular-nums"
                        >
                          {r.lineCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colOverheadPoolDate")}</th>
                          <th className={th}>{t("reports.colOverheadPoolTitle")}</th>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colAmount")}</th>
                          <th className={th}>{t("reports.colLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={`${r.poolId}-${r.currencyCode}`}>
                            <td className={td}>{r.poolExpenseDate}</td>
                            <td className={td}>{r.title}</td>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.lineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("supplier-payments") ? (
      <Card title={t("reports.sectionSupplierPayments")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.supplierPayments ?? []}
          defaultSortKey="amount"
          sortOptions={[
            { id: "currency", label: t("reports.colCurrency") },
            { id: "source", label: t("reports.colSupplierPaySource") },
            { id: "amount", label: t("reports.colAmount") },
            { id: "count", label: t("reports.colLines") },
          ]}
          getSearchHaystack={(r) =>
            `${r.currencyCode} ${supplierPaySourceLabel(r.sourceType, t)}`
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "currency":
                return r.currencyCode;
              case "source":
                return supplierPaySourceLabel(r.sourceType, t);
              case "amount":
                return r.totalAmount;
              case "count":
                return r.recordCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {(data.supplierPayments ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard
                        key={`${r.currencyCode}-${r.sourceType}`}
                      >
                        <MobileKv label={t("reports.colCurrency")}>
                          {r.currencyCode}
                        </MobileKv>
                        <MobileKv label={t("reports.colSupplierPaySource")}>
                          {supplierPaySourceLabel(r.sourceType, t)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colAmount")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalAmount,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colLines")}
                          valueClassName="tabular-nums"
                        >
                          {r.recordCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>
                            {t("reports.colSupplierPaySource")}
                          </th>
                          <th className={th}>{t("reports.colAmount")}</th>
                          <th className={th}>{t("reports.colLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={`${r.currencyCode}-${r.sourceType}`}>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={td}>
                              {supplierPaySourceLabel(r.sourceType, t)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.recordCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
      {show("vehicle-off-register") ? (
      <Card title={t("reports.sectionVehicleExpensesOffRegister")}>
        {data.branchIdFilter != null ? (
          <p className="text-sm text-zinc-600">
            {t("reports.vehicleOffRegisterHiddenWhenBranch")}
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-zinc-500">
              {t("reports.vehicleOffRegisterHint")}
            </p>
            <ReportInteractiveRows
              interactive={interactive}
              rows={data.vehicleExpensesOffRegister ?? []}
              defaultSortKey="amount"
              sortOptions={[
                { id: "currency", label: t("reports.colCurrency") },
                { id: "amount", label: t("reports.colAmount") },
                { id: "count", label: t("reports.colLines") },
              ]}
              getSearchHaystack={(r) => r.currencyCode}
              getSortValue={(r, key) => {
                switch (key) {
                  case "currency":
                    return r.currencyCode;
                  case "amount":
                    return r.totalAmount;
                  case "count":
                    return r.recordCount;
                  default:
                    return 0;
                }
              }}
              t={t}
            >
              {({ displayRows, toolbar, emptyFiltered }) => (
                <>
                  {toolbar}
                  {(data.vehicleExpensesOffRegister ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
                  ) : emptyFiltered ? (
                    <p className="text-sm text-zinc-500">
                      {t("reports.sectionNoSearchMatches")}
                    </p>
                  ) : (
                    <>
                      <div className={mobileCardStack}>
                        {displayRows.map((r) => (
                          <MobileCard key={r.currencyCode}>
                            <MobileKv label={t("reports.colCurrency")}>
                              {r.currencyCode}
                            </MobileKv>
                            <MobileKv
                              label={t("reports.colAmount")}
                              valueClassName="tabular-nums"
                            >
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                r.currencyCode
                              )}
                            </MobileKv>
                            <MobileKv
                              label={t("reports.colLines")}
                              valueClassName="tabular-nums"
                            >
                              {r.recordCount}
                            </MobileKv>
                          </MobileCard>
                        ))}
                      </div>
                      <div className={`${tableWrap} hidden lg:block`}>
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr>
                              <th className={th}>{t("reports.colCurrency")}</th>
                              <th className={th}>{t("reports.colAmount")}</th>
                              <th className={th}>{t("reports.colLines")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayRows.map((r) => (
                              <tr key={r.currencyCode}>
                                <td className={td}>{r.currencyCode}</td>
                                <td className={`${td} tabular-nums`}>
                                  {formatLocaleAmount(
                                    r.totalAmount,
                                    locale,
                                    r.currencyCode
                                  )}
                                </td>
                                <td className={`${td} tabular-nums`}>
                                  {r.recordCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </ReportInteractiveRows>
          </>
        )}
      </Card>
      ) : null}
      {show("advances") ? (
      <Card title={t("reports.sectionAdvances")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.advancesByCurrency}
          defaultSortKey="amount"
          sortOptions={[
            { id: "currency", label: t("reports.colCurrency") },
            { id: "amount", label: t("reports.colAdvAmount") },
            { id: "count", label: t("reports.colAdvCount") },
          ]}
          getSearchHaystack={(r) => r.currencyCode}
          getSortValue={(r, key) => {
            switch (key) {
              case "currency":
                return r.currencyCode;
              case "amount":
                return r.totalAmount;
              case "count":
                return r.recordCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.advancesByCurrency.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard key={r.currencyCode}>
                        <MobileKv label={t("reports.colCurrency")}>
                          {r.currencyCode}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colAdvAmount")}
                          valueClassName="tabular-nums"
                        >
                          {formatLocaleAmount(
                            r.totalAmount,
                            locale,
                            r.currencyCode
                          )}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colAdvCount")}
                          valueClassName="tabular-nums"
                        >
                          {r.recordCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colCurrency")}</th>
                          <th className={th}>{t("reports.colAdvAmount")}</th>
                          <th className={th}>{t("reports.colAdvCount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={r.currencyCode}>
                            <td className={td}>{r.currencyCode}</td>
                            <td className={`${td} tabular-nums`}>
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                r.currencyCode
                              )}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.recordCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
      ) : null}
    </>
  );
}

export function StockReportDetailTables({
  data,
  t,
  locale,
  interactive = false,
}: {
  data: StockReport;
  t: TFn;
  locale: Locale;
  interactive?: boolean;
}) {
  const nLocale = locale === "tr" ? "tr-TR" : "en-US";
  const fmt = (n: number) =>
    n.toLocaleString(nLocale, { maximumFractionDigits: 2 });
  const warehouseToBranchFlows = data.warehouseToBranchFlows ?? [];
  const topOutboundProducts = data.topOutboundProducts ?? [];

  return (
    <>
      <Card title={t("reports.sectionWarehousePeriod")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.warehousePeriod}
          defaultSortKey="net"
          sortOptions={[
            { id: "warehouse", label: t("reports.colWarehouse") },
            { id: "in", label: t("reports.colQtyIn") },
            { id: "out", label: t("reports.colQtyOut") },
            { id: "net", label: t("reports.colNetQty") },
            { id: "movements", label: t("reports.colMovements") },
          ]}
          getSearchHaystack={(r) => r.warehouseName}
          getSortValue={(r, key) => {
            switch (key) {
              case "warehouse":
                return r.warehouseName;
              case "in":
                return r.quantityIn;
              case "out":
                return r.quantityOut;
              case "net":
                return r.netQuantity;
              case "movements":
                return r.movementCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.warehousePeriod.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard key={r.warehouseId}>
                        <MobileKv label={t("reports.colWarehouse")}>
                          {r.warehouseName}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colQtyIn")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.quantityIn)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colQtyOut")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.quantityOut)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colNetQty")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.netQuantity)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colMovements")}
                          valueClassName="tabular-nums"
                        >
                          {r.movementCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colWarehouse")}</th>
                          <th className={th}>{t("reports.colQtyIn")}</th>
                          <th className={th}>{t("reports.colQtyOut")}</th>
                          <th className={th}>{t("reports.colNetQty")}</th>
                          <th className={th}>{t("reports.colMovements")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={r.warehouseId}>
                            <td className={td}>{r.warehouseName}</td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.quantityIn)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.quantityOut)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.netQuantity)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.movementCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>

      <Card title={t("reports.sectionWarehouseToBranch")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={warehouseToBranchFlows}
          defaultSortKey="qty"
          sortOptions={[
            { id: "warehouse", label: t("reports.colWarehouse") },
            { id: "branch", label: t("reports.colBranch") },
            { id: "qty", label: t("reports.colReceiptQty") },
            { id: "lines", label: t("reports.colRouteLines") },
          ]}
          getSearchHaystack={(r) => `${r.warehouseName} ${r.branchName}`}
          getSortValue={(r, key) => {
            switch (key) {
              case "warehouse":
                return r.warehouseName;
              case "branch":
                return r.branchName;
              case "qty":
                return r.totalQuantity;
              case "lines":
                return r.movementLineCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {warehouseToBranchFlows.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r, idx) => (
                      <MobileCard key={`${r.warehouseId}-${r.branchId}-${idx}`}>
                        <MobileKv label={t("reports.colWarehouse")}>
                          {r.warehouseName}
                        </MobileKv>
                        <MobileKv label={t("reports.colBranch")}>
                          {r.branchName}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colReceiptQty")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.totalQuantity)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colRouteLines")}
                          valueClassName="tabular-nums"
                        >
                          {r.movementLineCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colWarehouse")}</th>
                          <th className={th}>{t("reports.colBranch")}</th>
                          <th className={th}>{t("reports.colReceiptQty")}</th>
                          <th className={th}>{t("reports.colRouteLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r, idx) => (
                          <tr key={`${r.warehouseId}-${r.branchId}-${idx}`}>
                            <td className={td}>{r.warehouseName}</td>
                            <td className={td}>{r.branchName}</td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.totalQuantity)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.movementLineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>

      <Card title={t("reports.sectionTopOutboundProducts")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={topOutboundProducts}
          defaultSortKey="out"
          sortOptions={[
            { id: "warehouse", label: t("reports.colWarehouse") },
            { id: "product", label: t("reports.colProduct") },
            { id: "out", label: t("reports.colQtyOut") },
          ]}
          getSearchHaystack={(r) =>
            `${r.warehouseName} ${r.productName ?? ""}`
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "warehouse":
                return r.warehouseName;
              case "product":
                return r.productName ?? "";
              case "out":
                return r.quantityOut;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {topOutboundProducts.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r, idx) => (
                      <MobileCard
                        key={`${r.warehouseId}-${r.productId ?? "x"}-${idx}`}
                      >
                        <MobileKv label={t("reports.colWarehouse")}>
                          {r.warehouseName}
                        </MobileKv>
                        <MobileKv label={t("reports.colProduct")}>
                          {r.productName ?? "—"}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colQtyOut")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.quantityOut)}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colWarehouse")}</th>
                          <th className={th}>{t("reports.colProduct")}</th>
                          <th className={th}>{t("reports.colQtyOut")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r, idx) => (
                          <tr
                            key={`${r.warehouseId}-${r.productId ?? "x"}-${idx}`}
                          >
                            <td className={td}>{r.warehouseName}</td>
                            <td className={td}>{r.productName ?? "—"}</td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.quantityOut)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>

      <Card title={t("reports.sectionProductFlow")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.topProductFlows}
          defaultSortKey="turnover"
          sortOptions={[
            { id: "warehouse", label: t("reports.colWarehouse") },
            { id: "product", label: t("reports.colProduct") },
            { id: "in", label: t("reports.colQtyIn") },
            { id: "out", label: t("reports.colQtyOut") },
            { id: "net", label: t("reports.colNetQty") },
            { id: "turnover", label: t("reports.colTurnover") },
          ]}
          getSearchHaystack={(r) =>
            `${r.warehouseName} ${r.productName ?? ""}`
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "warehouse":
                return r.warehouseName;
              case "product":
                return r.productName ?? "";
              case "in":
                return r.quantityIn;
              case "out":
                return r.quantityOut;
              case "net":
                return r.netQuantity;
              case "turnover":
                return r.turnover;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.topProductFlows.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r, idx) => (
                      <MobileCard
                        key={`${r.warehouseId}-${r.productId ?? "x"}-${idx}`}
                      >
                        <MobileKv label={t("reports.colWarehouse")}>
                          {r.warehouseName}
                        </MobileKv>
                        <MobileKv label={t("reports.colProduct")}>
                          {r.productName ?? "—"}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colQtyIn")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.quantityIn)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colQtyOut")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.quantityOut)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colNetQty")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.netQuantity)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colTurnover")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.turnover)}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colWarehouse")}</th>
                          <th className={th}>{t("reports.colProduct")}</th>
                          <th className={th}>{t("reports.colQtyIn")}</th>
                          <th className={th}>{t("reports.colQtyOut")}</th>
                          <th className={th}>{t("reports.colNetQty")}</th>
                          <th className={th}>{t("reports.colTurnover")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r, idx) => (
                          <tr
                            key={`${r.warehouseId}-${r.productId ?? "x"}-${idx}`}
                          >
                            <td className={td}>{r.warehouseName}</td>
                            <td className={td}>{r.productName ?? "—"}</td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.quantityIn)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.quantityOut)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.netQuantity)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.turnover)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>

      <Card title={t("reports.sectionBranchReceipts")}>
        <ReportInteractiveRows
          interactive={interactive}
          rows={data.branchReceipts}
          defaultSortKey="qty"
          sortOptions={[
            { id: "branch", label: t("reports.colBranch") },
            { id: "qty", label: t("reports.colReceiptQty") },
            { id: "lines", label: t("reports.colReceiptLines") },
          ]}
          getSearchHaystack={(r) => r.branchName}
          getSortValue={(r, key) => {
            switch (key) {
              case "branch":
                return r.branchName;
              case "qty":
                return r.totalQuantityReceived;
              case "lines":
                return r.receiptLineCount;
              default:
                return 0;
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <>
              {toolbar}
              {data.branchReceipts.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
              ) : emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((r) => (
                      <MobileCard key={r.branchId}>
                        <MobileKv label={t("reports.colBranch")}>
                          {r.branchName}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colReceiptQty")}
                          valueClassName="tabular-nums"
                        >
                          {fmt(r.totalQuantityReceived)}
                        </MobileKv>
                        <MobileKv
                          label={t("reports.colReceiptLines")}
                          valueClassName="tabular-nums"
                        >
                          {r.receiptLineCount}
                        </MobileKv>
                      </MobileCard>
                    ))}
                  </div>
                  <div className={`${tableWrap} hidden lg:block`}>
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>{t("reports.colBranch")}</th>
                          <th className={th}>{t("reports.colReceiptQty")}</th>
                          <th className={th}>{t("reports.colReceiptLines")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((r) => (
                          <tr key={r.branchId}>
                            <td className={td}>{r.branchName}</td>
                            <td className={`${td} tabular-nums`}>
                              {fmt(r.totalQuantityReceived)}
                            </td>
                            <td className={`${td} tabular-nums`}>
                              {r.receiptLineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </ReportInteractiveRows>
      </Card>
    </>
  );
}
