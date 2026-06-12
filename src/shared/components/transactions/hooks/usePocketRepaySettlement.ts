"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Personel cep borcu kapatma (OUT_POCKET_REPAY) için kapsanan satırların özet state'i.
 * Picker component'i `onSettlementChange` ile bildirim yapar; modal bu state'e bakıp
 * tutarı/uygunluğu doğrular.
 */
export type PocketRepaySettlementState = {
  ids: number[];
  sum: number;
  currencyOk: boolean;
};

export type UsePocketRepaySettlementApi = {
  settlement: PocketRepaySettlementState;
  setSettlement: (next: PocketRepaySettlementState) => void;
  /** Default değere döndürür (boş seçim + currency uyumlu). */
  reset: () => void;
};

const DEFAULT: PocketRepaySettlementState = { ids: [], sum: 0, currencyOk: true };

export function usePocketRepaySettlement(): UsePocketRepaySettlementApi {
  const [settlement, setSettlement] = useState<PocketRepaySettlementState>(DEFAULT);
  const reset = useCallback(() => setSettlement(DEFAULT), []);
  return useMemo(
    () => ({ settlement, setSettlement, reset }),
    [settlement, reset]
  );
}
