"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";
import {
  personnelYearClosurePdfDownloadUrl,
  personnelYearClosurePdfViewUrl,
} from "@/modules/personnel/api/personnel-account-closure-api";
import { AddTransactionModal } from "@/shared/components/transactions/AddTransactionModal";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import {
  fetchBranchPersonnelMoneySummaries,
} from "@/modules/branch/api/branches-api";
import {
  expensePaymentSourceLabelShort,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { PersonnelSalaryHistoryView } from "@/modules/personnel/components/PersonnelSalaryHistoryView";
import { PersonnelAdvanceCard } from "@/modules/personnel/components/PersonnelAdvanceCard";
import { PersonnelExpenseCard } from "@/modules/personnel/components/PersonnelExpenseCard";
import { PersonnelCostsSummaryCards } from "@/modules/personnel/components/PersonnelCostsSummaryCards";
import { PersonnelCostsPagination } from "@/modules/personnel/components/PersonnelCostsPagination";
import { PersonnelCostsToolbar } from "@/modules/personnel/components/PersonnelCostsToolbar";
import { PersonnelCostsFiltersDrawer } from "@/modules/personnel/components/PersonnelCostsFiltersDrawer";
import { PersonnelCostsActionsDrawer } from "@/modules/personnel/components/PersonnelCostsActionsDrawer";
import { PersonnelCostsListSeasonModal } from "@/modules/personnel/components/PersonnelCostsListSeasonModal";
import { PersonnelCostsPdfScopeModal } from "@/modules/personnel/components/PersonnelCostsPdfScopeModal";
import { PersonnelDetailInsuranceTab } from "@/modules/personnel/components/PersonnelDetailInsuranceTab";
import { PersonnelDetailYearClosuresTab } from "@/modules/personnel/components/PersonnelDetailYearClosuresTab";
import { PersonnelDetailProfileTab } from "@/modules/personnel/components/PersonnelDetailProfileTab";
import { PersonnelDetailCostsTab } from "@/modules/personnel/components/PersonnelDetailCostsTab";
import { PersonnelDetailRolesTab } from "@/modules/personnel/components/PersonnelDetailRolesTab";
import {
  usePersonnelDetailCostsState,
  type PersonnelCostsCombinedRow,
} from "@/modules/personnel/hooks/usePersonnelDetailCostsState";
import {
  AdvanceHeldRegisterSourceMeta,
  ExpenseHeldRegisterSourceMeta,
} from "@/modules/personnel/components/PersonnelHeldRegisterSourceMeta";
import {
  formatYearClosureSalarySummary,
  YearClosureReportLinks,
} from "@/modules/personnel/components/YearClosureReportLinks";
import {
  NationalIdPreviewImg,
  nationalIdFileExt,
} from "@/modules/personnel/components/NationalIdPreviewImg";
import {
  formatAdvanceDay,
  sourceAbbrev,
} from "@/modules/personnel/lib/advance-formatters";
import {
  formatHireDate,
  formatOptionalIso,
  formatSalary,
} from "@/modules/personnel/lib/personnel-formatters";
import { AddPersonnelInsurancePeriodModal } from "@/modules/personnel/components/AddPersonnelInsurancePeriodModal";
import { EditPersonnelInsurancePeriodModal } from "@/modules/personnel/components/EditPersonnelInsurancePeriodModal";
import { PersonnelAccountClosureSheet } from "@/modules/personnel/components/PersonnelAccountClosureSheet";
import { PersonnelHeldRegisterPersonLink } from "@/modules/personnel/components/PersonnelHeldRegisterPersonLink";
import { PersonnelManagementSnapshotSection } from "@/modules/personnel/components/PersonnelManagementSnapshotSection";
import {
  PersonnelPocketClaimToPatronDialog,
  PersonnelPocketClaimToStaffDialog,
} from "@/modules/personnel/components/PersonnelPocketClaimDialogs";
import {
  PersonnelHandoverPatronTransferDialog,
  type PersonnelHandoverPatronTransferOpen,
} from "@/modules/personnel/components/PersonnelHandoverPatronTransferDialog";
import { PersonnelNotesTab } from "@/modules/personnel/components/PersonnelNotesTab";
import { PersonnelSeasonArrivalsTab } from "@/modules/personnel/components/PersonnelSeasonArrivalsTab";
import {
  personnelNationalIdPhotoUrl,
  personnelProfilePhotoUrl,
} from "@/modules/personnel/api/personnel-api";
import { PersonnelProfilePhotoAvatar } from "@/modules/personnel/components/PersonnelProfilePhotoAvatar";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  defaultPersonnelListFilters,
  usePersonnelEmploymentTerms,
  usePersonnelInsurancePeriods,
  usePersonnelList,
  usePersonnelManagementSnapshot,
  usePersonnelYearAccountClosures,
  useReopenPersonnelYearAccount,
  personnelKeys,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { usePersonnelCostRowMutations } from "@/modules/personnel/hooks/usePersonnelCostRowMutations";
import { usePersonnelWarehouseAssignment } from "@/modules/personnel/hooks/usePersonnelWarehouseAssignment";
import { usePersonnelInsuranceMutations } from "@/modules/personnel/hooks/usePersonnelInsuranceMutations";
import { usePersonnelSettlementPrint } from "@/modules/personnel/hooks/usePersonnelSettlementPrint";
import { PersonnelDetailTabBar } from "@/modules/personnel/components/PersonnelDetailTabBar";
import type { Advance } from "@/types/advance";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel, PersonnelInsurancePeriod } from "@/types/personnel";
import type {
  PersonnelEmploymentTerm,
  PersonnelYearAccountClosureListItem,
} from "@/types/personnel-account-closure";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { parseSettlementSeasonYearChoice } from "@/modules/personnel/lib/settlement-print-season";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import {
  CalendarCheckIcon,
  detailOpenIconButtonClass,
  PencilIcon,
} from "@/shared/ui/EyeIcon";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatchMedia } from "@/shared/lib/use-match-media";
import { useBranchDetailOverlayOptional } from "@/shared/branch-detail";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { localIsoDate } from "@/shared/lib/local-iso-date";

const TITLE_ID = "personnel-detail-modal-title";

type PersonnelOrgBranchTxOpen =
  | { kind: "personnel-expense" }
  | {
      kind: "pocket-repay";
      branchId: number;
      currency: string;
      paymentSource: "REGISTER" | "PATRON";
    }
  | {
      kind: "handover-pool-expense-register";
      branchId: number;
      currencyCode: string;
      suggestedAmount: number;
    };

export type PersonnelDetailTabId =
  | "profile"
  /** Yönetici özeti (maaş/avans/kasa devri anlatımı). */
  | "managerSummary"
  /** Kasada personele devredilen fiziksel nakit, havuz ve devir işlemleri. */
  | "personnelCashPhysical"
  | "insurance"
  /** Turizm sezonu geliş tarihleri (istihdam dönemleri). */
  | "seasonArrivals"
  /** Avans listesi + personele yazılmış gider satırları (tek sekme). */
  | "costs"
  /** Takvim yılı hesap kesimi (kapanış) kayıtları. */
  | "yearClosures"
  /** Geriye dönük maaş geçmişi (kayıtlı maaş dönemleri + sezon bazında hak ediş). */
  | "salaryHistory"
  | "notes"
  | "roles";

type TabId = PersonnelDetailTabId;
type CombinedCostsRow = PersonnelCostsCombinedRow;


function expenseSourceLabel(t: (k: string) => string, source: string | null | undefined, dash: string): string {
  const label = expensePaymentSourceLabelShort(source, t);
  return label || dash;
}



type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  branchNameById: Map<number, string>;
  /** Açılışta seçilecek sekme (varsayılan: profile). */
  initialTab?: PersonnelDetailTabId;
  /** Costs sekmesinde işaretlenecek avans id (reconciliation drill-down'dan gelir). */
  focusAdvanceId?: number | null;
  /** Costs sekmesinde işaretlenecek gider transaction id. */
  focusExpenseTransactionId?: number | null;
  /** Kasa nakit (cash physical) sekmesinde işaretlenecek handover/outflow transaction id. */
  focusCashTransactionId?: number | null;
};

export function PersonnelDetailModal({
  open,
  onClose,
  personnel,
  branchNameById,
  initialTab = "profile",
  focusAdvanceId = null,
  focusExpenseTransactionId = null,
  focusCashTransactionId = null,
}: Props) {
  const { t, locale } = useI18n();
  const branchOverlay = useBranchDetailOverlayOptional();
  const queryClient = useQueryClient();
  const dash = t("personnel.dash");
  const [tab, setTab] = useState<TabId>("profile");
  /** Avans + gider tabloları — PDF’den bağımsız sezon/turizm yılı filtresi. */
  const [accountClosureOpen, setAccountClosureOpen] = useState(false);
  /** true: «Kesilen hesaplar»dan açıldı — doğrudan yıl özeti (2. adım). */
  const [accountClosureYearSummary, setAccountClosureYearSummary] =
    useState(false);
  const isNarrow = useMatchMedia("(max-width: 767px)");
  const [orgBranchTx, setOrgBranchTx] = useState<PersonnelOrgBranchTxOpen | null>(
    null,
  );
  const [patronHandoverTransferCtx, setPatronHandoverTransferCtx] =
    useState<PersonnelHandoverPatronTransferOpen | null>(null);
  const [pocketClaimTransferCtx, setPocketClaimTransferCtx] = useState<
    null | { kind: "patron" | "staff"; branchId: number; currency: string }
  >(null);
  const [detailAdvanceOpen, setDetailAdvanceOpen] = useState(false);
  const [insuranceAddOpen, setInsuranceAddOpen] = useState(false);
  const [insuranceEditPeriod, setInsuranceEditPeriod] =
    useState<PersonnelInsurancePeriod | null>(null);
  const photoViewNonce = 0;
  const insurancePid = personnel?.id ?? 0;
  const { data: insurancePeriods = [], isPending: insurancePeriodsPending } =
    usePersonnelInsurancePeriods(
      insurancePid,
      open && insurancePid > 0 && tab === "insurance",
    );
  const insuranceMutations = usePersonnelInsuranceMutations({
    personnel,
    onAfterDelete: (row) => {
      if (insuranceEditPeriod?.id === row.id) {
        setInsuranceEditPeriod(null);
      }
    },
    t,
  });

  const pid = personnel?.id ?? 0;
  const { user: authUser } = useAuth();
  const isSystemAdmin = hasPermissionCode(authUser, PERM.systemAdmin);

  const costsState = usePersonnelDetailCostsState({
    open,
    personnel,
    focusAdvanceId,
    focusExpenseTransactionId,
    branchNameById,
    isSystemAdmin,
    isNarrow,
    t,
    locale,
    isCostsTab: tab === "costs",
  });
  const {
    costsListSeason, setCostsListSeason,
    pdfScopeSeason, setPdfScopeSeason,
    branchFilter, setBranchFilter,
    sourceFilter, setSourceFilter,
    advPage, setAdvPage,
    advPageSize, setAdvPageSize,
    advPageSizeVal,
    costsPdfScopeModalOpen, setCostsPdfScopeModalOpen,
    costsListSeasonModalOpen, setCostsListSeasonModalOpen,
    pdfScopeDraft, setPdfScopeDraft,
    costsListSeasonDraft, setCostsListSeasonDraft,
    costsPdfModalTitleId,
    costsListSeasonModalTitleId,
    costsFiltersDrawerOpen, setCostsFiltersDrawerOpen,
    costsActionsDrawerOpen, setCostsActionsDrawerOpen,
    showDeletedAdvances, setShowDeletedAdvances,
    deletingCostRows,
    highlightCostKey,
    focusCostKey,
    filteredAdvances,
    combinedCostsRows,
    costsSlice,
    costsAdvanceTotal,
    costsExpenseTotal,
    costsCombinedTotal,
    costsSummaryCurrency,
    advTotalPages,
    advSafePage,
    branchOptions,
    sourceOptions,
    pageSizeSelectOptions,
    seasonScopeSelectOptions,
    advFiltersActive,
    costsListSeasonFilterYear,
    advLoading, advError, advErr,
    attrExpLoading, attrExpError, attrExpErr,
    attributedExpenses,
  } = costsState;

  const labelPersonnelFilters = useMemo(
    () => ({
      ...defaultPersonnelListFilters,
      status: "active" as const,
      page: 1,
      pageSize: 500,
    }),
    [],
  );
  const { data: labelPersonnelList } = usePersonnelList(labelPersonnelFilters, open);
  const personnelById = useMemo(() => {
    const m = new Map<number, Personnel>();
    for (const p of labelPersonnelList?.items ?? []) {
      m.set(p.id, p);
    }
    return m;
  }, [labelPersonnelList]);

  const {
    data: mgmtSnap,
    isPending: mgmtSnapLoading,
    isError: mgmtSnapError,
    error: mgmtSnapErr,
  } = usePersonnelManagementSnapshot(
    open && pid > 0 ? pid : null,
    open &&
      pid > 0 &&
      (tab === "costs" ||
        tab === "managerSummary" ||
        tab === "personnelCashPhysical" ||
        tab === "roles"),
  );

  const branchIdsForPocketMoney = useMemo(() => {
    if (!personnel || personnel.isDeleted) return [];
    const ids = new Set<number>();
    if (personnel.branchId != null && personnel.branchId > 0) {
      ids.add(personnel.branchId);
    }
    for (const raw of mgmtSnap?.linkedBranchIds ?? []) {
      const id = typeof raw === "number" ? raw : parseInt(String(raw), 10);
      if (Number.isFinite(id) && id > 0) ids.add(id);
    }
    return [...ids];
  }, [personnel, mgmtSnap?.linkedBranchIds]);

  const pocketMoneyQueries = useQueries({
    queries: branchIdsForPocketMoney.map((branchId) => ({
      queryKey: branchKeys.personnelMoney(branchId),
      queryFn: () => fetchBranchPersonnelMoneySummaries(branchId),
      enabled: open && pid > 0 && !personnel?.isDeleted,
    })),
  });

  const pocketMoneyActionsByBranch = useMemo(() => {
    const out: { branchId: number; row: BranchPersonnelMoneySummaryItem }[] = [];
    for (let i = 0; i < branchIdsForPocketMoney.length; i++) {
      const branchId = branchIdsForPocketMoney[i]!;
      const q = pocketMoneyQueries[i];
      const rows = q?.data;
      if (!rows) continue;
      const row = rows.find((r) => r.personnelId === pid) ?? null;
      if (
        !row ||
        row.pocketMixedCurrencies ||
        !(row.netRegisterOwesPocket > 0.009)
      ) {
        continue;
      }
      out.push({ branchId, row });
    }
    return out;
  }, [branchIdsForPocketMoney, pocketMoneyQueries, pid]);

  const pocketMoneyQueriesPending = pocketMoneyQueries.some((q) => q.isPending);

  const reopenYearMut = useReopenPersonnelYearAccount(pid);
  const costRowMutations = usePersonnelCostRowMutations({
    personnel,
    isSystemAdmin,
    markRowDeleting: costsState.markCostRowDeleting,
    unmarkRowDeleting: costsState.unmarkCostRowDeleting,
    t,
  });
  const {
    data: yearClosures = [],
    isPending: yearClosuresLoading,
    isError: yearClosuresError,
    error: yearClosuresErr,
  } = usePersonnelYearAccountClosures(
    pid,
    open && pid > 0 && (tab === "yearClosures" || tab === "salaryHistory"),
  );
  const {
    data: employmentTerms = [],
    isPending: employmentTermsLoading,
    isError: employmentTermsError,
    error: employmentTermsErr,
  } = usePersonnelEmploymentTerms(
    pid,
    open && pid > 0 && tab === "salaryHistory",
  );

  const orderedLinkedBranchIds = useMemo(() => {
    const raw = mgmtSnap?.linkedBranchIds ?? [];
    const bid = personnel?.branchId;
    if (bid != null && bid > 0 && raw.includes(bid)) {
      const rest = raw.filter((id) => id !== bid).sort((a, b) => a - b);
      return [bid, ...rest];
    }
    return [...raw].sort((a, b) => a - b);
  }, [mgmtSnap?.linkedBranchIds, personnel?.branchId]);

  const warehouseAssignment = usePersonnelWarehouseAssignment({
    personnel,
    enabled: tab === "roles",
    open,
    locale,
    t,
  });
  const {
    rolesSearch,
    setRolesSearch,
    debouncedRolesSearch,
    assignWarehouseId,
    setAssignWarehouseId,
    assignRole,
    setAssignRole,
    warehouseAssignOptions,
    roleAssignOptions,
    warehouseRoles,
    whLoading,
    assignBusy,
    runAssignWarehouse,
    reset: resetWarehouseAssignment,
  } = warehouseAssignment;

  // Modal yeniden açıldığında costs-dışı state'leri sıfırla + ilk sekmeyi seç.
  // (Costs ile ilgili reset'ler usePersonnelDetailCostsState içindedir.)
  useEffect(() => {
    if (!open || !personnel) return;
    setTab(
      focusCostKey
        ? "costs"
        : focusCashTransactionId && focusCashTransactionId > 0
          ? "personnelCashPhysical"
          : initialTab,
    );
    resetWarehouseAssignment();
    setDetailAdvanceOpen(false);
  }, [
    open,
    personnel?.id,
    initialTab,
    focusCostKey,
    focusCashTransactionId,
    resetWarehouseAssignment,
  ]);

  const openCostsRowDetail = useCallback(
    (row: CombinedCostsRow) => {
      if (row.kind === "expense") {
        const bid = row.tx.branchId;
        const day = row.tx.transactionDate?.slice(0, 10) ?? "";
        if (branchOverlay && bid != null && bid > 0 && day.length === 10) {
          branchOverlay.openBranchDetail(bid, {
            initialTab: "expenses",
            initialRegisterDay: day,
          });
          return;
        }
      }
      if (row.kind === "advance") {
        const bid = row.advance.branchId;
        const day = row.advance.advanceDate?.slice(0, 10) ?? "";
        if (branchOverlay && bid != null && bid > 0 && day.length === 10) {
          branchOverlay.openBranchDetail(bid, {
            initialTab: "expenses",
            initialRegisterDay: day,
          });
          return;
        }
      }
      setTab("costs");
    },
    [branchOverlay]
  );

  const settlementPrint = usePersonnelSettlementPrint({
    personnel,
    branchNameById,
    locale,
    t,
  });
  const printBusy = settlementPrint.busy;
  const runSettlementPrint = settlementPrint.runPrint;

  const title = personnel
    ? personnelDisplayName(personnel)
    : t("personnel.detailTitle");

  return (
    <>
      <Modal
        open={open && personnel != null}
        onClose={onClose}
        titleId={TITLE_ID}
        title={title}
        description={
          personnel?.isDeleted
            ? t("personnel.detailSubtitlePassive")
            : undefined
        }
        closeButtonLabel={t("common.close")}
        wide
        wideFixedHeight
        wideExpanded
        backdropClassName="max-sm:items-stretch max-sm:p-0 max-sm:pt-0 max-sm:pb-0"
        className="!p-0 max-sm:!h-[100dvh] max-sm:!max-h-[100dvh] max-sm:!w-screen max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-x-0 max-sm:!border-b-0"
      >
        {!personnel ? null : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 [-webkit-overflow-scrolling:touch] sm:px-6">
              <PersonnelDetailTabBar tab={tab} onTabChange={setTab} t={t} />

              {tab !== "profile" && personnel.isDeleted ? (
                <div className="-mx-4 mb-3 flex flex-wrap items-center gap-2 px-4 sm:-mx-6 sm:px-6">
                  <StatusBadge tone="inactive">{t("personnel.badgePassive")}</StatusBadge>
                </div>
              ) : null}

              <div className="mb-3">
                {tab === "profile" ? (
                  <PersonnelDetailProfileTab
                    personnel={personnel}
                    branchNameById={branchNameById}
                    photoViewNonce={photoViewNonce}
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                ) : tab === "managerSummary" ? (
                  <div className="w-full min-w-0 space-y-3 pb-2">
                    <PersonnelManagementSnapshotSection
                      viewMode="manager"
                      personnel={personnel}
                      open={open}
                      branchNameById={branchNameById}
                      onOpenCostsDetail={() => setTab("costs")}
                      onHandoverOpenExpenseRegister={(ctx) =>
                        setOrgBranchTx({
                          kind: "handover-pool-expense-register",
                          branchId: ctx.branchId,
                          currencyCode: ctx.currencyCode,
                          suggestedAmount: ctx.suggestedAmount,
                        })
                      }
                      onHandoverOpenPatronRegisterRepay={(ctx) => {
                        if (personnel == null || personnel.isDeleted) return;
                        setPatronHandoverTransferCtx({
                          personnel,
                          branchId: ctx.branchId,
                          branchName: branchNameById.get(ctx.branchId),
                          currencyCode: ctx.currencyCode,
                          suggestedAmount: ctx.suggestedAmount,
                          branchOptions: ctx.branchOptions,
                        });
                      }}
                    />
                  </div>
                ) : tab === "personnelCashPhysical" ? (
                  <div className="w-full min-w-0 space-y-3 pb-2">
                    <PersonnelManagementSnapshotSection
                      viewMode="cashPhysicalHandover"
                      personnel={personnel}
                      open={open}
                      branchNameById={branchNameById}
                      focusTransactionId={focusCashTransactionId}
                      onOpenCostsDetail={() => setTab("costs")}
                      onHandoverOpenExpenseRegister={(ctx) =>
                        setOrgBranchTx({
                          kind: "handover-pool-expense-register",
                          branchId: ctx.branchId,
                          currencyCode: ctx.currencyCode,
                          suggestedAmount: ctx.suggestedAmount,
                        })
                      }
                      onHandoverOpenPatronRegisterRepay={(ctx) => {
                        if (personnel == null || personnel.isDeleted) return;
                        setPatronHandoverTransferCtx({
                          personnel,
                          branchId: ctx.branchId,
                          branchName: branchNameById.get(ctx.branchId),
                          currencyCode: ctx.currencyCode,
                          suggestedAmount: ctx.suggestedAmount,
                          branchOptions: ctx.branchOptions,
                        });
                      }}
                    />
                  </div>
                ) : tab === "insurance" ? (
                  <PersonnelDetailInsuranceTab
                    personnel={personnel}
                    insurancePeriods={insurancePeriods}
                    insurancePeriodsPending={insurancePeriodsPending}
                    onAddPeriod={() => setInsuranceAddOpen(true)}
                    onEditPeriod={(row) => setInsuranceEditPeriod(row)}
                    onDeletePeriod={insuranceMutations.askDeletePeriod}
                    deletePending={insuranceMutations.deletePending}
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                ) : tab === "seasonArrivals" ? (
                  <PersonnelSeasonArrivalsTab
                    personnelId={personnel.id}
                    active={tab === "seasonArrivals"}
                    readOnly={personnel.isDeleted}
                    branchNameById={branchNameById}
                  />
                ) : tab === "costs" ? (
                  <PersonnelDetailCostsTab
                    personnel={personnel}
                    branchNameById={branchNameById}
                    personnelById={personnelById}
                    isSystemAdmin={isSystemAdmin}
                    state={costsState}
                    pocketMoneyQueriesPending={pocketMoneyQueriesPending}
                    pocketMoneyActionsByBranch={pocketMoneyActionsByBranch}
                    onPocketRepay={(args) =>
                      setOrgBranchTx({ kind: "pocket-repay", ...args })
                    }
                    onPocketClaimTransfer={(args) =>
                      setPocketClaimTransferCtx(args)
                    }
                    onOpenRowDetail={openCostsRowDetail}
                    onConfirmDeleteAdvance={costRowMutations.confirmDeleteAdvance}
                    onConfirmRestoreAdvance={costRowMutations.confirmRestoreAdvance}
                    onConfirmHardDeleteAdvance={
                      costRowMutations.confirmHardDeleteAdvance
                    }
                    onConfirmDeleteExpenseTx={costRowMutations.confirmDeleteExpenseTx}
                    busyDeleteAdvance={costRowMutations.busyDeleteAdvance}
                    busyRestoreAdvance={costRowMutations.busyRestoreAdvance}
                    busyHardDeleteAdvance={costRowMutations.busyHardDeleteAdvance}
                    busyDeleteExpenseTx={costRowMutations.busyDeleteExpenseTx}
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                ) : tab === "yearClosures" ? (
                  <PersonnelDetailYearClosuresTab
                    personnel={personnel}
                    yearClosures={yearClosures}
                    yearClosuresLoading={yearClosuresLoading}
                    yearClosuresError={yearClosuresError}
                    yearClosuresErr={yearClosuresErr}
                    onOpenAccountClosure={() => {
                      setAccountClosureYearSummary(true);
                      setAccountClosureOpen(true);
                    }}
                    onReopenYear={(closureYear) => {
                      notifyConfirmToast({
                        toastId: `personnel-year-reopen-${personnel.id}-${closureYear}`,
                        title: t("personnel.yearClosuresReopenConfirmTitle"),
                        message: t(
                          "personnel.yearClosuresReopenConfirmMessage",
                        ).replace("{year}", String(closureYear)),
                        cancelLabel: t("common.cancel"),
                        confirmLabel: t("personnel.yearClosuresReopenConfirm"),
                        onConfirm: async () => {
                          try {
                            await reopenYearMut.mutateAsync(closureYear);
                            notify.success(
                              t("personnel.yearClosuresReopenSuccess"),
                            );
                          } catch (e) {
                            notify.error(toErrorMessage(e));
                          }
                        },
                      });
                    }}
                    isReopenPendingForYear={(closureYear) =>
                      reopenYearMut.isPending &&
                      reopenYearMut.variables === closureYear
                    }
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                ) : tab === "salaryHistory" ? (
                  <PersonnelSalaryHistoryView
                    currentSalary={personnel.salary}
                    currencyCode={personnel.currencyCode}
                    terms={employmentTerms}
                    termsLoading={employmentTermsLoading}
                    termsError={employmentTermsError}
                    termsErr={employmentTermsErr}
                    closures={yearClosures}
                    closuresLoading={yearClosuresLoading}
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                ) : tab === "notes" ? (
                  <PersonnelNotesTab
                    personnelId={personnel.id}
                    active={tab === "notes"}
                    readOnly={personnel.isDeleted}
                  />
                ) : (
                  <PersonnelDetailRolesTab
                    personnel={personnel}
                    branchNameById={branchNameById}
                    orderedLinkedBranchIds={orderedLinkedBranchIds}
                    mgmtSnapLoading={mgmtSnapLoading}
                    mgmtSnapError={mgmtSnapError}
                    mgmtSnapErr={mgmtSnapErr}
                    warehouseAssignOptions={warehouseAssignOptions}
                    roleAssignOptions={roleAssignOptions}
                    assignWarehouseId={assignWarehouseId}
                    onAssignWarehouseIdChange={setAssignWarehouseId}
                    assignRole={assignRole}
                    onAssignRoleChange={setAssignRole}
                    whLoading={whLoading}
                    assignBusy={assignBusy}
                    onApplyAssignment={() => void runAssignWarehouse()}
                    rolesSearch={rolesSearch}
                    onRolesSearchChange={setRolesSearch}
                    debouncedRolesSearch={debouncedRolesSearch}
                    warehouseRoles={warehouseRoles}
                    t={t}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <PersonnelHandoverPatronTransferDialog
        open={
          patronHandoverTransferCtx != null &&
          personnel != null &&
          !personnel.isDeleted
        }
        ctx={patronHandoverTransferCtx}
        onClose={() => {
          const pid = patronHandoverTransferCtx?.personnel.id;
          setPatronHandoverTransferCtx(null);
          if (pid != null) {
            void queryClient.invalidateQueries({
              queryKey: personnelKeys.managementSnapshot(pid),
            });
          }
        }}
      />
      <AddTransactionModal
        open={orgBranchTx != null && personnel != null && !personnel.isDeleted}
        onClose={() => setOrgBranchTx(null)}
        branchId={
          orgBranchTx?.kind === "pocket-repay" ||
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? orgBranchTx.branchId
            : (personnel?.branchId ?? null)
        }
        heldRegisterAggregateBranchIds={branchIdsForPocketMoney}
        defaultLinkedPersonnelId={
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? undefined
            : personnel?.id
        }
        defaultType="OUT"
        defaultTransactionDate={localIsoDate()}
        defaultPocketRepayPersonnelId={
          orgBranchTx?.kind === "pocket-repay" ? personnel?.id : undefined
        }
        defaultPocketRepayCurrencyCode={
          orgBranchTx?.kind === "pocket-repay" ? orgBranchTx.currency : undefined
        }
        defaultExpensePaymentSource={
          orgBranchTx?.kind === "pocket-repay"
            ? orgBranchTx.paymentSource
            : undefined
        }
        defaultHandoverSettleKind={
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? "expense_register"
            : undefined
        }
        defaultHandoverCurrencyCode={
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? orgBranchTx.currencyCode
            : undefined
        }
        defaultHandoverMaxAmount={
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? orgBranchTx.suggestedAmount
            : undefined
        }
        defaultHandoverPoolTotalOnly={
          orgBranchTx?.kind === "handover-pool-expense-register" ? true : undefined
        }
      />
      {personnel != null &&
      !personnel.isDeleted &&
      UI_POCKET_CLAIM_TRANSFER_ENABLED ? (
        <>
          <PersonnelPocketClaimToPatronDialog
            open={pocketClaimTransferCtx?.kind === "patron"}
            onClose={() => setPocketClaimTransferCtx(null)}
            branchId={pocketClaimTransferCtx?.branchId ?? 0}
            fromPersonnelId={personnel.id}
            fromPersonnelDisplayName={personnelDisplayName(personnel)}
            defaultCurrencyCode={
              pocketClaimTransferCtx?.currency ??
              personnel.currencyCode ??
              "TRY"
            }
          />
          <PersonnelPocketClaimToStaffDialog
            open={pocketClaimTransferCtx?.kind === "staff"}
            onClose={() => setPocketClaimTransferCtx(null)}
            branchId={pocketClaimTransferCtx?.branchId ?? 0}
            fromPersonnelId={personnel.id}
            fromPersonnelDisplayName={personnelDisplayName(personnel)}
            defaultCurrencyCode={
              pocketClaimTransferCtx?.currency ??
              personnel.currencyCode ??
              "TRY"
            }
          />
        </>
      ) : null}
      {personnel != null && !personnel.isDeleted ? (
        <AdvancePersonnelModal
          open={detailAdvanceOpen}
          onClose={() => setDetailAdvanceOpen(false)}
          personnel={[personnel]}
          initialPersonnelId={personnel.id}
        />
      ) : null}
      <AddPersonnelInsurancePeriodModal
        open={insuranceAddOpen && insurancePid > 0}
        onClose={() => setInsuranceAddOpen(false)}
        personnelId={insurancePid}
        seasonArrivalDate={personnel?.seasonArrivalDate}
        onNavigateSeasonArrivals={() => {
          setInsuranceAddOpen(false);
          setTab("seasonArrivals");
        }}
        defaultBranchId={personnel?.branchId ?? null}
        personnelDisplayName={
          personnel ? personnelDisplayName(personnel) : undefined
        }
      />
      <EditPersonnelInsurancePeriodModal
        open={insuranceEditPeriod != null && insurancePid > 0}
        onClose={() => setInsuranceEditPeriod(null)}
        personnelId={insurancePid}
        period={insuranceEditPeriod}
        personnelDisplayName={
          personnel ? personnelDisplayName(personnel) : undefined
        }
      />
      {personnel ? (
        <PersonnelAccountClosureSheet
          open={accountClosureOpen}
          onClose={() => {
            setAccountClosureOpen(false);
            setAccountClosureYearSummary(false);
          }}
          personnelId={personnel.id}
          personnelDisplayName={personnelDisplayName(personnel)}
          canCloseYear={!personnel.isDeleted}
          startWithYearSummary={accountClosureYearSummary}
          branchNameById={branchNameById}
          personnelSeasonArrivalDate={personnel.seasonArrivalDate}
          personnelMonthlySalary={personnel.salary}
          personnelSalaryCurrency={personnel.currencyCode}
          nested
        />
      ) : null}
      <PersonnelCostsPdfScopeModal
        open={costsPdfScopeModalOpen}
        onClose={() => setCostsPdfScopeModalOpen(false)}
        titleId={costsPdfModalTitleId}
        value={pdfScopeDraft}
        onChange={setPdfScopeDraft}
        onSubmit={(v) => {
          setPdfScopeSeason(v);
          setCostsPdfScopeModalOpen(false);
          void runSettlementPrint(v);
        }}
        busy={printBusy}
        seasonScopeOptions={seasonScopeSelectOptions}
        t={t}
      />
      <PersonnelCostsListSeasonModal
        open={costsListSeasonModalOpen}
        onClose={() => setCostsListSeasonModalOpen(false)}
        titleId={costsListSeasonModalTitleId}
        value={costsListSeasonDraft}
        onChange={setCostsListSeasonDraft}
        onApply={(v) => {
          setCostsListSeason(v);
          setCostsListSeasonModalOpen(false);
        }}
        seasonScopeOptions={seasonScopeSelectOptions}
        t={t}
      />
      <PersonnelCostsFiltersDrawer
        open={costsFiltersDrawerOpen}
        onClose={() => setCostsFiltersDrawerOpen(false)}
        branchOptions={branchOptions}
        sourceOptions={sourceOptions}
        pageSizeOptions={pageSizeSelectOptions}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        pageSizeValue={advPageSizeVal}
        onPageSizeChange={setAdvPageSize}
        isSystemAdmin={isSystemAdmin}
        showDeletedAdvances={showDeletedAdvances}
        onShowDeletedAdvancesChange={setShowDeletedAdvances}
        t={t}
      />
      <PersonnelCostsActionsDrawer
        open={costsActionsDrawerOpen}
        onClose={() => setCostsActionsDrawerOpen(false)}
        printBusy={printBusy}
        personnelIsDeleted={personnel?.isDeleted ?? false}
        canCreateForPersonnel={personnel != null && !personnel.isDeleted}
        onOpenAccountClosure={() => {
          setCostsActionsDrawerOpen(false);
          setAccountClosureYearSummary(false);
          setAccountClosureOpen(true);
        }}
        onOpenPrint={() => {
          setCostsActionsDrawerOpen(false);
          setPdfScopeDraft(pdfScopeSeason);
          setCostsPdfScopeModalOpen(true);
        }}
        onOpenSeasonFilter={() => {
          setCostsActionsDrawerOpen(false);
          setCostsListSeasonDraft(costsListSeason);
          setCostsListSeasonModalOpen(true);
        }}
        onOpenGiveAdvance={() => {
          setCostsActionsDrawerOpen(false);
          setDetailAdvanceOpen(true);
        }}
        onOpenAddExpense={() => {
          setCostsActionsDrawerOpen(false);
          setOrgBranchTx({ kind: "personnel-expense" });
        }}
        t={t}
      />
    </>
  );
}
