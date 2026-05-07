/**
 * Bottom Y of the visible viewport in client coordinates (layout viewport origin).
 * On mobile, `window.innerHeight` often does not shrink when the on-screen keyboard opens;
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API Visual Viewport}
 * reflects the area above the keyboard.
 */
export function getVisualViewportBottomPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height;
  return window.innerHeight;
}

/** Top Y of the visible viewport (useful when the browser UI shifts `offsetTop`). */
export function getVisualViewportTopPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop;
  return 0;
}

/** Left X of the visible viewport (pinch-zoom / horizontal inset). */
export function getVisualViewportLeftPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv) return vv.offsetLeft;
  return 0;
}

/** Visible height in CSS pixels (keyboard-aware on mobile). */
export function getVisualViewportHeightPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv) return vv.height;
  return window.innerHeight;
}

/** Visible width (pinch-zoom / split view aware when supported). */
export function getVisualViewportWidthPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (vv) return vv.width;
  return window.innerWidth;
}
