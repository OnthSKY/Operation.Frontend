"use client";

import { useI18n } from "@/i18n/context";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PickerOption = { id: number; label: string; sub?: string };

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toLocaleUpperCase()).join("") || "?";
}

export function QuickPickerModal({
  open,
  onClose,
  title,
  description,
  options,
  loading,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: PickerOption[];
  loading: boolean;
  onPick: (id: number) => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const searchId = useId();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const isCoarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    if (isCoarse) return;
    const id = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      60
    );
    return () => window.clearTimeout(id);
  }, [open]);
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase(locale);
    if (!s) return options;
    return options.filter(
      (o) =>
        o.label.toLocaleLowerCase(locale).includes(s) ||
        (o.sub ?? "").toLocaleLowerCase(locale).includes(s)
    );
  }, [options, q, locale]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      description={description}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="flex flex-col gap-4">
        <label htmlFor={searchId} className="sr-only">
          {t("common.search")}
        </label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            id={searchId}
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 py-2.5 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label={t("common.clear") ?? "Clear"}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
        <div
          aria-busy={loading}
          aria-live="polite"
          className="min-h-0 max-h-[min(55vh,22rem)] overflow-y-auto overscroll-contain pr-1 -mr-1"
        >
          {loading ? (
            <ul className="flex flex-col gap-2" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5"
                >
                  <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-100" />
                  <span className="flex flex-1 flex-col gap-1.5">
                    <span className="h-3 w-2/5 animate-pulse rounded bg-zinc-100" />
                    <span className="h-2.5 w-1/3 animate-pulse rounded bg-zinc-50" />
                  </span>
                </li>
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-10 text-center">
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <p className="text-sm text-zinc-500">
                {q ? t("common.noResults") : t("common.empty")}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5" role="listbox">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => onPick(o.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm focus-visible:border-blue-300 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 group-hover:from-blue-100 group-hover:to-blue-200"
                    >
                      {initials(o.label)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-zinc-900">
                        {o.label}
                      </span>
                      {o.sub ? (
                        <span className="truncate text-xs text-zinc-500">
                          {o.sub}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
