"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback } from "react";

import { ApiError } from "@/lib/api/base-api";
import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";

export const ROW_VERSION_CONFLICT_CODE = "ROW_VERSION_CONFLICT";

/**
 * Backend xmin tabanlı optimistic concurrency yapısı için hata yakalayıcı.
 *
 * Kullanım:
 *   const handleRowVersionConflict = useRowVersionConflict({
 *     invalidate: [["branches"], ["branch", id]],
 *   });
 *   const mutation = useMutation({
 *     mutationFn: ...,
 *     onError: (err) => {
 *       if (handleRowVersionConflict(err)) return; // toast + invalidate
 *       notifyMutationError(err);
 *     },
 *   });
 *
 * 409 + errorCode=ROW_VERSION_CONFLICT yakalandığında:
 *   - Localized toast gösterir.
 *   - İlgili query'leri invalidate eder ki kullanıcı taze veriyi görsün.
 *   - true döner; caller başka error handling yapmasın.
 * Aksi durumda false döner; caller normal error path'ini çalıştırsın.
 */
export function useRowVersionConflict(options: {
  invalidate?: readonly QueryKey[];
} = {}): (error: unknown) => boolean {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const invalidateKeys = options.invalidate;

  return useCallback(
    (error: unknown): boolean => {
      if (!isRowVersionConflict(error)) return false;
      notify.error(t("common.rowVersionConflict"));
      if (invalidateKeys && invalidateKeys.length > 0) {
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
      return true;
    },
    [t, queryClient, invalidateKeys]
  );
}

export function isRowVersionConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.errorCode === ROW_VERSION_CONFLICT_CODE
  );
}
