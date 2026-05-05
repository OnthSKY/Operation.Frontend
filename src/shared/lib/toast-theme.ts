/**
 * Toastify kartları — tek tema (genişlik, köşe, gölge, yüzey).
 * AppToastify, notify-confirm-toast, notify-error-with-action burayı kullanır.
 */

/** Mobil önce genişlik; masaüstünde orta boy kart */
export const toastCardWidth =
  "!w-[min(100vw-1rem,22rem)] !max-w-[min(100vw-1rem,22rem)] sm:!w-auto sm:!max-w-md";

export const toastCardPaddingRadiusShadow =
  "!rounded-2xl !p-3 sm:!p-4 !shadow-lg !shadow-zinc-900/10 !font-sans";

/** success / error / info — Toastify renkli gövde */
export const toastColoredBodyLayout = "!min-h-0 !items-start !gap-3 !text-sm !ring-1 !ring-black/10";

/** AppToastify `toastClassName` */
export const toastColoredToastClassName = [
  toastCardWidth,
  toastCardPaddingRadiusShadow,
  toastColoredBodyLayout,
].join(" ");

/** Beyaz kart tabanı */
export const toastSurfaceNeutral = "!bg-white !text-zinc-900 !ring-1 !ring-zinc-900/10";

/** Onay uyarısı — amber şerit, yine beyaz kart */
export const toastSurfaceWarning = `${toastSurfaceNeutral} !border-l-[3px] !border-l-amber-500`;

/** Hata + aksiyon kartı */
export const toastSurfaceDanger = "!bg-white !text-zinc-900 !ring-1 !ring-red-200/90";

/** Alt konumda narrow layout — safe area */
export const toastSafeBottomMobile = "!mb-[max(0.75rem,env(safe-area-inset-bottom,0px))]";
