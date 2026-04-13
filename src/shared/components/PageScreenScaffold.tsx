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
  main: ReactNode;
  /** Dış sarmalayıcı (padding, gap) */
  className?: string;
  /** Bölümlerin üstünde (örn. geri linki) */
  top?: ReactNode;
};

/**
 * Liste / detay ekranlarında Giriş → (Özet) → Kayıtlar bölümlendirmesi.
 */
export function PageScreenScaffold({ intro, summary, main, className, top }: Props) {
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
        "mx-auto flex w-full min-w-0 max-w-full flex-col gap-6 app-page-max",
        className
      )}
    >
      {top}
      <MobileIntroSummaryCollapse intro={introSection} summary={summarySection} />
      <PageContentSection
        variant="plain"
        eyebrow={t("common.pageSectionMain")}
        sectionLabelId={`page-main-${rid}`}
      >
        {main}
      </PageContentSection>
    </div>
  );
}
