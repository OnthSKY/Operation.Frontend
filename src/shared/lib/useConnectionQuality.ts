"use client";

import { useEffect, useState } from "react";

/**
 * Tarayıcının Network Information API'siyle yavaş bağlantı algılar.
 * Desteklemeyen tarayıcılarda "unknown" döner (varsayılan: hızlı kabul edilir).
 *
 * Kullanım:
 *   const { isSlow, saveData, effectiveType } = useConnectionQuality();
 *   if (isSlow) // resim küçük thumb göster, animasyonu azalt
 *
 * Desteklenen tarayıcılar: Chromium-based + Android WebView (Safari/Firefox YOK).
 * Detection için tek API: `navigator.connection`.
 */

export type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

type ConnLike = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", l: () => void) => void;
  removeEventListener?: (type: "change", l: () => void) => void;
};

function getConn(): ConnLike | null {
  if (typeof navigator === "undefined") return null;
  const n = navigator as unknown as { connection?: ConnLike };
  return n.connection ?? null;
}

function snapshot(): { effectiveType: EffectiveType; saveData: boolean } {
  const c = getConn();
  const t = (c?.effectiveType ?? "unknown") as EffectiveType;
  return { effectiveType: t, saveData: Boolean(c?.saveData) };
}

export function useConnectionQuality() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const c = getConn();
    if (!c?.addEventListener) return;
    const onChange = () => setState(snapshot());
    c.addEventListener("change", onChange);
    return () => c.removeEventListener?.("change", onChange);
  }, []);

  // "slow" eşiği: 2g, slow-2g veya saveData açıksa
  const isSlow =
    state.effectiveType === "slow-2g" ||
    state.effectiveType === "2g" ||
    state.saveData;

  return { ...state, isSlow };
}
