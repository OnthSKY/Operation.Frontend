"use client";

import { useCallback, ChangeEvent } from "react";
import { apiFetch } from "@/shared/api/client";
import { companyBrandingLogoUrl } from "@/modules/admin/api/system-branding-api";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";

/**
 * Şirket amblem (logo) yükleme/seçme akışı:
 *  - `loadBrandingLogoAsDataUrl`: backend'deki kurum logosunu data URL'e dönüştürür.
 *  - `onEmblemFileChange`: kullanıcının seçtiği dosyayı reader ile yükler.
 *  - `onUseBrandingEmblem`: tek tıkla kurumsal logoyu yükler ve emblem'e set eder.
 *
 * SRP: yalnızca amblem davranışı; identity state'i identity hook üzerinden
 * yönetilir (DRY).
 */
type Params = {
  t: (k: string) => string;
  identity: ReturnType<typeof useOasIdentity>;
};

export function useOasBrandingLogo({ t, identity }: Params) {
  const loadBrandingLogoAsDataUrl = useCallback(
    async (updatedAtUtc?: string | null): Promise<string> => {
      const res = await apiFetch(companyBrandingLogoUrl(updatedAtUtc));
      if (!res.ok) throw new Error("branding-logo-missing");
      const blob = await res.blob();
      if (!blob.size) throw new Error("branding-logo-empty");
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (!result) {
            reject(new Error("branding-logo-read-failed"));
            return;
          }
          resolve(result);
        };
        reader.onerror = () =>
          reject(reader.error ?? new Error("branding-logo-read-failed"));
        reader.readAsDataURL(blob);
      });
    },
    []
  );

  const onEmblemFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        identity.setEmblemDataUrl(result);
      };
      reader.readAsDataURL(file);
      e.currentTarget.value = "";
    },
    [identity]
  );

  const onUseBrandingEmblem = useCallback(async () => {
    identity.setBrandingLogoBusy(true);
    try {
      const dataUrl = await loadBrandingLogoAsDataUrl(new Date().toISOString());
      identity.setEmblemDataUrl(dataUrl);
    } catch {
      window.alert(t("reports.orderAccountStatementEmblemFetchError"));
    } finally {
      identity.setBrandingLogoBusy(false);
    }
  }, [identity, loadBrandingLogoAsDataUrl, t]);

  return {
    loadBrandingLogoAsDataUrl,
    onEmblemFileChange,
    onUseBrandingEmblem,
  };
}
