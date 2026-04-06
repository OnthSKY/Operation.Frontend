"use client";

import { useSyncExternalStore } from "react";

/** `true` when viewport ≥ breakpoint (px). SSR / first paint: `false`. */
export function useMediaMinWidth(minWidth: number): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(min-width: ${minWidth}px)`).matches,
    () => false
  );
}
