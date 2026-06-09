"use client";

export function StoryCallout({ title, text }: { title: string; text: string }) {
  return (
    <div
      role="note"
      className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4"
    >
      <div className="flex items-start gap-3">
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
  );
}
