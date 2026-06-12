"use client";

import { useCallback, useMemo, useState } from "react";
import { DAY_CLOSE_BUNDLED_EXPENSE_MAX } from "../lib/tx-form-constants";
import { newBundledExpenseLineId } from "../lib/tx-day-close-helpers";
import type { DayCloseBundledConfirmedLine } from "../lib/tx-form-types";

/**
 * Gün sonu ile birlikte (bundled) gider satırlarının state'ini yönetir.
 * Modal mantığından izole — saf state + helper'lar.
 *
 * - `open`: bundled gider bölümü görünür mü
 * - `lines`: onaylanmış satırlar
 * - `atCapacity`: maksimuma ulaşıldı mı (`DAY_CLOSE_BUNDLED_EXPENSE_MAX`)
 */
export type UseDayCloseBundleApi = {
  open: boolean;
  setOpen: (next: boolean) => void;
  lines: DayCloseBundledConfirmedLine[];
  /** Yeni onaylı satır ekler (id otomatik). */
  addLine: (line: Omit<DayCloseBundledConfirmedLine, "id">) => void;
  /** id ile satır kaldırır. */
  removeLine: (id: string) => void;
  /** Yalnız satırları temizler; `open` durumu korunur. */
  clearLines: () => void;
  /** Hem satırları hem `open`'ı sıfırlar (modal reset için). */
  clearAll: () => void;
  /** Maksimum satır sayısına ulaşıldı mı? */
  atCapacity: boolean;
};

export function useDayCloseBundle(): UseDayCloseBundleApi {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<DayCloseBundledConfirmedLine[]>([]);

  const addLine = useCallback(
    (line: Omit<DayCloseBundledConfirmedLine, "id">) => {
      setLines((prev) => [...prev, { ...line, id: newBundledExpenseLineId() }]);
    },
    []
  );

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearLines = useCallback(() => {
    setLines((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const clearAll = useCallback(() => {
    setLines((prev) => (prev.length === 0 ? prev : []));
    setOpen((prev) => (prev ? false : prev));
  }, []);

  return useMemo<UseDayCloseBundleApi>(
    () => ({
      open,
      setOpen,
      lines,
      addLine,
      removeLine,
      clearLines,
      clearAll,
      atCapacity: lines.length >= DAY_CLOSE_BUNDLED_EXPENSE_MAX,
    }),
    [open, lines, addLine, removeLine, clearLines, clearAll]
  );
}
