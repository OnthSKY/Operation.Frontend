"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { fetchGlobalSearch, type GlobalSearchHit } from "@/shared/api/global-search-api";
import { cn } from "@/lib/cn";
import {
  GLOBAL_SEARCH_ITEMS,
  type GlobalSearchItemDef,
} from "@/shared/lib/global-search-items";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Tooltip } from "@/shared/ui/Tooltip";
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
const MAX_ENTITY_RESULTS = 50;

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

type Row =
  | { type: "nav"; nav: GlobalSearchItemDef }
  | { type: "entity"; hit: GlobalSearchHit };

type SearchKindOption = {
  kind: GlobalSearchHit["kind"];
  label: string;
};

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
  const [entityHits, setEntityHits] = useState<GlobalSearchHit[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [selectedKinds, setSelectedKinds] = useState<GlobalSearchHit["kind"][]>([]);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const loc = locale === "tr" ? "tr-TR" : "en-US";

  const debouncedTrim = debouncedQuery.trim();
  const entityQueryOk = debouncedTrim.length >= MIN_ENTITY_QUERY_LEN;
  const kindOptions = useMemo<SearchKindOption[]>(
    () => [
      { kind: "branch", label: t("search.catBranch") },
      { kind: "personnel", label: t("search.catPersonnel") },
      { kind: "warehouse", label: t("search.catWarehouse") },
      { kind: "vehicle", label: t("search.catVehicle") },
      { kind: "product", label: t("search.catProduct") },
      { kind: "advance", label: t("search.catAdvance") },
      { kind: "user", label: t("search.catUser") },
      { kind: "supplierInvoice", label: t("search.subSupplierInvoices") },
      { kind: "branchTransaction", label: t("search.catBranchTransaction") },
      { kind: "warehouseMovement", label: t("search.catWarehouseMovement") },
      { kind: "document", label: t("search.catDocument") },
    ],
    [t]
  );
  const availableKindOptions = useMemo(() => {
    const admin = user?.role === "ADMIN";
    return kindOptions.filter((opt) => {
      if (!admin && opt.kind === "user") return false;
      if (personnelPortal) {
        return (
          opt.kind === "branch" ||
          opt.kind === "vehicle" ||
          opt.kind === "document"
        );
      }
      return true;
    });
  }, [kindOptions, user?.role, personnelPortal]);

  useEffect(() => {
    if (!entityQueryOk) {
      setEntityHits([]);
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
        const items = await fetchGlobalSearch(q, 10, {
          types: selectedKinds,
          limitTotal: MAX_ENTITY_RESULTS,
        });
        if (id !== fetchGen.current) return;
        setEntityHits(items.slice(0, MAX_ENTITY_RESULTS));
      } catch (e) {
        if (id !== fetchGen.current) return;
        setEntityHits([]);
        setEntityError(toErrorMessage(e));
      } finally {
        if (id === fetchGen.current) setEntityLoading(false);
      }
    })();
  }, [debouncedTrim, entityQueryOk, selectedKinds]);

  useEffect(() => {
    setSelectedKinds((prev) =>
      prev.filter((kind) => availableKindOptions.some((opt) => opt.kind === kind))
    );
  }, [availableKindOptions]);

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

  const activateRow = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.type === "nav") {
        go(row.nav.href);
        return;
      }
      const h = row.hit;
      setOpen(false);
      setQuery("");
      if (h.route?.trim()) {
        go(h.route);
        return;
      }
      if (h.kind === "branch") go(`/branches?openBranch=${h.id}`);
      else if (h.kind === "warehouse") go(`/warehouses?openWarehouse=${h.id}`);
      else if (h.kind === "personnel") go(`/personnel?openPersonnel=${h.id}`);
      else if (h.kind === "product") go(`/products?openProduct=${h.id}`);
      else if (h.kind === "vehicle") go(`/vehicles?openVehicle=${h.id}`);
    },
    [go]
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
    const onOpen = () => setOpen(true);
    window.addEventListener("app-global-search-open", onOpen);
    return () => window.removeEventListener("app-global-search-open", onOpen);
  }, []);

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
                          return `command-search-ent-${h.kind}-${h.id}`;
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
            <div className="border-b border-zinc-100 px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedKinds([])}
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px] font-medium",
                    selectedKinds.length === 0
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {t("common.all")}
                </button>
                {availableKindOptions.map((opt) => {
                  const active = selectedKinds.includes(opt.kind);
                  return (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() =>
                        setSelectedKinds((prev) =>
                          prev.includes(opt.kind)
                            ? prev.filter((k) => k !== opt.kind)
                            : [...prev, opt.kind]
                        )
                      }
                      className={cn(
                        "rounded-full border px-2 py-1 text-[11px] font-medium",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
                      `command-search-ent-${hit.kind}-${hit.id}`;
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
                                : hit.kind === "user"
                                  ? t("search.catUser")
                                  : hit.kind === "supplierInvoice"
                                    ? t("search.subSupplierInvoices")
                                    : hit.kind === "branchTransaction"
                                      ? t("search.catBranchTransaction")
                                      : hit.kind === "warehouseMovement"
                                        ? t("search.catWarehouseMovement")
                                        : hit.kind === "document"
                                          ? t("search.catDocument")
                                : t("search.catVehicle");
                    const title = hit.title;
                    const sub = `${cat}${hit.subtitle?.trim() ? ` · ${hit.subtitle.trim()}` : ""}`;
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
    </>
  );
}
