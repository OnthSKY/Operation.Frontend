"use client";

import { ApiError } from "@/shared/api/client";
import { notify } from "@/shared/lib/notify";
import { notifyErrorWithAction } from "@/shared/lib/notify-error-with-action";
import { toErrorMessage } from "@/shared/lib/error-message";

/**
 * Mutation hata sonrası akıllı toast.
 *
 * Network / 5xx hatalarında "Yeniden Dene" butonlu toast — kullanıcı tek tıkla
 * tekrar dener (manuel modal açma + form doldurma kaybı yok).
 *
 * 4xx (validation, auth, not-found) için plain error toast — retry mantıksız.
 *
 * Kullanım:
 *   try { await createTx.mutateAsync(payload); }
 *   catch (e) { notifyMutationError(e, () => createTx.mutate(payload)); }
 */
export function notifyMutationError(error: unknown, retry?: () => void): void {
  const message = toErrorMessage(error);
  const isRetryable = retry != null && shouldOfferRetry(error);
  if (isRetryable) {
    notifyErrorWithAction({
      message,
      actionLabel: "Yeniden Dene",
      onAction: retry!,
    });
    return;
  }
  notify.error(message);
}

function shouldOfferRetry(error: unknown): boolean {
  if (error instanceof ApiError) {
    const s = error.status;
    // Network = 0, 5xx, 408 timeout, 429 rate limit — retry mantıklı
    if (s === 0 || s === 408 || s === 429) return true;
    if (s >= 500 && s < 600) return true;
    return false;
  }
  // Tanımsız error tipi — varsayılan retry sun
  return true;
}
