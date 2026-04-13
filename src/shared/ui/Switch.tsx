"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "role" | "aria-checked" | "onClick"
> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
};

export function Switch({ checked, onCheckedChange, disabled, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        checked ? "justify-end bg-violet-600" : "justify-start bg-zinc-300",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...rest}
    >
      <span
        aria-hidden
        className="pointer-events-none h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-zinc-900/5"
      />
    </button>
  );
}
