"use client";

import {
  financialBreakdownCategoryLabel,
  financialBreakdownMainLabel,
  financialBreakdownTypeLabel,
} from "@/modules/reports/lib/financial-breakdown-labels";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { FinancialReport, StockReport } from "@/types/reports";
import type { Locale } from "@/i18n/messages";
import Link from "next/link";
import type { ReactNode } from "react";

const tableWrap =
  "touch-pan-x overflow-x-auto overscroll-x-contain rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]";
const th =
  "border-b border-zinc-200 bg-zinc-50 px-2 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600 sm:px-3 sm:text-xs";
const td =
  "border-b border-zinc-100 px-2 py-2 text-xs text-zinc-800 sm:px-3 sm:text-sm";

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:hidden";
const mobileCardStack = "flex flex-col gap-3 sm:hidden";

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

export function FinancialReportDetailTables({
  data,
  branchTrendMap,
  t,
  locale,
}: {
  data: FinancialReport;
  branchTrendMap: Map<string, number>;
  t: TFn;
  locale: Locale;
}) {
  return (
    <>
      <Card title={t("reports.sectionTotals")}>
        {data.totalsByCurrency.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.totalsByCurrency.map((r) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>{t("reports.colCurrency")}</th>
                    <th className={th}>{t("reports.colIncome")}</th>
                    <th className={th}>{t("reports.colExpense")}</th>
                    <th className={th}>{t("reports.colNet")}</th>
                    <th className={th}>{t("reports.colInCount")}</th>
                    <th className={th}>{t("reports.colOutCount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.totalsByCurrency.map((r) => (
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
      </Card>

      <Card title={t("reports.sectionByBranch")}>
        {data.byBranch.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.byBranch.map((r) => {
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
                      {r.branchName}
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
                        href="/branch"
                        className="text-sm font-semibold text-violet-700 hover:underline"
                      >
                        {t("reports.linkBranchTx")}
                      </Link>
                    </MobileKv>
                  </MobileCard>
                );
              })}
            </div>
            <div className={`${tableWrap} hidden sm:block`}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>{t("reports.colBranch")}</th>
                    <th className={th}>{t("reports.colCurrency")}</th>
                    <th className={th}>{t("reports.colIncome")}</th>
                    <th className={th}>{t("reports.colExpense")}</th>
                    <th className={th}>{t("reports.colNet")}</th>
                    <th className={th}>{t("reports.colDeltaPrior")}</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {data.byBranch.map((r) => (
                    <tr key={`${r.branchId}-${r.currencyCode}`}>
                      <td className={td}>{r.branchName}</td>
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
                          href="/branch"
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
      </Card>

      <Card title={t("reports.sectionByCategory")}>
        {data.byCategory.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.byCategory.map((r, idx) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
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
                  {data.byCategory.map((r, idx) => (
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
                      <td className={`${td} tabular-nums`}>{r.lineCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title={t("reports.sectionAdvances")}>
        {data.advancesByCurrency.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.advancesByCurrency.map((r) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>{t("reports.colCurrency")}</th>
                    <th className={th}>{t("reports.colAdvAmount")}</th>
                    <th className={th}>{t("reports.colAdvCount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.advancesByCurrency.map((r) => (
                    <tr key={r.currencyCode}>
                      <td className={td}>{r.currencyCode}</td>
                      <td className={`${td} tabular-nums`}>
                        {formatLocaleAmount(
                          r.totalAmount,
                          locale,
                          r.currencyCode
                        )}
                      </td>
                      <td className={`${td} tabular-nums`}>{r.recordCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function StockReportDetailTables({
  data,
  t,
  locale,
}: {
  data: StockReport;
  t: TFn;
  locale: Locale;
}) {
  const nLocale = locale === "tr" ? "tr-TR" : "en-US";
  const fmt = (n: number) =>
    n.toLocaleString(nLocale, { maximumFractionDigits: 2 });

  return (
    <>
      <Card title={t("reports.sectionWarehousePeriod")}>
        {data.warehousePeriod.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.warehousePeriod.map((r) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
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
                  {data.warehousePeriod.map((r) => (
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
      </Card>

      <Card title={t("reports.sectionProductFlow")}>
        {data.topProductFlows.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.topProductFlows.map((r, idx) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
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
                  {data.topProductFlows.map((r, idx) => (
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
      </Card>

      <Card title={t("reports.sectionBranchReceipts")}>
        {data.branchReceipts.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        ) : (
          <>
            <div className={mobileCardStack}>
              {data.branchReceipts.map((r) => (
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
            <div className={`${tableWrap} hidden sm:block`}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>{t("reports.colBranch")}</th>
                    <th className={th}>{t("reports.colReceiptQty")}</th>
                    <th className={th}>{t("reports.colReceiptLines")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branchReceipts.map((r) => (
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
      </Card>
    </>
  );
}
