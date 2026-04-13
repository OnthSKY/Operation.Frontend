/**
 * Uygulama genelinde dialog / sheet / drawer / komut paleti yüzeyleri.
 * Z sırası: `OVERLAY_Z_TW` / `OVERLAY_Z_INDEX` — yeni katman önce oraya.
 */
export { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "./z-layers";
export type { ClosableOverlayProps } from "./types";
export { Modal } from "@/shared/ui/Modal";
export { RightDrawer } from "@/shared/components/RightDrawer";
export { dialogTheme } from "@/shared/theme/dialog";
