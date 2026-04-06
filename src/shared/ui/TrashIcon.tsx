/** Çöp kutusu — tablo satırı silme; personel / ürün vb. ortak tema. */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

/** Personel ekranındaki sil ikon düğmesi ile aynı boyut/hover. */
export const trashIconActionButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:pointer-events-none disabled:opacity-40";
