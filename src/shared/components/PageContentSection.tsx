"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Variant = "intro" | "surface" | "plain";

type Props = {
  /** Küçük üst etiket (örn. «Giriş») — kartın üst şeridinde, içerikle aynı çerçevede */
  eyebrow: string;
  children: ReactNode;
  className?: string;
  variant?: Variant;
  /** `aria-labelledby` — benzersiz olmalı */
  sectionLabelId: string;
};

/**
 * Sayfayı «giriş / özet / kayıtlar» gibi bölümlere ayırır; etiket dışarıda değil, panel başlığıdır.
 */
export function PageContentSection({
  eyebrow,
  children,
  className,
  variant = "plain",
  sectionLabelId,
}: Props) {
  const shell =
    variant === "intro"
      ? "overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm shadow-violet-950/[0.06] ring-1 ring-violet-100/60"
      : variant === "surface"
        ? "overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-950/[0.04]"
        : "overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04]";

  const header =
    variant === "intro"
      ? "border-b border-violet-200/65 bg-gradient-to-r from-violet-100/80 via-violet-50/50 to-white px-4 py-2.5 sm:px-5 sm:py-3"
      : variant === "surface"
        ? "border-b border-zinc-200/85 bg-zinc-100/90 px-4 py-2.5 sm:px-5 sm:py-3"
        : "border-b border-zinc-200/85 bg-zinc-50/95 px-4 py-2.5 sm:px-5 sm:py-3";

  const eyebrowClass = cn(
    "text-[0.68rem] font-bold uppercase tracking-[0.14em]",
    variant === "intro" && "text-violet-900/85",
    variant !== "intro" && "text-zinc-600"
  );

  const body =
    variant === "intro"
      ? "min-w-0 bg-gradient-to-br from-violet-50/45 via-white to-zinc-50/85 p-4 sm:p-5"
      : variant === "surface"
        ? "min-w-0 bg-zinc-50/55 p-4 sm:p-5"
        : "flex min-w-0 flex-col gap-4 px-4 pb-6 pt-4 sm:gap-5 sm:px-6 sm:pb-7 sm:pt-5";

  return (
    <section className={cn("min-w-0", className)} aria-labelledby={sectionLabelId}>
      <div className={shell}>
        <div className={header}>
          <p id={sectionLabelId} className={eyebrowClass}>
            {eyebrow}
          </p>
        </div>
        <div className={body}>{children}</div>
      </div>
    </section>
  );
}
