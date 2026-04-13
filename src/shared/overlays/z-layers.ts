/**
 * Tek yerden overlay z-index sırası (Tailwind `z-[n]` + inline `zIndex` uyumu).
 * Üstte = daha yüksek sayı. Yeni yüzey eklerken burayı güncelle.
 */
export const OVERLAY_Z_INDEX = {
  accountPanel: 80,
  remindersMobileBackdrop: 85,
  remindersMobilePanel: 90,
  remindersDesktopPopover: 50,
  branchDetailSheet: 100,
  modal: 110,
  modalNested: 120,
  /** Mobil menü backdrop (toolbar / satır menüleri). */
  menuMobileBackdrop: 199,
  /** Komut paleti + açılır menü panelleri (aynı katman — mevcut davranış). */
  menuPanel: 200,
  globalSearch: 200,
  dateFieldBackdrop: 219,
  dateFieldPopover: 220,
} as const;

/** `className` için hazır Tailwind sınıfları — JIT bu stringleri görmeli. */
export const OVERLAY_Z_TW = {
  accountPanel: "z-[80]",
  remindersMobileBackdrop: "z-[85]",
  /** Hatırlatmalar paneli: mobil tam ekran üstü, masaüstünde header altı popover. */
  remindersPanel: "max-md:z-[90] md:z-50",
  branchDetailSheet: "z-[100]",
  modal: "z-[110]",
  modalNested: "z-[120]",
  menuMobileBackdrop: "z-[199]",
  menuPanel: "z-[200]",
  globalSearch: "z-[200]",
  dateFieldBackdrop: "z-[219]",
} as const;
