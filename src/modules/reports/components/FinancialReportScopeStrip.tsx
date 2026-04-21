"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { cn } from "@/lib/cn";

type TFn = (key: string) => string;

export type FinancialReportScopeStripHubProps = {
  t: TFn;
  locale: Locale;
  dateFrom: string;
  dateTo: string;
  branchLabel: string | null;
  branchFilterEmpty: boolean;
};

function Row({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-2", className)}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-700">{body}</p>
    </div>
  );
}

/** Hub: ay bazlı trend ve şube–ay neti (kümül) satırları — filtre hunisinin üstünde. */
export function FinancialReportScopeStripHubCumulativeBands({
  t,
  locale,
  dateFrom,
  dateTo,
  branchLabel,
  branchFilterEmpty,
}: FinancialReportScopeStripHubProps) {
  const period = `${formatLocaleDate(dateFrom, locale)} – ${formatLocaleDate(dateTo, locale)}`;
  return (
    <section
      className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-4"
      aria-label={t("reports.finScopeStripCumulativeAria")}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {t("reports.finScopeStripTitle")}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{period}</p>
      {branchLabel ? (
        <p className="mt-0.5 text-xs text-zinc-600">
          {t("reports.finScopeStripBranch")}: {branchLabel}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-1 sm:gap-2 lg:grid-cols-2">
        <Row title={t("reports.finScopeBucketYear")} body={t("reports.finScopeBucketYearBody")} />
        {branchFilterEmpty ? (
          <Row
            title={t("reports.finScopeBucketSeason")}
            body={t("reports.finScopeBucketSeasonBody")}
          />
        ) : (
          <Row
            title={t("reports.finScopeBucketSeason")}
            body={t("reports.finScopeBucketSeasonHiddenWhenBranch")}
          />
        )}
      </div>
    </section>
  );
}

/** Hub: özet kartları / tabloların «filtreye göre» kısmı — huninin altında. */
export function FinancialReportScopeStripHubFilterBand({ t }: { t: TFn }) {
  return (
    <div>
      <Row title={t("reports.finScopeBucketFilter")} body={t("reports.finScopeBucketFilterBody")} />
    </div>
  );
}

/** Tek blokta üç kutu (filtre + kümül yıl + kümül sezon). */
export function FinancialReportScopeStripHub({
  t,
  locale,
  dateFrom,
  dateTo,
  branchLabel,
  branchFilterEmpty,
}: FinancialReportScopeStripHubProps) {
  const period = `${formatLocaleDate(dateFrom, locale)} – ${formatLocaleDate(dateTo, locale)}`;
  return (
    <section
      className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-4"
      aria-label={t("reports.finScopeStripAria")}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {t("reports.finScopeStripTitle")}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{period}</p>
      {branchLabel ? (
        <p className="mt-0.5 text-xs text-zinc-600">
          {t("reports.finScopeStripBranch")}: {branchLabel}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-1 sm:gap-2 lg:grid-cols-3">
        <Row title={t("reports.finScopeBucketFilter")} body={t("reports.finScopeBucketFilterBody")} />
        <Row title={t("reports.finScopeBucketYear")} body={t("reports.finScopeBucketYearBody")} />
        {branchFilterEmpty ? (
          <Row
            title={t("reports.finScopeBucketSeason")}
            body={t("reports.finScopeBucketSeasonBody")}
          />
        ) : (
          <Row
            title={t("reports.finScopeBucketSeason")}
            body={t("reports.finScopeBucketSeasonHiddenWhenBranch")}
          />
        )}
      </div>
    </section>
  );
}

export function FinancialReportScopeStripTables({
  t,
  locale,
  dateFrom,
  dateTo,
  branchLabel,
}: {
  t: TFn;
  locale: Locale;
  dateFrom: string;
  dateTo: string;
  branchLabel: string | null;
}) {
  const period = `${formatLocaleDate(dateFrom, locale)} – ${formatLocaleDate(dateTo, locale)}`;
  return (
    <section
      className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-4"
      aria-label={t("reports.finScopeStripAria")}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {t("reports.finScopeStripTitle")}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{period}</p>
      {branchLabel ? (
        <p className="mt-0.5 text-xs text-zinc-600">
          {t("reports.finScopeStripBranch")}: {branchLabel}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        <Row title={t("reports.finScopeBucketFilter")} body={t("reports.finScopeTablesFilterBody")} />
        <Row title={t("reports.finScopeBucketYear")} body={t("reports.finScopeTablesYearBody")} />
        <Row title={t("reports.finScopeBucketSeason")} body={t("reports.finScopeTablesSeasonBody")} />
      </div>
    </section>
  );
}
