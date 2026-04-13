"use client";

import { useI18n } from "@/i18n/context";

type Tab = "financial" | "cash" | "stock";

const KEYS: Record<Tab, readonly string[]> = {
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

export function ReportsPatronTabStory({ tab }: { tab: Tab }) {
  const { t } = useI18n();
  const keys = KEYS[tab];
  return (
    <aside className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/95 to-white p-3 shadow-sm ring-1 ring-violet-100/50 sm:p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-violet-800/85">
        {t("reports.patronStoryBoxTitle")}
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-snug text-zinc-800">
        {keys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ol>
    </aside>
  );
}
