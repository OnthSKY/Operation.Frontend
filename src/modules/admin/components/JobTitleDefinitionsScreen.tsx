"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { useJobTitleDefinitionsQuery } from "@/modules/admin/hooks/useJobTitleDefinitionsQuery";
import { useI18n } from "@/i18n/context";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { JobTitleDefinition } from "@/types/job-title-definition";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function JobTitleDefinitionsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const canView = hasPermissionCode(user, PERM.systemAdmin);
  const { data = [], isPending, isError, error, refetch } = useJobTitleDefinitionsQuery(canView);

  useEffect(() => {
    if (isReady && user && !canView) router.replace("/personnel");
  }, [isReady, user, canView, router]);

  const name = (row: JobTitleDefinition) => (locale === "tr" ? row.nameTr : row.nameEn);

  if (!isReady || !user || !canView) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <PageScreenScaffold
      variant="form"
      className="w-full pt-2 sm:pt-4"
      top={
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
        >
          ← {t("settings.backToSettings")}
        </Link>
      }
      intro={
        <div className="min-w-0">
          <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
            {t("settings.jobTitleDefsPageTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            {t("settings.jobTitleDefsPageDescription")}
          </p>
        </div>
      }
      main={
        isPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
            <p className="break-words leading-relaxed">{toErrorMessage(error)}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold underline"
              onClick={() => void refetch()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("settings.jobTitleDefsEmpty")}</p>
        ) : (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-800">
                {t("settings.jobTitleDefsPageTitle")}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums">
                {data.length}
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {data.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">{name(row)}</span>
                      {row.isSystem ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                          {t("settings.jobTitleDefsBadgeSystem")}
                        </span>
                      ) : null}
                      {!row.isActive ? (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                          {t("settings.jobTitleDefsBadgeInactive")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <code className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                    {row.code}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        )
      }
    />
  );
}
