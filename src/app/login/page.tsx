"use client";

import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { notify } from "@/shared/lib/notify";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const gridSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23ffffff' fill-opacity='0.06' d='M0 0h32v32H0z'/%3E%3Cpath stroke='%23ffffff' stroke-opacity='0.07' d='M0 .5h32M.5 0v32'/%3E%3C/svg%3E\")";

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

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isReady && user) router.replace("/");
  }, [isReady, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await login(username.trim(), password);
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
    <div className="flex min-h-[100dvh] flex-col bg-zinc-100 lg:flex-row lg:bg-white">
      <header className="absolute right-4 top-4 z-20 lg:right-8 lg:top-8">
        <LoginLocaleToggle />
      </header>

      <aside className="relative order-1 flex min-h-[38vh] flex-col justify-end overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 pb-8 pt-20 text-white sm:min-h-[40vh] sm:px-10 lg:order-none lg:min-h-0 lg:w-[min(44%,520px)] lg:flex-none lg:justify-center lg:px-12 lg:pb-16 lg:pt-12">
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

        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/90">
            Operations
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {t("auth.brandHeadline")}
          </h2>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
            {t("auth.brandTagline")}
          </p>
          <ul className="mt-8 hidden space-y-3 text-sm text-slate-300 lg:block">
            {features.map((line) => (
              <li key={line} className="flex gap-3">
                <CheckIcon />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="order-2 flex flex-1 items-stretch justify-center px-4 pb-10 pt-2 sm:px-6 lg:items-center lg:px-12 lg:py-16">
        <div className="flex w-full max-w-md flex-col justify-center">
          <div className="-mt-6 rounded-2xl border border-zinc-200/90 bg-white p-7 shadow-xl shadow-zinc-900/[0.06] sm:-mt-8 sm:p-9 lg:mt-0 lg:border-zinc-200 lg:shadow-2xl lg:shadow-zinc-900/[0.04]">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {t("auth.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-[15px]">
              {t("auth.subtitle")}
            </p>

            <ul className="mt-6 space-y-2.5 border-t border-zinc-100 pt-6 text-sm text-zinc-600 lg:hidden">
              {features.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <CheckIcon className="text-indigo-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <form className="mt-8 flex flex-col gap-5" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-user"
                  className="text-sm font-medium text-zinc-700"
                >
                  {t("auth.username")}
                </label>
                <input
                  id="login-user"
                  name="username"
                  autoComplete="username"
                  className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-indigo-500/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-pass"
                  className="text-sm font-medium text-zinc-700"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="login-pass"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-3.5 pr-12 text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-indigo-500/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-xl text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    aria-pressed={showPassword}
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
              <Button
                type="submit"
                className="mt-1 min-h-12 w-full !rounded-xl sm:!w-full"
                disabled={pending}
              >
                {pending ? t("auth.signingIn") : t("auth.submit")}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
