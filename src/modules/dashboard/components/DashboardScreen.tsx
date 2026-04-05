"use client";

import { useI18n } from "@/i18n/context";
import {
  useTodayBranchesSummary,
  type SummaryAggregateState,
} from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import { Button } from "@/shared/ui/Button";
import type { ReactNode } from "react";

function formatMoney(n: number, dash: string) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function MetricValue({
  state,
  dash,
  pick,
  valueClassName,
  footnote,
  loadingLabel,
  emptyHint,
  onRetry,
  retryLabel,
}: {
  state: SummaryAggregateState;
  dash: string;
  pick: (s: Extract<SummaryAggregateState, { kind: "ok" }>) => number;
  valueClassName: string;
  footnote: string;
  loadingLabel: string;
  emptyHint: string;
  onRetry: () => void;
  retryLabel: string;
}): ReactNode {
  if (state.kind === "loading") {
    return <p className="text-sm text-zinc-500">{loadingLabel}</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600">{toErrorMessage(state.message)}</p>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      </div>
    );
  }
  if (state.kind === "empty") {
    return (
      <>
        <p className="text-2xl font-semibold text-zinc-400">{dash}</p>
        <p className="mt-1 text-xs text-zinc-500">{emptyHint}</p>
      </>
    );
  }
  return (
    <>
      <p className={`text-2xl font-semibold ${valueClassName}`}>
        {formatMoney(pick(state), dash)}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{footnote}</p>
    </>
  );
}

export function DashboardScreen() {
  const { t } = useI18n();
  useHashScroll();
  const { state, refetch } = useTodayBranchesSummary();
  const dash = "—";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 lg:max-w-6xl 2xl:max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-zinc-500">{t("dashboard.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div id="dashboard-gelir" className="scroll-mt-24">
          <Card title={t("dashboard.income")} description={t("dashboard.todayTotal")}>
            <MetricValue
              state={state}
              dash={dash}
              pick={(s) => s.totalIncome}
              valueClassName="text-emerald-800"
              footnote={t("dashboard.sumAllBranches")}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={refetch}
              retryLabel={t("common.retry")}
            />
          </Card>
        </div>
        <div id="dashboard-gider" className="scroll-mt-24">
          <Card title={t("dashboard.expense")} description={t("dashboard.todayTotal")}>
            <MetricValue
              state={state}
              dash={dash}
              pick={(s) => s.totalExpense}
              valueClassName="text-red-800"
              footnote={t("dashboard.sumAllBranches")}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={refetch}
              retryLabel={t("common.retry")}
            />
          </Card>
        </div>
        <div id="dashboard-net" className="scroll-mt-24">
          <Card title={t("dashboard.netCash")} description={t("dashboard.incomeExpense")}>
            <MetricValue
              state={state}
              dash={dash}
              pick={(s) => s.netCash}
              valueClassName="text-zinc-900"
              footnote={t("dashboard.sumAllBranches")}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={refetch}
              retryLabel={t("common.retry")}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
