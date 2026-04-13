"use client";

import { useI18n } from "@/i18n/context";
import Link from "next/link";
import type { ReactNode } from "react";

export function ReportTablesPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full min-w-0 app-page-max flex-col gap-4 pb-6 pt-2 sm:gap-6 sm:pt-4 sm:pb-8 md:pt-0">
      <Link
        href="/reports"
        className="w-fit text-sm font-semibold text-violet-700 hover:underline touch-manipulation"
      >
        ← {t("reports.navBackToReportsHub")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {title}
        </h1>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}
