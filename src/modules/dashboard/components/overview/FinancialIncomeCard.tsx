"use client";

import { DashCard } from "@/modules/dashboard/components/overview/DashCard";
import type { FinancialBucketSums } from "@/modules/dashboard/hooks/useDashboardFinancialCards";

type TFn = (key: string) => string;

export function FinancialIncomeCard({
  title,
  description,
  bucket,
  href,
  detailLabel,
  fmtMoney,
  t,
}: {
  title: string;
  description: string;
  bucket: FinancialBucketSums;
  href: string;
  detailLabel: string;
  fmtMoney: (n: number | null | undefined, currency?: string) => string;
  t: TFn;
}) {
  return (
    <DashCard
      title={title}
      description={description}
      href={href}
      detailLabel={detailLabel}
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-zinc-500">
            {t("dashboard.ovFinIncomeLabel")}
          </dt>
          <dd className="tabular-nums text-base font-semibold text-zinc-900">
            {fmtMoney(bucket.income, bucket.currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-zinc-500">
            {t("dashboard.ovFinRegisterExpenseLabel")}
          </dt>
          <dd className="tabular-nums text-sm font-medium text-rose-600">
            {fmtMoney(bucket.expenseFromRegister, bucket.currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
          <dt className="text-xs text-zinc-500">
            {t("dashboard.ovFinNetLabel")}
          </dt>
          <dd
            className={`tabular-nums text-sm font-semibold ${
              bucket.net < 0 ? "text-rose-600" : "text-zinc-900"
            }`}
          >
            {fmtMoney(bucket.net, bucket.currency)}
          </dd>
        </div>
      </dl>
    </DashCard>
  );
}
