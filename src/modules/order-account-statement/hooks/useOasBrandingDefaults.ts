"use client";

import { useEffect, type MutableRefObject } from "react";
import { fetchSystemBranding } from "@/modules/admin/api/system-branding-api";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";

/**
 * İlk render'da sistem branding'ini çek ve identity defaults'larına uygula
 * (defaultCompanyName, defaultEmblemDataUrl). Kullanıcı henüz alanları
 * doldurmadıysa default değerleri canlı alanlara da yansıtır.
 *
 * SRP: yalnızca branding boot-strap. Bir kez koşar (ref guard).
 */
type Params = {
  identity: ReturnType<typeof useOasIdentity>;
  loadBrandingLogoAsDataUrl: (updatedAtUtc?: string | null) => Promise<string>;
  loadedRef: MutableRefObject<boolean>;
};

export function useOasBrandingDefaults({ identity, loadBrandingLogoAsDataUrl, loadedRef }: Params) {
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let alive = true;
    void fetchSystemBranding()
      .then(async (branding) => {
        if (!alive) return;
        const brandingCompany = branding.companyName?.trim() || "";
        if (brandingCompany) {
          identity.setDefaultCompanyName(brandingCompany);
          if (!identity.companyName.trim()) identity.setCompanyName(brandingCompany);
          if (!identity.documentTitle.trim()) identity.setDocumentTitle(brandingCompany);
        }
        if (branding.hasLogo) {
          try {
            const dataUrl = await loadBrandingLogoAsDataUrl(branding.updatedAtUtc);
            if (!alive) return;
            identity.setDefaultEmblemDataUrl(dataUrl);
            const isUsingDefaultOrEmpty =
              !identity.emblemDataUrl || identity.emblemDataUrl === identity.defaultEmblemDataUrl;
            if (isUsingDefaultOrEmpty) identity.setEmblemDataUrl(dataUrl);
          } catch {
            // Branding logo yoksa sessiz geç; kullanıcı manuel seçebilir.
          }
        }
      })
      .catch(() => {
        // Branding varsayılanı alınamazsa sayfa normal kullanımına devam eder.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBrandingLogoAsDataUrl]);
}
