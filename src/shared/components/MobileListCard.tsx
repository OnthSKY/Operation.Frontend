import { MOBILE_TOKENS } from "@/config/mobile.config";
import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type MobileListCardTag = "article" | "div" | "li";

export type MobileListCardProps = {
  children: ReactNode;
  className?: string;
  /** Default `article` for list semantics; use `div` for interactive row shells. */
  as?: MobileListCardTag;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

const shellClass = cn(
  "min-w-0 overflow-hidden border border-zinc-200 bg-white shadow-sm",
  MOBILE_TOKENS.LIST_CARD.RADIUS,
  MOBILE_TOKENS.LIST_CARD.RING,
  MOBILE_TOKENS.LIST_CARD.PX,
  MOBILE_TOKENS.LIST_CARD.PY
);

export function MobileListCard({
  children,
  className,
  as: Comp = "article",
  ...rest
}: MobileListCardProps) {
  return (
    <Comp className={cn(shellClass, className)} {...rest}>
      {children}
    </Comp>
  );
}
