"use client";

import { useEffect, useRef, useState } from "react";

export function StoryCallout({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative ml-auto inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={title}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50/70 text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8.5h.01M11 12h1v4.5h1" />
        </svg>
      </button>
      <div
        role="dialog"
        aria-hidden={!open}
        className={`absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-blue-100 bg-white p-3 shadow-xl shadow-blue-900/[0.08] ring-1 ring-blue-100/60 transition duration-150 ease-out sm:p-4 ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
          >
            i
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-900/80 sm:text-sm">
              {text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
