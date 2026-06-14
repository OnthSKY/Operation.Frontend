"use client";

import { useI18n } from "@/i18n/context";
import { OasStepVisualBadge } from "@/modules/order-account-statement/components/oas-ui";

/**
 * Sayfanın üst başlık kartı (logo rozet + başlık + alt yazı). Saf sunum, state yok.
 */
export function OasPageHeader() {
  const { t } = useI18n();
  return (
    <header className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/[0.035] sm:mb-6 sm:px-6 sm:py-5">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <OasStepVisualBadge tone="indigo" icon="header" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-zinc-950 sm:text-xl">
            {t("reports.orderAccountStatementTitle")}
          </h1>
          <p className="mt-2 border-t border-zinc-100 pt-2 text-sm leading-relaxed text-zinc-600">
            {t("reports.orderAccountStatementSubtitle")}
          </p>
        </div>
      </div>
    </header>
  );
}
