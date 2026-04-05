"use client";

import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { notify } from "@/shared/lib/notify";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
          ? err.message || t("auth.loginFailed")
          : t("auth.loginFailed");
      notify.error(message);
    } finally {
      setPending(false);
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">{t("auth.title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("auth.subtitle")}</p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-user" className="text-sm font-medium text-zinc-700">
              {t("auth.username")}
            </label>
            <input
              id="login-user"
              name="username"
              autoComplete="username"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-pass" className="text-sm font-medium text-zinc-700">
              {t("auth.password")}
            </label>
            <input
              id="login-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? t("auth.signingIn") : t("auth.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
