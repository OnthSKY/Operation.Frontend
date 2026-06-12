"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";

/**
 * AddTransactionModal footer: İptal + Kaydet aksiyon barı.
 *
 * Loading state: createTx veya createAdvanceMut'tan biri pending iken submit'i kilitler
 * ve label «Kaydediliyor…» olur.
 */
export type TxModalFooterProps = {
  pending: boolean;
  onCancel: () => void;
};

export function TxModalFooter({ pending, onCancel }: TxModalFooterProps) {
  const { t } = useI18n();
  return (
    <div className="mt-2 shrink-0 border-t border-zinc-100 bg-white pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:mt-3 sm:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 w-full min-w-0 sm:min-w-[120px] sm:w-auto"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="min-h-12 w-full min-w-0 sm:min-w-[120px] sm:w-auto"
          disabled={pending}
        >
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
