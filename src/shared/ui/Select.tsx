"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { computeComboboxMenuGeom, type ComboboxMenuGeom } from "@/shared/lib/combobox-menu-geom";
import { scrollOverlayAnchorIntoView } from "@/shared/lib/scroll-overlay-anchor-into-view";
import { rafThrottle } from "@/shared/lib/viewport-raf-throttle";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  label?: string;
  /** When `label` is omitted, sets `aria-label` on the combobox input for accessibility. */
  ariaLabel?: string;
  labelRequired?: boolean;
  /** Label'ın yanına render edilir — genelde domain açıklaması için &lt;InfoHint /&gt; */
  labelHint?: ReactNode;
  error?: string;
  options: SelectOption[];
  /**
   * Son kullanılan opsiyon değerleri — dropdown'da arama boşken üstte
   * "Son kullanılanlar" grubu olarak görünür. Max 5 önerilir; opsiyon listesinde
   * bulunmayan id'ler sessizce yok sayılır.
   */
  recentlyUsedValues?: ReadonlyArray<string | number>;
  name: string;
  value: string;
  onChange: (event: { target: { value: string; name: string } }) => void;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Varsayılan: 130. Üst katmanda (ör. z-index 200 takvim) açılan listeler için yükseltin. */
  menuZIndex?: number;
  /**
   * Bir opsiyon seçilip commit (Enter veya tıklama) edildikten sonra çağrılır —
   * çağıran sıradaki input'a focus alabilir (ör. ürün seçildi → miktar input'una git).
   */
  onAfterCommit?: () => void;
};

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const r of refs) {
      if (!r) continue;
      if (typeof r === "function") r(node);
      else (r as { current: T | null }).current = node;
    }
  };
}

function norm(s: string) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFD");
}

const DROPDOWN_Z = 130;

export const Select = forwardRef<HTMLInputElement, SelectProps>(
  function Select(
    {
      className,
      id,
      label,
      ariaLabel,
      labelRequired,
      labelHint,
      error,
      options,
      recentlyUsedValues,
      name,
      value,
      onChange,
      onBlur,
      disabled,
      menuZIndex,
      onAfterCommit,
    },
    ref
  ) {
    const { t } = useI18n();
    const inputId = id ?? name;
    const listboxId = useId();
    const hasError = error != null && String(error).length > 0;
    const errorText = String(error ?? "").trim();
    const containerRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    const innerRef = useRef<HTMLInputElement>(null);
    const setInputRef = mergeRefs(ref, innerRef);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [menuGeom, setMenuGeom] = useState<ComboboxMenuGeom | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const selectedLabel = useMemo(
      () => options.find((o) => o.value === value)?.label ?? "",
      [options, value]
    );

    /**
     * Arama boşken üstte gösterilecek "Son kullanılanlar" listesi.
     * recentlyUsedValues içinden options'ta var olanları MRU sırasında seç (max 5).
     */
    const recentOptions = useMemo(() => {
      if (!recentlyUsedValues || recentlyUsedValues.length === 0) return [] as SelectOption[];
      if (query.trim().length > 0) return [] as SelectOption[];
      const byValue = new Map(options.map((o) => [String(o.value), o] as const));
      const out: SelectOption[] = [];
      const seen = new Set<string>();
      for (const v of recentlyUsedValues) {
        const key = String(v);
        if (seen.has(key)) continue;
        const opt = byValue.get(key);
        if (!opt) continue;
        seen.add(key);
        out.push(opt);
        if (out.length >= 5) break;
      }
      return out;
    }, [recentlyUsedValues, options, query]);

    const filtered = useMemo(() => {
      const q = norm(query.trim());
      if (!q) {
        // Arama yoksa: önce recent, sonra rest (duplicate hariç)
        if (recentOptions.length === 0) return options;
        const recentSet = new Set(recentOptions.map((o) => String(o.value)));
        return [...recentOptions, ...options.filter((o) => !recentSet.has(String(o.value)))];
      }
      return options.filter(
        (o) => norm(o.label).includes(q) || o.value === value
      );
    }, [options, query, value, recentOptions]);

    /** Recent listesinin sınırı — index < boundary ise "Son kullanılanlar" group'a ait. */
    const recentBoundary = query.trim().length > 0 ? 0 : recentOptions.length;

    const refreshMenuGeom = useCallback(() => {
      if (!containerRef.current) return;
      setMenuGeom(computeComboboxMenuGeom(containerRef.current));
    }, []);

    useEffect(() => {
      if (!open) return;
      setHighlighted(0);
    }, [open, query]);

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
        if (listboxRef.current?.contains(node)) return;
        setOpen(false);
        setQuery("");
      };
      document.addEventListener("pointerdown", onDoc);
      return () => document.removeEventListener("pointerdown", onDoc);
    }, [open]);

    const commit = useCallback(
      (v: string) => {
        onChange({ target: { value: v, name } });
        setOpen(false);
        setQuery("");
        innerRef.current?.blur();
        if (onAfterCommit) requestAnimationFrame(() => onAfterCommit());
      },
      [name, onChange, onAfterCommit]
    );

    const displayValue = open ? query : selectedLabel;

    const onInputChange = (raw: string) => {
      if (!open) {
        setOpen(true);
        setQuery(raw);
        return;
      }
      setQuery(raw);
    };

    const openList = useCallback(() => {
      if (disabled) return;
      setOpen(true);
      setQuery("");
      requestAnimationFrame(() => innerRef.current?.focus());
    }, [disabled]);

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open && e.key === "Backspace") {
        e.preventDefault();
        openList();
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
        setOpen(true);
        setQuery(e.key);
        return;
      }
      if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          setQuery("");
        }
        return;
      }
      if (disabled) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) openList();
        else
          setHighlighted((i) =>
            Math.min(i + 1, Math.max(0, filtered.length - 1))
          );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (open) setHighlighted((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter" && open) {
        e.preventDefault();
        const opt = filtered[highlighted];
        if (opt) commit(opt.value);
        return;
      }
      if (e.key === "Tab" && open) {
        setOpen(false);
        setQuery("");
      }
    };

    const listbox = open && !disabled && mounted && menuGeom && (
      <ul
        ref={listboxRef}
        id={listboxId}
        data-select-combobox-list
        role="listbox"
        style={{
          position: "fixed",
          top: menuGeom.top,
          left: menuGeom.left,
          width: menuGeom.width,
          maxHeight: menuGeom.maxHeight,
          zIndex: menuZIndex ?? DROPDOWN_Z,
        }}
        className="overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2.5 text-sm text-zinc-500">
            {t("common.comboboxNoMatches")}
          </li>
        ) : (
          filtered.map((o, idx) => {
            const isInRecent = idx < recentBoundary;
            // Recent grubunun hemen altında ayraç
            const showDivider = recentBoundary > 0 && idx === recentBoundary;
            // Recent grubunun başına başlık ekle
            const showRecentHeader = idx === 0 && recentBoundary > 0;
            return (
              <Fragment key={`${listboxId}-frag-${idx}`}>
                {showRecentHeader ? (
                  <li
                    className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                    aria-hidden
                    role="presentation"
                  >
                    Son kullanılanlar
                  </li>
                ) : null}
                {showDivider ? (
                  <li className="my-1 border-t border-zinc-100" aria-hidden role="presentation" />
                ) : null}
                <li
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={o.value === value}
                  className={cn(
                    "cursor-pointer px-3 py-2.5 text-sm text-zinc-900",
                    idx === highlighted && "bg-zinc-100",
                    o.value === value && "font-medium"
                  )}
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => commit(o.value)}
                >
                  {isInRecent ? (
                    <span className="mr-1.5 text-amber-600" aria-hidden>
                      ★
                    </span>
                  ) : null}
                  {o.label}
                </li>
              </Fragment>
            );
          })
        )}
      </ul>
    );

    return (
      <div className="flex w-full flex-col gap-1">
        {label && inputId && (
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700"
          >
            <span>{label}</span>
            {labelRequired ? (
              <span className="text-red-600" aria-hidden>
                *
              </span>
            ) : null}
            {labelHint ? <span className="inline-flex">{labelHint}</span> : null}
          </label>
        )}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <input
              ref={setInputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-label={label ? undefined : ariaLabel}
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && filtered[highlighted]
                  ? `${listboxId}-opt-${highlighted}`
                  : undefined
              }
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              value={displayValue}
              placeholder={
                open && query === "" && selectedLabel
                  ? selectedLabel
                  : undefined
              }
              onChange={(e) => onInputChange(e.target.value)}
              onClick={() => {
                if (!disabled && !open) openList();
              }}
              onFocus={() => {
                if (!disabled && !open) openList();
              }}
              onBlur={(e) => {
                onBlur(e);
                window.setTimeout(() => {
                  if (!containerRef.current?.contains(document.activeElement)) {
                    if (!listboxRef.current?.contains(document.activeElement)) {
                      setOpen(false);
                      setQuery("");
                    }
                  }
                }, 0);
              }}
              onKeyDown={onKeyDown}
              className={cn(
                "h-10 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 sm:h-11 sm:text-base md:h-12",
                !open && "cursor-pointer",
                hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
                disabled && "cursor-not-allowed bg-zinc-50 opacity-70",
                className
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
        </div>
        {listbox ? createPortal(listbox, document.body) : null}
        {errorText ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }
);

Select.displayName = "Select";
