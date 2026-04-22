"use client";

import { ApiError, apiFetch } from "@/lib/api/base-api";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import Link from "next/link";
import { useMemo, useState } from "react";

const REGISTER_ROLES = [
  "ADMIN",
  "STAFF",
  "PERSONNEL",
  "DRIVER",
  "VIEWER",
  "FINANCE",
  "PROCUREMENT",
] as const;

function isRegisterRole(v: string): v is (typeof REGISTER_ROLES)[number] {
  return (REGISTER_ROLES as readonly string[]).includes(v.trim().toUpperCase());
}

function LocaleToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1"
      role="group"
      aria-label={t("lang.label")}
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-h-9 min-w-10 rounded-lg px-2 text-sm font-semibold transition-colors ${
            locale === code ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:bg-white/80"
          }`}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}

export default function EmergencyAdminRegisterPage() {
  const { t } = useI18n();
  const [adminKey, setAdminKey] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<(typeof REGISTER_ROLES)[number]>("ADMIN");
  const [personnelId, setPersonnelId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const roleOptions = useMemo<SelectOption[]>(
    () => REGISTER_ROLES.map((r) => ({ value: r, label: r })),
    []
  );

  const inputClass =
    "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 sm:min-h-[3.25rem] sm:rounded-2xl sm:px-4 sm:text-[17px]";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!adminKey.trim() || !username.trim() || !password) {
      notify.error(t("auth.emergencyFillAll"));
      return;
    }
    if (password !== passwordConfirm) {
      notify.error(t("auth.emergencyPasswordMismatch"));
      return;
    }

    const body: Record<string, unknown> = {
      username: username.trim(),
      password,
      role,
    };
    if (fullName.trim()) body.fullName = fullName.trim();
    const pid = personnelId.trim();
    if (pid) {
      const n = Number(pid);
      if (!Number.isInteger(n) || n <= 0) {
        notify.error(t("auth.emergencyFailed"));
        return;
      }
      body.personnelId = n;
    }

    setPending(true);
    try {
      const res = await apiFetch("/auth/admin-register", {
        method: "POST",
        headers: { "x-admin-key": adminKey.trim() },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let parsed: { success?: boolean; message?: string } = {};
      if (text) {
        try {
          parsed = JSON.parse(text) as { success?: boolean; message?: string };
        } catch {
          /* ignore */
        }
      }
      if (!res.ok) {
        if (res.status === 401) notify.error(t("auth.emergencyInvalidKey"));
        else notify.error((parsed.message && String(parsed.message).trim()) || t("auth.emergencyFailed"));
        return;
      }
      if (parsed.success === false && parsed.message) {
        notify.error(parsed.message);
        return;
      }
      notify.success(parsed.message?.trim() || t("auth.emergencySuccess"));
      setAdminKey("");
      setPassword("");
      setPasswordConfirm("");
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 0 ? t("auth.networkError") : t("auth.emergencyFailed");
      notify.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-100 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 sm:px-5">
        <header className="flex items-center justify-end gap-3">
          <LocaleToggle />
        </header>

        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 shadow-sm sm:p-5">
          <h1 className="text-balance text-lg font-semibold text-amber-950 sm:text-xl">{t("auth.emergencyPageTitle")}</h1>
          <p className="mt-2 text-pretty text-xs leading-relaxed text-amber-950/90 sm:text-sm">
            {t("auth.emergencyPageIntro")}
          </p>
          <p className="mt-2 text-pretty text-xs text-amber-900/85 sm:text-sm">{t("auth.emergencyUpdateHint")}</p>
        </div>

        <form
          id="emergency-admin-form"
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-lg shadow-zinc-900/[0.04] sm:gap-5 sm:p-6"
          onSubmit={onSubmit}
        >
          <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 sm:gap-5" disabled={pending}>
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-zinc-900">{t("auth.emergencyPageTitle")}</h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-admin-key" className="text-sm font-medium text-zinc-800">
                {t("auth.emergencyAdminKey")}
                <span className="ml-0.5 text-red-600" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="reg-admin-key"
                name="adminRegisterKey"
                type="password"
                autoComplete="off"
                className={inputClass}
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-user" className="text-sm font-medium text-zinc-800">
                {t("auth.emergencyUsername")}
                <span className="ml-0.5 text-red-600" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="reg-user"
                name="username"
                autoComplete="username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            </section>

            <details className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Opsiyonel alanlar
              </summary>
              <div className="mt-3 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-fullname" className="text-sm font-medium text-zinc-800">
                    {t("auth.emergencyFullNameOptional")}
                  </label>
                  <input
                    id="reg-fullname"
                    name="fullName"
                    autoComplete="name"
                    className={inputClass}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-personnel" className="text-sm font-medium text-zinc-800">
                    {t("auth.emergencyPersonnelIdOptional")}
                  </label>
                  <input
                    id="reg-personnel"
                    name="personnelId"
                    inputMode="numeric"
                    autoComplete="off"
                    className={inputClass}
                    value={personnelId}
                    onChange={(e) => setPersonnelId(e.target.value.replace(/\D/g, ""))}
                    placeholder="123"
                  />
                </div>
              </div>
            </details>

            <div className="flex flex-col gap-1.5">
              <Select
                id="reg-role"
                label={t("auth.emergencyRole")}
                name="role"
                options={roleOptions}
                value={role}
                onChange={(e) => {
                  const v = e.target.value.trim().toUpperCase();
                  if (isRegisterRole(v)) setRole(v);
                }}
                onBlur={() => {}}
                disabled={pending}
                menuZIndex={200}
                className="rounded-xl border-zinc-200 sm:min-h-[3.25rem] sm:rounded-2xl sm:text-[17px] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-xs leading-relaxed text-zinc-500">{t("auth.emergencyRoleHint")}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-personnel" className="text-sm font-medium text-zinc-800">
                {t("auth.emergencyPersonnelIdOptional")}
              </label>
              <input
                id="reg-personnel"
                name="personnelId"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                value={personnelId}
                onChange={(e) => setPersonnelId(e.target.value.replace(/\D/g, ""))}
                placeholder="123"
              />
            </div>

            <section className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-pass" className="text-sm font-medium text-zinc-800">
                {t("auth.emergencyPassword")}
                <span className="ml-0.5 text-red-600" aria-hidden>
                  *
                </span>
              </label>
              <div className="relative">
                <input
                  id="reg-pass"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} py-2 pl-3.5 pr-12 sm:pl-4 sm:pr-14`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-zinc-500 hover:bg-zinc-100 sm:min-w-[3.25rem] sm:rounded-r-2xl"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-pass2" className="text-sm font-medium text-zinc-800">
                {t("auth.emergencyPasswordConfirm")}
                <span className="ml-0.5 text-red-600" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="reg-pass2"
                name="passwordConfirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={inputClass}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            </section>
          </fieldset>
        </form>

        <p className="text-center text-xs text-zinc-500">{t("auth.emergencyWarning")}</p>

        <div className="flex justify-center pb-4">
          <Link
            href="/login"
            className="min-h-11 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 underline-offset-4 hover:underline"
          >
            {t("auth.emergencyBackToLogin")}
          </Link>
        </div>
      </div>
      <StickyActionBar>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
          >
            {t("common.cancel")}
          </Link>
          <Button
            type="submit"
            form="emergency-admin-form"
            className="min-h-11 w-full rounded-xl text-sm font-semibold"
          >
            {pending ? t("auth.emergencySubmitting") : t("auth.emergencySubmit")}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}
