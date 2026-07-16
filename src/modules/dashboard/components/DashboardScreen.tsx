"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  canConsumeBranchStock,
  canSeeBranchFinancials,
  canSeeUiModule,
  PERM,
} from "@/lib/auth/permissions";
import { isPersonnelPortalRole, postLoginHomePath } from "@/lib/auth/roles";
import { AddTransactionModal } from "@/shared/components/transactions/AddTransactionModal";
import { ConsumptionQuickEntryModal } from "@/modules/branch/components/ConsumptionQuickEntryModal";
import { GeneralReceiptModal } from "@/modules/order-account-statement/components/GeneralReceiptModal";
import type { Locale } from "@/i18n/messages";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { QuickOpsSheet, type QuickOpItem } from "@/modules/dashboard/components/overview/QuickOpsSheet";
import { useDashboardFinancialCards } from "@/modules/dashboard/hooks/useDashboardFinancialCards";
import { FinancialIncomeCard } from "@/modules/dashboard/components/overview/FinancialIncomeCard";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  WarehouseListDepoInModal,
  WarehouseListTransferModal,
} from "@/modules/warehouse/components/WarehouseListQuickModals";
import { ContractorEntryDialog } from "@/modules/contractors/components/ContractorEntryDialog";
import { useContractors } from "@/modules/contractors/hooks/useContractorQueries";
import { DashCard } from "@/modules/dashboard/components/overview/DashCard";
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
/** Finansal maske: gizliyken para değerleri bunun yerine gösterilir. */
const MONEY_MASK = "••••••";

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
  const canContractors = canSeeUiModule(user, PERM.uiContractors);
  const mayConsumeStock = canConsumeBranchStock(user);

  const today = useTodayBranchesSummary(
    { kind: "day", date: todayIso },
    allowed && canBranches && showFinancials
  );
  const overview = useDashboardOverview(allowed);
  const finCards = useDashboardFinancialCards(
    allowed && canBranches && showFinancials
  );

  // Finansal değerler omuz-üstü bakışa karşı varsayılan GİZLİ; her yüklemede
  // tekrar gizlenir (kalıcı değil). Bu bir sunum maskesi — gerçek gizlilik için
  // backend yetki kontrolü gerekir, veri yine de istemciye geliyor.
  const [amountsHidden, setAmountsHidden] = useState(true);
  // Depo özeti: kalem (ürün kartı) bazlı mı, ana ürün bazlı mı gösterilsin.
  const [stockView, setStockView] = useState<"item" | "main">("item");
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
  const [quickOpsOpen, setQuickOpsOpen] = useState(false);
  const [depoInPickerOpen, setDepoInPickerOpen] = useState(false);
  const [depoInTarget, setDepoInTarget] = useState<{ id: number; name: string } | null>(null);
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ id: number; name: string } | null>(null);
  const [contractorEntry, setContractorEntry] = useState<{ mode: "work" | "payment" } | null>(null);
  const [stockConsumePickerOpen, setStockConsumePickerOpen] = useState(false);
  const [stockConsumeBranchId, setStockConsumeBranchId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

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
      activePersonnel.map((p) => {
        const titleKey = p.jobTitle
          ? `personnel.jobTitles.${p.jobTitle}`
          : null;
        const translated = titleKey ? t(titleKey) : "";
        const sub =
          translated && translated !== titleKey
            ? translated
            : (p.jobTitle ?? undefined);
        return {
          id: p.id,
          label: p.fullName,
          sub,
        };
      }),
    [activePersonnel, t]
  );

  const quickOpsItems: QuickOpItem[] = useMemo(() => {
    const out: QuickOpItem[] = [];
    if (canBranches || canDailyRegister) {
      out.push({
        key: "endOfDay",
        label: t("dashboard.ovActionEndOfDay"),
        tone: "emerald",
        group: "register",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        ),
        onClick: () => setDayEndPickerOpen(true),
      });
    }
    if (canBranches) {
      out.push({
        key: "branchExpense",
        label: t("dashboard.ovActionBranchExpense"),
        tone: "rose",
        group: "register",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M5 21V9l7-5 7 5v12M9 12h6M9 16h6" />
          </svg>
        ),
        onClick: () => setBranchExpensePickerOpen(true),
      });
      out.push({
        key: "receipt",
        label: t("branch.ledgerAddGeneralReceipt"),
        tone: "emerald",
        group: "register",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        ),
        onClick: () => setReceiptOpen(true),
      });
    }
    if (mayConsumeStock) {
      out.push({
        key: "stockConsume",
        label: t("branchStockConsumption.actionQuickConsume"),
        tone: "blue",
        group: "supply",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9 12 4l9 5v10H3z" />
            <path d="M8 12h8" />
          </svg>
        ),
        onClick: () => setStockConsumePickerOpen(true),
      });
    }
    if (canPersonnel) {
      out.push({
        key: "advance",
        label: t("dashboard.ovActionGiveAdvance"),
        tone: "amber",
        group: "personnel",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 10v.01M18 14v.01" />
          </svg>
        ),
        onClick: () => setAdvanceOpen(true),
      });
      out.push({
        key: "personnelExpense",
        label: t("dashboard.ovActionPersonnelExpense"),
        tone: "violet",
        group: "personnel",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        ),
        onClick: () => setPersExpensePickerOpen(true),
      });
    }
    if (canSuppliers) {
      out.push({
        key: "supplierInvoice",
        label: t("dashboard.ovActionSupplierInvoice"),
        tone: "sky",
        group: "supply",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
        ),
        onClick: () => setSupplierPickerOpen(true),
      });
    }
    if (canWarehouse) {
      out.push({
        key: "depoIn",
        label: t("warehouse.actionDepoProductIn"),
        tone: "blue",
        group: "supply",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9 12 4l9 5v10H3z" />
            <path d="M12 4v8M8 12h8" />
          </svg>
        ),
        onClick: () => setDepoInPickerOpen(true),
      });
      out.push({
        key: "branchTransfer",
        label: t("warehouse.actionBranchProductOut"),
        tone: "violet",
        group: "supply",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h13M11 6l6 6-6 6" />
            <path d="M19 4v16" />
          </svg>
        ),
        onClick: () => setTransferPickerOpen(true),
      });
    }
    if (canContractors) {
      out.push({
        key: "contractorWork",
        label: t("dashboard.ovActionContractorWork"),
        tone: "rose",
        group: "personnel",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4h6l1 3h3v13H5V7h3z" />
            <path d="M9 12h6M9 16h6" />
          </svg>
        ),
        onClick: () => setContractorEntry({ mode: "work" }),
      });
      out.push({
        key: "contractorPayment",
        label: t("dashboard.ovActionContractorPayment"),
        tone: "emerald",
        group: "personnel",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 10v.01M18 14v.01" />
          </svg>
        ),
        onClick: () => setContractorEntry({ mode: "payment" }),
      });
    }
    return out;
  }, [canBranches, canDailyRegister, canPersonnel, canSuppliers, canWarehouse, canContractors, mayConsumeStock, t]);

  const contractorsQ = useContractors(false);
  const activeContractors = useMemo(
    () =>
      (contractorsQ.data ?? []).map((c) => ({
        id: c.id,
        displayName: c.displayName,
      })),
    [contractorsQ.data]
  );

  const warehousesQ = useWarehousesList();
  const warehousesData = warehousesQ.data ?? [];
  const warehouseOptions = useMemo(
    () =>
      warehousesData.map((w) => ({
        id: w.id,
        label: w.name,
      })),
    [warehousesData]
  );

  const branchesQ = useBranchesList(
    canBranches &&
      (dayEndPickerOpen ||
        dayEndBranchId != null ||
        branchExpensePickerOpen ||
        branchExpenseBranchId != null ||
        receiptOpen ||
        stockConsumePickerOpen ||
        stockConsumeBranchId != null)
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


  const fmtMoney = (n: number | null | undefined, currency?: string) =>
    amountsHidden
      ? MONEY_MASK
      : n == null || Number.isNaN(n)
        ? DASH
        : formatLocaleAmount(n, locale, currency);
  const fmtNum = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? DASH : new Intl.NumberFormat(locale).format(n);

  if (!allowed) return null;

  return (
    <>
    <PageScreenScaffold
      variant="dashboard"
      collapseIntroOnMobile={false}
      className="w-full pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pb-8 sm:pt-5"
      intro={
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <span className="min-w-0">{t("dashboard.title")}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={!amountsHidden}
                  title={amountsHidden ? t("dashboard.amountsShow") : t("dashboard.amountsHide")}
                  aria-label={amountsHidden ? t("dashboard.amountsShow") : t("dashboard.amountsHide")}
                  onClick={() => setAmountsHidden((v) => !v)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    amountsHidden
                      ? "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                      : "border-blue-100 bg-blue-50/70 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {amountsHidden ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
                <StoryCallout
                  title={t("dashboard.ovStoryTitle")}
                  text={t("dashboard.ovStoryText")}
                />
              </span>
            </span>
          }
          description={t("dashboard.subtitle")}
          actions={
            today.state.kind === "error" || overview.isError ? (
              <div className="flex w-full items-center gap-2">
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
              </div>
            ) : undefined
          }
        />
      }
      main={
        <div className="min-w-0 w-full space-y-5 sm:space-y-6">
          <section aria-labelledby="dash-pulse" className="space-y-3">
            <header className="flex items-start gap-3">
              <span
                aria-hidden
                className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-blue-100"
              >
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-50">
                  <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h4l2-7 4 14 2-7h6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="dash-pulse"
                  className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
                >
                  {t("dashboard.ovSectionPulseTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  {t("dashboard.ovSectionPulseHint")}
                </p>
              </div>
            </header>
          <KpiStrip
            items={[
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
              canPersonnel
                ? {
                    label: t("dashboard.ovPulseAdvanceCount"),
                    value: fmtNum(ov?.financeExtras.advanceRecordCount),
                    sub: t("dashboard.ovPulseAdvanceCountSub"),
                    href: "/personnel/advances",
                  }
                : null,
            ].filter(Boolean) as KpiItem[]}
          />
          </section>

          {quickOpsItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuickOpsOpen(true)}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 px-4 py-3.5 text-left text-white shadow-lg shadow-blue-600/20 ring-1 ring-blue-700/20 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 active:scale-[0.99] sm:px-5 sm:py-4"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 transition group-hover:rotate-90 group-hover:bg-white/20"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-medium uppercase tracking-wider text-blue-100/90">
                  {t("dashboard.ovQuickOpsHint")}
                </span>
                <span className="truncate text-base font-semibold leading-tight sm:text-lg">
                  {t("dashboard.ovQuickOpsTitle")}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          ) : null}

          <section aria-labelledby="dash-finance" className="space-y-3">
            <header className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 ring-1 ring-emerald-100"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="dash-finance"
                  className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
                >
                  {t("dashboard.ovSectionFinanceTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  {t("dashboard.ovSectionFinanceHint")}
                </p>
              </div>
            </header>
          {showFinancials && canBranches ? (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 xl:grid-cols-5">
              <FinancialIncomeCard
                compact
                accent="slate"
                title={t("dashboard.ovFinTotalIncome")}
                description={t("dashboard.ovFinTotalIncomeDesc")}
                bucket={finCards.lifetime}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
                fmtMoney={fmtMoney}
                t={t}
              />
              <FinancialIncomeCard
                compact
                accent="sky"
                title={t("dashboard.ovFinSeasonIncome")}
                description={t("dashboard.ovFinSeasonIncomeDesc")}
                bucket={finCards.season}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
                fmtMoney={fmtMoney}
                t={t}
              />
              <FinancialIncomeCard
                compact
                accent="indigo"
                title={t("dashboard.ovFinMonthIncome")}
                description={t("dashboard.ovFinMonthIncomeDesc")}
                bucket={finCards.month}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
                fmtMoney={fmtMoney}
                t={t}
              />
              <FinancialIncomeCard
                compact
                accent="violet"
                title={t("dashboard.ovFinWeekIncome")}
                description={t("dashboard.ovFinWeekIncomeDesc")}
                bucket={finCards.week}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
                fmtMoney={fmtMoney}
                t={t}
              />
              <FinancialIncomeCard
                compact
                accent="emerald"
                title={t("dashboard.ovFinDailyIncome")}
                description={t("dashboard.ovFinDailyIncomeDesc")}
                bucket={finCards.today}
                href={canReportsFinancial ? "/reports/financial" : "/branches"}
                detailLabel={t("dashboard.ovDetail")}
                fmtMoney={fmtMoney}
                t={t}
              />
            </div>
          ) : null}

          {showFinancials ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DashCard
                title={t("dashboard.ovCardCashFlowTitle")}
                description={t("dashboard.ovCardCashFlowDesc")}
                href="/personnel/costs"
                detailLabel={t("dashboard.ovDetail")}
              >
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full bg-amber-500"
                      />
                      {t("dashboard.ovCashFlowToPatron")}
                    </dt>
                    <dd className="tabular-nums text-sm font-semibold text-zinc-900">
                      {fmtMoney(
                        finCards.cashFlow.toPatron,
                        finCards.cashFlow.currency
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full bg-violet-500"
                      />
                      {t("dashboard.ovCashFlowToPersonnel")}
                    </dt>
                    <dd className="tabular-nums text-sm font-semibold text-zinc-900">
                      {fmtMoney(
                        finCards.cashFlow.toPersonnel,
                        finCards.cashFlow.currency
                      )}
                    </dd>
                  </div>
                  {(() => {
                    const heldRow =
                      ov?.financeExtras.registerCashHeldByPersonnelTotalsByCurrency.find(
                        (c) =>
                          c.currencyCode.toUpperCase() ===
                          finCards.cashFlow.currency.toUpperCase()
                      ) ??
                      ov?.financeExtras
                        .registerCashHeldByPersonnelTotalsByCurrency[0];
                    const available = heldRow?.totalAmount ?? 0;
                    const spent = Math.max(
                      0,
                      finCards.cashFlow.toPersonnel - available
                    );
                    const currency = heldRow?.currencyCode ?? finCards.cashFlow.currency;
                    return (
                      <>
                        <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                          <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span
                              aria-hidden
                              className="inline-block h-2 w-2 rounded-full bg-rose-500"
                            />
                            {t("dashboard.ovCashFlowSpent")}
                          </dt>
                          <dd className="tabular-nums text-sm font-semibold text-rose-600">
                            {fmtMoney(spent, currency)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span
                              aria-hidden
                              className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                            />
                            {t("dashboard.ovCashFlowAvailable")}
                          </dt>
                          <dd className="tabular-nums text-sm font-semibold text-emerald-700">
                            {fmtMoney(available, currency)}
                          </dd>
                        </div>
                      </>
                    );
                  })()}
                </dl>
              </DashCard>
            </div>
          ) : null}
          </section>

          {canPersonnel || (showFinancials && canBranches) ? (
          <section aria-labelledby="dash-personnel" className="space-y-3">
            <header className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 ring-1 ring-indigo-100"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="dash-personnel"
                  className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
                >
                  {t("dashboard.ovSectionPersonnelTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  {t("dashboard.ovSectionPersonnelHint")}
                </p>
              </div>
            </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showFinancials && canBranches ? (
              <DashCard
                title={t("dashboard.ovFinPersonnelCost")}
                description={t("dashboard.ovFinPersonnelCostDesc")}
                href="/personnel/costs"
                detailLabel={t("dashboard.ovDetail")}
              >
                <dl className="space-y-1.5 text-xs text-zinc-700">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500">
                      {t("dashboard.ovFinTotalAdvance")}
                    </dt>
                    <dd className="tabular-nums font-medium text-zinc-900">
                      {fmtMoney(finCards.lifetime.totalAdvanceGiven)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-500">
                      {t("dashboard.ovFinTotalSalary")}
                    </dt>
                    <dd className="tabular-nums font-medium text-zinc-900">
                      {fmtMoney(finCards.lifetime.totalSalaryPaid)}
                    </dd>
                  </div>
                </dl>
              </DashCard>
            ) : null}

            {canPersonnel ? (
              <DashCard
                title={t("dashboard.ovCardPersonnelTitle")}
                description={t("dashboard.ovCardPersonnelDesc")}
                href="/personnel/costs"
                detailLabel={t("dashboard.ovDetail")}
              >
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
          </div>
          </section>
          ) : null}

          <section aria-labelledby="dash-operations" className="space-y-3">
            <header className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-amber-100"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="dash-operations"
                  className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
                >
                  {t("dashboard.ovSectionOperationsTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  {t("dashboard.ovSectionOperationsHint")}
                </p>
              </div>
            </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {(() => {
                  const stock = ov?.operations.warehouseStock;
                  const rows =
                    stockView === "main"
                      ? stock?.topByMainProduct
                      : stock?.topByQuantity;
                  const pick = (mode: "item" | "main") => (e: React.MouseEvent) => {
                    // Kart bir <Link>; navigasyonu engelle.
                    e.preventDefault();
                    e.stopPropagation();
                    setStockView(mode);
                  };
                  const segBtn = (mode: "item" | "main", label: string) => (
                    <button
                      type="button"
                      onClick={pick(mode)}
                      aria-pressed={stockView === mode}
                      className={
                        "rounded-md px-2 py-0.5 text-[11px] font-medium transition " +
                        (stockView === mode
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                          : "text-zinc-500 hover:text-zinc-800")
                      }
                    >
                      {label}
                    </button>
                  );
                  return (
                    <>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-zinc-500">
                          {t("dashboard.ovTopStock")}
                        </p>
                        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
                          {segBtn("item", t("dashboard.ovStockByItem"))}
                          {segBtn("main", t("dashboard.ovStockByMainProduct"))}
                        </div>
                      </div>
                      {rows?.length ? (
                        <ul className="space-y-1 text-xs text-zinc-700">
                          {rows.slice(0, 3).map((row) => (
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
                      ) : (
                        <p className="text-xs text-zinc-400">{t("dashboard.ovTopStockEmpty")}</p>
                      )}
                    </>
                  );
                })()}
              </DashCard>
            ) : null}
          </div>
          </section>
        </div>
      }
    />

    <QuickOpsSheet
      open={quickOpsOpen}
      onClose={() => setQuickOpsOpen(false)}
      title={t("dashboard.ovQuickOpsTitle")}
      description={t("dashboard.ovQuickOpsHint")}
      items={quickOpsItems}
    />

    {canWarehouse ? (
      <>
        <QuickPickerModal
          open={depoInPickerOpen}
          onClose={() => setDepoInPickerOpen(false)}
          title={t("warehouse.actionDepoProductIn")}
          description="Ürün girişi yapacağınız depoyu seçin"
          options={warehouseOptions}
          loading={warehousesQ.isPending}
          onPick={(id) => {
            const w = warehousesData.find((x) => x.id === id);
            if (!w) return;
            setDepoInPickerOpen(false);
            setDepoInTarget({ id: w.id, name: w.name });
          }}
        />
        <WarehouseListDepoInModal
          target={depoInTarget}
          onClose={() => setDepoInTarget(null)}
        />
        <QuickPickerModal
          open={transferPickerOpen}
          onClose={() => setTransferPickerOpen(false)}
          title={t("warehouse.actionBranchProductOut")}
          description="Sevkiyat yapacağınız kaynak depoyu seçin"
          options={warehouseOptions}
          loading={warehousesQ.isPending}
          onPick={(id) => {
            const w = warehousesData.find((x) => x.id === id);
            if (!w) return;
            setTransferPickerOpen(false);
            setTransferTarget({ id: w.id, name: w.name });
          }}
        />
        <WarehouseListTransferModal
          target={transferTarget}
          onClose={() => setTransferTarget(null)}
        />
      </>
    ) : null}

    {canContractors ? (
      <ContractorEntryDialog
        open={contractorEntry != null}
        mode={contractorEntry?.mode ?? "work"}
        contractorId={null}
        contractors={activeContractors}
        onClose={() => setContractorEntry(null)}
      />
    ) : null}

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
          description="Masraf eklemek için bir personel seçin"
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
          description="Gün sonunu kapatacağınız şubeyi seçin"
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
          description="Gideri ekleyeceğiniz şubeyi seçin"
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

    {canBranches ? (
      <GeneralReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        counterparty={{
          mode: "selectable",
          options: branchOptions.map((o) => ({
            counterpartyType: "branch",
            counterpartyId: o.id,
            name: o.label,
          })),
        }}
        locale={locale as Locale}
        t={t}
      />
    ) : null}

    {mayConsumeStock ? (
      <>
        <QuickPickerModal
          open={stockConsumePickerOpen}
          onClose={() => setStockConsumePickerOpen(false)}
          title={t("branchStockConsumption.actionQuickConsume")}
          description="Hızlı kullanım gireceğiniz şubeyi seçin"
          options={branchOptions}
          loading={branchesQ.isPending}
          onPick={(id) => {
            setStockConsumePickerOpen(false);
            setStockConsumeBranchId(id);
          }}
        />
        {stockConsumeBranchId != null ? (
          <ConsumptionQuickEntryModal
            open
            branchId={stockConsumeBranchId}
            mode="consume"
            onClose={() => setStockConsumeBranchId(null)}
          />
        ) : null}
      </>
    ) : null}
    </>
  );
}
