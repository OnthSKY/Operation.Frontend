"use client";

import { usePatchWarehouseInboundMovementDates } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useState } from "react";

const TITLE_ID = "warehouse-edit-inbound-batch-title";

type Props = {
  open: boolean;
  warehouseId: number;
  /** Çok satırlı giriş partisi UUID; yoksa soloMovementId kullanılır. */
  movementBatchId: string | null;
  /** `movement_batch_id` boş olan tek satır girişi. */
  soloMovementId: number | null;
  defaultBusinessDate: string;
  onClose: () => void;
};

function toIsoDateOnly(isoOrDate: string): string {
  const s = isoOrDate.trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

export function EditWarehouseInboundBatchModal({
  open,
  warehouseId,
  movementBatchId,
  soloMovementId,
  defaultBusinessDate,
  onClose,
}: Props) {
  const { t } = useI18n();
  const patch = usePatchWarehouseInboundMovementDates();
  const [businessDate, setBusinessDate] = useState(() => toIsoDateOnly(defaultBusinessDate));
  const [legacyDate, setLegacyDate] = useState(() => toIsoDateOnly(defaultBusinessDate));

  useEffect(() => {
    if (open) {
      const d = toIsoDateOnly(defaultBusinessDate);
      setBusinessDate(d);
      setLegacyDate(d);
    }
  }, [open, defaultBusinessDate]);

  const onSubmit = async () => {
    if (businessDate.length !== 10) {
      notify.error(t("warehouse.editInboundDateInvalid"));
      return;
    }
    const hasBatch = Boolean(movementBatchId?.trim());
    const hasSolo = soloMovementId != null && soloMovementId > 0;
    if (!hasBatch && !hasSolo) {
      notify.error(t("warehouse.editInboundDateNoTarget"));
      return;
    }
    try {
      const res = await patch.mutateAsync({
        warehouseId,
        body: {
          movementBatchId: hasBatch ? movementBatchId : null,
          movementId: hasSolo ? soloMovementId : null,
          businessDate,
          date: legacyDate.length === 10 ? legacyDate : businessDate,
        },
      });
      notify.success(
        t("warehouse.editInboundDateSuccess").replace("{{wm}}", String(res.updatedMovementRows))
      );
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("warehouse.editInboundBatchTitle")}
      closeButtonLabel={t("common.close")}
      description={undefined}
    >
      <p className="text-sm leading-relaxed text-zinc-600">{t("warehouse.editInboundBatchHint")}</p>
      <div className="mt-4 flex flex-col gap-4">
        <DateField
          label={t("warehouse.editInboundBusinessDate")}
          labelRequired
          required
          value={businessDate}
          onChange={(e) => setBusinessDate(e.target.value)}
        />
        <DateField
          label={t("warehouse.editInboundLegacyDate")}
          value={legacyDate}
          onChange={(e) => setLegacyDate(e.target.value)}
        />
        {patch.isError ? (
          <p className="text-sm text-red-600">{toErrorMessage(patch.error)}</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={patch.isPending}
            onClick={() => void onSubmit()}
          >
            {t("warehouse.editInboundSave")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
