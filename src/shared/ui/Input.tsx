import { cn } from "@/lib/cn";
import { forwardRef, useId, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Red asterisk next to label (visual only; use `required` attr for native validation). */
  labelRequired?: boolean;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, name, label, labelRequired, error, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? name ?? autoId;
    const hasError = error != null && String(error).length > 0;
    const errorText = String(error ?? "").trim();
    return (
      <div className="flex w-full min-w-0 flex-col gap-1">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-zinc-700"
          >
            {label}
            {labelRequired ? (
              <span className="ml-0.5 font-semibold text-red-600" aria-hidden>
                *
              </span>
            ) : null}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          name={name}
          aria-required={labelRequired ? true : undefined}
          className={cn(
            "h-10 min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2 sm:h-11 sm:text-base md:h-12",
            hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {errorText ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
