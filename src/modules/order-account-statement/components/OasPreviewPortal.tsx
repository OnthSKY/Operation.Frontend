"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { createPortal } from "react-dom";
import type { Ref } from "react";
import {
  IcDownload,
  IcLoader,
  IcPlay,
  IcX,
} from "@/modules/order-account-statement/components/oas-icons";
import { OasIconButton } from "@/modules/order-account-statement/components/oas-ui";
import { OasTemplatePickers } from "@/modules/order-account-statement/components/oas-template-pickers";
import { OrderAccountStatementPreviewSettings } from "@/modules/order-account-statement/components/OrderAccountStatementPreviewSettings";
import {
  StatementPaper,
  type StatementLayoutVariant,
} from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";
import type { SelectOption } from "@/shared/ui/Select";

/**
 * Tam ekran önizleme + indirme/aksiyon panelinin portal'a basılan formu.
 * Saf sunum: state'i okumuyor, yalnızca callback'leri tetikliyor.
 *
 * Hook nesneleri (`identity`, `invoicing`, `preview`) topluca geçirilerek prop
 * drilling daraltıldı (DRY). StatementPaper ham veri prop'ları orchestrator'da
 * türetildiği için ayrı bir `paper` namespace'i altında veriliyor.
 */
type Props = {
  open: boolean;
  /** Lazy portal kurulduğunda true (SSR'da render kaçınmak için). */
  portalMounted: boolean;
  onClose: () => void;

  toolsCollapsed: boolean;
  onToggleTools: () => void;

  busy: boolean;
  hasMultipleActions: boolean;
  onDownloadClick: () => void;

  template: {
    layoutVariant: StatementLayoutVariant;
    setLayoutVariant: (v: StatementLayoutVariant) => void;
    contentPreset: OrderAccountContentPreset;
    applyContentPreset: (p: OrderAccountContentPreset) => void;
    layoutOptions: SelectOption[];
    contentOptions: SelectOption[];
  };

  settings: React.ComponentProps<typeof OrderAccountStatementPreviewSettings>;

  paper: Omit<React.ComponentProps<typeof StatementPaper>, "ref"> & {
    ref: Ref<HTMLDivElement>;
  };
};

export function OasPreviewPortal(props: Props) {
  const {
    open,
    portalMounted,
    onClose,
    toolsCollapsed,
    onToggleTools,
    busy,
    hasMultipleActions,
    onDownloadClick,
    template,
    settings,
    paper,
  } = props;
  const { t } = useI18n();

  if (!portalMounted || !open) return null;

  const downloadLabel = busy
    ? t("reports.orderAccountStatementGeneratingPdf")
    : hasMultipleActions
      ? t("reports.orderAccountStatementRunActions")
      : t("reports.orderAccountStatementDownloadPdf");

  return createPortal(
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 flex items-stretch justify-center bg-zinc-950/55 p-[max(0.25rem,env(safe-area-inset-top,0px))_max(0.25rem,env(safe-area-inset-right,0px))_max(0.25rem,env(safe-area-inset-bottom,0px))_max(0.25rem,env(safe-area-inset-left,0px))] backdrop-blur-[1px] sm:p-3 sm:items-center",
        OVERLAY_Z_TW.modal
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-account-preview-dialog-title"
        className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[min(100rem,calc(100vw-0px))] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:h-auto sm:max-h-[min(100dvh,100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <div className="min-w-0 flex-1 pr-1">
            <h2
              id="order-account-preview-dialog-title"
              className="text-sm font-bold tracking-tight text-zinc-950 sm:text-base"
            >
              {t("reports.orderAccountStatementPreviewTitle")}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button
                type="button"
                variant="ghost"
                className="!h-auto !min-h-0 !px-0 !py-0 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
                onClick={onToggleTools}
              >
                {toolsCollapsed
                  ? t("reports.orderAccountStatementPreviewExpandTools")
                  : t("reports.orderAccountStatementPreviewCollapseTools")}
              </Button>
              <p className="hidden text-xs text-zinc-600 lg:inline">
                {t("reports.orderAccountStatementPreviewHint")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <OasIconButton
              variant="secondary"
              title={t("common.close")}
              aria-label={t("common.close")}
              onClick={onClose}
              className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
            >
              <IcX className="h-7 w-7" />
            </OasIconButton>
            <OasIconButton
              variant="primary"
              title={downloadLabel}
              aria-label={downloadLabel}
              onClick={onDownloadClick}
              disabled={busy}
              className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
            >
              {busy ? (
                <IcLoader className="h-7 w-7" />
              ) : hasMultipleActions ? (
                <IcPlay className="h-7 w-7" />
              ) : (
                <IcDownload className="h-7 w-7" />
              )}
            </OasIconButton>
          </div>
        </div>
        {!toolsCollapsed ? (
          <div className="max-h-[min(38vh,320px)] shrink-0 overflow-y-auto overscroll-contain border-b border-zinc-200 bg-white px-3 py-2.5 sm:max-h-none sm:overflow-visible sm:px-5 sm:py-3">
            <p className="mb-2 text-[11px] leading-snug text-zinc-500">
              {t("reports.orderAccountStatementPreviewTemplateHint")}
            </p>
            <OasTemplatePickers
              layoutVariant={template.layoutVariant}
              onLayoutChange={template.setLayoutVariant}
              contentPreset={template.contentPreset}
              onContentPresetChange={template.applyContentPreset}
              layoutOptions={template.layoutOptions}
              contentOptions={template.contentOptions}
              nameSuffix="preview"
              menuZIndex={OVERLAY_Z_INDEX.modalNested + 20}
              hideContentPicker
            />
            <OrderAccountStatementPreviewSettings {...settings} />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100/90 p-2 sm:p-5">
          <div className="mx-auto w-full min-w-0 max-w-[210mm] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <StatementPaper {...paper} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
