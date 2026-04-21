"use client";

import { cn } from "@/lib/cn";
import {
  createContext,
  useContext,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";

const MobileCardsContext = createContext(true);

export function Table({
  className,
  mobileCards = true,
  ...props
}: HTMLAttributes<HTMLTableElement> & { mobileCards?: boolean }) {
  return (
    <MobileCardsContext.Provider value={mobileCards}>
      <div
        data-table-mobile-cards={mobileCards ? true : undefined}
        className={cn(
          "w-full overflow-x-auto overscroll-x-contain rounded-lg border border-zinc-200 [-webkit-overflow-scrolling:touch]",
          mobileCards && "max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0"
        )}
      >
        <table
          className={cn(
            "w-full min-w-[320px] border-collapse text-left text-sm",
            mobileCards &&
              "max-md:block max-md:min-w-0 max-md:border-separate max-md:border-spacing-y-3 max-md:bg-transparent",
            className
          )}
          {...props}
        />
      </div>
    </MobileCardsContext.Provider>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  const mobileCards = useContext(MobileCardsContext);
  return (
    <thead
      className={cn(
        "bg-zinc-50 text-zinc-700",
        className,
        mobileCards && "max-md:sr-only"
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  const mobileCards = useContext(MobileCardsContext);
  return (
    <tbody
      className={cn(
        "divide-y divide-zinc-200 bg-white",
        mobileCards && "max-md:block max-md:divide-y-0 max-md:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  const mobileCards = useContext(MobileCardsContext);
  return (
    <tr
      className={cn(
        "hover:bg-zinc-50/80",
        mobileCards &&
          "max-md:mb-3 max-md:block max-md:w-full max-md:rounded-xl max-md:border max-md:border-zinc-200 max-md:bg-white max-md:px-0 max-md:py-1 max-md:shadow-sm max-md:last:mb-0 max-md:hover:bg-white",
        className
      )}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-3 py-3 font-medium first:pl-4 last:pr-4", className)}
      {...props}
    />
  );
}

export function TableCell({
  className,
  dataLabel,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { dataLabel?: string }) {
  const mobileCards = useContext(MobileCardsContext);
  const label = dataLabel?.trim();
  const hasLabel = Boolean(label);

  return (
    <td
      data-label={hasLabel ? label : undefined}
      className={cn(
        "px-3 py-3 align-middle first:pl-4 last:pr-4",
        mobileCards &&
          hasLabel &&
          "max-md:flex max-md:min-w-0 max-md:w-full max-md:items-start max-md:justify-between max-md:gap-3 max-md:border-b max-md:border-zinc-100 max-md:py-2.5 max-md:first:pt-2 max-md:last:border-b-0",
        mobileCards &&
          !hasLabel &&
          "max-md:block max-md:w-full max-md:border-b max-md:border-zinc-100 max-md:py-2.5 max-md:first:pt-2 max-md:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}
