"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Locale } from "@/i18n/messages";
import { fetchPersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { usePersonnelAdvancesAll } from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  parseSettlementSeasonYearChoice,
  settlementSeasonYearSelectOptions,
} from "@/modules/personnel/lib/settlement-print-season";
import {
  attributedExpenseRowIsAdvance,
  sortAdvancesDesc,
} from "@/modules/personnel/lib/advance-formatters";
import type { Advance } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";

export const PERSONNEL_COSTS_PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;

export type PersonnelCostsCombinedRow =
  | { kind: "advance"; advance: Advance }
  | { kind: "expense"; tx: BranchTransaction };

export type UsePersonnelDetailCostsStateArgs = {
  open: boolean;
  personnel: Personnel | null;
  /** Reconciliation drill-down: bu avansı işaretle ve costs sekmesine zorla. */
  focusAdvanceId: number | null;
  /** Reconciliation drill-down: bu gider tx'ini işaretle. */
  focusExpenseTransactionId: number | null;
  /** Şube id → ad. */
  branchNameById: Map<number, string>;
  /** Yetki bayrağı (`PERM.systemAdmin`). */
  isSystemAdmin: boolean;
  /** Dar viewport (mobile) → auto page size 20; aksi 10. */
  isNarrow: boolean;
  /** i18n. */
  t: (k: string) => string;
  locale: Locale;
  /** Sekme şu an costs mı? (query enabled + scroll/highlight effect'i için.) */
  isCostsTab: boolean;
};

/**
 * Personel detayı costs sekmesine ait tüm state + türetilmiş değerler + reset/scroll
 * effect'leri. Modal sadece bu hook'tan dönen değerleri tüketir; doğrudan setState
 * yapmasına gerek kalmaz. SRP: tek sorumluluğu costs UI'nin durum makinesini yürütmek.
 */
export function usePersonnelDetailCostsState({
  open,
  personnel,
  focusAdvanceId,
  focusExpenseTransactionId,
  branchNameById,
  isSystemAdmin,
  isNarrow,
  t,
  locale,
  isCostsTab,
}: UsePersonnelDetailCostsStateArgs) {
  const pid = personnel?.id ?? 0;
  // ─── State ──────────────────────────────────────────────────────────────────
  const [costsListSeason, setCostsListSeason] = useState("");
  const [pdfScopeSeason, setPdfScopeSeason] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [advPage, setAdvPage] = useState(1);
  /** null → auto: 20 mobile, 10 desktop. */
  const [advPageSize, setAdvPageSize] = useState<string | null>(null);
  const [costsPdfScopeModalOpen, setCostsPdfScopeModalOpen] = useState(false);
  const [costsListSeasonModalOpen, setCostsListSeasonModalOpen] =
    useState(false);
  const [pdfScopeDraft, setPdfScopeDraft] = useState("");
  const [costsListSeasonDraft, setCostsListSeasonDraft] = useState("");
  const costsPdfModalTitleId = useId();
  const costsListSeasonModalTitleId = useId();
  const [costsFiltersDrawerOpen, setCostsFiltersDrawerOpen] = useState(false);
  const [costsActionsDrawerOpen, setCostsActionsDrawerOpen] = useState(false);
  const [showDeletedAdvances, setShowDeletedAdvances] = useState(false);
  const [highlightCostKey, setHighlightCostKey] = useState<string | null>(null);

  /** Optimistic siliniyor animasyonu için: key formatı a-<id> | e-<id>. */
  const [deletingCostRows, setDeletingCostRows] = useState<Set<string>>(
    () => new Set(),
  );
  const markCostRowDeleting = useCallback((key: string) => {
    setDeletingCostRows((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);
  const unmarkCostRowDeleting = useCallback((key: string) => {
    setDeletingCostRows((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // ─── Türetilmiş değerler ───────────────────────────────────────────────────
  const autoAdvPageSize = isNarrow ? "20" : "10";
  const advPageSizeVal = advPageSize ?? autoAdvPageSize;
  const effectiveIncludeDeleted = isSystemAdmin && showDeletedAdvances;

  // ─── Queries (costs sekmesine ait veri çekimi) ─────────────────────────────
  const {
    data: advancesRaw = [],
    isPending: advLoading,
    isError: advError,
    error: advErr,
  } = usePersonnelAdvancesAll(
    open && pid > 0 ? pid : null,
    effectiveIncludeDeleted,
  );

  const {
    data: attributedExpenses = [],
    isPending: attrExpLoading,
    isError: attrExpError,
    error: attrExpErr,
  } = useQuery({
    queryKey: ["personnel", "attributed-expenses", pid],
    queryFn: () => fetchPersonnelAttributedExpenses(pid),
    enabled: open && pid > 0 && isCostsTab,
  });

  /** Reconciliation drill-down'dan gelen "işaretlenecek" kayıt anahtarı. */
  const focusCostKey = useMemo(() => {
    if (focusAdvanceId && focusAdvanceId > 0) return `a-${focusAdvanceId}`;
    if (focusExpenseTransactionId && focusExpenseTransactionId > 0)
      return `e-${focusExpenseTransactionId}`;
    return null;
  }, [focusAdvanceId, focusExpenseTransactionId]);

  const attributedNonAdvanceExpensesBase = useMemo(
    () => attributedExpenses.filter((r) => !attributedExpenseRowIsAdvance(r)),
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
    } else if (sf === "PERSONNEL_HELD_REGISTER_CASH") {
      rows = rows.filter((a) => {
        const st = a.sourceType.toUpperCase();
        return (
          st === "PERSONNEL_HELD_REGISTER_CASH" || st === "PERSONNEL_POCKET"
        );
      });
    }
    return rows;
  }, [advancesRaw, costsListSeason, branchFilter, sourceFilter]);

  const combinedCostsRows = useMemo<PersonnelCostsCombinedRow[]>(() => {
    const advPart = filteredAdvances.map((advance) => ({
      kind: "advance" as const,
      advance,
    }));
    const expPart = filteredExpensesForCostsCombo.map((tx) => ({
      kind: "expense" as const,
      tx,
    }));
    const sortKey = (r: PersonnelCostsCombinedRow) =>
      r.kind === "advance"
        ? r.advance.advanceDate.slice(0, 10)
        : String(r.tx.transactionDate ?? "").slice(0, 10);
    const rowId = (r: PersonnelCostsCombinedRow) =>
      r.kind === "advance" ? r.advance.id : r.tx.id;
    return [...advPart, ...expPart].sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      if (ka !== kb) return kb.localeCompare(ka);
      return rowId(b) - rowId(a);
    });
  }, [filteredAdvances, filteredExpensesForCostsCombo]);

  const advSize =
    PERSONNEL_COSTS_PAGE_SIZE_OPTIONS.find(
      (n) => String(n) === advPageSizeVal,
    ) ?? PERSONNEL_COSTS_PAGE_SIZE_OPTIONS[0];
  const advTotalPages = Math.max(
    1,
    Math.ceil(combinedCostsRows.length / advSize),
  );

  // Sayfa, toplamı aşarsa son sayfaya geri sıkıştır.
  useEffect(() => {
    setAdvPage((p) => Math.min(p, advTotalPages));
  }, [advTotalPages]);

  const advSafePage = Math.min(advPage, advTotalPages);
  const costsSlice = useMemo(() => {
    const start = (advSafePage - 1) * advSize;
    return combinedCostsRows.slice(start, start + advSize);
  }, [combinedCostsRows, advSafePage, advSize]);

  const costsAdvanceTotal = useMemo(
    () =>
      filteredAdvances
        .filter((row) => !row.isDeleted)
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
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
  const costsSummaryCurrency =
    (personnel?.currencyCode ?? "TRY").trim() || "TRY";

  // ─── Select option'ları ────────────────────────────────────────────────────
  const seasonScopeSelectOptions = useMemo(
    () => settlementSeasonYearSelectOptions(t),
    [t],
  );

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailAdvancesAnyBranch") },
      ...[...branchNameById.entries()]
        .sort((a, b) =>
          a[1].localeCompare(b[1], locale === "tr" ? "tr" : "en"),
        )
        .map(([id, name]) => ({ value: String(id), label: name })),
    ],
    [branchNameById, locale, t],
  );

  const sourceOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailSourceAll") },
      { value: "CASH", label: t("personnel.detailAdvanceSourceFilterBranch") },
      { value: "PATRON", label: t("personnel.detailAdvanceSourceFilterPatron") },
      {
        value: "PERSONNEL_HELD_REGISTER_CASH",
        label: t("personnel.detailAdvanceSourceFilterHeldRegister"),
      },
    ],
    [t],
  );

  const pageSizeSelectOptions = useMemo(
    () =>
      PERSONNEL_COSTS_PAGE_SIZE_OPTIONS.map((n) => ({
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
          (advPageSize !== null && advPageSizeVal !== autoAdvPageSize) ||
          (isSystemAdmin && showDeletedAdvances),
      ),
    [
      costsListSeason,
      branchFilter,
      sourceFilter,
      advPageSize,
      advPageSizeVal,
      autoAdvPageSize,
      isSystemAdmin,
      showDeletedAdvances,
    ],
  );

  const costsListSeasonFilterYear = useMemo(
    () => parseSettlementSeasonYearChoice(costsListSeason),
    [costsListSeason],
  );

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Modal yeniden açıldığında filtreleri sıfırla + focus key'i highlight'a yaz.
  useEffect(() => {
    if (!open || !personnel) return;
    setCostsListSeason("");
    setPdfScopeSeason("");
    setBranchFilter("");
    setSourceFilter("");
    setAdvPage(1);
    setAdvPageSize(null);
    setCostsPdfScopeModalOpen(false);
    setCostsListSeasonModalOpen(false);
    setCostsFiltersDrawerOpen(false);
    setCostsActionsDrawerOpen(false);
    setHighlightCostKey(focusCostKey);
  }, [open, personnel?.id, focusCostKey]);

  // Filtre değişince sayfayı 1'e dön.
  useEffect(() => {
    setAdvPage(1);
  }, [costsListSeason, branchFilter, sourceFilter, advPageSizeVal]);

  // Sekme costs değilse drawer'ları kapat.
  useEffect(() => {
    if (!isCostsTab) {
      setCostsFiltersDrawerOpen(false);
      setCostsActionsDrawerOpen(false);
    }
  }, [isCostsTab]);

  // İşaretlenen satıra kaydır + birkaç saniye sonra vurguyu kaldır.
  useEffect(() => {
    if (!open || !highlightCostKey || !isCostsTab) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-cost-row="${highlightCostKey}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const clearTimer = window.setTimeout(
      () => setHighlightCostKey(null),
      4000,
    );
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [open, highlightCostKey, isCostsTab]);

  return {
    // State + setters
    costsListSeason,
    setCostsListSeason,
    pdfScopeSeason,
    setPdfScopeSeason,
    branchFilter,
    setBranchFilter,
    sourceFilter,
    setSourceFilter,
    advPage,
    setAdvPage,
    advPageSize,
    setAdvPageSize,
    advPageSizeVal,
    costsPdfScopeModalOpen,
    setCostsPdfScopeModalOpen,
    costsListSeasonModalOpen,
    setCostsListSeasonModalOpen,
    pdfScopeDraft,
    setPdfScopeDraft,
    costsListSeasonDraft,
    setCostsListSeasonDraft,
    costsPdfModalTitleId,
    costsListSeasonModalTitleId,
    costsFiltersDrawerOpen,
    setCostsFiltersDrawerOpen,
    costsActionsDrawerOpen,
    setCostsActionsDrawerOpen,
    showDeletedAdvances,
    setShowDeletedAdvances,
    effectiveIncludeDeleted,
    deletingCostRows,
    markCostRowDeleting,
    unmarkCostRowDeleting,
    highlightCostKey,
    setHighlightCostKey,
    focusCostKey,
    // Türetilmiş
    attributedNonAdvanceExpensesBase,
    filteredExpensesForCostsCombo,
    filteredAdvances,
    combinedCostsRows,
    costsSlice,
    costsAdvanceTotal,
    costsExpenseTotal,
    costsCombinedTotal,
    costsSummaryCurrency,
    advTotalPages,
    advSafePage,
    advSize,
    branchOptions,
    sourceOptions,
    pageSizeSelectOptions,
    seasonScopeSelectOptions,
    advFiltersActive,
    costsListSeasonFilterYear,
    // Query state'leri
    advLoading,
    advError,
    advErr,
    attrExpLoading,
    attrExpError,
    attrExpErr,
    attributedExpenses,
  };
}

export type PersonnelDetailCostsState = ReturnType<
  typeof usePersonnelDetailCostsState
>;
