"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { notifyUndoable } from "@/shared/lib/notify-undoable";

/**
 * Reusable undoable-delete orchestrator — basit list/paged cache'lerden ID'yi
 * anlık çıkarır, 5sn'lik "Geri Al" penceresi sunar, süre dolarsa gerçek sunucu
 * DELETE'i atar.
 *
 * Liste shape'leri (`array` veya `{items, totalCount}`) için `createOptimisticListDelete`
 * helper'ı ile aynı format desteği var.
 *
 * Kullanım:
 *   confirmUndoableDelete({
 *     qc,
 *     queryKeyPrefix: supplierKeys.all,
 *     targetId: id,
 *     deleteFn: () => deleteSupplier(id),
 *     successMessage: "Tedarikçi silindi",
 *     onCommitted: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
 *   });
 */

type ListShape<T> =
  | T[]
  | { items: T[]; totalCount?: number; [k: string]: unknown }
  | undefined;

export function confirmUndoableDelete<T extends { id: number | string }>(opts: {
  qc: QueryClient;
  queryKeyPrefix: readonly unknown[];
  targetId: number | string;
  deleteFn: () => Promise<unknown>;
  successMessage: string;
  /** Commit (gerçek silme) bittikten sonra çağrılır — invalidation set'i. */
  onCommitted?: () => void;
  delayMs?: number;
}): void {
  const { qc, queryKeyPrefix, targetId, deleteFn, successMessage, onCommitted, delayMs } = opts;

  const snapshots: Array<[QueryKey, unknown]> = [];

  // ① Snapshot + optimistic removal
  void qc.cancelQueries({ queryKey: queryKeyPrefix, exact: false });

  qc.setQueriesData<ListShape<T>>(
    { queryKey: queryKeyPrefix, exact: false },
    (old) => {
      if (old == null) return old;
      if (Array.isArray(old)) {
        const idx = old.findIndex((it) => it.id === targetId);
        if (idx < 0) return old;
        snapshots.push([queryKeyPrefix, structuredClone(old)]);
        return old.filter((it) => it.id !== targetId);
      }
      if ("items" in old && Array.isArray(old.items)) {
        const has = old.items.some((it) => it.id === targetId);
        if (!has) return old;
        snapshots.push([queryKeyPrefix, structuredClone(old)]);
        return {
          ...old,
          items: old.items.filter((it) => it.id !== targetId),
          totalCount:
            typeof old.totalCount === "number"
              ? Math.max(0, old.totalCount - 1)
              : old.totalCount,
        };
      }
      return old;
    }
  );

  notifyUndoable({
    message: successMessage,
    delayMs: delayMs ?? 5000,
    optimisticUpdate: () => {
      /* zaten yukarıda yapıldı */
    },
    rollback: () => {
      for (const [key, data] of snapshots) qc.setQueryData(key, data);
    },
    commit: async () => {
      await deleteFn();
      onCommitted?.();
    },
    failureMessage: "Silme tamamlanamadı, kayıt geri yüklendi.",
  });
}
