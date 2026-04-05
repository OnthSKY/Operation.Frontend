import { cn } from "@/lib/cn";
import { forwardRef, type SelectHTMLAttributes } from "react";

export type SelectOption = { value: string; label: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: SelectOption[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, label, error, options, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex w-full flex-col gap-1">
        {label && selectId && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-zinc-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
