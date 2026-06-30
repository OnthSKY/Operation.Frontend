"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import { IcCopy, IcMaximize } from "@/modules/order-account-statement/components/oas-icons";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";

/**
 * Sayfanın altına sabitlenmiş, mobilde satır ekleme/kopyalama + tam ekran önizleme,
 * masaüstünde sadece önizleme butonunu gösteren aksiyon çubuğu.
 *
 * SRP: yalnızca sunum + callback'ler. Akış kararı (lineAddBlocked / mobileLineIssueCount)
 * çağıran orchestrator'da hesaplanır ve prop olarak verilir.
 */
type Props = {
  mobileLineIssueCount: number;
  lineAddBlocked: boolean;
  hasLines: boolean;
  onAddLine: () => void;
  onDuplicateLastLine: () => void;
  onOpenPreview: () => void;
};

export function OasMobileActionBar({
  mobileLineIssueCount,
  lineAddBlocked,
  hasLines,
  onAddLine,
  onDuplicateLastLine,
  onOpenPreview,
}: Props) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 border-t border-zinc-200/90 bg-white/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-4 sm:py-3",
        // Masaüstü: full-width çubuk yerine sağ-altta yüzen kompakt buton — sidebar'ı ezmez.
        "lg:inset-x-auto lg:bottom-5 lg:right-6 lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:supports-[backdrop-filter]:bg-transparent",
        OVERLAY_Z_TW.branchDetailSheet
      )}
    >
      {mobileLineIssueCount > 0 ? (
        <p className="mb-2 text-center text-[11px] font-medium text-amber-700 lg:hidden">
          {mobileLineIssueCount} kalemde eksik/uyumsuz bilgi var.
        </p>
      ) : null}
      <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden">
        <Button
          type="button"
          variant="secondary"
          className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
          onClick={onAddLine}
          disabled={lineAddBlocked}
        >
          <PlusIcon className="h-4 w-4 shrink-0" />
          <span>Satır ekle</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
          onClick={onDuplicateLastLine}
          disabled={lineAddBlocked || !hasLines}
        >
          <IcCopy className="h-4 w-4 shrink-0" />
          <span>Son satırı kopyala</span>
        </Button>
      </div>
      <div className="flex w-full justify-center">
        <Button
          type="button"
          variant="primary"
          className="w-full justify-center gap-2 py-3 text-sm font-semibold sm:w-full sm:text-base lg:w-auto lg:min-w-0 lg:gap-2 lg:rounded-full lg:px-6 lg:py-3 lg:text-sm lg:shadow-xl lg:shadow-zinc-900/25 lg:ring-1 lg:ring-white/10"
          title={t("reports.orderAccountStatementOpenFullscreenPreview")}
          aria-label={t("reports.orderAccountStatementOpenFullscreenPreview")}
          onClick={onOpenPreview}
        >
          <IcMaximize className="h-5 w-5" />
          <span>{t("reports.orderAccountStatementOpenFullscreenPreview")}</span>
        </Button>
      </div>
    </div>
  );
}
