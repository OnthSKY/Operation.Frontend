"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { fetchBranches } from "@/modules/branch/api/branches-api";
import { fetchAllAdvances } from "@/modules/personnel/api/advances-api";
import { fetchPersonnelList } from "@/modules/personnel/api/personnel-api";
import { fetchUsersList } from "@/modules/personnel/api/users-api";
import { fetchProductsCatalog } from "@/modules/products/api/products-api";
import { fetchVehicles } from "@/modules/vehicles/api/vehicles-api";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import { cn } from "@/lib/cn";
import {
  GLOBAL_SEARCH_ITEMS,
  type GlobalSearchItemDef,
} from "@/shared/lib/global-search-items";
import { toErrorMessage } from "@/shared/lib/error-message";
import { accountRoleLabel } from "@/modules/account/lib/role-label";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Modal } from "@/shared/ui/Modal";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { AdvanceListItem } from "@/types/advance";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import type { ProductListItem } from "@/types/product";
import type { UserListItem } from "@/types/user";
import type { VehicleListItem } from "@/types/vehicle";
import type { WarehouseListItem } from "@/types/warehouse";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

const DEBOUNCE_MS = 320;
const MIN_ENTITY_QUERY_LEN = 2;
const MAX_ENTITY_RESULTS = 40;

const GLOBAL_SEARCH_DENY_FOR_PERSONNEL = new Set([
  "home",
  "reports",
  "reports-branch-comparison",
  "personnel",
  "advance",
  "admin-users",
  "warehouse",
  "products",
  "general-overhead",
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
  products: ProductListItem[];
  vehicles: VehicleListItem[];
  users: UserListItem[];
};

type EntityHit =
  | { kind: "branch"; branch: Branch }
  | { kind: "personnel"; personnel: Personnel }
  | { kind: "warehouse"; warehouse: WarehouseListItem }
  | { kind: "advance"; advance: AdvanceListItem }
  | { kind: "product"; product: ProductListItem }
  | { kind: "vehicle"; vehicle: VehicleListItem }
  | { kind: "user"; user: UserListItem };

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

function productHaystack(p: ProductListItem): string {
  return [
    p.name,
    p.unit ?? "",
    p.categoryName ?? "",
    ...(p.byWarehouse ?? []).map((w) => `${w.warehouseName} ${w.quantity}`),
  ]
    .join(" ")
    .trim();
}

function userHaystack(u: UserListItem): string {
  return [u.username, u.fullName ?? "", u.role, u.status].join(" ").trim();
}

function vehicleHaystack(v: VehicleListItem): string {
  return [
    v.plateNumber,
    v.plateNumber.replace(/\s+/g, ""),
    v.brand,
    v.model,
    v.year != null ? String(v.year) : "",
    v.status,
    v.assignedPersonnelName ?? "",
    v.assignedBranchName ?? "",
  ]
    .join(" ")
    .trim();
}

/** Plaka: boşluk/tire farkını yok sayarak eşleşme (örn. 34 abc ↔ 34ABC). */
function plateMatchesQuery(plateRaw: string, Q: string, loc: string): boolean {
  const plate = norm(plateRaw, loc);
  if (plate.includes(Q)) return true;
  const qCompact = Q.replace(/[\s.-]+/g, "");
  if (qCompact.length < 2) return false;
  const pCompact = plate.replace(/[\s.-]+/g, "");
  return pCompact.includes(qCompact);
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
  for (const product of bundle.products) {
    if (norm(productHaystack(product), loc).includes(Q)) {
      out.push({ kind: "product", product });
    }
  }
  for (const vehicle of bundle.vehicles) {
    if (
      plateMatchesQuery(vehicle.plateNumber, Q, loc) ||
      norm(vehicleHaystack(vehicle), loc).includes(Q)
    ) {
      out.push({ kind: "vehicle", vehicle });
    }
  }
  for (const sysUser of bundle.users) {
    if (norm(userHaystack(sysUser), loc).includes(Q)) {
      out.push({ kind: "user", user: sysUser });
    }
  }
  return out.slice(0, MAX_ENTITY_RESULTS);
}

export function AppGlobalSearch() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const isAdminUser = user?.role === "ADMIN";
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

  const [advanceDetail, setAdvanceDetail] = useState<AdvanceListItem | null>(
    null
  );

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
        const [branches, personnel, warehouses, advances, products, vehicles, users] =
          personnelPortal
            ? await Promise.all([
                fetchBranches(),
                Promise.resolve([] as Personnel[]),
                Promise.resolve([] as WarehouseListItem[]),
                Promise.resolve([] as AdvanceListItem[]),
                Promise.resolve([] as ProductListItem[]),
                fetchVehicles(),
                Promise.resolve([] as UserListItem[]),
              ])
            : await Promise.all([
                fetchBranches(),
                fetchPersonnelList().then((r) => r.items),
                fetchWarehouses(),
                fetchAllAdvances({ limit: 1000 }),
                fetchProductsCatalog(),
                fetchVehicles(),
                isAdminUser ? fetchUsersList() : Promise.resolve([] as UserListItem[]),
              ]);
        if (id !== fetchGen.current) return;
        setBundle({
          queryKey: q,
          data: { branches, personnel, warehouses, advances, products, vehicles, users },
        });
      } catch (e) {
        if (id !== fetchGen.current) return;
        setBundle(null);
        setEntityError(toErrorMessage(e));
      } finally {
        if (id === fetchGen.current) setEntityLoading(false);
      }
    })();
  }, [debouncedTrim, entityQueryOk, personnelPortal, isAdminUser]);

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
    const navRows = navFiltered.map((nav) => ({ type: "nav" as const, nav }));
    const entRows = entityHits.map((hit) => ({ type: "entity" as const, hit }));
    if (entityQueryOk && entRows.length > 0) return [...entRows, ...navRows];
    return [...navRows, ...entRows];
  }, [navFiltered, entityHits, entityQueryOk]);

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

  const activateRow = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === "nav") {
        go(row.nav.href);
        return;
      }
      const h = row.hit;
      if (h.kind === "advance") {
        closeSearchOnly();
        setAdvanceDetail(h.advance);
        return;
      }
      setOpen(false);
      setQuery("");
      if (h.kind === "branch") go(`/branches?openBranch=${h.branch.id}`);
      else if (h.kind === "warehouse")
        go(`/warehouses?openWarehouse=${h.warehouse.id}`);
      else if (h.kind === "personnel")
        go(`/personnel?openPersonnel=${h.personnel.id}`);
      else if (h.kind === "product")
        go(`/products?openProduct=${h.product.id}`);
      else if (h.kind === "vehicle")
        go(`/vehicles?openVehicle=${h.vehicle.id}`);
      else go(`/admin/users?openUser=${h.user.id}`);
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
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  const modLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  const searchTooltip = useMemo(
    () => `${t("search.open")} (${modLabel}+K)`,
    [t, modLabel]
  );

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
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
          className={`fixed inset-0 ${OVERLAY_Z_TW.globalSearch} flex items-stretch justify-center bg-transparent p-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:items-start sm:p-3 sm:pt-16 sm:pb-3`}
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
            className="flex max-h-[min(92dvh,calc(100dvh-1rem))] w-full max-w-[min(100%,28rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl sm:max-h-[min(82dvh,44rem)] sm:rounded-xl lg:max-w-2xl xl:max-w-3xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 sm:py-2">
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
                className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400 sm:min-h-11 sm:text-sm"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-controls="command-search-list"
                aria-activedescendant={
                  rows[highlight]
                    ? rows[highlight].type === "nav"
                      ? `command-search-${rows[highlight].nav.id}`
                      : (() => {
                          const h = rows[highlight].hit;
                          if (h.kind === "branch") return `command-search-ent-branch-${h.branch.id}`;
                          if (h.kind === "personnel")
                            return `command-search-ent-personnel-${h.personnel.id}`;
                          if (h.kind === "warehouse")
                            return `command-search-ent-warehouse-${h.warehouse.id}`;
                          if (h.kind === "advance")
                            return `command-search-ent-advance-${h.advance.id}`;
                          if (h.kind === "product")
                            return `command-search-ent-product-${h.product.id}`;
                          if (h.kind === "vehicle")
                            return `command-search-ent-vehicle-${h.vehicle.id}`;
                          return `command-search-ent-user-${h.user.id}`;
                        })()
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
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 sm:p-1"
              aria-label={t("search.open")}
            >
              {showNoResults ? (
                <p className="px-3 py-8 text-center text-sm text-zinc-500 sm:py-6">
                  {t("search.noResults")}
                </p>
              ) : (
                (() => {
                  const firstEnt = rows.findIndex((r) => r.type === "entity");
                  const firstNav = rows.findIndex((r) => r.type === "nav");
                  const showPagesHdr =
                    entityQueryOk &&
                    entityHits.length > 0 &&
                    firstNav >= 0 &&
                    firstEnt >= 0 &&
                    firstNav > firstEnt;
                  return rows.map((row, i) => {
                    const active = i === highlight;
                    const bits: ReactNode[] = [];
                    if (i === firstEnt && firstEnt >= 0) {
                      bits.push(
                        <div
                          key="sec-rec"
                          className="sticky top-0 z-[1] bg-white/95 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-400 backdrop-blur-sm"
                        >
                          {t("search.sectionRecords")}
                        </div>
                      );
                    }
                    if (showPagesHdr && i === firstNav) {
                      bits.push(
                        <div
                          key="sec-pages"
                          className="sticky top-0 z-[1] bg-white/95 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-400 backdrop-blur-sm"
                        >
                          {t("search.sectionPages")}
                        </div>
                      );
                    }
                    if (row.type === "nav") {
                      const item = row.nav;
                      bits.push(
                        <button
                          key={`nav-${item.id}`}
                          type="button"
                          id={`command-search-${item.id}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setHighlight(i)}
                          onClick={() => activateRow(row)}
                          className={cn(
                            "touch-manipulation flex w-full flex-col gap-0.5 rounded-xl px-3 py-3.5 text-left text-sm sm:py-2.5",
                            active
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200/80"
                          )}
                        >
                          <span className="font-semibold">{t(item.titleKey)}</span>
                          <span
                            className={cn(
                              "text-xs sm:text-sm",
                              active ? "text-zinc-300" : "text-zinc-500"
                            )}
                          >
                            {t(item.subtitleKey)}
                          </span>
                        </button>
                      );
                      return <Fragment key={`wrap-nav-${item.id}`}>{bits}</Fragment>;
                    }
                    const hit = row.hit;
                    const entId =
                      hit.kind === "branch"
                        ? `command-search-ent-branch-${hit.branch.id}`
                        : hit.kind === "personnel"
                          ? `command-search-ent-personnel-${hit.personnel.id}`
                          : hit.kind === "warehouse"
                            ? `command-search-ent-warehouse-${hit.warehouse.id}`
                            : hit.kind === "advance"
                              ? `command-search-ent-advance-${hit.advance.id}`
                              : hit.kind === "product"
                                ? `command-search-ent-product-${hit.product.id}`
                                : hit.kind === "vehicle"
                                  ? `command-search-ent-vehicle-${hit.vehicle.id}`
                                  : `command-search-ent-user-${hit.user.id}`;
                    const cat =
                      hit.kind === "branch"
                        ? t("search.catBranch")
                        : hit.kind === "personnel"
                          ? t("search.catPersonnel")
                          : hit.kind === "warehouse"
                            ? t("search.catWarehouse")
                            : hit.kind === "advance"
                              ? t("search.catAdvance")
                              : hit.kind === "product"
                                ? t("search.catProduct")
                                : hit.kind === "vehicle"
                                  ? t("search.catVehicle")
                                  : t("search.catUser");
                    const title =
                      hit.kind === "branch"
                        ? hit.branch.name
                        : hit.kind === "personnel"
                          ? hit.personnel.fullName
                          : hit.kind === "warehouse"
                            ? hit.warehouse.name
                            : hit.kind === "advance"
                              ? hit.advance.personnelFullName?.trim() ||
                                t("personnel.advance")
                              : hit.kind === "product"
                                ? hit.product.name
                                : hit.kind === "vehicle"
                                  ? hit.vehicle.plateNumber
                                  : hit.user.username;
                    const sub =
                      hit.kind === "branch"
                        ? cat
                        : hit.kind === "personnel"
                          ? `${cat} · ${hit.personnel.branchId != null ? `#${hit.personnel.branchId}` : "—"}`
                          : hit.kind === "warehouse"
                            ? `${cat} · ${[hit.warehouse.city, hit.warehouse.address].filter(Boolean).join(" · ") || "—"}`
                            : hit.kind === "advance"
                              ? `${cat} · ${hit.advance.branchName?.trim() || "—"}${hit.advance.description?.trim() ? ` · ${hit.advance.description.trim().slice(0, 80)}${hit.advance.description.trim().length > 80 ? "…" : ""}` : ""}`
                              : hit.kind === "product"
                                ? `${cat}${hit.product.categoryName ? ` · ${hit.product.categoryName}` : ""}${hit.product.unit ? ` · ${hit.product.unit}` : ""}`
                                : hit.kind === "vehicle"
                                  ? `${cat} · ${hit.vehicle.brand} ${hit.vehicle.model}${hit.vehicle.year != null ? ` · ${hit.vehicle.year}` : ""} · ${hit.vehicle.status}${hit.vehicle.assignedPersonnelName || hit.vehicle.assignedBranchName ? ` · ${hit.vehicle.assignedPersonnelName ?? hit.vehicle.assignedBranchName}` : ""}`
                                  : `${cat} · ${hit.user.fullName?.trim() || "—"} · ${accountRoleLabel(hit.user.role, t)}`;
                    bits.push(
                      <button
                        key={entId}
                        type="button"
                        id={entId}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => activateRow(row)}
                        className={cn(
                          "touch-manipulation flex w-full flex-col gap-0.5 rounded-xl px-3 py-3.5 text-left text-sm sm:py-2.5",
                          active
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200/80"
                        )}
                      >
                        <span className="font-semibold leading-snug">{title}</span>
                        <span
                          className={cn(
                            "line-clamp-2 text-xs leading-snug sm:text-sm",
                            active ? "text-zinc-300" : "text-zinc-500"
                          )}
                        >
                          {sub}
                        </span>
                      </button>
                    );
                    return <Fragment key={entId}>{bits}</Fragment>;
                  });
                })()
              )}
            </div>
          </div>
        </div>
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
