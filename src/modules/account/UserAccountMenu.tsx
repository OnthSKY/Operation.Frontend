"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountRemoteData } from "@/modules/account/hooks/useAccountRemoteData";
import { useTotpSetupActions } from "@/modules/account/hooks/useTotpSetupActions";
import type { AccountMenuSection } from "@/modules/account/types";
import { AccountActivityPanel } from "@/modules/account/components/AccountActivityPanel";
import { AccountMenuPopover } from "@/modules/account/components/AccountMenuPopover";
import { AccountPanelShell } from "@/modules/account/components/AccountPanelShell";
import { AccountProfilePanel } from "@/modules/account/components/AccountProfilePanel";
import { AccountSecurityPanel } from "@/modules/account/components/AccountSecurityPanel";
import { AccountSettingsPanel } from "@/modules/account/components/AccountSettingsPanel";
import { useI18n } from "@/i18n/context";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  triggerLabel: string;
};

export function UserAccountMenu({ triggerLabel }: Props) {
  const { t } = useI18n();
  const { user, refreshMe, logout } = useAuth();
  const menuRootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [section, setSection] = useState<AccountMenuSection>("profile");

  const { status, audit, loading, refreshAll, refreshTotp } = useAccountRemoteData(user);
  const totp = useTotpSetupActions({ refreshTotp, refreshMe });

  const openPanel = useCallback((s: AccountMenuSection) => {
    setSection(s);
    setMenuOpen(false);
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    void refreshAll();
  }, [panelOpen, refreshAll]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRootRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!user) return null;

  const showSetup =
    status != null &&
    !status.enabled &&
    status.pendingSetup &&
    Boolean(status.setupOtpAuthUri);

  const sectionBody =
    section === "profile" ? (
      <AccountProfilePanel user={user} />
    ) : section === "security" ? (
      <AccountSecurityPanel
        loading={loading}
        status={status}
        showSetup={showSetup}
        totpBusy={totp.busy}
        confirmCode={totp.confirmCode}
        onConfirmCodeChange={totp.setConfirmCode}
        disablePassword={totp.disablePassword}
        onDisablePasswordChange={totp.setDisablePassword}
        disableCode={totp.disableCode}
        onDisableCodeChange={totp.setDisableCode}
        onStartSetup={() => void totp.startSetup()}
        onConfirmSetup={totp.confirmSetup}
        onCancelSetup={() => void totp.cancelSetup()}
        onDisableTotp={totp.disableTotp}
      />
    ) : section === "settings" ? (
      <AccountSettingsPanel />
    ) : (
      <AccountActivityPanel loading={loading} rows={audit} />
    );

  return (
    <>
      <div className="relative" ref={menuRootRef}>
        <button
          type="button"
          className="flex min-w-0 max-w-[12rem] items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left transition hover:bg-zinc-100 md:max-w-[18rem]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="account-menu-popover"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white"
            aria-hidden
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wide text-zinc-900">
            {triggerLabel}
          </span>
          <span className="sr-only">{t("profile.menuOpen")}</span>
        </button>

        {menuOpen ? (
          <AccountMenuPopover
            onProfile={() => openPanel("profile")}
            onSecurity={() => openPanel("security")}
            onActivity={() => openPanel("activity")}
            onSettings={() => openPanel("settings")}
            onLogout={() => {
              setMenuOpen(false);
              void logout();
            }}
          />
        ) : null}
      </div>

      <AccountPanelShell
        open={panelOpen}
        section={section}
        onClose={() => setPanelOpen(false)}
        onSectionChange={setSection}
      >
        {sectionBody}
      </AccountPanelShell>
    </>
  );
}

/** Geriye dönük isim. */
export { UserAccountMenu as UserAccountDropdown };
