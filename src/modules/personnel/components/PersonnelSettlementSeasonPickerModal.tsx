"use client";

import { useI18n } from "@/i18n/context";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  parseSettlementSeasonYearChoice,
  settlementSeasonYearSelectOptions,
} from "@/modules/personnel/lib/settlement-print-season";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { Personnel } from "@/types/personnel";
import { useCallback, useEffect, useMemo, useState } from "react";

const TITLE_ID = "settlement-season-picker-title";

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  onConfirm: (
    personnel: Personnel,
    seasonYear: number | null
  ) => void | Promise<void>;
  busy?: boolean;
};

export function PersonnelSettlementSeasonPickerModal({
  open,
  onClose,
  personnel,
  onConfirm,
  busy = false,
}: Props) {
  const { t } = useI18n();
  const [choice, setChoice] = useState("");

  useEffect(() => {
    if (open) setChoice("");
  }, [open]);

  const options = useMemo(
    () => settlementSeasonYearSelectOptions(t),
    [t]
  );
  const requestClose = useDirtyGuard({
    isDirty: choice.trim() !== "",
    isBlocked: busy,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const run = useCallback(async () => {
    if (!personnel) return;
    const y = parseSettlementSeasonYearChoice(choice);
    if (choice.trim() !== "" && y == null) {
      notify.error(t("personnel.effectiveYearInvalid"));
      return;
    }
    try {
      await onConfirm(personnel, y);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [choice, onConfirm, personnel, t]);

  return (
    <Modal
      open={open && personnel != null}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("personnel.settlementPrintSeasonPickerTitle")}
      description={personnel ? personnelDisplayName(personnel) : ""}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <ModalFormLayout
        className="mt-0"
        body={
          <FormSection>
            <Select
              name="settlementPdfSeason"
              label={t("personnel.settlementPrintSeasonLabel")}
              options={options}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              onBlur={() => {}}
            />
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("personnel.settlementPrintSeasonHint")}
            </p>
          </FormSection>
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={requestClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run()}
            >
              {t("personnel.settlementPrintSeasonPickerConfirm")}
            </Button>
          </>
        }
      />
    </Modal>
  );
}
