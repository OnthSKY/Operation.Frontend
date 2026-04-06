"use client";

import { useI18n } from "@/i18n/context";
import { localeDateDisplayExample } from "@/shared/lib/locale-date";

export function DateDisplayFormatHint({ className = "" }: { className?: string }) {
  const { t, locale } = useI18n();
  const example = localeDateDisplayExample(locale);
  const text = t("common.dateDisplayHint").replace("{{example}}", example);
  return (
    <p
      role="note"
      className={`text-[11px] leading-snug text-zinc-500 sm:text-xs ${className}`.trim()}
    >
      {text}
    </p>
  );
}
