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
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          )}
        >
          {!hideMoney && !Boolean(data.hideFinancialTotals) ? (
            <>
              <Metric
                label={t("branch.listTodayIncome")}
                value={formatMoneyDash(data.todayIncomeTotal, dash, locale, "TRY")}
              />
              <Metric
                label={t("branch.listTotalIncome")}
                value={formatMoneyDash(data.allTimeIncomeTotal, dash, locale, "TRY")}
              />
              <Metric
                label={t("branch.listAllTimeProfit")}
                value={
                  data.allTimeNetProfit == null
                    ? dash
                    : formatMoneyDash(data.allTimeNetProfit, dash, locale, "TRY")
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
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
