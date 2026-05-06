import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  /** Başlık satırında sağda; dar ekranda başlık solda, aksiyonlar sağda tek satır */
  headerActions?: ReactNode;
};

export function Card({ children, className, title, description, headerActions }: CardProps) {
  const hasHeader = title || description || headerActions;

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4 md:p-5",
        className
      )}
    >
      {hasHeader ? (
        <div className="mb-3 max-sm:mb-2.5">
          {(title || headerActions) && (
            <div
              className={cn(
                "flex min-h-11 flex-row items-start justify-between gap-x-2 sm:items-center sm:gap-x-3",
                headerActions ? "flex-nowrap gap-y-0" : "flex-wrap gap-y-2"
              )}
            >
              {title ? (
                <h2
                  className={cn(
                    "min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg md:text-xl",
                    headerActions ? "truncate" : undefined
                  )}
                >
                  {title}
                </h2>
              ) : (
                <div className="min-w-0 flex-1" aria-hidden />
              )}
              {headerActions ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {headerActions}
                </div>
              ) : null}
            </div>
          )}
          {description ? (
            <p
              className={cn(
                "text-xs leading-5 text-zinc-600 sm:text-sm sm:leading-6 sm:text-zinc-500 md:text-base",
                title || headerActions ? "mt-1 sm:mt-0.5" : ""
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
