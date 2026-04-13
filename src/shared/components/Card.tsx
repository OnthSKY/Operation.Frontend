import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
};

export function Card({ children, className, title, description }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm max-sm:px-3.5 max-sm:py-3.5",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-3 max-sm:mb-2.5">
          {title && (
            <h2 className="text-[1.0625rem] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-base">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:mt-0.5 sm:text-zinc-500">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
