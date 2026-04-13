"use client";

import type { AccountMenuSection } from "@/modules/account/types";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";

type Props = {
  active: AccountMenuSection;
  onChange: (s: AccountMenuSection) => void;
};

const tabs: { id: AccountMenuSection; labelKey: string }[] = [
  { id: "profile", labelKey: "profile.menuProfile" },
  { id: "security", labelKey: "profile.menuSecurity" },
  { id: "activity", labelKey: "profile.menuActivity" },
  { id: "settings", labelKey: "profile.menuSettings" },
];

export function AccountPanelTabs({ active, onChange }: Props) {
  const { t } = useI18n();

  return (
    <div
      className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto overflow-y-hidden pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t("profile.panelTabsAria")}
    >
      {tabs.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={cn(
            "shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition min-h-11 sm:min-h-10",
            active === id
              ? "bg-zinc-900 text-white shadow-md"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/90 hover:text-zinc-900"
          )}
          onClick={() => onChange(id)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
