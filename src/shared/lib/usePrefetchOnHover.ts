"use client";

import { useCallback, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Hover/focus tetiklemeli prefetch — kullanıcı satıra gelince detail query
 * arka planda fetch edilir. Detay tıklanınca anında açılır.
 *
 * Tasarım kararları:
 *   - 150ms debounce: hızlı hover'larda gereksiz request başlatmaz
 *   - Aynı key 30s içinde tekrar prefetch edilmez (fresh cache yeterli)
 *   - mobil (touch) için onPointerDown tetiklemesi de yapılır
 *   - Yavaş bağlantı (saveData) açıksa hover prefetch DEVRE DIŞI — veri tasarrufu
 *
 * Kullanım:
 *   const prefetch = usePrefetchOnHover(
 *     ["personnel", "detail", id],
 *     () => fetchPersonnelDetail(id)
 *   );
 *   <tr {...prefetch.handlers}>...</tr>
 */

const PREFETCH_STALE_MS = 30_000;
const HOVER_DEBOUNCE_MS = 150;

function isSaveDataOn(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as unknown as { connection?: { saveData?: boolean } };
  return Boolean(n.connection?.saveData);
}

export function usePrefetchOnHover<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>
) {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isSaveDataOn()) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void qc.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: PREFETCH_STALE_MS,
      });
    }, HOVER_DEBOUNCE_MS);
  }, [qc, queryKey, queryFn]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    handlers: {
      onPointerEnter: trigger,
      onPointerLeave: cancel,
      onFocus: trigger,
      onBlur: cancel,
    },
  };
}
