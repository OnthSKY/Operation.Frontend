"use client";

import { useI18n } from "@/i18n/context";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { useEffect, useState } from "react";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { BranchDetailTabId } from "@/modules/branch/lib/branch-detail-tab";
import { BackdropCloseConfirm } from "@/shared/overlays/BackdropCloseConfirm";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { BranchDetailTabs } from "./BranchDetailTabs";

const TITLE_ID = "branch-detail-dialog-title";

type Props = {
  open: boolean;
  branch: Branch;
  staff: Personnel[];
  /** Şube personeli (PERSONNEL rolü): turizm/personel sekmeleri ve yönetici avansları gizlenir. */
  employeeSelfService?: boolean;
  canEditBranch?: boolean;
  onEditBranch?: () => void;
  onClose: () => void;
  initialTab?: BranchDetailTabId | null;
};

function BranchEditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function BranchDetailSheet({
  open,
  branch,
  staff,
  employeeSelfService = false,
  canEditBranch = false,
  onEditBranch,
  onClose,
  initialTab = null,
}: Props) {
  const { t } = useI18n();
  const [backdropConfirmOpen, setBackdropConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setBackdropConfirmOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (backdropConfirmOpen) {
        setBackdropConfirmOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, backdropConfirmOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const requestBackdropClose = () => setBackdropConfirmOpen(true);

  return (
    <div
      className={`fixed inset-0 ${OVERLAY_Z_TW.branchDetailSheet} flex flex-col justify-end bg-zinc-950/50 sm:items-center sm:justify-center sm:p-4`}
      role="presentation"
      onClick={requestBackdropClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="flex h-[min(100dvh,100svh)] max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl sm:h-[min(92dvh,56rem)] sm:max-h-[min(92dvh,56rem)] sm:min-h-[min(92dvh,56rem)] sm:max-w-6xl sm:rounded-2xl sm:pb-0 lg:h-[min(93dvh,62rem)] lg:max-h-[min(93dvh,62rem)] lg:min-h-[min(93dvh,62rem)] lg:max-w-7xl xl:h-[min(94dvh,70rem)] xl:max-h-[min(94dvh,70rem)] xl:min-h-[min(94dvh,70rem)] xl:max-w-[min(90rem,95vw)] 2xl:h-[min(94dvh,88rem)] 2xl:max-h-[min(94dvh,88rem)] 2xl:min-h-[min(94dvh,88rem)] 2xl:max-w-[min(120rem,96vw)]"
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
            {branch.address ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{branch.address}</p>
            ) : null}
            {branch.responsibles.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                {t("branch.detailResponsibles")}:{" "}
                {branch.responsibles.map((r) => r.fullName).join(", ")}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-0.5">
            {canEditBranch && onEditBranch ? (
              <Tooltip content={t("branch.edit")} delayMs={200}>
                <button
                  type="button"
                  className="flex h-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200"
                  onClick={onEditBranch}
                  aria-label={t("branch.edit")}
                >
                  <BranchEditIcon />
                </button>
              </Tooltip>
            ) : null}
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
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BranchDetailTabs
            branch={branch}
            staff={staff}
            employeeSelfService={employeeSelfService}
            initialTab={initialTab}
          />
        </div>
      </div>
      <BackdropCloseConfirm
        open={backdropConfirmOpen}
        onCancel={() => setBackdropConfirmOpen(false)}
        onConfirm={() => {
          setBackdropConfirmOpen(false);
          onClose();
        }}
      />
    </div>
  );
}
