import { ApiError } from "@/lib/api/base-api";
import { API_ERROR_CODE_TOURISM_SEASON_CLOSED_FOR_REGISTER } from "@/shared/lib/api-error-codes";
import { toErrorMessage } from "@/shared/lib/error-message";

export type LocalizedApiErrorContext = {
  /** Turizm kapalı kasa politikasını ve ilgili ayar sayfasını yönetebilir (şu an ADMIN). */
  canManageTourismSeasonClosedPolicy?: boolean;
};

/** Ayarlar → turizm kapalı sezon politikası ekranına gidebilen roller. */
export function userCanManageTourismSeasonClosedPolicy(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

/**
 * Bilinen `errorCode` + rol için çeviri; aksi halde sunucu `error` metni veya `toErrorMessage`.
 * Yeni kodlar: `apiErrors.*` anahtarları + bu fonksiyonda `switch` dalı ekleyin.
 */
export function resolveLocalizedApiError(
  error: unknown,
  t: (key: string) => string,
  ctx?: LocalizedApiErrorContext
): string {
  if (!(error instanceof ApiError)) return toErrorMessage(error);
  const code = error.errorCode?.trim();
  const adminPolicy = ctx?.canManageTourismSeasonClosedPolicy === true;
  if (code === API_ERROR_CODE_TOURISM_SEASON_CLOSED_FOR_REGISTER) {
    return adminPolicy
      ? t("apiErrors.tourismSeasonClosedForRegisterAdmin")
      : t("apiErrors.tourismSeasonClosedForRegister");
  }
  return error.message;
}
