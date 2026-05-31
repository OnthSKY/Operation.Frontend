import { useCallback } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type { StatementLayoutVariant } from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";

/**
 * Sipariş-hesap dökümünün düzen (layout) ve içerik (content) şablon seçicileri.
 * Tamamen kontrollü (controlled) — değerleri ve değişim callback'lerini prop alır.
 * (OrderAccountStatementScreen.tsx'ten Faz-2 refactor kapsamında çıkarıldı.)
 */
export function OasTemplatePickers({
  layoutVariant,
  onLayoutChange,
  contentPreset,
  onContentPresetChange,
  layoutOptions,
  contentOptions,
  nameSuffix,
  menuZIndex,
  hideContentPicker = false,
}: {
  layoutVariant: StatementLayoutVariant;
  onLayoutChange: (v: StatementLayoutVariant) => void;
  contentPreset: OrderAccountContentPreset;
  onContentPresetChange: (v: OrderAccountContentPreset) => void;
  layoutOptions: SelectOption[];
  contentOptions: SelectOption[];
  nameSuffix: string;
  menuZIndex?: number;
  hideContentPicker?: boolean;
}) {
  const { t } = useI18n();
  const noopBlur = useCallback(() => {}, []);
  return (
    <div className={cn("grid gap-3", hideContentPicker ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
      <Select
        label={t("reports.orderAccountStatementLayoutTemplate")}
        name={`oas-layout-${nameSuffix}`}
        value={layoutVariant}
        options={layoutOptions}
        onChange={(e) => onLayoutChange(e.target.value as StatementLayoutVariant)}
        onBlur={noopBlur}
        menuZIndex={menuZIndex}
      />
      {!hideContentPicker ? (
        <Select
          label={t("reports.orderAccountStatementContentTemplate")}
          name={`oas-content-${nameSuffix}`}
          value={contentPreset}
          options={contentOptions}
          onChange={(e) => onContentPresetChange(e.target.value as OrderAccountContentPreset)}
          onBlur={noopBlur}
          menuZIndex={menuZIndex}
        />
      ) : null}
    </div>
  );
}
