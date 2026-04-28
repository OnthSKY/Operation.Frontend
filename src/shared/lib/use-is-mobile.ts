"use client";

import { MOBILE_BREAKPOINT } from "@/config/mobile.config";
import { useMediaMinWidth } from "./use-media-min-width";

/**
 * UI-only viewport helper.
 * Returns true below the configured mobile breakpoint.
 */
export function useIsMobile(): boolean {
  return !useMediaMinWidth(MOBILE_BREAKPOINT);
}
