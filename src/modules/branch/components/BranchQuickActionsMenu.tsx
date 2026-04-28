"use client";

import { cn } from "@/lib/cn";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { ToolbarGlyphLightning } from "@/shared/ui/ToolbarGlyph";

export type QuickActionsMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

/** Short “story” heading above a group of actions (register, reports, etc.). */
export type QuickActionsMenuSection = {
  storyTitle: string;
  items: QuickActionsMenuItem[];
};

type Props = {
  menuId: string;
  triggerLabel: string;
  sections: QuickActionsMenuSection[];
  /** Larger tap target on narrow layouts */
  compact?: boolean;
  /** Stretch trigger to container width and show label (mobile toolbars). */
  fillTrigger?: boolean;
  onTriggerClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
};

/** Used for flip-above logic; row height matches min-h on menu items. */
function estimateMenuHeightPx(sections: QuickActionsMenuSection[]): number {
  const headerH = 22;
  const rowH = 46;
  const pad = 12;
  let h = pad;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (i > 0) h += 8;
    h += headerH;
    h += Math.max(1, sec.items.length) * rowH;
  }
  return h;
}

export function BranchQuickActionsMenu({
  menuId,
  triggerLabel,
  sections,
  compact,
  fillTrigger,
  onTriggerClick,
}: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    narrow: boolean;
    /** Mobile: panel fixed to viewport center (top/left ignored). */
    centered: boolean;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 10;
    const narrow = vw < 640;
    const menuWidth = narrow
      ? Math.min(320, vw - margin * 2)
      : Math.min(248, vw - margin * 2);

    const estimatedContent = estimateMenuHeightPx(sections);
    const viewportCap = Math.floor(vh * 0.78);

    if (narrow) {
      const maxHeight = Math.max(
        148,
        Math.min(estimatedContent + 10, viewportCap, vh - margin * 2)
      );
      setLayout({
        top: 0,
        left: 0,
        width: menuWidth,
        maxHeight,
        narrow: true,
        centered: true,
      });
      return;
    }

    let left = r.right - menuWidth;
    left = Math.max(margin, Math.min(left, vw - menuWidth - margin));

    let maxHeight = Math.min(estimatedContent + 10, viewportCap);

    const gap = 6;
    let top = r.bottom + gap;
    if (top + maxHeight > vh - margin) {
      const aboveTop = r.top - maxHeight - gap;
      if (aboveTop >= margin) {
        top = aboveTop;
      } else {
        top = margin;
        maxHeight = Math.min(maxHeight, vh - top - margin);
      }
    }
    maxHeight = Math.min(maxHeight, vh - top - margin);
    maxHeight = Math.max(148, maxHeight);

    setLayout({
      top,
      left,
      width: menuWidth,
      maxHeight,
      narrow: false,
      centered: false,
    });
  }, [sections]);

  useLayoutEffect(() => {
    if (!open) {
      setLayout(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const portal =
    open &&
    layout &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        {layout.narrow ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              "fixed inset-0 cursor-default border-0 bg-zinc-950/20 p-0 backdrop-blur-[2px] transition-opacity duration-150 sm:hidden",
              OVERLAY_Z_TW.menuMobileBackdrop
            )}
            onClick={() => setOpen(false)}
          />
        ) : null}
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={cn(
            "fixed overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-950/[0.04] backdrop-blur-md outline-none [-webkit-overflow-scrolling:touch]",
            OVERLAY_Z_TW.menuPanel,
            layout.centered && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
          style={
            layout.centered
              ? {
                  width: layout.width,
                  maxHeight: layout.maxHeight,
                  paddingBottom:
                    "max(0.5rem, env(safe-area-inset-bottom, 0px))",
                }
              : {
                  top: layout.top,
                  left: layout.left,
                  width: layout.width,
                  maxHeight: layout.maxHeight,
                  paddingBottom: "0.375rem",
                }
          }
        >
          {sections.map((sec, si) => (
            <div
              key={si}
              role="group"
              aria-label={sec.storyTitle}
              className={cn(si > 0 && "mt-1.5 border-t border-zinc-100/90 pt-1.5")}
            >
              <p className="px-3 pb-0.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:px-2.5 sm:text-[11px] sm:tracking-wide">
                {sec.storyTitle}
              </p>
              <ul className="list-none px-1 pb-0.5 sm:px-1">
                {sec.items.map((item) => (
                  <li key={item.id}>
                    <button
                      role="menuitem"
                      type="button"
                      className={cn(
                        "touch-manipulation",
                        "flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-left text-[15px] leading-snug text-zinc-800 antialiased",
                        "transition-[background-color,transform] duration-150 active:scale-[0.99] sm:active:scale-100",
                        "hover:bg-violet-50/90 active:bg-violet-100/70",
                        "sm:min-h-[44px] sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-[13px] sm:leading-normal"
                      )}
                      onClick={() => {
                        item.onSelect();
                        setOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </>,
      document.body
    );

  return (
    <>
      <div
        ref={anchorRef}
        className={cn(fillTrigger ? "flex min-w-0 flex-1" : "inline-flex")}
      >
        <Button
          type="button"
          variant="secondary"
          className={cn(
            detailOpenIconButtonClass,
            "border-zinc-200 bg-zinc-50/90 text-zinc-800 hover:border-violet-200 hover:bg-violet-50",
            compact && !fillTrigger && "min-h-11 min-w-11",
            fillTrigger && "min-h-11 w-full min-w-0 justify-center gap-2 px-3"
          )}
          aria-label={triggerLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          title={triggerLabel}
          onClick={(e) => {
            onTriggerClick?.(e);
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <ToolbarGlyphLightning className="h-5 w-5 shrink-0" />
          {fillTrigger ? (
            <span className="truncate text-sm font-medium">{triggerLabel}</span>
          ) : null}
        </Button>
      </div>
      {portal}
    </>
  );
}
