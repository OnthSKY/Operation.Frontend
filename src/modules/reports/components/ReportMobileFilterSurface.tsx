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
const LG_PX = 1024;

export type ReportMobileFilterSurfaceProps = {
  filtersActive: boolean;
  drawerTitle: string;
  /** `null` = araç satırında özet kutusu yok, yalnızca huni/yenile vb. */
  preview: ReactNode | null;
  children: ReactNode;
  /** When this identity changes, an open mobile filter drawer closes. */
  resetKey?: string | number;
  onRefetch?: () => void;
  isRefetching?: boolean;
  desktopPanelClassName?: string;
  /**
   * Verildiğinde: `lg` ve üzeri genişlikte filtreler sağ sütunda, bu içerik solda tam genişlikte.
   * Mobil / dar tablette mevcut davranış korunur.
   */
  main?: ReactNode;
  /**
   * `drawerOnly`: Filtreler yalnızca huni ile sağdan açılan panelde (tüm ekran genişlikleri).
   * Finans tablo raporu gibi yoğun formlar için.
   */
  variant?: "default" | "drawerOnly";
  /** `drawerOnly` ile: huni satırının hemen altında (etki / kapsam özeti). */
  belowToolbar?: ReactNode;
  /** `drawerOnly` ile: huni satırının üstünde (ör. kümül grafik açıklamaları). */
  aboveToolbar?: ReactNode;
  /**
   * `true`: Tarih/şube/gelişmiş filtreler ve `belowToolbar` yalnızca huni çekmecesinde; satır içi / sağ sütun
   * filtre paneli gösterilmez (finans karşılaştırma).
   */
  belowToolbarInDrawer?: boolean;
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
  main,
  variant = "default",
  belowToolbar,
  aboveToolbar,
  belowToolbarInDrawer = false,
}: ReportMobileFilterSurfaceProps) {
  const { t } = useI18n();
  const isSmUp = useMediaMinWidth(SM_PX);
  const isLgUp = useMediaMinWidth(LG_PX);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const drawerOnly = variant === "drawerOnly";

  const scopeInDrawer =
    Boolean(belowToolbar) && belowToolbarInDrawer && !drawerOnly && main != null;

  useEffect(() => {
    setFiltersOpen(false);
  }, [resetKey]);

  useEffect(() => {
    if (drawerOnly) return;
    if (isSmUp) setFiltersOpen(false);
  }, [isSmUp, drawerOnly]);

  const filterPanel = (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/90 p-3 sm:p-4",
        main != null && isLgUp && !drawerOnly ? "bg-white shadow-sm" : "bg-zinc-50/60",
        desktopPanelClassName
      )}
    >
      {children}
    </div>
  );

  const filtersAside = (
    <aside
      className="min-w-0 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1"
      aria-label={drawerTitle}
    >
      <p className="mb-2 hidden text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400 lg:block">
        {drawerTitle}
      </p>
      {filterPanel}
    </aside>
  );

  const toolbarAndDrawer = (
    <>
      <div
        className={cn(
          "border-b border-zinc-200/70 bg-white/95 py-2.5",
          drawerOnly
            ? "mb-1 flex w-full rounded-xl border border-zinc-200/80 px-3 shadow-sm sm:px-4"
            : "mobile-toolbar-sticky -mx-4 px-4"
        )}
      >
        <MobilePageToolRow
          preview={preview}
          actions={
            <>
              <Tooltip
                content={
                  drawerOnly || scopeInDrawer ? drawerTitle : t("common.filters")
                }
                delayMs={200}
              >
                <span className="inline-flex">
                  <MobileFilterFunnelButton
                    active={filtersActive}
                    expanded={filtersOpen}
                    onClick={() => setFiltersOpen((o) => !o)}
                    ariaLabel={
                      drawerOnly || scopeInDrawer
                        ? drawerTitle
                        : t("common.filters")
                    }
                  />
                </span>
              </Tooltip>
              {onRefetch ? (
                <Tooltip content={t("reports.apply")} delayMs={200}>
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                      "h-11 w-11 shrink-0 px-0",
                      drawerOnly ? "min-h-11" : "mobile-hit-44"
                    )}
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
        className={
          drawerOnly ? "max-w-xl" : scopeInDrawer ? "max-w-xl" : "max-w-lg"
        }
      >
        <div className="flex flex-col gap-4">
          {children}
          {scopeInDrawer && belowToolbar ? (
            <div className="border-t border-zinc-200 pt-4">{belowToolbar}</div>
          ) : null}
        </div>
      </RightDrawer>
    </>
  );

  if (main != null) {
    if (drawerOnly) {
      return (
        <>
          {aboveToolbar ? <div className="mb-2 min-w-0 sm:mb-3">{aboveToolbar}</div> : null}
          {toolbarAndDrawer}
          {belowToolbar ? (
            <div className="mb-3 min-w-0 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2.5 sm:mb-4 sm:px-4 sm:py-3">
              {belowToolbar}
            </div>
          ) : null}
          <div className="min-w-0 space-y-4">{main}</div>
        </>
      );
    }

    const scopeBlock =
      belowToolbar != null && !scopeInDrawer ? (
        <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2.5 sm:px-4 sm:py-3">
          {belowToolbar}
        </div>
      ) : null;

    if (!isSmUp) {
      return (
        <>
          {toolbarAndDrawer}
          <div className="mt-3 min-w-0 space-y-4">
            {scopeBlock}
            {main}
          </div>
        </>
      );
    }

    if (!isLgUp) {
      if (scopeInDrawer) {
        return (
          <div className="flex flex-col gap-6">
            {toolbarAndDrawer}
            {scopeBlock}
            <div className="min-w-0 space-y-4">{main}</div>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-6">
          {filterPanel}
          {scopeBlock}
          <div className="min-w-0 space-y-4">{main}</div>
        </div>
      );
    }

    if (scopeInDrawer) {
      return (
        <>
          {toolbarAndDrawer}
          <div className="min-w-0 space-y-4">
            {scopeBlock}
            {main}
          </div>
        </>
      );
    }

    return (
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_min(19rem,max-content)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_min(21rem,max-content)]">
        <div className="min-w-0 space-y-4">
          {scopeBlock}
          {main}
        </div>
        <div className="lg:sticky lg:top-4">{filtersAside}</div>
      </div>
    );
  }

  if (isSmUp) return filterPanel;

  return (
    <>
      {toolbarAndDrawer}
    </>
  );
}
