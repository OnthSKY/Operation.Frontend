"use client";

import { TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const titleId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !drawerRef.current) return;

    const root = drawerRef.current;
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute("disabled")
    );
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-label={chip.onRemove ? `${chip.label} filtresini kaldir` : chip.label}
              className={cn(
                "min-h-8 max-w-full rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700",
                chip.onRemove ? "pr-2" : undefined
              )}
              onClick={chip.onRemove}
              disabled={!chip.onRemove}
            >
              <span className="break-words">{chip.label}</span>
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
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn(
                  "absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-zinc-200 bg-white",
                  className
                )}
              >
                <header className="border-b border-zinc-100 px-4 py-3">
                  <p id={titleId} className="text-base font-semibold text-zinc-900">
                    {title}
                  </p>
                </header>
                <div className="max-h-[calc(85dvh-8rem)] overflow-y-auto px-4 py-3">{children}</div>
                <footer className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    aria-label="Filtreleri sifirla"
                    onClick={onReset}
                  >
                    Sifirla
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    aria-label="Filtreleri uygula"
                    onClick={onApply}
                  >
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
