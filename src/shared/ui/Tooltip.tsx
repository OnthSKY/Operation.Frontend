"use client";

import { cn } from "@/lib/cn";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type TooltipSide = "top" | "bottom";

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  /** Hover / generic pointer delay before opening (ms). Focus opens immediately. */
  delayMs?: number;
  className?: string;
  /** When true, only `children` are rendered. */
  disabled?: boolean;
};

function isEmptyContent(content: ReactNode): boolean {
  if (content == null) return true;
  if (typeof content === "string") return content.trim() === "";
  return false;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 280,
  className,
  disabled,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  }>({ top: 0, left: 0, placement: "top" });

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = null;
  }, []);

  const measureAndPlace = useCallback(() => {
    const tEl = triggerRef.current;
    const tipEl = tooltipRef.current;
    if (!tEl || !tipEl) return;
    const rect = tEl.getBoundingClientRect();
    const tw = tipEl.offsetWidth;
    const th = tipEl.offsetHeight;
    const gap = 8;
    const pad = 8;

    let placement: "top" | "bottom" = side === "bottom" ? "bottom" : "top";
    let top = placement === "top" ? rect.top - gap : rect.bottom + gap;

    if (placement === "top" && rect.top < th + pad) {
      placement = "bottom";
      top = rect.bottom + gap;
    } else if (
      placement === "bottom" &&
      window.innerHeight - rect.bottom < th + pad
    ) {
      placement = "top";
      top = rect.top - gap;
    }

    let left = rect.left + rect.width / 2;
    left = Math.max(
      tw / 2 + pad,
      Math.min(left, window.innerWidth - tw / 2 - pad)
    );

    setCoords({ top, left, placement });
    setPlaced(true);
  }, [side]);

  useLayoutEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }
    measureAndPlace();
  }, [open, content, measureAndPlace]);

  useEffect(() => {
    if (!open) return;
    const handler = () => measureAndPlace();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, measureAndPlace]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  const show = useCallback(
    (immediate: boolean) => {
      clearShowTimer();
      if (disabled || isEmptyContent(content)) return;
      setPlaced(false);
      const run = () => setOpen(true);
      if (immediate) run();
      else showTimer.current = setTimeout(run, delayMs);
    },
    [clearShowTimer, content, delayMs, disabled]
  );

  const hide = useCallback(() => {
    clearShowTimer();
    setOpen(false);
    setPlaced(false);
  }, [clearShowTimer]);

  if (disabled || isEmptyContent(content)) {
    return <>{children}</>;
  }

  const transform =
    coords.placement === "top"
      ? "translate(-50%, -100%)"
      : "translate(-50%, 0)";

  const portal =
    mounted &&
    open &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none fixed z-[9998] max-w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-zinc-700/50 bg-zinc-900/96 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.12] backdrop-blur-md motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-reduce:transition-none",
          placed ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-[0.97]"
        )}
        style={{
          top: coords.top,
          left: coords.left,
          transform,
        }}
      >
        {content}
      </div>,
      document.body
    );

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("inline-flex max-w-full", className)}
        onPointerEnter={(e) => {
          if (e.pointerType === "touch") return;
          show(false);
        }}
        onPointerLeave={hide}
        onFocusCapture={() => show(true)}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {portal}
    </>
  );
}
