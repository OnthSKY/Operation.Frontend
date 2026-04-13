"use client";

import type { BranchTxPageParams } from "@/modules/branch/api/branches-api";
import { useBranchTransactionsPaged } from "@/modules/branch/hooks/useBranchQueries";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  branchId: number;
  personnelId: number | null;
  enabled: boolean;
  /** Kapatılmış cepten satırları listeleme dışı bırakır (cep iadesi seçimi). */
  excludeSettledPocketExpenses: boolean;
  locale: Locale;
  t: (key: string) => string;
  formCurrencyCode: string;
  /** Seçim veya liste değişince: seçilen id’ler, toplam, para birimi uyumu. */
  onSettlementChange: (ids: number[], sum: number, currencyOk: boolean) => void;
};

export function PersonnelPocketPriorLinesPicker({
  branchId,
  personnelId,
  enabled,
  excludeSettledPocketExpenses,
  locale,
  t,
  formCurrencyCode,
  onSettlementChange,
}: Props) {
  const pid = personnelId != null && personnelId > 0 ? personnelId : null;
  const params = useMemo((): BranchTxPageParams => {
    if (pid == null) return { page: 1, pageSize: 20, type: "OUT" };
    return {
      page: 1,
      pageSize: 100,
      type: "OUT",
      expensePaymentSource: "PERSONNEL_POCKET",
      expensePocketPersonnelId: pid,
      excludeSettledPocketExpenses,
    };
  }, [pid, excludeSettledPocketExpenses]);

  const listEnabled = Boolean(enabled && pid != null);
  const { data, isPending, isError, error } = useBranchTransactionsPaged(
    branchId,
    params,
    listEnabled
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [pid, excludeSettledPocketExpenses]);

  const items = data?.items ?? [];

  const toggle = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(items.map((x) => x.id)));
  const clearAll = () => setSelected(new Set());

  const { sum, currencyOk, rowCurrency } = useMemo(() => {
    const rows = items.filter((r) => selected.has(r.id));
    if (rows.length === 0)
      return { sum: 0, currencyOk: true, rowCurrency: "" as string };
    const codes = [...new Set(rows.map((r) => String(r.currencyCode ?? "TRY").trim().toUpperCase()))];
    const sumN = rows.reduce((a, r) => a + Number(r.amount), 0);
    const formCur = String(formCurrencyCode ?? "TRY").trim().toUpperCase();
    const ok = codes.length === 1 && codes[0] === formCur;
    return { sum: sumN, currencyOk: ok, rowCurrency: codes[0] ?? "" };
  }, [items, selected, formCurrencyCode]);

  const selectedIdsSorted = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);

  const notifyParent = useCallback(
    (ids: number[], s: number, ok: boolean) => {
      onSettlementChange(ids, s, ok);
    },
    [onSettlementChange]
  );

  useEffect(() => {
    if (!listEnabled || !pid) {
      notifyParent([], 0, true);
      return;
    }
    notifyParent(selectedIdsSorted, sum, currencyOk);
  }, [listEnabled, pid, selectedIdsSorted, sum, currencyOk, notifyParent]);

  if (!enabled || !pid) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 sm:p-3.5">
      <p className="text-sm font-semibold text-zinc-900">{t("branch.pocketPriorLinesTitleRepay")}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">{t("branch.pocketPriorLinesHintRepay")}</p>

      {isPending ? (
        <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600">{toErrorMessage(error)}</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{t("branch.pocketPriorEmpty")}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-11 w-auto px-3 text-sm" onClick={selectAll}>
              {t("branch.pocketPriorSelectAll")}
            </Button>
            <Button type="button" variant="secondary" className="min-h-11 w-auto px-3 text-sm" onClick={clearAll}>
              {t("branch.pocketPriorClear")}
            </Button>
          </div>
          {selected.size > 0 ? (
            <p className="mt-2 text-sm font-medium tabular-nums text-zinc-800">
              {t("branch.pocketPriorSelectedTotal")}:{" "}
              {currencyOk
                ? formatLocaleAmount(sum, locale, formCurrencyCode)
                : formatLocaleAmount(sum, locale, rowCurrency || formCurrencyCode)}
            </p>
          ) : null}
          {selected.size > 0 && !currencyOk ? (
            <p className="mt-2 text-xs leading-relaxed text-amber-900">{t("branch.pocketPriorCurrencyMismatch")}</p>
          ) : null}
          <ul className="mt-3 max-h-[min(14rem,40dvh)] space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-zinc-200/80 bg-white p-1">
            {items.map((row) => {
              const on = selected.has(row.id);
              return (
                <li key={row.id}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer touch-manipulation items-start gap-2.5 rounded-lg px-2 py-2 text-sm",
                      on ? "bg-violet-50" : "hover:bg-zinc-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(row.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium tabular-nums text-zinc-900">
                        {formatLocaleAmount(Number(row.amount), locale, row.currencyCode)}
                      </span>
                      <span className="mx-1.5 text-zinc-300">·</span>
                      <span className="text-zinc-600">{formatLocaleDate(row.transactionDate, locale)}</span>
                      {row.description?.trim() ? (
                        <span className="mt-0.5 block text-xs text-zinc-500 break-words">{row.description.trim()}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
