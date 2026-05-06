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
