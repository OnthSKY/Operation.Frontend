"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  usePersonnelList,
  useSoftDeletePersonnel,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { notify } from "@/shared/lib/notify";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import { Card } from "@/shared/components/Card";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
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
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import type { Personnel, PersonnelJobTitle } from "@/types/personnel";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PersonnelCostsExpenseModal } from "@/modules/personnel/components/PersonnelCostsExpenseModal";
import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "@/modules/branch/components/BranchQuickActionsMenu";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { CreatePersonnelSystemUserModal } from "./CreatePersonnelSystemUserModal";
import { PersonnelAdvanceHistory } from "./PersonnelAdvanceHistory";
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

/** Liste / kart: tutarı gizle; gerçek değer yalnızca detay modalında. */
function formatSalaryMasked(p: Personnel, dash: string): string {
  if (p.salary == null) return dash;
  return "***";
}

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

function isoDateSortKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const s = iso.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
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
    sections.push({
      storyTitle: t("personnel.quickMenuStoryMoney"),
      items: [
        { id: "advance", label: t("personnel.advance"), onSelect: onAdvance },
        {
          id: "expense",
          label: t("personnel.cardQuickAddPersonnelExpense"),
          onSelect: onAddExpense,
        },
        { id: "notes", label: t("personnel.cardQuickNotes"), onSelect: onNotes },
      ],
    });
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

function PassiveBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-zinc-300/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
      {children}
    </span>
  );
}

export function PersonnelScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const personnelPortal = isPersonnelPortalRole(user?.role);
  useHashScroll();
  useEffect(() => {
    if (personnelPortal) router.replace("/branches");
  }, [personnelPortal, router]);
  const { data, isPending, isError, error, refetch, dataUpdatedAt } =
    usePersonnelList(!personnelPortal);
  const listPhotoNonce = dataUpdatedAt ?? 0;
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

  const list = useMemo(() => data ?? [], [data]);
  const activePersonnel = useMemo(
    () => list.filter((p) => !p.isDeleted),
    [list]
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
  const [filterName, setFilterName] = useState("");

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

  const filtersActive = useMemo(() => {
    return (
      filterBranch !== "" ||
      filterSeasonArrivalFrom !== "" ||
      filterSeasonArrivalTo !== "" ||
      filterCompanyHireFrom !== "" ||
      filterCompanyHireTo !== "" ||
      filterJobTitle !== "" ||
      filterStatus !== "all" ||
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
    filterName,
  ]);

  const filteredList = useMemo(() => {
    const bid = filterBranch.trim() ? parseInt(filterBranch, 10) : 0;
    const jt = filterJobTitle.trim() as PersonnelJobTitle | "";
    const nameQ = filterName.trim().toLocaleLowerCase(locale);

    return list.filter((p) => {
      if (filterStatus === "active" && p.isDeleted) return false;
      if (filterStatus === "passive" && !p.isDeleted) return false;

      if (nameQ) {
        const n = personnelDisplayName(p).toLocaleLowerCase(locale);
        if (!n.includes(nameQ)) return false;
      }

      if (bid > 0) {
        if (p.branchId == null || p.branchId !== bid) return false;
      }

      if (jt && p.jobTitle !== jt) return false;

      const seasonFrom = filterSeasonArrivalFrom.trim();
      const seasonTo = filterSeasonArrivalTo.trim();
      const sk = isoDateSortKey(p.seasonArrivalDate);
      if (seasonFrom || seasonTo) {
        if (!sk) return false;
        if (seasonFrom && sk < seasonFrom) return false;
        if (seasonTo && sk > seasonTo) return false;
      }

      const companyFrom = filterCompanyHireFrom.trim();
      const companyTo = filterCompanyHireTo.trim();
      const hk = isoDateSortKey(p.hireDate);
      if (companyFrom || companyTo) {
        if (!hk) return false;
        if (companyFrom && hk < companyFrom) return false;
        if (companyTo && hk > companyTo) return false;
      }

      return true;
    });
  }, [
    list,
    filterBranch,
    filterSeasonArrivalFrom,
    filterSeasonArrivalTo,
    filterCompanyHireFrom,
    filterCompanyHireTo,
    filterJobTitle,
    filterStatus,
    filterName,
    locale,
  ]);

  const passiveCount = useMemo(
    () => list.filter((p) => p.isDeleted).length,
    [list]
  );

  const listSummaryText = useMemo(() => {
    if (isPending || isError) return null;
    const total = list.length;
    const active = activePersonnel.length;
    const passive = passiveCount;
    const shown = filteredList.length;
    const vars = {
      total: String(total),
      active: String(active),
      passive: String(passive),
      shown: String(shown),
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
    list.length,
    activePersonnel.length,
    passiveCount,
    filteredList.length,
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
  const [insuranceIntakeTarget, setInsuranceIntakeTarget] =
    useState<Personnel | null>(null);

  useEffect(() => {
    if (detailPerson == null || list.length === 0) return;
    const fresh = list.find((p) => p.id === detailPerson.id);
    if (!fresh) return;
    if (personnelDetailSyncSig(fresh) !== personnelDetailSyncSig(detailPerson)) {
      setDetailPerson(fresh);
    }
  }, [list, detailPerson]);

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
    const p = list.find((x) => x.id === id);
    if (!p) return;
    setDetailInitialTab("profile");
    setDetailPerson(p);
  }, [searchParams, list]);

  const openCreate = () => {
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (p: Personnel) => {
    setFormInitial(p);
    setFormOpen(true);
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

  return (
    <div className="mx-auto flex w-full app-page-max flex-col gap-4 p-4 pb-6 sm:pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
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
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:flex lg:w-auto lg:max-w-full lg:shrink-0 lg:flex-row lg:flex-wrap lg:justify-end">
          <Button
            type="button"
            className="min-h-12 w-full touch-manipulation sm:min-h-11 lg:min-h-10 lg:w-auto"
            onClick={openCreate}
          >
            {t("personnel.add")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full touch-manipulation sm:min-h-11 lg:min-h-10 lg:w-auto"
            onClick={() => openAdvance()}
            disabled={activePersonnel.length === 0}
          >
            {t("personnel.advance")}
          </Button>
          <Link
            href="/personnel/costs"
            className={cn(
              "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-center text-base font-medium leading-snug text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 touch-manipulation sm:col-span-2 sm:min-h-11 lg:col-span-1 lg:min-h-10 lg:w-auto lg:px-4 lg:text-sm"
            )}
          >
            {t("personnel.personnelCostsNavLink")}
          </Link>
        </div>
      </div>

      <div id="personnel-advance" className="scroll-mt-24 flex flex-col gap-4">
        <CollapsibleMobileFilters
          title={t("personnel.listFilters")}
          toggleAriaLabel={t("common.filters")}
          active={filtersActive}
          expandLabel={t("common.filtersShow")}
          collapseLabel={t("common.filtersHide")}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            />
          </div>
        </CollapsibleMobileFilters>

        <Card title={t("personnel.team")} description={t("personnel.teamDesc")}>
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
          {!isPending && !isError && list.length === 0 && (
            <p className="text-sm text-zinc-500">{t("personnel.noData")}</p>
          )}
          {!isPending && !isError && list.length > 0 && filteredList.length === 0 && (
            <p className="text-sm text-zinc-500">{t("personnel.listFilteredEmpty")}</p>
          )}
          {!isPending && !isError && filteredList.length > 0 && (
            <>
              {/* Kartlar: tablet & mobil (< md) */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredList.map((p) => {
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
                          nonce={listPhotoNonce}
                          displayName={personnelDisplayName(p)}
                          photoLabel={t("personnel.profilePhotoAvatarAria")}
                          photoOpenLabel={t("personnel.nationalIdPhotoEnlarge")}
                          onPhotoClick={
                            p.hasProfilePhoto1
                              ? () => setProfilePhotoPreviewPerson(p)
                              : undefined
                          }
                          className="h-24 w-24 min-[400px]:h-[6.5rem] min-[400px]:w-[6.5rem] shrink-0 text-2xl min-[400px]:text-3xl"
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
                              <PassiveBadge>
                                {t("personnel.badgePassive")}
                              </PassiveBadge>
                            ) : null}
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
                              <dd
                                className={cn(
                                  "text-right font-medium text-zinc-900",
                                  p.isDeleted && "text-zinc-600"
                                )}
                              >
                                {formatSalaryMasked(p, t("personnel.dash"))}
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
                            <PersonnelAdvanceHistory
                              personnelId={p.id}
                              variant="card"
                              className="text-left"
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
                      <TableHeader className="min-w-[12rem] max-w-[18rem]">
                        {t("personnel.tableAdvances")}
                      </TableHeader>
                      <TableHeader className="w-[1%] whitespace-nowrap text-right">
                        {t("personnel.tableActions")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredList.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(p.isDeleted && "bg-zinc-50/90")}
                      >
                        <TableCell>
                          <div className="flex items-start gap-3 py-0.5">
                            <PersonnelProfilePhotoAvatar
                              personnelId={p.id}
                              hasPhoto={p.hasProfilePhoto1}
                              nonce={listPhotoNonce}
                              displayName={personnelDisplayName(p)}
                              photoLabel={t("personnel.profilePhotoAvatarAria")}
                              photoOpenLabel={t("personnel.nationalIdPhotoEnlarge")}
                              onPhotoClick={
                                p.hasProfilePhoto1
                                  ? () => setProfilePhotoPreviewPerson(p)
                                  : undefined
                              }
                              className="h-16 w-16 shrink-0 text-xl sm:h-20 sm:w-20 sm:text-2xl"
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
                                  <PassiveBadge>
                                    {t("personnel.badgePassive")}
                                  </PassiveBadge>
                                ) : null}
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
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {formatSalaryMasked(p, t("personnel.dash"))}
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
                        <TableCell className="max-w-[18rem] align-top text-zinc-600">
                          <PersonnelAdvanceHistory
                            personnelId={p.id}
                            variant="inline"
                            maxDetailRows={4}
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
      </div>

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
      <PersonnelProfilePhotoPreviewModal
        open={profilePhotoPreviewPerson != null}
        onClose={() => setProfilePhotoPreviewPerson(null)}
        personnelId={profilePhotoPreviewPerson?.id ?? 0}
        nonce={listPhotoNonce}
        title={profilePhotoPreviewTitle}
        closeLabel={t("common.close")}
        loadingLabel={t("common.loading")}
      />
    </div>
  );
}
