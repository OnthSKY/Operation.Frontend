"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { fetchBranches } from "@/modules/branch/api/branches-api";
import { BranchDetailSheet } from "@/modules/branch/components/BranchDetailSheet";
import { fetchAllAdvances } from "@/modules/personnel/api/advances-api";
import { fetchPersonnelList } from "@/modules/personnel/api/personnel-api";
import { PersonnelFormModal } from "@/modules/personnel/components/PersonnelFormModal";
import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import { WarehouseDetailModal } from "@/modules/warehouse/components/WarehouseDetailModal";
import {
  GLOBAL_SEARCH_ITEMS,
  type GlobalSearchItemDef,
} from "@/shared/lib/global-search-items";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Modal } from "@/shared/ui/Modal";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { AdvanceListItem } from "@/types/advance";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import type { WarehouseListItem } from "@/types/warehouse";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DEBOUNCE_MS = 320;
const MIN_ENTITY_QUERY_LEN = 2;
const MAX_ENTITY_RESULTS = 35;

const GLOBAL_SEARCH_DENY_FOR_PERSONNEL = new Set([
  "home",
  "reports",
  "personnel",
  "advance",
  "advances-all",
  "admin-users",
  "warehouse",
  "products",
]);

function isTypingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function norm(s: string, locale: string) {
  return s.toLocaleLowerCase(locale);
}

type ListsBundle = {
  branches: Branch[];
  personnel: Personnel[];
  warehouses: WarehouseListItem[];
  advances: AdvanceListItem[];
};

type EntityHit =
  | { kind: "branch"; branch: Branch }
  | { kind: "personnel"; personnel: Personnel }
  | { kind: "warehouse"; warehouse: WarehouseListItem }
  | { kind: "advance"; advance: AdvanceListItem };

type Row =
  | { type: "nav"; nav: GlobalSearchItemDef }
  | { type: "entity"; hit: EntityHit };

function warehouseHaystack(w: WarehouseListItem): string {
  return [
    w.name,
    w.address ?? "",
    w.city ?? "",
    w.responsibleManagerDisplayName ?? "",
    w.responsibleMasterDisplayName ?? "",
  ]
    .join(" ")
    .trim();
}

function advanceHaystack(a: AdvanceListItem): string {
  return [
    a.personnelFullName ?? "",
    a.branchName ?? "",
    a.description ?? "",
    String(a.amount),
    a.advanceDate?.slice(0, 10) ?? "",
    String(a.effectiveYear),
    a.sourceType ?? "",
  ]
    .join(" ")
    .trim();
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  return t("personnel.advanceSourceAbbrCash");
}

function AdvanceSearchDetailModal({
  open,
  row,
  onClose,
  t,
  locale,
}: {
  open: boolean;
  row: AdvanceListItem | null;
  onClose: () => void;
  t: (k: string) => string;
  locale: Locale;
}) {
  const dash = t("personnel.dash");
  if (!open || !row) return null;
  const dateLabel = formatLocaleDate(row.advanceDate, locale, dash);
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="global-search-advance-detail"
      title={row.personnelFullName?.trim() || t("personnel.advance")}
      description={`${t("search.catAdvance")} · ${row.branchName?.trim() || dash}`}
      closeButtonLabel={t("common.close")}
    >
      <dl className="mt-2 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t("personnel.advanceDate")}</dt>
          <dd className="text-right font-medium text-zinc-900">{dateLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t("personnel.sourceType")}</dt>
          <dd className="text-right text-zinc-900">
            {sourceAbbrev(t, row.sourceType)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t("personnel.effectiveYear")}</dt>
          <dd className="text-right tabular-nums text-zinc-900">
            {row.effectiveYear}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t("personnel.amount")}</dt>
          <dd className="text-right font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(row.amount, dash, locale)}{" "}
            <span className="text-xs font-normal text-zinc-500">
              {row.currencyCode}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("personnel.note")}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-zinc-900">
            {row.description?.trim() || dash}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}

function buildEntityHits(bundle: ListsBundle, qRaw: string, loc: string): EntityHit[] {
  const Q = norm(qRaw.trim(), loc);
  if (!Q) return [];
  const out: EntityHit[] = [];
  for (const branch of bundle.branches) {
    if (norm(branch.name, loc).includes(Q)) {
      out.push({ kind: "branch", branch });
    }
  }
  for (const personnel of bundle.personnel) {
    if (personnel.isDeleted) continue;
    if (norm(personnel.fullName, loc).includes(Q)) {
      out.push({ kind: "personnel", personnel });
    }
  }
  for (const warehouse of bundle.warehouses) {
    if (norm(warehouseHaystack(warehouse), loc).includes(Q)) {
      out.push({ kind: "warehouse", warehouse });
    }
  }
  for (const advance of bundle.advances) {
    if (norm(advanceHaystack(advance), loc).includes(Q)) {
      out.push({ kind: "advance", advance });
    }
  }
  return out.slice(0, MAX_ENTITY_RESULTS);
}

export function AppGlobalSearch() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchGen = useRef(0);

  const [bundle, setBundle] = useState<{
    queryKey: string;
    data: ListsBundle;
  } | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);

  const [branchSheet, setBranchSheet] = useState<Branch | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [personnelEdit, setPersonnelEdit] = useState<Personnel | null>(null);
  const [advanceDetail, setAdvanceDetail] = useState<AdvanceListItem | null>(
    null
  );
  const [prodModal, setProdModal] = useState(false);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const loc = locale === "tr" ? "tr-TR" : "en-US";

  const debouncedTrim = debouncedQuery.trim();
  const entityQueryOk = debouncedTrim.length >= MIN_ENTITY_QUERY_LEN;

  useEffect(() => {
    if (!entityQueryOk) {
      setBundle(null);
      setEntityLoading(false);
      setEntityError(null);
      return;
    }
    const q = debouncedTrim;
    const id = ++fetchGen.current;
    setEntityLoading(true);
    setEntityError(null);
    void (async () => {
      try {
        const [branches, personnel, warehouses, advances] = personnelPortal
          ? await Promise.all([
              fetchBranches(),
              Promise.resolve([] as Personnel[]),
              Promise.resolve([] as WarehouseListItem[]),
              Promise.resolve([] as AdvanceListItem[]),
            ])
          : await Promise.all([
              fetchBranches(),
              fetchPersonnelList(),
              fetchWarehouses(),
              fetchAllAdvances({ limit: 1000 }),
            ]);
        if (id !== fetchGen.current) return;
        setBundle({
          queryKey: q,
          data: { branches, personnel, warehouses, advances },
        });
      } catch (e) {
        if (id !== fetchGen.current) return;
        setBundle(null);
        setEntityError(toErrorMessage(e));
      } finally {
        if (id === fetchGen.current) setEntityLoading(false);
      }
    })();
  }, [debouncedTrim, entityQueryOk, personnelPortal]);

  const entityHits = useMemo(() => {
    if (!entityQueryOk || !bundle || bundle.queryKey !== debouncedTrim) return [];
    return buildEntityHits(bundle.data, debouncedTrim, loc);
  }, [entityQueryOk, bundle, debouncedTrim, loc]);

  const navFiltered = useMemo(() => {
    const base = personnelPortal
      ? GLOBAL_SEARCH_ITEMS.filter((i) => !GLOBAL_SEARCH_DENY_FOR_PERSONNEL.has(i.id))
      : [...GLOBAL_SEARCH_ITEMS];
    const q = norm(query.trim(), loc);
    if (!q) return base;
    return base.filter((item) => {
      const title = norm(t(item.titleKey), loc);
      const sub = norm(t(item.subtitleKey), loc);
      const extra = norm(item.match, loc);
      const hay = `${title} ${sub} ${extra}`;
      return hay.includes(q);
    });
  }, [query, t, loc, personnelPortal]);

  const rows: Row[] = useMemo(() => {
    const r: Row[] = navFiltered.map((nav) => ({ type: "nav", nav }));
    for (const hit of entityHits) r.push({ type: "entity", hit });
    return r;
  }, [navFiltered, entityHits]);

  useEffect(() => {
    setHighlight((h) =>
      rows.length === 0 ? 0 : Math.min(h, rows.length - 1)
    );
  }, [rows.length]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const closeSearchOnly = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const staffForBranch = useCallback(
    (branchId: number): Personnel[] => {
      const data = bundle?.data;
      if (!data) return [];
      return data.personnel.filter(
        (p) => !p.isDeleted && p.branchId === branchId
      );
    },
    [bundle]
  );

  const activateRow = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === "nav") {
        go(row.nav.href);
        return;
      }
      closeSearchOnly();
      const h = row.hit;
      if (h.kind === "branch") setBranchSheet(h.branch);
      else if (h.kind === "warehouse") setWarehouseId(h.warehouse.id);
      else if (h.kind === "personnel") setPersonnelEdit(h.personnel);
      else setAdvanceDetail(h.advance);
    },
    [go, closeSearchOnly]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (isTypingInField(e.target) && !open) return;
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const modLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  const searchTooltip = useMemo(
    () => `${t("search.open")} (${modLabel}+K)`,
    [t, modLabel]
  );

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (rows.length ? (h + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) =>
        rows.length ? (h - 1 + rows.length) % rows.length : 0
      );
    } else if (e.key === "Enter" && rows[highlight]) {
      e.preventDefault();
      activateRow(rows[highlight]);
    }
  };

  const showNoResults = rows.length === 0 && !entityLoading;

  return (
    <>
      <Tooltip content={searchTooltip} delayMs={360} className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 min-w-0 w-full flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100"
          aria-label={t("search.open")}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0 text-zinc-400"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="min-w-0 flex-1 truncate">{t("search.placeholder")}</span>
          <kbd className="hidden shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 sm:inline">
            {modLabel}K
          </kbd>
        </button>
      </Tooltip>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-zinc-900/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-16"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setQuery("");
            }
          }}
        >
          <div
            role="dialog"
            aria-label={t("search.open")}
            className="flex max-h-[min(78vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl lg:max-h-[min(82vh,44rem)] lg:max-w-2xl xl:max-w-3xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-zinc-400"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t("search.placeholder")}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-controls="command-search-list"
                aria-activedescendant={
                  rows[highlight]
                    ? rows[highlight].type === "nav"
                      ? `command-search-${rows[highlight].nav.id}`
                      : `command-search-ent-${rows[highlight].hit.kind}-${
                          rows[highlight].hit.kind === "branch"
                            ? rows[highlight].hit.branch.id
                            : rows[highlight].hit.kind === "personnel"
                              ? rows[highlight].hit.personnel.id
                              : rows[highlight].hit.kind === "warehouse"
                                ? rows[highlight].hit.warehouse.id
                                : rows[highlight].hit.advance.id
                        }`
                    : undefined
                }
              />
              <span className="hidden shrink-0 text-[10px] text-zinc-400 sm:block">
                {t("search.shortcutHint")} Esc
              </span>
            </div>
            {entityError ? (
              <p className="border-b border-zinc-100 px-3 py-2 text-xs text-red-600">
                {entityError}
              </p>
            ) : null}
            {entityQueryOk && entityLoading ? (
              <p className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                {t("search.loadingRecords")}
              </p>
            ) : null}
            <div
              id="command-search-list"
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto p-1"
              aria-label={t("search.open")}
            >
              {showNoResults ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">
                  {t("search.noResults")}
                </p>
              ) : (
                rows.map((row, i) => {
                  const active = i === highlight;
                  if (row.type === "nav") {
                    const item = row.nav;
                    return (
                      <button
                        key={`nav-${item.id}`}
                        type="button"
                        id={`command-search-${item.id}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => activateRow(row)}
                        className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                          active
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-800 hover:bg-zinc-100"
                        }`}
                      >
                        <span className="font-medium">{t(item.titleKey)}</span>
                        <span
                          className={
                            active ? "text-zinc-300" : "text-zinc-500"
                          }
                        >
                          {t(item.subtitleKey)}
                        </span>
                      </button>
                    );
                  }
                  const hit = row.hit;
                  const entId =
                    hit.kind === "branch"
                      ? `command-search-ent-branch-${hit.branch.id}`
                      : hit.kind === "personnel"
                        ? `command-search-ent-personnel-${hit.personnel.id}`
                        : hit.kind === "warehouse"
                          ? `command-search-ent-warehouse-${hit.warehouse.id}`
                          : `command-search-ent-advance-${hit.advance.id}`;
                  const cat =
                    hit.kind === "branch"
                      ? t("search.catBranch")
                      : hit.kind === "personnel"
                        ? t("search.catPersonnel")
                        : hit.kind === "warehouse"
                          ? t("search.catWarehouse")
                          : t("search.catAdvance");
                  const title =
                    hit.kind === "branch"
                      ? hit.branch.name
                      : hit.kind === "personnel"
                        ? hit.personnel.fullName
                        : hit.kind === "warehouse"
                          ? hit.warehouse.name
                          : hit.advance.personnelFullName?.trim() ||
                            t("personnel.advance");
                  const sub =
                    hit.kind === "branch"
                      ? cat
                      : hit.kind === "personnel"
                        ? `${cat} · ${hit.personnel.branchId != null ? `#${hit.personnel.branchId}` : "—"}`
                        : hit.kind === "warehouse"
                          ? `${cat} · ${[hit.warehouse.city, hit.warehouse.address].filter(Boolean).join(" · ") || "—"}`
                          : `${cat} · ${hit.advance.branchName?.trim() || "—"}${hit.advance.description?.trim() ? ` · ${hit.advance.description.trim().slice(0, 80)}${hit.advance.description.trim().length > 80 ? "…" : ""}` : ""}`;
                  return (
                    <button
                      key={entId}
                      type="button"
                      id={entId}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => activateRow(row)}
                      className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="font-medium">{title}</span>
                      <span
                        className={
                          active ? "text-zinc-300" : "text-zinc-500"
                        }
                      >
                        {sub}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {branchSheet ? (
        <BranchDetailSheet
          open
          branch={branchSheet}
          staff={staffForBranch(branchSheet.id)}
          employeeSelfService={personnelPortal}
          onClose={() => setBranchSheet(null)}
        />
      ) : null}

      {warehouseId != null ? (
        <WarehouseDetailModal
          open
          warehouseId={warehouseId}
          onClose={() => setWarehouseId(null)}
          onOpenAddProduct={() => setProdModal(true)}
        />
      ) : null}

      <AddProductModal
        open={prodModal}
        onClose={() => setProdModal(false)}
        descriptionKey="warehouse.addProductHint"
      />

      {personnelEdit ? (
        <PersonnelFormModal
          open
          initial={personnelEdit}
          onClose={() => setPersonnelEdit(null)}
        />
      ) : null}

      <AdvanceSearchDetailModal
        open={advanceDetail != null}
        row={advanceDetail}
        onClose={() => setAdvanceDetail(null)}
        t={t}
        locale={locale}
      />
    </>
  );
}
