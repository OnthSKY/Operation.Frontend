"use client";

import { cn } from "@/lib/cn";

/**
 * SVG döndürme animasyonlu spinner — modal yükleme, küçük inline indikatör için.
 *
 * Reduced motion kullanıcıları: tarayıcı `prefers-reduced-motion: reduce` kuralıyla
 * animasyon kapatılır (motion-safe Tailwind variant). Statik halka kalır.
 */

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

type Props = {
  size?: Size;
  className?: string;
  /** Erişilebilirlik label'ı. Boş bırakılırsa role="status" + sr-only "Yükleniyor…" eklenir. */
  label?: string;
};

export function Spinner({ size = "md", className, label = "Yükleniyor…" }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block rounded-full border-current border-r-transparent text-zinc-400",
        SIZE_MAP[size],
        "motion-safe:animate-spin",
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Tipik "inline metin yanı" kullanımı: <InlineLoading text="Yükleniyor…" /> */
export function InlineLoading({ text = "Yükleniyor…", className }: { text?: string; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-sm text-zinc-500", className)}>
      <Spinner size="sm" />
      <span>{text}</span>
    </p>
  );
}
