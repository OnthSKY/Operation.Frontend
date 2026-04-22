"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { fetchPersonnel } from "@/modules/personnel/api/personnel-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  defaultPersonnelListFilters,
  personnelKeys,
  usePersonnelList,
  useSoftDeletePersonnel,
  type PersonnelListFilters,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { notify } from "@/shared/lib/notify";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { EyeIcon, detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import type { Personnel, PersonnelJobTitle } from "@/types/personnel";
import { ToolbarGlyphUserPlus } from "@/shared/ui/ToolbarGlyph";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PersonnelCostsExpenseModal } from "@/modules/personnel/components/PersonnelCostsExpenseModal";
import {
  PersonnelPocketClaimToPatronDialog,
  PersonnelPocketClaimToStaffDialog,
} from "@/modules/personnel/components/PersonnelPocketClaimDialogs";
import { PersonnelCashHandoverToPatronDialog } from "@/modules/personnel/components/PersonnelCashHandoverToPatronDialog";
import {
  PersonnelHandoverPatronTransferDialog,
  type PersonnelHandoverPatronTransferOpen,
} from "@/modules/personnel/components/PersonnelHandoverPatronTransferDialog";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "@/modules/branch/components/BranchQuickActionsMenu";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { CreatePersonnelSystemUserModal } from "./CreatePersonnelSystemUserModal";
import { PersonnelAdvanceHistory } from "./PersonnelAdvanceHistory";
import { PersonnelListCashHandoverPoolLine } from "./PersonnelListCashHandoverPoolLine";
import { PersonnelSettlementSeasonPickerModal } from "./PersonnelSettlementSeasonPickerModal";
import {
  PersonnelDetailModal,
  type PersonnelDetailTabId,
} from "./PersonnelDetailModal";
import { AddPersonnelInsurancePeriodModal } from "./AddPersonnelInsurancePeriodModal";
import { PersonnelFormModal } from "./PersonnelFormModal";
import { PersonnelProfilePhotoAvatar } from "./PersonnelProfilePhotoAvatar";
import { PersonnelProfilePhotoPreviewModal } from "./PersonnelProfilePhotoPreviewModal";
function formatCompanyHireDate(p: Personnel, dash: string, locale: Locale): string {
  if (!p.hireDate) return dash;
  return formatLocaleDate(p.hireDate, locale, dash);
}

function formatSeasonArrivalDate(
  p: Personnel,
  dash: string,
  locale: Locale
): string {
  if (!p.seasonArrivalDate?.trim()) return dash;
  return formatLocaleDate(p.seasonArrivalDate, locale, dash);
}

function PersonnelListSalaryReveal({
  p,
  locale,
  dash,
  revealed,
  onToggle,
  t,
}: {
  p: Personnel;
  locale: Locale;
  dash: string;
  revealed: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  if (p.salary == null) {
    return (
      <span
        className={cn("tabular-nums", p.isDeleted ? "text-zinc-500" : "text-zinc-600")}
      >
        {dash}
      </span>
    );
  }
  const muted = p.isDeleted ? "text-zinc-500" : "text-zinc-600";
  if (revealed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "max-w-full cursor-pointer text-right font-mono text-sm font-medium tabular-nums underline decoration-zinc-300 decoration-dotted underline-offset-2 transition-colors hover:decoration-zinc-600",
          muted
        )}
        aria-label={t("personnel.salaryHideAria")}
      >
        {formatMoneyDash(p.salary, dash, locale, p.currencyCode)}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "cursor-pointer font-mono text-sm font-semibold tracking-widest underline decoration-zinc-300 decoration-dotted underline-offset-2 transition-colors hover:decoration-zinc-600",
        muted
      )}
      aria-label={t("personnel.salaryRevealAria")}
    >
      ***
    </button>
  );
}

const PERSONNEL_FILTER_TEXT_DEBOUNCE_MS = 300;

const JOB_TITLE_FILTER_VALUES: PersonnelJobTitle[] = [
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
];

function fillPersonnelSummaryTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "—"
  );
}

function hasLinkedSystemUser(p: Personnel): boolean {
  return p.userId != null && p.userId > 0;
}

/** Detay açıkken liste yenilenince (sigorta vb.) aynı personeli güncelle. */
function personnelDetailSyncSig(p: Personnel): string {
  return [
    p.insuranceStarted,
    p.insuranceStartDate ?? "",
    p.insuranceEndDate ?? "",
    p.fullName,
    p.jobTitle,
    p.branchId ?? "",
    p.salary ?? "",
    p.isDeleted,
    p.nationalIdCardGeneration ?? "",
    p.hasNationalIdPhotoFront,
    p.hasNationalIdPhotoBack,
    p.hasProfilePhoto1,
    p.hasProfilePhoto2,
    p.insuranceIntakeStartDate ?? "",
    p.insuranceAccountingNotified,
    (p.yearAccountClosedYears ?? []).join(","),
  ].join("|");
}

function PersonnelInsuranceBadge({
  personnel,
  t,
}: {
  personnel: Personnel;
  t: (key: string) => string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-semibold leading-tight shadow-sm",
        personnel.insuranceStarted
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      )}
    >
      {personnel.insuranceStarted
        ? t("personnel.insuranceBadgeStarted")
        : t("personnel.insuranceBadgePending")}
    </span>
  );
}

function PersonnelYearAccountClosedBadge({
  personnel,
  t,
}: {
  personnel: Personnel;
  t: (key: string) => string;
}) {
  const years = personnel.yearAccountClosedYears ?? [];
  if (years.length === 0) return null;
  const label = years.join(", ");
  return (
    <span
      className="inline-flex min-w-0 max-w-full shrink-0"
      title={t("personnel.listYearAccountClosedTitle").replace("{years}", label)}
    >
      <StatusBadge
        tone="info"
        size="sm"
        className="max-w-full font-medium normal-case tracking-normal"
      >
        <span className="truncate">
          {t("personnel.listYearAccountClosedBadge").replace("{years}", label)}
        </span>
      </StatusBadge>
    </span>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function buildPersonnelRowMenuSections(params: {
  p: Personnel;
  isAdmin: boolean;
  t: (key: string) => string;
  onAdvance: () => void;
  onAddExpense: () => void;
  onPocketClaimToPatron?: () => void;
  onPocketClaimToStaff?: () => void;
  onPersonnelCashHandoverToPatron?: () => void;
  onNotes: () => void;
  onInsuranceIntake: () => void;
  onCreateSystemUser: () => void;
  onPdfSettlement: () => void;
}): QuickActionsMenuSection[] {
  const {
    p,
    isAdmin,
    t,
    onAdvance,
    onAddExpense,
    onPocketClaimToPatron,
    onPocketClaimToStaff,
    onPersonnelCashHandoverToPatron,
    onNotes,
    onInsuranceIntake,
    onCreateSystemUser,
    onPdfSettlement,
  } = params;
  const sections: QuickActionsMenuSection[] = [];
  if (!p.isDeleted && isAdmin && !hasLinkedSystemUser(p)) {
    sections.push({
      storyTitle: t("personnel.quickMenuStoryAccess"),
      items: [
        {
          id: "systemUser",
          label: t("personnel.createSystemUserTitle"),
          onSelect: onCreateSystemUser,
        },
      ],
    });
  }
  if (!p.isDeleted) {
    const moneyItems: QuickActionsMenuSection["items"] = [
      { id: "advance", label: t("personnel.advance"), onSelect: onAdvance },
      {
        id: "expense",
        label: t("personnel.cardQuickAddPersonnelExpense"),
        onSelect: onAddExpense,
      },
      {
        id: "notes",
        label: t("personnel.cardQuickNotes"),
        onSelect: onNotes,
      },
    ];
    sections.push({
      storyTitle: t("personnel.quickMenuStoryMoney"),
      items: moneyItems,
    });
    if (onPersonnelCashHandoverToPatron) {
      sections.push({
        storyTitle: t("personnel.quickMenuStoryHandoverPool"),
        items: [
          {
            id: "personnelCashHandoverToPatron",
            label: t("personnel.listMenuHandoverPatronPool"),
            onSelect: onPersonnelCashHandoverToPatron,
          },
        ],
      });
    }
    if (
      onPocketClaimToPatron &&
      onPocketClaimToStaff &&
      p.branchId != null &&
      p.branchId > 0
    ) {
      sections.push({
        storyTitle: t("personnel.quickMenuStoryPocketClaimNoCash"),
        items: [
          {
            id: "pocketClaimToPatron",
            label: t("personnel.listMenuPocketClaimToPatron"),
            onSelect: onPocketClaimToPatron,
          },
          {
            id: "pocketClaimToStaff",
            label: t("personnel.listMenuPocketClaimToStaff"),
            onSelect: onPocketClaimToStaff,
          },
        ],
      });
    }
    sections.push({
      storyTitle: t("personnel.quickMenuStoryInsurance"),
      items: [
        {
          id: "insuranceIntake",
          label: t("personnel.quickMenuInsuranceIntake"),
          onSelect: onInsuranceIntake,
        },
      ],
    });
  }
  sections.push({
    storyTitle: t("personnel.quickMenuStoryReports"),
    items: [
      {
        id: "pdfSettlement",
        label: t("personnel.rowMenuPdfSettlement"),
        onSelect: onPdfSettlement,
      },
    ],
  });
  return sections.filter((s) => s.items.length > 0);
}

function PersonnelRowActionsToolbar({
  p,
  isAdmin,
  menuId,
  compact,
  onView,
  onEdit,
  onDeactivate,
  onAdvance,
  onAddExpense,
  onPocketClaimToPatron,
  onPocketClaimToStaff,
  onPersonnelCashHandoverToPatron,
  onNotes,
  onInsuranceIntake,
  onCreateSystemUser,
  onPdfSettlement,
  viewLabel,
  editLabel,
  deactivateLabel,
  t,
}: {
  p: Personnel;
  isAdmin: boolean;
  menuId: string;
  compact?: boolean;
  onView?: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onAdvance: () => void;
  onAddExpense: () => void;
  onPocketClaimToPatron?: () => void;
  onPocketClaimToStaff?: () => void;
  onPersonnelCashHandoverToPatron?: () => void;
  onNotes: () => void;
  onInsuranceIntake: () => void;
  onCreateSystemUser: () => void;
  onPdfSettlement: () => void;
  viewLabel?: string;
  editLabel: string;
  deactivateLabel: string;
  t: (key: string) => string;
}) {
  const menuSections = buildPersonnelRowMenuSections({
    p,
    isAdmin,
    t,
    onAdvance,
    onAddExpense,
    onPocketClaimToPatron,
    onPocketClaimToStaff,
    onPersonnelCashHandoverToPatron,
    onNotes,
    onInsuranceIntake,
    onCreateSystemUser,
    onPdfSettlement,
  });

  return (
    <div
      className={cn(
        "inline-flex shrink-0 flex-nowrap items-center justify-end gap-1",
        compact && "flex-wrap"
      )}
    >
      {menuSections.length > 0 ? (
        <BranchQuickActionsMenu
          menuId={menuId}
          triggerLabel={t("personnel.cardQuickActionsAria")}
          compact={compact}
          sections={menuSections}
        />
      ) : null}
      <Tooltip content={editLabel} delayMs={200}>
        <Button
          type="button"
          variant="secondary"
          className={cn(detailOpenIconButtonClass, compact && "min-h-11 min-w-11")}
          aria-label={editLabel}
          title={editLabel}
          onClick={onEdit}
        >
          <PencilIcon />
        </Button>
      </Tooltip>
      {onView && viewLabel ? (
        <Tooltip content={viewLabel} delayMs={200}>
          <Button
            type="button"
            variant="secondary"
            className={cn(detailOpenIconButtonClass, compact && "min-h-11 min-w-11")}
            aria-label={viewLabel}
            title={viewLabel}
            onClick={onView}
          >
            <EyeIcon />
          </Button>
        </Tooltip>
      ) : null}
      {!p.isDeleted ? (
        <Tooltip content={deactivateLabel} delayMs={200}>
          <button
            type="button"
            onClick={onDeactivate}
            aria-label={deactivateLabel}
            className={trashIconActionButtonClass}
          >
            <TrashIcon />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function PersonnelScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN";
  const personnelPortal = isPersonnelPortalRole(user?.role);
  useHashScroll();
  useEffect(() => {
    if (personnelPortal) router.replace("/branches");
  }, [personnelPortal, router]);
  const softDeleteMut = useSoftDeletePersonnel();
  const { data: branches = [] } = useBranchesList();
  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const [pdfSeasonPerson, setPdfSeasonPerson] = useState<Personnel | null>(null);
  const [pdfSeasonBusy, setPdfSeasonBusy] = useState(false);
  const [profilePhotoPreviewPerson, setProfilePhotoPreviewPerson] =
    useState<Personnel | null>(null);
  const [mobileCardDetailsOpenById, setMobileCardDetailsOpenById] = useState<
    Record<number, boolean>
  >({});
  const [salaryRevealedById, setSalaryRevealedById] = useState<
    Record<number, boolean>
  >({});
  const toggleSalaryReveal = useCallback((id: number) => {
    setSalaryRevealedById((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  const profilePhotoPreviewTitle =
    profilePhotoPreviewPerson != null
      ? `${personnelDisplayName(profilePhotoPreviewPerson)} — ${t("personnel.profilePhotoLightbox1")}`
      : "";

  const openPersonnelPdfSettlementPicker = useCallback((p: Personnel) => {
    setPdfSeasonPerson(p);
  }, []);

  const runPersonnelPdfWithSeason = useCallback(
    async (p: Personnel, seasonYear: number | null) => {
      setPdfSeasonBusy(true);
      try {
        await openPersonnelSettlementPrintWindow({
          target: {
            scope: "personnel",
            personnelId: p.id,
            title: personnelDisplayName(p),
            seasonArrivalDate: p.seasonArrivalDate,
            ...(seasonYear != null ? { seasonYearFilter: seasonYear } : {}),
          },
          locale,
          branchNameById,
          t,
        });
        setPdfSeasonPerson(null);
      } catch (e) {
        notify.error(toErrorMessage(e));
      } finally {
        setPdfSeasonBusy(false);
      }
    },
    [locale, branchNameById, t]
  );

  const [filterBranch, setFilterBranch] = useState("");
  const [filterSeasonArrivalFrom, setFilterSeasonArrivalFrom] = useState("");
  const [filterSeasonArrivalTo, setFilterSeasonArrivalTo] = useState("");
  const [filterCompanyHireFrom, setFilterCompanyHireFrom] = useState("");
  const [filterCompanyHireTo, setFilterCompanyHireTo] = useState("");
  const [filterJobTitle, setFilterJobTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "passive">(
    "all"
  );
  const [filterInsuranceStatus, setFilterInsuranceStatus] = useState<
    "all" | "started" | "not_started"
  >("all");
  const [filterName, setFilterName] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedFilterName = useDebouncedValue(
    filterName,
    PERSONNEL_FILTER_TEXT_DEBOUNCE_MS
  );
  const debouncedSeasonArrivalFrom = useDebouncedValue(
    filterSeasonArrivalFrom,
    PERSONNEL_FILTER_TEXT_DEBOUNCE_MS
  );
  const debouncedSeasonArrivalTo = useDebouncedValue(
    filterSeasonArrivalTo,
    PERSONNEL_FILTER_TEXT_DEBOUNCE_MS
  );
  const debouncedCompanyHireFrom = useDebouncedValue(
    filterCompanyHireFrom,
    PERSONNEL_FILTER_TEXT_DEBOUNCE_MS
  );
  const debouncedCompanyHireTo = useDebouncedValue(
    filterCompanyHireTo,
    PERSONNEL_FILTER_TEXT_DEBOUNCE_MS
  );

  const listFilters = useMemo<PersonnelListFilters>(
    () => ({
      status: filterStatus,
      branchId: filterBranch.trim()
        ? Number.parseInt(filterBranch, 10) || 0
        : 0,
      jobTitle: filterJobTitle,
      name: debouncedFilterName,
      seasonArrivalFrom: debouncedSeasonArrivalFrom,
      seasonArrivalTo: debouncedSeasonArrivalTo,
      hireDateFrom: debouncedCompanyHireFrom,
      hireDateTo: debouncedCompanyHireTo,
      insuranceStatus: filterInsuranceStatus,
    }),
    [
      filterBranch,
      debouncedSeasonArrivalFrom,
      debouncedSeasonArrivalTo,
      debouncedCompanyHireFrom,
      debouncedCompanyHireTo,
      filterJobTitle,
      filterStatus,
      debouncedFilterName,
      filterInsuranceStatus,
    ]
  );

  const { data, isPending, isError, error, refetch, dataUpdatedAt } =
    usePersonnelList(listFilters, !personnelPortal);
  const listPhotoNonce = dataUpdatedAt ?? 0;
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const activeCount = data?.activeCount ?? 0;
  const passiveCount = data?.passiveCount ?? 0;

  const advancePersonnelFilters = useMemo<PersonnelListFilters>(
    () => ({ ...defaultPersonnelListFilters, status: "active" }),
    []
  );
  const { data: activePersonnelData } = usePersonnelList(
    advancePersonnelFilters,
    !personnelPortal
  );
  const activePersonnel = activePersonnelData?.items ?? [];

  const branchFilterOptions = useMemo(
    () => [
      { value: "", label: t("personnel.allAdvancesAnyBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const jobTitleFilterOptions = useMemo(
    () => [
      { value: "", label: t("personnel.filterJobTitleAll") },
      ...JOB_TITLE_FILTER_VALUES.map((jt) => ({
        value: jt,
        label: t(`personnel.jobTitles.${jt}`),
      })),
    ],
    [t]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: t("personnel.filterStatusAll") },
      { value: "active", label: t("personnel.filterStatusActive") },
      { value: "passive", label: t("personnel.filterStatusPassive") },
    ],
    [t]
  );

  const insuranceStatusFilterOptions = useMemo(
    () => [
      { value: "all", label: t("personnel.filterInsuranceAll") },
      { value: "started", label: t("personnel.filterInsuranceStarted") },
      { value: "not_started", label: t("personnel.filterInsuranceNotStarted") },
    ],
    [t]
  );

  const filtersActive = useMemo(() => {
    return (
      filterBranch !== "" ||
      filterSeasonArrivalFrom !== "" ||
      filterSeasonArrivalTo !== "" ||
      filterCompanyHireFrom !== "" ||
      filterCompanyHireTo !== "" ||
      filterJobTitle !== "" ||
      filterStatus !== "all" ||
      filterInsuranceStatus !== "all" ||
      filterName.trim() !== ""
    );
  }, [
    filterBranch,
    filterSeasonArrivalFrom,
    filterSeasonArrivalTo,
    filterCompanyHireFrom,
    filterCompanyHireTo,
    filterJobTitle,
    filterStatus,
    filterInsuranceStatus,
    filterName,
  ]);

  const listSummaryText = useMemo(() => {
    if (isPending || isError) return null;
    const vars = {
      total: String(totalCount),
      active: String(activeCount),
      passive: String(passiveCount),
      shown: String(items.length),
    };
    if (filtersActive) {
      return fillPersonnelSummaryTemplate(
        t("personnel.listSummaryFiltered"),
        vars
      );
    }
    return fillPersonnelSummaryTemplate(t("personnel.listSummary"), vars);
  }, [
    isPending,
    isError,
    totalCount,
    activeCount,
    passiveCount,
    items.length,
    filtersActive,
    t,
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Personnel | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceInitialPersonId, setAdvanceInitialPersonId] = useState<
    number | null
  >(null);
  const [systemUserTarget, setSystemUserTarget] = useState<Personnel | null>(
    null
  );
  const [detailPerson, setDetailPerson] = useState<Personnel | null>(null);
  const [detailInitialTab, setDetailInitialTab] =
    useState<PersonnelDetailTabId>("profile");
  const [expensePersonnel, setExpensePersonnel] = useState<Personnel | null>(
    null
  );
  const [pocketClaimUi, setPocketClaimUi] = useState<
    null | { mode: "patron" | "staff"; personnel: Personnel }
  >(null);
  const [patronHandoverTransferCtx, setPatronHandoverTransferCtx] =
    useState<PersonnelHandoverPatronTransferOpen | null>(null);
  const [cashHandoverToPatronPersonnel, setCashHandoverToPatronPersonnel] =
    useState<Personnel | null>(null);
  const [insuranceIntakeTarget, setInsuranceIntakeTarget] =
    useState<Personnel | null>(null);

  useEffect(() => {
    if (detailPerson == null || items.length === 0) return;
    const fresh = items.find((p) => p.id === detailPerson.id);
    if (!fresh) return;
    if (personnelDetailSyncSig(fresh) !== personnelDetailSyncSig(detailPerson)) {
      setDetailPerson(fresh);
    }
  }, [items, detailPerson]);

  const openPersonnelDetail = (
    p: Personnel,
    tab: PersonnelDetailTabId = "profile"
  ) => {
    setDetailInitialTab(tab);
    setDetailPerson(p);
  };

  useEffect(() => {
    const raw = searchParams.get("openPersonnel");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const p = items.find((x) => x.id === id);
    if (p) {
      setDetailInitialTab("profile");
      setDetailPerson(p);
      return;
    }
    let cancelled = false;
    void fetchPersonnel(id)
      .then((person) => {
        if (cancelled) return;
        setDetailInitialTab("profile");
        setDetailPerson(person);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [searchParams, items]);

  const openCreate = () => {
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (p: Personnel) => {
    setFormInitial(p);
    setFormOpen(true);
    void fetchPersonnel(p.id)
      .then((full) => {
        setFormInitial((prev) => (prev && prev.id === p.id ? full : prev));
      })
      .catch(() => {
        // Keep list row fallback if detail fetch fails.
      });
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormInitial(null);
  };

  const openSoftDelete = useCallback(
    (p: Personnel) => {
      const name = personnelDisplayName(p);
      notifyConfirmToast({
        toastId: "personnel-soft-delete-confirm",
        title: t("personnel.softDeleteTitle"),
        message: (
          <>
            <p>
              <span className="font-medium text-zinc-900">{name}</span>
              {" — "}
              {t("personnel.softDeleteLead")}
            </p>
            <p>{t("personnel.softDeleteDataNote")}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("personnel.softDeleteConfirm"),
        onConfirm: async () => {
          try {
            await softDeleteMut.mutateAsync(p.id);
            notify.success(t("toast.personnelDeactivated"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [t, softDeleteMut]
  );

  const openAdvance = (personnelId?: number) => {
    setAdvanceInitialPersonId(
      personnelId != null && personnelId > 0 ? personnelId : null
    );
    setAdvanceOpen(true);
  };

  const closeAdvance = () => {
    setAdvanceOpen(false);
    setAdvanceInitialPersonId(null);
  };

  const openCreateSystemUser = (p: Personnel) => setSystemUserTarget(p);
  const closeCreateSystemUser = () => setSystemUserTarget(null);
  const closeDetail = () => {
    setDetailPerson(null);
    setDetailInitialTab("profile");
  };

  const personnelToolbarMoreItems = useMemo(
    () => [
      {
        id: "advance",
        label: t("personnel.advance"),
        onSelect: () => openAdvance(),
        disabled: activeCount === 0,
      },
      {
        id: "costs",
        label: t("personnel.personnelCostsNavLink"),
        onSelect: () => router.push("/personnel/costs"),
      },
    ],
    [t, activeCount, router]
  );

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-6 sm:pb-8"
        intro={
          <>
            <div className="min-w-0">
          <h1 className="text-balance text-xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
            {t("personnel.heading")}
          </h1>
          <div className="mt-1 flex flex-col gap-1 text-sm text-zinc-500">
            <p className="text-pretty">{t("personnel.subtitle")}</p>
            {listSummaryText ? (
              <p className="text-pretty text-zinc-600">{listSummaryText}</p>
            ) : null}
          </div>
        </div>

      <PageWhenToUseGuide
        guideTab="personnel"
        className="mt-1"
        title={t("common.pageWhenToUseTitle")}
        description={t("pageHelp.personnel.intro")}
        listVariant="ordered"
        items={[
          { text: t("pageHelp.personnel.step1") },
          { text: t("pageHelp.personnel.step2") },
          {
            text: t("pageHelp.personnel.step3"),
            link: { href: "/personnel/advances", label: t("pageHelp.personnel.step3Link") },
          },
          {
            text: t("pageHelp.personnel.step4"),
            link: {
              href: "/personnel/non-advance-expenses",
              label: t("pageHelp.personnel.step4Link"),
            },
          },
          {
            text: t("pageHelp.personnel.step5"),
            link: { href: "/admin/users", label: t("pageHelp.personnel.step5Link") },
          },
        ]}
      />
          </>
        }
        main={
          <div id="personnel-advance" className="scroll-mt-24 flex flex-col gap-4">
        <Card
          title={t("personnel.team")}
          description={t("personnel.teamDesc")}
          headerActions={
            <>
              <Tooltip content={t("personnel.listFilters")} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(TABLE_TOOLBAR_ICON_BTN, "relative")}
                  onClick={() => setFiltersOpen(true)}
                  aria-label={t("personnel.listFilters")}
                >
                  <FilterFunnelIcon className="h-5 w-5" />
                  {filtersActive ? (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </Button>
              </Tooltip>
              <TableToolbarMoreMenu menuId="personnel-toolbar-more" items={personnelToolbarMoreItems} />
              <Tooltip content={t("personnel.add")} delayMs={200}>
                <Button
                  type="button"
                  variant="primary"
                  className={TABLE_TOOLBAR_ICON_BTN}
                  onClick={openCreate}
                  aria-label={t("personnel.add")}
                >
                  <ToolbarGlyphUserPlus className="h-5 w-5" />
                </Button>
              </Tooltip>
            </>
          }
        >
          {isPending && (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          )}
          {isError && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          )}
          {!isPending && !isError && totalCount === 0 && (
            <p className="text-sm text-zinc-500">{t("personnel.noData")}</p>
          )}
          {!isPending && !isError && totalCount > 0 && items.length === 0 && (
            <p className="text-sm text-zinc-500">{t("personnel.listFilteredEmpty")}</p>
          )}
          {!isPending && !isError && items.length > 0 && (
            <>
              {/* Kartlar: tablet & mobil (< md) */}
              <div className="flex flex-col gap-3 md:hidden">
                {items.map((p) => {
                  const mobileDetailsOpen =
                    mobileCardDetailsOpenById[p.id] === true;
                  return (
                    <article
                      key={p.id}
                      className={cn(
                        "rounded-2xl border p-4 shadow-sm",
                        p.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white"
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                        <PersonnelProfilePhotoAvatar
                          shape="square"
                          personnelId={p.id}
                          hasPhoto={p.hasProfilePhoto1}
                          profilePhotoPaths={{
                            profilePhoto1Url: p.profilePhoto1Url,
                            profilePhoto2Url: p.profilePhoto2Url,
                          }}
                          nonce={listPhotoNonce}
                          displayName={personnelDisplayName(p)}
                          photoLabel={t("personnel.profilePhotoAvatarAria")}
                          photoOpenLabel={t("personnel.nationalIdPhotoEnlarge")}
                          onPhotoClick={
                            p.hasProfilePhoto1
                              ? () => setProfilePhotoPreviewPerson(p)
                              : undefined
                          }
                          className="h-28 w-28 min-[400px]:h-32 min-[400px]:w-32 shrink-0 text-3xl min-[400px]:text-4xl"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={cn(
                                "min-w-0 text-base font-semibold leading-snug text-zinc-900",
                                p.isDeleted && "text-zinc-600"
                              )}
                            >
                              {personnelDisplayName(p)}
                            </h3>
                            {p.isDeleted ? (
                              <StatusBadge tone="inactive">{t("personnel.badgePassive")}</StatusBadge>
                            ) : null}
                            <PersonnelYearAccountClosedBadge personnel={p} t={t} />
                          </div>
                          <p
                            className={cn(
                              "text-sm font-medium text-zinc-700",
                              p.isDeleted && "text-zinc-500"
                            )}
                          >
                            {t(`personnel.jobTitles.${p.jobTitle}`)}
                          </p>
                          <p
                            className={cn(
                              "text-sm text-zinc-600",
                              p.isDeleted && "text-zinc-500"
                            )}
                          >
                            <span className="text-zinc-500">
                              {t("personnel.tableBranch")}:{" "}
                            </span>
                            <span
                              className={cn(
                                "font-medium text-zinc-800",
                                p.isDeleted && "text-zinc-600"
                              )}
                            >
                              {p.branchId != null
                                ? (branchNameById.get(p.branchId) ??
                                  `#${p.branchId}`)
                                : t("personnel.dash")}
                            </span>
                          </p>
                          <PersonnelInsuranceBadge personnel={p} t={t} />
                        </div>
                        <div className="ml-auto flex shrink-0 self-start pt-0.5 max-[360px]:w-full max-[360px]:justify-end">
                          <PersonnelRowActionsToolbar
                            p={p}
                            isAdmin={isAdmin}
                            menuId={`personnel-quick-${p.id}`}
                            compact
                            onView={() => openPersonnelDetail(p)}
                            viewLabel={t("personnel.viewPersonnelAria")}
                            onEdit={() => openEdit(p)}
                            onDeactivate={() => openSoftDelete(p)}
                            onAdvance={() => openAdvance(p.id)}
                            onAddExpense={() => setExpensePersonnel(p)}
                            onPersonnelCashHandoverToPatron={() =>
                              setCashHandoverToPatronPersonnel(p)
                            }
                            {...(UI_POCKET_CLAIM_TRANSFER_ENABLED
                              ? {
                                  onPocketClaimToPatron: () =>
                                    setPocketClaimUi({
                                      mode: "patron",
                                      personnel: p,
                                    }),
                                  onPocketClaimToStaff: () =>
                                    setPocketClaimUi({
                                      mode: "staff",
                                      personnel: p,
                                    }),
                                }
                              : {})}
                            onNotes={() => openPersonnelDetail(p, "notes")}
                            onInsuranceIntake={() =>
                              setInsuranceIntakeTarget(p)
                            }
                            onCreateSystemUser={() =>
                              openCreateSystemUser(p)
                            }
                            onPdfSettlement={() =>
                              openPersonnelPdfSettlementPicker(p)
                            }
                            editLabel={t("personnel.editAriaLabel")}
                            deactivateLabel={t(
                              "personnel.softDeactivateAriaLabel"
                            )}
                            t={t}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50/90 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        aria-expanded={mobileDetailsOpen}
                        onClick={() =>
                          setMobileCardDetailsOpenById((prev) => {
                            if (prev[p.id]) return {};
                            return { [p.id]: true };
                          })
                        }
                      >
                        {mobileDetailsOpen
                          ? t("personnel.mobileCardHideDetails")
                          : t("personnel.mobileCardShowDetails")}
                      </button>
                      {mobileDetailsOpen ? (
                        <>
                          <dl className="mt-4 space-y-2.5 border-t border-zinc-200/80 pt-4 text-sm">
                            <div className="flex justify-between gap-3">
                              <dt className="shrink-0 text-zinc-500">
                                {t("personnel.tableCompanyHireDate")}
                              </dt>
                              <dd
                                className={cn(
                                  "text-right font-medium text-zinc-900",
                                  p.isDeleted && "text-zinc-600"
                                )}
                              >
                                {formatCompanyHireDate(
                                  p,
                                  t("personnel.dash"),
                                  locale
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="shrink-0 text-zinc-500">
                                {t("personnel.tableSeasonArrivalDate")}
                              </dt>
                              <dd
                                className={cn(
                                  "text-right font-medium text-zinc-900",
                                  p.isDeleted && "text-zinc-600"
                                )}
                              >
                                {formatSeasonArrivalDate(
                                  p,
                                  t("personnel.dash"),
                                  locale
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="shrink-0 text-zinc-500">
                                {t("personnel.tableSalary")}
                              </dt>
                              <dd className="text-right font-medium text-zinc-900">
                                <PersonnelListSalaryReveal
                                  p={p}
                                  locale={locale}
                                  dash={t("personnel.dash")}
                                  revealed={salaryRevealedById[p.id] === true}
                                  onToggle={() => toggleSalaryReveal(p.id)}
                                  t={t}
                                />
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="shrink-0 text-zinc-500">
                                {t("personnel.tableSystemUser")}
                              </dt>
                              <dd
                                className={cn(
                                  "max-w-[55%] truncate text-right font-medium text-zinc-900",
                                  p.isDeleted && "text-zinc-600"
                                )}
                                title={
                                  hasLinkedSystemUser(p) && p.username
                                    ? p.username
                                    : undefined
                                }
                              >
                                {hasLinkedSystemUser(p) && p.username
                                  ? p.username
                                  : t("personnel.systemUserNone")}
                              </dd>
                            </div>
                          </dl>
                          <div className="mt-3 border-t border-zinc-200/80 pt-3">
                            <PersonnelListCashHandoverPoolLine
                              personnelId={p.id}
                              currencyCode={p.currencyCode}
                              className="mb-3 text-xs leading-snug"
                            />
                            <PersonnelAdvanceHistory
                              personnelId={p.id}
                              variant="card"
                              className="text-left"
                              showAttributedExpenses
                            />
                          </div>
                        </>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              {/* Tablo: md ve üstü */}
              <div className="-mx-1 hidden overflow-x-auto px-1 md:block sm:mx-0 sm:overflow-visible sm:px-0">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("personnel.tableName")}</TableHeader>
                      <TableHeader>{t("personnel.tableJobTitle")}</TableHeader>
                      <TableHeader>{t("personnel.tableCompanyHireDate")}</TableHeader>
                      <TableHeader>
                        {t("personnel.tableSeasonArrivalDate")}
                      </TableHeader>
                      <TableHeader>{t("personnel.tableSalary")}</TableHeader>
                      <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                      <TableHeader className="min-w-[7rem] max-w-[10rem]">
                        {t("personnel.tableSystemUser")}
                      </TableHeader>
                      <TableHeader className="min-w-[14rem] max-w-[24rem]">
                        {t("personnel.tableCostsAdvancesExpenses")}
                      </TableHeader>
                      <TableHeader className="w-[1%] whitespace-nowrap text-right">
                        {t("personnel.tableActions")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(p.isDeleted && "bg-zinc-50/90")}
                      >
                        <TableCell>
                          <div className="flex items-start gap-3 py-0.5">
                            <PersonnelProfilePhotoAvatar
                              personnelId={p.id}
                              hasPhoto={p.hasProfilePhoto1}
                              profilePhotoPaths={{
                                profilePhoto1Url: p.profilePhoto1Url,
                                profilePhoto2Url: p.profilePhoto2Url,
                              }}
                              nonce={listPhotoNonce}
                              displayName={personnelDisplayName(p)}
                              photoLabel={t("personnel.profilePhotoAvatarAria")}
                              photoOpenLabel={t("personnel.nationalIdPhotoEnlarge")}
                              onPhotoClick={
                                p.hasProfilePhoto1
                                  ? () => setProfilePhotoPreviewPerson(p)
                                  : undefined
                              }
                              className="h-[4.75rem] w-[4.75rem] shrink-0 text-2xl sm:h-24 sm:w-24 sm:text-3xl md:h-[6.75rem] md:w-[6.75rem] md:text-4xl"
                            />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "font-medium text-zinc-900",
                                    p.isDeleted && "text-zinc-600"
                                  )}
                                >
                                  {personnelDisplayName(p)}
                                </span>
                                {p.isDeleted ? (
                                  <StatusBadge tone="inactive">{t("personnel.badgePassive")}</StatusBadge>
                                ) : null}
                                <PersonnelYearAccountClosedBadge personnel={p} t={t} />
                              </div>
                              <PersonnelInsuranceBadge personnel={p} t={t} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {t(`personnel.jobTitles.${p.jobTitle}`)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {formatCompanyHireDate(
                            p,
                            t("personnel.dash"),
                            locale
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {formatSeasonArrivalDate(
                            p,
                            t("personnel.dash"),
                            locale
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          <PersonnelListSalaryReveal
                            p={p}
                            locale={locale}
                            dash={t("personnel.dash")}
                            revealed={salaryRevealedById[p.id] === true}
                            onToggle={() => toggleSalaryReveal(p.id)}
                            t={t}
                          />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {p.branchId != null
                            ? (branchNameById.get(p.branchId) ??
                              `#${p.branchId}`)
                            : t("personnel.dash")}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "max-w-[10rem] truncate text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                          title={
                            hasLinkedSystemUser(p) && p.username
                              ? p.username
                              : undefined
                          }
                        >
                          {hasLinkedSystemUser(p) && p.username
                            ? p.username
                            : t("personnel.systemUserNone")}
                        </TableCell>
                        <TableCell className="max-w-[24rem] align-top text-zinc-600">
                          <PersonnelListCashHandoverPoolLine
                            personnelId={p.id}
                            currencyCode={p.currencyCode}
                            className="mb-2 text-xs leading-snug"
                          />
                          <PersonnelAdvanceHistory
                            personnelId={p.id}
                            variant="inline"
                            maxDetailRows={4}
                            showAttributedExpenses
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <PersonnelRowActionsToolbar
                            p={p}
                            isAdmin={isAdmin}
                            menuId={`personnel-quick-dt-${p.id}`}
                            onView={() => openPersonnelDetail(p)}
                            viewLabel={t("personnel.viewPersonnelAria")}
                            onEdit={() => openEdit(p)}
                            onDeactivate={() => openSoftDelete(p)}
                            onAdvance={() => openAdvance(p.id)}
                            onAddExpense={() => setExpensePersonnel(p)}
                            onPersonnelCashHandoverToPatron={() =>
                              setCashHandoverToPatronPersonnel(p)
                            }
                            {...(UI_POCKET_CLAIM_TRANSFER_ENABLED
                              ? {
                                  onPocketClaimToPatron: () =>
                                    setPocketClaimUi({
                                      mode: "patron",
                                      personnel: p,
                                    }),
                                  onPocketClaimToStaff: () =>
                                    setPocketClaimUi({
                                      mode: "staff",
                                      personnel: p,
                                    }),
                                }
                              : {})}
                            onNotes={() => openPersonnelDetail(p, "notes")}
                            onInsuranceIntake={() => setInsuranceIntakeTarget(p)}
                            onCreateSystemUser={() => openCreateSystemUser(p)}
                            onPdfSettlement={() => openPersonnelPdfSettlementPicker(p)}
                            editLabel={t("personnel.editAriaLabel")}
                            deactivateLabel={t(
                              "personnel.softDeactivateAriaLabel"
                            )}
                            t={t}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

            <RightDrawer
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              title={t("personnel.listFilters")}
              closeLabel={t("common.close")}
              backdropCloseRequiresConfirm={false}
            >
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-500">
                  {t("personnel.listFiltersDrawerHint")}
                </p>
                <div className="grid gap-4 sm:grid-cols-1">
                  <Input
                    name="personnelFilterName"
                    label={t("personnel.filterNameSearch")}
                    type="search"
                    autoComplete="off"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="min-w-0"
                  />
                  <Select
                    name="personnelFilterBranch"
                    label={t("personnel.tableBranch")}
                    options={branchFilterOptions}
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    onBlur={() => {}}
                    menuZIndex={280}
                  />
                  <DateField
                    name="personnelFilterSeasonArrivalFrom"
                    label={t("personnel.filterSeasonArrivalFrom")}
                    value={filterSeasonArrivalFrom}
                    onChange={(e) => setFilterSeasonArrivalFrom(e.target.value)}
                    className="min-w-0"
                  />
                  <DateField
                    name="personnelFilterSeasonArrivalTo"
                    label={t("personnel.filterSeasonArrivalTo")}
                    value={filterSeasonArrivalTo}
                    onChange={(e) => setFilterSeasonArrivalTo(e.target.value)}
                    className="min-w-0"
                  />
                  <DateField
                    name="personnelFilterCompanyHireFrom"
                    label={t("personnel.filterCompanyHireFrom")}
                    value={filterCompanyHireFrom}
                    onChange={(e) => setFilterCompanyHireFrom(e.target.value)}
                    className="min-w-0"
                  />
                  <DateField
                    name="personnelFilterCompanyHireTo"
                    label={t("personnel.filterCompanyHireTo")}
                    value={filterCompanyHireTo}
                    onChange={(e) => setFilterCompanyHireTo(e.target.value)}
                    className="min-w-0"
                  />
                  <Select
                    name="personnelFilterJobTitle"
                    label={t("personnel.tableJobTitle")}
                    options={jobTitleFilterOptions}
                    value={filterJobTitle}
                    onChange={(e) => setFilterJobTitle(e.target.value)}
                    onBlur={() => {}}
                    menuZIndex={280}
                  />
                  <Select
                    name="personnelFilterInsuranceStatus"
                    label={t("personnel.filterInsuranceStatus")}
                    options={insuranceStatusFilterOptions}
                    value={filterInsuranceStatus}
                    onChange={(e) =>
                      setFilterInsuranceStatus(
                        e.target.value as "all" | "started" | "not_started",
                      )
                    }
                    onBlur={() => {}}
                    menuZIndex={280}
                  />
                  <Select
                    name="personnelFilterStatus"
                    label={t("personnel.filterStatus")}
                    options={statusFilterOptions}
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as "all" | "active" | "passive")
                    }
                    onBlur={() => {}}
                    menuZIndex={280}
                  />
                </div>
              </div>
            </RightDrawer>
          </div>
        }
      />

      <PersonnelFormModal
        open={formOpen}
        onClose={closeForm}
        initial={formInitial}
      />
      <AdvancePersonnelModal
        open={advanceOpen}
        onClose={closeAdvance}
        personnel={activePersonnel}
        initialPersonnelId={advanceInitialPersonId}
      />
      <CreatePersonnelSystemUserModal
        open={systemUserTarget != null}
        onClose={closeCreateSystemUser}
        personnel={systemUserTarget}
      />
      <PersonnelDetailModal
        open={detailPerson != null}
        onClose={closeDetail}
        personnel={detailPerson}
        branchNameById={branchNameById}
        initialTab={detailInitialTab}
      />
      <PersonnelCostsExpenseModal
        key={
          expensePersonnel != null
            ? `personnel-row-expense-${expensePersonnel.id}`
            : "personnel-row-expense-closed"
        }
        open={
          expensePersonnel != null &&
          !expensePersonnel.isDeleted
        }
        onClose={() => setExpensePersonnel(null)}
        defaultLinkedPersonnelId={expensePersonnel?.id}
      />
      {UI_POCKET_CLAIM_TRANSFER_ENABLED ? (
        <>
          <PersonnelPocketClaimToPatronDialog
            open={
              pocketClaimUi?.mode === "patron" &&
              pocketClaimUi.personnel != null &&
              !pocketClaimUi.personnel.isDeleted
            }
            onClose={() => setPocketClaimUi(null)}
            branchId={pocketClaimUi?.personnel.branchId ?? 0}
            fromPersonnelId={pocketClaimUi?.personnel.id ?? 0}
            fromPersonnelDisplayName={
              pocketClaimUi?.personnel
                ? personnelDisplayName(pocketClaimUi.personnel)
                : ""
            }
            defaultCurrencyCode={
              pocketClaimUi?.personnel.currencyCode?.trim().toUpperCase() ||
              "TRY"
            }
          />
          <PersonnelPocketClaimToStaffDialog
            open={
              pocketClaimUi?.mode === "staff" &&
              pocketClaimUi.personnel != null &&
              !pocketClaimUi.personnel.isDeleted
            }
            onClose={() => setPocketClaimUi(null)}
            branchId={pocketClaimUi?.personnel.branchId ?? 0}
            fromPersonnelId={pocketClaimUi?.personnel.id ?? 0}
            fromPersonnelDisplayName={
              pocketClaimUi?.personnel
                ? personnelDisplayName(pocketClaimUi.personnel)
                : ""
            }
            defaultCurrencyCode={
              pocketClaimUi?.personnel.currencyCode?.trim().toUpperCase() ||
              "TRY"
            }
          />
        </>
      ) : null}
      <AddPersonnelInsurancePeriodModal
        open={
          insuranceIntakeTarget != null && !insuranceIntakeTarget.isDeleted
        }
        onClose={() => setInsuranceIntakeTarget(null)}
        personnelId={insuranceIntakeTarget?.id ?? 0}
        defaultBranchId={insuranceIntakeTarget?.branchId ?? null}
        personnelDisplayName={
          insuranceIntakeTarget
            ? personnelDisplayName(insuranceIntakeTarget)
            : undefined
        }
      />
      <PersonnelSettlementSeasonPickerModal
        open={pdfSeasonPerson != null}
        onClose={() => setPdfSeasonPerson(null)}
        personnel={pdfSeasonPerson}
        busy={pdfSeasonBusy}
        onConfirm={(p, seasonYear) => void runPersonnelPdfWithSeason(p, seasonYear)}
      />
      <PersonnelHandoverPatronTransferDialog
        open={patronHandoverTransferCtx != null && !patronHandoverTransferCtx.personnel.isDeleted}
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
      {cashHandoverToPatronPersonnel != null && !cashHandoverToPatronPersonnel.isDeleted ? (
        <PersonnelCashHandoverToPatronDialog
          open
          personnel={cashHandoverToPatronPersonnel}
          branchName={
            cashHandoverToPatronPersonnel.branchId != null
              ? branchNameById.get(cashHandoverToPatronPersonnel.branchId)
              : undefined
          }
          onClose={() => {
            const pid = cashHandoverToPatronPersonnel.id;
            setCashHandoverToPatronPersonnel(null);
            void queryClient.invalidateQueries({
              queryKey: personnelKeys.managementSnapshot(pid),
            });
          }}
          onOpenPatronRegister={(ctx) => {
            setCashHandoverToPatronPersonnel(null);
            setPatronHandoverTransferCtx({
              personnel: ctx.personnel,
              branchId: ctx.branchId,
              branchName: ctx.branchName ?? branchNameById.get(ctx.branchId),
              currencyCode: ctx.currencyCode,
              suggestedAmount: ctx.suggestedAmount,
            });
          }}
        />
      ) : null}
      <PersonnelProfilePhotoPreviewModal
        open={profilePhotoPreviewPerson != null}
        onClose={() => setProfilePhotoPreviewPerson(null)}
        personnelId={profilePhotoPreviewPerson?.id ?? 0}
        profilePhoto1Url={profilePhotoPreviewPerson?.profilePhoto1Url ?? null}
        nonce={listPhotoNonce}
        title={profilePhotoPreviewTitle}
        closeLabel={t("common.close")}
        loadingLabel={t("common.loading")}
      />
    </>
  );
}
