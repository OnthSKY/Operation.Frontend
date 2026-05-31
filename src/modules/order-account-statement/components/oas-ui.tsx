import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { TrashIcon } from "@/shared/ui/TrashIcon";
import { detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";

/**
 * Order Account Statement ekranının sunum "primitive"leri: zorunlu-alan işareti,
 * kapsam/akış rozetleri, kare ikon butonları, adım görsel rozetleri ve form
 * adımı kabuğu. Hepsi prop-güdümlü, state taşımayan (StatementFormStep'in lokal
 * open state'i hariç) saf sunum bileşenleridir.
 * (OrderAccountStatementScreen.tsx'ten Faz-2 refactor kapsamında çıkarıldı.)
 */

export function RequiredMark() {
  return <span className="ml-1 font-semibold text-red-500">*</span>;
}

export function ScopePill({ kind }: { kind: "document" | "system" }) {
  if (kind === "document") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Belge
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
      Sistem
    </span>
  );
}

export function OrderAccountProductPricingIconButton({
  onClick,
  ariaLabel,
  disabled,
}: {
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800 disabled:pointer-events-none disabled:opacity-40"
      )}
      aria-label={ariaLabel}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function FlowStepPill({
  index,
  label,
  state = "todo",
}: {
  index: number;
  label: string;
  state?: "done" | "current" | "todo";
}) {
  const isCurrent = state === "current";
  const isDone = state === "done";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
        isCurrent
          ? "border-violet-300 bg-violet-50 text-violet-800"
          : isDone
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-zinc-200 bg-white text-zinc-600"
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
          isCurrent
            ? "bg-violet-600 text-white"
            : isDone
              ? "bg-emerald-600 text-white"
              : "bg-zinc-200 text-zinc-700"
        )}
      >
        {isDone ? "✓" : index}
      </span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

const oasIconSquareBtn = cn(
  detailOpenIconButtonClass,
  "!h-12 !min-h-12 !w-12 sm:!h-12 sm:!w-12 sm:!min-h-12"
);

export function OasIconButton({
  "aria-label": ariaLabel,
  title: titleProp,
  onClick,
  disabled,
  children,
  variant = "secondary",
  className,
}: {
  "aria-label": string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(oasIconSquareBtn, className)}
      onClick={onClick}
      disabled={disabled}
      title={titleProp}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

export function OasTrashButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <OasIconButton
      title={label}
      aria-label={label}
      onClick={onClick}
      className="!border-zinc-200 !text-zinc-700 hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700"
    >
      <TrashIcon className="h-6 w-6 shrink-0 text-current" />
    </OasIconButton>
  );
}

export type OasStepVisualTone = "indigo" | "emerald" | "amber" | "sky" | "violet";
export type OasStepVisualIcon = "header" | "lines" | "promo" | "paid" | "preview";

const oasStepToneClass: Record<OasStepVisualTone, string> = {
  indigo: "bg-indigo-600 shadow-md shadow-indigo-900/25 ring-1 ring-white/25",
  emerald: "bg-emerald-600 shadow-md shadow-emerald-900/25 ring-1 ring-white/25",
  amber: "bg-amber-500 shadow-md shadow-amber-900/20 ring-1 ring-white/25",
  sky: "bg-sky-600 shadow-md shadow-sky-900/25 ring-1 ring-white/25",
  violet: "bg-violet-600 shadow-md shadow-violet-900/25 ring-1 ring-white/25",
};

export function OasStepVisualGlyph({ icon, className }: { icon: OasStepVisualIcon; className?: string }) {
  const g = cn("h-6 w-6 text-white", className);
  switch (icon) {
    case "header":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0015.5 2h-11zM6 5.75A.75.75 0 016.75 5h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 5.75zm0 3.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "lines":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3.5 5h13v1.25h-13V5zm0 4.25h13v1.25h-13V9.25zm0 4.25h9v1.25h-9v-1.25z" />
        </svg>
      );
    case "promo":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M12.5 2.5a1 1 0 011 1v1.59l1.3 1.3a1 1 0 010 1.41l-6.3 6.3a1 1 0 01-.7.29H6.5a1 1 0 01-1-1v-2.3a1 1 0 01.29-.7l6.3-6.3a1 1 0 011.41 0l1.3 1.3H11.5a1 1 0 011-1zm-3 4.62L6.5 10.12V12h1.88l2.99-2.99-1.87-1.87zM4 16.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "paid":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4 5.5A1.5 1.5 0 015.5 4h9A1.5 1.5 0 0116 5.5v9A1.5 1.5 0 0114.5 16h-9A1.5 1.5 0 014 14.5v-9zm1.5 0v1.13a2.25 2.25 0 000 4.24V14h9v-3.13a2.25 2.25 0 000-4.24V5.5h-9zM7 9.25a.75.75 0 100-1.5.75.75 0 000 1.5zM9.25 10.5h3.5a.75.75 0 000-1.5h-3.5a.75.75 0 000 1.5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "preview":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M1.5 4.5A1.5 1.5 0 013 3h14a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0117 15h-4.25v1.25H14a.75.75 0 010 1.5H6a.75.75 0 010-1.5h.75V15H3A1.5 1.5 0 011.5 13.5v-9zm1.5 0v9H17v-9H3z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function OasStepVisualBadge({ tone, icon }: { tone: OasStepVisualTone; icon: OasStepVisualIcon }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12",
        oasStepToneClass[tone]
      )}
      aria-hidden
    >
      <OasStepVisualGlyph icon={icon} />
    </div>
  );
}

export function StatementFormStep({
  title,
  description,
  actions,
  children,
  collapsible,
  defaultOpen = true,
  collapseLabelExpand,
  collapseLabelCollapse,
  stepVisual,
  scopeKinds,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  collapseLabelExpand?: string;
  collapseLabelCollapse?: string;
  /** Başlık yanında renkli ikon rozeti — adımları ayırt etmek için. */
  stepVisual?: { tone: OasStepVisualTone; icon: OasStepVisualIcon };
  scopeKinds?: Array<"document" | "system">;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h2 className="text-[15px] font-bold leading-snug tracking-tight text-zinc-950">{title}</h2>
      {description ? <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{description}</p> : null}
      {scopeKinds && scopeKinds.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {scopeKinds.map((kind) => (
            <ScopePill key={kind} kind={kind} />
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.035]">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        {collapsible ? (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 sm:mt-0"
                aria-expanded={open}
                title={open ? collapseLabelCollapse : collapseLabelExpand}
                aria-label={open ? collapseLabelCollapse : collapseLabelExpand}
              >
                <svg
                  className={cn("h-5 w-5 transition-transform", open ? "rotate-0" : "-rotate-90")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {stepVisual ? <OasStepVisualBadge tone={stepVisual.tone} icon={stepVisual.icon} /> : null}
              {titleBlock}
            </div>
            {actions ? <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              {stepVisual ? <OasStepVisualBadge tone={stepVisual.tone} icon={stepVisual.icon} /> : null}
              {titleBlock}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
          </>
        )}
      </div>
      {(!collapsible || open) ? <div className="p-4 sm:p-5">{children}</div> : null}
    </section>
  );
}
