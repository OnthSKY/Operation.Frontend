"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ReactNode } from "react";

export type PageWhenToUseItem = {
  /** Metin; link varsa genelde linkten önce gelir */
  text: ReactNode;
  /** Madde sonunda iç route linki (Next.js) */
  link?: { href: string; label: ReactNode };
};

type Props = {
  /** Örn. `t("common.pageWhenToUseTitle")` veya sayfa özel başlık */
  title: ReactNode;
  /** Giriş paragrafı */
  description?: ReactNode;
  /** Maddeli yönlendirme; `link` ile mor aksiyon metni */
  items?: PageWhenToUseItem[];
  className?: string;
  /** `violet`: görseldeki gibi; `zinc`: daha nötr kutu */
  tone?: "violet" | "zinc";
  id?: string;
};

const linkClass =
  "font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900";

/**
 * “Bu ekranı ne zaman kullanmalıyım?” tarzı bilgi kutusu.
 *
 * Örnek:
 * ```tsx
 * <PageWhenToUseGuide
 *   title={t("common.pageWhenToUseTitle")}
 *   description={t("myPage.guideIntro")}
 *   items={[
 *     { text: t("myPage.guideA"), link: { href: "/other", label: t("myPage.guideALink") } },
 *     { text: t("myPage.guideB") },
 *   ]}
 * />
 * ```
 */
export function PageWhenToUseGuide({
  title,
  description,
  items,
  className,
  tone = "violet",
  id,
}: Props) {
  const box =
    tone === "violet"
      ? "rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 text-sm text-zinc-800 sm:p-5"
      : "rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 text-sm text-zinc-800 sm:p-5";

  const titleCls =
    tone === "violet" ? "text-base font-semibold text-violet-950" : "text-base font-semibold text-zinc-900";

  const aria =
    typeof title === "string" || typeof title === "number" ? String(title) : undefined;

  return (
    <aside id={id} role="note" aria-label={aria} className={cn(box, className)}>
      <p className={titleCls}>{title}</p>
      {description ? <p className="mt-2 leading-relaxed text-zinc-700">{description}</p> : null}
      {items && items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-zinc-700">
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
      ) : null}
    </aside>
  );
}
