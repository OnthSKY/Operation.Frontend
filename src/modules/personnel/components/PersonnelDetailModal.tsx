"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import {
  personnelYearClosureArchiveUrl,
  personnelYearClosurePdfDownloadUrl,
} from "@/modules/personnel/api/personnel-account-closure-api";
import { AddBranchTransactionModal } from "@/modules/branch/components/AddBranchTransactionModal";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import {
  fetchBranchPersonnelMoneySummaries,
} from "@/modules/branch/api/branches-api";
import { fetchPersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { AddPersonnelInsurancePeriodModal } from "@/modules/personnel/components/AddPersonnelInsurancePeriodModal";
import { EditPersonnelInsurancePeriodModal } from "@/modules/personnel/components/EditPersonnelInsurancePeriodModal";
import { PersonnelAccountClosureSheet } from "@/modules/personnel/components/PersonnelAccountClosureSheet";
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
  useDeleteAdvance,
  usePersonnelAdvancesAll,
  usePersonnelInsurancePeriods,
  usePersonnelManagementSnapshot,
  usePersonnelYearAccountClosures,
  useReopenPersonnelYearAccount,
  useUploadPersonnelYearClosurePdf,
  personnelKeys,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  branchKeys,
  useDeleteBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import {
  useUpdateWarehouse,
  warehouseKeys,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import type { Advance } from "@/types/advance";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
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
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { localIsoDate } from "@/shared/lib/local-iso-date";

const TITLE_ID = "personnel-detail-modal-title";
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;

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
  if (st) bits.push(sourceAbbrev(t, st));
  return bits.join(" · ");
}

function YearClosureReportLinks({
  personnelId,
  row,
  readOnly,
  uploadPending,
  t,
  onPickPdf,
}: {
  personnelId: number;
  row: PersonnelYearAccountClosureListItem;
  readOnly: boolean;
  uploadPending: boolean;
  t: (k: string) => string;
  onPickPdf: (year: number, file: File) => void;
}) {
  const hasArch = row.hasClosureArchive === true;
  const hasPdf = row.hasClosurePdf === true;
  const jsonHref = hasArch
    ? personnelYearClosureArchiveUrl(personnelId, row.closureYear)
    : null;
  const pdfHref = hasPdf
    ? personnelYearClosurePdfDownloadUrl(personnelId, row.closureYear)
    : null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      {jsonHref ? (
        <a
          href={jsonHref}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-sky-800 underline decoration-sky-800/30 underline-offset-2"
        >
          {t("personnel.yearClosuresDownloadJson")}
        </a>
      ) : (
        <span className="text-xs text-zinc-400">—</span>
      )}
      {pdfHref ? (
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-sky-800 underline decoration-sky-800/30 underline-offset-2"
        >
          {t("personnel.yearClosuresDownloadPdf")}
        </a>
      ) : null}
      {!readOnly ? (
        <label className="cursor-pointer text-xs font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-zinc-900">
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={uploadPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPickPdf(row.closureYear, f);
            }}
          />
          {t("personnel.yearClosuresUploadPdf")}
        </label>
      ) : null}
    </div>
  );
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "PATRON_BRANCH")
    return t("personnel.advanceSourceAbbrPatronBranch");
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
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxTitleId = useId();

  useEffect(() => {
    if (!href) {
      return;
    }
    setImageReady(false);
    setImageFailed(false);
  }, [href]);

  const runDownload = useCallback(() => {
    if (!href) return;
    const ext = nationalIdFileExt("");
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileBaseName}.${ext}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [fileBaseName, href]);

  if (!href) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
  }
  if (imageFailed) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
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
          {!imageReady ? (
            <span className="block px-3 py-6 text-center text-xs text-zinc-400">
              {loadingLabel}
            </span>
          ) : null}
          <img
            src={href}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setImageReady(true)}
            onError={() => setImageFailed(true)}
            className={cn(
              "max-h-52 w-full rounded-lg object-contain",
              !imageReady && "hidden",
            )}
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
            src={href}
            alt=""
            decoding="async"
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
  const queryClient = useQueryClient();
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
  const [costsPdfScopeModalOpen, setCostsPdfScopeModalOpen] = useState(false);
  const [costsListSeasonModalOpen, setCostsListSeasonModalOpen] =
    useState(false);
  const [pdfScopeDraft, setPdfScopeDraft] = useState("");
  const [costsListSeasonDraft, setCostsListSeasonDraft] = useState("");
  const costsPdfModalTitleId = useId();
  const costsListSeasonModalTitleId = useId();
  const [costsFiltersDrawerOpen, setCostsFiltersDrawerOpen] = useState(false);
  const [costsActionsDrawerOpen, setCostsActionsDrawerOpen] = useState(false);
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
  const updateWhMut = useUpdateWarehouse();

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
  const uploadClosurePdfMut = useUploadPersonnelYearClosurePdf(pid);
  const onYearClosurePdfUpload = useCallback(
    (year: number, file: File) => {
      uploadClosurePdfMut.mutate(
        { year, file },
        {
          onSuccess: () =>
            notify.success(t("personnel.yearClosuresUploadPdfSuccess")),
          onError: (e) => notify.error(toErrorMessage(e)),
        },
      );
    },
    [uploadClosurePdfMut, t],
  );
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
    setCostsPdfScopeModalOpen(false);
    setCostsListSeasonModalOpen(false);
    setCostsFiltersDrawerOpen(false);
    setCostsActionsDrawerOpen(false);
  }, [open, personnel?.id, initialTab]);

  const seasonScopeSelectOptions = useMemo(
    () => settlementSeasonYearSelectOptions(t),
    [t]
  );

  useEffect(() => {
    setAdvPage(1);
  }, [costsListSeason, branchFilter, sourceFilter, advPageSizeVal]);

  useEffect(() => {
    if (tab !== "costs") {
      setCostsFiltersDrawerOpen(false);
      setCostsActionsDrawerOpen(false);
    }
  }, [tab]);

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
  const costsAdvanceTotal = useMemo(
    () => filteredAdvances.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    [filteredAdvances],
  );
  const costsExpenseTotal = useMemo(
    () =>
      filteredExpensesForCostsCombo.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      ),
    [filteredExpensesForCostsCombo],
  );
  const costsCombinedTotal = costsAdvanceTotal + costsExpenseTotal;
  const costsSummaryCurrency = (personnel?.currencyCode ?? "TRY").trim() || "TRY";

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

  const costsListSeasonFilterYear = useMemo(
    () => parseSettlementSeasonYearChoice(costsListSeason),
    [costsListSeason],
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

  const runSettlementPrint = useCallback(
    async (seasonRaw?: string) => {
      if (!personnel) return;
      const raw = seasonRaw !== undefined ? seasonRaw : pdfScopeSeason;
      const y = parseSettlementSeasonYearChoice(raw);
      if (raw.trim() !== "" && y == null) {
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
    },
    [personnel, pdfScopeSeason, locale, branchNameById, t],
  );

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

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      title={label}
      className={cn(
        "min-h-11 shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium leading-tight transition-colors sm:min-w-[8rem] sm:text-sm",
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
                aria-orientation="horizontal"
                className="sticky top-0 z-[1] -mx-4 mb-3 flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain border-b border-zinc-200 bg-white/95 px-4 py-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:px-6"
              >
                {tabBtn("profile", t("personnel.detailTabProfile"))}
                {tabBtn("managerSummary", t("personnel.detailTabManagerSummary"))}
                {tabBtn("personnelCashPhysical", t("personnel.detailTabPersonnelCashPhysical"))}
                {tabBtn("insurance", t("personnel.detailTabInsurance"))}
                {tabBtn("seasonArrivals", t("personnel.detailTabSeasonArrivals"))}
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
                  <div className="space-y-4 pb-2">
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
                          profilePhotoPaths={{
                            profilePhoto1Url: personnel.profilePhoto1Url,
                            profilePhoto2Url: personnel.profilePhoto2Url,
                          }}
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
                                  ? personnelProfilePhotoUrl(personnel.id, 1, {
                                      profilePhoto1Url: personnel.profilePhoto1Url,
                                      profilePhoto2Url: personnel.profilePhoto2Url,
                                    })
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
                                  ? personnelProfilePhotoUrl(personnel.id, 2, {
                                      profilePhoto1Url: personnel.profilePhoto1Url,
                                      profilePhoto2Url: personnel.profilePhoto2Url,
                                    })
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
                                  ? personnelNationalIdPhotoUrl(personnel.id, "front")
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
                                  ? personnelNationalIdPhotoUrl(personnel.id, "back")
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
                  </div>
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
                        });
                      }}
                    />
                  </div>
                ) : tab === "insurance" ? (
                  <div className="space-y-3 pb-2">
                    <article
                      className={cn(
                        "mb-3 shrink-0 overflow-hidden rounded-2xl border shadow-sm",
                        personnel.isDeleted
                          ? "border-zinc-200/90 bg-zinc-100/50"
                          : "border-zinc-200/90 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3.5 sm:px-5",
                          personnel.isDeleted
                            ? "border-zinc-200/80 bg-zinc-100/80"
                            : "border-zinc-100 bg-gradient-to-r from-sky-50/50 via-white to-violet-50/40",
                        )}
                      >
                        <h4 className="text-sm font-semibold text-zinc-900">
                          {t("personnel.insuranceSectionTitle")}
                        </h4>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            personnel.insuranceStarted
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-950",
                          )}
                        >
                          {personnel.insuranceStarted
                            ? t("personnel.insuranceStatusStarted")
                            : t("personnel.insuranceStatusPending")}
                        </span>
                      </div>
                      <div className="grid gap-2 p-4 sm:grid-cols-2 sm:gap-3">
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                            {t("personnel.insuranceCurrentOpenStart")}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                            {formatOptionalIso(
                              personnel.insuranceStartDate,
                              dash,
                              locale,
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                            {t("personnel.insuranceCurrentOpenEnd")}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
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
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                            {t("personnel.insuranceIntakeDetailLabel")}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                            {formatOptionalIso(
                              personnel.insuranceIntakeStartDate,
                              dash,
                              locale,
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                            {t(
                              "personnel.insuranceAccountingNotifiedDetailLabel",
                            )}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-sm font-semibold",
                              personnel.insuranceAccountingNotified
                                ? "text-emerald-800"
                                : "text-zinc-600",
                            )}
                          >
                            {personnel.insuranceAccountingNotified
                              ? t("personnel.insuranceAccountingNotifiedYes")
                              : t("personnel.insuranceAccountingNotifiedNo")}
                          </p>
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
                              {insurancePeriods.map((row) => {
                                const periodOpen =
                                  row.coverageEndDate == null ||
                                  String(row.coverageEndDate).trim() === "";
                                return (
                                  <TableRow key={row.id}>
                                    <TableCell
                                      dataLabel={t(
                                        "personnel.insurancePeriodColStart",
                                      )}
                                      className="whitespace-nowrap text-zinc-700"
                                    >
                                      {formatLocaleDate(
                                        row.coverageStartDate,
                                        locale,
                                        dash,
                                      )}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t(
                                        "personnel.insurancePeriodColEnd",
                                      )}
                                      className="whitespace-nowrap text-zinc-700"
                                    >
                                      {periodOpen
                                        ? t("personnel.insuranceOngoing")
                                        : formatLocaleDate(
                                            row.coverageEndDate,
                                            locale,
                                            dash,
                                          )}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t(
                                        "personnel.insurancePeriodColBranch",
                                      )}
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
                                      dataLabel={t(
                                        "personnel.insurancePeriodColNotes",
                                      )}
                                      className="max-w-[14rem] truncate text-zinc-600"
                                      title={row.notes ?? undefined}
                                    >
                                      {row.notes?.trim()
                                        ? row.notes.trim()
                                        : dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t(
                                        "personnel.insurancePeriodColActions",
                                      )}
                                      className="text-right"
                                    >
                                      {personnel.isDeleted ? null : (
                                        <div className="flex justify-end gap-1.5">
                                          {periodOpen ? (
                                            <Tooltip
                                              content={t(
                                                "personnel.insurancePeriodRowCloseTooltip",
                                              )}
                                              delayMs={150}
                                            >
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                className={
                                                  detailOpenIconButtonClass
                                                }
                                                aria-label={t(
                                                  "personnel.insurancePeriodRowCloseAria",
                                                )}
                                                onClick={() =>
                                                  setInsuranceEditPeriod(row)
                                                }
                                              >
                                                <CalendarCheckIcon className="mx-auto opacity-90" />
                                              </Button>
                                            </Tooltip>
                                          ) : null}
                                          <Tooltip
                                            content={t(
                                              "personnel.insurancePeriodRowEditTooltip",
                                            )}
                                            delayMs={150}
                                          >
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              className={
                                                detailOpenIconButtonClass
                                              }
                                              aria-label={t(
                                                "personnel.insurancePeriodRowEditAria",
                                              )}
                                              onClick={() =>
                                                setInsuranceEditPeriod(row)
                                              }
                                            >
                                              <PencilIcon className="mx-auto opacity-90" />
                                            </Button>
                                          </Tooltip>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </article>
                  </div>
                ) : tab === "seasonArrivals" ? (
                  <PersonnelSeasonArrivalsTab
                    personnelId={personnel.id}
                    active={tab === "seasonArrivals"}
                    readOnly={personnel.isDeleted}
                    branchNameById={branchNameById}
                  />
                ) : tab === "costs" ? (
                  <div className="min-w-0 space-y-4 pb-2">
                    <section className="min-w-0 space-y-4">
                      {!personnel.isDeleted &&
                      (pocketMoneyQueriesPending || pocketMoneyActionsByBranch.length > 0) ? (
                        <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3 shadow-sm sm:p-4">
                          <h3 className="text-sm font-semibold text-amber-950">
                            {t("personnel.detailPocketMoneySectionTitle")}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                            {t("personnel.detailPocketMoneySectionHint")}
                          </p>
                          {pocketMoneyQueriesPending ? (
                            <p className="mt-3 text-sm text-zinc-600">
                              {t("common.loading")}
                            </p>
                          ) : (
                            <ul className="mt-3 space-y-3">
                              {pocketMoneyActionsByBranch.map(({ branchId, row }) => {
                                const cur =
                                  row.pocketCurrencyCode?.trim().toUpperCase() || "TRY";
                                const bname =
                                  branchNameById.get(branchId) ?? `#${branchId}`;
                                return (
                                  <li
                                    key={branchId}
                                    className="flex flex-col gap-3 rounded-lg border border-amber-200/70 bg-white/80 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-zinc-900">
                                        {bname}
                                      </p>
                                      <p className="mt-0.5 font-mono text-sm text-amber-950">
                                        {formatMoneyDash(
                                          row.netRegisterOwesPocket,
                                          dash,
                                          locale as Locale,
                                          cur,
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                      <Tooltip
                                        content={t(
                                          "personnel.detailPocketActionRegisterTooltip",
                                        )}
                                      >
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          className="min-h-9 shrink-0 px-2.5 text-xs font-semibold"
                                          aria-label={t(
                                            "personnel.detailPocketActionRegisterTooltip",
                                          )}
                                          onClick={() =>
                                            setOrgBranchTx({
                                              kind: "pocket-repay",
                                              branchId,
                                              currency: cur,
                                              paymentSource: "REGISTER",
                                            })
                                          }
                                        >
                                          {t("personnel.detailPocketActionRegisterShort")}
                                        </Button>
                                      </Tooltip>
                                      <Tooltip
                                        content={t(
                                          "personnel.detailPocketActionPatronRepayTooltip",
                                        )}
                                      >
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          className="min-h-9 shrink-0 px-2.5 text-xs font-semibold"
                                          aria-label={t(
                                            "personnel.detailPocketActionPatronRepayTooltip",
                                          )}
                                          onClick={() =>
                                            setOrgBranchTx({
                                              kind: "pocket-repay",
                                              branchId,
                                              currency: cur,
                                              paymentSource: "PATRON",
                                            })
                                          }
                                        >
                                          {t("personnel.detailPocketActionPatronRepayShort")}
                                        </Button>
                                      </Tooltip>
                                      {UI_POCKET_CLAIM_TRANSFER_ENABLED ? (
                                        <>
                                          <Tooltip
                                            content={t(
                                              "personnel.detailPocketActionClaimToPatronTooltip",
                                            )}
                                          >
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              className="min-h-9 shrink-0 px-2.5 text-xs font-semibold"
                                              aria-label={t(
                                                "personnel.detailPocketActionClaimToPatronTooltip",
                                              )}
                                              onClick={() =>
                                                setPocketClaimTransferCtx({
                                                  kind: "patron",
                                                  branchId,
                                                  currency: cur,
                                                })
                                              }
                                            >
                                              {t(
                                                "personnel.detailPocketActionClaimToPatronShort",
                                              )}
                                            </Button>
                                          </Tooltip>
                                          <Tooltip
                                            content={t(
                                              "personnel.detailPocketActionClaimToStaffTooltip",
                                            )}
                                          >
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              className="min-h-9 shrink-0 px-2.5 text-xs font-semibold"
                                              aria-label={t(
                                                "personnel.detailPocketActionClaimToStaffTooltip",
                                              )}
                                              onClick={() =>
                                                setPocketClaimTransferCtx({
                                                  kind: "staff",
                                                  branchId,
                                                  currency: cur,
                                                })
                                              }
                                            >
                                              {t(
                                                "personnel.detailPocketActionClaimToStaffShort",
                                              )}
                                            </Button>
                                          </Tooltip>
                                        </>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-900">
                            {t("personnel.detailTabCosts")}
                          </h3>
                          <Tooltip
                            content={t("personnel.detailCostsFiltersDrawerTitle")}
                            delayMs={200}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              className={cn(TABLE_TOOLBAR_ICON_BTN, "relative")}
                              onClick={() => setCostsFiltersDrawerOpen(true)}
                              aria-label={t("personnel.detailCostsFiltersDrawerTitle")}
                            >
                              <FilterFunnelIcon className="h-5 w-5" />
                              {advFiltersActive ? (
                                <span
                                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                                  aria-hidden
                                />
                              ) : null}
                            </Button>
                          </Tooltip>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full shrink-0 sm:w-auto sm:min-w-[10rem]"
                          onClick={() => setCostsActionsDrawerOpen(true)}
                        >
                          {t("personnel.detailCostsActions")}
                        </Button>
                      </div>
                      {costsListSeasonFilterYear != null ? (
                        <p className="text-xs text-zinc-600">
                          {t("personnel.detailCostsListSeasonActiveLine").replace(
                            "{year}",
                            String(costsListSeasonFilterYear),
                          )}
                        </p>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <article className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm shadow-zinc-900/5">
                          <p className="text-xs font-medium text-zinc-500">
                            Toplam Tutar
                          </p>
                          <p className="mt-1 font-mono text-base font-semibold tabular-nums text-zinc-900">
                            {formatMoneyDash(
                              costsCombinedTotal,
                              dash,
                              locale,
                              costsSummaryCurrency,
                            )}
                          </p>
                        </article>
                        <article className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm shadow-zinc-900/5">
                          <p className="text-xs font-medium text-zinc-500">
                            Toplam Avans
                          </p>
                          <p className="mt-1 font-mono text-base font-semibold tabular-nums text-zinc-900">
                            {formatMoneyDash(
                              costsAdvanceTotal,
                              dash,
                              locale,
                              costsSummaryCurrency,
                            )}
                          </p>
                        </article>
                        <article className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm shadow-zinc-900/5">
                          <p className="text-xs font-medium text-zinc-500">
                            Toplam Gider
                          </p>
                          <p className="mt-1 font-mono text-base font-semibold tabular-nums text-zinc-900">
                            {formatMoneyDash(
                              costsExpenseTotal,
                              dash,
                              locale,
                              costsSummaryCurrency,
                            )}
                          </p>
                        </article>
                      </div>

                      <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5">
                      {advLoading || attrExpLoading ? (
                        <p className="p-4 text-sm text-zinc-500">
                          {t("common.loading")}
                        </p>
                      ) : advError || attrExpError ? (
                        <div className="space-y-1 p-4 text-sm text-red-600">
                          {advError ? (
                            <p>{toErrorMessage(advErr)}</p>
                          ) : null}
                          {attrExpError ? (
                            <p>{toErrorMessage(attrExpErr)}</p>
                          ) : null}
                        </div>
                      ) : combinedCostsRows.length === 0 ? (
                        <p className="p-4 text-sm text-zinc-600">
                          {t("personnel.detailCostsCombinedEmpty")}
                        </p>
                      ) : (
                        <>
                          <div className="space-y-3 p-3 md:hidden">
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
                          <div className="hidden min-w-0 overflow-x-auto md:block">
                            <Table className="min-w-[44rem] border-0 text-sm">
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
                          <div className="flex flex-col gap-2 border-t border-zinc-100 bg-zinc-50/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
                      </div>
                    </section>
                  </div>
                ) : tab === "yearClosures" ? (
                  <div className="min-w-0 space-y-4 pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm leading-relaxed text-zinc-600">
                          {t("personnel.yearClosuresIntro")}
                        </p>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          {t("personnel.yearClosuresStoryHint")}
                        </p>
                      </div>
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
                        <div className="space-y-3 lg:hidden">
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
                                <div className="flex flex-col gap-0.5">
                                  <dt className="text-zinc-500">
                                    {t("personnel.yearClosuresColReport")}
                                  </dt>
                                  <dd>
                                    <YearClosureReportLinks
                                      personnelId={personnel.id}
                                      row={row}
                                      readOnly={personnel.isDeleted}
                                      uploadPending={
                                        uploadClosurePdfMut.isPending &&
                                        uploadClosurePdfMut.variables?.year ===
                                          row.closureYear
                                      }
                                      t={t}
                                      onPickPdf={onYearClosurePdfUpload}
                                    />
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
                                className="mt-4 min-h-12 w-full touch-manipulation"
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
                        <div className="hidden min-w-0 lg:block">
                          <div className="overflow-x-auto rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]">
                            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
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
                                  <th className="min-w-[12rem] px-3 py-3 font-medium">
                                    {t("personnel.yearClosuresColReport")}
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
                                    <td className="max-w-[16rem] px-3 py-3 align-middle">
                                      <YearClosureReportLinks
                                        personnelId={personnel.id}
                                        row={row}
                                        readOnly={personnel.isDeleted}
                                        uploadPending={
                                          uploadClosurePdfMut.isPending &&
                                          uploadClosurePdfMut.variables?.year ===
                                            row.closureYear
                                        }
                                        t={t}
                                        onPickPdf={onYearClosurePdfUpload}
                                      />
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
                    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50/90 to-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {t("personnel.detailRolesStoryTitle")}
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-zinc-500">
                        {personnelDisplayName(personnel)}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-violet-900">
                            {t("personnel.detailRolesStorySummaryBranchEyebrow")}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                            {t("personnel.detailRolesStorySummaryBranchBody")}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/45 p-3 sm:p-3.5">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-950">
                            {t(
                              "personnel.detailRolesStorySummaryWarehouseEyebrow",
                            )}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-800">
                            {t(
                              "personnel.detailRolesStorySummaryWarehouseBody",
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-100 pb-3">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {t("personnel.detailRolesBranchesListTitle")}
                          </h4>
                          <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-500">
                            {t("personnel.detailRolesBranchesListIntro")}
                          </p>
                        </div>
                      </div>
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
                        <ul className="mt-4 grid gap-2">
                          {orderedLinkedBranchIds.map((branchId) => {
                            const nm =
                              branchNameById.get(branchId) ?? `#${branchId}`;
                            const isCurrent = personnel.branchId === branchId;
                            const roleLabel = t(
                              `personnel.jobTitles.${personnel.jobTitle}`,
                            );
                            return (
                              <li
                                key={branchId}
                                className={cn(
                                  "rounded-xl border p-3.5 shadow-sm transition-colors",
                                  isCurrent
                                    ? "border-violet-200 bg-gradient-to-br from-violet-50/90 to-white ring-1 ring-violet-500/[0.12]"
                                    : "border-zinc-200/90 bg-zinc-50/50",
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">
                                    {nm}
                                  </p>
                                  {isCurrent ? (
                                    <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      {t(
                                        "personnel.detailRolesBranchCurrentTag",
                                      )}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                      {t(
                                        "personnel.detailRolesBranchHistoricTag",
                                      )}
                                    </span>
                                  )}
                                </div>
                                {isCurrent ? (
                                  <p className="mt-2.5 text-xs text-zinc-600">
                                    <span className="font-semibold text-zinc-500">
                                      {t(
                                        "personnel.detailRolesBranchTitleLabel",
                                      )}
                                    </span>{" "}
                                    <span className="text-sm font-medium text-zinc-800">
                                      {roleLabel}
                                    </span>
                                  </p>
                                ) : (
                                  <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
                                    {t(
                                      "personnel.detailRolesBranchHistoricHint",
                                    )}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </section>

                    <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
                      <div className="border-b border-zinc-100 pb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {t("personnel.detailRolesWarehousesListTitle")}
                        </h4>
                        <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
                          {t("personnel.detailRolesWarehousesSectionPurpose")}
                        </p>
                      </div>

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
                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                              {warehouseRoles.map(({ warehouse: w, tags }) => (
                                <li
                                  key={w.id}
                                  className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3.5 shadow-sm"
                                >
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {w.name}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {tags.includes("manager") ? (
                                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900">
                                        {t(
                                          "personnel.detailRolesAssignRoleManager",
                                        )}
                                      </span>
                                    ) : null}
                                    {tags.includes("master") ? (
                                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                                        {t(
                                          "personnel.detailRolesAssignRoleMaster",
                                        )}
                                      </span>
                                    ) : null}
                                  </div>
                                  {w.city?.trim() || w.address?.trim() ? (
                                    <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                      {[w.city?.trim(), w.address?.trim()]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
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
      <AddBranchTransactionModal
        open={orgBranchTx != null && personnel != null && !personnel.isDeleted}
        onClose={() => setOrgBranchTx(null)}
        branchId={
          orgBranchTx?.kind === "pocket-repay" ||
          orgBranchTx?.kind === "handover-pool-expense-register"
            ? orgBranchTx.branchId
            : (personnel?.branchId ?? null)
        }
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
      <Modal
        nested
        open={costsPdfScopeModalOpen}
        onClose={() => setCostsPdfScopeModalOpen(false)}
        titleId={costsPdfModalTitleId}
        title={t("personnel.detailCostsPdfModalTitle")}
        closeButtonLabel={t("common.close")}
        narrow
      >
        <div className="space-y-4 px-1 pb-2 pt-1">
          <Select
            name="personnelDetailPdfScopeSeasonModal"
            label={t("personnel.detailPdfScopeLabel")}
            options={seasonScopeSelectOptions}
            value={pdfScopeDraft}
            onChange={(e) => setPdfScopeDraft(e.target.value)}
            onBlur={() => {}}
          />
          <p className="text-xs text-zinc-500">{t("personnel.detailPdfScopeHint")}</p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCostsPdfScopeModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={printBusy}
              onClick={() => {
                const y = parseSettlementSeasonYearChoice(pdfScopeDraft);
                if (pdfScopeDraft.trim() !== "" && y == null) {
                  notify.error(t("personnel.effectiveYearInvalid"));
                  return;
                }
                setPdfScopeSeason(pdfScopeDraft);
                setCostsPdfScopeModalOpen(false);
                void runSettlementPrint(pdfScopeDraft);
              }}
            >
              {t("personnel.settlementPrintSeasonPickerConfirm")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        nested
        open={costsListSeasonModalOpen}
        onClose={() => setCostsListSeasonModalOpen(false)}
        titleId={costsListSeasonModalTitleId}
        title={t("personnel.detailCostsListSeasonModalTitle")}
        closeButtonLabel={t("common.close")}
        narrow
      >
        <div className="space-y-4 px-1 pb-2 pt-1">
          <Select
            name="personnelDetailCostsListSeasonModal"
            label={t("personnel.detailCostsListSeasonLabel")}
            options={seasonScopeSelectOptions}
            value={costsListSeasonDraft}
            onChange={(e) => setCostsListSeasonDraft(e.target.value)}
            onBlur={() => {}}
          />
          <p className="text-xs text-zinc-500">
            {t("personnel.detailCostsListSeasonHint")}
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCostsListSeasonModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const y = parseSettlementSeasonYearChoice(
                  costsListSeasonDraft,
                );
                if (costsListSeasonDraft.trim() !== "" && y == null) {
                  notify.error(t("personnel.effectiveYearInvalid"));
                  return;
                }
                setCostsListSeason(costsListSeasonDraft);
                setCostsListSeasonModalOpen(false);
              }}
            >
              {t("personnel.detailCostsListSeasonApply")}
            </Button>
          </div>
        </div>
      </Modal>
      <RightDrawer
        open={costsFiltersDrawerOpen}
        onClose={() => setCostsFiltersDrawerOpen(false)}
        title={t("personnel.detailCostsFiltersDrawerTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            {t("personnel.detailCostsFiltersDrawerHint")}
          </p>
          <div className="grid gap-4">
            <Select
              name="advBranchDrawer"
              label={t("personnel.tableBranch")}
              options={branchOptions}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              onBlur={() => {}}
              menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
            />
            <Select
              name="advSourceDrawer"
              label={t("personnel.sourceType")}
              options={sourceOptions}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              onBlur={() => {}}
              menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
            />
            <Select
              name="advPageSizeDrawer"
              label={t("personnel.detailPageSize")}
              options={pageSizeSelectOptions}
              value={advPageSizeVal}
              onChange={(e) => setAdvPageSize(e.target.value)}
              onBlur={() => {}}
              menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
            />
          </div>
        </div>
      </RightDrawer>
      <RightDrawer
        open={costsActionsDrawerOpen}
        onClose={() => setCostsActionsDrawerOpen(false)}
        title={t("personnel.detailCostsActions")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            disabled={printBusy || personnel?.isDeleted}
            onClick={() => {
              setCostsActionsDrawerOpen(false);
              setAccountClosureYearSummary(false);
              setAccountClosureOpen(true);
            }}
          >
            {t("personnel.accountClosure.openButton")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            disabled={printBusy}
            onClick={() => {
              setCostsActionsDrawerOpen(false);
              setPdfScopeDraft(pdfScopeSeason);
              setCostsPdfScopeModalOpen(true);
            }}
          >
            {t("personnel.settlementPrintOpen")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full"
            onClick={() => {
              setCostsActionsDrawerOpen(false);
              setCostsListSeasonDraft(costsListSeason);
              setCostsListSeasonModalOpen(true);
            }}
          >
            {t("personnel.detailCostsListSeasonFilterButton")}
          </Button>
          {personnel != null && !personnel.isDeleted ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full"
                onClick={() => {
                  setCostsActionsDrawerOpen(false);
                  setDetailAdvanceOpen(true);
                }}
              >
                {t("personnel.detailCostsGiveAdvance")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full"
                onClick={() => {
                  setCostsActionsDrawerOpen(false);
                  setOrgBranchTx({ kind: "personnel-expense" });
                }}
              >
                {t("personnel.detailCostsAddExpense")}
              </Button>
            </>
          ) : null}
        </div>
      </RightDrawer>
    </>
  );
}
