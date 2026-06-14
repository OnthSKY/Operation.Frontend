"use client";

import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  canManageUserDataScopes,
  canManageUserPermissionOverrides,
  getUserDataScopesBlockReason,
} from "@/lib/auth/permissions";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  UserListItem,
  WarehouseScopeAssignment,
} from "@/types/user";
import type { AuthUser } from "@/lib/auth/types";
import type {
  PermissionDraftValue,
} from "@/modules/personnel/hooks/useUsersPermissionDraft";
import type { useUsersDialogs } from "@/modules/personnel/hooks/useUsersDialogs";

type MutationLike<T = unknown> = { mutateAsync: (input: T) => Promise<unknown>; isPending: boolean };

/**
 * UsersScreen'de tüm "close + confirm + open" akışlarını tek hook'a topla.
 *
 * SRP: yalnızca davranış (callback'ler). State (dialogs/drafts) ve mutation'lar
 * dışarıdan parametre olarak gelir; hook stateless'tir.
 */
type Params = {
  t: (k: string) => string;
  user: AuthUser | null | undefined;
  dialogs: ReturnType<typeof useUsersDialogs>;

  permissionDraft: Record<string, PermissionDraftValue>;
  setPermissionSearch: React.Dispatch<React.SetStateAction<string>>;
  setPermissionDraft: React.Dispatch<React.SetStateAction<Record<string, PermissionDraftValue>>>;

  branchScopeDraft: BranchScopeAssignment[];
  setBranchScopeDraft: React.Dispatch<React.SetStateAction<BranchScopeAssignment[]>>;
  warehouseScopeDraft: WarehouseScopeAssignment[];
  setWarehouseScopeDraft: React.Dispatch<React.SetStateAction<WarehouseScopeAssignment[]>>;
  personnelScopeDraft: PersonnelScopeAssignment[];
  setPersonnelScopeDraft: React.Dispatch<React.SetStateAction<PersonnelScopeAssignment[]>>;

  patchAccountStatus: MutationLike<{ userId: number; active: boolean }>;
  putUserPermissionOverrides: MutationLike<{
    userId: number;
    allowPermissionCodes: string[];
    denyPermissionCodes: string[];
  }>;
  putUserDataScopes: MutationLike<{
    userId: number;
    branchScopes: BranchScopeAssignment[];
    warehouseScopes: WarehouseScopeAssignment[];
    personnelScopes: PersonnelScopeAssignment[];
  }>;
  updateProfile: MutationLike<{
    userId: number;
    input: { username: string; fullName: string; email: string };
  }>;
  resetPassword: MutationLike<{ userId: number; password: string }>;
  softDeleteUser: MutationLike<number>;
  hardDeleteUser: MutationLike<number> & { mutateAsync: (id: number) => Promise<{ mode: string }> };
  setMfaEnabled: MutationLike<{ userId: number; enabled: boolean }>;
};

export function useUsersActions(p: Params) {
  const {
    t,
    user,
    dialogs,
    permissionDraft,
    setPermissionSearch,
    setPermissionDraft,
    branchScopeDraft,
    setBranchScopeDraft,
    warehouseScopeDraft,
    setWarehouseScopeDraft,
    personnelScopeDraft,
    setPersonnelScopeDraft,
    patchAccountStatus,
    putUserPermissionOverrides,
    putUserDataScopes,
    updateProfile,
    resetPassword,
    softDeleteUser,
    hardDeleteUser,
    setMfaEnabled,
  } = p;
  const {
    setPermissionsModalUser,
    setScopesModalUser,
    setAccountStatusDialog,
    setDeleteDialog,
    setMfaToggleDialog,
    setEditDialog,
    accountStatusDialog,
    permissionsModalUser,
    scopesModalUser,
    deleteDialog,
    mfaToggleDialog,
    editDialog,
  } = dialogs;

  // --- Account status ---
  function closeAccountStatusDialog() {
    if (patchAccountStatus.isPending) return;
    setAccountStatusDialog(null);
  }
  async function confirmAccountStatusDialog() {
    if (!accountStatusDialog) return;
    const { target: r, wantActive: active } = accountStatusDialog;
    if (user && r.id === user.id) {
      notify.error(t("users.statusChangeSelfDisabled"));
      closeAccountStatusDialog();
      return;
    }
    const cur = r.status.toUpperCase() === "ACTIVE";
    if (cur === active) {
      closeAccountStatusDialog();
      return;
    }
    try {
      await patchAccountStatus.mutateAsync({ userId: r.id, active });
      notify.success(active ? t("users.accountActivatedToast") : t("users.accountDeactivatedToast"));
      setAccountStatusDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  // --- Permissions ---
  function openPermissionsModal(r: UserListItem) {
    if (!canManageUserPermissionOverrides(user)) {
      notify.error(t("users.managePermissionsForbidden"));
      return;
    }
    setPermissionsModalUser(r);
    setPermissionSearch("");
    setPermissionDraft({});
  }
  function closePermissionsModal() {
    if (putUserPermissionOverrides.isPending) return;
    setPermissionsModalUser(null);
    setPermissionSearch("");
    setPermissionDraft({});
  }
  function setPermissionDecision(code: string, value: PermissionDraftValue) {
    setPermissionDraft((prev) => {
      if (value === "INHERIT") {
        if (!(code in prev)) return prev;
        const next = { ...prev };
        delete next[code];
        return next;
      }
      if (prev[code] === value) return prev;
      return { ...prev, [code]: value };
    });
  }
  async function saveUserPermissionOverrides() {
    if (!permissionsModalUser) return;
    if (!canManageUserPermissionOverrides(user)) {
      notify.error(t("users.managePermissionsForbidden"));
      return;
    }
    const allowPermissionCodes = Object.entries(permissionDraft)
      .filter(([, value]) => value === "ALLOW")
      .map(([code]) => code);
    const denyPermissionCodes = Object.entries(permissionDraft)
      .filter(([, value]) => value === "DENY")
      .map(([code]) => code);
    try {
      await putUserPermissionOverrides.mutateAsync({
        userId: permissionsModalUser.id,
        allowPermissionCodes,
        denyPermissionCodes,
      });
      notify.success(t("users.permissionsUpdated"));
      closePermissionsModal();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  // --- Scopes ---
  function openScopesModal(r: UserListItem) {
    if (!canManageUserDataScopes(user)) {
      const scopeBlock = getUserDataScopesBlockReason(user);
      notify.error(
        scopeBlock === "need_permission_overrides"
          ? t("users.manageScopesRequiresPermissionOverridesFirst")
          : t("users.manageScopesForbidden")
      );
      return;
    }
    setScopesModalUser(r);
    setBranchScopeDraft([]);
    setWarehouseScopeDraft([]);
    setPersonnelScopeDraft([]);
  }
  function closeScopesModal() {
    if (putUserDataScopes.isPending) return;
    setScopesModalUser(null);
    setBranchScopeDraft([]);
    setWarehouseScopeDraft([]);
    setPersonnelScopeDraft([]);
  }
  async function saveUserScopes() {
    if (!scopesModalUser) return;
    if (!canManageUserDataScopes(user)) {
      const scopeBlock = getUserDataScopesBlockReason(user);
      notify.error(
        scopeBlock === "need_permission_overrides"
          ? t("users.manageScopesRequiresPermissionOverridesFirst")
          : t("users.manageScopesForbidden")
      );
      return;
    }
    try {
      await putUserDataScopes.mutateAsync({
        userId: scopesModalUser.id,
        branchScopes: branchScopeDraft,
        warehouseScopes: warehouseScopeDraft,
        personnelScopes: personnelScopeDraft,
      });
      notify.success(t("users.scopesUpdated"));
      closeScopesModal();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  // --- Edit profile + reset password ---
  function openEditDialog(r: UserListItem) {
    setEditDialog({
      target: r,
      username: r.username,
      fullName: r.fullName ?? "",
      email: r.email ?? "",
      newPassword: "",
    });
  }
  function closeEditDialog() {
    if (updateProfile.isPending || resetPassword.isPending) return;
    setEditDialog(null);
  }
  async function confirmEditProfile() {
    if (!editDialog) return;
    const { target, username, fullName, email } = editDialog;
    if (!username.trim()) {
      notify.error(t("users.editUsernameRequired"));
      return;
    }
    try {
      await updateProfile.mutateAsync({
        userId: target.id,
        input: { username, fullName, email },
      });
      notify.success(t("users.editProfileSaved"));
      setEditDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }
  async function confirmResetPassword() {
    if (!editDialog) return;
    const { target, newPassword } = editDialog;
    if (newPassword.length < 8) {
      notify.error(t("users.passwordTooShort"));
      return;
    }
    try {
      await resetPassword.mutateAsync({ userId: target.id, password: newPassword });
      notify.success(t("users.passwordResetSaved"));
      setEditDialog((prev) => (prev ? { ...prev, newPassword: "" } : prev));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  // --- Delete (soft + hard) ---
  function closeDeleteDialog() {
    if (softDeleteUser.isPending || hardDeleteUser.isPending) return;
    setDeleteDialog(null);
  }
  async function confirmSoftDelete() {
    if (!deleteDialog) return;
    const r = deleteDialog.target;
    if (user && r.id === user.id) {
      notify.error(t("users.deleteSelfDisabled"));
      closeDeleteDialog();
      return;
    }
    try {
      await softDeleteUser.mutateAsync(r.id);
      notify.success(t("users.deleteSoftToast"));
      setDeleteDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }
  async function confirmHardDelete() {
    if (!deleteDialog) return;
    const r = deleteDialog.target;
    if (user && r.id === user.id) {
      notify.error(t("users.deleteSelfDisabled"));
      closeDeleteDialog();
      return;
    }
    try {
      const res = (await hardDeleteUser.mutateAsync(r.id)) as { mode: string };
      notify.success(
        res.mode === "HARD" ? t("users.deleteHardToast") : t("users.deleteHardFallbackToast")
      );
      setDeleteDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  // --- MFA toggle ---
  function closeMfaToggleDialog() {
    if (setMfaEnabled.isPending) return;
    setMfaToggleDialog(null);
  }
  async function confirmMfaToggle() {
    if (!mfaToggleDialog) return;
    const { target: r, wantEnabled } = mfaToggleDialog;
    try {
      await setMfaEnabled.mutateAsync({ userId: r.id, enabled: wantEnabled });
      notify.success(
        wantEnabled ? t("users.mfaAdminEnabledToast") : t("users.mfaAdminDisabledToast")
      );
      setMfaToggleDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  return {
    closeAccountStatusDialog,
    confirmAccountStatusDialog,
    openPermissionsModal,
    closePermissionsModal,
    setPermissionDecision,
    saveUserPermissionOverrides,
    openScopesModal,
    closeScopesModal,
    saveUserScopes,
    openEditDialog,
    closeEditDialog,
    confirmEditProfile,
    confirmResetPassword,
    closeDeleteDialog,
    confirmSoftDelete,
    confirmHardDelete,
    closeMfaToggleDialog,
    confirmMfaToggle,
  };
}
