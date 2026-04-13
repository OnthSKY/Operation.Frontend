"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type CheckboxProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "role" | "aria-checked" | "onClick"
> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
};

export function Checkbox({ checked, onCheckedChange, disabled, className, ...rest }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded border-2 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        checked
          ? "border-violet-600 bg-violet-600 text-white"
          : "border-zinc-300 bg-white text-transparent hover:border-zinc-400",
        disabled && "cursor-not-allowed opacity-50 hover:border-zinc-300",
        className
      )}
      {...rest}
    >
      <svg
        aria-hidden
        className="h-2.5 w-2.5"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6l2.5 2.5L9.5 3" />
      </svg>
    </button>
  );
}
