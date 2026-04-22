"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import type { SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import type { ReactNode } from "react";

export function MetricValue({
  state,
  dash,
  locale,
  pick,
  valueClassName,
  footnote,
  loadingLabel,
  emptyHint,
  onRetry,
  retryLabel,
  zeroHint,
  emptyIcon,
}: {
  state: SummaryAggregateState;
  dash: string;
  locale: Locale;
  pick: (s: Extract<SummaryAggregateState, { kind: "ok" }>) => number;
  valueClassName: string;
  footnote: string;
  loadingLabel: string;
  emptyHint: string;
  onRetry: () => void;
  retryLabel: string;
  zeroHint?: string;
  emptyIcon?: ReactNode;
}): ReactNode {
  const { t } = useI18n();
  if (state.kind === "loading") {
    return <p className="text-sm text-zinc-500">{loadingLabel}</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600">{toErrorMessage(state.message)}</p>
        <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
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
        {emptyIcon ? <div className="text-zinc-400">{emptyIcon}</div> : null}
        <p className="text-2xl font-semibold text-zinc-400">{dash}</p>
        <p className="mt-1 text-xs text-zinc-500">{emptyHint}</p>
      </>
    );
  }
  const value = pick(state);
  const isZero = Math.abs(value) < 0.000001;
  return (
    <>
      <p className={`text-2xl font-semibold ${valueClassName}`}>
        {formatLocaleAmount(value, locale)}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{footnote}</p>
      {isZero && zeroHint ? <p className="mt-1 text-xs text-zinc-500">{zeroHint}</p> : null}
    </>
  );
}

export function StatSkeleton() {
  return (
    <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100" aria-hidden />
  );
}
