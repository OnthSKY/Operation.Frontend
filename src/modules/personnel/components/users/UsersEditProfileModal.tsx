"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { PasswordStrengthMeter, evaluatePassword } from "@/shared/ui/PasswordStrengthMeter";
import type { UserListItem } from "@/types/user";

/**
 * Kullanıcı profili düzenleme modal'ı: username/fullName/email + opsiyonel yeni şifre.
 */
type Props = {
  state: {
    target: UserListItem;
    username: string;
    fullName: string;
    email: string;
    newPassword: string;
  } | null;
  profilePending: boolean;
  resetPending: boolean;
  onClose: () => void;
  onPatch: (
    patch: Partial<{ username: string; fullName: string; email: string; newPassword: string }>
  ) => void;
  onSaveProfile: () => void;
  onResetPassword: () => void;
};

export function UsersEditProfileModal({
  state,
  profilePending,
  resetPending,
  onClose,
  onPatch,
  onSaveProfile,
  onResetPassword,
}: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      titleId="user-edit-title"
      title={t("users.editDialogTitle")}
      description={t("users.editDialogDescription")}
      closeButtonLabel={t("common.close")}
      narrow
      sheetMobile
    >
      {state ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-1 pb-2 sm:px-0">
          <div className="space-y-3">
            <Input
              label={t("users.editUsernameLabel")}
              labelRequired
              value={state.username}
              onChange={(e) => onPatch({ username: e.target.value })}
              autoComplete="off"
            />
            <Input
              label={t("users.editFullNameLabel")}
              value={state.fullName}
              onChange={(e) => onPatch({ fullName: e.target.value })}
              autoComplete="off"
            />
            <Input
              label={t("users.editEmailLabel")}
              type="email"
              value={state.email}
              onChange={(e) => onPatch({ email: e.target.value })}
              placeholder={t("users.editEmailPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="flex shrink-0 justify-end border-t border-zinc-200 pt-3">
            <Button
              type="button"
              variant="primary"
              className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
              disabled={profilePending}
              onClick={onSaveProfile}
            >
              {profilePending ? t("common.saving") : t("common.save")}
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {t("users.editPasswordSectionTitle")}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">{t("users.editPasswordSectionHint")}</p>
            </div>
            <Input
              label={t("users.editNewPasswordLabel")}
              type="password"
              value={state.newPassword}
              onChange={(e) => onPatch({ newPassword: e.target.value })}
              placeholder={t("users.editNewPasswordPlaceholder")}
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={state.newPassword} />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:w-auto sm:min-w-[140px]"
                disabled={resetPending || !evaluatePassword(state.newPassword).allRequiredMet}
                onClick={onResetPassword}
              >
                {resetPending ? t("common.saving") : t("users.resetPasswordButton")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
