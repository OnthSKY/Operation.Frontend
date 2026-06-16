"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Optimistic list delete helper — `useMutation` onMutate/onError için reusable handler'lar.
 *
 * Kullanım:
 *   const handlers = createOptimisticListDelete<MyEntity>({
 *     qc,
 *     queryKeyPrefix: supplierKeys.all,  // ["suppliers"] gibi
 *     extractId: (item) => item.id,      // ID karşılaştırma için
 *   });
 *   return useMutation({
 *     mutationFn: deleteSupplier,
 *     ...handlers(idToDelete => idToDelete),
 *     onSettled: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
 *   });
 *
 * Davranış:
 *   - onMutate: Active query'lerden ID eşleşeni snapshot alıp filtreler
 *   - onError:  Snapshot'tan geri yükler (rollback)
 *
 * NOT: onSettled'da invalidate ÇAĞIRMAK mutation'da yapılır (her entity'nin
 * kendine özgü invalidation set'i olur).
 */

type ListShape<T> =
  | T[]
  | { items: T[]; totalCount?: number; [k: string]: unknown }
  | undefined;

export function createOptimisticListDelete<T>(opts: {
  qc: QueryClient;
  /** ["suppliers"] gibi prefix — tüm eşleşen query'leri tarar. */
  queryKeyPrefix: readonly unknown[];
  /** Her item'dan ID çıkar (number veya string). */
  extractId: (item: T) => number | string;
}) {
  const { qc, queryKeyPrefix, extractId } = opts;

  return function mutationHandlers(getTargetId: (variables: unknown) => number | string) {
    return {
      onMutate: async (variables: unknown) => {
        const targetId = getTargetId(variables);

        // Çakışan refetch'leri durdur
        await qc.cancelQueries({ queryKey: queryKeyPrefix, exact: false });

        const snapshots: Array<[QueryKey, unknown]> = [];

        qc.setQueriesData<ListShape<T>>(
          { queryKey: queryKeyPrefix, exact: false },
          (old) => {
            if (old == null) return old;
            // Array form
            if (Array.isArray(old)) {
              const idx = old.findIndex((it) => extractId(it) === targetId);
              if (idx < 0) return old;
              snapshots.push([queryKeyPrefix, structuredClone(old)]);
              return old.filter((it) => extractId(it) !== targetId);
            }
            // Paged { items, totalCount } form
            if ("items" in old && Array.isArray(old.items)) {
              const has = old.items.some((it) => extractId(it) === targetId);
              if (!has) return old;
              snapshots.push([queryKeyPrefix, structuredClone(old)]);
              return {
                ...old,
                items: old.items.filter((it) => extractId(it) !== targetId),
                totalCount:
                  typeof old.totalCount === "number"
                    ? Math.max(0, old.totalCount - 1)
                    : old.totalCount,
              };
            }
            return old;
          }
        );

        return { snapshots };
      },
      onError: (_err: unknown, _variables: unknown, ctx: { snapshots?: Array<[QueryKey, unknown]> } | undefined) => {
        if (!ctx?.snapshots) return;
        for (const [key, data] of ctx.snapshots) {
          qc.setQueryData(key, data);
        }
      },
    };
  };
}
