"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

type Tone = "emerald" | "blue" | "violet" | "amber" | "rose" | "zinc";

const ACTIVE_TONE: Record<Tone, string> = {
  emerald:
    "border-emerald-300 bg-emerald-50 text-emerald-800 ring-emerald-900/[0.04] hover:bg-emerald-100",
  blue:
    "border-blue-300 bg-blue-50 text-blue-800 ring-blue-900/[0.04] hover:bg-blue-100",
  violet:
    "border-violet-300 bg-violet-50 text-violet-800 ring-violet-900/[0.04] hover:bg-violet-100",
  amber:
    "border-amber-300 bg-amber-50 text-amber-800 ring-amber-900/[0.04] hover:bg-amber-100",
  rose:
    "border-rose-300 bg-rose-50 text-rose-800 ring-rose-900/[0.04] hover:bg-rose-100",
  zinc:
    "border-zinc-400 bg-zinc-100 text-zinc-900 ring-zinc-900/[0.06] hover:bg-zinc-200",
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  active: boolean;
  /** Aktif durumda kullanılacak ton (varsayılan: emerald). */
  tone?: Tone;
  /** İçerik (etiket). */
  children: ReactNode;
  /** Aktif durumda göstermek istediğin sol ikon. Default: küçük tik. null → ikon yok. */
  activeIcon?: ReactNode | null;
  /** Pasif durumda göstermek istediğin sol ikon. */
  inactiveIcon?: ReactNode;
  /** Düğmeyi parent flex'inde eşit pay alacak şekilde genişlet. */
  fullWidth?: boolean;
};

/**
 * Seçili durumu görsel olarak yansıtan toggle düğmesi.
 * Filtre çipi, "tümü"/"aktif"/"pasif" benzeri tek-tıklama mod-değiştirici alanlarda kullan.
 * `aria-pressed` otomatik set edilir → erişilebilir.
 */
export const ToggleButton = forwardRef<HTMLButtonElement, Props>(function ToggleButton(
  {
    active,
    tone = "emerald",
    children,
    activeIcon,
    inactiveIcon,
    fullWidth = false,
    className,
    ...rest
  },
  ref
) {
  const defaultActiveIcon = (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5 9-11" />
    </svg>
  );
  const showActiveIcon = activeIcon !== null;
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      aria-pressed={active}
      {...rest}
      className={cn(
        "inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition motion-safe:active:scale-[0.98]",
        active
          ? cn("shadow-sm ring-1", ACTIVE_TONE[tone])
          : "border-zinc-300 bg-white text-zinc-900 shadow-sm shadow-zinc-900/5 hover:bg-zinc-50",
        fullWidth && "flex-1 sm:flex-initial",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/60",
        className
      )}
    >
      {active
        ? showActiveIcon
          ? (activeIcon ?? defaultActiveIcon)
          : null
        : inactiveIcon ?? null}
      {children}
    </button>
  );
});
