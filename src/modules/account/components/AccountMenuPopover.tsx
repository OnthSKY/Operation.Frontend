"use client";

import { useI18n } from "@/i18n/context";

type Props = {
  onProfile: () => void;
  onSecurity: () => void;
  onActivity: () => void;
  onSettings: () => void;
  onLogout: () => void;
};

const itemClass =
  "flex w-full min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 active:bg-zinc-200/80";

export function AccountMenuPopover({
  onProfile,
  onSecurity,
  onActivity,
  onSettings,
  onLogout,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      id="account-menu-popover"
      role="menu"
      className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] w-[min(calc(100vw-1.25rem),17rem)] rounded-2xl border border-zinc-200/95 bg-white py-2 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/[0.04]"
    >
      <button type="button" role="menuitem" className={itemClass} onClick={onProfile}>
        <MenuUserGlyph />
        {t("profile.menuProfile")}
      </button>
      <button type="button" role="menuitem" className={itemClass} onClick={onSecurity}>
        <MenuShieldGlyph />
        {t("profile.menuSecurity")}
      </button>
      <button type="button" role="menuitem" className={itemClass} onClick={onActivity}>
        <MenuListGlyph />
        {t("profile.menuActivity")}
      </button>
      <button type="button" role="menuitem" className={itemClass} onClick={onSettings}>
        <MenuSettingsGlyph />
        {t("profile.menuSettings")}
      </button>
      <div className="my-1 border-t border-zinc-100" role="separator" />
      <button
        type="button"
        role="menuitem"
        className={`${itemClass} text-red-700 hover:bg-red-50 active:bg-red-100/80`}
        onClick={onLogout}
      >
        <MenuLogoutGlyph />
        {t("auth.logout")}
      </button>
    </div>
  );
}

function MenuUserGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-zinc-500"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MenuShieldGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-zinc-500"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MenuListGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-zinc-500"
      aria-hidden
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MenuSettingsGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-zinc-500"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MenuLogoutGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
