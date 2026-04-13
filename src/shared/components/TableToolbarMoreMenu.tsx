"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { ToolbarGlyphLightning } from "@/shared/ui/ToolbarGlyph";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";

export type TableToolbarMoreMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

type Props = {
  menuId: string;
  items: TableToolbarMoreMenuItem[];
  disabled?: boolean;
};

export function TableToolbarMoreMenu({ menuId, items, disabled }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
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
      ? Math.min(300, vw - margin * 2)
      : Math.min(260, vw - margin * 2);
    const maxHeight = Math.min(Math.floor(vh * 0.72), vh - margin * 2);

    if (narrow) {
      setPos({ top: 0, left: 0, width: menuWidth, maxHeight, centered: true });
      return;
    }
    let top = r.bottom + 6;
    let left = Math.min(r.right - menuWidth, vw - menuWidth - margin);
    left = Math.max(margin, left);
    const est = 48 * items.length + 24;
    if (top + est > vh - margin) {
      top = Math.max(margin, r.top - 6 - Math.min(est, maxHeight));
    }
    setPos({ top, left, width: menuWidth, maxHeight, centered: false });
  }, [items.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const n = e.target as Node;
      if (anchorRef.current?.contains(n) || menuRef.current?.contains(n)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  const aria = t("common.toolbarMoreActions");

  const portal =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        {pos.centered ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              "fixed inset-0 cursor-default border-0 bg-zinc-950/20 p-0 backdrop-blur-[2px] sm:hidden",
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
            "fixed overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-950/[0.04] backdrop-blur-md outline-none [-webkit-overflow-scrolling:touch]",
            OVERLAY_Z_TW.menuPanel,
            pos.centered && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
          style={
            pos.centered
              ? {
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                  paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
                }
              : {
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                }
          }
        >
          <ul className="list-none px-1 pb-0.5 sm:px-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  className={cn(
                    "touch-manipulation",
                    "flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-left text-[15px] leading-snug text-zinc-800",
                    "transition-colors hover:bg-violet-50/90 active:bg-violet-100/70",
                    "sm:min-h-9 sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-[13px]",
                    item.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent active:bg-transparent"
                  )}
                  onClick={() => {
                    if (item.disabled) return;
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
      </>,
      document.body
    );

  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className={cn(TABLE_TOOLBAR_ICON_BTN, "border-zinc-200 bg-zinc-50/90 text-zinc-800 hover:bg-zinc-100")}
          aria-label={aria}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          title={aria}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <ToolbarGlyphLightning className="h-5 w-5" />
        </Button>
      </div>
      {portal}
    </>
  );
}
