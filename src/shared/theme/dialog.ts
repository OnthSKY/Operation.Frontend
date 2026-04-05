/**
 * Single place to tune dialog / modal visuals (backdrop, panel, typography).
 */
export const dialogTheme = {
  backdrop:
    "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center",
  panel:
    "w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-6",
  headerRow: "flex items-start justify-between gap-3",
  headerText: "min-w-0 flex-1",
  title: "text-lg font-semibold text-zinc-900",
  description: "mt-1 text-sm text-zinc-500",
  closeButton:
    "-mr-1 -mt-1 flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
} as const;
