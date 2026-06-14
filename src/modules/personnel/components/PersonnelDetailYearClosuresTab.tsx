"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatYearClosureSalarySummary,
  YearClosureReportLinks,
} from "@/modules/personnel/components/YearClosureReportLinks";
import type { Personnel } from "@/types/personnel";
import type { PersonnelYearAccountClosureListItem } from "@/types/personnel-account-closure";

/**
 * Yıl kapanışları sekmesi: üst başlık + "Hesabı kapat" CTA + cihaz duyarlı kart/tablo
 * + her satırda "Yeniden aç" eylemi (confirm toast → caller'a iletilir).
 */
export function PersonnelDetailYearClosuresTab({
  personnel,
  yearClosures,
  yearClosuresLoading,
  yearClosuresError,
  yearClosuresErr,
  onOpenAccountClosure,
  onReopenYear,
  isReopenPendingForYear,
  t,
  locale,
  dash,
}: {
  personnel: Personnel;
  yearClosures: PersonnelYearAccountClosureListItem[];
  yearClosuresLoading: boolean;
  yearClosuresError: boolean;
  yearClosuresErr: unknown;
  onOpenAccountClosure: () => void;
  /** Belirtilen yılı yeniden aç; caller confirm + mutate + notify zincirini yürütür. */
  onReopenYear: (closureYear: number) => void;
  isReopenPendingForYear: (closureYear: number) => boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}) {
  return (
    <div className="min-w-0 space-y-4 pb-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm leading-relaxed text-zinc-600">
            {t("personnel.yearClosuresIntro")}
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            {t("personnel.yearClosuresStoryHint")}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px] min-w-[44px] w-full shrink-0 sm:w-auto"
          disabled={personnel.isDeleted}
          onClick={onOpenAccountClosure}
        >
          {t("personnel.yearClosuresCloseAccount")}
        </Button>
      </div>
      {personnel.isDeleted ? (
        <p className="text-sm text-zinc-500">
          {t("personnel.yearClosuresReadOnlyHint")}
        </p>
      ) : null}
      {yearClosuresLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : null}
      {yearClosuresError ? (
        <p className="text-sm text-red-600">{toErrorMessage(yearClosuresErr)}</p>
      ) : null}
      {!yearClosuresLoading &&
      !yearClosuresError &&
      yearClosures.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {t("personnel.yearClosuresEmpty")}
        </p>
      ) : null}
      {!yearClosuresLoading && !yearClosuresError && yearClosures.length > 0 ? (
        <>
          <div className="space-y-3 lg:hidden">
            {yearClosures.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5"
              >
                <dl className="grid gap-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColYear")}
                    </dt>
                    <dd className="font-semibold tabular-nums text-zinc-900">
                      {row.closureYear}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColClosedAt")}
                    </dt>
                    <dd className="text-zinc-800">
                      {formatLocaleDateTime(row.closedAtUtc, locale)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColClosedBy")}
                    </dt>
                    <dd className="text-zinc-800">
                      {row.closedByFullName?.trim() ||
                        `#${row.closedByUserId}`}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColNotes")}
                    </dt>
                    <dd className="break-words text-zinc-700">
                      {row.notes?.trim() || dash}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColSettlementPdf")}
                    </dt>
                    <dd className="font-medium text-zinc-800">
                      {row.settlementPdfAcknowledged
                        ? t("personnel.yearClosuresPdfAckYes")
                        : t("personnel.yearClosuresPdfAckNo")}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColSalary")}
                    </dt>
                    <dd className="break-words text-zinc-700">
                      {formatYearClosureSalarySummary(row, locale, t, dash)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-zinc-500">
                      {t("personnel.yearClosuresColReport")}
                    </dt>
                    <dd>
                      <YearClosureReportLinks
                        personnelId={personnel.id}
                        row={row}
                        t={t}
                      />
                    </dd>
                  </div>
                  {row.salarySettlementNote?.trim() ? (
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-zinc-500">
                        {t(
                          "personnel.accountClosure.salarySettlementNoteLabel",
                        )}
                      </dt>
                      <dd className="break-words text-zinc-700">
                        {row.salarySettlementNote.trim()}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 min-h-12 w-full touch-manipulation"
                  disabled={
                    personnel.isDeleted || isReopenPendingForYear(row.closureYear)
                  }
                  onClick={() => onReopenYear(row.closureYear)}
                >
                  {t("personnel.yearClosuresReopen")}
                </Button>
              </div>
            ))}
          </div>
          <div className="hidden min-w-0 lg:block">
            <div className="overflow-x-auto rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-0 lg:min-w-[64rem] border-collapse text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="min-w-[4rem] px-3 py-3 pl-4 font-medium">
                      {t("personnel.yearClosuresColYear")}
                    </th>
                    <th className="min-w-[10rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColClosedAt")}
                    </th>
                    <th className="min-w-[8rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColClosedBy")}
                    </th>
                    <th className="min-w-[8rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColNotes")}
                    </th>
                    <th className="min-w-[12rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColSalary")}
                    </th>
                    <th className="min-w-[5rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColSettlementPdf")}
                    </th>
                    <th className="min-w-[12rem] px-3 py-3 font-medium">
                      {t("personnel.yearClosuresColReport")}
                    </th>
                    <th className="w-[1%] px-3 py-3 pr-4 text-right font-medium">
                      {t("personnel.yearClosuresColAction")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {yearClosures.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/80">
                      <td className="px-3 py-3 pl-4 align-middle font-medium tabular-nums">
                        {row.closureYear}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                        {formatLocaleDateTime(row.closedAtUtc, locale)}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                        {row.closedByFullName?.trim() ||
                          `#${row.closedByUserId}`}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-3 align-middle text-sm text-zinc-600">
                        {row.notes?.trim() || dash}
                      </td>
                      <td className="max-w-[14rem] px-3 py-3 align-middle text-sm text-zinc-700">
                        <span className="line-clamp-2">
                          {formatYearClosureSalarySummary(row, locale, t, dash)}
                        </span>
                        {row.salarySettlementNote?.trim() ? (
                          <span className="mt-1 block line-clamp-2 text-xs text-zinc-500">
                            {row.salarySettlementNote.trim()}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm text-zinc-700">
                        {row.settlementPdfAcknowledged
                          ? t("personnel.yearClosuresPdfAckYes")
                          : t("personnel.yearClosuresPdfAckNo")}
                      </td>
                      <td className="max-w-[16rem] px-3 py-3 align-middle">
                        <YearClosureReportLinks
                          personnelId={personnel.id}
                          row={row}
                          t={t}
                        />
                      </td>
                      <td className="px-3 py-3 pr-4 text-right align-middle">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px] min-w-[44px] whitespace-nowrap"
                          disabled={
                            personnel.isDeleted ||
                            isReopenPendingForYear(row.closureYear)
                          }
                          onClick={() => onReopenYear(row.closureYear)}
                        >
                          {t("personnel.yearClosuresReopen")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
