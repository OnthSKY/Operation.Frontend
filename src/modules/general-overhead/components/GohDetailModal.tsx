"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Tooltip } from "@/shared/ui/Tooltip";
import { detailOpenIconButtonClass, UndoIcon } from "@/shared/ui/EyeIcon";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { financialBreakdownMainLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import type { GeneralOverheadPoolDetail } from "@/modules/general-overhead/api/general-overhead-api";
import type { ReactNode } from "react";

/**
 * Genel gider havuzu detay modal'ı: özet kart + dağıtım tablosu + audit.
 *
 * Audit ve dağıtım bölümleri orchestrator'da tanımlı alt-componentler olarak gelir.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  poolId: number | null;
  detail: {
    isPending: boolean;
    isError: boolean;
    error?: unknown;
    data?: GeneralOverheadPoolDetail;
  };
  loc: "tr" | "en";
  locale: "tr" | "en";
  statusLabel: (s: string) => string;
  apiErrMsg: (e: unknown) => string;
  poolAmountsList: (p: GeneralOverheadPoolDetail) => { currencyCode: string; amount: number }[];

  /** Detay ekranında "şube payları" listesini render eden alt component. */
  AllocationSection: React.ComponentType<{
    data: GeneralOverheadPoolDetail;
    t: (k: string) => string;
    locale: "tr" | "en";
  }>;
  /** Audit log listesini render eden alt component. */
  AuditSection: React.ComponentType<{
    poolId: number;
    locale: "tr" | "en";
    t: (k: string) => string;
    apiErrMsg: (e: unknown) => string;
  }>;

  /** ALLOCATED durumdaysa reverse akışını açar. */
  onReverseAllocation: (poolId: number) => void;
  reverseBusyForPool: (poolId: number) => boolean;
};

export function GohDetailModal(p: Props): ReactNode {
  const { t } = useI18n();
  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      titleId="goh-detail"
      title={t("generalOverhead.modalDetailTitle")}
      narrow
      closeButtonLabel={t("common.close")}
      className="!max-w-[min(100vw-0.5rem,40rem)] sm:!max-w-xl md:!max-w-2xl"
    >
      {p.poolId != null ? (
        <div className="flex min-h-0 flex-col gap-5 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-1 sm:gap-6 sm:px-6 sm:pb-6 sm:pt-0">
          {p.detail.isPending ? (
            <div className="space-y-4 px-0 pb-2 sm:px-0" aria-busy="true" aria-label={t("common.loading")}>
              <div className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
              <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            </div>
          ) : p.detail.isError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{p.apiErrMsg(p.detail.error)}</p>
          ) : p.detail.data ? (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 via-white to-violet-50/30 p-4 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
                          p.detail.data.status.trim().toUpperCase() === "OPEN"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-zinc-200/90 text-zinc-800"
                        )}
                      >
                        {p.statusLabel(p.detail.data.status)}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {t("generalOverhead.colDate")}
                      </span>
                      <span className="text-xs font-semibold text-zinc-700">
                        {formatLocaleDate(p.detail.data.expenseDate, p.loc)}
                      </span>
                    </div>
                    <h3 className="text-balance text-lg font-semibold leading-snug tracking-tight text-zinc-900 sm:text-xl">
                      {p.detail.data.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-600">
                      {financialBreakdownMainLabel(p.detail.data.mainCategory, t)}
                      <span className="text-zinc-300"> / </span>
                      {txCategoryLine(p.detail.data.mainCategory, p.detail.data.category, t) || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-zinc-200/60 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur-sm sm:min-w-[9.5rem]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      {t("generalOverhead.colAmount")}
                    </p>
                    <div className="mt-1 flex flex-col items-end gap-0.5 tabular-nums text-lg font-semibold text-zinc-900 sm:text-xl">
                      {p.poolAmountsList(p.detail.data).map((a) => (
                        <span key={a.currencyCode}>
                          {formatLocaleAmount(a.amount, p.locale, a.currencyCode)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {p.detail.data.allocatedAt ? (
                  <p className="mt-3 border-t border-zinc-200/60 pt-3 text-xs text-zinc-500">
                    {t("generalOverhead.detailAllocatedAtLabel")}{" "}
                    <span className="font-medium text-zinc-700">
                      {formatLocaleDateTime(p.detail.data.allocatedAt, p.loc)}
                    </span>
                  </p>
                ) : null}
                {p.detail.data.notes != null && String(p.detail.data.notes).trim() !== "" ? (
                  <p className="mt-3 rounded-xl border border-zinc-100 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-zinc-700">
                    {String(p.detail.data.notes).trim()}
                  </p>
                ) : null}
              </div>
              <section className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-900 sm:text-base">
                    {t("generalOverhead.detailAllocationsTitle")}
                  </h4>
                  <p className="text-xs text-zinc-500 sm:hidden">
                    {t("generalOverhead.detailAllocationsHint")}
                  </p>
                </div>
                <p.AllocationSection data={p.detail.data} t={t} locale={p.loc} />
              </section>
              {String(p.detail.data.status ?? "").trim().toUpperCase() === "ALLOCATED" ? (
                <div className="flex justify-end pt-1">
                  <Tooltip content={t("generalOverhead.reverseAllocation")} delayMs={200}>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(detailOpenIconButtonClass, "text-xs sm:text-sm")}
                      disabled={p.reverseBusyForPool(p.detail.data.id)}
                      aria-label={t("generalOverhead.reverseAllocation")}
                      title={t("generalOverhead.reverseAllocation")}
                      onClick={() => {
                        p.onReverseAllocation(p.detail.data!.id);
                      }}
                    >
                      <UndoIcon />
                    </Button>
                  </Tooltip>
                </div>
              ) : null}
              <section className="border-t border-zinc-100 pt-4">
                <p.AuditSection
                  poolId={p.detail.data.id}
                  locale={p.loc}
                  t={t}
                  apiErrMsg={p.apiErrMsg}
                />
              </section>
            </>
          ) : (
            <p className="text-sm text-zinc-500">{t("common.retry")}</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
