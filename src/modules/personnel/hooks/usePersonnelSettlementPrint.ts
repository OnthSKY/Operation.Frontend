"use client";

import { useCallback, useState } from "react";
import type { Locale } from "@/i18n/messages";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import { parseSettlementSeasonYearChoice } from "@/modules/personnel/lib/settlement-print-season";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { Personnel } from "@/types/personnel";

/**
 * Personel mutabakat PDF'i yazdırma akışı:
 *  - Sezon yılı seçimi geçerlilik kontrolü
 *  - `openPersonnelSettlementPrintWindow` çağrısı (yeni sekme)
 *  - `busy` state'i UI buton disable'ı için
 *  - Hata olursa toast
 *
 * Caller `runPrint(rawSeasonChoice)` ile tetikler; `busy` true iken UI butonlarını
 * disable eder.
 */
export function usePersonnelSettlementPrint({
  personnel,
  branchNameById,
  locale,
  t,
}: {
  personnel: Personnel | null;
  branchNameById: Map<number, string>;
  locale: Locale;
  t: (k: string) => string;
}) {
  const [busy, setBusy] = useState(false);

  const runPrint = useCallback(
    async (rawSeasonChoice: string) => {
      if (!personnel) return;
      const y = parseSettlementSeasonYearChoice(rawSeasonChoice);
      if (rawSeasonChoice.trim() !== "" && y == null) {
        notify.error(t("personnel.effectiveYearInvalid"));
        return;
      }
      setBusy(true);
      try {
        await openPersonnelSettlementPrintWindow({
          target: {
            scope: "personnel",
            personnelId: personnel.id,
            title: personnelDisplayName(personnel),
            seasonArrivalDate: personnel.seasonArrivalDate,
            ...(y != null ? { seasonYearFilter: y } : {}),
          },
          locale,
          branchNameById,
          t,
        });
      } catch (e) {
        notify.error(toErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [personnel, locale, branchNameById, t],
  );

  return { runPrint, busy };
}
