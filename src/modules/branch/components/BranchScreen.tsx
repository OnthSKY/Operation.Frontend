"use client";

import { useI18n } from "@/i18n/context";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useBranchesList,
  useBranchesListPaged,
  useDeleteBranch,
} from "@/modules/branch/hooks/useBranchQueries";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch, BranchListSort, BranchSeasonStatus } from "@/types/branch";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { getBranchTypeBadge } from "@/modules/branch/lib/branch-type-badge";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { TablePagination } from "@/shared/ui/TablePagination";
import { useBranchDetailOverlay } from "@/shared/branch-detail";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import { detailOpenIconButtonClass, EyeIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { AddBranchModal } from "./AddBranchModal";
import { EditBranchModal } from "./EditBranchModal";
import { EditBranchTypeModal } from "./EditBranchTypeModal";
import { AddTransactionModal } from "@/shared/components/transactions/AddTransactionModal";
import { BranchListMetricsPanel } from "./BranchListMetricsPanel";
import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "./BranchQuickActionsMenu";
import { AssignPersonnelToBranchModal } from "./AssignPersonnelToBranchModal";
import { BranchPdfSettlementOptionsModal } from "./BranchPdfSettlementOptionsModal";
import { BranchPosSettlementProfileModal } from "./BranchPosSettlementProfileModal";

function seasonLabel(status: BranchSeasonStatus, t: (key: string) => string): string {
  switch (status) {
    case "OPEN":
      return t("branch.seasonOpen");
    case "PLANNED":
      return t("branch.seasonPlanned");
    case "CLOSED":
      return t("branch.seasonClosed");
    default:
      return t("branch.seasonNone");
  }
}

function seasonBadgeClass(status: BranchSeasonStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-emerald-100 text-emerald-900";
    case "PLANNED":
      return "bg-amber-100 text-amber-950";
    case "CLOSED":
      return "bg-zinc-200 text-zinc-800";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

function BranchMetricsChevronIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-4 w-4 transition-transform", open && "rotate-180", className)}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BranchMetricsToggle({
  open,
  onToggle,
  t,
  layout = "icon",
}: {
  open: boolean;
  onToggle: (e: MouseEvent) => void;
  t: (key: string) => string;
  layout?: "icon" | "mobileRow";
}) {
  if (layout === "mobileRow") {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full touch-manipulation items-start gap-3 border-t border-zinc-100 px-3 py-3 text-left outline-none transition-colors sm:px-4",
          "min-h-[52px] hover:bg-zinc-50/90 active:bg-zinc-100",
          "focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
          open && "bg-violet-50/35"
        )}
        aria-label={t("branch.listMetricsToggle")}
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-zinc-900">
            {t("branch.listMetricsMobileTitle")}
          </p>
          <p className="mt-1 text-xs leading-snug text-zinc-600">
            {t("branch.listMetricsToggle")}
          </p>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-zinc-600 transition-colors",
            open ? "border-violet-200 bg-violet-50 text-violet-800" : "border-zinc-200 bg-white"
          )}
        >
          <BranchMetricsChevronIcon open={open} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-zinc-600 outline-none transition-colors",
        "hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-400",
        open ? "border-violet-200 bg-violet-50 text-violet-800" : "border-zinc-200"
      )}
      aria-label={t("branch.listMetricsToggle")}
      aria-expanded={open}
      onClick={onToggle}
    >
      <BranchMetricsChevronIcon open={open} />
    </button>
  );
}

function staffTableLine(b: Branch, t: (key: string) => string): string {
  const total = b.personnelAssignedCount;
  const started = b.personnelStartedCount;
  const pending = b.personnelNotStartedCount;
  if (total <= 0) return t("branch.staffLineNone");
  if (pending > 0 && started > 0) {
    return t("branch.staffLineMixed")
      .replace("{total}", String(total))
      .replace("{started}", String(started))
      .replace("{pending}", String(pending));
  }
  if (pending > 0) {
    return t("branch.staffLinePendingOnly")
      .replace("{total}", String(total))
      .replace("{pending}", String(pending));
  }
  return t("branch.staffLineAllActive")
    .replace("{total}", String(total))
    .replace("{n}", String(started));
}

function BranchEditIcon({ className }: { className?: string }) {
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

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const BRANCH_LIST_PAGE_SIZE = 25;

const NOOP_BLUR = () => {};

function branchMatchesListSearch(b: Branch, qLower: string): boolean {
  if (!qLower) return true;
  if (b.name.toLowerCase().includes(qLower)) return true;
  const addr = (b.address ?? "").toLowerCase();
  if (addr.includes(qLower)) return true;
  if (String(b.id).includes(qLower)) return true;
  for (const r of b.responsibles ?? []) {
    if (r.fullName.toLowerCase().includes(qLower)) return true;
  }
  return false;
}

function sortBranchesClient(rows: Branch[], sort: BranchListSort, locale: string): Branch[] {
  const out = [...rows];
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  switch (sort) {
    case "nameDesc":
      out.sort((a, b) => {
        const c = collator.compare(a.name, b.name);
        if (c !== 0) return -c;
        return b.id - a.id;
      });
      break;
    case "idAsc":
      out.sort((a, b) => a.id - b.id);
      break;
    case "idDesc":
      out.sort((a, b) => b.id - a.id);
      break;
    case "staffDesc":
      out.sort((a, b) => {
        const d = b.personnelAssignedCount - a.personnelAssignedCount;
        if (d !== 0) return d;
        const n = collator.compare(a.name, b.name);
        if (n !== 0) return n;
        return a.id - b.id;
      });
      break;
    case "nameAsc":
    default:
      out.sort((a, b) => {
        const c = collator.compare(a.name, b.name);
        if (c !== 0) return c;
        return a.id - b.id;
      });
  }
  return out;
}

const BRANCH_DELETE_CONFIRM_TITLE_ID = "branch-soft-delete-confirm-title";

export function BranchScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    openBranchDetail: openBranchDetailOverlay,
    closeBranchDetail,
    branchDetailBranchId,
  } = useBranchDetailOverlay();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const [listPage, setListPage] = useState(1);
  const [listSearch, setListSearch] = useState("");
  const [sortBy, setSortBy] = useState<BranchListSort>("nameAsc");
  const listSearchTrimmed = listSearch.trim();
  const listSearchActive = listSearchTrimmed.length > 0;
  const listSearchLower = listSearchTrimmed.toLowerCase();

  const pagedQuery = useBranchesListPaged(
    listPage,
    BRANCH_LIST_PAGE_SIZE,
    sortBy,
    !listSearchActive
  );
  const fullListQuery = useBranchesList(listSearchActive);

  const fullBranchesForSearch = fullListQuery.data ?? [];
  const filteredSortedBranches = useMemo(() => {
    if (!listSearchActive) return null;
    const filtered = fullBranchesForSearch.filter((b) => branchMatchesListSearch(b, listSearchLower));
    return sortBranchesClient(filtered, sortBy, locale);
  }, [listSearchActive, fullBranchesForSearch, listSearchLower, sortBy, locale]);

  const list = useMemo(() => {
    if (listSearchActive) {
      const rows = filteredSortedBranches ?? [];
      const start = (listPage - 1) * BRANCH_LIST_PAGE_SIZE;
      return rows.slice(start, start + BRANCH_LIST_PAGE_SIZE);
    }
    return pagedQuery.data?.items ?? [];
  }, [listSearchActive, filteredSortedBranches, listPage, pagedQuery.data?.items]);

  const totalCount = useMemo(() => {
    if (listSearchActive) return filteredSortedBranches?.length ?? 0;
    return pagedQuery.data?.totalCount ?? 0;
  }, [listSearchActive, filteredSortedBranches, pagedQuery.data?.totalCount]);

  const isPending = listSearchActive ? fullListQuery.isPending : pagedQuery.isPending;
  const isError = listSearchActive ? fullListQuery.isError : pagedQuery.isError;
  const error = listSearchActive ? fullListQuery.error : pagedQuery.error;
  const refetch = useCallback(() => {
    void pagedQuery.refetch();
    void fullListQuery.refetch();
  }, [pagedQuery, fullListQuery]);
  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    !personnelPortal
  );

  useEffect(() => {
    setListPage(1);
  }, [sortBy, listSearch]);

  const listPageTotal = useMemo(
    () => Math.max(1, Math.ceil(totalCount / BRANCH_LIST_PAGE_SIZE)),
    [totalCount]
  );

  useEffect(() => {
    if (listPage > listPageTotal) setListPage(listPageTotal);
  }, [listPage, listPageTotal]);
  const personnel = useMemo(
    () => personnelListResult?.items ?? [],
    [personnelListResult]
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBranchId, setEditBranchId] = useState<number | null>(null);
  const [typeEditBranch, setTypeEditBranch] = useState<Branch | null>(null);
  const [quickTx, setQuickTx] = useState<{
    branchId: number;
    preset: "income" | "expense" | "dayClose";
    nonce: number;
  } | null>(null);
  const [metricsOpen, setMetricsOpen] = useState<Record<number, boolean>>({});
  const [assignBranchId, setAssignBranchId] = useState<number | null>(null);
  const [pdfBranch, setPdfBranch] = useState<Branch | null>(null);
  const [posProfileBranch, setPosProfileBranch] = useState<Branch | null>(null);
  const [branchPendingDelete, setBranchPendingDelete] = useState<Branch | null>(null);
  const deleteBranchMut = useDeleteBranch();

  const sortOptions = useMemo<SelectOption[]>(
    () => [
      { value: "nameAsc", label: t("branch.listSortNameAsc") },
      { value: "nameDesc", label: t("branch.listSortNameDesc") },
      { value: "idAsc", label: t("branch.listSortIdAsc") },
      { value: "idDesc", label: t("branch.listSortIdDesc") },
      { value: "staffDesc", label: t("branch.listSortStaffDesc") },
    ],
    [t]
  );

  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of list) m.set(b.id, b.name);
    if (pdfBranch) m.set(pdfBranch.id, pdfBranch.name);
    if (posProfileBranch) m.set(posProfileBranch.id, posProfileBranch.name);
    return m;
  }, [list, pdfBranch, posProfileBranch]);

  const activePersonnel = useMemo(
    () => personnel.filter((p) => !p.isDeleted),
    [personnel]
  );

  const assignTargetBranch = useMemo(
    () =>
      assignBranchId != null
        ? list.find((b) => b.id === assignBranchId) ?? null
        : null,
    [list, assignBranchId]
  );

  const dashboardMonthUtc = useMemo(
    () =>
      `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`,
    []
  );

  const toggleMetrics = useCallback((id: number) => {
    return (e: MouseEvent) => {
      e.stopPropagation();
      setMetricsOpen((m) => ({ ...m, [id]: !m[id] }));
    };
  }, []);

  const openBranchDetail = useCallback(
    (id: number) => {
      openBranchDetailOverlay(id);
      setQuickTx(null);
      setEditOpen(false);
      setEditBranchId(null);
    },
    [openBranchDetailOverlay]
  );

  const openBranchEdit = useCallback((id: number) => {
    setEditBranchId(id);
    setEditOpen(true);
  }, []);

  const openBranchQuickIncome = useCallback((id: number) => {
    setQuickTx({ branchId: id, preset: "income", nonce: Date.now() });
  }, []);
  const openBranchQuickExpense = useCallback((id: number) => {
    setQuickTx({ branchId: id, preset: "expense", nonce: Date.now() });
  }, []);
  const openBranchQuickDayClose = useCallback((id: number) => {
    setQuickTx({ branchId: id, preset: "dayClose", nonce: Date.now() });
  }, []);
  const goSupplierInvoiceFor = useCallback(
    (id: number) => {
      const ret =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/branches";
      const q = new URLSearchParams({
        branchPreset: String(id),
        paymentSource: "REGISTER",
        newInvoice: "1",
        returnTo: ret,
      }).toString();
      router.push(`/suppliers/invoices?${q}`);
    },
    [router]
  );
  const goGeneralOverheadFor = useCallback(
    (id: number) => {
      const ret =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/branches";
      const q = new URLSearchParams({
        branchPreset: String(id),
        paymentSource: "REGISTER",
        newPool: "1",
        returnTo: ret,
      }).toString();
      router.push(`/general-overhead?${q}`);
    },
    [router]
  );

  const branchQuickSectionsFor = useCallback(
    (b: Branch): QuickActionsMenuSection[] => {
      const register: QuickActionsMenuSection = {
        storyTitle: t("branch.quickMenuStoryRegister"),
        items: [
          {
            id: "in",
            label: t("branch.quickAddIncome"),
            onSelect: () => openBranchQuickIncome(b.id),
          },
          {
            id: "out",
            label: t("branch.expenseAddOps"),
            onSelect: () => openBranchQuickExpense(b.id),
          },
          {
            id: "outSupplier",
            label: t("branch.expenseAddSupplier"),
            onSelect: () => goSupplierInvoiceFor(b.id),
          },
          {
            id: "outOverhead",
            label: t("branch.expenseAddOverhead"),
            onSelect: () => goGeneralOverheadFor(b.id),
          },
          {
            id: "dayClose",
            label: t("branch.quickAddDayClose"),
            onSelect: () => openBranchQuickDayClose(b.id),
          },
        ],
      };
      if (personnelPortal) return [register];
      const staffAndReports: QuickActionsMenuSection = {
        storyTitle: t("branch.quickMenuStoryPersonnelReports"),
        items: [
          {
            id: "pdf",
            label: t("branch.listRowPdfSettlement"),
            onSelect: () => setPdfBranch(b),
          },
          {
            id: "posProfile",
            label: t("branch.listRowPosProfile"),
            onSelect: () => setPosProfileBranch(b),
          },
          {
            id: "assign",
            label: t("branch.listRowAddPersonnel"),
            onSelect: () => setAssignBranchId(b.id),
          },
        ],
      };
      if (b.personnelAssignedCount > 0) {
        return [register, staffAndReports];
      }
      return [
        register,
        staffAndReports,
        {
          storyTitle: t("branch.quickMenuStoryDangerZone"),
          items: [
            {
              id: "deleteBranch",
              label: t("branch.deleteBranch"),
              onSelect: () => setBranchPendingDelete(b),
            },
          ],
        },
      ];
    },
    [
      t,
      personnelPortal,
      openBranchQuickIncome,
      openBranchQuickExpense,
      openBranchQuickDayClose,
      goSupplierInvoiceFor,
      goGeneralOverheadFor,
    ]
  );

  const editStaff = useMemo(
    () => personnel.filter((p) => p.branchId === editBranchId),
    [personnel, editBranchId]
  );

  const editBranch = useMemo(
    () => (editBranchId != null ? list.find((b) => b.id === editBranchId) ?? null : null),
    [list, editBranchId]
  );

  const openedFromReport = useMemo(() => {
    const raw = searchParams.get("openBranch");
    if (!raw?.trim()) return false;
    const id = Number.parseInt(raw, 10);
    return Number.isFinite(id) && id > 0;
  }, [searchParams]);

  const confirmBranchSoftDelete = useCallback(async () => {
    const target = branchPendingDelete;
    if (target == null) return;
    try {
      await deleteBranchMut.mutateAsync(target.id);
      notify.success(t("toast.branchSoftDeleted"));
      const id = target.id;
      setBranchPendingDelete(null);
      if (branchDetailBranchId === id) closeBranchDetail();
      if (editBranchId === id) {
        setEditOpen(false);
        setEditBranchId(null);
      }
      if (assignBranchId === id) setAssignBranchId(null);
      if (pdfBranch?.id === id) setPdfBranch(null);
      if (posProfileBranch?.id === id) setPosProfileBranch(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    assignBranchId,
    branchDetailBranchId,
    branchPendingDelete,
    closeBranchDetail,
    deleteBranchMut,
    editBranchId,
    pdfBranch,
    posProfileBranch,
    t,
  ]);

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-6 sm:pb-8"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                {t("branch.title")}
              </h1>
                <p className="text-sm text-zinc-500">{t("branch.subtitle")}</p>
            </div>

            <PageWhenToUseGuide
              guideTab="branch"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.branch.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.branch.step1") },
                { text: t("pageHelp.branch.step2") },
                { text: t("pageHelp.branch.step3") },
                {
                  text: t("pageHelp.branch.step4"),
                  link: { href: "/general-overhead", label: t("pageHelp.branch.step4Link") },
                },
              ]}
            />
          </>
        }
        summary={
          openedFromReport ? (
            <div
              role="status"
              className="rounded-xl border border-violet-200/90 bg-violet-50/90 px-3 py-2.5 text-sm leading-snug text-violet-950"
            >
              {t("branch.openedFromReportBanner")}
            </div>
          ) : undefined
        }
        main={
          <Card
            title={t("branch.listTitle")}
            description={t("branch.listDesc")}
            headerActions={
              !personnelPortal ? (
                <Tooltip content={t("branch.add")} delayMs={200}>
                  <Button
                    type="button"
                    variant="primary"
                    className={TABLE_TOOLBAR_ICON_BTN}
                    onClick={() => setAddOpen(true)}
                    aria-label={t("branch.add")}
                  >
                    <PlusIcon />
                  </Button>
                </Tooltip>
              ) : undefined
            }
          >
        <div className="mb-3 min-w-0 space-y-3">
          <div className="min-w-0 w-full">
            <Input
              name="branch-list-search"
              placeholder={t("branch.listSearchPlaceholder")}
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              autoComplete="off"
              aria-label={t("branch.listSearchPlaceholder")}
            />
          </div>
          {!isPending && !isError && totalCount > 0 ? (
            <div className="w-full max-w-full md:max-w-sm">
              <Select
                name="branchListSort"
                label={t("branch.listSortLabel")}
                value={sortBy}
                options={sortOptions}
                onChange={(event) => setSortBy(event.target.value as BranchListSort)}
                onBlur={NOOP_BLUR}
              />
            </div>
          ) : null}
        </div>
        {isPending && (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        )}
        {isError && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}
        {!isPending && !isError && totalCount === 0 && (
          listSearchActive ? (
            <EmptyState
              icon="🔍"
              title={t("branch.listSearchNoResults")}
              description="Arama kriterlerini değiştir veya filtreleri temizle."
              compact
            />
          ) : (
            <EmptyState
              icon="🏪"
              title={t("branch.noData")}
              description="Şube ekleyerek operasyonlarınızı yönetmeye başlayın."
              action={
                !personnelPortal
                  ? { label: t("branch.add"), onClick: () => setAddOpen(true) }
                  : undefined
              }
            />
          )
        )}
        {!isPending && !isError && totalCount > 0 && (
          <>
            <div className="flex flex-col gap-4 md:hidden">
              {list.map((b) => {
                const active = branchDetailBranchId === b.id;
                const mOpen = Boolean(metricsOpen[b.id]);
                return (
                  <MobileListCard
                    key={b.id}
                    as="div"
                    className={cn(
                      "touch-manipulation !p-0 transition-[border-color,box-shadow]",
                      active && "border-violet-200 ring-1 ring-violet-200/60"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full px-3 pb-3 pt-3 text-left transition-colors sm:px-4",
                        active && "bg-violet-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900">
                            {b.name}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700">
                              {t("branch.tableId")} {b.id}
                            </span>
                            {(() => {
                              const bd = getBranchTypeBadge(b.branchType);
                              return (
                                <button
                                  type="button"
                                  onClick={() => setTypeEditBranch(b)}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${bd.className}`}
                                  title="Şube tipini düzenle"
                                >
                                  <span aria-hidden>{bd.emoji}</span>
                                  {bd.label}
                                  {b.branchType === "JOINT_VENTURE" && b.partnerSharePercent != null
                                    ? ` %${b.partnerSharePercent}`
                                    : ""}
                                  <span aria-hidden className="ml-0.5 text-zinc-400">✎</span>
                                </button>
                              );
                            })()}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                seasonBadgeClass(b.seasonStatus)
                              )}
                            >
                              {t("branch.tableSeason")}: {seasonLabel(b.seasonStatus, t)}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700"
                              title={t("branch.tableStaffHint")}
                              aria-label={`${t("branch.tableStaff")}: ${staffTableLine(b, t)}`}
                            >
                              <svg
                                aria-hidden
                                className="h-3.5 w-3.5 text-violet-600"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                              <span className="truncate">{staffTableLine(b, t)}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openBranchDetail(b.id)}
                          aria-label={t("branch.detail")}
                          title={t("branch.detail")}
                          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-violet-600 transition-colors hover:bg-violet-50 active:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                          <EyeIcon />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-zinc-100 px-3 py-3 sm:px-4">
                      <div className="flex min-h-11 flex-row items-center justify-between gap-2">
                        {!personnelPortal ? (
                          <Tooltip content={t("branch.deleteBranch")} delayMs={200}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBranchPendingDelete(b);
                              }}
                              aria-label={t("branch.deleteBranch")}
                              className={cn(
                                trashIconActionButtonClass,
                                "border-2 border-red-200 bg-white shadow-sm ring-1 ring-red-100/80 hover:border-red-300 hover:bg-red-50/90 active:bg-red-100"
                              )}
                            >
                              <TrashIcon />
                            </button>
                          </Tooltip>
                        ) : (
                          <span />
                        )}
                        <div className="inline-flex flex-row items-center gap-2">
                          <BranchQuickActionsMenu
                            menuId={`branch-quick-${b.id}`}
                            triggerLabel={t("branch.quickActions")}
                            compact
                            sections={branchQuickSectionsFor(b)}
                          />
                          {!personnelPortal ? (
                            <Tooltip content={t("branch.edit")} delayMs={200}>
                              <Button
                                type="button"
                                variant="secondary"
                                className={cn(
                                  detailOpenIconButtonClass,
                                  "min-h-11 min-w-11 shrink-0"
                                )}
                                aria-label={t("branch.edit")}
                                title={t("branch.edit")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBranchEdit(b.id);
                                }}
                              >
                                <BranchEditIcon />
                              </Button>
                            </Tooltip>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </MobileListCard>
                );
              })}
            </div>

            <div className="-mx-1 hidden overflow-x-auto px-1 md:block sm:mx-0 sm:overflow-visible sm:px-0">
              <Table mobileCards={false}>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("branch.tableId")}</TableHeader>
                    <TableHeader>{t("branch.tableName")}</TableHeader>
                    <TableHeader
                      className="hidden min-w-[8.5rem] lg:table-cell"
                      title={t("branch.tableSeasonHint")}
                    >
                      {t("branch.tableSeason")}
                    </TableHeader>
                    <TableHeader
                      className="min-w-[10rem]"
                      title={t("branch.tableStaffHint")}
                    >
                      {t("branch.tableStaff")}
                    </TableHeader>
                    <TableHeader className="w-[1%] whitespace-nowrap text-right">
                      {t("branch.tableActions")}
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((b) => {
                    const active = branchDetailBranchId === b.id;
                    return (
                      <TableRow
                        key={b.id}
                        className={cn(
                          "transition-colors hover:bg-zinc-50",
                          active && "bg-zinc-50"
                        )}
                      >
                        <TableCell className="font-mono text-zinc-600">
                          {b.id}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{b.name}</span>
                            {(() => {
                              const bd = getBranchTypeBadge(b.branchType);
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTypeEditBranch(b);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${bd.className}`}
                                  title="Şube tipini düzenle"
                                >
                                  <span aria-hidden>{bd.emoji}</span>
                                  {bd.label}
                                  {b.branchType === "JOINT_VENTURE" && b.partnerSharePercent != null
                                    ? ` %${b.partnerSharePercent}`
                                    : ""}
                                  <span aria-hidden className="ml-0.5 text-zinc-400">✎</span>
                                </button>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 md:hidden lg:table-cell">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              seasonBadgeClass(b.seasonStatus)
                            )}
                          >
                            {seasonLabel(b.seasonStatus, t)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[16rem] text-sm text-zinc-700">
                          <span className="lg:hidden">
                            <span
                              className={cn(
                                "mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                                seasonBadgeClass(b.seasonStatus)
                              )}
                            >
                              {seasonLabel(b.seasonStatus, t)}
                            </span>
                          </span>
                          {staffTableLine(b, t)}
                        </TableCell>
                        <TableCell
                          className="w-[1%] whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                            <BranchQuickActionsMenu
                              menuId={`branch-quick-dt-${b.id}`}
                              triggerLabel={t("branch.quickActions")}
                              sections={branchQuickSectionsFor(b)}
                              onTriggerClick={(e) => e.stopPropagation()}
                            />
                            {!personnelPortal ? (
                              <Tooltip content={t("branch.edit")} delayMs={200}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t("branch.edit")}
                                  title={t("branch.edit")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openBranchEdit(b.id);
                                  }}
                                >
                                  <BranchEditIcon />
                                </Button>
                              </Tooltip>
                            ) : null}
                            <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                              <Button
                                type="button"
                                variant="secondary"
                                className={detailOpenIconButtonClass}
                                aria-haspopup="dialog"
                                aria-expanded={active}
                                aria-label={t("common.openDetailsDialog")}
                                title={t("common.openDetailsDialog")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBranchDetail(b.id);
                                }}
                              >
                                <EyeIcon />
                              </Button>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

              {!isPending && !isError && totalCount > 0 ? (
                <TablePagination
                  className="mt-3"
                  page={listPage}
                  pageSize={BRANCH_LIST_PAGE_SIZE}
                  totalCount={totalCount}
                  onPageChange={setListPage}
                />
              ) : null}
          </>
        )}
        {!isPending && !isError && totalCount > 0 && branchDetailBranchId == null && (
          <p className="mt-3 text-sm text-zinc-500">{t("branch.selectHint")}</p>
        )}
          </Card>
        }
      />

      {!personnelPortal ? (
        <EditBranchModal
          open={editOpen && editBranch != null}
          branch={editBranch}
          staff={editStaff}
          onClose={() => {
            setEditOpen(false);
            setEditBranchId(null);
          }}
        />
      ) : null}

      {quickTx ? (
        <AddTransactionModal
          key={`${quickTx.branchId}-${quickTx.nonce}`}
          open
          branchId={quickTx.branchId}
          defaultType={quickTx.preset === "expense" ? "OUT" : "IN"}
          defaultMainCategory={
            quickTx.preset === "dayClose" ? "IN_DAY_CLOSE" : undefined
          }
          onClose={() => setQuickTx(null)}
        />
      ) : null}

      {!personnelPortal ? (
        <>
          <AddBranchModal open={addOpen} onClose={() => setAddOpen(false)} />
          <EditBranchTypeModal
            branch={typeEditBranch}
            onClose={() => setTypeEditBranch(null)}
          />
        </>
      ) : null}

      {!personnelPortal && assignTargetBranch ? (
        <AssignPersonnelToBranchModal
          open
          onClose={() => setAssignBranchId(null)}
          targetBranch={assignTargetBranch}
          activePersonnel={activePersonnel}
        />
      ) : null}

      {!personnelPortal ? (
        <BranchPdfSettlementOptionsModal
          branch={pdfBranch}
          branchNameById={branchNameById}
          locale={locale}
          onClose={() => setPdfBranch(null)}
        />
      ) : null}

      {!personnelPortal ? (
        <BranchPosSettlementProfileModal
          branch={posProfileBranch}
          personnel={activePersonnel}
          onClose={() => setPosProfileBranch(null)}
        />
      ) : null}

      {!personnelPortal ? (
        <Modal
          open={branchPendingDelete != null}
          onClose={() => setBranchPendingDelete(null)}
          titleId={BRANCH_DELETE_CONFIRM_TITLE_ID}
          title={t("branch.deleteBranchConfirmTitle")}
          closeButtonLabel={t("common.close")}
          nested={branchDetailBranchId != null || editOpen}
          className="max-w-md"
        >
          <p className="text-sm text-zinc-800">
            {branchPendingDelete
              ? t("branch.deleteBranchConfirmBody").replace("{name}", branchPendingDelete.name)
              : null}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBranchPendingDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBranchMut.isPending}
              onClick={() => void confirmBranchSoftDelete()}
            >
              {deleteBranchMut.isPending ? t("common.loading") : t("branch.deleteBranchConfirm")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
