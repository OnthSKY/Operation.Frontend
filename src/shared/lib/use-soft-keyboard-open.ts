"use client";

import { useEffect, useState } from "react";

const KEYBOARD_OPEN_THRESHOLD = 120;

/**
 * Detects mobile software keyboard visibility using VisualViewport height delta.
 * UI-only helper; do not use for business logic.
 */
export function useSoftKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const delta = window.innerHeight - vv.height;
      setOpen(delta > KEYBOARD_OPEN_THRESHOLD);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return open;
}
