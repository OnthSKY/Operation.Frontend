"use client";

import { useI18n } from "@/i18n/context";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { useEffect } from "react";
import { Tooltip } from "@/shared/ui/Tooltip";
import { BranchDetailTabs } from "./BranchDetailTabs";

const TITLE_ID = "branch-detail-dialog-title";

type Props = {
  open: boolean;
  branch: Branch;
  staff: Personnel[];
  /** Şube personeli (PERSONNEL rolü): turizm/personel sekmeleri ve yönetici avansları gizlenir. */
  employeeSelfService?: boolean;
  onClose: () => void;
};

export function BranchDetailSheet({
  open,
  branch,
  staff,
  employeeSelfService = false,
  onClose,
}: Props) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end bg-zinc-950/50 sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="flex h-[min(100dvh,100%)] max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:h-[min(92vh,52rem)] sm:max-h-[min(92vh,52rem)] sm:min-h-[min(92vh,52rem)] sm:max-w-5xl sm:rounded-2xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[min(96rem,92vw)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 sm:hidden">
              {t("branch.title")}
            </p>
            <h2
              id={TITLE_ID}
              className="truncate text-lg font-semibold leading-tight text-zinc-900 sm:text-xl"
            >
              {branch.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{t("branch.detailDesc")}</p>
          </div>
          <Tooltip content={t("branch.closeDetail")} delayMs={200}>
            <button
              type="button"
              className="flex h-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200"
              onClick={onClose}
              aria-label={t("branch.closeDetail")}
            >
              <span aria-hidden>×</span>
            </button>
          </Tooltip>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BranchDetailTabs
            branch={branch}
            staff={staff}
            employeeSelfService={employeeSelfService}
          />
        </div>
      </div>
    </div>
  );
}
