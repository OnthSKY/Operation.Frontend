"use client";

import {
  branchDashboardScopeActive,
  type BranchDashboardStockScope,
} from "@/modules/branch/api/branches-api";
import { useBranchDashboard } from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseProductScopeFilters,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { useState } from "react";

const emptyScope = (): BranchDashboardStockScope => ({
  mainCategoryId: null,
  subCategoryId: null,
  parentProductId: null,
  productId: null,
});

export function BranchListMetricsPanel({
  branchId,
  open,
  monthUtcKey,
  hideMoney,
  seasonSummary,
}: {
  branchId: number;
  open: boolean;
  monthUtcKey: string;
  hideMoney: boolean;
  seasonSummary: string;
}) {
  const { t, locale } = useI18n();
  const dash = "—";
  const [stockScope, setStockScope] = useState<BranchDashboardStockScope>(emptyScope);

  const { data, isPending, isError, error, refetch } = useBranchDashboard(
    branchId,
    monthUtcKey,
    open && monthUtcKey.length === 7,
    stockScope
  );

  if (!open) return null;

  const scopeOn = branchDashboardScopeActive(stockScope);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-sm">
      <p className="text-xs font-medium text-zinc-600">{seasonSummary}</p>

      <div className="rounded-lg border border-zinc-200/80 bg-white/90 p-2 sm:p-3">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
          {t("branch.listStockInboundScopeTitle")}
        </p>
        <WarehouseProductScopeFilters value={stockScope} onChange={setStockScope} />
        <p className="mt-2 text-xs text-zinc-500">{t("branch.listStockInboundScopeExplainer")}</p>
      </div>

      {isPending ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-sm text-zinc-500">
          {t("branch.listMetricsLoading")}
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col gap-2 rounded-xl border border-red-100 bg-red-50/40 px-3 py-3 text-sm">
          <p className="text-red-700">{toErrorMessage(error)}</p>
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && data ? (
        <div className="flex flex-col gap-2">
          {!hideMoney && !Boolean(data.hideFinancialTotals) ? (
            <p className="text-xs font-medium text-zinc-700">
              {t("branch.listMetricsCurrencyCaption")}
            </p>
          ) : null}
          <div
            className={cn(
              "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4"
            )}
          >
            {!hideMoney && !Boolean(data.hideFinancialTotals) ? (
              <>
                <Metric
                  label={t("branch.listTodayIncome")}
                  value={formatMoneyDash(data.todayIncomeTotal, dash, locale, "TRY")}
                  valueClass="text-emerald-900"
                />
                <Metric
                  label={t("branch.listTotalIncome")}
                  value={formatMoneyDash(data.allTimeIncomeTotal, dash, locale, "TRY")}
                  valueClass="text-emerald-900"
                />
                <Metric
                  label={t("branch.listAllTimeProfit")}
                  value={
                    data.allTimeNetProfit == null
                      ? dash
                      : formatMoneyDash(data.allTimeNetProfit, dash, locale, "TRY")
                  }
                  valueClass={
                    data.allTimeNetProfit == null
                      ? undefined
                      : data.allTimeNetProfit < -0.009
                        ? "text-red-800"
                        : data.allTimeNetProfit > 0.009
                          ? "text-emerald-900"
                          : undefined
                  }
                />
              </>
            ) : (
              <p className="text-zinc-600 sm:col-span-2 lg:col-span-3">
                {t("branch.listMetricsPersonnelNote")}
              </p>
            )}
            <Metric
              label={t("branch.listStockInboundScopeTotal")}
              value={
                !scopeOn
                  ? dash
                  : data.stockInboundScopeTotal == null
                    ? dash
                    : formatLocaleAmount(data.stockInboundScopeTotal, locale)
              }
              hint={
                !scopeOn
                  ? t("branch.listStockInboundScopePickHint")
                  : t("branch.listStockInboundScopeHint")
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5 shadow-sm",
        "sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"
      )}
    >
      <div className="flex items-start justify-between gap-3 sm:block">
        <p
          className={cn(
            "min-w-0 flex-1 pr-1 text-left text-sm font-medium leading-snug text-zinc-800",
            "sm:flex-none sm:pr-0 sm:text-xs sm:font-medium sm:uppercase sm:tracking-wide sm:text-zinc-500"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "max-w-[48%] shrink-0 text-right text-base font-semibold tabular-nums tracking-tight text-zinc-900",
            "max-md:break-words sm:mt-0.5 sm:max-w-none sm:w-full sm:text-left lg:text-right sm:truncate",
            valueClass
          )}
        >
          {value}
        </p>
      </div>
      {hint ? (
        <p
          className={cn(
            "mt-2 border-t border-zinc-100 pt-2 text-xs leading-snug text-zinc-600",
            "sm:mt-1 sm:border-0 sm:pt-0 sm:text-zinc-500"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
