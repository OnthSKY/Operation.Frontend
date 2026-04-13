"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import {
  fetchOperationalReminders,
  markZReportAccountingSent,
  type OperationalRemindersPayload,
} from "@/modules/reminders/api/reminders-api";
import { remindersKeys } from "@/modules/reminders/reminders-keys";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function formatDay(iso: string, locale: string) {
  const p = iso.split("-").map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return iso;
  const [y, m, d] = p;
  return new Date(y, m - 1, d).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number, locale: string) {
  return new Date(year, month - 1, 1).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatIsoDateShort(iso: string | null | undefined, loc: string) {
  if (!iso || iso.length < 10) return null;
  const p = iso.slice(0, 10).split("-").map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = p;
  return new Date(y, m - 1, d).toLocaleDateString(loc === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function countReminders(d: OperationalRemindersPayload | undefined) {
  if (!d) return 0;
  return (
    d.missingDayClose.length +
    d.zReportNotSentToAccounting.length +
    (d.vehiclesWithoutValidInsurance?.length ?? 0) +
    (d.vehiclesInsuranceExpiringWithin30Days?.length ?? 0) +
    (d.vehiclesMaintenanceDueSoon?.length ?? 0)
  );
}

export function OperationalRemindersBell() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = localIsoDate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const personnelPortal = isPersonnelPortalRole(user?.role);

  const { data, isPending, isError } = useQuery({
    queryKey: remindersKeys.today(today),
    queryFn: () => fetchOperationalReminders(today),
    staleTime: 60_000,
  });

  const markM = useMutation({
    mutationFn: markZReportAccountingSent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      notify.success(t("toast.remindersZReportMarked"));
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const total = countReminders(data);
  const showBadge = total > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const loc = locale === "tr" ? "tr-TR" : "en-US";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <Tooltip content={t("reminders.bellAria")} delayMs={200}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-600 outline-none transition-colors",
            "hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400",
            open && "bg-zinc-100 text-zinc-900"
          )}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={t("reminders.bellAria")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {showBadge ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[0.6rem] font-bold text-white">
              {total > 9 ? "9+" : total}
            </span>
          ) : null}
        </button>
      </Tooltip>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[85] bg-zinc-900/40 md:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/5",
              "max-md:fixed max-md:z-[90] max-md:left-[max(0.75rem,env(safe-area-inset-left,0px))] max-md:right-[max(0.75rem,env(safe-area-inset-right,0px))] max-md:top-[calc(0.5rem+3.5rem+env(safe-area-inset-top,0px))] max-md:max-h-[min(85dvh,calc(100dvh-4.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] max-md:w-auto",
              "md:absolute md:right-0 md:top-full md:z-50 md:mt-1 md:max-h-[min(70dvh,20rem)] md:w-[min(100vw-1.5rem,22rem)]"
            )}
            role="dialog"
            aria-label={t("reminders.bellAria")}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 md:hidden">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{t("reminders.bellAria")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={t("common.close")}
              >
                <span className="sr-only">{t("common.close")}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 md:py-2 md:pb-1">
            {isPending ? (
              <p className="px-1 py-3 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : isError ? (
              <p className="px-1 py-3 text-sm text-rose-600">{t("toast.loadFailed")}</p>
            ) : !data || total === 0 ? (
              <p className="px-1 py-3 text-sm text-zinc-500">{t("reminders.empty")}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {data.missingDayClose.length > 0 ? (
                  <section>
                    <h3 className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                      {t("reminders.sectionDayClose")}
                    </h3>
                    <p className="mt-1 px-1 text-xs text-zinc-500">{t("reminders.dayCloseHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {data.missingDayClose.map((r) => (
                        <li
                          key={`dc-${r.branchId}-${r.date}`}
                          className="rounded-lg bg-amber-50/90 px-2.5 py-2 text-sm text-amber-950 ring-1 ring-amber-200/80"
                        >
                          <span className="break-words font-semibold">{r.branchName}</span>
                          <span className="mt-0.5 block text-xs text-amber-900/80">
                            {formatDay(r.date, loc)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {data.zReportNotSentToAccounting.length > 0 ? (
                  <section>
                    <h3 className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                      {t("reminders.sectionZReport")}
                    </h3>
                    <p className="mt-1 px-1 text-xs text-zinc-500">{t("reminders.zReportHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {data.zReportNotSentToAccounting.map((r) => (
                        <li
                          key={`zr-${r.branchId}-${r.year}-${r.month}`}
                          className="flex flex-col gap-2 rounded-lg bg-violet-50/90 px-2.5 py-2 text-sm text-violet-950 ring-1 ring-violet-200/80"
                        >
                          <div className="min-w-0">
                            <span className="break-words font-semibold">{r.branchName}</span>
                            <span className="mt-0.5 block text-xs text-violet-900/80">
                              {monthLabel(r.year, r.month, loc)}
                            </span>
                            {r.tourismSeasonOpenedOn ? (
                              <span className="mt-0.5 block text-[11px] text-violet-800/75">
                                {t("reminders.zReportActiveSeason")}:{" "}
                                {formatIsoDateShort(r.tourismSeasonOpenedOn, loc) ?? "—"}
                                {r.tourismSeasonClosedOn
                                  ? ` → ${formatIsoDateShort(r.tourismSeasonClosedOn, loc) ?? "—"}`
                                  : ` · ${t("reminders.zReportSeasonStillOpen")}`}
                              </span>
                            ) : null}
                          </div>
                          {!personnelPortal ? (
                            <MarkZButton
                              busy={
                                markM.isPending &&
                                markM.variables?.branchId === r.branchId &&
                                markM.variables?.year === r.year &&
                                markM.variables?.month === r.month
                              }
                              onClick={() => markM.mutate({ branchId: r.branchId, year: r.year, month: r.month })}
                              t={t}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {(data.vehiclesWithoutValidInsurance?.length ?? 0) > 0 ? (
                  <section>
                    <h3 className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                      {t("reminders.sectionVehicleNoInsurance")}
                    </h3>
                    <p className="mt-1 px-1 text-xs text-zinc-500">{t("reminders.vehicleNoInsuranceHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {(data.vehiclesWithoutValidInsurance ?? []).map((r) => (
                        <li
                          key={`vni-${r.vehicleId}`}
                          className="rounded-lg bg-rose-50/90 px-2.5 py-2 text-sm text-rose-950 ring-1 ring-rose-200/80"
                        >
                          <Link
                            href={`/vehicles?openVehicle=${r.vehicleId}`}
                            className="break-words font-semibold text-rose-950 underline decoration-rose-300 underline-offset-2 hover:decoration-rose-500"
                          >
                            {r.plateNumber}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {(data.vehiclesInsuranceExpiringWithin30Days?.length ?? 0) > 0 ? (
                  <section>
                    <h3 className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                      {t("reminders.sectionVehicleInsuranceSoon")}
                    </h3>
                    <p className="mt-1 px-1 text-xs text-zinc-500">{t("reminders.vehicleInsuranceSoonHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {(data.vehiclesInsuranceExpiringWithin30Days ?? []).map((r) => (
                        <li
                          key={`vis-${r.vehicleId}-${r.insuranceEndDate}`}
                          className="rounded-lg bg-amber-50/90 px-2.5 py-2 text-sm text-amber-950 ring-1 ring-amber-200/80"
                        >
                          <Link
                            href={`/vehicles?openVehicle=${r.vehicleId}`}
                            className="break-words font-semibold text-amber-950 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-600"
                          >
                            {r.plateNumber}
                          </Link>
                          <span className="mt-0.5 block text-xs text-amber-900/80">
                            {formatIsoDateShort(r.insuranceEndDate, loc) ?? r.insuranceEndDate}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {(data.vehiclesMaintenanceDueSoon?.length ?? 0) > 0 ? (
                  <section>
                    <h3 className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                      {t("reminders.sectionVehicleMaintenance")}
                    </h3>
                    <p className="mt-1 px-1 text-xs text-zinc-500">{t("reminders.vehicleMaintenanceHint")}</p>
                    <ul className="mt-2 space-y-2">
                      {(data.vehiclesMaintenanceDueSoon ?? []).map((r) => (
                        <li
                          key={`vm-${r.vehicleId}-${r.nextDueDate}`}
                          className="rounded-lg bg-sky-50/90 px-2.5 py-2 text-sm text-sky-950 ring-1 ring-sky-200/80"
                        >
                          <Link
                            href={`/vehicles?openVehicle=${r.vehicleId}`}
                            className="break-words font-semibold text-sky-950 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-600"
                          >
                            {r.plateNumber}
                          </Link>
                          <span className="mt-0.5 block text-xs text-sky-900/80">
                            {formatIsoDateShort(r.nextDueDate, loc) ?? r.nextDueDate}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MarkZButton({
  busy,
  onClick,
  t,
}: {
  busy: boolean;
  onClick: () => void;
  t: (k: string) => string;
}) {
  return (
    <Button type="button" variant="secondary" className="h-8 w-full text-xs" disabled={busy} onClick={onClick}>
      {busy ? t("reminders.marking") : t("reminders.markSent")}
    </Button>
  );
}
