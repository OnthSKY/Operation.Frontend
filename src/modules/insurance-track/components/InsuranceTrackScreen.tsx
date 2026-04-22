"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useInsuranceTrackQuery } from "@/modules/insurance-track/hooks/useInsuranceTrackQuery";
import { useI18n } from "@/i18n/context";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { StatusBadge, type StatusBadgeTone } from "@/shared/components/StatusBadge";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type {
  InsuranceTrackKindApi,
  InsuranceTrackRow,
  InsuranceTrackStatusApi,
} from "@/types/insurance-track";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/messages";

const noopBlur = () => {};

type AlertFilter = Extract<
  InsuranceTrackStatusApi,
  "ExpiringSoon" | "NoCoverage" | "Expired"
>;

function insuranceTrackStatusTone(status: InsuranceTrackStatusApi): StatusBadgeTone {
  switch (status) {
    case "ExpiringSoon":
      return "warning";
    case "Expired":
      return "danger";
    case "NoCoverage":
      return "muted";
    default:
      return "success";
  }
}

function statusLabel(
  t: (k: string) => string,
  locale: Locale,
  status: InsuranceTrackStatusApi
): string {
  const k = `insuranceTrack.status.${status}` as const;
  const v = t(k);
  return v === k ? status : v;
}

function kindLabel(t: (k: string) => string, kind: string): string {
  const k = `insuranceTrack.kind.${kind}` as const;
  const v = t(k);
  return v === k ? kind : v;
}

function subjectCaptionLabel(t: (k: string) => string, kind: InsuranceTrackKindApi): string {
  const k = `insuranceTrack.subjectCaption.${kind}` as const;
  const v = t(k);
  return v === k ? kind : v;
}

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:hidden";

function AlertGlyph({ variant }: { variant: AlertFilter }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0",
    "aria-hidden": true as const,
  };
  switch (variant) {
    case "ExpiringSoon":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "NoCoverage":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l14.14 14.14" />
        </svg>
      );
    case "Expired":
      return (
        <svg {...common}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

export function InsuranceTrackScreen() {
  const { t, locale } = useI18n();
  const [asOf, setAsOf] = useState(() => localIsoDate());
  const [branchId, setBranchId] = useState("");
  const [kind, setKind] = useState("All");
  const [status, setStatus] = useState("All");
  const [expiringDays, setExpiringDays] = useState("30");

  const dataSectionRef = useRef<HTMLElement>(null);

  const branchesQ = useBranchesList();

  const attentionParams = useMemo(
    () => ({
      asOf,
      branchId: branchId.trim() ? parseInt(branchId, 10) : undefined,
      kind: "All",
      status: "All",
      expiringWithinDays: parseInt(expiringDays, 10) || 30,
    }),
    [asOf, branchId, expiringDays]
  );

  const listParams = useMemo(
    () => ({
      asOf,
      branchId: branchId.trim() ? parseInt(branchId, 10) : undefined,
      kind,
      status,
      expiringWithinDays: parseInt(expiringDays, 10) || 30,
    }),
    [asOf, branchId, kind, status, expiringDays]
  );

  const attentionQ = useInsuranceTrackQuery(attentionParams, true);
  const q = useInsuranceTrackQuery(listParams, true);

  useEffect(() => {
    if (!q.isError || !q.error) {
      notify.dismiss("insurance-track-load");
      return;
    }
    notify.error(toErrorMessage(q.error), {
      toastId: "insurance-track-load",
    });
  }, [q.isError, q.error]);

  const scrollToRecords = useCallback(() => {
    window.setTimeout(() => {
      dataSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const onAlertActivate = useCallback(
    (filter: AlertFilter) => {
      setStatus((cur) => (cur === filter ? "All" : filter));
      scrollToRecords();
    },
    [scrollToRecords]
  );

  const branchOptions: SelectOption[] = useMemo(() => {
    const rows = branchesQ.data ?? [];
    return [
      { value: "", label: t("insuranceTrack.filterBranchAll") },
      ...rows.map((b) => ({ value: String(b.id), label: b.name })),
    ];
  }, [branchesQ.data, t]);

  const kindOptions: SelectOption[] = useMemo(
    () => [
      { value: "All", label: t("insuranceTrack.filterKindAll") },
      { value: "Personnel", label: t("insuranceTrack.kind.Personnel") },
      { value: "Vehicle", label: t("insuranceTrack.kind.Vehicle") },
      { value: "Branch", label: t("insuranceTrack.kind.Branch") },
    ],
    [t]
  );

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "All", label: t("insuranceTrack.filterStatusAll") },
      { value: "Active", label: t("insuranceTrack.status.Active") },
      { value: "ExpiringSoon", label: t("insuranceTrack.status.ExpiringSoon") },
      { value: "Expired", label: t("insuranceTrack.status.Expired") },
      { value: "NoCoverage", label: t("insuranceTrack.status.NoCoverage") },
    ],
    [t]
  );

  const windowOptions: SelectOption[] = useMemo(
    () => [
      { value: "7", label: t("insuranceTrack.expiringWindow7") },
      { value: "14", label: t("insuranceTrack.expiringWindow14") },
      { value: "30", label: t("insuranceTrack.expiringWindow30") },
      { value: "60", label: t("insuranceTrack.expiringWindow60") },
    ],
    [t]
  );

  const filtersActive =
    branchId.trim() !== "" || kind !== "All" || status !== "All" || expiringDays !== "30";

  const att = attentionQ.data?.summary;
  const rows: InsuranceTrackRow[] = q.data?.rows ?? [];
  const listSummary = q.data?.summary;

  const alertDefs: {
    filter: AlertFilter;
    count: number | undefined;
    titleKey: string;
    descKey: string;
    accent: string;
    iconTone: string;
  }[] = [
    {
      filter: "ExpiringSoon",
      count: att?.expiringSoon,
      titleKey: "insuranceTrack.alertExpiringTitle",
      descKey: "insuranceTrack.alertExpiringDesc",
      accent: "border-amber-300/90 bg-gradient-to-br from-amber-50 to-orange-50/80",
      iconTone: "text-amber-700",
    },
    {
      filter: "NoCoverage",
      count: att?.noCoverage,
      titleKey: "insuranceTrack.alertNoCoverageTitle",
      descKey: "insuranceTrack.alertNoCoverageDesc",
      accent: "border-zinc-300/90 bg-gradient-to-br from-zinc-50 to-slate-50/90",
      iconTone: "text-zinc-600",
    },
    {
      filter: "Expired",
      count: att?.expired,
      titleKey: "insuranceTrack.alertExpiredTitle",
      descKey: "insuranceTrack.alertExpiredDesc",
      accent: "border-red-300/90 bg-gradient-to-br from-red-50 to-rose-50/80",
      iconTone: "text-red-700",
    },
  ];

  const attentionLoading = attentionQ.isPending && !attentionQ.data;

  return (
    <PageScreenScaffold
      className="w-full min-w-0 pb-6 pt-2 sm:pb-8 sm:pt-4 md:pt-0"
      top={
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {t("insuranceTrack.title")}
          </h1>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
            {t("insuranceTrack.subtitle")}
          </p>
        </div>
      }
      intro={
        <PageWhenToUseGuide
          guideTab="flows"
          className="mt-1"
          title={t("common.pageWhenToUseTitle")}
          description={t("pageHelp.insuranceTrack.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.insuranceTrack.step1") },
            { text: t("pageHelp.insuranceTrack.step2") },
            {
              text: t("pageHelp.insuranceTrack.step3"),
              link: { href: "/vehicles", label: t("pageHelp.insuranceTrack.step3Link") },
            },
          ]}
        />
      }
      summary={
        <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
            {t("insuranceTrack.alertsTitle")}
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">{t("insuranceTrack.alertsHint")}</p>

        <div
          className="flex flex-col gap-3 pt-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:pt-0"
          role="list"
        >
          {alertDefs.map((a) => {
            const active = status === a.filter;
            const countDisplay =
              attentionLoading ? "…" : a.count != null ? String(a.count) : "—";
            return (
              <button
                key={a.filter}
                type="button"
                role="listitem"
                aria-pressed={active}
                onClick={() => onAlertActivate(a.filter)}
                className={`w-full min-w-0 rounded-xl border-2 p-3.5 text-left shadow-sm transition touch-manipulation sm:p-4 ${a.accent} ${
                  active
                    ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50"
                    : "hover:border-zinc-400/80 active:scale-[0.99]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`rounded-xl bg-white/80 p-2 shadow-sm ${a.iconTone}`}>
                    <AlertGlyph variant={a.filter} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                      {t("insuranceTrack.alertTapToFilter")}
                    </p>
                    <p className="mt-0.5 text-sm font-bold leading-snug text-zinc-900 sm:truncate">
                      {t(a.titleKey)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">{t(a.descKey)}</p>
                    <p
                      className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900"
                      aria-live="polite"
                    >
                      {countDisplay}
                    </p>
                    {active ? (
                      <p className="mt-2 text-xs font-semibold text-violet-700">
                        {t("insuranceTrack.alertActiveFilter")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      }
      main={
        <>
          <CollapsibleMobileFilters
        title={t("insuranceTrack.filtersTitle")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey="insurance-track"
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DateField label={t("insuranceTrack.asOfLabel")} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <Select
            name="branchId"
            label={t("insuranceTrack.filterBranch")}
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={noopBlur}
            disabled={branchesQ.isPending}
          />
          <Select
            name="kind"
            label={t("insuranceTrack.filterKind")}
            options={kindOptions}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            onBlur={noopBlur}
          />
          <Select
            name="status"
            label={t("insuranceTrack.filterStatus")}
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onBlur={noopBlur}
          />
          <Select
            name="expiringWithinDays"
            label={t("insuranceTrack.expiringWindowLabel")}
            options={windowOptions}
            value={expiringDays}
            onChange={(e) => setExpiringDays(e.target.value)}
            onBlur={noopBlur}
          />
        </div>
      </CollapsibleMobileFilters>

      {q.isFetching && q.data ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          {t("insuranceTrack.updating")}
        </p>
      ) : null}

      {q.isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : null}

      {!q.isPending && !q.isError ? (
        <section
          ref={dataSectionRef}
          id="insurance-track-records"
          className="scroll-mt-[4.5rem] flex flex-col gap-3 sm:scroll-mt-6"
          aria-labelledby="insurance-track-records-heading"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2
              id="insurance-track-records-heading"
              className="text-base font-semibold text-zinc-900 sm:text-sm"
            >
              {t("insuranceTrack.listSectionTitle")}
            </h2>
            {listSummary ? (
              <p className="text-xs text-zinc-500">
                {t("insuranceTrack.summaryRowLabel")}:{" "}
                <span className="font-semibold tabular-nums text-zinc-800">{listSummary.total}</span>{" "}
                {t("insuranceTrack.summaryRowTotal")}
                {listSummary.active > 0 ? (
                  <>
                    {" "}
                    · {listSummary.active} {t("insuranceTrack.summaryActiveShort")}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("insuranceTrack.colKind")}</TableHeader>
                    <TableHeader>{t("insuranceTrack.colSubject")}</TableHeader>
                    <TableHeader>{t("insuranceTrack.colCoverage")}</TableHeader>
                    <TableHeader>{t("insuranceTrack.colPeriod")}</TableHeader>
                    <TableHeader>{t("insuranceTrack.colBranch")}</TableHeader>
                    <TableHeader>{t("insuranceTrack.colStatus")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-zinc-500">
                        {t("insuranceTrack.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, idx) => (
                      <TableRow key={`${r.kind}-${r.entityId}-${r.lineId ?? "x"}-${idx}`}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {kindLabel(t, r.kind)}
                        </TableCell>
                        <TableCell>
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400">
                            {subjectCaptionLabel(t, r.kind)}
                          </p>
                          <Link
                            href={r.detailPath}
                            className="mt-0.5 block font-semibold text-violet-700 hover:underline touch-manipulation"
                          >
                            {r.title}
                          </Link>
                          {r.subtitle ? (
                            <p className="mt-0.5 text-xs text-zinc-500">{r.subtitle}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-700">{r.coverageTypeLabel}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                          {formatRange(locale, r.startDate, r.endDate)}
                          {r.daysUntilEnd != null && r.status !== "Expired" && r.status !== "NoCoverage" ? (
                            <span className="ml-1 text-xs text-zinc-400">
                              ({r.daysUntilEnd} {t("insuranceTrack.daysUnit")})
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600">
                          {r.branchName?.trim() || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={insuranceTrackStatusTone(r.status)}
                            className="rounded-full px-2.5 normal-case"
                          >
                            {statusLabel(t, locale, r.status)}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {rows.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">{t("insuranceTrack.empty")}</p>
            ) : (
              rows.map((r, idx) => (
                <div key={`${r.kind}-${r.entityId}-${r.lineId ?? "x"}-${idx}`} className={mobileCard}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                        {kindLabel(t, r.kind)}
                      </p>
                      <Link
                        href={r.detailPath}
                        className="mt-0.5 block font-semibold text-violet-700 hover:underline touch-manipulation"
                      >
                        {r.title}
                      </Link>
                      {r.subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{r.subtitle}</p> : null}
                    </div>
                    <StatusBadge
                      tone={insuranceTrackStatusTone(r.status)}
                      className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] normal-case"
                    >
                      {statusLabel(t, locale, r.status)}
                    </StatusBadge>
                  </div>
                  <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">{t("insuranceTrack.colCoverage")}</dt>
                      <dd className="text-right font-medium text-zinc-800">{r.coverageTypeLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">{t("insuranceTrack.colPeriod")}</dt>
                      <dd className="text-right text-zinc-700">
                        {formatRange(locale, r.startDate, r.endDate)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">{t("insuranceTrack.colBranch")}</dt>
                      <dd className="text-right text-zinc-700">{r.branchName?.trim() || "—"}</dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
        </>
      }
    />
  );
}

function formatRange(locale: Locale, start: string | null, end: string | null): string {
  const dash = "—";
  const a = formatLocaleDate(start, locale, "");
  const b = formatLocaleDate(end, locale, "");
  if (!a && !b) return dash;
  if (!a) return b || dash;
  if (!b) return `${a} → ${dash}`;
  return `${a} → ${b}`;
}
