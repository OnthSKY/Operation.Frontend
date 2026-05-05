"use client";

import { useEffect, useRef, useState } from "react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Kalan süre oranı 1 → 0 (Toastify autoClose ile senkron). */
function useToastRemainingProgress(isPaused: boolean, autoCloseMs: number) {
  const [progress, setProgress] = useState(1);
  const rRef = useRef(autoCloseMs);
  const lastRef = useRef(Date.now());

  useEffect(() => {
    rRef.current = autoCloseMs;
    lastRef.current = Date.now();
    setProgress(autoCloseMs <= 0 ? 0 : 1);
  }, [autoCloseMs]);

  useEffect(() => {
    lastRef.current = Date.now();
  }, [isPaused]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (!isPaused) {
        rRef.current = Math.max(0, rRef.current - dt);
      }
      const p = autoCloseMs <= 0 ? 0 : Math.min(1, Math.max(0, rRef.current / autoCloseMs));
      setProgress(p);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isPaused, autoCloseMs]);

  return progress;
}

const TIMER_SIZE = 36;
const TIMER_STROKE = 2.5;
const TIMER_R = (TIMER_SIZE - TIMER_STROKE) / 2;
const TIMER_C = 2 * Math.PI * TIMER_R;

export function NotifyTimerBadge({
  isPaused,
  autoCloseMs,
  className = "",
  /** Tinted Toastify arka planları (success/error/info); açık kartlar için `light`. */
  surface = "tinted",
}: {
  isPaused: boolean;
  autoCloseMs: number;
  className?: string;
  surface?: "tinted" | "light";
}) {
  const reducedMotion = usePrefersReducedMotion();
  const progress = useToastRemainingProgress(isPaused, autoCloseMs);
  const secondsRemaining = Math.max(0, Math.ceil((progress * autoCloseMs) / 1000));

  const trackClass = surface === "light" ? "stroke-zinc-300/80" : "stroke-white/35";
  const fgClass = surface === "light" ? "stroke-zinc-800" : "stroke-white";

  if (reducedMotion) {
    return (
      <span
        className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums ${
          surface === "light"
            ? "border border-zinc-300/90 bg-zinc-100 text-zinc-800"
            : "border border-white/35 bg-white/15 text-white"
        } ${className}`}
        aria-label={`${secondsRemaining} seconds remaining`}
      >
        {secondsRemaining}s
      </span>
    );
  }

  const dashOffset = TIMER_C * (1 - progress);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      aria-label={`${secondsRemaining} seconds remaining`}
      role="img"
    >
      <svg
        width={TIMER_SIZE}
        height={TIMER_SIZE}
        viewBox={`0 0 ${TIMER_SIZE} ${TIMER_SIZE}`}
        className="block shrink-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={TIMER_R}
          fill="none"
          className={trackClass}
          strokeWidth={TIMER_STROKE}
        />
        <circle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={TIMER_R}
          fill="none"
          className={fgClass}
          strokeWidth={TIMER_STROKE}
          strokeLinecap="round"
          strokeDasharray={TIMER_C}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </span>
  );
}

export function NotifyTimedMessage({
  message,
  isPaused,
  autoCloseMs,
}: {
  message: string;
  isPaused: boolean;
  autoCloseMs: number;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2.5 sm:gap-3">
      <p className="min-w-0 flex-1 hyphens-auto text-sm leading-snug sm:text-[0.9375rem]">
        {message}
      </p>
      <NotifyTimerBadge
        isPaused={isPaused}
        autoCloseMs={autoCloseMs}
        surface="tinted"
        className="pt-0.5"
      />
    </div>
  );
}
