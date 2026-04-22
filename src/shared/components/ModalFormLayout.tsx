"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type ModalFormLayoutProps = {
  header?: ReactNode;
  body: ReactNode;
  footer: ReactNode;
  className?: string;
};

type FormSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ModalFormLayout({ header, body, footer, className }: ModalFormLayoutProps) {
  return (
    <div className={cn("mt-4 flex min-h-0 flex-col space-y-4", className)}>
      {header != null ? <div className="shrink-0">{header}</div> : null}
      <div className="min-h-0 flex-1 space-y-4">{body}</div>
      <div className="shrink-0 border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title != null ? <h3 className="text-sm font-semibold text-zinc-900">{title}</h3> : null}
      {description != null ? <p className="text-xs leading-relaxed text-zinc-500">{description}</p> : null}
      {children}
    </section>
  );
}
