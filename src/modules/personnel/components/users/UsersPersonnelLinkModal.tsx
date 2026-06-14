"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { UserListItem } from "@/types/user";

/**
 * Kullanıcının bağlı olduğu personel kaydını değiştirme / çözme modal'ı.
 * Saf sunum + draft yönetimi.
 */
type Props = {
  state: { user: UserListItem; draftPersonnelId: string } | null;
  personnelOptions: SelectOption[];
  /** Mevcut bağlı personel adı (StatusBadge içinde gösterilir). */
  personnelCell: (u: UserListItem) => string;
  /** PERSONNEL/DRIVER rolü? Bu rollerle bağ çözülmesi engellenir. */
  isPortalRoleUser: (u: UserListItem) => boolean;
  pending: boolean;
  onClose: () => void;
  onChangeDraft: (draftPersonnelId: string) => void;
  onConfirm: () => void;
};

export function UsersPersonnelLinkModal({
  state,
  personnelOptions,
  personnelCell,
  isPortalRoleUser,
  pending,
  onClose,
  onChangeDraft,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      titleId="user-personnel-link-title"
      title={t("users.personnelLinkModalTitle")}
      description={t("users.personnelLinkModalDescription")}
      closeButtonLabel={t("common.close")}
      narrow
      sheetMobile
    >
      {state ? (
        (() => {
          const lu = state.user;
          const portalRoleUser = isPortalRoleUser(lu);
          const original = lu.personnelId != null ? String(lu.personnelId) : "";
          const draft = state.draftPersonnelId.trim();
          const changed = draft !== original;
          const wantsUnlink = draft === "" && original !== "";
          const blockedUnlink = wantsUnlink && portalRoleUser;
          const canSave = changed && !blockedUnlink;
          return (
            <div className="flex min-h-0 flex-1 flex-col overflow-visible sm:overflow-hidden">
              <div className="space-y-4 px-1 py-2 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:px-0 sm:[-webkit-overflow-scrolling:touch]">
                <div className="rounded-xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {t("users.roleChangeAccountHeading")}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-zinc-900">
                    {lu.fullName?.trim() || lu.username}
                  </p>
                  <p className="truncate text-sm text-zinc-500">@{lu.username}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {t("users.personnelLinkCurrentBadge")}
                    </span>
                    {original !== "" ? (
                      <StatusBadge tone="neutral" className="normal-case tracking-normal" size="md">
                        {personnelCell(lu)}
                      </StatusBadge>
                    ) : (
                      <span className="text-sm text-zinc-400">{t("users.personnelNone")}</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-zinc-800">
                    {t("users.personnelLinkPickHeading")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                    {t("users.personnelLinkPickHint")}
                  </p>
                  <Select
                    className="mt-3"
                    label={t("users.fieldPersonnel")}
                    options={personnelOptions}
                    name="personnelLinkPersonnel"
                    value={state.draftPersonnelId}
                    onChange={(e) => onChangeDraft(e.target.value)}
                    onBlur={() => {}}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {t("users.personnelLinkUnlinkHint")}
                  </p>
                </div>

                {blockedUnlink ? (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3 text-sm text-amber-950">
                    <p className="font-semibold">{t("users.personnelLinkPortalBlockTitle")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                      {t("users.personnelLinkPortalBlockHint")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-xs leading-relaxed text-zinc-600">
                    {t("users.personnelLinkSessionHint")}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-0 sm:pb-3">
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
                  disabled={pending || !canSave}
                  onClick={onConfirm}
                >
                  {pending
                    ? t("common.saving")
                    : wantsUnlink
                      ? t("users.personnelLinkUnlinkConfirm")
                      : t("users.personnelLinkConfirm")}
                </Button>
              </div>
            </div>
          );
        })()
      ) : null}
    </Modal>
  );
}
