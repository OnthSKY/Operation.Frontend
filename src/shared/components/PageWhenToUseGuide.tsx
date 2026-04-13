"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import type { GuideTabId } from "@/shared/lib/guide-tab";
import Link from "next/link";
import type { ReactNode } from "react";

export type PageWhenToUseItem = {
  text: ReactNode;
  link?: { href: string; label: ReactNode };
};

const linkClass =
  "font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900";

export type PageWhenToUseGuideContentProps = {
  title?: ReactNode;
  /** Aside’ta true; modalda başlık dışarıdaysa false */
  showTitle?: boolean;
  description?: ReactNode;
  items?: PageWhenToUseItem[];
  listVariant?: "bullet" | "ordered";
  guideTab?: GuideTabId;
  tone?: "violet" | "zinc";
};

export function PageWhenToUseGuideContent({
  title,
  showTitle = true,
  description,
  items,
  listVariant = "bullet",
  guideTab,
  tone = "violet",
}: PageWhenToUseGuideContentProps) {
  const { t } = useI18n();
  const titleCls =
    tone === "violet" ? "text-base font-semibold text-violet-950" : "text-base font-semibold text-zinc-900";
  const hasHead = Boolean(showTitle && title);
  const listTop = hasHead || description ? "mt-3" : "";

  return (
    <>
      {showTitle && title ? <p className={titleCls}>{title}</p> : null}
      {description ? (
        <p className={cn("leading-relaxed text-zinc-700", hasHead ? "mt-2" : "")}>{description}</p>
      ) : null}
      {items && items.length > 0 ? (
        listVariant === "ordered" ? (
          <ol className={cn("list-decimal space-y-2 pl-5 leading-relaxed text-zinc-700", listTop)}>
            {items.map((it, i) => (
              <li key={i} className="pl-1">
                {it.text}
                {it.link ? (
                  <>
                    {" "}
                    <Link href={it.link.href} className={linkClass}>
                      {it.link.label}
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <ul className={cn("list-disc space-y-2 pl-5 leading-relaxed text-zinc-700", listTop)}>
            {items.map((it, i) => (
              <li key={i}>
                {it.text}
                {it.link ? (
                  <>
                    {" "}
                    <Link href={it.link.href} className={linkClass}>
                      {it.link.label}
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
      {guideTab ? (
        <p
          className={cn(
            "border-t border-violet-200/70 pt-3",
            hasHead || description || (items && items.length > 0) ? "mt-3" : ""
          )}
        >
          <Link href={`/guide?tab=${guideTab}`} className={linkClass}>
            {t("common.openInGuide")}
          </Link>
        </p>
      ) : null}
    </>
  );
}

type AsideProps = {
  title: ReactNode;
  description?: ReactNode;
  items?: PageWhenToUseItem[];
  className?: string;
  listVariant?: "bullet" | "ordered";
  tone?: "violet" | "zinc";
  id?: string;
  guideTab?: GuideTabId;
};

export function PageWhenToUseGuide({
  title,
  description,
  items,
  className,
  listVariant = "bullet",
  tone = "violet",
  id,
  guideTab,
}: AsideProps) {
  const box =
    tone === "violet"
      ? "rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 text-sm text-zinc-800 sm:p-5"
      : "rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 text-sm text-zinc-800 sm:p-5";

  const aria =
    typeof title === "string" || typeof title === "number" ? String(title) : undefined;

  return (
    <aside id={id} role="note" aria-label={aria} className={cn(box, className)}>
      <PageWhenToUseGuideContent
        title={title}
        showTitle
        description={description}
        items={items}
        listVariant={listVariant}
        guideTab={guideTab}
        tone={tone}
      />
    </aside>
  );
}
