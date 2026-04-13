"use client";

import { useI18n } from "@/i18n/context";
import { PageContentSection } from "@/shared/components/PageContentSection";
import Link from "next/link";
import { useId, type ReactNode } from "react";

export function ReportTablesPageShell({
  title,
  subtitle,
  pageGuide,
  children,
}: {
  title: string;
  subtitle: string;
  /** «Bu sayfada ne yapabilirim?» vb. — başlık altında, filtrelerden önce */
  pageGuide?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const rid = useId().replace(/:/g, "");
  return (
    <div className="mx-auto flex w-full min-w-0 flex-col gap-6 app-page-max pb-6 pt-2 sm:pb-8 sm:pt-4 md:pt-0">
      <Link
        href="/reports/financial"
        className="w-fit text-sm font-semibold text-violet-700 hover:underline touch-manipulation"
      >
        ← {t("reports.navBackToReportsHub")}
      </Link>
      <PageContentSection
        variant="intro"
        eyebrow={t("common.pageSectionIntro")}
        sectionLabelId={`report-intro-${rid}`}
      >
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {title}
          </h1>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
            {subtitle}
          </p>
        </div>
        {pageGuide}
      </PageContentSection>
      <PageContentSection
        variant="plain"
        eyebrow={t("common.pageSectionMain")}
        sectionLabelId={`report-main-${rid}`}
      >
        {children}
      </PageContentSection>
    </div>
  );
}
