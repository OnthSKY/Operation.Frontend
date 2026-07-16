"use client";

import Link from "next/link";
import { DashCard } from "@/modules/dashboard/components/overview/DashCard";
import type { FinancialBucketSums } from "@/modules/dashboard/hooks/useDashboardFinancialCards";
import { cn } from "@/lib/cn";
import { Infinity as InfinityIcon, Sun, CalendarRange, CalendarDays, Clock } from "lucide-react";
import type { ComponentType } from "react";

type TFn = (key: string) => string;

export type FinancialCardAccent = "slate" | "sky" | "indigo" | "violet" | "emerald";

// Tam sınıf literalleri — Tailwind purge güvenli (dinamik string yok).
const ACCENTS: Record<
  FinancialCardAccent,
  { card: string; ring: string; glow: string; chip: string; icon: ComponentType<{ className?: string }> }
> = {
  slate: {
    card: "from-slate-50/80",
    ring: "ring-slate-200/60",
    glow: "bg-slate-300/30",
    chip: "bg-slate-100 text-slate-600",
    icon: InfinityIcon,
  },
  sky: {
    card: "from-sky-50/80",
    ring: "ring-sky-200/60",
    glow: "bg-sky-300/30",
    chip: "bg-sky-100 text-sky-600",
    icon: Sun,
  },
  indigo: {
    card: "from-indigo-50/80",
    ring: "ring-indigo-200/60",
    glow: "bg-indigo-300/30",
    chip: "bg-indigo-100 text-indigo-600",
    icon: CalendarRange,
  },
  violet: {
    card: "from-violet-50/80",
    ring: "ring-violet-200/60",
    glow: "bg-violet-300/30",
    chip: "bg-violet-100 text-violet-600",
    icon: CalendarDays,
  },
  emerald: {
    card: "from-emerald-50/80",
    ring: "ring-emerald-200/60",
    glow: "bg-emerald-300/30",
    chip: "bg-emerald-100 text-emerald-600",
    icon: Clock,
  },
};

export function FinancialIncomeCard({
  title,
  description,
  bucket,
  href,
  detailLabel,
  fmtMoney,
  t,
  compact,
  accent = "slate",
}: {
  title: string;
  description: string;
  bucket: FinancialBucketSums;
  href: string;
  detailLabel: string;
  fmtMoney: (n: number | null | undefined, currency?: string) => string;
  t: TFn;
  /** Dar KPI kartı — dönem rengi + gradient/glow ile modern görünüm. */
  compact?: boolean;
  accent?: FinancialCardAccent;
}) {
  if (compact) {
    const a = ACCENTS[accent];
    const Icon = a.icon;
    return (
      <Link
        href={href}
        aria-label={`${title} — ${detailLabel}`}
        className={cn(
          "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br to-white p-3 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:p-3.5",
          a.card,
          a.ring
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-2xl transition-opacity group-hover:opacity-80",
            a.glow
          )}
        />
        <div className="relative flex items-start justify-between gap-1.5">
          <h3 className="min-w-0 text-[11px] font-bold leading-tight tracking-tight text-zinc-900 sm:text-xs">
            {title}
          </h3>
          <span
            aria-hidden
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-lg [&_svg]:h-[13px] [&_svg]:w-[13px]",
              a.chip
            )}
          >
            <Icon />
          </span>
        </div>

        <dl className="relative mt-2.5 space-y-1.5">
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {t("dashboard.ovFinIncomeLabel")}
            </dt>
            <dd className="truncate text-base font-bold leading-tight tabular-nums text-zinc-900 sm:text-lg">
              {fmtMoney(bucket.income, bucket.currency)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {t("dashboard.ovFinRegisterExpenseLabel")}
            </dt>
            <dd className="truncate text-[13px] font-semibold tabular-nums text-rose-600">
              {fmtMoney(bucket.expenseFromRegister, bucket.currency)}
            </dd>
          </div>
          <div className="min-w-0 border-t border-zinc-200/70 pt-1.5">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {t("dashboard.ovFinNetLabel")}
            </dt>
            <dd
              className={cn(
                "truncate text-sm font-bold tabular-nums",
                bucket.net < 0 ? "text-rose-600" : "text-zinc-900"
              )}
            >
              {fmtMoney(bucket.net, bucket.currency)}
            </dd>
          </div>
        </dl>
      </Link>
    );
  }

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
