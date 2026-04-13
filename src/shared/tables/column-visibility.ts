import { cn } from "@/lib/cn";

export type TableShowFrom = "sm" | "md" | "lg" | "xl";

/** Below `md`, tables use card rows; hidden columns must still show inside the card. */
const showFromMap: Record<TableShowFrom, string> = {
  sm: "max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 md:table-cell",
  md: "max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 md:table-cell",
  lg: "max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 md:hidden lg:table-cell",
  xl: "max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 md:hidden xl:table-cell",
};

/** Mobile-first: column hidden until viewport ≥ breakpoint. */
export function columnShowFromClass(breakpoint: TableShowFrom | undefined): string | undefined {
  return breakpoint ? showFromMap[breakpoint] : undefined;
}

export function mergeTableCellClasses(
  base: string | undefined,
  showFrom: TableShowFrom | undefined,
  extra: string | undefined
): string {
  return cn(base, columnShowFromClass(showFrom), extra);
}
