"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { CalendarCheckIcon, detailOpenIconButtonClass, PencilIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatOptionalIso } from "@/modules/personnel/lib/personnel-formatters";
import type { Personnel, PersonnelInsurancePeriod } from "@/types/personnel";

/**
 * Sigorta sekmesi: cari durum (4 hücreli özet kart) + dönem listesi tablosu.
 * Düzenleme/silme/aktif dönemi kapama eylemleri callback'lerle dışa verilir.
 */
export function PersonnelDetailInsuranceTab({
  personnel,
  insurancePeriods,
  insurancePeriodsPending,
  onAddPeriod,
  onEditPeriod,
  onDeletePeriod,
  deletePending,
  t,
  locale,
  dash,
}: {
  personnel: Personnel;
  insurancePeriods: PersonnelInsurancePeriod[];
  insurancePeriodsPending: boolean;
  onAddPeriod: () => void;
  onEditPeriod: (row: PersonnelInsurancePeriod) => void;
  onDeletePeriod: (row: PersonnelInsurancePeriod) => void;
  deletePending: boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}) {
  return (
    <div className="space-y-3 pb-2">
      <article
        className={cn(
          "mb-3 shrink-0 overflow-hidden rounded-2xl border shadow-sm",
          personnel.isDeleted
            ? "border-zinc-200/90 bg-zinc-100/50"
            : "border-zinc-200/90 bg-white",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3.5 sm:px-5",
            personnel.isDeleted
              ? "border-zinc-200/80 bg-zinc-100/80"
              : "border-zinc-100 bg-gradient-to-r from-sky-50/50 via-white to-violet-50/40",
          )}
        >
          <h4 className="text-sm font-semibold text-zinc-900">
            {t("personnel.insuranceSectionTitle")}
          </h4>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              personnel.insuranceStarted
                ? "bg-emerald-100 text-emerald-900"
                : "bg-amber-100 text-amber-950",
            )}
          >
            {personnel.insuranceStarted
              ? t("personnel.insuranceStatusStarted")
              : t("personnel.insuranceStatusPending")}
          </span>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:gap-3">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.insuranceCurrentOpenStart")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
              {formatOptionalIso(personnel.insuranceStartDate, dash, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.insuranceCurrentOpenEnd")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
              {!personnel.insuranceStarted
                ? dash
                : personnel.insuranceEndDate == null ||
                    String(personnel.insuranceEndDate).trim() === ""
                  ? t("personnel.insuranceOngoing")
                  : formatOptionalIso(
                      personnel.insuranceEndDate,
                      dash,
                      locale,
                    )}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.insuranceIntakeDetailLabel")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
              {formatOptionalIso(
                personnel.insuranceIntakeStartDate,
                dash,
                locale,
              )}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.insuranceAccountingNotifiedDetailLabel")}
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                personnel.insuranceAccountingNotified
                  ? "text-emerald-800"
                  : "text-zinc-600",
              )}
            >
              {personnel.insuranceAccountingNotified
                ? t("personnel.insuranceAccountingNotifiedYes")
                : t("personnel.insuranceAccountingNotifiedNo")}
            </p>
          </div>
        </div>
      </article>
      <article
        className={cn(
          "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
          personnel.isDeleted
            ? "border-zinc-200/90 bg-zinc-100/50"
            : "border-zinc-200 bg-white",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-zinc-900">
            {t("personnel.insurancePeriodsTitle")}
          </h4>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] shrink-0"
            disabled={personnel.isDeleted}
            onClick={onAddPeriod}
          >
            {t("personnel.insurancePeriodsAdd")}
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {t("personnel.insurancePeriodsIntro")}
        </p>
        {insurancePeriodsPending ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : insurancePeriods.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            {t("personnel.insurancePeriodsEmpty")}
          </p>
        ) : (
          <div className="mt-3 -mx-1 overflow-x-auto px-1">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>
                    {t("personnel.insurancePeriodColStart")}
                  </TableHeader>
                  <TableHeader>
                    {t("personnel.insurancePeriodColEnd")}
                  </TableHeader>
                  <TableHeader className="min-w-[7rem]">
                    {t("personnel.insurancePeriodColBranch")}
                  </TableHeader>
                  <TableHeader className="min-w-[8rem]">
                    {t("personnel.insurancePeriodColNotes")}
                  </TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap text-right">
                    {t("personnel.insurancePeriodColActions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {insurancePeriods.map((row) => {
                  const periodOpen =
                    row.coverageEndDate == null ||
                    String(row.coverageEndDate).trim() === "";
                  return (
                    <TableRow key={row.id}>
                      <TableCell
                        dataLabel={t("personnel.insurancePeriodColStart")}
                        className="whitespace-nowrap text-zinc-700"
                      >
                        {formatLocaleDate(row.coverageStartDate, locale, dash)}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.insurancePeriodColEnd")}
                        className="whitespace-nowrap text-zinc-700"
                      >
                        {periodOpen
                          ? t("personnel.insuranceOngoing")
                          : formatLocaleDate(
                              row.coverageEndDate,
                              locale,
                              dash,
                            )}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.insurancePeriodColBranch")}
                        className="max-w-[10rem] truncate text-zinc-700"
                        title={row.registeredBranchName?.trim() ?? undefined}
                      >
                        {row.registeredBranchName?.trim()
                          ? row.registeredBranchName.trim()
                          : dash}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.insurancePeriodColNotes")}
                        className="max-w-[14rem] truncate text-zinc-600"
                        title={row.notes ?? undefined}
                      >
                        {row.notes?.trim() ? row.notes.trim() : dash}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.insurancePeriodColActions")}
                        className="text-right"
                      >
                        {personnel.isDeleted ? null : (
                          <div className="flex justify-end gap-1.5">
                            {periodOpen ? (
                              <Tooltip
                                content={t(
                                  "personnel.insurancePeriodRowCloseTooltip",
                                )}
                                delayMs={150}
                              >
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t(
                                    "personnel.insurancePeriodRowCloseAria",
                                  )}
                                  onClick={() => onEditPeriod(row)}
                                >
                                  <CalendarCheckIcon className="mx-auto opacity-90" />
                                </Button>
                              </Tooltip>
                            ) : null}
                            <Tooltip
                              content={t(
                                "personnel.insurancePeriodRowEditTooltip",
                              )}
                              delayMs={150}
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                className={detailOpenIconButtonClass}
                                aria-label={t(
                                  "personnel.insurancePeriodRowEditAria",
                                )}
                                onClick={() => onEditPeriod(row)}
                              >
                                <PencilIcon className="mx-auto opacity-90" />
                              </Button>
                            </Tooltip>
                            <Tooltip content={t("common.delete")} delayMs={150}>
                              <button
                                type="button"
                                className={trashIconActionButtonClass}
                                title={t("common.delete")}
                                aria-label={t("common.delete")}
                                disabled={deletePending}
                                onClick={() => onDeletePeriod(row)}
                              >
                                <TrashIcon />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </article>
    </div>
  );
}
