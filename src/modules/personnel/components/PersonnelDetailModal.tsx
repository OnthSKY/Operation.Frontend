"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/shared/api/client";
import { AddBranchTransactionModal } from "@/modules/branch/components/AddBranchTransactionModal";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { fetchPersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { AddPersonnelInsurancePeriodModal } from "@/modules/personnel/components/AddPersonnelInsurancePeriodModal";
import { EditPersonnelInsurancePeriodModal } from "@/modules/personnel/components/EditPersonnelInsurancePeriodModal";
import { PersonnelAccountClosureSheet } from "@/modules/personnel/components/PersonnelAccountClosureSheet";
import { PersonnelManagementSnapshotSection } from "@/modules/personnel/components/PersonnelManagementSnapshotSection";
import { PersonnelNotesTab } from "@/modules/personnel/components/PersonnelNotesTab";
import {
  personnelNationalIdPhotoUrl,
  personnelProfilePhotoUrl,
} from "@/modules/personnel/api/personnel-api";
import { PersonnelProfilePhotoAvatar } from "@/modules/personnel/components/PersonnelProfilePhotoAvatar";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  useDeleteAdvance,
  usePersonnelAdvancesAll,
  usePersonnelInsurancePeriods,
  usePersonnelManagementSnapshot,
  usePersonnelYearAccountClosures,
  useReopenPersonnelYearAccount,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { useDeleteBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import {
  useUpdateWarehouse,
  warehouseKeys,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import type { Advance } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel, PersonnelInsurancePeriod } from "@/types/personnel";
import type { PersonnelYearAccountClosureListItem } from "@/types/personnel-account-closure";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import {
  parseSettlementSeasonYearChoice,
  settlementSeasonYearSelectOptions,
} from "@/modules/personnel/lib/settlement-print-season";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
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
import { useQuery } from "@tanstack/react-query";
import { useMatchMedia } from "@/shared/lib/use-match-media";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const TITLE_ID = "personnel-detail-modal-title";
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;

export type PersonnelDetailTabId =
  | "profile"
  | "insurance"
  /** Avans listesi + personele yazılmış gider satırları (tek sekme). */
  | "costs"
  /** Takvim yılı hesap kesimi (kapanış) kayıtları. */
  | "yearClosures"
  | "notes"
  | "roles";

type TabId = PersonnelDetailTabId;

function formatOptionalIso(
  iso: string | null | undefined,
  dash: string,
  locale: Locale,
): string {
  if (iso == null || String(iso).trim() === "") return dash;
  return formatLocaleDate(String(iso), locale, dash);
}

function formatHireDate(p: Personnel, dash: string, locale: Locale): string {
  if (!p.hireDate) return dash;
  return formatLocaleDate(p.hireDate, locale, dash);
}

function formatSalary(p: Personnel, dash: string, locale: Locale): string {
  if (p.salary == null) return dash;
  return formatMoneyDash(p.salary, dash, locale);
}

function formatAdvanceDay(iso: string, locale: Locale, dash: string): string {
  return formatLocaleDate(iso, locale, dash);
}

function attributedExpenseRowIsAdvance(row: BranchTransaction): boolean {
  const cat = String(row.category ?? "").trim().toUpperCase();
  if (cat === "PER_ADVANCE") return true;
  const lid = row.linkedAdvanceId;
  return lid != null && lid > 0;
}

function sortAdvancesDesc(rows: Advance[]): Advance[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

function formatYearClosureSalarySummary(
  row: PersonnelYearAccountClosureListItem,
  locale: Locale,
  t: (k: string) => string,
  dash: string,
): string {
  const hasData =
    row.closureWorkedDays != null ||
    row.closureExpectedSalaryAmount != null ||
    row.salaryBalanceSettled ||
    (row.salaryPaymentSourceType?.trim()?.length ?? 0) > 0;
  if (!hasData) return dash;

  const bits: string[] = [];
  if (row.closureWorkedDays != null) bits.push(`${row.closureWorkedDays}d`);
  if (row.closureExpectedSalaryAmount != null) {
    bits.push(
      formatLocaleAmount(
        row.closureExpectedSalaryAmount,
        locale,
        row.closureExpectedSalaryCurrency || "TRY",
      ),
    );
  }
  bits.push(
    row.salaryBalanceSettled
      ? t("personnel.yearClosuresSalarySettledYes")
      : t("personnel.yearClosuresSalarySettledNo"),
  );
  const st = row.salaryPaymentSourceType?.trim();
  if (st) bits.push(st);
  return bits.join(" · ");
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_POCKET")
    return t("personnel.advanceSourceAbbrPersonnelPocket");
  return t("personnel.advanceSourceAbbrCash");
}

function nationalIdFileExt(mime: string): string {
  const s = mime.toLowerCase();
  if (s.includes("png")) return "png";
  if (s.includes("jpeg") || s.includes("jpg")) return "jpg";
  if (s.includes("webp")) return "webp";
  if (s.includes("gif")) return "gif";
  return "jpg";
}

function IconNationalIdDownload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconNationalIdExpand({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}

const nationalIdIconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-40";

function NationalIdPreviewImg({
  href,
  emptyLabel,
  loadingLabel,
  fileBaseName,
  lightboxTitle,
  enlargeLabel,
  downloadLabel,
  closeLabel,
}: {
  href: string | null;
  emptyLabel: string;
  loadingLabel: string;
  fileBaseName: string;
  lightboxTitle: string;
  enlargeLabel: string;
  downloadLabel: string;
  closeLabel: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxTitleId = useId();

  useEffect(() => {
    if (!href) {
      blobRef.current = null;
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const ac = new AbortController();
    void apiFetch(href, { signal: ac.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (ac.signal.aborted || !blob) return;
        blobRef.current = blob;
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch((e: unknown) => {
        const isAbort =
          ac.signal.aborted ||
          (typeof e === "object" &&
            e !== null &&
            "name" in e &&
            (e as { name: string }).name === "AbortError");
        if (isAbort) return;
        console.error(e);
      });
    return () => {
      ac.abort();
      blobRef.current = null;
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [href]);

  const runDownload = useCallback(() => {
    const blob = blobRef.current;
    const url = src;
    if (!blob || !url) return;
    const ext = nationalIdFileExt(blob.type || "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.${ext}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [fileBaseName, src]);

  if (!href) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
  }
  if (!src) {
    return <span className="text-xs text-zinc-400">{loadingLabel}</span>;
  }

  return (
    <>
      <div className="w-full max-w-[18rem]">
        <div className="mb-1 flex justify-end gap-1">
          <button
            type="button"
            className={nationalIdIconBtn}
            aria-label={enlargeLabel}
            onClick={() => setLightboxOpen(true)}
          >
            <IconNationalIdExpand className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={nationalIdIconBtn}
            aria-label={downloadLabel}
            onClick={runDownload}
          >
            <IconNationalIdDownload className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="block w-full cursor-zoom-in rounded-lg border border-zinc-200 p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          aria-label={enlargeLabel}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={src}
            alt=""
            className="max-h-52 w-full rounded-lg object-contain"
          />
        </button>
      </div>
      <Modal
        nested
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        titleId={lightboxTitleId}
        title={lightboxTitle}
        closeButtonLabel={closeLabel}
        wide
        className="!max-w-[min(100vw-1rem,56rem)]"
      >
        <div className="flex justify-center px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
          <img
            src={src}
            alt=""
            className="max-h-[min(85dvh,48rem)] w-auto max-w-full object-contain"
          />
        </div>
      </Modal>
    </>
  );
}

function normalizePositiveUserId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function hasLinkedSystemUser(p: Personnel): boolean {
  return normalizePositiveUserId(p.userId) != null;
}

function depotRolePhrase(
  tags: readonly string[],
  t: (k: string) => string,
): string {
  const hasM = tags.includes("manager");
  const hasS = tags.includes("master");
  if (hasM && hasS) return t("personnel.detailRolesStoryDepotRolesBoth");
  if (hasM) return t("personnel.detailRolesStoryDepotRolesManager");
  return t("personnel.detailRolesStoryDepotRolesMaster");
}

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  branchNameById: Map<number, string>;
  /** Açılışta seçilecek sekme (varsayılan: profile). */
  initialTab?: PersonnelDetailTabId;
};

export function PersonnelDetailModal({
  open,
  onClose,
  personnel,
  branchNameById,
  initialTab = "profile",
}: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const [tab, setTab] = useState<TabId>("profile");
  /** Avans + gider tabloları — PDF’den bağımsız sezon/turizm yılı filtresi. */
  const [costsListSeason, setCostsListSeason] = useState("");
  /** Yalnızca «Yazdır / PDF» — tüm dönem veya seçilen yıl. */
  const [pdfScopeSeason, setPdfScopeSeason] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [advPage, setAdvPage] = useState(1);
  /** null = automatic page size (20 narrow / 10 desktop) */
  const [advPageSize, setAdvPageSize] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [accountClosureOpen, setAccountClosureOpen] = useState(false);
  /** true: «Kesilen hesaplar»dan açıldı — doğrudan yıl özeti (2. adım). */
  const [accountClosureYearSummary, setAccountClosureYearSummary] =
    useState(false);
  const isNarrow = useMatchMedia("(max-width: 767px)");
  const autoAdvPageSize = isNarrow ? "20" : "10";
  const advPageSizeVal = advPageSize ?? autoAdvPageSize;
  const [rolesSearch, setRolesSearch] = useState("");
  const debouncedRolesSearch = useDebouncedValue(rolesSearch.trim(), 200);
  const [assignWarehouseId, setAssignWarehouseId] = useState("");
  const [assignRole, setAssignRole] = useState<"manager" | "master" | "both">(
    "manager",
  );
  const [orgTxOpen, setOrgTxOpen] = useState(false);
  const [detailAdvanceOpen, setDetailAdvanceOpen] = useState(false);
  const [insuranceAddOpen, setInsuranceAddOpen] = useState(false);
  const [insuranceEditPeriod, setInsuranceEditPeriod] =
    useState<PersonnelInsurancePeriod | null>(null);
  const [photoViewNonce, setPhotoViewNonce] = useState(0);
  const insurancePid = personnel?.id ?? 0;
  const { data: insurancePeriods = [], isPending: insurancePeriodsPending } =
    usePersonnelInsurancePeriods(
      insurancePid,
      open && insurancePid > 0 && tab === "insurance",
    );
  const updateWhMut = useUpdateWarehouse();

  useEffect(() => {
    if (!open || !personnel) return;
    setPhotoViewNonce(Date.now());
  }, [open, personnel]);

  const pid = personnel?.id ?? 0;
  const {
    data: advancesRaw = [],
    isPending: advLoading,
    isError: advError,
    error: advErr,
  } = usePersonnelAdvancesAll(open && pid > 0 ? pid : null);

  const {
    data: mgmtSnap,
    isPending: mgmtSnapLoading,
    isError: mgmtSnapError,
    error: mgmtSnapErr,
  } = usePersonnelManagementSnapshot(
    open && pid > 0 ? pid : null,
    open && pid > 0,
  );

  const {
    data: attributedExpenses = [],
    isPending: attrExpLoading,
    isError: attrExpError,
    error: attrExpErr,
  } = useQuery({
    queryKey: ["personnel", "attributed-expenses", pid],
    queryFn: () => fetchPersonnelAttributedExpenses(pid),
    enabled: open && pid > 0 && tab === "costs",
  });

  const reopenYearMut = useReopenPersonnelYearAccount(pid);
  const deleteAdvanceMut = useDeleteAdvance();
  const deleteTxMut = useDeleteBranchTransaction();
  const {
    data: yearClosures = [],
    isPending: yearClosuresLoading,
    isError: yearClosuresError,
    error: yearClosuresErr,
  } = usePersonnelYearAccountClosures(
    pid,
    open && pid > 0 && tab === "yearClosures",
  );

  const attributedNonAdvanceExpensesBase = useMemo(
    () =>
      attributedExpenses.filter((r) => !attributedExpenseRowIsAdvance(r)),
    [attributedExpenses],
  );

  const attributedNonAdvanceExpensesForCostsTab = useMemo(() => {
    const y = parseSettlementSeasonYearChoice(costsListSeason);
    if (y == null) return attributedNonAdvanceExpensesBase;
    return attributedNonAdvanceExpensesBase.filter((r) => {
      const td = String(r.transactionDate ?? "").trim();
      const ty = td.length >= 4 ? parseInt(td.slice(0, 4), 10) : NaN;
      return Number.isFinite(ty) && ty === y;
    });
  }, [attributedNonAdvanceExpensesBase, costsListSeason]);

  const filteredExpensesForCostsCombo = useMemo(() => {
    let rows = attributedNonAdvanceExpensesForCostsTab;
    const br = branchFilter.trim();
    if (br) {
      const bid = parseInt(br, 10);
      if (Number.isFinite(bid) && bid > 0) {
        rows = rows.filter((r) => r.branchId != null && r.branchId === bid);
      }
    }
    return rows;
  }, [attributedNonAdvanceExpensesForCostsTab, branchFilter]);

  const handoverCashRows = useMemo(() => {
    if (!mgmtSnap) return [];
    return mgmtSnap.byCurrency.filter(
      (r) => r.totalCashHandoverAsResponsibleAllTime > 0,
    );
  }, [mgmtSnap]);

  const primaryHandoverRow = useMemo(() => {
    if (!mgmtSnap || handoverCashRows.length === 0) return null;
    const pc = mgmtSnap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
    return (
      handoverCashRows.find((r) => r.currencyCode.toUpperCase() === pc) ??
      handoverCashRows[0]
    );
  }, [mgmtSnap, handoverCashRows]);

  const handoverOtherCurrenciesLine = useMemo(() => {
    if (!primaryHandoverRow || handoverCashRows.length <= 1) return "";
    const rest = handoverCashRows.filter(
      (r) =>
        r.currencyCode.toUpperCase() !==
        primaryHandoverRow.currencyCode.toUpperCase(),
    );
    return rest
      .map((r) => {
        const amt = formatMoneyDash(
          r.totalCashHandoverAsResponsibleAllTime,
          dash,
          locale,
          r.currencyCode,
        );
        return `${r.currencyCode} ${amt}`;
      })
      .join(" · ");
  }, [primaryHandoverRow, handoverCashRows, dash, locale]);

  const orderedLinkedBranchIds = useMemo(() => {
    const raw = mgmtSnap?.linkedBranchIds ?? [];
    const bid = personnel?.branchId;
    if (bid != null && bid > 0 && raw.includes(bid)) {
      const rest = raw.filter((id) => id !== bid).sort((a, b) => a - b);
      return [bid, ...rest];
    }
    return [...raw].sort((a, b) => a - b);
  }, [mgmtSnap?.linkedBranchIds, personnel?.branchId]);

  const { data: warehouses = [], isPending: whLoading } = useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: fetchWarehouses,
    enabled: open && personnel != null && tab === "roles",
  });

  useEffect(() => {
    if (!open || !personnel) return;
    setTab(initialTab);
    setCostsListSeason("");
    setPdfScopeSeason("");
    setBranchFilter("");
    setSourceFilter("");
    setAdvPage(1);
    setAdvPageSize(null);
    setRolesSearch("");
    setAssignWarehouseId("");
    setAssignRole("manager");
    setDetailAdvanceOpen(false);
  }, [open, personnel?.id, initialTab]);

  const seasonScopeSelectOptions = useMemo(
    () => settlementSeasonYearSelectOptions(t),
    [t]
  );

  useEffect(() => {
    setAdvPage(1);
  }, [costsListSeason, branchFilter, sourceFilter, advPageSizeVal]);

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailAdvancesAnyBranch") },
      ...[...branchNameById.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], locale === "tr" ? "tr" : "en"))
        .map(([id, name]) => ({ value: String(id), label: name })),
    ],
    [branchNameById, locale, t],
  );

  const sourceOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailSourceAll") },
      { value: "CASH", label: t("personnel.detailAdvanceSourceFilterBranch") },
      { value: "PATRON", label: t("personnel.detailAdvanceSourceFilterPatron") },
    ],
    [t],
  );

  const filteredAdvances = useMemo(() => {
    let rows = sortAdvancesDesc(advancesRaw);
    const yn = parseSettlementSeasonYearChoice(costsListSeason);
    if (yn != null) {
      rows = rows.filter((a) => a.effectiveYear === yn);
    }
    const br = branchFilter.trim();
    if (br) {
      const bid = parseInt(br, 10);
      if (Number.isFinite(bid) && bid > 0) {
        rows = rows.filter((a) => a.branchId != null && a.branchId === bid);
      }
    }
    const sf = sourceFilter.trim().toUpperCase();
    if (sf === "CASH" || sf === "PATRON") {
      rows = rows.filter((a) => a.sourceType.toUpperCase() === sf);
    }
    return rows;
  }, [advancesRaw, costsListSeason, branchFilter, sourceFilter]);

  const combinedCostsRows = useMemo(() => {
    const advPart = filteredAdvances.map((advance) => ({
      kind: "advance" as const,
      advance,
    }));
    const expPart = filteredExpensesForCostsCombo.map((tx) => ({
      kind: "expense" as const,
      tx,
    }));
    const sortKey = (
      r: (typeof advPart)[number] | (typeof expPart)[number],
    ) =>
      r.kind === "advance"
        ? r.advance.advanceDate.slice(0, 10)
        : String(r.tx.transactionDate ?? "").slice(0, 10);
    const rowId = (r: (typeof advPart)[number] | (typeof expPart)[number]) =>
      r.kind === "advance" ? r.advance.id : r.tx.id;
    return [...advPart, ...expPart].sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      if (ka !== kb) return kb.localeCompare(ka);
      return rowId(b) - rowId(a);
    });
  }, [filteredAdvances, filteredExpensesForCostsCombo]);

  const advSize =
    PAGE_SIZE_OPTIONS.find((n) => String(n) === advPageSizeVal) ??
    PAGE_SIZE_OPTIONS[0];
  const advTotalPages = Math.max(
    1,
    Math.ceil(combinedCostsRows.length / advSize),
  );

  useEffect(() => {
    setAdvPage((p) => Math.min(p, advTotalPages));
  }, [advTotalPages]);

  const advSafePage = Math.min(advPage, advTotalPages);
  const costsSlice = useMemo(() => {
    const start = (advSafePage - 1) * advSize;
    return combinedCostsRows.slice(start, start + advSize);
  }, [combinedCostsRows, advSafePage, advSize]);

  const warehouseAssignOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailRolesAssignWarehousePick") },
      ...[...warehouses]
        .sort((a, b) =>
          a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"),
        )
        .map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, locale, t],
  );

  const roleAssignOptions = useMemo(
    () => [
      { value: "manager", label: t("personnel.detailRolesAssignRoleManager") },
      { value: "master", label: t("personnel.detailRolesAssignRoleMaster") },
      { value: "both", label: t("personnel.detailRolesAssignRoleBoth") },
    ],
    [t],
  );

  const warehouseRoles = useMemo(() => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid) return [];
    const q = debouncedRolesSearch.toLowerCase();
    return warehouses
      .filter((w) => {
        const mgr = normalizePositiveUserId(w.responsibleManagerUserId);
        const mst = normalizePositiveUserId(w.responsibleMasterUserId);
        if (mgr !== uid && mst !== uid) return false;
        if (!q) return true;
        return w.name.toLowerCase().includes(q);
      })
      .map((w) => {
        const tags: string[] = [];
        if (normalizePositiveUserId(w.responsibleManagerUserId) === uid)
          tags.push("manager");
        if (normalizePositiveUserId(w.responsibleMasterUserId) === uid)
          tags.push("master");
        return { warehouse: w, tags };
      })
      .sort((a, b) =>
        a.warehouse.name.localeCompare(
          b.warehouse.name,
          locale === "tr" ? "tr" : "en",
        ),
      );
  }, [warehouses, personnel?.userId, debouncedRolesSearch, locale]);

  const pageSizeSelectOptions = useMemo(
    () =>
      PAGE_SIZE_OPTIONS.map((n) => ({
        value: String(n),
        label: t("personnel.detailPageSizeOption").replace("{n}", String(n)),
      })),
    [t],
  );

  const advFiltersActive = useMemo(
    () =>
      Boolean(
        costsListSeason.trim() ||
        branchFilter.trim() ||
        sourceFilter.trim() ||
        (advPageSize !== null && advPageSizeVal !== autoAdvPageSize),
      ),
    [
      costsListSeason,
      branchFilter,
      sourceFilter,
      advPageSize,
      advPageSizeVal,
      autoAdvPageSize,
    ],
  );

  const confirmDeletePersonnelAdvance = useCallback(
    (advanceId: number) => {
      if (!personnel) return;
      notifyConfirmToast({
        toastId: `personnel-advance-del-${personnel.id}-${advanceId}`,
        message: t("personnel.detailAdvanceDeleteConfirm"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("branch.txDeleteConfirm"),
        tone: "warning",
        onConfirm: async () => {
          try {
            await deleteAdvanceMut.mutateAsync(advanceId);
            notify.success(t("toast.advanceDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [deleteAdvanceMut, personnel, t],
  );

  const confirmDeletePersonnelExpenseTx = useCallback(
    (transactionId: number) => {
      if (!personnel) return;
      notifyConfirmToast({
        toastId: `personnel-tx-del-${personnel.id}-${transactionId}`,
        message: t("branch.txDeleteSure"),
        cancelLabel: t("branch.txDeleteCancel"),
        confirmLabel: t("branch.txDeleteConfirm"),
        tone: "warning",
        onConfirm: async () => {
          try {
            await deleteTxMut.mutateAsync(transactionId);
            notify.success(t("toast.branchTxDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [deleteTxMut, personnel, t],
  );

  const runSettlementPrint = useCallback(async () => {
    if (!personnel) return;
    const y = parseSettlementSeasonYearChoice(pdfScopeSeason);
    if (pdfScopeSeason.trim() !== "" && y == null) {
      notify.error(t("personnel.effectiveYearInvalid"));
      return;
    }
    setPrintBusy(true);
    try {
      await openPersonnelSettlementPrintWindow({
        target: {
          scope: "personnel",
          personnelId: personnel.id,
          title: personnelDisplayName(personnel),
          seasonArrivalDate: personnel.seasonArrivalDate,
          ...(y != null ? { seasonYearFilter: y } : {}),
        },
        locale,
        branchNameById,
        t,
      });
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPrintBusy(false);
    }
  }, [personnel, pdfScopeSeason, locale, branchNameById, t]);

  const runAssignWarehouse = async () => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid || !personnel) return;
    const wid = parseInt(assignWarehouseId, 10);
    if (!Number.isFinite(wid) || wid <= 0) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    const w = warehouses.find((x) => x.id === wid);
    if (!w) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    let mgr =
      w.responsibleManagerUserId != null && w.responsibleManagerUserId > 0
        ? w.responsibleManagerUserId
        : null;
    let mst =
      w.responsibleMasterUserId != null && w.responsibleMasterUserId > 0
        ? w.responsibleMasterUserId
        : null;
    if (assignRole === "manager" || assignRole === "both") mgr = uid;
    if (assignRole === "master" || assignRole === "both") mst = uid;
    try {
      await updateWhMut.mutateAsync({
        id: wid,
        input: {
          name: w.name.trim(),
          address: w.address?.trim() ? w.address.trim() : null,
          city: w.city?.trim() ? w.city.trim() : null,
          responsibleManagerUserId: mgr,
          responsibleMasterUserId: mst,
        },
      });
      notify.success(t("toast.warehouseUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const showCashHandoverBanner =
    !mgmtSnapLoading &&
    !mgmtSnapError &&
    primaryHandoverRow != null &&
    primaryHandoverRow.totalCashHandoverAsResponsibleAllTime > 0 &&
    mgmtSnap != null;

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      className={cn(
        "min-h-11 flex-1 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:min-w-[8rem]",
        tab === id
          ? "border-b-2 border-zinc-900 bg-zinc-50 text-zinc-900"
          : "border-b-2 border-transparent text-zinc-600 hover:bg-zinc-50/80",
      )}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

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
        className="!p-0"
      >
        {!personnel ? null : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 [-webkit-overflow-scrolling:touch] sm:px-6">
              <div
                role="tablist"
                className="sticky top-0 z-[1] -mx-4 mb-3 flex flex-wrap gap-1 border-b border-zinc-200 bg-white/95 px-4 py-1 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:px-6"
              >
                {tabBtn("profile", t("personnel.detailTabProfile"))}
                {tabBtn("insurance", t("personnel.detailTabInsurance"))}
                {tabBtn("costs", t("personnel.detailTabCosts"))}
                {tabBtn("yearClosures", t("personnel.detailTabYearClosures"))}
                {tabBtn("notes", t("personnel.detailTabNotes"))}
                {tabBtn("roles", t("personnel.detailTabRoles"))}
              </div>

              {tab !== "profile" && personnel.isDeleted ? (
                <div className="-mx-4 mb-3 flex flex-wrap items-center gap-2 px-4 sm:-mx-6 sm:px-6">
                  <StatusBadge tone="inactive">{t("personnel.badgePassive")}</StatusBadge>
                </div>
              ) : null}

              <div className="mb-3">
                {tab === "profile" ? (
                  <div className="space-y-3 pb-2">
                    <article
                      className={cn(
                        "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <PersonnelProfilePhotoAvatar
                          personnelId={personnel.id}
                          hasPhoto={personnel.hasProfilePhoto1}
                          nonce={photoViewNonce}
                          displayName={personnelDisplayName(personnel)}
                          photoLabel={t("personnel.profilePhotoAvatarAria")}
                          className="h-14 w-14 sm:h-16 sm:w-16"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={cn(
                                "text-base font-semibold text-zinc-900",
                                personnel.isDeleted && "text-zinc-600",
                              )}
                            >
                              {personnelDisplayName(personnel)}
                            </h3>
                            {personnel.isDeleted ? (
                              <StatusBadge tone="inactive">{t("personnel.badgePassive")}</StatusBadge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.tableJobTitle")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {t(`personnel.jobTitles.${personnel.jobTitle}`)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.tableCompanyHireDate")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {formatHireDate(personnel, dash, locale)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.tableSalary")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {formatSalary(personnel, dash, locale)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.tableBranch")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.branchId != null
                              ? (branchNameById.get(personnel.branchId) ??
                                `#${personnel.branchId}`)
                              : dash}
                          </dd>
                        </div>
                        {primaryHandoverRow &&
                        primaryHandoverRow.totalCashHandoverAsResponsibleAllTime >
                          0 ? (
                          <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
                            <dt className="text-zinc-500">
                              {t("personnel.detailProfileCashHandoverTotal")}
                            </dt>
                            <dd className="font-medium text-zinc-900 sm:text-left">
                              {formatMoneyDash(
                                primaryHandoverRow.totalCashHandoverAsResponsibleAllTime,
                                dash,
                                locale,
                                primaryHandoverRow.currencyCode,
                              )}
                              {mgmtSnap &&
                              mgmtSnap.cashHandoverResponsibleRecordCount > 0
                                ? ` · ${t(
                                    "personnel.detailProfileCashHandoverCount",
                                  ).replace(
                                    "{n}",
                                    String(
                                      mgmtSnap.cashHandoverResponsibleRecordCount,
                                    ),
                                  )}`
                                : null}
                            </dd>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.tableSystemUser")}
                          </dt>
                          <dd
                            className="truncate font-medium text-zinc-900 sm:text-left"
                            title={
                              hasLinkedSystemUser(personnel) &&
                              personnel.username
                                ? personnel.username
                                : undefined
                            }
                          >
                            {hasLinkedSystemUser(personnel) &&
                            personnel.username
                              ? personnel.username
                              : t("personnel.systemUserNone")}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.insuranceSectionTitle")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            <span>
                              {personnel.insuranceStarted
                                ? t("personnel.insuranceStatusStarted")
                                : t("personnel.insuranceStatusPending")}
                            </span>
                            <span className="mt-1 block text-xs font-normal text-zinc-500">
                              {t("personnel.detailInsuranceProfileHint")}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.fieldNationalId")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.nationalId?.trim()
                              ? personnel.nationalId.trim()
                              : dash}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.nationalIdCardGenerationLabel")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.nationalIdCardGeneration === "OLD"
                              ? t("personnel.nationalIdCardGenerationOld")
                              : personnel.nationalIdCardGeneration === "NEW"
                                ? t("personnel.nationalIdCardGenerationNew")
                                : dash}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.fieldBirthDate")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {formatOptionalIso(
                              personnel.birthDate,
                              dash,
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.fieldPhone")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.phone?.trim() ? (
                              <a
                                href={`tel:${personnel.phone.trim().replace(/\s+/g, "")}`}
                                className="text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800"
                              >
                                {personnel.phone.trim()}
                              </a>
                            ) : (
                              dash
                            )}
                          </dd>
                        </div>
                      </dl>
                    </article>

                    <article
                      className={cn(
                        "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <h4 className="text-sm font-semibold text-zinc-900">
                        {t("personnel.profilePhotosSectionTitle")}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("personnel.profilePhotosDetailViewHint")}
                      </p>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-600">
                            {t("personnel.profilePhotoSlot1")}
                          </p>
                          <div className="mt-1">
                            <NationalIdPreviewImg
                              href={
                                personnel.hasProfilePhoto1
                                  ? `${personnelProfilePhotoUrl(personnel.id, 1)}?_=${photoViewNonce}`
                                  : null
                              }
                              emptyLabel={t("personnel.profilePhotosNoFile")}
                              loadingLabel={t("common.loading")}
                              fileBaseName={`personnel-${personnel.id}-profile-1`}
                              lightboxTitle={t(
                                "personnel.profilePhotoLightbox1",
                              )}
                              enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                              downloadLabel={t(
                                "personnel.nationalIdPhotoDownload",
                              )}
                              closeLabel={t("common.close")}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-600">
                            {t("personnel.profilePhotoSlot2")}
                          </p>
                          <div className="mt-1">
                            <NationalIdPreviewImg
                              href={
                                personnel.hasProfilePhoto2
                                  ? `${personnelProfilePhotoUrl(personnel.id, 2)}?_=${photoViewNonce}`
                                  : null
                              }
                              emptyLabel={t("personnel.profilePhotosNoFile")}
                              loadingLabel={t("common.loading")}
                              fileBaseName={`personnel-${personnel.id}-profile-2`}
                              lightboxTitle={t(
                                "personnel.profilePhotoLightbox2",
                              )}
                              enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                              downloadLabel={t(
                                "personnel.nationalIdPhotoDownload",
                              )}
                              closeLabel={t("common.close")}
                            />
                          </div>
                        </div>
                      </div>
                    </article>

                    <article
                      className={cn(
                        "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <h4 className="text-sm font-semibold text-zinc-900">
                        {t("personnel.nationalIdPhotosSectionTitle")}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("personnel.nationalIdPhotosDetailViewHint")}
                      </p>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-600">
                            {t("personnel.nationalIdPhotosFront")}
                          </p>
                          <div className="mt-1">
                            <NationalIdPreviewImg
                              href={
                                personnel.hasNationalIdPhotoFront
                                  ? `${personnelNationalIdPhotoUrl(personnel.id, "front")}?_=${photoViewNonce}`
                                  : null
                              }
                              emptyLabel={t("personnel.nationalIdPhotosNoFile")}
                              loadingLabel={t("common.loading")}
                              fileBaseName={`personnel-${personnel.id}-national-id-front`}
                              lightboxTitle={t(
                                "personnel.nationalIdPhotoLightboxFront",
                              )}
                              enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                              downloadLabel={t(
                                "personnel.nationalIdPhotoDownload",
                              )}
                              closeLabel={t("common.close")}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-600">
                            {t("personnel.nationalIdPhotosBack")}
                          </p>
                          <div className="mt-1">
                            <NationalIdPreviewImg
                              href={
                                personnel.hasNationalIdPhotoBack
                                  ? `${personnelNationalIdPhotoUrl(personnel.id, "back")}?_=${photoViewNonce}`
                                  : null
                              }
                              emptyLabel={t("personnel.nationalIdPhotosNoFile")}
                              loadingLabel={t("common.loading")}
                              fileBaseName={`personnel-${personnel.id}-national-id-back`}
                              lightboxTitle={t(
                                "personnel.nationalIdPhotoLightboxBack",
                              )}
                              enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                              downloadLabel={t(
                                "personnel.nationalIdPhotoDownload",
                              )}
                              closeLabel={t("common.close")}
                            />
                          </div>
                        </div>
                      </div>
                    </article>

                    {showCashHandoverBanner &&
                    primaryHandoverRow &&
                    mgmtSnap &&
                    personnel ? (
                      <div
                        className="mb-3 shrink-0 rounded-2xl border-2 border-sky-600 bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-50 p-4 shadow-lg shadow-sky-900/15 ring-2 ring-sky-500/45 sm:p-5"
                        role="status"
                      >
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-950/90">
                          {t("personnel.detailCashHandoverBannerTitle")}
                        </p>
                        <p className="mt-2 text-base font-semibold leading-snug text-sky-950 sm:text-lg">
                          {t("personnel.detailCashHandoverBannerLead")
                            .replace("{name}", personnelDisplayName(personnel))
                            .replace(
                              "{total}",
                              formatMoneyDash(
                                primaryHandoverRow.totalCashHandoverAsResponsibleAllTime,
                                dash,
                                locale,
                                primaryHandoverRow.currencyCode,
                              ),
                            )
                            .replace("{ccy}", primaryHandoverRow.currencyCode)}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-sky-950/90">
                          {t("personnel.detailCashHandoverBannerSub")
                            .replace(
                              "{year}",
                              String(mgmtSnap.currentCalendarYear),
                            )
                            .replace(
                              "{ytd}",
                              formatMoneyDash(
                                primaryHandoverRow.totalCashHandoverAsResponsibleYearToDate,
                                dash,
                                locale,
                                primaryHandoverRow.currencyCode,
                              ),
                            )
                            .replace(
                              "{count}",
                              String(
                                mgmtSnap.cashHandoverResponsibleRecordCount,
                              ),
                            )}
                        </p>
                        {handoverOtherCurrenciesLine ? (
                          <p className="mt-2 text-xs font-medium text-sky-950/85">
                            {t(
                              "personnel.detailCashHandoverBannerOther",
                            ).replace("{list}", handoverOtherCurrenciesLine)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <PersonnelManagementSnapshotSection
                      personnel={personnel}
                      open={open}
                    />
                  </div>
                ) : tab === "insurance" ? (
                  <div className="space-y-3 pb-2">
                    <article
                      className={cn(
                        "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <h4 className="text-sm font-semibold text-zinc-900">
                        {t("personnel.insuranceSectionTitle")}
                      </h4>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.insuranceStatusFieldLabel")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.insuranceStarted
                              ? t("personnel.insuranceStatusStarted")
                              : t("personnel.insuranceStatusPending")}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.insuranceCurrentOpenStart")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {formatOptionalIso(
                              personnel.insuranceStartDate,
                              dash,
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.insuranceCurrentOpenEnd")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {!personnel.insuranceStarted
                              ? dash
                              : personnel.insuranceEndDate == null ||
                                  String(personnel.insuranceEndDate).trim() ===
                                    ""
                                ? t("personnel.insuranceOngoing")
                                : formatOptionalIso(
                                    personnel.insuranceEndDate,
                                    dash,
                                    locale,
                                  )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t("personnel.insuranceIntakeDetailLabel")}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {formatOptionalIso(
                              personnel.insuranceIntakeStartDate,
                              dash,
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
                          <dt className="text-zinc-500">
                            {t(
                              "personnel.insuranceAccountingNotifiedDetailLabel",
                            )}
                          </dt>
                          <dd className="font-medium text-zinc-900 sm:text-left">
                            {personnel.insuranceAccountingNotified
                              ? t("personnel.insuranceAccountingNotifiedYes")
                              : t("personnel.insuranceAccountingNotifiedNo")}
                          </dd>
                        </div>
                      </dl>
                    </article>
                    <article
                      className={cn(
                        "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200 bg-white",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-zinc-900">
                          {t("personnel.insurancePeriodsTitle")}
                        </h4>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 shrink-0"
                          disabled={personnel.isDeleted}
                          onClick={() => setInsuranceAddOpen(true)}
                        >
                          {t("personnel.insurancePeriodsAdd")}
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("personnel.insurancePeriodsIntro")}
                      </p>
                      {insurancePeriodsPending ? (
                        <p className="mt-3 text-sm text-zinc-500">
                          {t("common.loading")}
                        </p>
                      ) : insurancePeriods.length === 0 ? (
                        <p className="mt-3 text-sm text-zinc-500">
                          {t("personnel.insurancePeriodsEmpty")}
                        </p>
                      ) : (
                        <div className="mt-3 -mx-1 overflow-x-auto px-1">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableHeader>
                                  {t("personnel.insurancePeriodColStart")}
                                </TableHeader>
                                <TableHeader>
                                  {t("personnel.insurancePeriodColEnd")}
                                </TableHeader>
                                <TableHeader className="min-w-[7rem]">
                                  {t("personnel.insurancePeriodColBranch")}
                                </TableHeader>
                                <TableHeader className="min-w-[8rem]">
                                  {t("personnel.insurancePeriodColNotes")}
                                </TableHeader>
                                <TableHeader className="w-[1%] whitespace-nowrap text-right">
                                  {t("personnel.insurancePeriodColActions")}
                                </TableHeader>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {insurancePeriods.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell
                                    dataLabel={t("personnel.insurancePeriodColStart")}
                                    className="whitespace-nowrap text-zinc-700"
                                  >
                                    {formatLocaleDate(
                                      row.coverageStartDate,
                                      locale,
                                      dash,
                                    )}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.insurancePeriodColEnd")}
                                    className="whitespace-nowrap text-zinc-700"
                                  >
                                    {row.coverageEndDate == null ||
                                    String(row.coverageEndDate).trim() === ""
                                      ? t("personnel.insuranceOngoing")
                                      : formatLocaleDate(
                                          row.coverageEndDate,
                                          locale,
                                          dash,
                                        )}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.insurancePeriodColBranch")}
                                    className="max-w-[10rem] truncate text-zinc-700"
                                    title={
                                      row.registeredBranchName?.trim() ??
                                      undefined
                                    }
                                  >
                                    {row.registeredBranchName?.trim()
                                      ? row.registeredBranchName.trim()
                                      : dash}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.insurancePeriodColNotes")}
                                    className="max-w-[14rem] truncate text-zinc-600"
                                    title={row.notes ?? undefined}
                                  >
                                    {row.notes?.trim()
                                      ? row.notes.trim()
                                      : dash}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.insurancePeriodColActions")}
                                    className="text-right"
                                  >
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="min-h-9 px-2.5 text-xs"
                                      disabled={personnel.isDeleted}
                                      onClick={() => setInsuranceEditPeriod(row)}
                                    >
                                      {t("personnel.insurancePeriodRowEdit")}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </article>
                  </div>
                ) : tab === "costs" ? (
                  <div className="space-y-8 pb-2">
                    <div className="flex flex-col gap-3">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                        <Select
                          name="personnelDetailPdfScopeSeason"
                          label={t("personnel.detailPdfScopeLabel")}
                          options={seasonScopeSelectOptions}
                          value={pdfScopeSeason}
                          onChange={(e) => setPdfScopeSeason(e.target.value)}
                          onBlur={() => {}}
                        />
                        <p className="mt-2 text-xs text-zinc-500">
                          {t("personnel.detailPdfScopeHint")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-900/5">
                        <Select
                          name="personnelDetailCostsListSeason"
                          label={t("personnel.detailCostsListSeasonLabel")}
                          options={seasonScopeSelectOptions}
                          value={costsListSeason}
                          onChange={(e) => setCostsListSeason(e.target.value)}
                          onBlur={() => {}}
                        />
                        <p className="mt-2 text-xs text-zinc-500">
                          {t("personnel.detailCostsListSeasonHint")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={printBusy || personnel.isDeleted}
                          onClick={() => {
                            setAccountClosureYearSummary(false);
                            setAccountClosureOpen(true);
                          }}
                        >
                          {t("personnel.accountClosure.openButton")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={printBusy}
                          onClick={() => void runSettlementPrint()}
                        >
                          {t("personnel.settlementPrintOpen")}
                        </Button>
                      </div>
                    </div>

                    <section className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {t("personnel.detailTabCosts")}
                        </h3>
                        {!personnel.isDeleted ? (
                          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-10 shrink-0"
                              onClick={() => setDetailAdvanceOpen(true)}
                            >
                              {t("personnel.detailCostsGiveAdvance")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-10 shrink-0"
                              onClick={() => setOrgTxOpen(true)}
                            >
                              {t("personnel.detailCostsAddExpense")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <CollapsibleMobileFilters
                        title={t("personnel.detailAdvancesFilters")}
                        toggleAriaLabel={t("common.filters")}
                        active={advFiltersActive}
                        resetKey={personnel.id}
                        expandLabel={t("common.filtersShow")}
                        collapseLabel={t("common.filtersHide")}
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <Select
                            name="advBranch"
                            label={t("personnel.tableBranch")}
                            options={branchOptions}
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            onBlur={() => {}}
                          />
                          <Select
                            name="advSource"
                            label={t("personnel.sourceType")}
                            options={sourceOptions}
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            onBlur={() => {}}
                          />
                          <Select
                            name="advPageSize"
                            label={t("personnel.detailPageSize")}
                            options={pageSizeSelectOptions}
                            value={advPageSizeVal}
                            onChange={(e) => setAdvPageSize(e.target.value)}
                            onBlur={() => {}}
                          />
                        </div>
                      </CollapsibleMobileFilters>

                      {advLoading || attrExpLoading ? (
                        <p className="text-sm text-zinc-500">
                          {t("common.loading")}
                        </p>
                      ) : advError || attrExpError ? (
                        <div className="space-y-1 text-sm text-red-600">
                          {advError ? (
                            <p>{toErrorMessage(advErr)}</p>
                          ) : null}
                          {attrExpError ? (
                            <p>{toErrorMessage(attrExpErr)}</p>
                          ) : null}
                        </div>
                      ) : combinedCostsRows.length === 0 ? (
                        <p className="text-sm text-zinc-600">
                          {t("personnel.detailCostsCombinedEmpty")}
                        </p>
                      ) : (
                        <>
                          <div className="space-y-3 md:hidden">
                            {costsSlice.map((row) =>
                              row.kind === "advance" ? (
                                <article
                                  key={`a-${row.advance.id}`}
                                  className="rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                        "border-amber-200 bg-amber-50 text-amber-900",
                                      )}
                                    >
                                      {t("personnel.detailExpenseBadgeAdvance")}
                                    </span>
                                    <span className="tabular-nums text-zinc-800">
                                      {formatAdvanceDay(
                                        row.advance.advanceDate,
                                        locale,
                                        dash,
                                      )}
                                    </span>
                                  </div>
                                  <p className="mt-2 font-mono font-medium text-zinc-900">
                                    {formatMoneyDash(
                                      row.advance.amount,
                                      dash,
                                      locale,
                                      row.advance.currencyCode,
                                    )}{" "}
                                    <span className="text-xs font-normal text-zinc-500">
                                      {row.advance.currencyCode}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {sourceAbbrev(t, row.advance.sourceType)} ·{" "}
                                    {row.advance.effectiveYear}
                                    {row.advance.description?.trim()
                                      ? ` · ${row.advance.description.trim()}`
                                      : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {row.advance.branchId != null &&
                                    row.advance.branchId > 0
                                      ? (branchNameById.get(row.advance.branchId) ??
                                        `#${row.advance.branchId}`)
                                      : dash}
                                  </p>
                                  {!personnel.isDeleted ? (
                                    <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
                                      <button
                                        type="button"
                                        className={trashIconActionButtonClass}
                                        aria-label={t("branch.txDeleteAria")}
                                        disabled={deleteAdvanceMut.isPending}
                                        onClick={() =>
                                          confirmDeletePersonnelAdvance(
                                            row.advance.id,
                                          )
                                        }
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    </div>
                                  ) : null}
                                </article>
                              ) : (
                                <article
                                  key={`e-${row.tx.id}`}
                                  className="rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                        "border-violet-200 bg-violet-50 text-violet-900",
                                      )}
                                    >
                                      {t("personnel.detailExpenseBadgeExpense")}
                                    </span>
                                    <span className="tabular-nums text-zinc-800">
                                      {formatLocaleDate(
                                        row.tx.transactionDate,
                                        locale,
                                      )}
                                    </span>
                                  </div>
                                  <p className="mt-2 font-mono font-medium text-zinc-900">
                                    {formatMoneyDash(
                                      row.tx.amount,
                                      dash,
                                      locale,
                                      row.tx.currencyCode,
                                    )}{" "}
                                    <span className="text-xs font-normal text-zinc-500">
                                      {row.tx.currencyCode}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-800">
                                    {txCategoryLine(
                                      row.tx.mainCategory,
                                      row.tx.category,
                                      t,
                                    )}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {row.tx.branchId != null && row.tx.branchId > 0
                                      ? (branchNameById.get(row.tx.branchId) ??
                                        `#${row.tx.branchId}`)
                                      : t("personnel.detailExpenseBranchNone")}
                                  </p>
                                  {!personnel.isDeleted ? (
                                    <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
                                      <button
                                        type="button"
                                        className={trashIconActionButtonClass}
                                        aria-label={t("branch.txDeleteAria")}
                                        disabled={deleteTxMut.isPending}
                                        onClick={() =>
                                          confirmDeletePersonnelExpenseTx(
                                            row.tx.id,
                                          )
                                        }
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
                                    </div>
                                  ) : null}
                                </article>
                              ),
                            )}
                          </div>
                          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200/90 md:block">
                            <Table className="min-w-[48rem] border-0">
                              <TableHead>
                                <TableRow>
                                  <TableHeader className="w-[1%] whitespace-nowrap">
                                    {t("personnel.detailExpenseColKind")}
                                  </TableHeader>
                                  <TableHeader>
                                    {t("personnel.advanceDate")}
                                  </TableHeader>
                                  <TableHeader>
                                    {t("personnel.detailCostsColDetail")}
                                  </TableHeader>
                                  <TableHeader>
                                    {t("personnel.tableBranch")}
                                  </TableHeader>
                                  <TableHeader className="text-right">
                                    {t("personnel.amount")}
                                  </TableHeader>
                                  <TableHeader>
                                    {t("personnel.advanceCurrency")}
                                  </TableHeader>
                                  {!personnel.isDeleted ? (
                                    <TableHeader className="w-[1%] text-center text-xs font-medium text-zinc-500">
                                      {t("branch.txColActions")}
                                    </TableHeader>
                                  ) : null}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {costsSlice.map((row) =>
                                  row.kind === "advance" ? (
                                    <TableRow key={`a-${row.advance.id}`}>
                                      <TableCell className="align-middle">
                                        <span
                                          className={cn(
                                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                            "border-amber-200 bg-amber-50 text-amber-900",
                                          )}
                                        >
                                          {t(
                                            "personnel.detailExpenseBadgeAdvance",
                                          )}
                                        </span>
                                      </TableCell>
                                      <TableCell className="whitespace-nowrap">
                                        {formatAdvanceDay(
                                          row.advance.advanceDate,
                                          locale,
                                          dash,
                                        )}
                                      </TableCell>
                                      <TableCell className="max-w-[18rem] text-sm text-zinc-700">
                                        <span className="text-zinc-600">
                                          {sourceAbbrev(
                                            t,
                                            row.advance.sourceType,
                                          )}{" "}
                                          · {row.advance.effectiveYear}
                                        </span>
                                        {row.advance.description?.trim() ? (
                                          <span className="mt-0.5 block text-xs text-zinc-500">
                                            {row.advance.description.trim()}
                                          </span>
                                        ) : null}
                                      </TableCell>
                                      <TableCell>
                                        {row.advance.branchId != null &&
                                        row.advance.branchId > 0
                                          ? (branchNameById.get(
                                              row.advance.branchId,
                                            ) ?? `#${row.advance.branchId}`)
                                          : dash}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums font-medium">
                                        {formatMoneyDash(
                                          row.advance.amount,
                                          dash,
                                          locale,
                                          row.advance.currencyCode,
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {row.advance.currencyCode}
                                      </TableCell>
                                      {!personnel.isDeleted ? (
                                        <TableCell className="p-2 text-center align-middle">
                                          <button
                                            type="button"
                                            className={trashIconActionButtonClass}
                                            aria-label={t("branch.txDeleteAria")}
                                            disabled={deleteAdvanceMut.isPending}
                                            onClick={() =>
                                              confirmDeletePersonnelAdvance(
                                                row.advance.id,
                                              )
                                            }
                                          >
                                            <TrashIcon className="h-5 w-5" />
                                          </button>
                                        </TableCell>
                                      ) : null}
                                    </TableRow>
                                  ) : (
                                    <TableRow key={`e-${row.tx.id}`}>
                                      <TableCell className="align-middle">
                                        <span
                                          className={cn(
                                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                            "border-violet-200 bg-violet-50 text-violet-900",
                                          )}
                                        >
                                          {t(
                                            "personnel.detailExpenseBadgeExpense",
                                          )}
                                        </span>
                                      </TableCell>
                                      <TableCell className="whitespace-nowrap">
                                        {formatLocaleDate(
                                          row.tx.transactionDate,
                                          locale,
                                        )}
                                      </TableCell>
                                      <TableCell className="max-w-[18rem] text-sm">
                                        {txCategoryLine(
                                          row.tx.mainCategory,
                                          row.tx.category,
                                          t,
                                        )}
                                      </TableCell>
                                      <TableCell className="text-zinc-600">
                                        {row.tx.branchId != null &&
                                        row.tx.branchId > 0
                                          ? (branchNameById.get(row.tx.branchId) ??
                                            `#${row.tx.branchId}`)
                                          : t("personnel.detailExpenseBranchNone")}
                                      </TableCell>
                                      <TableCell className="text-right font-medium tabular-nums">
                                        {formatMoneyDash(
                                          row.tx.amount,
                                          dash,
                                          locale,
                                          row.tx.currencyCode,
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {row.tx.currencyCode}
                                      </TableCell>
                                      {!personnel.isDeleted ? (
                                        <TableCell className="p-2 text-center align-middle">
                                          <button
                                            type="button"
                                            className={trashIconActionButtonClass}
                                            aria-label={t("branch.txDeleteAria")}
                                            disabled={deleteTxMut.isPending}
                                            onClick={() =>
                                              confirmDeletePersonnelExpenseTx(
                                                row.tx.id,
                                              )
                                            }
                                          >
                                            <TrashIcon className="h-5 w-5" />
                                          </button>
                                        </TableCell>
                                      ) : null}
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-zinc-500">
                              {t("personnel.detailShowing")
                                .replace(
                                  "{from}",
                                  String((advSafePage - 1) * advSize + 1),
                                )
                                .replace(
                                  "{to}",
                                  String(
                                    Math.min(
                                      advSafePage * advSize,
                                      combinedCostsRows.length,
                                    ),
                                  ),
                                )
                                .replace(
                                  "{total}",
                                  String(combinedCostsRows.length),
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-10"
                                disabled={advSafePage <= 1}
                                onClick={() =>
                                  setAdvPage((p) => Math.max(1, p - 1))
                                }
                              >
                                {t("personnel.detailPrev")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-10"
                                disabled={advSafePage >= advTotalPages}
                                onClick={() =>
                                  setAdvPage((p) =>
                                    Math.min(advTotalPages, p + 1),
                                  )
                                }
                              >
                                {t("personnel.detailNext")}
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                ) : tab === "yearClosures" ? (
                  <div className="min-w-0 space-y-4 pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-600">
                        {t("personnel.yearClosuresIntro")}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 w-full shrink-0 sm:w-auto"
                        disabled={personnel.isDeleted}
                        onClick={() => {
                          setAccountClosureYearSummary(true);
                          setAccountClosureOpen(true);
                        }}
                      >
                        {t("personnel.yearClosuresCloseAccount")}
                      </Button>
                    </div>
                    {personnel.isDeleted ? (
                      <p className="text-sm text-zinc-500">
                        {t("personnel.yearClosuresReadOnlyHint")}
                      </p>
                    ) : null}
                    {yearClosuresLoading ? (
                      <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                    ) : null}
                    {yearClosuresError ? (
                      <p className="text-sm text-red-600">
                        {toErrorMessage(yearClosuresErr)}
                      </p>
                    ) : null}
                    {!yearClosuresLoading &&
                    !yearClosuresError &&
                    yearClosures.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        {t("personnel.yearClosuresEmpty")}
                      </p>
                    ) : null}
                    {!yearClosuresLoading && !yearClosuresError && yearClosures.length > 0 ? (
                      <>
                        <div className="space-y-3 md:hidden">
                          {yearClosures.map((row) => (
                            <div
                              key={row.id}
                              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5"
                            >
                              <dl className="grid gap-2 text-sm">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColYear")}
                                  </dt>
                                  <dd className="font-semibold tabular-nums text-zinc-900">
                                    {row.closureYear}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColClosedAt")}
                                  </dt>
                                  <dd className="text-zinc-800">
                                    {formatLocaleDateTime(row.closedAtUtc, locale)}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColClosedBy")}
                                  </dt>
                                  <dd className="text-zinc-800">
                                    {row.closedByFullName?.trim() ||
                                      `#${row.closedByUserId}`}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColNotes")}
                                  </dt>
                                  <dd className="break-words text-zinc-700">
                                    {row.notes?.trim() || dash}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColSettlementPdf")}
                                  </dt>
                                  <dd className="font-medium text-zinc-800">
                                    {row.settlementPdfAcknowledged
                                      ? t("personnel.yearClosuresPdfAckYes")
                                      : t("personnel.yearClosuresPdfAckNo")}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColSalary")}
                                  </dt>
                                  <dd className="break-words text-zinc-700">
                                    {formatYearClosureSalarySummary(
                                      row,
                                      locale,
                                      t,
                                      dash,
                                    )}
                                  </dd>
                                </div>
                                {row.salarySettlementNote?.trim() ? (
                                  <div className="flex flex-col gap-0.5">
                                    <dt className="text-zinc-500">
                                      {t(
                                        "personnel.accountClosure.salarySettlementNoteLabel",
                                      )}
                                    </dt>
                                    <dd className="break-words text-zinc-700">
                                      {row.salarySettlementNote.trim()}
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>
                              <Button
                                type="button"
                                variant="secondary"
                                className="mt-4 min-h-10 w-full"
                                disabled={
                                  personnel.isDeleted ||
                                  (reopenYearMut.isPending &&
                                    reopenYearMut.variables === row.closureYear)
                                }
                                onClick={() => {
                                  notifyConfirmToast({
                                    toastId: `personnel-year-reopen-${personnel.id}-${row.closureYear}`,
                                    title: t(
                                      "personnel.yearClosuresReopenConfirmTitle",
                                    ),
                                    message: t(
                                      "personnel.yearClosuresReopenConfirmMessage",
                                    ).replace("{year}", String(row.closureYear)),
                                    cancelLabel: t("common.cancel"),
                                    confirmLabel: t(
                                      "personnel.yearClosuresReopenConfirm",
                                    ),
                                    onConfirm: async () => {
                                      try {
                                        await reopenYearMut.mutateAsync(
                                          row.closureYear,
                                        );
                                        notify.success(
                                          t(
                                            "personnel.yearClosuresReopenSuccess",
                                          ),
                                        );
                                      } catch (e) {
                                        notify.error(toErrorMessage(e));
                                      }
                                    },
                                  });
                                }}
                              >
                                {t("personnel.yearClosuresReopen")}
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="hidden min-w-0 md:block">
                          <div className="overflow-x-auto rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]">
                            <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
                              <thead className="bg-zinc-50 text-zinc-700">
                                <tr>
                                  <th className="min-w-[4rem] px-3 py-3 pl-4 font-medium">
                                    {t("personnel.yearClosuresColYear")}
                                  </th>
                                  <th className="min-w-[10rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColClosedAt")}
                                  </th>
                                  <th className="min-w-[8rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColClosedBy")}
                                  </th>
                                  <th className="min-w-[8rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColNotes")}
                                  </th>
                                  <th className="min-w-[12rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColSalary")}
                                  </th>
                                  <th className="min-w-[5rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColSettlementPdf")}
                                  </th>
                                  <th className="w-[1%] px-3 py-3 pr-4 text-right font-medium">
                                    {t("personnel.yearClosuresColAction")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 bg-white">
                                {yearClosures.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-zinc-50/80"
                                  >
                                    <td className="px-3 py-3 pl-4 align-middle font-medium tabular-nums">
                                      {row.closureYear}
                                    </td>
                                    <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                                      {formatLocaleDateTime(
                                        row.closedAtUtc,
                                        locale,
                                      )}
                                    </td>
                                    <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                                      {row.closedByFullName?.trim() ||
                                        `#${row.closedByUserId}`}
                                    </td>
                                    <td className="max-w-[14rem] truncate px-3 py-3 align-middle text-sm text-zinc-600">
                                      {row.notes?.trim() || dash}
                                    </td>
                                    <td className="max-w-[14rem] px-3 py-3 align-middle text-sm text-zinc-700">
                                      <span className="line-clamp-2">
                                        {formatYearClosureSalarySummary(
                                          row,
                                          locale,
                                          t,
                                          dash,
                                        )}
                                      </span>
                                      {row.salarySettlementNote?.trim() ? (
                                        <span className="mt-1 block line-clamp-2 text-xs text-zinc-500">
                                          {row.salarySettlementNote.trim()}
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                                      {row.settlementPdfAcknowledged
                                        ? t("personnel.yearClosuresPdfAckYes")
                                        : t("personnel.yearClosuresPdfAckNo")}
                                    </td>
                                    <td className="px-3 py-3 pr-4 text-right align-middle">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="min-h-9"
                                        disabled={
                                          personnel.isDeleted ||
                                          (reopenYearMut.isPending &&
                                            reopenYearMut.variables ===
                                              row.closureYear)
                                        }
                                        onClick={() => {
                                          notifyConfirmToast({
                                            toastId: `personnel-year-reopen-${personnel.id}-${row.closureYear}`,
                                            title: t(
                                              "personnel.yearClosuresReopenConfirmTitle",
                                            ),
                                            message: t(
                                              "personnel.yearClosuresReopenConfirmMessage",
                                            ).replace(
                                              "{year}",
                                              String(row.closureYear),
                                            ),
                                            cancelLabel: t("common.cancel"),
                                            confirmLabel: t(
                                              "personnel.yearClosuresReopenConfirm",
                                            ),
                                            onConfirm: async () => {
                                              try {
                                                await reopenYearMut.mutateAsync(
                                                  row.closureYear,
                                                );
                                                notify.success(
                                                  t(
                                                    "personnel.yearClosuresReopenSuccess",
                                                  ),
                                                );
                                              } catch (e) {
                                                notify.error(toErrorMessage(e));
                                              }
                                            },
                                          });
                                        }}
                                      >
                                        {t("personnel.yearClosuresReopen")}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : tab === "notes" ? (
                  <PersonnelNotesTab
                    personnelId={personnel.id}
                    active={tab === "notes"}
                    readOnly={personnel.isDeleted}
                  />
                ) : (
                  <div className="space-y-4 pb-2">
                    <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50/90 to-white p-4 shadow-sm shadow-zinc-900/5">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {t("personnel.detailRolesStoryTitle")}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                        {t("personnel.detailRolesStoryIntroPerson").replace(
                          "{name}",
                          personnelDisplayName(personnel),
                        )}
                      </p>
                    </div>

                    <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("personnel.detailRolesBranchesListTitle")}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        {t("personnel.detailRolesBranchesListIntro")}
                      </p>
                      {mgmtSnapLoading &&
                      orderedLinkedBranchIds.length === 0 ? (
                        <p className="mt-3 text-sm text-zinc-500">
                          {t("common.loading")}
                        </p>
                      ) : null}
                      {mgmtSnapError ? (
                        <p className="mt-3 text-sm text-red-600">
                          {toErrorMessage(mgmtSnapErr)}
                        </p>
                      ) : null}
                      {!mgmtSnapLoading &&
                      !mgmtSnapError &&
                      orderedLinkedBranchIds.length === 0 ? (
                        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                          {t("personnel.detailRolesBranchesEmpty")}
                        </p>
                      ) : null}
                      {!mgmtSnapLoading &&
                      !mgmtSnapError &&
                      orderedLinkedBranchIds.length > 0 ? (
                        <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-800 marker:text-zinc-400">
                          {orderedLinkedBranchIds.map((branchId) => {
                            const nm =
                              branchNameById.get(branchId) ?? `#${branchId}`;
                            const isCurrent = personnel.branchId === branchId;
                            const roleLabel = t(
                              `personnel.jobTitles.${personnel.jobTitle}`,
                            );
                            return (
                              <li key={branchId} className="pl-1">
                                <span className="text-zinc-900">
                                  {t("personnel.detailRolesBranchItem").replace(
                                    "{name}",
                                    nm,
                                  )}
                                </span>
                                {isCurrent ? (
                                  <>
                                    <span className="ml-2 inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-900">
                                      {t(
                                        "personnel.detailRolesBranchCurrentTag",
                                      )}
                                    </span>
                                    <span className="ml-2 text-zinc-700">
                                      ·{" "}
                                      {t(
                                        "personnel.detailRolesBranchCurrentRole",
                                      ).replace("{role}", roleLabel)}
                                    </span>
                                  </>
                                ) : null}
                              </li>
                            );
                          })}
                        </ol>
                      ) : null}
                    </section>

                    <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("personnel.detailRolesWarehousesListTitle")}
                      </h4>

                      {!hasLinkedSystemUser(personnel) ? (
                        <div className="mt-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                          <p className="text-sm font-semibold text-amber-950">
                            {t("personnel.detailRolesWarehouseNeedUserTitle")}
                          </p>
                          <p className="text-sm leading-relaxed text-amber-950/90">
                            {t("personnel.detailRolesWarehouseNeedUserP1")}
                          </p>
                          <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-amber-950/90">
                            <li>
                              {t("personnel.detailRolesWarehouseNeedUserStep1")}
                            </li>
                            <li>
                              {t("personnel.detailRolesWarehouseNeedUserStep2")}
                            </li>
                          </ol>
                        </div>
                      ) : (
                        <>
                          <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/85">
                              {t("personnel.detailRolesAssignWarehouseTitle")}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                              {t("personnel.detailRolesAssignWarehouseIntro")}
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Select
                                name="assignWh"
                                label={t(
                                  "personnel.detailRolesAssignWarehouseSelect",
                                )}
                                labelRequired
                                options={warehouseAssignOptions}
                                value={assignWarehouseId}
                                onChange={(e) =>
                                  setAssignWarehouseId(e.target.value)
                                }
                                onBlur={() => {}}
                                disabled={whLoading}
                              />
                              <Select
                                name="assignRole"
                                label={t(
                                  "personnel.detailRolesAssignRoleLabel",
                                )}
                                options={roleAssignOptions}
                                value={assignRole}
                                onChange={(e) =>
                                  setAssignRole(
                                    e.target.value as
                                      | "manager"
                                      | "master"
                                      | "both",
                                  )
                                }
                                onBlur={() => {}}
                                disabled={whLoading}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="mt-3 min-h-10"
                              disabled={updateWhMut.isPending || whLoading}
                              onClick={() => void runAssignWarehouse()}
                            >
                              {t("personnel.detailRolesAssignApply")}
                            </Button>
                          </div>

                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 sm:max-w-xs sm:flex-1 sm:ml-auto">
                              <Input
                                name="rolesSearch"
                                label={t("personnel.detailRolesSearchShort")}
                                placeholder={t(
                                  "personnel.fieldOptionalPlaceholder",
                                )}
                                value={rolesSearch}
                                onChange={(e) => setRolesSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                            {t("personnel.detailRolesStoryWarehouseHint")}
                          </p>

                          {whLoading ? (
                            <p className="mt-4 text-sm text-zinc-500">
                              {t("common.loading")}
                            </p>
                          ) : warehouseRoles.length === 0 ? (
                            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                              {debouncedRolesSearch
                                ? t("personnel.detailRolesStoryNoDepotsMatch")
                                : t("personnel.detailRolesStoryNoDepots")}
                            </p>
                          ) : (
                            <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-zinc-800 marker:text-zinc-400">
                              {warehouseRoles.map(({ warehouse: w, tags }) => (
                                <li key={w.id} className="pl-1">
                                  <span className="text-zinc-900">
                                    {t("personnel.detailRolesStoryDepotLine")
                                      .replace("{warehouse}", w.name)
                                      .replace(
                                        "{roles}",
                                        depotRolePhrase(tags, t),
                                      )}
                                  </span>
                                  {w.city?.trim() || w.address?.trim() ? (
                                    <span className="mt-1 block text-xs text-zinc-500">
                                      {[w.city?.trim(), w.address?.trim()]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <AddBranchTransactionModal
        open={orgTxOpen && personnel != null && !personnel.isDeleted}
        onClose={() => setOrgTxOpen(false)}
        branchId={personnel?.branchId ?? null}
        defaultLinkedPersonnelId={personnel?.id}
        defaultType="OUT"
      />
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
    </>
  );
}
