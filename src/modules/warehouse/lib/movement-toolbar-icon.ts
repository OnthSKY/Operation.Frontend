import { cn } from "@/lib/cn";
import { detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";

/** Depo hareket kartı: kare ikon, mobilde daha geniş dokunma; Button bileşenindeki w-full ile çakışmayı keser. */
export function movementToolbarIconButtonClass(extra?: string) {
  return cn(
    detailOpenIconButtonClass,
    "!w-11 !max-w-[2.75rem] shrink-0 rounded-xl touch-manipulation motion-safe:active:scale-[0.97]",
    "max-sm:!h-12 max-sm:!w-12 max-sm:!min-h-12 max-sm:!min-w-12 max-sm:!max-w-[3rem]",
    extra
  );
}
