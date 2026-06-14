"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import type { UserListItem } from "@/types/user";

/**
 * Kullanıcı silme: soft (pasifleştir + FK koru) ya da hard (fiziksel sil) onayı.
 */
type Props = {
  state: { target: UserListItem } | null;
  softPending: boolean;
  hardPending: boolean;
  onClose: () => void;
  onSoftConfirm: () => void;
  onHardConfirm: () => void;
};

export function UsersDeleteDialog({
  state,
  softPending,
  hardPending,
  onClose,
  onSoftConfirm,
  onHardConfirm,
}: Props) {
  const { t } = useI18n();
  const busy = softPending || hardPending;
  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      titleId="user-delete-title"
      title={t("users.deleteDialogTitle")}
      description={t("users.deleteDialogDescription")}
      closeButtonLabel={t("common.close")}
      narrow
      sheetMobile
    >
      {state ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 sm:px-0">
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-sm text-zinc-800">
            <p className="font-semibold text-zinc-900">
              {state.target.fullName?.trim() || state.target.username}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">@{state.target.username}</p>
          </div>
          <div className="mt-3 space-y-1.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900">
            <p>{t("users.deleteDialogSoftHint")}</p>
            <p>{t("users.deleteDialogHardHint")}</p>
          </div>
          <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={busy}
              onClick={onSoftConfirm}
            >
              {softPending ? t("common.saving") : t("users.deleteSoftButton")}
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-h-12 w-full !bg-red-600 hover:!bg-red-700 sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={busy}
              onClick={onHardConfirm}
            >
              {hardPending ? t("common.saving") : t("users.deleteHardButton")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
