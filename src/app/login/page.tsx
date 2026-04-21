"use client";

import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { postLoginHomePath } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { notify } from "@/shared/lib/notify";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOGIN_TOTP_MODAL_TITLE_ID = "login-totp-modal-title";

const gridSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23ffffff' fill-opacity='0.06' d='M0 0h32v32H0z'/%3E%3Cpath stroke='%23ffffff' stroke-opacity='0.07' d='M0 .5h32M.5 0v32'/%3E%3C/svg%3E\")";

const gridSvgLight =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath stroke='%236366f1' stroke-opacity='0.07' d='M0 .5h40M.5 0v40'/%3E%3C/svg%3E\")";

function LoginLocaleToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md lg:border-zinc-200 lg:bg-zinc-50"
      role="group"
      aria-label={t("lang.label")}
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-h-9 min-w-10 rounded-lg px-2 text-sm font-semibold transition-colors ${
            locale === code
              ? "bg-white text-zinc-900 shadow-sm lg:bg-white"
              : "text-white/90 hover:bg-white/10 lg:text-zinc-600 lg:hover:bg-white/80"
          }`}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}

function CheckIcon({ className = "text-indigo-300" }: { className?: string }) {
  return (
    <svg
      className={`mt-0.5 h-5 w-5 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TotpDialogIcon() {
  return (
    <div
      className="mx-auto flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/35 ring-4 ring-indigo-500/[0.12] sm:h-14 sm:w-14 sm:ring-[6px]"
      aria-hidden
    >
      <svg
        className="h-7 w-7 sm:h-8 sm:w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady, login, completeTotpLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pending, setPending] = useState(false);
  const [totpChallengeToken, setTotpChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const totpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isReady && user) router.replace(postLoginHomePath(user));
  }, [isReady, user, router]);

  useEffect(() => {
    if (!totpChallengeToken) return;
    const id = window.requestAnimationFrame(() => totpInputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [totpChallengeToken]);

  function closeTotpModal() {
    setTotpChallengeToken(null);
    setTotpCode("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await login(username.trim(), password, rememberMe);
      if (res.requiresTotp && res.totpChallengeToken) {
        setTotpChallengeToken(res.totpChallengeToken);
        setTotpCode("");
        return;
      }
      if (res.user) {
        router.replace(postLoginHomePath(res.user));
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 0
            ? t("auth.networkError")
            : err.message || t("auth.loginFailed")
          : t("auth.loginFailed");
      notify.error(message);
    } finally {
      setPending(false);
    }
  }

  async function onTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !totpChallengeToken) return;
    setPending(true);
    try {
      await completeTotpLogin(totpChallengeToken, totpCode, rememberMe);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 0
            ? t("auth.networkError")
            : err.message || t("auth.totpFailed")
          : t("auth.totpFailed");
      notify.error(message);
    } finally {
      setPending(false);
    }
  }

  const loadingBlock = (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-100">
      <div className="flex flex-col items-center gap-4 px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800"
          aria-hidden
        />
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      </div>
    </div>
  );

  if (!isReady) return loadingBlock;
  if (user) return loadingBlock;

  const features = [t("auth.feature1"), t("auth.feature2"), t("auth.feature3")];

  return (
    <div className="flex min-h-[100svh] flex-col bg-zinc-100 lg:min-h-[100dvh] lg:flex-row lg:bg-zinc-50">
      <header className="absolute right-[max(1rem,env(safe-area-inset-right,0px))] top-[max(1rem,env(safe-area-inset-top,0px))] z-20 lg:right-8 lg:top-8 xl:right-10 xl:top-10 2xl:right-12 2xl:top-12">
        <LoginLocaleToggle />
      </header>

      <aside className="relative order-1 flex min-h-[min(38svh,340px)] shrink-0 flex-col justify-end overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 pb-7 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pt-[max(4.75rem,calc(env(safe-area-inset-top,0px)+3rem))] text-white sm:min-h-[min(40svh,380px)] sm:pb-8 sm:pl-8 sm:pr-8 sm:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3rem))] lg:order-none lg:min-h-0 lg:w-[min(44%,520px)] lg:flex-none lg:justify-center lg:px-12 lg:pb-16 lg:pt-12 xl:w-[min(48%,640px)] xl:px-14 xl:pb-20 xl:pt-16 2xl:w-[min(44%,720px)] 2xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{ backgroundImage: `${gridSvg}` }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/35 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-lg max-lg:pr-8 xl:max-w-xl 2xl:max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-indigo-200/90 sm:text-xs xl:text-[0.8125rem]">
            Operations
          </p>
          <h2 className="mt-2.5 text-balance text-[1.375rem] font-bold leading-snug tracking-tight sm:mt-3 sm:text-2xl sm:leading-tight md:text-3xl lg:text-4xl xl:text-5xl xl:leading-[1.08] 2xl:text-[3.25rem]">
            {t("auth.brandHeadline")}
          </h2>
          <p className="mt-2.5 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-slate-300 sm:mt-3 sm:text-sm md:text-base xl:mt-4 xl:max-w-lg xl:text-lg xl:leading-relaxed">
            {t("auth.brandTagline")}
          </p>
          <ul className="mt-8 hidden space-y-3 text-sm text-slate-300 lg:block xl:mt-10 xl:space-y-4 xl:text-[15px]">
            {features.map((line) => (
              <li key={line} className="flex gap-3">
                <CheckIcon />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative order-2 flex flex-1 flex-col items-stretch justify-center overflow-hidden px-0 pb-0 pt-0 max-lg:flex-1 sm:px-0 lg:px-10 lg:py-16 lg:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] xl:px-16 2xl:px-20">
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-indigo-50/50" />
          <div className="absolute -right-[20%] top-[-10%] h-[min(70vh,520px)] w-[min(55vw,640px)] rounded-full bg-indigo-400/[0.09] blur-3xl" />
          <div className="absolute bottom-[-15%] left-[-5%] h-[min(55vh,420px)] w-[min(45vw,480px)] rounded-full bg-violet-400/[0.07] blur-3xl" />
          <div
            className="absolute inset-0 opacity-90"
            style={{ backgroundImage: `${gridSvgLight}` }}
          />
        </div>

        <div className="relative flex w-full max-lg:max-w-none flex-1 flex-col justify-start max-lg:min-h-0 lg:max-w-lg lg:justify-center xl:max-w-2xl 2xl:max-w-3xl">
          <div className="-mt-4 flex flex-col border-x-0 border-t border-zinc-200/90 bg-white px-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] pt-7 shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.1)] max-lg:flex-1 max-lg:rounded-b-none max-lg:rounded-t-[1.625rem] max-lg:border-b-0 sm:-mt-5 sm:px-6 sm:pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:pt-8 lg:mt-0 lg:rounded-2xl lg:border lg:border-zinc-200/80 lg:p-10 lg:shadow-2xl lg:shadow-indigo-950/[0.06] xl:rounded-3xl xl:border-white/70 xl:bg-white/75 xl:p-12 xl:shadow-[0_24px_80px_-12px_rgba(15,23,42,0.12)] xl:ring-1 xl:ring-zinc-900/[0.04] xl:backdrop-blur-xl 2xl:p-14 supports-[backdrop-filter]:xl:bg-white/65">
            <h1 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-2xl lg:text-[1.75rem] xl:text-4xl">{t("auth.title")}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 sm:mt-2 sm:text-[15px] lg:mt-3 lg:text-base xl:text-lg">{t("auth.subtitle")}</p>

            <ul className="mt-5 space-y-3 border-t border-zinc-100 pt-5 text-[0.9375rem] leading-snug text-zinc-600 sm:mt-6 sm:space-y-2.5 sm:pt-6 sm:text-sm lg:hidden">
              {features.map((line) => (
                <li key={line} className="flex gap-3 sm:gap-2.5">
                  <CheckIcon className="text-indigo-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <form className="mt-6 flex flex-col gap-5 sm:mt-8 lg:mt-10 lg:gap-6" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <label htmlFor="login-user" className="text-sm font-medium text-zinc-700 lg:text-base">
                  {t("auth.username")}
                  <span className="ml-0.5 text-red-600" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="login-user"
                  name="username"
                  autoComplete="username"
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 text-base text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-indigo-500/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 lg:min-h-14 lg:rounded-2xl lg:px-4 lg:text-lg"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={!!totpChallengeToken}
                />
              </div>
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <label htmlFor="login-pass" className="text-sm font-medium text-zinc-700 lg:text-base">
                  {t("auth.password")}
                  <span className="ml-0.5 text-red-600" aria-hidden>
                    *
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="login-pass"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-3.5 pr-12 text-base text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-indigo-500/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 lg:min-h-14 lg:rounded-2xl lg:pl-4 lg:pr-14 lg:text-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!!totpChallengeToken}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50 lg:min-w-[3.25rem] lg:rounded-r-2xl"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    aria-pressed={showPassword}
                    disabled={!!totpChallengeToken}
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <label
                className={`group flex cursor-pointer select-none items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-gradient-to-r from-zinc-50/90 to-white/80 px-4 py-3.5 shadow-sm shadow-zinc-900/[0.04] outline-none ring-indigo-500/0 transition-[border-color,box-shadow,background-color] hover:border-indigo-200/60 hover:shadow-md hover:shadow-indigo-500/[0.06] has-[:focus-visible]:border-indigo-300/80 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/35 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white lg:rounded-[1.125rem] lg:px-5 lg:py-4 ${
                  totpChallengeToken ? "pointer-events-none opacity-45" : ""
                }`}
              >
                <div className="min-w-0 flex-1 pr-1">
                  <span className="block text-[0.9375rem] font-medium leading-snug text-zinc-800 lg:text-base">
                    {t("auth.rememberMe")}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500 lg:text-[0.8125rem]">
                    {t("auth.rememberMeHint")}
                  </span>
                </div>
                <span className="relative inline-flex h-8 w-[3.125rem] shrink-0 items-center self-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    role="switch"
                    aria-checked={rememberMe}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={!!totpChallengeToken}
                    className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
                  />
                  <span
                    className="pointer-events-none block h-full w-full rounded-full bg-zinc-200/95 shadow-inner transition-colors duration-200 ease-out peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-violet-600 peer-disabled:opacity-60"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-zinc-900/[0.06] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-checked:translate-x-[1.125rem] peer-checked:shadow-lg peer-checked:ring-indigo-500/10"
                    aria-hidden
                  />
                </span>
              </label>
              <Button
                type="submit"
                className="mt-1 min-h-12 w-full !rounded-xl text-base sm:!w-full lg:!min-h-14 lg:!rounded-2xl lg:!text-lg"
                disabled={pending || !!totpChallengeToken}
              >
                {pending ? t("auth.signingIn") : t("auth.submit")}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Modal
        open={!!totpChallengeToken}
        onClose={closeTotpModal}
        titleId={LOGIN_TOTP_MODAL_TITLE_ID}
        title={t("auth.totpTitle")}
        description={t("auth.totpSubtitle")}
        closeButtonLabel={t("common.close")}
        narrow
        backdropClassName="bg-zinc-950/60 backdrop-blur-sm sm:bg-black/40 sm:backdrop-blur-none"
        className="border-indigo-100/60 bg-white/[0.98] supports-[backdrop-filter]:backdrop-blur-md"
      >
        <form className="mt-5 flex flex-col gap-5 sm:mt-6" onSubmit={onTotpSubmit}>
          <TotpDialogIcon />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-totp"
              className="text-center text-sm font-medium text-zinc-700 sm:text-left"
            >
              {t("auth.totpCode")}
              <span className="ml-0.5 text-red-600" aria-hidden>
                *
              </span>
            </label>
            <input
              ref={totpInputRef}
              id="login-totp"
              name="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-h-[3.25rem] w-full rounded-2xl border-2 border-zinc-200/90 bg-zinc-50/90 px-3 py-3 text-center font-mono text-[1.25rem] font-semibold tabular-nums tracking-[0.35em] text-zinc-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-zinc-300 placeholder:tracking-normal focus:border-indigo-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] sm:min-h-14 sm:px-4 sm:text-2xl sm:tracking-[0.4em]"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              maxLength={12}
              required
            />
          </div>
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button
              type="submit"
              className="min-h-[3.25rem] w-full !rounded-2xl text-base font-semibold sm:min-h-12"
              disabled={pending}
            >
              {pending ? t("auth.signingIn") : t("auth.totpSubmit")}
            </Button>
            <button
              type="button"
              className="min-h-11 w-full rounded-xl py-2.5 text-center text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800 active:bg-indigo-100/80"
              onClick={closeTotpModal}
            >
              {t("auth.totpBack")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
