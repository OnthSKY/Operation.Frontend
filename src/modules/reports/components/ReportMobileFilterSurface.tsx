"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import {
  MobileFilterFunnelButton,
  MobilePageToolRow,
} from "@/shared/components/MobilePageToolRow";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useEffect, useState, type ReactNode } from "react";

const SM_PX = 640;

export type ReportMobileFilterSurfaceProps = {
  filtersActive: boolean;
  drawerTitle: string;
  preview: ReactNode;
  children: ReactNode;
  /** When this identity changes, an open mobile filter drawer closes. */
  resetKey?: string | number;
  onRefetch?: () => void;
  isRefetching?: boolean;
  desktopPanelClassName?: string;
};

export function ReportMobileFilterSurface({
  filtersActive,
  drawerTitle,
  preview,
  children,
  resetKey,
  onRefetch,
  isRefetching,
  desktopPanelClassName,
}: ReportMobileFilterSurfaceProps) {
  const { t } = useI18n();
  const isSmUp = useMediaMinWidth(SM_PX);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (isSmUp) setFiltersOpen(false);
  }, [isSmUp]);

  useEffect(() => {
    setFiltersOpen(false);
  }, [resetKey]);

  const desktopPanel = (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-3 sm:p-4",
        desktopPanelClassName
      )}
    >
      {children}
    </div>
  );

  if (isSmUp) return desktopPanel;

  return (
    <>
      <div className="mobile-toolbar-sticky -mx-4 border-b border-zinc-200/70 bg-white/95 px-4 py-2.5">
        <MobilePageToolRow
          preview={preview}
          actions={
            <>
              <Tooltip content={t("common.filters")} delayMs={200}>
                <span className="inline-flex">
                  <MobileFilterFunnelButton
                    active={filtersActive}
                    expanded={filtersOpen}
                    onClick={() => setFiltersOpen(true)}
                    ariaLabel={t("common.filters")}
                  />
                </span>
              </Tooltip>
              {onRefetch ? (
                <Tooltip content={t("reports.apply")} delayMs={200}>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mobile-hit-44 h-11 w-11 shrink-0 px-0"
                    onClick={() => void onRefetch()}
                    disabled={isRefetching}
                    aria-label={t("reports.apply")}
                  >
                    <svg
                      className="mx-auto h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                  </Button>
                </Tooltip>
              ) : null}
            </>
          }
        />
      </div>
      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={drawerTitle}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">{children}</div>
      </RightDrawer>
    </>
  );
}
