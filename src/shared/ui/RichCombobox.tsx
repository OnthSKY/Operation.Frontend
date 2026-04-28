"use client";

import { cn } from "@/lib/cn";
import { useEffect, useMemo, useRef, useState } from "react";

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
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onReachEnd?: () => void;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
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
  hasMore = false,
  isLoadingMore = false,
  onReachEnd,
  loadingText,
  disabled,
  className,
}: RichComboboxProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedQuery = query ?? internalQuery;
  const setResolvedQuery = (value: string) => {
    if (onQueryChange) {
      onQueryChange(value);
      return;
    }
    setInternalQuery(value);
  };
  const filtered = useMemo(() => {
    const q = resolvedQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return options;
    return options.filter((opt) =>
      `${opt.title} ${opt.description ?? ""} ${opt.detail ?? ""}`.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [options, resolvedQuery]);
  const selected = useMemo(() => options.find((x) => x.value === value) ?? null, [options, value]);
  const closeAndReset = () => {
    setOpen(false);
    setResolvedQuery("");
  };

  useEffect(() => {
    if (!open) return;
    setResolvedQuery("");
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => {
          if (disabled || open) return;
          const printable = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
          if (!printable) return;
          e.preventDefault();
          setOpen(true);
          setResolvedQuery(e.key);
        }}
        disabled={disabled}
        className={cn(
          "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-left transition",
          "hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        )}
      >
        <p className="text-xs font-semibold text-zinc-900">
          {selected?.title || placeholder}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-600">
          {selected?.description || selected?.detail || searchPlaceholder}
        </p>
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 p-2">
            <input
              ref={searchInputRef}
              value={resolvedQuery}
              onChange={(e) => setResolvedQuery(e.target.value)}
              placeholder={searchPlaceholder}
              disabled={disabled}
              className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-400"
            />
          </div>
          <div
            className="max-h-[min(48vh,18rem)] overflow-y-auto"
            onScroll={(e) => {
              if (!onReachEnd || !hasMore || isLoadingMore) return;
              const target = e.currentTarget;
              const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
              if (remaining <= 24) onReachEnd();
            }}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">{emptyText}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
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
                          "w-full px-3 py-2 text-left transition",
                          isSelected ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"
                        )}
                      >
                        <p className={cn("text-xs font-semibold", isSelected ? "text-white" : "text-zinc-900")}>
                          {opt.title || placeholder}
                        </p>
                        {opt.description ? (
                          <p className={cn("mt-0.5 text-[11px]", isSelected ? "text-zinc-200" : "text-zinc-600")}>
                            {opt.description}
                          </p>
                        ) : null}
                        {opt.detail ? (
                          <p className={cn("mt-0.5 text-[11px]", isSelected ? "text-zinc-300" : "text-zinc-500")}>
                            {opt.detail}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {isLoadingMore ? (
              <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                {loadingText ?? "Loading..."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {open ? (
        <button
          type="button"
          aria-label="Close options"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={closeAndReset}
        />
      ) : null}
    </div>
  );
}
