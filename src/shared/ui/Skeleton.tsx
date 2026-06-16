"use client";

import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";

/**
 * Yumuşak shimmer animasyonlu placeholder — liste/kart/satır içeriği için.
 *
 * Kullanım örnekleri:
 *   <Skeleton className="h-4 w-32" />                  // tek satır
 *   <Skeleton className="h-10 w-full rounded-lg" />   // büyük blok
 *   <SkeletonText lines={3} />                        // çoklu satır
 *   <SkeletonCard />                                  // tipik kart placeholder
 *
 * Erişilebilirlik: `role="status"` + `aria-busy="true"` + sr-only metin.
 * Reduced motion: animasyon kaldırılır.
 */

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  /** Erişilebilirlik için sr-only metin (varsayılan: "Yükleniyor…"). */
  label?: string;
};

export function Skeleton({ className, style, label = "Yükleniyor…" }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      style={style}
      className={cn(
        "relative overflow-hidden rounded-md bg-zinc-200/70",
        // shimmer
        "motion-safe:after:absolute motion-safe:after:inset-0 motion-safe:after:-translate-x-full",
        "motion-safe:after:animate-[shimmer_1.4s_ease-in-out_infinite]",
        "motion-safe:after:bg-gradient-to-r motion-safe:after:from-transparent motion-safe:after:via-white/60 motion-safe:after:to-transparent",
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Liste sayfası başlangıcı için tipik kart placeholder. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-4", className)}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

/** N satırlık tablo placeholder. */
export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-zinc-100">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className={cn("h-3.5", c === 0 ? "w-2/3" : "w-full")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
