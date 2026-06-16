"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import type { MutableRefObject } from "react";

/**
 * AddTransactionModal footer: İptal + Kaydet + (opsiyonel) "Kaydet ve devam".
 *
 * "Kaydet ve devam et": günlük seri girişler için (mesela bir günde 5-10 gider).
 *   - Submit'ten önce `continueRef.current = true` set edilir
 *   - useTxSubmit başarılı yazma sonrası ref true ise modal'ı kapatmadan formu sıfırlar
 *   - Akıllı default'lar (recordRecent) güncel kaldığından sıradaki giriş hızlı başlar
 */
export type TxModalFooterProps = {
  pending: boolean;
  onCancel: () => void;
  /** Set edilirse "Kaydet ve devam et" butonu görünür. */
  continueRef?: MutableRefObject<boolean>;
};

export function TxModalFooter({ pending, onCancel, continueRef }: TxModalFooterProps) {
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
        {continueRef ? (
          <Button
            type="submit"
            variant="secondary"
            className="min-h-12 w-full min-w-0 sm:min-w-[160px] sm:w-auto"
            busy={pending}
            disabled={pending}
            onClick={() => {
              continueRef.current = true;
            }}
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                {t("common.saving")}
              </span>
            ) : (
              "Kaydet ve devam et"
            )}
          </Button>
        ) : null}
        <Button
          type="submit"
          className="min-h-12 w-full min-w-0 sm:min-w-[120px] sm:w-auto"
          busy={pending}
          disabled={pending}
          onClick={() => {
            if (continueRef) continueRef.current = false;
          }}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-white/80" />
              {t("common.saving")}
            </span>
          ) : (
            t("common.save")
          )}
        </Button>
      </div>
    </div>
  );
}
