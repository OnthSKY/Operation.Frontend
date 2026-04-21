"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  lead?: ReactNode;
  /** İlk açılışta genişletilmiş */
  defaultOpen?: boolean;
  sectionClassName?: string;
  children: ReactNode;
};

export function CollapsibleInsightSection({
  title,
  lead,
  defaultOpen = true,
  sectionClassName,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId().replace(/:/g, "");
  const panelId = `branch-insight-${uid}`;

  return (
    <section className={sectionClassName}>
      <h3 className="m-0 text-sm font-semibold text-zinc-900">
        <button
          type="button"
          className="flex w-full min-h-11 touch-manipulation items-start justify-between gap-2 rounded-lg py-0.5 text-left outline-none ring-zinc-400 focus-visible:ring-2 sm:min-h-10"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 flex-1 pr-1">{title}</span>
          <span className="mt-0.5 shrink-0 tabular-nums text-zinc-400" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
      </h3>
      {open ? (
        <div id={panelId} className="mt-2 space-y-2">
          {lead != null && lead !== "" ? (
            <div className="max-w-2xl text-xs leading-relaxed text-zinc-600">{lead}</div>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}
