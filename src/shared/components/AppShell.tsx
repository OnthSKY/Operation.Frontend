"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { AppGlobalSearch } from "@/shared/components/AppGlobalSearch";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const routes = ["/", "/personnel", "/branch", "/warehouse"] as const;

const navKeys: Record<(typeof routes)[number], string> = {
  "/": "nav.home",
  "/personnel": "nav.personnel",
  "/branch": "nav.branch",
  "/warehouse": "nav.warehouse",
};

function LocaleToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1"
      role="group"
      aria-label={t("lang.label")}
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-h-9 min-w-10 rounded-md px-2 text-sm font-semibold ${
            locale === code
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:bg-white/80"
          }`}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
  const { logout, user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const sidebarBody = (
    <>
      <div className="border-b border-zinc-200 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {t("common.appName")}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label={t("nav.mainNav")}>
        {routes.map((href) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileNavOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {t(navKeys[href])}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen flex-1">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 md:hidden"
          aria-label={t("nav.menuClose")}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-end border-b border-zinc-200 px-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            {t("common.close")}
          </button>
        </div>
        {sidebarBody}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={t("nav.menuOpen")}
          >
            <span className="sr-only">{t("nav.menuOpen")}</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <AppGlobalSearch />
          {user ? (
            <span className="hidden max-w-[10rem] truncate text-xs text-zinc-500 sm:inline md:max-w-[14rem]">
              {user.fullName || user.username}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("auth.logout")}
          </button>
          <LocaleToggle />
        </header>
        <main className="flex flex-1 flex-col overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
