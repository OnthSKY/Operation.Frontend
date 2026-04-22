import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {title}
        </h1>
        {description != null ? (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{description}</p>
        ) : null}
      </div>
      {actions != null ? <div className="flex w-full gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}
