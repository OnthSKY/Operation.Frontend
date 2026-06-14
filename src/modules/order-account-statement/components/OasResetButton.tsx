"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { IcEraser } from "@/modules/order-account-statement/components/oas-icons";

/**
 * Form'u varsayılan duruma döndüren tek-butonluk küçük UI parçası.
 */
type Props = {
  onClick: () => void;
};

export function OasResetButton({ onClick }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 gap-2.5 px-4"
        title={t("reports.orderAccountStatementReset")}
        aria-label={t("reports.orderAccountStatementReset")}
        onClick={onClick}
      >
        <IcEraser className="h-5 w-5" />
        <span>{t("reports.orderAccountStatementReset")}</span>
      </Button>
    </div>
  );
}
