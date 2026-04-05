import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Red asterisk next to label (visual only; use `required` attr for native validation). */
  labelRequired?: boolean;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, labelRequired, error, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex w-full flex-col gap-1">
        {label && inputId && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-zinc-700"
          >
            {label}
            {labelRequired ? (
              <span className="ml-0.5 text-red-600" aria-hidden>
                *
              </span>
            ) : null}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
