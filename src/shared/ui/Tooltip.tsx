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

export type TooltipSide = "top" | "bottom" | "right";

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  /** Hover / generic pointer delay before opening (ms). Focus opens immediately. */
  delayMs?: number;
  className?: string;
  /** Extra classes for the floating tooltip panel (e.g. wider max-width). */
  panelClassName?: string;
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
  panelClassName,
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
    placement: "top" | "bottom" | "right";
  }>({ top: 0, left: 0, placement: "top" });

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = null;
  }, []);

  const clearTouchHideTimer = useCallback(() => {
    if (touchHideTimer.current) clearTimeout(touchHideTimer.current);
    touchHideTimer.current = null;
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

    let placement: "top" | "bottom" | "right" = side === "right" ? "right" : side === "bottom" ? "bottom" : "top";
    let top = placement === "top" ? rect.top - gap : placement === "bottom" ? rect.bottom + gap : rect.top + rect.height / 2;
    let left = placement === "right" ? rect.right + gap : rect.left + rect.width / 2;

    if (placement === "right") {
      if (window.innerWidth - rect.right < tw + pad) {
        placement = "top";
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
      } else {
        top = Math.max(th / 2 + pad, Math.min(top, window.innerHeight - th / 2 - pad));
      }
    }

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

    if (placement !== "right") {
      left = Math.max(
        tw / 2 + pad,
        Math.min(left, window.innerWidth - tw / 2 - pad)
      );
    }

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

  useEffect(
    () => () => {
      clearShowTimer();
      clearTouchHideTimer();
    },
    [clearShowTimer, clearTouchHideTimer]
  );

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
    clearTouchHideTimer();
    setOpen(false);
    setPlaced(false);
  }, [clearShowTimer, clearTouchHideTimer]);

  const scheduleTouchAutoHide = useCallback(() => {
    clearTouchHideTimer();
    touchHideTimer.current = setTimeout(() => {
      touchHideTimer.current = null;
      setOpen(false);
      setPlaced(false);
    }, 2200);
  }, [clearTouchHideTimer]);

  if (disabled || isEmptyContent(content)) {
    return <>{children}</>;
  }

  const transform =
    coords.placement === "top"
      ? "translate(-50%, -100%)"
      : coords.placement === "bottom"
        ? "translate(-50%, 0)"
        : "translate(0, -50%)";

  const arrowClass =
    coords.placement === "top"
      ? "left-1/2 top-full -translate-x-1/2 border-x-4 border-t-0 border-b-0 border-transparent border-t-zinc-900/96"
      : coords.placement === "bottom"
        ? "left-1/2 bottom-full -translate-x-1/2 border-x-4 border-b-0 border-t-0 border-transparent border-b-zinc-900/96"
        : "right-full top-1/2 -translate-y-1/2 border-y-4 border-l-0 border-r-0 border-transparent border-r-zinc-900/96";

  const portal =
    mounted &&
    open &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none fixed z-[9998] max-w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-zinc-700/45 bg-zinc-900/92 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-[0_18px_50px_-14px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.14] backdrop-blur-xl motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-reduce:transition-none",
          panelClassName,
          placed ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-[0.97]"
        )}
        style={{
          top: coords.top,
          left: coords.left,
          transform,
        }}
      >
        <span
          className={cn("absolute h-0 w-0 border-solid", arrowClass)}
          aria-hidden
        />
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
          if (e.pointerType === "touch" || e.pointerType === "pen") return;
          show(false);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") return;
          hide();
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          if (disabled || isEmptyContent(content)) return;
          clearShowTimer();
          clearTouchHideTimer();
          setPlaced(false);
          setOpen(true);
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          scheduleTouchAutoHide();
        }}
        onPointerCancel={(e) => {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          hide();
        }}
        onFocusCapture={() => show(true)}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {portal}
    </>
  );
}
