"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Variant = "intro" | "surface" | "plain";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  /** Görünür başlık varken `aria-labelledby` — benzersiz olmalı */
  sectionLabelId: string;
  /**
   * Küçük üst etiket — verilmezse / boşsa şerit çizilmez; o zaman `sectionAriaLabel` zorunlu.
   */
  eyebrow?: string | null;
  /** Görünür eyebrow yokken bölge adı (`aria-label`, ekran okuyucu). */
  sectionAriaLabel?: string;
  /**
   * `plain` + dar ekran: dış kart çerçevesini kaldırır; içerideki kart/tablolar tek yüzey olur.
   */
  mobileFrame?: "card" | "flush";
};

/**
 * Sayfayı «giriş / özet / kayıtlar» gibi bölümlere ayırır; etiket dışarıda değil, panel başlığıdır.
 */
export function PageContentSection({
  eyebrow,
  sectionAriaLabel,
  children,
  className,
  variant = "plain",
  sectionLabelId,
  mobileFrame = "card",
}: Props) {
  const showEyebrow = eyebrow != null && String(eyebrow).trim() !== "";
  const flushPlainMobile = variant === "plain" && mobileFrame === "flush";

  const regionAriaLabel = sectionAriaLabel?.trim() ?? "";
  if (!showEyebrow && !regionAriaLabel) {
    throw new Error(
      "PageContentSection: `sectionAriaLabel` (non-empty) is required when `eyebrow` is omitted or blank."
    );
  }

  const plainShell = cn(
    "overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm",
    flushPlainMobile &&
      "max-sm:overflow-visible max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none max-sm:ring-0"
  );

  const shell =
    variant === "intro"
      ? "overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm"
      : variant === "surface"
        ? "overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/50 shadow-sm"
        : plainShell;

  const header =
    variant === "intro"
      ? "border-b border-zinc-200/85 bg-zinc-50/95 px-4 py-2.5 sm:px-5 sm:py-3"
      : variant === "surface"
        ? "border-b border-zinc-200/85 bg-zinc-100/90 px-4 py-2.5 sm:px-5 sm:py-3"
        : "border-b border-zinc-200/85 bg-zinc-50/95 px-4 py-2.5 sm:px-5 sm:py-3";

  const eyebrowClass = cn(
    "text-[0.68rem] font-bold uppercase tracking-[0.14em]",
    "text-zinc-600"
  );

  const plainBody = cn(
    "flex min-w-0 flex-col gap-4 px-4 pb-6 pt-4 sm:gap-5 sm:px-6 sm:pb-7 sm:pt-5",
    flushPlainMobile && "max-sm:gap-3 max-sm:px-0 max-sm:pb-4 max-sm:pt-0"
  );

  const body =
    variant === "intro"
      ? "min-w-0 bg-white p-4 sm:p-5"
      : variant === "surface"
        ? "min-w-0 bg-zinc-50/55 p-4 sm:p-5"
        : plainBody;

  const a11y = showEyebrow
    ? ({ "aria-labelledby": sectionLabelId } as const)
    : ({ "aria-label": regionAriaLabel } as const);

  return (
    <section className={cn("min-w-0", className)} {...a11y}>
      <div className={shell}>
        {showEyebrow ? (
          <div className={header}>
            <p id={sectionLabelId} className={eyebrowClass}>
              {eyebrow}
            </p>
          </div>
        ) : null}
        <div className={body}>{children}</div>
      </div>
    </section>
  );
}
