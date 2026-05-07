"use client";

import { cn } from "@/lib/cn";
import { computeComboboxMenuGeom, type ComboboxMenuGeom } from "@/shared/lib/combobox-menu-geom";
import { scrollOverlayAnchorIntoView } from "@/shared/lib/scroll-overlay-anchor-into-view";
import { rafThrottle } from "@/shared/lib/viewport-raf-throttle";
import { OVERLAY_Z_INDEX } from "@/shared/overlays/z-layers";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type RichComboboxOption = {
  value: string;
  title: string;
  description?: string;
  detail?: string;
};

type RichComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: RichComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Sunucu zaten aramayı uyguladıysa yerel filtreleme yapılmaz. */
  serverSideFilter?: boolean;
  /** Açılışta arama kutusunu sıfırla (varsayılan true). Sunucu aramasında false verin. */
  clearQueryOnOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onReachEnd?: () => void;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  /** Portallanan liste z-index (modal üstü). */
  menuZIndex?: number;
};

export function RichCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  query,
  onQueryChange,
  serverSideFilter = false,
  clearQueryOnOpen = true,
  onOpenChange,
  hasMore = false,
  isLoadingMore = false,
  onReachEnd,
  loadingText,
  disabled,
  className,
  menuZIndex = OVERLAY_Z_INDEX.menuPanel,
}: RichComboboxProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuGeom, setMenuGeom] = useState<ComboboxMenuGeom | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listPanelRef = useRef<HTMLDivElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const resolvedQuery = query ?? internalQuery;
  const setResolvedQuery = useCallback(
    (next: string) => {
      if (onQueryChange) onQueryChange(next);
      else setInternalQuery(next);
    },
    [onQueryChange]
  );

  const patchOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  const closeAndReset = useCallback(() => {
    patchOpen(false);
    setResolvedQuery("");
  }, [patchOpen, setResolvedQuery]);

  const filtered = useMemo(() => {
    if (serverSideFilter) return options;
    const q = resolvedQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return options;
    return options.filter((opt) =>
      `${opt.title} ${opt.description ?? ""} ${opt.detail ?? ""}`.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [options, resolvedQuery, serverSideFilter]);

  const selected = useMemo(() => options.find((x) => x.value === value) ?? null, [options, value]);

  const refreshMenuGeom = useCallback(() => {
    if (!containerRef.current) return;
    setMenuGeom(computeComboboxMenuGeom(containerRef.current));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (clearQueryOnOpen) {
      setResolvedQuery("");
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, clearQueryOnOpen, setResolvedQuery]);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setMenuGeom(null);
      return;
    }
    scrollOverlayAnchorIntoView(containerRef.current);
    const throttled = rafThrottle(refreshMenuGeom);
    throttled.flush();
    const handler = throttled.schedule;
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handler);
      vv.addEventListener("scroll", handler);
    }
    return () => {
      throttled.cancel();
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
      if (vv) {
        vv.removeEventListener("resize", handler);
        vv.removeEventListener("scroll", handler);
      }
    };
  }, [open, disabled, refreshMenuGeom, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node;
      if (containerRef.current?.contains(node)) return;
      if (listPanelRef.current?.contains(node)) return;
      patchOpen(false);
      setResolvedQuery("");
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open, patchOpen, setResolvedQuery]);

  useEffect(() => {
    if (!open || !onReachEnd || !hasMore || isLoadingMore || !menuGeom) return;
    const root = listScrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        onReachEnd();
      },
      { root, rootMargin: "0px 0px 160px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, onReachEnd, hasMore, isLoadingMore, filtered.length, menuGeom]);

  const openList = useCallback(() => {
    if (disabled) return;
    patchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled, patchOpen]);

  const displayValue = open ? resolvedQuery : (selected?.title ?? "");

  const onInputChange = (raw: string) => {
    if (!open) {
      patchOpen(true);
      setResolvedQuery(raw);
      return;
    }
    setResolvedQuery(raw);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        patchOpen(false);
        setResolvedQuery("");
      }
      return;
    }
    if (
      !open &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      patchOpen(true);
      setResolvedQuery(e.key);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const listPanel =
    open &&
    !disabled &&
    mounted &&
    menuGeom &&
    createPortal(
      <div
        ref={listPanelRef}
        style={{
          position: "fixed",
          top: menuGeom.top,
          left: menuGeom.left,
          width: menuGeom.width,
          maxHeight: menuGeom.maxHeight,
          zIndex: menuZIndex,
        }}
        className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
      >
        <div
          ref={listScrollRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-zinc-500">{emptyText}</p>
          ) : (
            <ul className="divide-y divide-zinc-100 py-0.5">
              {filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        closeAndReset();
                      }}
                      disabled={disabled}
                      className={cn(
                        "min-h-11 w-full px-3 py-2.5 text-left transition active:bg-zinc-100 sm:min-h-10",
                        isSelected ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-semibold leading-snug",
                          isSelected ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {opt.title || placeholder}
                      </p>
                      {opt.description ? (
                        <p
                          className={cn(
                            "mt-0.5 text-xs leading-snug",
                            isSelected ? "text-zinc-200" : "text-zinc-600"
                          )}
                        >
                          {opt.description}
                        </p>
                      ) : null}
                      {opt.detail ? (
                        <p
                          className={cn(
                            "mt-0.5 text-xs leading-snug",
                            isSelected ? "text-zinc-300" : "text-zinc-500"
                          )}
                        >
                          {opt.detail}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > 0 && hasMore && onReachEnd ? (
            <div ref={loadMoreSentinelRef} className="h-2 w-full shrink-0" aria-hidden />
          ) : null}
          {isLoadingMore ? (
            <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
              {loadingText ?? "Loading..."}
            </p>
          ) : null}
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={containerRef} className={cn("w-full min-w-0", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          autoComplete="off"
          readOnly={!open}
          value={displayValue}
          title={!open && selected ? `${selected.title}${selected.detail ? ` · ${selected.detail}` : ""}` : undefined}
          placeholder={
            !open
              ? placeholder
              : resolvedQuery === "" && selected?.title
                ? selected.title
                : searchPlaceholder
          }
          onChange={(e) => onInputChange(e.target.value)}
          onClick={() => {
            if (!disabled && !open) openList();
          }}
          onFocus={() => {
            if (!disabled && !open) openList();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "h-10 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 read-only:cursor-pointer sm:h-11 sm:text-base",
            disabled && "cursor-not-allowed bg-zinc-50 opacity-70"
          )}
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500"
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn("transition-transform", open && "rotate-180")}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {!open && (selected?.description || selected?.detail) ? (
        <p className="mt-1 line-clamp-2 px-0.5 text-[11px] leading-snug text-zinc-500">
          {selected.description || selected.detail}
        </p>
      ) : null}
      {listPanel}
    </div>
  );
}
