"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-[7.5rem] rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-900/[0.04] sm:scroll-mt-24 sm:p-6 md:scroll-mt-28"
    >
      <h2 className="text-lg font-bold leading-snug text-zinc-900 sm:text-xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-zinc-600 sm:text-[0.95rem] sm:leading-relaxed md:text-base">
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-pretty">{children}</p>;
}

const jumpClass =
  "group mt-1 inline-flex min-h-[3.25rem] w-full touch-manipulation select-none items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 text-base font-semibold text-zinc-900 shadow-sm transition-[transform,box-shadow,background-color] duration-200 hover:bg-white hover:shadow-md active:bg-zinc-100 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 sm:mt-2 sm:w-auto sm:min-w-[12rem]";

function Jump({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(jumpClass)}>
      <span className="text-center">{label}</span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-violet-600 motion-safe:transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

const SECTION_TITLE_KEYS: Record<
  | "nav"
  | "dashboard"
  | "reports"
  | "personnel"
  | "branch"
  | "warehouse"
  | "products"
  | "admin"
  | "tips"
  | "portal",
  string
> = {
  nav: "guide.nav.title",
  dashboard: "guide.dashboard.title",
  reports: "guide.reports.title",
  personnel: "guide.personnel.title",
  branch: "guide.branch.title",
  warehouse: "guide.warehouse.title",
  products: "guide.products.title",
  admin: "guide.admin.title",
  tips: "guide.footer.title",
  portal: "guide.portal.title",
};

export default function GuidePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const isAdmin = user?.role === "ADMIN";
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tocIds = useMemo(
    () =>
      personnelPortal
        ? (["nav", "portal", "branch", "tips"] as const)
        : ([
            "nav",
            "dashboard",
            "reports",
            "personnel",
            "branch",
            "warehouse",
            "products",
            ...(isAdmin ? (["admin"] as const) : []),
            "tips",
          ] as const),
    [personnelPortal, isAdmin]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 pb-28 pt-4 sm:space-y-6 sm:px-4 sm:pb-10 sm:pt-6 md:px-6 md:py-8">
      <header className="space-y-3 sm:space-y-4">
        <h1 className="text-pretty text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t("guide.pageTitle")}
        </h1>
        <p className="text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg">
          {t("guide.pageLead")}
        </p>
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 p-4 text-base leading-snug text-amber-950 sm:items-start sm:text-[0.95rem] sm:leading-relaxed"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
            aria-hidden
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <p className="min-w-0 pt-0.5">{t("guide.roleNote")}</p>
        </div>
      </header>

      {/* Mobile: sticky horizontal TOC */}
      <div className="md:hidden">
        <nav
          aria-label={t("guide.toc")}
          className="sticky top-14 z-20 -mx-3 border-b border-zinc-200/80 bg-zinc-50/95 px-3 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md supports-[backdrop-filter]:bg-zinc-50/85"
        >
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-violet-700/90">
            {t("guide.toc")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t("guide.tocSwipeHint")}</p>
          <ul className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tocIds.map((id) => (
              <li key={id} className="snap-start shrink-0">
                <a
                  href={`#${id}`}
                  className="flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-full border border-violet-200/90 bg-white px-4 text-sm font-bold text-violet-900 shadow-sm ring-violet-100 transition active:scale-[0.97] active:bg-violet-50"
                >
                  {t(`guide.tocShort.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Desktop / tablet: card TOC with full titles */}
      <nav
        aria-label={t("guide.toc")}
        className="hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/90 to-fuchsia-50/50 p-5 shadow-sm md:block"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700/90">
          {t("guide.toc")}
        </p>
        <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {tocIds.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="flex min-h-11 items-center rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-violet-900 underline decoration-violet-300 underline-offset-[5px] transition hover:border-violet-200/80 hover:bg-white/70 hover:decoration-violet-600"
              >
                {t(SECTION_TITLE_KEYS[id])}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4 sm:space-y-5">
        <Section id="nav" title={t("guide.nav.title")}>
          <P>{t("guide.nav.p1")}</P>
          <P>{t("guide.nav.p2")}</P>
          <P>{t("guide.nav.p3")}</P>
        </Section>

        {personnelPortal ? (
          <Section id="portal" title={t("guide.portal.title")}>
            <P>{t("guide.portal.p1")}</P>
            <P>{t("guide.portal.p2")}</P>
            <P>{t("guide.portal.p3")}</P>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
              <Jump href="/branch" label={t("guide.portal.goBranch")} />
              <Jump
                href="/personnel/advances"
                label={t("guide.portal.goAdvances")}
              />
            </div>
          </Section>
        ) : null}

        {!personnelPortal ? (
          <>
            <Section id="dashboard" title={t("guide.dashboard.title")}>
              <P>{t("guide.dashboard.p1")}</P>
              <P>{t("guide.dashboard.p2")}</P>
              <Jump href="/" label={t("guide.dashboard.go")} />
            </Section>

            <Section id="reports" title={t("guide.reports.title")}>
              <P>{t("guide.reports.p1")}</P>
              <P>{t("guide.reports.p2")}</P>
              <Jump href="/reports" label={t("guide.reports.go")} />
            </Section>

            <Section id="personnel" title={t("guide.personnel.title")}>
              <P>{t("guide.personnel.p1")}</P>
              <P>{t("guide.personnel.p2")}</P>
              <P>{t("guide.personnel.p3")}</P>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                <Jump href="/personnel" label={t("guide.personnel.goList")} />
                <Jump
                  href="/personnel/advances"
                  label={t("guide.personnel.goAdvances")}
                />
              </div>
            </Section>
          </>
        ) : null}

        <Section id="branch" title={t("guide.branch.title")}>
          <P>{t("guide.branch.p1")}</P>
          <P>{t("guide.branch.p2")}</P>
          <P>{t("guide.branch.p3")}</P>
          <Jump href="/branch" label={t("guide.branch.go")} />
        </Section>

        {!personnelPortal ? (
          <>
            <Section id="warehouse" title={t("guide.warehouse.title")}>
              <P>{t("guide.warehouse.p1")}</P>
              <P>{t("guide.warehouse.p2")}</P>
              <Jump href="/warehouse" label={t("guide.warehouse.go")} />
            </Section>

            <Section id="products" title={t("guide.products.title")}>
              <P>{t("guide.products.p1")}</P>
              <Jump href="/products" label={t("guide.products.go")} />
            </Section>
          </>
        ) : null}

        {isAdmin ? (
          <Section id="admin" title={t("guide.admin.title")}>
            <P>{t("guide.admin.p1")}</P>
            <Jump href="/admin/users" label={t("guide.admin.go")} />
          </Section>
        ) : null}

        <Section id="tips" title={t("guide.footer.title")}>
          <P>{t("guide.footer.p1")}</P>
          <P>{t("guide.footer.p2")}</P>
          <P>{t("guide.footer.p3")}</P>
        </Section>
      </div>

      {showTop ? (
        <button
          type="button"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-30 flex min-h-12 items-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-zinc-900/30 ring-1 ring-white/10 transition hover:bg-zinc-800 active:scale-[0.98] md:bottom-8 md:right-8"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          {t("guide.backToTop")}
        </button>
      ) : null}
    </div>
  );
}
