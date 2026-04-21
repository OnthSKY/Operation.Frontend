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

/** Artı — alt kategori ekleme vb.; EyeIcon ile aynı çizgi kalınlığı. */
export function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Takvim + onay — sigorta dönemi bitişi / kapatma. */
export function CalendarCheckIcon({ className }: { className?: string }) {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 11h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

/** Kalem — satır düzenleme; EyeIcon ile aynı çizgi kalınlığı. */
export function PencilIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

/** Şubelere paylaştırma; EyeIcon ile aynı çizgi kalınlığı. */
export function ShareAllocateIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="5" r="2" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
      <path d="M12 7v2.5l-4 8.5M12 9.5L16 17.5" />
    </svg>
  );
}

/** Paylaştırmayı geri al; EyeIcon ile aynı çizgi kalınlığı. */
export function UndoIcon({ className }: { className?: string }) {
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
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a7 7 0 1 1 0 14h-4" />
    </svg>
  );
}

/** Trash ikon düğmesi ile aynı kutu; `Button variant="secondary"` ile kullan. */
export const detailOpenIconButtonClass =
  "!min-h-11 h-11 w-11 min-w-0 shrink-0 p-0 sm:h-11 sm:w-11 sm:!min-h-11";
