"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  useAllAdvancesList,
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { AdvanceListItem } from "@/types/advance";
import { Card } from "@/shared/components/Card";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { DataTable, ResponsiveTableFrame } from "@/shared/tables";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useMatchMedia } from "@/shared/lib/use-match-media";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { AdvanceCard, createAdvanceListColumns } from "./personnel-advance-list-blocks";

export function AllAdvancesScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const myPersonnelId = user?.personnelId;
  const { data: branches = [] } = useBranchesList();
  const { data: personnelRaw = [] } = usePersonnelList(!personnelPortal);
  const [yearInput, setYearInput] = useState("");
  const [personnelValue, setPersonnelValue] = useState("");
  const [branchValue, setBranchValue] = useState("");
  /** null = automatic row limit (20 narrow / 500 desktop) */
  const [limitInput, setLimitInput] = useState<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const isNarrow = useMatchMedia("(max-width: 767px)");
  const defaultLimitNum = isNarrow ? 20 : 500;
  const defaultLimitStr = String(defaultLimitNum);
  const limitFieldValue = limitInput ?? defaultLimitStr;

  const activePersonnel = useMemo(
    () => personnelRaw.filter((p) => !p.isDeleted),
    [personnelRaw]
  );

  const personnelOptions = useMemo(() => {
    const rows = personnelRaw
      .filter((p) => !p.isDeleted)
      .slice()
      .sort((a, b) =>
        personnelDisplayName(a).localeCompare(personnelDisplayName(b), undefined, {
          sensitivity: "base",
        })
      );
    return [
      { value: "", label: t("personnel.allAdvancesAnyPersonnel") },
      ...rows.map((p) => ({
        value: String(p.id),
        label: personnelDisplayName(p),
      })),
    ];
  }, [personnelRaw, t]);

  const listParams = useMemo(() => {
    const y = yearInput.trim();
    const yearParsed = y ? parseInt(y, 10) : NaN;
    const effectiveYear =
      Number.isFinite(yearParsed) && yearParsed >= 1900 && yearParsed <= 9999
        ? yearParsed
        : undefined;
    const pe = personnelValue.trim();
    const pid = pe ? parseInt(pe, 10) : 0;
    const br = branchValue.trim();
    const bid = br ? parseInt(br, 10) : 0;
    const lim = limitFieldValue.trim();
    const limParsed = lim ? parseInt(lim, 10) : defaultLimitNum;
    const limit =
      Number.isFinite(limParsed) && limParsed >= 1 && limParsed <= 1000
        ? limParsed
        : defaultLimitNum;
    return {
      effectiveYear,
      personnelId: pid > 0 ? pid : undefined,
      branchId: bid > 0 ? bid : undefined,
      limit,
    };
  }, [yearInput, personnelValue, branchValue, limitFieldValue, defaultLimitNum]);

  const allAdvancesQuery = useAllAdvancesList(listParams, !personnelPortal);
  const ownAdvancesQuery = useQuery({
    queryKey: personnelKeys.advances(
      myPersonnelId ?? 0,
      listParams.effectiveYear
    ),
    queryFn: () =>
      fetchAdvancesByPersonnel(myPersonnelId!, listParams.effectiveYear),
    enabled:
      personnelPortal &&
      myPersonnelId != null &&
      myPersonnelId > 0,
  });

  const data: AdvanceListItem[] = useMemo(() => {
    if (personnelPortal) {
      const raw = ownAdvancesQuery.data ?? [];
      const dash = t("personnel.dash");
      const pname = user?.fullName?.trim() || dash;
      return raw.map((a) => ({
        ...a,
        personnelFullName: pname,
        branchName:
          branches.find((b) => b.id === a.branchId)?.name?.trim() || dash,
      }));
    }
    return allAdvancesQuery.data ?? [];
  }, [
    personnelPortal,
    ownAdvancesQuery.data,
    allAdvancesQuery.data,
    branches,
    user?.fullName,
    t,
  ]);

  const isPending = personnelPortal
    ? ownAdvancesQuery.isPending
    : allAdvancesQuery.isPending;
  const isError = personnelPortal
    ? ownAdvancesQuery.isError
    : allAdvancesQuery.isError;
  const error = personnelPortal ? ownAdvancesQuery.error : allAdvancesQuery.error;
  const refetch = personnelPortal
    ? ownAdvancesQuery.refetch
    : allAdvancesQuery.refetch;

  const advanceColumns = useMemo(() => createAdvanceListColumns(t, locale), [t, locale]);

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.allAdvancesAnyBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const filtersActive = useMemo(() => {
    if (personnelPortal) {
      return yearInput.trim() !== "";
    }
    const lim = limitFieldValue.trim();
    const limitCustom =
      limitInput !== null && lim !== "" && lim !== defaultLimitStr;
    return (
      yearInput.trim() !== "" ||
      personnelValue !== "" ||
      branchValue !== "" ||
      limitCustom
    );
  }, [
    personnelPortal,
    yearInput,
    personnelValue,
    branchValue,
    limitFieldValue,
    limitInput,
    defaultLimitStr,
  ]);

  const secondaryBtn =
    "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:w-auto";

  return (
    <div className="mx-auto flex w-full app-page-max flex-col gap-4 p-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {t("personnel.allAdvancesTitle")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("personnel.allAdvancesDesc")}
          </p>
        </div>
        {!personnelPortal ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setAdvanceOpen(true)}
            >
              {t("personnel.advance")}
            </Button>
            <Link href="/personnel" className={cn(secondaryBtn, "shrink-0 text-center")}>
              {t("personnel.heading")}
            </Link>
          </div>
        ) : null}
      </div>

      <CollapsibleMobileFilters
        title={t("personnel.allAdvancesFilters")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Input
            name="effectiveYear"
            label={t("personnel.allAdvancesYearOptional")}
            type="number"
            inputMode="numeric"
            min={1900}
            max={9999}
            placeholder={t("personnel.fieldOptionalPlaceholder")}
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          />
          {!personnelPortal ? (
            <>
              <Select
                name="personnelFilter"
                label={t("personnel.tableName")}
                options={personnelOptions}
                value={personnelValue}
                onChange={(e) => setPersonnelValue(e.target.value)}
                onBlur={() => {}}
              />
              <Select
                name="branchFilter"
                label={t("personnel.tableBranch")}
                options={branchOptions}
                value={branchValue}
                onChange={(e) => setBranchValue(e.target.value)}
                onBlur={() => {}}
              />
              <Input
                name="limit"
                label={t("personnel.allAdvancesLimit")}
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                value={limitFieldValue}
                onChange={(e) => setLimitInput(e.target.value)}
              />
            </>
          ) : null}
        </div>
        {!personnelPortal ? (
          <p className="mt-3 text-xs text-zinc-500">
            {t("personnel.allAdvancesLimitHint")}
          </p>
        ) : null}
      </CollapsibleMobileFilters>

      <Card title={t("personnel.allAdvancesTableTitle")}>
        {isPending && (
          <p className="text-sm text-zinc-500" aria-busy="true">
            {t("common.loading")}
          </p>
        )}
        {isError && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto sm:self-start"
              onClick={() => refetch()}
            >
              {t("common.retry")}
            </Button>
          </div>
        )}
        {!isPending && !isError && data.length === 0 && (
          <p className="text-sm text-zinc-500">{t("personnel.allAdvancesEmpty")}</p>
        )}
        {!isPending && !isError && data.length > 0 && (
          <ResponsiveTableFrame
            mobileProps={{ "aria-label": t("personnel.allAdvancesTableTitle") }}
            mobile={data.map((row) => (
              <AdvanceCard key={row.id} row={row} locale={locale} t={t} />
            ))}
            desktop={
              <DataTable
                columns={advanceColumns}
                rows={data}
                getRowKey={(row) => row.id}
                tableClassName="min-w-[56rem]"
              />
            }
          />
        )}
      </Card>

      {!personnelPortal ? (
        <AdvancePersonnelModal
          open={advanceOpen}
          onClose={() => setAdvanceOpen(false)}
          personnel={activePersonnel}
        />
      ) : null}
    </div>
  );
}
