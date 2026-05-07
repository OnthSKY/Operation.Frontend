const MOBILE_MAX_W_PX = 640;

/**
 * On narrow viewports, nudge the anchor into the visible viewport so fixed overlays
 * (combobox, date picker) sit above the soft keyboard when possible.
 */
export function scrollOverlayAnchorIntoView(anchor: HTMLElement | null): void {
  if (!anchor || typeof window === "undefined") return;
  try {
    if (!window.matchMedia(`(max-width: ${MOBILE_MAX_W_PX}px)`).matches) return;
  } catch {
    return;
  }
  anchor.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "auto",
  });
}
