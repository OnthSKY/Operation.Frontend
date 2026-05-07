import {
  getVisualViewportBottomPx,
  getVisualViewportLeftPx,
  getVisualViewportTopPx,
  getVisualViewportWidthPx,
} from "@/shared/lib/visual-viewport-bottom";

export type ComboboxMenuGeom = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const LIST_MAX_PX = 208;

function clampHorizontal(left: number, width: number, margin: number): { left: number; width: number } {
  const vvLeft = getVisualViewportLeftPx();
  const vvW = getVisualViewportWidthPx();
  const innerLeft = vvLeft + margin;
  const innerRight = vvLeft + vvW - margin;
  let w = Math.min(width, Math.max(0, innerRight - innerLeft));
  let l = left;
  if (w <= 0) {
    w = Math.max(0, vvW - 2 * margin);
    l = innerLeft;
  } else {
    l = Math.min(Math.max(innerLeft, l), innerRight - w);
  }
  return { left: l, width: w };
}

export function computeComboboxMenuGeom(container: HTMLElement): ComboboxMenuGeom {
  const r = container.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const vvTop = getVisualViewportTopPx();
  const viewportBottom = getVisualViewportBottomPx();
  const preferredTop = r.bottom + gap;
  const spaceBelow = Math.max(0, viewportBottom - preferredTop - margin);
  const spaceAbove = Math.max(0, r.top - vvTop - margin - gap);

  /** Never ask for more vertical space than actually visible (avoids list under keyboard). */
  const capHeight = (px: number) => Math.min(LIST_MAX_PX, px);

  if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
    const maxHeight = capHeight(spaceBelow);
    const { left, width } = clampHorizontal(r.left, r.width, margin);
    return { top: preferredTop, left, width, maxHeight };
  }

  const maxHeight = capHeight(spaceAbove);
  const top = Math.max(vvTop + margin, r.top - maxHeight - gap);
  const { left, width } = clampHorizontal(r.left, r.width, margin);
  return { top, left, width, maxHeight };
}
