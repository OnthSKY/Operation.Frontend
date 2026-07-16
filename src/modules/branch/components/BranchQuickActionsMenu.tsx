"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ToolbarGlyphLightning } from "@/shared/ui/ToolbarGlyph";

export type QuickActionsMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  /** Leading glyph shown in a rounded chip; keep to ~18px lucide icons. */
  icon?: ReactNode;
  /** "danger" paints the tile red (destructive actions). */
  tone?: "default" | "danger";
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

const tileBaseClass =
  "group flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium shadow-sm transition-all duration-150 active:scale-[0.985]";

const toneTile = {
  default:
    "border-zinc-200/90 bg-white text-zinc-800 hover:border-violet-300 hover:bg-violet-50/70 hover:shadow-md hover:shadow-violet-500/[0.06]",
  danger:
    "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:shadow-md hover:shadow-rose-500/[0.06]",
} as const;

const toneChip = {
  default: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  danger: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
} as const;

export function BranchQuickActionsMenu({
  menuId,
  triggerLabel,
  sections,
  compact,
  fillTrigger,
  onTriggerClick,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn(fillTrigger ? "flex min-w-0 flex-1" : "inline-flex")}>
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
          aria-haspopup="dialog"
          aria-expanded={open}
          title={triggerLabel}
          onClick={(e) => {
            onTriggerClick?.(e);
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <ToolbarGlyphLightning className="h-5 w-5 shrink-0" />
          {fillTrigger ? (
            <span className="truncate text-sm font-medium">{triggerLabel}</span>
          ) : null}
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        titleId={menuId}
        title={triggerLabel}
        closeButtonLabel={triggerLabel}
        narrow
        sheetMobile
        bodyScroll
        className="lg:!max-w-[36rem] xl:!max-w-[36rem]"
      >
        <div className="flex flex-col gap-5">
          {sections.map((sec, si) => (
            <section key={si} aria-label={sec.storyTitle} className="space-y-2.5">
              <p className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {sec.storyTitle}
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sec.items.map((item) => {
                  const tone = item.tone ?? "default";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(tileBaseClass, toneTile[tone])}
                      onClick={() => {
                        item.onSelect();
                        setOpen(false);
                      }}
                    >
                      {item.icon ? (
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px]",
                            toneChip[tone]
                          )}
                          aria-hidden
                        >
                          {item.icon}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5",
                          tone === "danger" ? "text-rose-300" : "text-zinc-300 group-hover:text-zinc-400"
                        )}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
