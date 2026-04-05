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
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-zinc-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
