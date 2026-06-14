"use client";

import {
  personnelYearClosurePdfDownloadUrl,
  personnelYearClosurePdfViewUrl,
} from "@/modules/personnel/api/personnel-account-closure-api";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { sourceAbbrev } from "@/modules/personnel/lib/advance-formatters";
import type { PersonnelYearAccountClosureListItem } from "@/types/personnel-account-closure";

/**
 * Yıl kapanış maaş özetini tek satır metne çevirir: çalışma günü · beklenen tutar ·
 * mahsup durumu · kaynak. Veri yoksa `dash`.
 */
export function formatYearClosureSalarySummary(
  row: PersonnelYearAccountClosureListItem,
  locale: Locale,
  t: (k: string) => string,
  dash: string,
): string {
  const hasData =
    row.closureWorkedDays != null ||
    row.closureExpectedSalaryAmount != null ||
    row.salaryBalanceSettled ||
    (row.salaryPaymentSourceType?.trim()?.length ?? 0) > 0;
  if (!hasData) return dash;

  const bits: string[] = [];
  if (row.closureWorkedDays != null) bits.push(`${row.closureWorkedDays}d`);
  if (row.closureExpectedSalaryAmount != null) {
    bits.push(
      formatLocaleAmount(
        row.closureExpectedSalaryAmount,
        locale,
        row.closureExpectedSalaryCurrency || "TRY",
      ),
    );
  }
  bits.push(
    row.salaryBalanceSettled
      ? t("personnel.yearClosuresSalarySettledYes")
      : t("personnel.yearClosuresSalarySettledNo"),
  );
  const st = row.salaryPaymentSourceType?.trim();
  if (st) bits.push(sourceAbbrev(t, st));
  return bits.join(" · ");
}

/** Yıl kapanış kaydının PDF görüntüle/indir bağlantıları (yoksa "PDF yok" rozeti). */
export function YearClosureReportLinks({
  personnelId,
  row,
  t,
}: {
  personnelId: number;
  row: PersonnelYearAccountClosureListItem;
  t: (k: string) => string;
}) {
  const hasPdf = row.hasClosurePdf === true;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      {hasPdf ? (
        <>
          <a
            href={personnelYearClosurePdfViewUrl(personnelId, row.closureYear)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sky-800 underline decoration-sky-800/30 underline-offset-2"
          >
            {t("personnel.yearClosuresViewPdf")}
          </a>
          <a
            href={personnelYearClosurePdfDownloadUrl(personnelId, row.closureYear)}
            className="font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2"
          >
            {t("personnel.yearClosuresDownloadPdf")}
          </a>
        </>
      ) : (
        <span className="text-xs text-zinc-400">
          {t("personnel.yearClosuresNoPdf")}
        </span>
      )}
    </div>
  );
}
