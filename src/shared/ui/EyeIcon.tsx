/** Göz — tablo satırı detay açma; depo / şube / ürün ortak tema. */
export function EyeIcon({ className }: { className?: string }) {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Trash ikon düğmesi ile aynı kutu; `Button variant="secondary"` ile kullan. */
export const detailOpenIconButtonClass =
  "!min-h-11 h-11 w-11 min-w-0 shrink-0 p-0 sm:h-11 sm:w-11 sm:!min-h-11";
