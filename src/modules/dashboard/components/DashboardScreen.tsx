"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  canSeeBranchFinancials,
  canSeeUiModule,
  PERM,
} from "@/lib/auth/permissions";
import { isPersonnelPortalRole, postLoginHomePath } from "@/lib/auth/roles";
import { AddTransactionModal } from "@/shared/components/transactions/AddTransactionModal";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { ActionGroup, type ActionItem } from "@/modules/dashboard/components/overview/ActionGroup";
import { DashCard, Stat } from "@/modules/dashboard/components/overview/DashCard";
import { KpiStrip, type KpiItem } from "@/modules/dashboard/components/overview/KpiStrip";
import { QuickPickerModal, type PickerOption } from "@/modules/dashboard/components/overview/QuickPickerModal";
import { StoryCallout } from "@/modules/dashboard/components/overview/StoryCallout";
import { useDashboardOverview } from "@/modules/dashboard/hooks/useDashboardOverview";
import { useTodayBranchesSummary } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { PersonnelCostsExpenseModal } from "@/modules/personnel/components/PersonnelCostsExpenseModal";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { useSuppliers } from "@/modules/suppliers/hooks/useSupplierQueries";
import { PageHeader } from "@/shared/components/PageHeader";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DASH = "—";

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const allowed =
    user != null &&
    !isPersonnelPortalRole(user.role) &&
    canSeeUiModule(user, PERM.uiDashboard);

  useEffect(() => {
    if (!user) return;
    if (isPersonnelPortalRole(user.role)) {
      router.replace("/branches");
      return;
    }
    if (!canSeeUiModule(user, PERM.uiDashboard)) {
      router.replace(postLoginHomePath(user));
    }
  }, [user, router]);

  const todayIso = localIsoDate();
  const showFinancials = canSeeBranchFinancials(user);
  const canBranches = canSeeUiModule(user, PERM.uiBranches);
  const canPersonnel = canSeeUiModule(user, PERM.uiPersonnel);
  const canWarehouse = canSeeUiModule(user, PERM.uiWarehouse);
  const canDailyRegister = canSeeUiModule(user, PERM.uiDailyBranchRegister);
  const canReportsFinancial = canSeeUiModule(user, PERM.uiReportsFinancial);
  const canReports = canSeeUiModule(user, PERM.uiReports) || canReportsFinancial;
  const canSuppliers = canSeeUiModule(user, PERM.uiSuppliers);
  const canVehicles = canSeeUiModule(user, PERM.uiVehicles);

  const today = useTodayBranchesSummary(
    { kind: "day", date: todayIso },
    allowed && canBranches && showFinancials
  );
  const overview = useDashboardOverview(allowed);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [persExpensePickerOpen, setPersExpensePickerOpen] = useState(false);
  const [persExpensePersonnelId, setPersExpensePersonnelId] = useState<
    number | null
  >(null);
  const [dayEndPickerOpen, setDayEndPickerOpen] = useState(false);
  const [dayEndBranchId, setDayEndBranchId] = useState<number | null>(null);
  const [branchExpensePickerOpen, setBranchExpensePickerOpen] = useState(false);
  const [branchExpenseBranchId, setBranchExpenseBranchId] = useState<
    number | null
  >(null);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);

  const personnelListQ = usePersonnelList(
    defaultPersonnelListFilters,
    canPersonnel && (advanceOpen || persExpensePickerOpen)
  );
  const activePersonnel = useMemo(
    () => (personnelListQ.data?.items ?? []).filter((p) => !p.isDeleted),
    [personnelListQ.data]
  );
  const personnelOptions: PickerOption[] = useMemo(
    () =>
      activePersonnel.map((p) => ({
        id: p.id,
        label: p.fullName,
        sub: p.jobTitle ?? undefined,
      })),
    [activePersonnel]
  );

  const branchesQ = useBranchesList(
    canBranches &&
      (dayEndPickerOpen ||
        dayEndBranchId != null ||
        branchExpensePickerOpen ||
        branchExpenseBranchId != null)
  );
  const branchOptions: PickerOption[] = useMemo(
    () =>
      (branchesQ.data ?? []).map((b) => ({
        id: b.id,
        label: b.name,
      })),
    [branchesQ.data]
  );

  const suppliersQ = useSuppliers(
    false,
    allowed && canSuppliers && supplierPickerOpen
  );
  const supplierOptions: PickerOption[] = useMemo(
    () =>
      (suppliersQ.data ?? [])
        .filter((s) => !s.isDeleted)
        .map((s) => ({ id: s.id, label: s.name })),
    [suppliersQ.data]
  );

  const todayState = today.state;
  const todayOk = todayState.kind === "ok" ? todayState : null;
  const ov = overview.data;

  const branchesActiveToday = useMemo(() => {
    if (!todayOk) return null;
    const active = todayOk.branchTodayRows.filter(
      (r) => r.income > 0 || r.totalExpenseOut > 0
    ).length;
    const total = todayOk.branchCount || ov?.operations.activeBranchCount || 0;
    return { active, total };
  }, [todayOk, ov]);

  const topBranchesByIncome = useMemo(() => {
    if (!todayOk) return [];
    return [...todayOk.branchTodayRows]
      .sort((a, b) => b.income - a.income)
      .slice(0, 3);
  }, [todayOk]);

  const fmtMoney = (n: number | null | undefined, currency?: string) =>
    n == null || Number.isNaN(n)
      ? DASH
      : formatLocaleAmount(n, locale, currency);
  const fmtNum = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? DASH : new Intl.NumberFormat(locale).format(n);

  const advanceFirst = ov?.financeExtras.advanceTotalsByCurrency?.[0];

  if (!allowed) return null;

  return (
    <>
    <PageScreenScaffold
      variant="dashboard"
      className="w-full pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 sm:pb-8 sm:pt-5"
      intro={
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.subtitle")}
          actions={
            today.state.kind === "error" || overview.isError ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => {
                  void today.refetch();
                  void overview.refetch();
                }}
              >
                {t("common.retry")}
              </Button>
            ) : null
          }
        />
      }
      main={
        <div className="min-w-0 w-full space-y-5 sm:space-y-6">
          <KpiStrip
            items={[
              showFinancials && canBranches
                ? {
                    label: t("dashboard.ovTodayCash"),
                    value: fmtMoney(todayOk?.totalIncomeCash ?? null),
                    sub:
                      todayOk == null
                        ? ""
                        : fmtMoney(todayOk.netCash) +
                          " · " +
                          t("dashboard.ovTodayNet"),
                    href: "/branches",
                  }
                : null,
              canBranches
                ? {
                    label: t("dashboard.ovActiveBranches"),
                    value: fmtNum(ov?.operations.activeBranchCount),
                    sub: branchesActiveToday
                      ? fillDashboardTemplate(
                          t("dashboard.ovBranchesActiveToday"),
                          {
                            active: String(branchesActiveToday.active),
                            total: String(branchesActiveToday.total),
                          }
                        )
                      : "",
                    href: "/branches",
                  }
                : null,
              canPersonnel
                ? {
                    label: t("dashboard.ovActivePersonnel"),
                    value: fmtNum(ov?.personnel.activePersonnelCount),
                    sub: "",
                    href: "/personnel",
                  }
                : null,
              showFinancials
                ? {
                    label: t("dashboard.ovLifetimeNet"),
                    value: fmtMoney(
                      ov?.financeExtras.allBranchesLifetimeEconomicNet ?? null
                    ),
                    sub: "",
                    href: canReportsFinancial
                      ? "/reports/financial/trend"
                      : "/reports/financial",
                  }
                : null,
              canPersonnel
                ? {
                    label: t("dashboard.ovAdvanceOpen"),
                    value: advanceFirst
                      ? fmtMoney(advanceFirst.totalAmount, advanceFirst.currencyCode)
                      : DASH,
                    sub: advanceFirst
                      ? fmtNum(ov?.financeExtras.advanceRecordCount) +
                        " " +
                        t("dashboard.ovAdvanceOpen").toLocaleLowerCase(locale)
                      : "",
                    href: "/personnel/advances",
                  }
                : null,
            ].filter(Boolean) as KpiItem[]}
          />

          <StoryCallout
            title={t("dashboard.ovStoryTitle")}
            text={t("dashboard.ovStoryText")}
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            <ActionGroup
              title={t("dashboard.ovQuickOpsTitle")}
              hint={t("dashboard.ovQuickOpsHint")}
              tone="primary"
              items={[
                canBranches || canDailyRegister
                  ? {
                      label: t("dashboard.ovActionEndOfDay"),
                      onClick: () => setDayEndPickerOpen(true),
                    }
                  : null,
                canBranches
                  ? {
                      label: t("dashboard.ovActionBranchExpense"),
                      onClick: () => setBranchExpensePickerOpen(true),
                    }
                  : null,
                canPersonnel
                  ? {
                      label: t("dashboard.ovActionGiveAdvance"),
                      onClick: () => setAdvanceOpen(true),
                    }
                  : null,
                canPersonnel
                  ? {
                      label: t("dashboard.ovActionPersonnelExpense"),
                      onClick: () => setPersExpensePickerOpen(true),
                    }
                  : null,
                canSuppliers
                  ? {
                      label: t("dashboard.ovActionSupplierInvoice"),
                      onClick: () => setSupplierPickerOpen(true),
                    }
                  : null,
              ].filter(Boolean) as ActionItem[]}
            />
            <ActionGroup
              title={t("dashboard.ovQuickScreensTitle")}
              hint={t("dashboard.ovQuickScreensHint")}
              tone="neutral"
              items={[
                canBranches
                  ? { href: "/branches", label: t("dashboard.ovScreenBranches") }
                  : null,
                canPersonnel
                  ? {
                      href: "/personnel",
                      label: t("dashboard.ovScreenPersonnel"),
                    }
                  : null,
                canReports
                  ? {
                      href: canReportsFinancial
                        ? "/reports/financial"
                        : "/reports",
                      label: t("dashboard.ovScreenReports"),
                    }
                  : null,
                canWarehouse
                  ? {
                      href: "/warehouses",
                      label: t("dashboard.ovScreenWarehouse"),
                    }
                  : null,
                canSuppliers
                  ? {
                      href: "/suppliers",
                      label: t("dashboard.ovScreenSuppliers"),
                    }
                  : null,
                canVehicles
                  ? {
                      href: "/vehicles",
                      label: t("dashboard.ovScreenVehicles"),
                    }
                  : null,
              ].filter(Boolean) as { href: string; label: string }[]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {canBranches ? (
              <DashCard
                title={t("dashboard.ovCardBranchesTitle")}
                description={t("dashboard.ovCardBranchesDesc")}
                href="/branches"
                detailLabel={t("dashboard.ovDetail")}
              >
                <Stat
                  label={t("dashboard.ovActiveBranches")}
                  value={fmtNum(ov?.operations.activeBranchCount)}
                />
                {branchesActiveToday ? (
                  <p className="text-xs text-zinc-500">
                    {fillDashboardTemplate(
                      t("dashboard.ovBranchesActiveToday"),
                      {
                        active: String(branchesActiveToday.active),
                        total: String(branchesActiveToday.total),
                      }
                    )}
                  </p>
                ) : null}
                {showFinancials && topBranchesByIncome.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-zinc-700">
                    {topBranchesByIncome.map((r) => (
                      <li
                        key={r.branchId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{r.branchName}</span>
                        <span className="tabular-nums text-zinc-900">
                          {fmtMoney(r.income)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </DashCard>
            ) : null}

            {canPersonnel ? (
              <DashCard
                title={t("dashboard.ovCardPersonnelTitle")}
                description={t("dashboard.ovCardPersonnelDesc")}
                href="/personnel/costs"
                detailLabel={t("dashboard.ovDetail")}
              >
                <Stat
                  label={t("dashboard.ovActivePersonnel")}
                  value={fmtNum(ov?.personnel.activePersonnelCount)}
                />
                {ov?.personnel.longestTenure ? (
                  <p className="text-xs text-zinc-600">
                    <span className="text-zinc-500">
                      {t("dashboard.ovLongestTenure")}:{" "}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {ov.personnel.longestTenure.fullName}
                    </span>{" "}
                    <span className="text-zinc-500">
                      ·{" "}
                      {fillDashboardTemplate(t("dashboard.ovYearsMonths"), {
                        y: String(ov.personnel.longestTenure.tenureYears),
                        m: String(
                          ov.personnel.longestTenure.tenureMonthsRemainder
                        ),
                      })}
                    </span>
                  </p>
                ) : null}
                {ov?.personnel.topAdvanceRecipient ? (
                  <p className="text-xs text-zinc-600">
                    <span className="text-zinc-500">
                      {t("dashboard.ovTopAdvance")}:{" "}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {ov.personnel.topAdvanceRecipient.fullName}
                    </span>{" "}
                    <span className="tabular-nums text-zinc-900">
                      ·{" "}
                      {fmtMoney(
                        ov.personnel.topAdvanceRecipient.totalAmount,
                        ov.personnel.topAdvanceRecipient.currencyCode
                      )}
                    </span>
                  </p>
                ) : null}
              </DashCard>
            ) : null}

            {showFinancials ? (
              <DashCard
                title={t("dashboard.ovCardFinanceTitle")}
                description={t("dashboard.ovCardFinanceDesc")}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
              >
                <Stat
                  label={t("dashboard.ovLifetimeNet")}
                  value={fmtMoney(
                    ov?.financeExtras.allBranchesLifetimeEconomicNet ?? null
                  )}
                />
                {todayOk ? (
                  <>
                    <Stat
                      label={t("dashboard.ovTodayCash")}
                      value={fmtMoney(todayOk.totalIncomeCash)}
                      compact
                    />
                    <Stat
                      label={t("dashboard.ovTodayNet")}
                      value={fmtMoney(todayOk.netCash)}
                      compact
                    />
                  </>
                ) : null}
              </DashCard>
            ) : null}

            <DashCard
              title={t("dashboard.ovCardOpsTitle")}
              description={t("dashboard.ovCardOpsDesc")}
              href={canBranches ? "/branches" : "/products"}
              detailLabel={t("dashboard.ovDetail")}
            >
              <ul className="grid grid-cols-2 gap-2 text-xs text-zinc-700">
                <li>
                  {fillDashboardTemplate(t("dashboard.ovBranchesCount"), {
                    n: fmtNum(ov?.operations.activeBranchCount),
                  })}
                </li>
                <li>
                  {fillDashboardTemplate(t("dashboard.ovWarehousesCount"), {
                    n: fmtNum(ov?.operations.activeWarehouseCount),
                  })}
                </li>
                <li>
                  {fillDashboardTemplate(t("dashboard.ovSuppliersCount"), {
                    n: fmtNum(ov?.operations.activeSupplierCount),
                  })}
                </li>
                <li>
                  {fillDashboardTemplate(t("dashboard.ovVehiclesCount"), {
                    n: fmtNum(ov?.operations.activeVehicleCount),
                  })}
                </li>
                <li>
                  {fillDashboardTemplate(t("dashboard.ovProductsCount"), {
                    n: fmtNum(ov?.operations.activeProductCount),
                  })}
                </li>
              </ul>
            </DashCard>

            {canWarehouse ? (
              <DashCard
                title={t("dashboard.ovCardWarehouseTitle")}
                description={t("dashboard.ovCardWarehouseDesc")}
                href="/warehouses"
                detailLabel={t("dashboard.ovDetail")}
              >
                <p className="text-xs text-zinc-600">
                  {fillDashboardTemplate(t("dashboard.ovDistinctProducts"), {
                    n: fmtNum(
                      ov?.operations.warehouseStock.distinctProductCount
                    ),
                  })}
                </p>
                {ov?.operations.warehouseStock.topByQuantity?.length ? (
                  <>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      {t("dashboard.ovTopStock")}
                    </p>
                    <ul className="space-y-1 text-xs text-zinc-700">
                      {ov.operations.warehouseStock.topByQuantity
                        .slice(0, 3)
                        .map((row) => (
                          <li
                            key={row.productId}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{row.productName}</span>
                            <span className="tabular-nums text-zinc-900">
                              {fmtNum(row.quantity)}
                              {row.unit ? ` ${row.unit}` : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </DashCard>
            ) : null}

            {showFinancials &&
            ov?.financeExtras.registerCashHeldByPersonnelTotalsByCurrency
              ?.length ? (
              <DashCard
                title={t("dashboard.ovCardCashHeldTitle")}
                description={t("dashboard.ovCardCashHeldDesc")}
                href="/personnel/costs"
                detailLabel={t("dashboard.ovDetail")}
              >
                <ul className="space-y-1 text-xs text-zinc-700">
                  {ov.financeExtras.registerCashHeldByPersonnelTotalsByCurrency.map(
                    (row) => (
                      <li
                        key={row.currencyCode}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-zinc-500">{row.currencyCode}</span>
                        <span className="tabular-nums text-zinc-900">
                          {fmtMoney(row.totalAmount, row.currencyCode)}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </DashCard>
            ) : null}
          </div>
        </div>
      }
    />

    {canPersonnel ? (
      <AdvancePersonnelModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        personnel={activePersonnel}
      />
    ) : null}

    {canPersonnel ? (
      <>
        <QuickPickerModal
          open={persExpensePickerOpen}
          onClose={() => setPersExpensePickerOpen(false)}
          title={t("dashboard.ovActionPersonnelExpense")}
          options={personnelOptions}
          loading={personnelListQ.isPending}
          onPick={(id) => {
            setPersExpensePickerOpen(false);
            setPersExpensePersonnelId(id);
          }}
        />
        {persExpensePersonnelId != null ? (
          <PersonnelCostsExpenseModal
            open={true}
            onClose={() => setPersExpensePersonnelId(null)}
            defaultLinkedPersonnelId={persExpensePersonnelId}
          />
        ) : null}
      </>
    ) : null}

    {canBranches ? (
      <>
        <QuickPickerModal
          open={dayEndPickerOpen}
          onClose={() => setDayEndPickerOpen(false)}
          title={t("dashboard.ovActionEndOfDay")}
          options={branchOptions}
          loading={branchesQ.isPending}
          onPick={(id) => {
            setDayEndPickerOpen(false);
            setDayEndBranchId(id);
          }}
        />
        {dayEndBranchId != null ? (
          <AddTransactionModal
            open={true}
            onClose={() => setDayEndBranchId(null)}
            branchId={dayEndBranchId}
            defaultType="IN"
            defaultMainCategory="IN_DAY_CLOSE"
          />
        ) : null}
        <QuickPickerModal
          open={branchExpensePickerOpen}
          onClose={() => setBranchExpensePickerOpen(false)}
          title={t("dashboard.ovActionBranchExpense")}
          options={branchOptions}
          loading={branchesQ.isPending}
          onPick={(id) => {
            setBranchExpensePickerOpen(false);
            setBranchExpenseBranchId(id);
          }}
        />
        {branchExpenseBranchId != null ? (
          <AddTransactionModal
            open={true}
            onClose={() => setBranchExpenseBranchId(null)}
            branchId={branchExpenseBranchId}
            defaultType="OUT"
          />
        ) : null}
      </>
    ) : null}

    {canSuppliers ? (
      <QuickPickerModal
        open={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        title={t("dashboard.ovActionSupplierInvoice")}
        options={supplierOptions}
        loading={suppliersQ.isPending}
        onPick={(id) => {
          setSupplierPickerOpen(false);
          router.push(`/suppliers/invoices?newInvoice=1&supplierId=${id}`);
        }}
      />
    ) : null}
    </>
  );
}
