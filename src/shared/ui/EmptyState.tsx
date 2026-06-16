"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Liste/grid boşken gösterilen standardize edilmiş boş durum bileşeni.
 *
 * Eski "Liste boş" plain text yerine: ikon + başlık + açıklama + CTA.
 *
 * Kullanım:
 *   <EmptyState
 *     icon="📂"
 *     title="Henüz personel yok"
 *     description="İlk personeli ekleyerek ekibinizi oluşturmaya başlayın."
 *     action={{ label: "Personel ekle", onClick: () => setOpen(true) }}
 *   />
 *
 * Tasarım kararları:
 *   - Padding/border zinklı, ortalanmış (cards-and-tables arası tutarlı görünüm)
 *   - "Search empty" varyantı için actionı kaldır, açıklamayı kısalt
 *   - Compact mod: küçük listeler (örn. modal içi) için padding düşer
 */

type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  /** İkincil aksiyon (örn. "Filtreyi temizle"). */
  variant?: "primary" | "secondary";
};

type Props = {
  /** Emoji veya küçük JSX ikon (örn. <Icon />). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Tek veya birden fazla CTA. */
  action?: EmptyStateAction | EmptyStateAction[];
  /** Daha az padding (küçük listeler / modal içi). */
  compact?: boolean;
  className?: string;
};

export function EmptyState({ icon, title, description, action, compact, className }: Props) {
  const actions = action ? (Array.isArray(action) ? action : [action]) : [];
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className
      )}
    >
      {icon != null ? (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-full bg-white text-2xl ring-1 ring-zinc-100",
            compact ? "h-10 w-10" : "h-14 w-14 text-3xl"
          )}
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h3 className={cn("font-semibold text-zinc-900", compact ? "text-sm" : "text-base")}>
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mt-1.5 max-w-prose text-zinc-600",
            compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"
          )}
        >
          {description}
        </p>
      ) : null}
      {actions.length > 0 ? (
        <div className={cn("mt-4 flex flex-wrap items-center justify-center gap-2", compact && "mt-3")}>
          {actions.map((a, i) => {
            const isPrimary = (a.variant ?? "primary") === "primary";
            const cls = cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
              isPrimary
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            );
            if (a.href) {
              return (
                <a key={i} href={a.href} className={cls}>
                  {a.label}
                </a>
              );
            }
            return (
              <button key={i} type="button" onClick={a.onClick} className={cls}>
                {a.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
