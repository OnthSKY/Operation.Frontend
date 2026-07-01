"use client";

import { useCallback, useMemo, useState } from "react";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount, formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import type { CounterpartySuggestionRow } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { fetchCustomerAccountBalance } from "@/modules/order-account-statement/api/customer-accounts-api";

/**
 * Seçili sistem şubesinin açık bakiyesini "Önceki bakiye" alanına uygulama.
 *
 * SRP: hem açık bakiye lookup map'ini hem de uygulama callback'ini bir arada
 * tutar. Counterparty önerileri içinde şube row'ları varsa map'ten okur;
 * yoksa fallback olarak faturalardan toplar (görsel/UX'i değişmez tutmak için).
 */
type Params = {
  t: (k: string) => string;
  locale: "tr" | "en";
  /** Counterparty suggestions (branchOpenAmountById bunun üzerinden hesaplanır). */
  suggestions: CounterpartySuggestionRow[];
  linkedBranchId: string;
  setPreviousBalanceText: React.Dispatch<React.SetStateAction<string>>;
};

export function useOasBranchBalance({
  t,
  locale,
  suggestions,
  linkedBranchId,
  setPreviousBalanceText,
}: Params) {
  const [applyBranchOpenBalanceBusy, setApplyBranchOpenBalanceBusy] = useState(false);

  const branchOpenAmountById = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of suggestions) {
      if (row.counterpartyType !== "branch") continue;
      if (!Number.isFinite(row.counterpartyId) || row.counterpartyId <= 0) continue;
      const prev = map.get(row.counterpartyId) ?? 0;
      map.set(row.counterpartyId, prev + Math.max(0, Number(row.openAmount) || 0));
    }
    return map;
  }, [suggestions]);

  const applySelectedBranchOpenBalance = useCallback(async () => {
    const branchId = Number.parseInt(linkedBranchId.trim(), 10);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      notify.error(t("reports.orderAccountStatementSystemBranchBalanceSelectFirst"));
      return;
    }
    setApplyBranchOpenBalanceBusy(true);
    try {
      // Canonical kaynak — customer_account_receipts'ten hesaplanan açık bakiye
      // (Faturalar tab + Cari Hesaplar sayfası ile aynı endpoint).
      const balance = await fetchCustomerAccountBalance("branch", branchId);
      const open = Number(balance?.openBalance);
      if (!Number.isFinite(open)) {
        notify.error(t("reports.orderAccountStatementSystemBranchBalanceMissing"));
        return;
      }
      const applied = Math.max(0, open);
      setPreviousBalanceText(formatLocaleAmountInput(applied, locale));
      if (applied <= 0) {
        // Borç yok → alanı sıfırladık; kullanıcıya net söyle.
        notify.info(t("reports.orderAccountStatementSystemBranchNoDebt"));
      } else {
        notify.success(
          t("reports.orderAccountStatementSystemBranchDebtApplied").replace(
            "{amount}",
            formatLocaleAmount(applied, locale, "TRY")
          )
        );
      }
    } catch (error) {
      notify.error(toErrorMessage(error));
    } finally {
      setApplyBranchOpenBalanceBusy(false);
    }
  }, [linkedBranchId, locale, setPreviousBalanceText, t]);

  return {
    branchOpenAmountById,
    applySelectedBranchOpenBalance,
    applyBranchOpenBalanceBusy,
  };
}
