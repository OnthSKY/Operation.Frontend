"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConnectionQuality } from "@/shared/lib/useConnectionQuality";

/**
 * Üst sağ köşede küçük "Yenileniyor…" pill — herhangi bir query/mutation aktif iken görünür.
 *
 * Tasarım kararları:
 *   - 250ms açılma gecikmesi: hızlı refetch'lerde (cached) titremeyi önler
 *   - Floating, click-through: pointer-events-none
 *   - prefers-reduced-motion: anlık geçiş, animasyon yok
 *   - z-index: toast'lardan düşük (10000 toast, 90 pill)
 */
export function BackgroundRefetchIndicator() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const { isSlow } = useConnectionQuality();
  const active = fetching + mutating > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setVisible(true), 250);
      return () => clearTimeout(t);
    }
    setVisible(false);
    return;
  }, [active]);

  if (!visible) return null;

  // Yavaş bağlantı algılandıysa rengi ve metni değiştir → kullanıcı bilinçli bekler
  const dotColor = isSlow ? "bg-amber-400" : "bg-emerald-400";
  const text = isSlow ? "Yavaş bağlantı — yükleniyor…" : "Yenileniyor…";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-3 z-[90] -translate-x-1/2 select-none rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md ring-1 ring-white/10"
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 animate-pulse rounded-full ${dotColor} motion-reduce:animate-none`}
          aria-hidden
        />
        {text}
      </span>
    </div>
  );
}
