"use client";

import { useI18n } from "@/i18n/context";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useId, useMemo, useState } from "react";

export type PickerOption = { id: number; label: string; sub?: string };

export function QuickPickerModal({
  open,
  onClose,
  title,
  options,
  loading,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  loading: boolean;
  onPick: (id: number) => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const searchId = useId();
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) setQ("");
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
      narrow
      sheetMobile
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={searchId} className="sr-only">
          {t("common.search")}
        </label>
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search")}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
        />
        <div
          aria-busy={loading}
          aria-live="polite"
          className="max-h-[60vh] min-h-0 overflow-y-auto rounded-md border border-zinc-100"
        >
          {loading ? (
            <p className="p-3 text-xs text-zinc-500">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">
              {q ? t("common.noResults") : t("common.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100" role="listbox">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => onPick(o.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 focus-visible:bg-blue-50 focus-visible:outline-none"
                  >
                    <span className="truncate">{o.label}</span>
                    {o.sub ? (
                      <span className="shrink-0 text-xs text-zinc-500">
                        {o.sub}
                      </span>
                    ) : null}
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
