"use client";

import { type ReactNode } from "react";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import { vehiclePhotoUrl } from "@/modules/vehicles/api/vehicles-api";
import { badgeClasses } from "@/modules/vehicles/lib/vehicle-formatters";
import {
  vehicleHeaderStatusTone,
  vehicleStatusLabel,
} from "@/modules/vehicles/lib/vehicle-status-display";
import type {
  VehicleDetail,
  VehicleInsuranceBadge,
} from "@/types/vehicle";

/** Tek satır overview: ikon + label + sağa yaslı value. */
function VehicleOverviewRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100/90 py-2.5 last:border-b-0 sm:py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span
            className="mt-0.5 shrink-0 text-zinc-400 [&_svg]:h-4 [&_svg]:w-4"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <div className="max-w-[min(100%,18rem)] text-right text-sm font-semibold leading-snug text-zinc-900 sm:max-w-[60%]">
        {value}
      </div>
    </div>
  );
}

/** Mutation interface'i için minimal contract. */
type PhotoMutation = {
  isPending: boolean;
  mutateAsync: (input: { vehicleId: number; file: File }) => Promise<unknown>;
};

type DeletePhotoMutation = {
  isPending: boolean;
  mutateAsync: (vehicleId: number) => Promise<unknown>;
};

/**
 * Detay overlay → Overview tab.
 *  - Üstte plaka hero card (siyah arka plan)
 *  - Sol: foto upload/sil
 *  - Sağ: kapasiteli overview satır listesi
 */
export function VehicleDetailOverviewTab({
  detail,
  canEdit,
  locale,
  photoCacheBust,
  setPhotoCacheBust,
  uploadPhotoMut,
  deletePhotoMut,
  onChangeAssignment,
  insuranceBadgeLabel,
  t,
}: {
  detail: VehicleDetail;
  canEdit: boolean;
  locale: Locale;
  photoCacheBust: number;
  setPhotoCacheBust: (v: number) => void;
  uploadPhotoMut: PhotoMutation;
  deletePhotoMut: DeletePhotoMutation;
  onChangeAssignment: () => void;
  insuranceBadgeLabel: (b: VehicleInsuranceBadge) => string;
  t: (k: string) => string;
}) {
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const numberFmt = new Intl.NumberFormat(dateLocale);
  const fileInputId = `vehicle-detail-photo-${detail.id}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-100/80">
        <div className="border-b border-zinc-800/20 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
                {t("vehicles.plate")}
              </p>
              <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.08em] text-white sm:text-[1.65rem]">
                {detail.plateNumber}
              </p>
              <p className="mt-1.5 text-sm text-zinc-300">
                {detail.brand} {detail.model}
                {detail.year != null ? ` · ${detail.year}` : ""}
              </p>
            </div>
            <StatusBadge
              surface="dark"
              tone={vehicleHeaderStatusTone(detail.status)}
              size="md"
              className="w-fit font-bold"
            >
              {vehicleStatusLabel(t, detail.status)}
            </StatusBadge>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-6">
          <section
            className="flex min-h-0 flex-col rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/60 p-3 ring-1 ring-zinc-100/60 sm:p-4"
            aria-label={t("vehicles.vehiclePhoto")}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                {t("vehicles.vehiclePhoto")}
              </h3>
            </div>
            <div className="mt-3 flex min-h-[10rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-zinc-200/80 bg-white shadow-inner">
              {detail.hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vehiclePhotoUrl(detail.id, photoCacheBust)}
                  alt=""
                  className="max-h-52 w-full object-contain"
                />
              ) : (
                <p className="px-3 text-center text-sm text-zinc-500">
                  {t("vehicles.noPhoto")}
                </p>
              )}
            </div>
            {canEdit ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                  className="sr-only"
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const f = input.files?.[0];
                    if (!f) return;
                    void (async () => {
                      try {
                        await uploadPhotoMut.mutateAsync({
                          vehicleId: detail.id,
                          file: f,
                        });
                        setPhotoCacheBust(Date.now());
                        notify.success(t("common.saved"));
                      } catch (err) {
                        notify.error(toErrorMessage(err));
                      } finally {
                        input.value = "";
                      }
                    })();
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full !min-h-11 touch-manipulation shadow-sm sm:w-auto sm:!min-h-10"
                  disabled={uploadPhotoMut.isPending}
                  onClick={() =>
                    document.getElementById(fileInputId)?.click()
                  }
                >
                  {t("vehicles.uploadPhoto")}
                </Button>
                {detail.hasPhoto ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full !min-h-11 touch-manipulation shadow-sm sm:w-auto sm:!min-h-10"
                    disabled={deletePhotoMut.isPending}
                    onClick={() =>
                      void notifyConfirmToast({
                        toastId: `vehicle-photo-delete-${detail.id}`,
                        message: t("vehicles.confirmDeletePhoto"),
                        confirmLabel: t("vehicles.deletePhoto"),
                        cancelLabel: t("common.cancel"),
                        onConfirm: async () => {
                          try {
                            await deletePhotoMut.mutateAsync(detail.id);
                            setPhotoCacheBust(Date.now());
                            notify.success(t("common.saved"));
                          } catch (err) {
                            notify.error(toErrorMessage(err));
                          }
                        },
                      })
                    }
                  >
                    {t("vehicles.deletePhoto")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="min-w-0 space-y-4">
            <section
              className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4"
              aria-labelledby="vehicle-overview-lines-heading"
            >
              <div
                id="vehicle-overview-lines-heading"
                className="mb-1 flex items-center gap-2 border-b border-zinc-100 pb-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {t("vehicles.tabOverview")}
                </h3>
              </div>
              <div className="px-0.5">
                <VehicleOverviewRow
                  label={`${t("vehicles.brand")} / ${t("vehicles.model")}`}
                  value={`${detail.brand} ${detail.model}`.trim() || "—"}
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.3-1.5-2.1c-.2-.8-.7-1.4-1.5-1.4H8.5c-.8 0-1.3.6-1.5 1.4C6.8 8.7 5.5 10 5.5 10 3.3 10 2 11.7 2 14v3c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  }
                />
                <VehicleOverviewRow
                  label={t("vehicles.year")}
                  value={detail.year ?? "—"}
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 2v4M16 2v4" />
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                  }
                />
                <VehicleOverviewRow
                  label={t("vehicles.odometerKm")}
                  value={
                    detail.odometerKm != null
                      ? numberFmt.format(detail.odometerKm)
                      : "—"
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  }
                />
                <VehicleOverviewRow
                  label={t("vehicles.inspectionValidUntil")}
                  value={
                    detail.inspectionValidUntil
                      ? new Date(
                          `${detail.inspectionValidUntil}T12:00:00`,
                        ).toLocaleDateString(dateLocale)
                      : "—"
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 2v4M16 2v4" />
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                  }
                />
                {detail.assignedPersonnelId ? (
                  <>
                    <VehicleOverviewRow
                      label={t("vehicles.driverSrcValidUntil")}
                      value={
                        detail.driverSrcValidUntil
                          ? new Date(
                              `${detail.driverSrcValidUntil}T12:00:00`,
                            ).toLocaleDateString(dateLocale)
                          : "—"
                      }
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 2v4M16 2v4" />
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                      }
                    />
                    <VehicleOverviewRow
                      label={t("vehicles.driverPsychotechnicalValidUntil")}
                      value={
                        detail.driverPsychotechnicalValidUntil
                          ? new Date(
                              `${detail.driverPsychotechnicalValidUntil}T12:00:00`,
                            ).toLocaleDateString(dateLocale)
                          : "—"
                      }
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 2v4M16 2v4" />
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                      }
                    />
                  </>
                ) : null}
                <VehicleOverviewRow
                  label={t("vehicles.assignment")}
                  value={
                    <span className="inline-flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="break-words font-semibold text-zinc-900">
                        {detail.assignedPersonnelName ??
                          detail.assignedBranchName ??
                          t("vehicles.idle")}
                      </span>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!min-h-10 w-full shrink-0 touch-manipulation shadow-sm sm:w-auto"
                          onClick={onChangeAssignment}
                        >
                          {t("vehicles.changeAssignment")}
                        </Button>
                      ) : null}
                    </span>
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
                <VehicleOverviewRow
                  label={t("vehicles.notes")}
                  value={
                    <span className="whitespace-pre-wrap font-normal text-zinc-800">
                      {detail.notes?.trim() ? detail.notes : "—"}
                    </span>
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                  }
                />
                <VehicleOverviewRow
                  label={t("vehicles.insuranceBadge")}
                  value={
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase ring-1",
                        badgeClasses(detail.insuranceBadge),
                      )}
                    >
                      {insuranceBadgeLabel(detail.insuranceBadge)}
                    </span>
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
