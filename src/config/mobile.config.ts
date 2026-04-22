export const MOBILE_BREAKPOINT = 768;
export const MAX_PRIMARY_FIELDS = 3;
export const TOUCH_TARGET_MIN = 44;

/** Tailwind class fragments for standardized mobile list cards. */
export const MOBILE_TOKENS = {
  LIST_CARD: {
    PX: "px-3 sm:px-4",
    PY: "py-3",
    GAP: "gap-3",
    RADIUS: "rounded-xl",
    RING: "ring-1 ring-zinc-100",
  },
  TOUCH: {
    MIN: "min-h-[44px] min-w-[44px]",
  },
  AVATAR: {
    MAX: "h-12 w-12",
  },
} as const;
