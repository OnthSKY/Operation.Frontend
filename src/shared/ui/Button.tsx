"use client";

import { cn } from "@/lib/cn";
import {
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm shadow-zinc-900/10 hover:bg-zinc-800 hover:shadow-md hover:shadow-zinc-900/15 active:bg-zinc-950 disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 shadow-sm shadow-zinc-900/5 hover:bg-zinc-50 hover:shadow-md hover:shadow-zinc-900/10 active:bg-zinc-100 disabled:opacity-50 disabled:shadow-none",
  ghost:
    "text-zinc-700 shadow-none hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50",
};

const SYNC_BUSY_MS = 450;
const SUBMIT_GUARD_MS = 1200;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const [busy, setBusy] = useState(false);
  const guardRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled || guardRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      guardRef.current = true;

      // Native <form> submit: do not setBusy → avoids disabled={true} before the browser's
      // default submit runs (React 18 flushes updates after this handler and cancels submit).
      if (type === "submit" && !onClick) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = null;
          guardRef.current = false;
        }, SUBMIT_GUARD_MS);
        return;
      }

      setBusy(true);

      const release = () => {
        guardRef.current = false;
        setBusy(false);
      };

      if (onClick) {
        try {
          const result = onClick(e);
          if (result != null && typeof (result as Promise<unknown>).then === "function") {
            void (result as Promise<unknown>).finally(release);
          } else {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(() => {
              syncTimerRef.current = null;
              release();
            }, SYNC_BUSY_MS);
          }
        } catch {
          release();
        }
        return;
      }

      release();
    },
    [disabled, onClick, type]
  );

  const mergedDisabled = Boolean(disabled) || busy;
  const showBusyStyle = busy && !disabled;

  return (
    <button
      {...rest}
      type={type}
      className={cn(
        "relative inline-flex w-full touch-manipulation select-none items-center justify-center overflow-hidden rounded-lg font-medium",
        "min-h-11 px-3.5 py-2 text-sm sm:min-h-12 sm:px-4 sm:py-2.5 sm:text-base md:px-5",
        "sm:w-auto",
        "transition-[transform,box-shadow,opacity,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-opacity motion-reduce:duration-150 motion-reduce:ease-linear",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "active:transition-[transform,box-shadow] active:duration-100",
        "motion-safe:active:scale-[0.98] max-sm:motion-safe:active:scale-[0.96] motion-reduce:active:scale-100",
        "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.01]",
        variants[variant],
        showBusyStyle &&
          "pointer-events-none cursor-wait motion-safe:animate-[ui-button-busy_1.05s_cubic-bezier(0.45,0,0.55,1)_infinite] motion-reduce:animate-[ui-button-busy_1.4s_ease-in-out_infinite]",
        className
      )}
      disabled={mergedDisabled}
      onClick={handleClick}
      aria-busy={showBusyStyle || undefined}
    >
      {children}
    </button>
  );
}
