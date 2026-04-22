"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type FilterChip = {
  id: string;
  label: string;
  onRemove?: () => void;
};

type FilterDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: ReactNode;
  chips?: FilterChip[];
  className?: string;
};

export function FilterDrawer({
  open,
  title,
  onClose,
  onApply,
  onReset,
  children,
  chips = [],
  className,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn(
                "min-h-8 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700",
                chip.onRemove ? "pr-2" : undefined
              )}
              onClick={chip.onRemove}
              disabled={!chip.onRemove}
            >
              {chip.label}
              {chip.onRemove ? <span className="ml-1 text-zinc-500">×</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {!open
        ? null
        : createPortal(
            <div className="fixed inset-0 z-[90]" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-zinc-900/40"
                aria-label="Close filters"
                onClick={onClose}
              />
              <section
                role="dialog"
                aria-modal="true"
                className={cn(
                  "absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-zinc-200 bg-white",
                  className
                )}
              >
                <header className="border-b border-zinc-100 px-4 py-3">
                  <p className="text-base font-semibold text-zinc-900">{title}</p>
                </header>
                <div className="max-h-[calc(85dvh-8rem)] overflow-y-auto px-4 py-3">{children}</div>
                <footer className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3">
                  <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={onReset}>
                    Sifirla
                  </Button>
                  <Button type="button" className="min-h-11 w-full" onClick={onApply}>
                    Uygula
                  </Button>
                </footer>
              </section>
            </div>,
            document.body
          )}
    </>
  );
}
