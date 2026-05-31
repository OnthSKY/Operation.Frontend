import { cn } from "@/lib/cn";

/**
 * Order Account Statement ekranına özel inline SVG ikonları.
 * Saf, state'siz sunum bileşenleri — yalnızca `className` alır.
 * (OrderAccountStatementScreen.tsx'ten Faz-1 refactor kapsamında çıkarıldı.)
 */

export function IcChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 001.06.02l4.5-4.25a.75.75 0 000-1.08l-4.5-4.25a.75.75 0 10-1.04 1.08L11.1 10l-3.93 3.75a.75.75 0 00.04 1.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.22 12.22a.75.75 0 001.06 0L10 8.56l3.72 3.66a.75.75 0 001.06-1.07l-4.25-4.18a.75.75 0 00-1.06 0l-4.25 4.18a.75.75 0 010 1.07z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0L3.29 10.06a.75.75 0 111.06-1.06L9.2 14.2l5.45-5.45a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2.5 5.5v9A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-9L10 1.5 2.5 5.5zm7.5 6.2l6.1-2.3v1.1L10 13.3 1.4 9.1V8l6.1 2.2z" />
    </svg>
  );
}

export function IcScale({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 2.5h16V5H2V2.5zm.75 3.25H6V9a4 4 0 108 0V5.75h3.25V5H2.75v.75zM3.5 18h1.2l1-4H5a2.5 2.5 0 00-1.5 4zm12.2 0h-1.2a2.5 2.5 0 001.5-4H15l-1 4H15.7z" />
    </svg>
  );
}

export function IcX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M4.3 4.3a.75.75 0 011.06 0L10 8.94l4.64-4.64a.75.75 0 111.06 1.06L11.06 10l4.64 4.64a.75.75 0 01-1.06 1.06L10 11.06l-4.64 4.64a.75.75 0 11-1.06-1.06L8.94 10 4.3 5.36a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3.5 12.5a.75.75 0 011.5 0V15A.5.5 0 005.5 16h9a.5.5 0 00.5-.5v-2.5a.75.75 0 011.5 0V15A2 2 0 0114.5 18h-9A2 2 0 013.5 15v-2.5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M9.25 1.5a.75.75 0 011.5 0V10a.75.75 0 11-1.5 0V1.5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 4.75a.75.75 0 0 1 1.13-.65l8 4.75a.75.75 0 0 1 0 1.3l-8 4.75A.75.75 0 0 1 6 14.25v-9.5Z" />
    </svg>
  );
}

export function IcMaximize({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" strokeWidth="1.8" />
      <path d="M10 10l-4-4M6 6h4M6 6v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10l4-4M18 6h-4M18 6v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14l-4 4M6 18h4M6 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 14l4 4M18 18h-4M18 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcWand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 18l1.2-1.2 1.1.15 3.1-3.1-.6-1.1L2 3.1 3.1 2l8.6 3.4 1.1-.4 2.1 2.1-.4 1.1L18 16.2l-1.2 1-6.1-1.1-1.1 1-2.1-1.1z" />
    </svg>
  );
}

export function IcEraser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3.2 9.1a2 2 0 010-2.8L6.1 3.2a1 1 0 011.4 0l3.1 3.1L6.1 10.5 3.2 9.1zM4.2 7.1l2.6 1.1 1.1-1.1L4.1 3.2 3 4.2l3.1 2.1v.8zm8.1 1.1l-2.5 2.4v2.7h-3l-1.5 1.5H17v-2H9.1l.6-.5 2.6-2.4-1.1-1.1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IcCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 2.75A2.25 2.25 0 003.75 5v8A2.25 2.25 0 006 15.25h8A2.25 2.25 0 0016.25 13V5A2.25 2.25 0 0014 2.75H6zm0 1.5h8c.414 0 .75.336.75.75v8a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V5c0-.414.336-.75.75-.75z" />
      <path d="M3.5 5.75a.75.75 0 01.75.75v8.25c0 .69.56 1.25 1.25 1.25h8.25a.75.75 0 010 1.5H5.5A2.75 2.75 0 012.75 14.75V6.5a.75.75 0 01.75-.75z" />
    </svg>
  );
}

export function IcLoader({ className }: { className?: string }) {
  return (
    <svg
      className={cn("motion-safe:animate-spin", className)}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle className="opacity-25" cx="10" cy="10" r="8" />
      <path className="opacity-90" d="M10 2a8 8 0 018 8" strokeLinecap="round" />
    </svg>
  );
}
