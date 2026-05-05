"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { MobileIntroSummaryCollapse } from "@/shared/components/MobileIntroSummaryCollapse";
import { PageContentSection } from "@/shared/components/PageContentSection";
import { useId, type ReactNode } from "react";

type Props = {
  intro: ReactNode;
  /** Özet / üst bilgi — verilmezse bölüm çizilmez */
  summary?: ReactNode;
  /**
   * Mobil ana kaydırma içinde üstte sabitlenen araç çubuğu (filtre ikonu, özet şeridi vb.).
   * Küçük ekranda kaydırırken erişilebilir kalsın diye `max-sm:sticky` sarmalayıcıda verilir.
   */
  mobileToolbar?: ReactNode;
  main: ReactNode;
  /** Dış sarmalayıcı (padding, gap) */
  className?: string;
  /** Bölümlerin üstünde (örn. geri linki) */
  top?: ReactNode;
  variant?: "dashboard" | "report" | "form";
  /** Ana içerik bölgesinin `aria-label` metni (varsayılan: «Kayıtlar» / Records). */
  mainSectionAriaLabel?: string;
};

/**
 * Liste / detay ekranlarında Giriş → (Özet) → Kayıtlar bölümlendirmesi.
 */
export function PageScreenScaffold({
  intro,
  summary,
  mobileToolbar,
  main,
  className,
  top,
  variant = "report",
  mainSectionAriaLabel,
}: Props) {
  const { t } = useI18n();
  const rid = useId().replace(/:/g, "");

  const introSection = (
    <PageContentSection
      variant="intro"
      eyebrow={t("common.pageSectionIntro")}
      sectionLabelId={`page-intro-${rid}`}
    >
      {intro}
    </PageContentSection>
  );

  const summarySection =
    summary != null ? (
      <PageContentSection
        variant="surface"
        eyebrow={t("common.pageSectionSummary")}
        sectionLabelId={`page-summary-${rid}`}
      >
        {summary}
      </PageContentSection>
    ) : null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-6",
        variant === "dashboard" && "w-full px-4 sm:px-6",
        variant === "report" && "w-full px-4 sm:px-6",
        variant === "form" && "w-full px-4 sm:px-6",
        className
      )}
    >
      {top}
      <MobileIntroSummaryCollapse intro={introSection} summary={summarySection} />
      <PageContentSection
        variant="plain"
        sectionAriaLabel={mainSectionAriaLabel ?? t("common.pageSectionMain")}
        sectionLabelId={`page-main-${rid}`}
        mobileFrame="flush"
      >
        {mobileToolbar != null ? (
          <div className="mobile-toolbar-sticky max-sm:mx-0 border-b border-zinc-200/70 bg-white/95 py-2.5 max-sm:px-0 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            {mobileToolbar}
          </div>
        ) : null}
        {main}
      </PageContentSection>
    </div>
  );
}
