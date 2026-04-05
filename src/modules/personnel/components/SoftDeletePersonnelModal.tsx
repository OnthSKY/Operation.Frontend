"use client";

import { useI18n } from "@/i18n/context";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { useSoftDeletePersonnel } from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import type { Personnel } from "@/types/personnel";

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
};

const TITLE_ID = "soft-delete-personnel-title";

export function SoftDeletePersonnelModal({ open, onClose, personnel }: Props) {
  const { t } = useI18n();
  const softDelete = useSoftDeletePersonnel();

  const handleConfirm = async () => {
    if (!personnel) return;
    try {
      await softDelete.mutateAsync(personnel.id);
      notify.success(t("toast.personnelDeactivated"));
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
      title={t("personnel.softDeleteTitle")}
      closeButtonLabel={t("common.close")}
    >
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-600">
          <span className="font-medium text-zinc-900">
            {personnel ? personnelDisplayName(personnel) : ""}
          </span>
          {personnel ? " — " : null}
          {t("personnel.softDeleteLead")}
        </p>
        <p className="text-sm leading-relaxed text-zinc-600">
          {t("personnel.softDeleteDataNote")}
        </p>
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:min-w-[120px]"
            onClick={onClose}
            disabled={softDelete.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="sm:min-w-[160px]"
            onClick={() => void handleConfirm()}
            disabled={!personnel || softDelete.isPending}
          >
            {softDelete.isPending
              ? t("common.loading")
              : t("personnel.softDeleteConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
