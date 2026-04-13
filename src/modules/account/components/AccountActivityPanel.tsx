"use client";

import type { MyAuditLogItem } from "@/lib/auth/types";
import { useI18n } from "@/i18n/context";

type Props = {
  loading: boolean;
  rows: MyAuditLogItem[] | null;
};

export function AccountActivityPanel({ loading, rows }: Props) {
  const { t, locale } = useI18n();
  const localeTag = locale === "tr" ? "tr-TR" : "en-US";

  if (loading || rows === null) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{t("common.loading")}</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{t("profile.auditEmpty")}</p>
    );
  }

  return (
    <section aria-labelledby="account-activity-heading" className="space-y-3">
      <h3 id="account-activity-heading" className="text-sm font-semibold text-zinc-900">
        {t("profile.sectionActivity")}
      </h3>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-2xl border border-zinc-100 bg-zinc-50/90 px-4 py-3 text-sm leading-snug text-zinc-700 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="font-mono text-xs font-semibold text-zinc-900">
                {row.tableName}
              </span>
              <time
                className="shrink-0 text-xs text-zinc-500"
                dateTime={row.createdAt}
              >
                {new Date(row.createdAt).toLocaleString(localeTag, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              <span className="text-zinc-500">{t("profile.auditAction")}:</span>{" "}
              {row.action}
              <span className="mx-1 text-zinc-300">·</span>
              <span className="text-zinc-500">{t("profile.auditRecord")}</span>{" "}
              {row.recordId}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
