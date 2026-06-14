"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { adminUsersRoleDescription } from "@/modules/account/lib/role-label";
import type { UserListItem } from "@/types/user";

/**
 * Çoklu rol seçimi modal'ı. Portal rolleri (PERSONNEL/DRIVER) için personel
 * bağı zorunlu; bunlardan çıkışta opsiyonel "bağı kaldır" akışı.
 */
type RoleEditorState = {
  user: UserListItem;
  draftRoles: Set<string>;
  draftPersonnelId: string;
  draftUnlinkPersonnel: boolean;
};

type Props = {
  state: RoleEditorState | null;
  roleOptions: SelectOption[];
  personnelOptionsForPersonnelRole: SelectOption[];
  personnelOptionsForDriverRole: SelectOption[];
  personnelNameById: Map<number, string>;

  getRoleLabel: (code: string) => string;
  roleRequiresPersonnel: (code: string) => boolean;
  userRolesUpper: (u: UserListItem) => string[];
  /** Aktif kullanıcı (BRANCH_DAY_REGISTER scope hatırlatması için yetki kontrolü). */
  branchDayRegisterCallout?: React.ReactNode;

  pending: boolean;
  onClose: () => void;
  onToggleRole: (roleCode: string) => void;
  onPatch: (patch: Partial<Pick<RoleEditorState, "draftPersonnelId" | "draftUnlinkPersonnel">>) => void;
  onConfirm: () => void;
};

export function UsersRoleEditorModal({
  state,
  roleOptions,
  personnelOptionsForPersonnelRole,
  personnelOptionsForDriverRole,
  personnelNameById,
  getRoleLabel,
  roleRequiresPersonnel,
  userRolesUpper,
  branchDayRegisterCallout,
  pending,
  onClose,
  onToggleRole,
  onPatch,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={state !== null}
      onClose={onClose}
      titleId="user-role-editor-title"
      title={t("users.roleChangeModalTitle")}
      description={t("users.roleChangeModalDescription")}
      closeButtonLabel={t("common.close")}
      narrow
      sheetMobile
    >
      {state ? (
        (() => {
          const originalRoles = new Set(userRolesUpper(state.user));
          const draftRoles = state.draftRoles;
          const wantsPortal = draftRoles.has("PERSONNEL") || draftRoles.has("DRIVER");
          const originalPersonnel =
            state.user.personnelId != null ? String(state.user.personnelId) : "";
          const rolesChanged =
            originalRoles.size !== draftRoles.size ||
            [...draftRoles].some((c) => !originalRoles.has(c));
          const personnelChanged =
            wantsPortal && state.draftPersonnelId.trim() !== originalPersonnel;
          const canUnlinkPersonnel = !wantsPortal && state.user.personnelId != null;
          const unlinkChanged = canUnlinkPersonnel && state.draftUnlinkPersonnel;
          const personnelMissing =
            wantsPortal &&
            state.draftPersonnelId.trim() === "" &&
            state.user.personnelId == null;
          const dirty = rolesChanged || personnelChanged || unlinkChanged;
          const canSave = dirty && draftRoles.size > 0 && !personnelMissing;
          return (
            <div className="flex min-h-0 flex-1 flex-col overflow-visible sm:overflow-hidden">
              <div className="space-y-4 px-1 py-2 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:px-0 sm:[-webkit-overflow-scrolling:touch]">
                <div className="rounded-xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {t("users.roleChangeAccountHeading")}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-zinc-900">
                    {state.user.fullName?.trim() || state.user.username}
                  </p>
                  <p className="truncate text-sm text-zinc-500">@{state.user.username}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">{t("users.roleChangeCurrentBadge")}</span>
                    {originalRoles.size > 0 ? (
                      [...originalRoles].map((c) => (
                        <StatusBadge key={c} tone="neutral" className="normal-case tracking-normal" size="md">
                          {getRoleLabel(c)}
                        </StatusBadge>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-400">{t("personnel.dash")}</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-700">{t("users.roleChangePickHeading")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {t("users.rolesPickMultiSubhint")}
                  </p>
                  <div className="mt-2 grid gap-2" role="group" aria-label={t("users.roleChangePickHeading")}>
                    {roleOptions.map((opt) => {
                      const v = String(opt.value).toUpperCase();
                      const selected = draftRoles.has(v);
                      const roleDesc = adminUsersRoleDescription(v, t);
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors",
                            selected
                              ? "border-violet-400 bg-violet-50/90 ring-1 ring-violet-400/40"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded accent-violet-600"
                            checked={selected}
                            onChange={() => onToggleRole(v)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold leading-snug text-zinc-900">
                                {opt.label}
                              </span>
                              {roleRequiresPersonnel(v) ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                                  {t("users.rolePersonnelRequiredBadge")}
                                </span>
                              ) : null}
                            </span>
                            {roleDesc ? (
                              <span className="mt-1 block text-xs leading-relaxed text-zinc-600">
                                {roleDesc}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {wantsPortal ? (
                  <div
                    className={cn(
                      "rounded-xl border p-4 shadow-sm",
                      personnelMissing
                        ? "border-amber-300 bg-amber-50/70"
                        : "border-zinc-200/90 bg-white"
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                      {t("users.roleChangePersonnelFieldLabel")}
                      <span className="text-red-600" aria-hidden>*</span>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                        {t("users.rolePersonnelRequiredBadge")}
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {t("users.personnelRequiredForRoleHint")}
                    </p>
                    <Select
                      className="mt-3"
                      label={t("users.fieldPersonnel")}
                      labelRequired
                      options={
                        draftRoles.has("PERSONNEL")
                          ? personnelOptionsForPersonnelRole
                          : personnelOptionsForDriverRole
                      }
                      name="roleEditorPersonnel"
                      value={state.draftPersonnelId}
                      error={personnelMissing ? t("users.personnelRequiredError") : undefined}
                      onChange={(e) => onPatch({ draftPersonnelId: e.target.value })}
                      onBlur={() => {}}
                    />
                  </div>
                ) : null}

                {canUnlinkPersonnel ? (
                  <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-zinc-800">
                      {t("users.roleChangeUnlinkPersonnelTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {t("users.roleChangeUnlinkPersonnelHint").replace(
                        "{name}",
                        (state.user.personnelId != null
                          ? personnelNameById.get(state.user.personnelId)
                          : undefined) ??
                          state.user.fullName?.trim() ??
                          state.user.username
                      )}
                    </p>
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-amber-600"
                        checked={state.draftUnlinkPersonnel}
                        onChange={(e) => onPatch({ draftUnlinkPersonnel: e.target.checked })}
                      />
                      <span className="text-xs leading-relaxed text-amber-900">
                        {t("users.roleChangeUnlinkPersonnelCheckbox")}
                      </span>
                    </label>
                  </div>
                ) : null}

                {draftRoles.has("BRANCH_DAY_REGISTER") && branchDayRegisterCallout ? (
                  <>{branchDayRegisterCallout}</>
                ) : null}

                {draftRoles.size === 0 ? (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3 text-sm text-amber-950">
                    <p className="font-semibold">{t("users.rolesNoneSelectedTitle")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                      {t("users.rolesNoneSelectedHint")}
                    </p>
                  </div>
                ) : dirty ? (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-3 text-sm text-amber-950">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/90">
                      {t("users.roleChangePreviewHeading")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {[...draftRoles].map((c) => (
                        <StatusBadge key={c} tone="neutral" className="normal-case tracking-normal" size="md">
                          {getRoleLabel(c)}
                        </StatusBadge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
                      {t("users.roleChangeSessionHint")}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-0 sm:pb-3">
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
                  disabled={pending || !canSave}
                  onClick={onConfirm}
                >
                  {pending ? t("common.saving") : t("users.roleChangeConfirm")}
                </Button>
              </div>
            </div>
          );
        })()
      ) : null}
    </Modal>
  );
}
