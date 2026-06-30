"use client";

import { useEffect, type MutableRefObject } from "react";
import { useI18n } from "@/i18n/context";
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
  const { t } = useI18n();
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
          // Belge başlığı firma adı OLMAMALI (PDF'te firma adı zaten büyük başlıkta;
          // ikisi aynı olursa "Tekin Usta Dondurma" iki kez yazılır). Belge türü başlığı kullan.
          if (!identity.documentTitle.trim())
            identity.setDocumentTitle(t("reports.orderAccountStatementDefaultDocumentTitle"));
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
