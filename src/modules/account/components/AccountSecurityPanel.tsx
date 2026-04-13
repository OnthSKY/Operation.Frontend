"use client";

import type { TotpStatusPayload } from "@/lib/auth/types";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import QRCode from "react-qr-code";
import type { FormEvent } from "react";

type Props = {
  loading: boolean;
  status: TotpStatusPayload | null;
  showSetup: boolean;
  totpBusy: boolean;
  confirmCode: string;
  onConfirmCodeChange: (v: string) => void;
  disablePassword: string;
  onDisablePasswordChange: (v: string) => void;
  disableCode: string;
  onDisableCodeChange: (v: string) => void;
  onStartSetup: () => void;
  onConfirmSetup: (e: FormEvent) => void;
  onCancelSetup: () => void;
  onDisableTotp: (e: FormEvent) => void;
};

export function AccountSecurityPanel({
  loading,
  status,
  showSetup,
  totpBusy,
  confirmCode,
  onConfirmCodeChange,
  disablePassword,
  onDisablePasswordChange,
  disableCode,
  onDisableCodeChange,
  onStartSetup,
  onConfirmSetup,
  onCancelSetup,
  onDisableTotp,
}: Props) {
  const { t } = useI18n();

  if (loading || !status) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{t("common.loading")}</p>
    );
  }

  return (
    <section aria-labelledby="account-security-heading" className="space-y-4">
      <div>
        <h3 id="account-security-heading" className="text-base font-semibold text-zinc-900">
          {t("profile.totpTitle")}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {t("profile.totpDescription")}
        </p>
        <p className="mt-2 text-sm font-medium text-zinc-800">
          {status.enabled ? t("profile.totpEnabled") : t("profile.totpDisabled")}
        </p>
      </div>

      {!status.enabled && !showSetup ? (
        <Button
          type="button"
          className="min-h-12 w-full !rounded-xl !text-sm"
          onClick={onStartSetup}
          disabled={totpBusy}
        >
          {t("profile.totpStart")}
        </Button>
      ) : null}

      {!status.enabled && showSetup ? (
        <div className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
          <p className="text-sm text-zinc-700">{t("profile.totpScan")}</p>
          <div className="flex justify-center rounded-xl bg-white p-4 ring-1 ring-zinc-100">
            <QRCode value={status.setupOtpAuthUri!} size={200} level="M" />
          </div>
          {status.setupSecretBase32 ? (
            <div className="rounded-xl bg-white p-3 text-xs text-zinc-700 ring-1 ring-zinc-100">
              <p className="font-medium text-zinc-900">{t("profile.totpSecretLabel")}</p>
              <p className="mt-2 break-all font-mono">{status.setupSecretBase32}</p>
            </div>
          ) : null}
          <form className="flex flex-col gap-3" onSubmit={onConfirmSetup}>
            <label className="text-sm font-medium text-zinc-800">
              {t("profile.totpConfirmCode")}
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 font-mono text-base text-zinc-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={confirmCode}
                onChange={(e) => onConfirmCodeChange(e.target.value)}
                maxLength={12}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="min-h-12 flex-1 !rounded-xl" disabled={totpBusy}>
                {t("profile.totpConfirm")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 flex-1 !rounded-xl"
                disabled={totpBusy}
                onClick={onCancelSetup}
              >
                {t("profile.totpCancelSetup")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {status.enabled ? (
        <form
          className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4"
          onSubmit={onDisableTotp}
        >
          <p className="text-sm text-zinc-700">{t("profile.totpDisableHint")}</p>
          <label className="text-sm font-medium text-zinc-800">
            {t("profile.password")}
            <input
              type="password"
              autoComplete="current-password"
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
              value={disablePassword}
              onChange={(e) => onDisablePasswordChange(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            {t("profile.totpConfirmCode")}
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 font-mono text-base text-zinc-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={disableCode}
              onChange={(e) => onDisableCodeChange(e.target.value)}
              maxLength={12}
            />
          </label>
          <Button type="submit" variant="secondary" className="min-h-12 w-full !rounded-xl" disabled={totpBusy}>
            {t("profile.totpDisable")}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
