"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import type { UserListItem } from "@/types/user";

/**
 * Yöneticinin başka bir kullanıcının MFA'sını aç/kapat onayı.
 */
type Props = {
  state: { target: UserListItem; wantEnabled: boolean } | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function UsersMfaToggleDialog({ state, pending, onClose, onConfirm }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      titleId="user-mfa-toggle-title"
      title={
        state?.wantEnabled
          ? t("users.mfaAdminToggleDialogTitleEnable")
          : t("users.mfaAdminToggleDialogTitleDisable")
      }
      description={(state?.wantEnabled
        ? t("users.mfaAdminToggleDialogDescriptionEnable")
        : t("users.mfaAdminToggleDialogDescriptionDisable")
      ).replace("{username}", state?.target.username ?? "")}
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
          <div className="mt-4 flex shrink-0 justify-stretch border-t border-zinc-200 pt-3 sm:justify-end">
            <Button
              type="button"
              variant="primary"
              className={cn(
                "min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]",
                state.wantEnabled
                  ? "!bg-emerald-600 hover:!bg-emerald-700"
                  : "!bg-amber-600 hover:!bg-amber-700"
              )}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending
                ? t("common.saving")
                : state.wantEnabled
                  ? t("users.mfaAdminToggleConfirmEnable")
                  : t("users.mfaAdminToggleConfirmDisable")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
