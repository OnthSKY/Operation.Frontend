"use client";

import { useI18n } from "@/i18n/context";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";

export type ReportsPatronHubTab = "financial" | "cash" | "stock";

export const PATRON_TAB_STORY_KEYS: Record<ReportsPatronHubTab, readonly string[]> = {
  financial: [
    "reports.patronStoryFin1",
    "reports.patronStoryFin2",
    "reports.patronStoryFin3",
    "reports.patronStoryFin4",
  ],
  cash: [
    "reports.patronStoryCash1",
    "reports.patronStoryCash2",
    "reports.patronStoryCash3",
    "reports.patronStoryCash4",
  ],
  stock: [
    "reports.patronStoryStock1",
    "reports.patronStoryStock2",
    "reports.patronStoryStock3",
    "reports.patronStoryStock4",
  ],
};

/** Patron «bakış sırası» metnini (i) ile modalda gösterir. */
export function ReportsPatronStoryInfoButton({ tab }: { tab: ReportsPatronHubTab }) {
  const { t } = useI18n();
  return (
    <PageWhenToUseInfoButton
      className="shrink-0 self-start"
      ariaLabel={t("reports.patronStoryInfoAria")}
      helpTitle={t("reports.patronStoryBoxTitle")}
      listVariant="ordered"
      items={PATRON_TAB_STORY_KEYS[tab].map((key) => ({ text: t(key) }))}
    />
  );
}
