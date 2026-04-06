/**
 * Single place to tune dialog / modal visuals (backdrop, panel, typography).
 */
export const dialogTheme = {
  backdrop:
    "fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4 sm:pb-4 lg:p-6 lg:pb-6 xl:p-8 xl:pb-8",
  panel:
    "w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-6 md:max-w-lg lg:max-w-2xl xl:max-w-4xl xl:p-8",
  headerRow: "flex items-start justify-between gap-3",
  headerText: "min-w-0 flex-1",
  title: "text-lg font-semibold text-zinc-900 lg:text-xl",
  description: "mt-1 text-sm text-zinc-500 lg:text-base",
  closeButton:
    "-mr-1 -mt-1 flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
} as const;
