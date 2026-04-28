"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  label?: string;
  /** When `label` is omitted, sets `aria-label` on the combobox input for accessibility. */
  ariaLabel?: string;
  labelRequired?: boolean;
  error?: string;
  options: SelectOption[];
  name: string;
  value: string;
  onChange: (event: { target: { value: string; name: string } }) => void;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Varsayılan: 130. Üst katmanda (ör. z-index 200 takvim) açılan listeler için yükseltin. */
  menuZIndex?: number;
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

const LIST_MAX_PX = 208;
const DROPDOWN_Z = 130;

type MenuGeom = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function computeMenuGeom(container: HTMLElement): MenuGeom {
  const r = container.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const preferredTop = r.bottom + gap;
  const spaceBelow = window.innerHeight - preferredTop - margin;
  const spaceAbove = r.top - margin - gap;

  if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
    const maxHeight = Math.min(LIST_MAX_PX, Math.max(96, spaceBelow));
    return { top: preferredTop, left: r.left, width: r.width, maxHeight };
  }

  const maxHeight = Math.min(LIST_MAX_PX, Math.max(96, spaceAbove));
  const top = Math.max(margin, r.top - maxHeight - gap);
  return { top, left: r.left, width: r.width, maxHeight };
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
  function Select(
    {
      className,
      id,
      label,
      ariaLabel,
      labelRequired,
      error,
      options,
      name,
      value,
      onChange,
      onBlur,
      disabled,
      menuZIndex,
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
    const [menuGeom, setMenuGeom] = useState<MenuGeom | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const selectedLabel = useMemo(
      () => options.find((o) => o.value === value)?.label ?? "",
      [options, value]
    );

    const filtered = useMemo(() => {
      const q = norm(query.trim());
      if (!q) return options;
      return options.filter(
        (o) => norm(o.label).includes(q) || o.value === value
      );
    }, [options, query, value]);

    const refreshMenuGeom = useCallback(() => {
      if (!containerRef.current) return;
      setMenuGeom(computeMenuGeom(containerRef.current));
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
      refreshMenuGeom();
      const handler = () => refreshMenuGeom();
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
      };
    }, [open, disabled, refreshMenuGeom]);

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const node = e.target as Node;
        if (containerRef.current?.contains(node)) return;
        if (listboxRef.current?.contains(node)) return;
        setOpen(false);
        setQuery("");
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const commit = useCallback(
      (v: string) => {
        onChange({ target: { value: v, name } });
        setOpen(false);
        setQuery("");
        innerRef.current?.blur();
      },
      [name, onChange]
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
          filtered.map((o, idx) => (
            <li
              key={`${listboxId}-opt-${idx}`}
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
              onClick={() => commit(o.value)}
            >
              {o.label}
            </li>
          ))
        )}
      </ul>
    );

    return (
      <div className="flex w-full flex-col gap-1">
        {label && inputId && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-zinc-700"
          >
            {label}
            {labelRequired ? (
              <span className="ml-0.5 text-red-600" aria-hidden>
                *
              </span>
            ) : null}
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
              value={displayValue}
              placeholder={
                open && query === "" && selectedLabel
                  ? selectedLabel
                  : undefined
              }
              readOnly={!open}
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
                "h-10 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 read-only:cursor-pointer sm:h-11 sm:text-base md:h-12",
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
