"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchBranchHeldRegisterCashByPerson } from "@/modules/branch/api/branches-api";
import {
  branchKeys,
  useBranchHeldRegisterCashByPerson,
} from "@/modules/branch/hooks/useBranchQueries";
import type { IncomeCashBranchManagerPersonRow } from "@/types/branch";

const EMPTY_ROWS: IncomeCashBranchManagerPersonRow[] = [];

/**
 * Personel zimmetindeki kasa nakdi satırlarını hazırlar.
 *
 * - Tek şube modunda: doğrudan o şubenin verisi.
 * - Çoklu şube agregasyonu açıkken: birden çok şubeden veri çekilir + kişiye göre
 *   tutar toplanır.
 *
 * Çıktı seçici picker'a doğrudan beslenebilir; hem yükleniyor durumu hem agregat
 * fingerprint expose edilir (downstream useMemo bağımlılıklarında stable string).
 */
export type UseHeldRegisterCashRowsInput = {
  resolvedBranchId: number | null;
  asOfDateYmd: string;
  pickerEnabled: boolean;
  acrossBranchesEnabled: boolean;
  queryBranchIds: number[];
};

export type UseHeldRegisterCashRowsResult = {
  rowsForPicker: IncomeCashBranchManagerPersonRow[];
  /** Sadece agregasyon kapalıyken anlamlı: tek şube verisi (raw). */
  singleBranchRows: IncomeCashBranchManagerPersonRow[];
  /** Sadece agregasyon açıkken anlamlı: kişi başı toplanmış. */
  aggregatedRows: IncomeCashBranchManagerPersonRow[];
  loading: boolean;
  /** useMemo bağımlılığı: agregasyon değiştiğinde değişen stable string. */
  fingerprint: string;
};

export function useHeldRegisterCashRows(
  input: UseHeldRegisterCashRowsInput
): UseHeldRegisterCashRowsResult {
  const {
    resolvedBranchId,
    asOfDateYmd,
    pickerEnabled,
    acrossBranchesEnabled,
    queryBranchIds,
  } = input;

  const { data: singleBranchData, isPending: singleBranchPending } =
    useBranchHeldRegisterCashByPerson(
      resolvedBranchId,
      asOfDateYmd,
      pickerEnabled && !acrossBranchesEnabled
    );
  const singleBranchRows = singleBranchData ?? EMPTY_ROWS;

  const branchQueries = useQueries({
    queries: queryBranchIds.map((branchId) => ({
      queryKey: branchKeys.heldRegisterCashByPerson(branchId, asOfDateYmd),
      queryFn: () => fetchBranchHeldRegisterCashByPerson(branchId, asOfDateYmd),
      enabled: acrossBranchesEnabled,
    })),
  });

  const fingerprint = useMemo(() => {
    if (!acrossBranchesEnabled) return "";
    return branchQueries
      .map((q) => `${q.fetchStatus}:${q.status}:${q.dataUpdatedAt}`)
      .join(";");
  }, [acrossBranchesEnabled, branchQueries]);

  const aggregatedRows = useMemo<IncomeCashBranchManagerPersonRow[]>(() => {
    if (!acrossBranchesEnabled) return EMPTY_ROWS;
    const byPersonnel = new Map<
      number,
      { personnelId: number; fullName: string; amount: number }
    >();
    for (const q of branchQueries) {
      const rows = q.data ?? EMPTY_ROWS;
      for (const r of rows) {
        const pid = r.personnelId;
        if (pid == null || pid <= 0) continue;
        const amount = Number(r.amount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const curr = byPersonnel.get(pid);
        if (curr) {
          curr.amount += amount;
          if (!curr.fullName && r.fullName) curr.fullName = r.fullName;
        } else {
          byPersonnel.set(pid, {
            personnelId: pid,
            fullName: r.fullName ?? "",
            amount,
          });
        }
      }
    }
    return [...byPersonnel.values()];
    // fingerprint, branchQueries.data dizisinin stable özetidir; direkt array dep'i yerine fingerprint kullan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acrossBranchesEnabled, fingerprint]);

  const rowsForPicker = acrossBranchesEnabled
    ? aggregatedRows
    : singleBranchRows;

  const loading = acrossBranchesEnabled
    ? branchQueries.some((q) => q.isPending)
    : singleBranchPending;

  return {
    rowsForPicker,
    singleBranchRows,
    aggregatedRows,
    loading,
    fingerprint,
  };
}
