"use client";

import { Tooltip, type TooltipSide } from "@/shared/ui/Tooltip";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Domain terimleri için yardım balonu — küçük "i" ikonu, hover/focus/touch ile açılır.
 * Mevcut Tooltip'i sarar; form label'larının yanına konulmak üzere optimize edilmiştir.
 *
 * Kullanım:
 *   <label>
 *     Kasa devri tarafı <InfoHint content={domainHint("cashSettlementParty")} />
 *   </label>
 */
type Props = {
  content: ReactNode;
  side?: TooltipSide;
  className?: string;
  /** Erişilebilirlik etiketi (varsayılan: "Bilgi"). */
  ariaLabel?: string;
};

export function InfoHint({ content, side = "top", className, ariaLabel = "Bilgi" }: Props) {
  return (
    <Tooltip content={content} side={side} panelClassName="max-w-xs leading-relaxed">
      <button
        type="button"
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          "border border-zinc-300 bg-white text-[10px] font-semibold leading-none text-zinc-500",
          "transition-colors hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
          className
        )}
      >
        <span aria-hidden="true">i</span>
      </button>
    </Tooltip>
  );
}
