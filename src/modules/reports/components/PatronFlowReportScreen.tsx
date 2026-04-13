"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import { ReportInteractiveRows } from "@/modules/reports/components/ReportInteractiveRows";
import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import {
  usePatronFlowOverview,
  usePatronFlowPosProfiles,
  useUpsertBranchPosSettlementProfile,
} from "@/modules/reports/hooks/useReportsQueries";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type { PatronFlowLine } from "@/types/patron-flow";
import { useEffect, useMemo, useState } from "react";

function flowKindLabel(t: (k: string) => string, kind: string): string {
  const u = kind.toUpperCase();
  if (u === "PATRON_CASH_IN") return t("reports.patronFlowKindPatronCashIn");
  if (u === "SUPPLIER_PAID_BY_PATRON")
    return t("reports.patronFlowKindSupplierPaidByPatron");
  if (u === "ACCOUNTING_PAID_BY_PATRON")
    return t("reports.patronFlowKindAccountingPaidByPatron");
  if (u === "OTHER_PAID_BY_PATRON") return t("reports.patronFlowKindOtherPaidByPatron");
  return kind;
}

function beneficiaryLabel(t: (k: string) => string, type: string): string {
  const u = type.toUpperCase();
  if (u === "PATRON") return t("reports.patronFlowBeneficiaryPatron");
  if (u === "FRANCHISE") return t("reports.patronFlowBeneficiaryFranchise");
  if (u === "JOINT_VENTURE") return t("reports.patronFlowBeneficiaryJoint");
  if (u === "BRANCH_PERSONNEL")
    return t("reports.patronFlowBeneficiaryBranchPersonnel");
  if (u === "OTHER") return t("reports.patronFlowBeneficiaryOther");
  return type;
}

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:hidden";
const mobileCardStack = "flex flex-col gap-3 sm:hidden";

type SortKey = "date" | "branch" | "kind" | "amount";

export function PatronFlowReportScreen() {
  const { t, locale } = useI18n();
  const [dateFrom, setDateFrom] = useState(() => startOfMonthIso());
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [filterBranchId, setFilterBranchId] = useState("");

  const [profileBranchId, setProfileBranchId] = useState("");
  const [beneficiaryType, setBeneficiaryType] = useState("PATRON");
  const [beneficiaryPersonnelId, setBeneficiaryPersonnelId] = useState("");
  const [profileNotes, setProfileNotes] = useState("");

  const { data: branches = [] } = useBranchesList();
  const { data: personnel = [] } = usePersonnelList(true);
  const posProfiles = usePatronFlowPosProfiles(true);
  const upsertProfile = useUpsertBranchPosSettlementProfile();

  const flowParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        filterBranchId === "" ? undefined : Number.parseInt(filterBranchId, 10),
    }),
    [dateFrom, dateTo, filterBranchId]
  );

  const overview = usePatronFlowOverview(flowParams, true);

  const filterBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const mergedProfileBranchOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    for (const p of posProfiles.data?.profiles ?? []) {
      if (!m.has(p.branchId)) m.set(p.branchId, p.branchName);
    }
    for (const o of posProfiles.data?.branchesWithoutProfile ?? []) {
      m.set(o.id, o.name);
    }
    const rows = [...m.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], locale === "tr" ? "tr" : "en")
    );
    return [
      { value: "", label: t("reports.patronFlowSelectBranch") },
      ...rows.map(([id, name]) => ({ value: String(id), label: name })),
    ];
  }, [branches, posProfiles.data, locale, t]);

  const selectedProfileBranchNumeric =
    profileBranchId === "" ? null : Number.parseInt(profileBranchId, 10);

  useEffect(() => {
    if (!selectedProfileBranchNumeric || !Number.isFinite(selectedProfileBranchNumeric)) {
      return;
    }
    const prof = posProfiles.data?.profiles.find(
      (p) => p.branchId === selectedProfileBranchNumeric
    );
    if (prof) {
      setBeneficiaryType(prof.beneficiaryType.toUpperCase());
      setBeneficiaryPersonnelId(
        prof.beneficiaryPersonnelId != null ? String(prof.beneficiaryPersonnelId) : ""
      );
      setProfileNotes(prof.notes ?? "");
    } else {
      setBeneficiaryType("PATRON");
      setBeneficiaryPersonnelId("");
      setProfileNotes("");
    }
  }, [selectedProfileBranchNumeric, posProfiles.data]);

  const personnelForProfileBranch = useMemo(() => {
    if (!selectedProfileBranchNumeric || !Number.isFinite(selectedProfileBranchNumeric)) {
      return [];
    }
    return personnel.filter((p) => p.branchId === selectedProfileBranchNumeric);
  }, [personnel, selectedProfileBranchNumeric]);

  const personnelSelectOptions = useMemo(() => {
    const base = personnelForProfileBranch.map((p) => ({
      value: String(p.id),
      label: p.fullName,
    }));
    const prof = posProfiles.data?.profiles.find(
      (p) => p.branchId === selectedProfileBranchNumeric
    );
    const pid = prof?.beneficiaryPersonnelId;
    if (
      pid &&
      prof?.beneficiaryPersonnelName &&
      !base.some((o) => o.value === String(pid))
    ) {
      base.unshift({
        value: String(pid),
        label: prof.beneficiaryPersonnelName,
      });
    }
    return [
      { value: "", label: t("reports.patronFlowPersonnelPlaceholder") },
      ...base,
    ];
  }, [personnelForProfileBranch, posProfiles.data, selectedProfileBranchNumeric, t]);

  const beneficiaryTypeOptions = useMemo(
    () => [
      { value: "PATRON", label: beneficiaryLabel(t, "PATRON") },
      { value: "FRANCHISE", label: beneficiaryLabel(t, "FRANCHISE") },
      { value: "JOINT_VENTURE", label: beneficiaryLabel(t, "JOINT_VENTURE") },
      {
        value: "BRANCH_PERSONNEL",
        label: beneficiaryLabel(t, "BRANCH_PERSONNEL"),
      },
      { value: "OTHER", label: beneficiaryLabel(t, "OTHER") },
    ],
    [t]
  );

  const setPreset = (key: "month" | "d30" | "d7") => {
    const today = localIsoDate();
    if (key === "month") {
      setDateFrom(startOfMonthIso());
      setDateTo(today);
      return;
    }
    if (key === "d30") {
      setDateFrom(addDaysFromIso(today, -29));
      setDateTo(today);
      return;
    }
    setDateFrom(addDaysFromIso(today, -6));
    setDateTo(today);
  };

  const filtersActive = filterBranchId !== "";

  const items: PatronFlowLine[] = overview.data?.items ?? [];
  const totals = overview.data?.totalsByKind ?? [];

  const missingProfileCount =
    posProfiles.data?.branchesWithoutProfile?.length ?? 0;

  const onSaveProfile = async () => {
    if (!selectedProfileBranchNumeric || !Number.isFinite(selectedProfileBranchNumeric)) {
      notify.error(t("reports.patronFlowPickBranchFirst"));
      return;
    }
    const bt = beneficiaryType.toUpperCase();
    let pid: number | null = null;
    if (bt === "BRANCH_PERSONNEL") {
      const n = Number.parseInt(beneficiaryPersonnelId, 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("reports.patronFlowPersonnelRequired"));
        return;
      }
      pid = n;
    }
    try {
      await upsertProfile.mutateAsync({
        branchId: selectedProfileBranchNumeric,
        body: {
          beneficiaryType: bt,
          beneficiaryPersonnelId: pid,
          notes: profileNotes.trim() ? profileNotes.trim() : null,
        },
      });
      notify.success(t("reports.patronFlowProfileSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPagePatronFlowTitle")}
      subtitle={t("reports.tablesPagePatronFlowSubtitle")}
      pageGuide={
        <PageWhenToUseGuide
          guideTab="reports"
          title={t("common.pageWhenToUseTitle")}
          description={t("pageHelp.reportsPatronFlow.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsPatronFlow.step1") },
            {
              text: t("pageHelp.reportsPatronFlow.step2"),
              link: { href: "/branches", label: t("pageHelp.reportsPatronFlow.step2Link") },
            },
          ]}
        />
      }
    >
      <CollapsibleMobileFilters
        title={t("reports.filtersSectionTitle")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey="patron-flow"
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("month")}
            >
              {t("reports.presetThisMonth")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("d30")}
            >
              {t("reports.presetLast30")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("d7")}
            >
              {t("reports.presetLast7")}
            </Button>
          </div>
          <ReportSeasonYearQuickSelect
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApplyRange={(f, d) => {
              setDateFrom(f);
              setDateTo(d);
            }}
            className="max-w-full sm:max-w-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateField
              label={t("reports.dateFrom")}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <DateField
              label={t("reports.dateTo")}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="min-w-0 sm:col-span-2">
              <Select
                name="patronFlowBranchFilter"
                label={t("reports.colBranch")}
                options={filterBranchOptions}
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleMobileFilters>

      <p className="text-sm leading-relaxed text-zinc-600">{t("reports.patronFlowLead")}</p>

      {overview.isFetching && overview.data ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          {t("reports.updatingHint")}
        </p>
      ) : null}

      {overview.isError ? (
        <p className="text-sm text-red-600">
          {t("reports.error")} {toErrorMessage(overview.error)}
        </p>
      ) : null}

      {overview.isPending ? (
        <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
      ) : null}

      {totals.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-5">
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {t("reports.patronFlowTotalsTitle")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {totals.map((row) => (
              <li
                key={`${row.flowKind}:${row.currencyCode}`}
                className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-800">
                  {flowKindLabel(t, row.flowKind)}
                </span>
                <span className="mx-1.5 text-zinc-400">·</span>
                <span className="tabular-nums text-zinc-900">
                  {formatLocaleAmount(row.totalAmount, locale)} {row.currencyCode}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {overview.data && items.length === 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {t("reports.patronFlowEmpty")}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ReportInteractiveRows<PatronFlowLine, SortKey>
          interactive
          rows={items}
          defaultSortKey="date"
          sortOptions={[
            { id: "date", label: t("reports.patronFlowColDate") },
            { id: "branch", label: t("reports.colBranch") },
            { id: "kind", label: t("reports.patronFlowColKind") },
            { id: "amount", label: t("reports.patronFlowColAmount") },
          ]}
          getSearchHaystack={(r) =>
            [
              r.branchName,
              r.description,
              r.mainCategory,
              r.category,
              r.transactionType,
              flowKindLabel(t, r.flowKind),
              r.posBeneficiaryPersonnelName,
              r.posSettlementNotes,
            ]
              .filter(Boolean)
              .join(" ")
          }
          getSortValue={(r, key) => {
            switch (key) {
              case "date":
                return r.transactionDate;
              case "branch":
                return r.branchName ?? "";
              case "kind":
                return flowKindLabel(t, r.flowKind);
              case "amount":
                return r.amount;
              default:
                return "";
            }
          }}
          t={t}
        >
          {({ displayRows, toolbar, emptyFiltered }) => (
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
              <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.patronFlowLinesSectionTitle")}
              </p>
              {toolbar}
              {emptyFiltered ? (
                <p className="text-sm text-zinc-500">
                  {t("reports.sectionNoSearchMatches")}
                </p>
              ) : (
                <>
                  <div className={mobileCardStack}>
                    {displayRows.map((row) => (
                      <article key={row.id} className={mobileCard}>
                        <dl className="space-y-2">
                          <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                              {t("reports.patronFlowColDate")}
                            </dt>
                            <dd className="text-sm font-medium text-zinc-900">
                              {row.transactionDate}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                              {t("reports.colBranch")}
                            </dt>
                            <dd className="text-sm text-zinc-800">
                              {row.branchName ?? "—"}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                              {t("reports.patronFlowColKind")}
                            </dt>
                            <dd className="text-sm text-zinc-800">
                              {flowKindLabel(t, row.flowKind)}
                            </dd>
                          </div>
                          <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                              {t("reports.patronFlowColAmount")}
                            </dt>
                            <dd className="text-sm tabular-nums text-zinc-900">
                              {formatLocaleAmount(row.amount, locale)} {row.currencyCode}
                            </dd>
                          </div>
                          {row.description ? (
                            <div className="flex flex-col gap-0.5">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColDescription")}
                              </dt>
                              <dd className="text-sm text-zinc-700">{row.description}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>{t("reports.patronFlowColDate")}</TableHeader>
                          <TableHeader>{t("reports.colBranch")}</TableHeader>
                          <TableHeader>{t("reports.patronFlowColKind")}</TableHeader>
                          <TableHeader className="text-right tabular-nums">
                            {t("reports.patronFlowColAmount")}
                          </TableHeader>
                          <TableHeader>{t("reports.patronFlowColCategory")}</TableHeader>
                          <TableHeader>{t("reports.patronFlowColPosTag")}</TableHeader>
                          <TableHeader>{t("reports.patronFlowColDescription")}</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {row.transactionDate}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.branchName ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {flowKindLabel(t, row.flowKind)}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatLocaleAmount(row.amount, locale)} {row.currencyCode}
                            </TableCell>
                            <TableCell className="max-w-[10rem] truncate text-sm text-zinc-600">
                              {[row.mainCategory, row.category].filter(Boolean).join(" › ") ||
                                "—"}
                            </TableCell>
                            <TableCell className="max-w-[12rem] text-xs text-zinc-600">
                              {row.posBeneficiaryType
                                ? [
                                    beneficiaryLabel(t, row.posBeneficiaryType),
                                    row.posBeneficiaryPersonnelName,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "—"}
                            </TableCell>
                            <TableCell className="max-w-[18rem] text-sm text-zinc-700">
                              {row.description ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </ReportInteractiveRows>
      ) : null}

      <section className="rounded-2xl border border-dashed border-violet-300/80 bg-violet-50/40 p-3 sm:p-5">
        <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-violet-900/80">
          {t("reports.patronFlowPosSectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-700">{t("reports.patronFlowPosSectionLead")}</p>
        {missingProfileCount > 0 ? (
          <p className="mt-2 text-sm text-amber-900">
            {t("reports.patronFlowBranchesMissingProfile").replace(
              "{{count}}",
              String(missingProfileCount)
            )}
          </p>
        ) : null}
        {posProfiles.isError ? (
          <p className="mt-2 text-sm text-red-600">
            {t("reports.error")} {toErrorMessage(posProfiles.error)}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Select
            name="patronFlowProfileBranch"
            label={t("reports.patronFlowProfileBranchLabel")}
            options={mergedProfileBranchOptions}
            value={profileBranchId}
            onChange={(e) => setProfileBranchId(e.target.value)}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <Select
            name="patronFlowBeneficiaryType"
            label={t("reports.patronFlowBeneficiaryTypeLabel")}
            options={beneficiaryTypeOptions}
            value={beneficiaryType}
            onChange={(e) => setBeneficiaryType(e.target.value)}
            onBlur={() => {}}
            disabled={!profileBranchId}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <div className="lg:col-span-2">
            <Select
              name="patronFlowBeneficiaryPersonnel"
              label={t("reports.patronFlowPersonnelLabel")}
              options={personnelSelectOptions}
              value={beneficiaryPersonnelId}
              onChange={(e) => setBeneficiaryPersonnelId(e.target.value)}
              onBlur={() => {}}
              disabled={
                !profileBranchId || beneficiaryType.toUpperCase() !== "BRANCH_PERSONNEL"
              }
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              name="patronFlowProfileNotes"
              label={t("reports.patronFlowNotesLabel")}
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              onBlur={() => {}}
              disabled={!profileBranchId}
              placeholder={t("reports.patronFlowNotesPlaceholder")}
            />
          </div>
          <div className="lg:col-span-2">
            <Button
              type="button"
              variant="primary"
              className="min-h-11 touch-manipulation sm:min-h-10"
              disabled={!profileBranchId || upsertProfile.isPending}
              onClick={() => void onSaveProfile()}
            >
              {t("reports.patronFlowSaveProfile")}
            </Button>
          </div>
        </div>
      </section>
    </ReportTablesPageShell>
  );
}
