import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";

/**
 * Single place to tune dialog / modal visuals (backdrop, panel, typography).
 */
export const dialogTheme = {
  backdrop: `fixed inset-0 ${OVERLAY_Z_TW.modal} flex items-start justify-center bg-black/45 p-2 pt-[max(0.65rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:p-4 lg:p-6 xl:p-8`,
  panel:
    "max-h-[min(92dvh,calc(100svh-max(env(safe-area-inset-top),0.5rem)-max(env(safe-area-inset-bottom),0.5rem)-0.5rem))] w-full max-w-[min(30rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xl shadow-zinc-900/12 ring-1 ring-zinc-900/[0.04] sm:max-w-md sm:p-6 md:max-w-lg lg:max-w-3xl xl:max-w-5xl 2xl:max-w-6xl xl:p-8",
  /** OTP / küçük formlar: tüm kırılımlarda dar, mobil alt hizaya uyumlu. */
  narrowPanel:
    "max-h-[min(96dvh,calc(100svh-max(env(safe-area-inset-top),0.25rem)-max(env(safe-area-inset-bottom),0.25rem)-0.5rem))] w-full max-w-[min(24rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-t-[1.35rem] rounded-b-2xl border border-zinc-200/90 bg-white px-5 pt-5 shadow-2xl shadow-zinc-950/12 ring-1 ring-zinc-950/[0.04] pb-[max(1.25rem,env(safe-area-inset-bottom,0.75rem))] sm:max-w-[min(28rem,calc(100vw-1.5rem))] sm:rounded-2xl sm:p-6 sm:pb-6 lg:max-w-[min(44rem,calc(100vw-3rem))] xl:max-w-[min(52rem,calc(100vw-4rem))]",
  headerRow: "flex items-start justify-between gap-3",
  headerText: "min-w-0 flex-1",
  title: "text-lg font-semibold text-zinc-900 lg:text-xl",
  description: "mt-1 text-sm text-zinc-500 lg:text-base",
  closeButton:
    "-mr-1 -mt-1 flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
} as const;
