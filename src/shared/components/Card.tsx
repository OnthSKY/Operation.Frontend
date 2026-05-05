import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  /** Başlık satırında sağda; başlık ile `items-center` hizalı */
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
            <div className="flex min-h-11 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
              {title ? (
                <h2 className="min-w-0 text-base font-semibold leading-snug tracking-tight text-zinc-900 sm:flex-1 sm:text-lg md:text-xl">
                  {title}
                </h2>
              ) : (
                <div className="min-w-0 sm:flex-1" aria-hidden />
              )}
              {headerActions ? (
                <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
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
