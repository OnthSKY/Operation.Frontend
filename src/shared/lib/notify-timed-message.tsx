"use client";

import { useEffect, useRef, useState } from "react";

function useToastRemainingSeconds(isPaused: boolean, autoCloseMs: number) {
  const [seconds, setSeconds] = useState(() => Math.ceil(autoCloseMs / 1000));
  const rRef = useRef(autoCloseMs);
  const lastRef = useRef(Date.now());

  useEffect(() => {
    rRef.current = autoCloseMs;
    lastRef.current = Date.now();
    setSeconds(Math.max(0, Math.ceil(autoCloseMs / 1000)));
  }, [autoCloseMs]);

  useEffect(() => {
    lastRef.current = Date.now();
  }, [isPaused]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (!isPaused) {
        rRef.current = Math.max(0, rRef.current - dt);
      }
      setSeconds(Math.max(0, Math.ceil(rRef.current / 1000)));
    }, 200);
    return () => window.clearInterval(id);
  }, [isPaused]);

  return seconds;
}

export function NotifyTimerBadge({
  isPaused,
  autoCloseMs,
  className = "",
}: {
  isPaused: boolean;
  autoCloseMs: number;
  className?: string;
}) {
  const seconds = useToastRemainingSeconds(isPaused, autoCloseMs);
  return (
    <span
      className={`inline-flex min-w-[2.25rem] justify-center rounded-md bg-zinc-900/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-800 ${className}`}
      aria-label={`${seconds} seconds remaining`}
    >
      {seconds}s
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
    <div className="flex w-full min-w-0 items-start gap-3">
      <p className="min-w-0 flex-1 text-[0.9375rem] leading-snug">{message}</p>
      <NotifyTimerBadge isPaused={isPaused} autoCloseMs={autoCloseMs} className="shrink-0" />
    </div>
  );
}
