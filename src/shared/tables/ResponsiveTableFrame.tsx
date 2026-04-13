import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const mobileDefault = "flex flex-col gap-3 md:hidden";
const desktopDefault = "hidden md:block";

type Props = {
  mobile: ReactNode;
  desktop: ReactNode;
  /** e.g. `aria-label` for the stacked list */
  mobileProps?: ComponentPropsWithoutRef<"div">;
  mobileClassName?: string;
  desktopClassName?: string;
  /** Wide tables: horizontal scroll + edge bleed on small desktop */
  desktopInsetScroll?: boolean;
  desktopScrollClassName?: string;
};

/**
 * Standard split: stacked / card layout &lt; md, table ≥ md.
 * Keeps spacing and breakpoints consistent across screens.
 */
export function ResponsiveTableFrame({
  mobile,
  desktop,
  mobileProps,
  mobileClassName,
  desktopClassName,
  desktopInsetScroll,
  desktopScrollClassName,
}: Props) {
  const scrollWrap = desktopInsetScroll
    ? cn(
        "-mx-1 overflow-x-auto overscroll-x-contain sm:mx-0 sm:overflow-visible sm:px-0",
        desktopScrollClassName
      )
    : undefined;

  const { className: mobilePropClass, ...restMobile } = mobileProps ?? {};

  return (
    <>
      <div
        className={cn(mobileDefault, mobileClassName, mobilePropClass)}
        {...restMobile}
      >
        {mobile}
      </div>
      <div className={cn(desktopDefault, desktopClassName)}>
        {desktopInsetScroll ? <div className={scrollWrap}>{desktop}</div> : desktop}
      </div>
    </>
  );
}
