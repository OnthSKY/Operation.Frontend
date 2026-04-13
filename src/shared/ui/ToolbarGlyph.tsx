import { cn } from "@/lib/cn";

const glyph = "h-5 w-5 shrink-0";

export function ToolbarGlyphAdvance({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v7M9 20h6" />
      <path d="M17 4h3M18.5 2.5v3" />
    </svg>
  );
}

export function ToolbarGlyphUsers({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ToolbarGlyphLightning({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
    </svg>
  );
}

export function ToolbarGlyphArrowLeft({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ToolbarGlyphRefresh({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v7h-7" />
    </svg>
  );
}

export function ToolbarGlyphFolderTree({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10a2 2 0 0 0-2-2h-5l-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" />
      <path d="M6 6V4a2 2 0 0 1 2-2h4l2 2h2" />
    </svg>
  );
}

export function ToolbarGlyphUserPlus({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function ToolbarGlyphPackage({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

export function ToolbarGlyphBuilding({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12h4M14 8h4M14 12h4M14 16h4M10 22v-6h4v6" />
    </svg>
  );
}

export function ToolbarGlyphReceipt({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8M8 14h6" />
    </svg>
  );
}

export function ToolbarGlyphCoinExpense({ className }: { className?: string }) {
  return (
    <svg
      className={cn(glyph, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H14" />
    </svg>
  );
}
