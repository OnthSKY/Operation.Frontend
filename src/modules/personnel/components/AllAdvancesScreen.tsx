"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  useAllAdvancesList,
  defaultPersonnelListFilters,
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { AdvanceListItem } from "@/types/advance";
import { Card } from "@/shared/components/Card";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphAdvance } from "@/shared/ui/ToolbarGlyph";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { DataTable, ResponsiveTableFrame } from "@/shared/tables";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useMatchMedia } from "@/shared/lib/use-match-media";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { AdvanceCard, createAdvanceListColumns } from "./personnel-advance-list-blocks";

export function AllAdvancesScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const myPersonnelId = user?.personnelId;
  const { data: branches = [] } = useBranchesList();
  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    !personnelPortal
  );
  const personnelRaw = personnelListResult?.items ?? [];
  const [yearInput, setYearInput] = useState("");
  const [personnelValue, setPersonnelValue] = useState("");
  const [branchValue, setBranchValue] = useState("");
  /** null = automatic row limit (20 narrow / 500 desktop) */
  const [limitInput, setLimitInput] = useState<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const advancesToolbarMoreItems = useMemo(
    () =>
      !personnelPortal
        ? [
            {
              id: "personnel",
              label: t("personnel.heading"),
              onSelect: () => router.push("/personnel"),
            },
          ]
        : [],
    [personnelPortal, t, router]
  );

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-8"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                {t("personnel.allAdvancesTitle")}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">{t("personnel.allAdvancesDesc")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="personnel"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.allAdvances.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.allAdvances.step1") },
                {
                  text: t("pageHelp.allAdvances.step2"),
                  link: { href: "/personnel", label: t("pageHelp.allAdvances.step2Link") },
                },
              ]}
            />
          </>
        }
        main={
          <>
            <Card
              title={t("personnel.allAdvancesTableTitle")}
              headerActions={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Tooltip content={t("personnel.allAdvancesFilters")} delayMs={200}>
                    <button
                      type="button"
                      className={cn(
                        "relative flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/90 text-zinc-700 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
                        filtersActive && "border-violet-300 bg-violet-50/90 text-violet-900"
                      )}
                      aria-label={t("common.filters")}
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen(true)}
                    >
                      <FilterFunnelIcon className="h-5 w-5" />
                      {filtersActive ? (
                        <span
                          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </Tooltip>
                  {!personnelPortal ? (
                    <>
                      <TableToolbarMoreMenu
                        menuId="all-advances-toolbar-more"
                        items={advancesToolbarMoreItems}
                      />
                      <Tooltip content={t("personnel.advance")} delayMs={200}>
                        <Button
                          type="button"
                          variant="primary"
                          className={TABLE_TOOLBAR_ICON_BTN}
                          onClick={() => setAdvanceOpen(true)}
                          aria-label={t("personnel.advance")}
                        >
                          <ToolbarGlyphAdvance className="h-5 w-5" />
                        </Button>
                      </Tooltip>
                    </>
                  ) : null}
                </div>
              }
            >
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
                tableClassName="w-full min-w-0 lg:min-w-[56rem]"
              />
            }
          />
        )}
            </Card>

            <RightDrawer
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              title={t("personnel.allAdvancesFilters")}
              closeLabel={t("common.close")}
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-1">
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
                  <p className="text-xs text-zinc-500">{t("personnel.allAdvancesLimitHint")}</p>
                ) : null}
              </div>
            </RightDrawer>
          </>
        }
      />

      {!personnelPortal ? (
        <AdvancePersonnelModal
          open={advanceOpen}
          onClose={() => setAdvanceOpen(false)}
          personnel={activePersonnel}
        />
      ) : null}
    </>
  );
}
