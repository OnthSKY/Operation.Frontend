"use client";

import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { IcCheck, IcLoader, IcX } from "@/modules/order-account-statement/components/oas-icons";
import { useI18n } from "@/i18n/context";
import { useMemo } from "react";

/**
 * Multi-step (download/invoice/system) eylemi sırasında progress + hata gösterimi.
 * Sadece sunum + progress yüzdesi hesaplaması yapar. State + run logic dış hook'tan gelir.
 *
 * SRP: Modal'ın tek sorumluluğu adımları ve hatayı göstermek; akış yönetimi orchestrator'da.
 */
export type MultiActionStepId = "download" | "invoice" | "system";
export type MultiActionStepState = "pending" | "running" | "done" | "skipped";
export type MultiActionStep = {
  id: MultiActionStepId;
  label: string;
  state: MultiActionStepState;
};

type Props = {
  open: boolean;
  /** true ise modal kapatma istekleri (X / outside click / kapat butonu) yok sayılır. */
  running: boolean;
  steps: readonly MultiActionStep[];
  error: string;
  /** >0 ise akış tamamlandı; geri sayım sonunda Cari Hesaplar'a yönlendirilecek. */
  redirectInSec?: number;
  onClose: () => void;
  /** "Şimdi git" → countdown'ı atlayıp hemen yönlendir. */
  onRedirectNow?: () => void;
};

export function OasMultiActionProgressModal({
  open,
  running,
  steps,
  error,
  redirectInSec = 0,
  onClose,
  onRedirectNow,
}: Props) {
  const { t } = useI18n();

  const progressPercent = useMemo(() => {
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.state === "done" || s.state === "skipped").length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  const showRedirect = !running && !error && redirectInSec > 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (running) return;
        onClose();
      }}
      titleId="order-account-multi-action-confirm-title"
      title={t("reports.orderAccountStatementMultiActionConfirmTitle")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-md"
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">
          {t("reports.orderAccountStatementMultiActionConfirmBody")}
        </p>
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          {steps.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm text-zinc-800">
              {item.state === "running" ? (
                <IcLoader className="h-4 w-4 animate-spin text-violet-700" />
              ) : item.state === "done" ? (
                <IcCheck className="h-4 w-4 text-emerald-700" />
              ) : item.state === "skipped" ? (
                <IcX className="h-4 w-4 text-zinc-400" />
              ) : (
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
              )}
              <span className={item.state === "skipped" ? "text-zinc-400 line-through" : ""}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        {showRedirect ? (
          <div
            role="status"
            className="flex flex-col items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-center"
          >
            <p className="text-sm font-semibold text-emerald-900">
              ✓ {t("reports.orderAccountStatementProgressDoneTitle")}
            </p>
            <p className="text-xs text-emerald-800">
              {t("reports.orderAccountStatementProgressRedirectIn").replace(
                "{seconds}",
                String(redirectInSec),
              )}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label={t("reports.orderAccountStatementProgressRunning")}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2">
              {t("reports.orderAccountStatementProgressPercent").replace(
                "{percent}",
                String(progressPercent),
              )}
            </p>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={running}
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {running
              ? t("reports.orderAccountStatementProgressRunning")
              : showRedirect
                ? t("reports.orderAccountStatementProgressStay")
                : t("common.close")}
          </Button>
          {showRedirect && onRedirectNow ? (
            <Button
              type="button"
              onClick={onRedirectNow}
              className="w-full sm:w-auto"
            >
              {t("reports.orderAccountStatementProgressRedirectNow")}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
