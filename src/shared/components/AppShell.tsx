"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { AppGlobalSearch } from "@/shared/components/AppGlobalSearch";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const personnelSubNav = [
  { href: "/personnel", labelKey: "nav.personnelList", icon: "personnel" as const },
  {
    href: "/personnel/advances",
    labelKey: "nav.personnelAdvances",
    icon: "advances" as const,
  },
] as const;

const topRouteIcons = ["/", "/branch", "/warehouse", "/products"] as const;
type NavIconName = (typeof topRouteIcons)[number] | "personnel" | "advances";

function NavGlyph({ name }: { name: NavIconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "shrink-0 opacity-90",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "/":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "personnel":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "advances":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "/branch":
      return (
        <svg {...common}>
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
        </svg>
      );
    case "/warehouse":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "/products":
      return (
        <svg {...common}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    default:
      return null;
  }
}

const navLinkBase =
  "flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200";
const navLinkActive =
  "bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 ring-1 ring-zinc-900/20";
const navLinkIdle =
  "text-zinc-600 hover:bg-white/80 hover:text-zinc-900 hover:shadow-md hover:shadow-zinc-900/[0.04] hover:ring-1 hover:ring-zinc-200/90";
const navSectionTitle =
  "px-3 pb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-400";
const navSectionBlock = "mt-2 border-t border-zinc-200/80 pt-2";

function LocaleToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      className="inline-flex shrink-0 rounded-full bg-zinc-100/90 p-0.5 shadow-inner ring-1 ring-zinc-200/70"
      role="group"
      aria-label={t("lang.label")}
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-h-8 min-w-9 rounded-full px-2.5 text-xs font-bold tracking-wide transition-colors ${
            locale === code
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
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
  const { t, locale } = useI18n();
  const { logout, user } = useAuth();
  const displayName = user
    ? (user.fullName?.trim() || user.username).toLocaleUpperCase(
        locale === "tr" ? "tr-TR" : "en-US"
      )
    : "";
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
      <div className="relative px-4 pb-4 pt-5 md:pt-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/35 to-fuchsia-500/0"
          aria-hidden
        />
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-zinc-400">
          {t("common.appName")}
        </p>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2"
        aria-label={t("nav.mainNav")}
      >
        <Link
          href="/"
          onClick={() => setMobileNavOpen(false)}
          className={`${navLinkBase} px-3 py-2.5 ${
            pathname === "/" ? navLinkActive : navLinkIdle
          }`}
        >
          <NavGlyph name="/" />
          <span className="min-w-0">{t("nav.home")}</span>
        </Link>

        <div className={navSectionBlock}>
          <p className={navSectionTitle}>{t("nav.personnelSection")}</p>
          <div className="flex flex-col gap-0.5">
            {personnelSubNav.map((item) => {
              const subActive =
                item.href === "/personnel"
                  ? pathname === "/personnel"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`${navLinkBase} py-2 pl-4 pr-3 ${
                    subActive ? navLinkActive : navLinkIdle
                  }`}
                >
                  <NavGlyph name={item.icon} />
                  <span className="min-w-0">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className={navSectionBlock}>
          <p className={navSectionTitle}>{t("nav.branchSection")}</p>
          <div className="flex flex-col gap-0.5">
            <Link
              href="/branch"
              onClick={() => setMobileNavOpen(false)}
              className={`${navLinkBase} py-2 pl-4 pr-3 ${
                pathname.startsWith("/branch") ? navLinkActive : navLinkIdle
              }`}
            >
              <NavGlyph name="/branch" />
              <span className="min-w-0">{t("nav.branch")}</span>
            </Link>
          </div>
        </div>

        <div className={navSectionBlock}>
          <p className={navSectionTitle}>{t("nav.inventorySection")}</p>
          <div className="flex flex-col gap-0.5">
            <Link
              href="/warehouse"
              onClick={() => setMobileNavOpen(false)}
              className={`${navLinkBase} py-2 pl-4 pr-3 ${
                pathname.startsWith("/warehouse") ? navLinkActive : navLinkIdle
              }`}
            >
              <NavGlyph name="/warehouse" />
              <span className="min-w-0">{t("nav.warehouse")}</span>
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileNavOpen(false)}
              className={`${navLinkBase} py-2 pl-4 pr-3 ${
                pathname.startsWith("/products") ? navLinkActive : navLinkIdle
              }`}
            >
              <NavGlyph name="/products" />
              <span className="min-w-0">{t("nav.products")}</span>
            </Link>
          </div>
        </div>
      </nav>
      <div className="mt-auto shrink-0 border-t border-zinc-200/80 bg-zinc-950/[0.02] p-3 backdrop-blur-[2px]">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100/90 px-3 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200/80 transition hover:bg-zinc-200/90 hover:ring-zinc-300/80"
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
            className="shrink-0 opacity-80"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t("auth.logout")}
        </button>
      </div>
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col border-r border-zinc-200/90 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 transition-transform duration-200 ease-out md:static md:translate-x-0 md:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.08)] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-end border-b border-zinc-200/80 bg-white/60 px-2 backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-white/90 hover:text-zinc-900"
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
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {user ? (
              <div
                className="hidden min-w-0 max-w-[12rem] items-center gap-2 sm:flex md:max-w-[18rem]"
                title={user.fullName?.trim() || user.username}
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
                  {displayName}
                </span>
              </div>
            ) : null}
            <LocaleToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
