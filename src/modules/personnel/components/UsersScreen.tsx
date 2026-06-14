"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  canManageUserDataScopes,
  canManageUserPermissionOverrides,
  getUserDataScopesBlockReason,
  hasPermissionCode,
  PERM,
} from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  usePutUserDataScopes,
  useCreateUser,
  useHardDeleteUser,
  usePatchUserAccountStatus,
  usePatchUserSelfFinancials,
  usePutUserPermissionOverrides,
  useResetUserPassword,
  useSetUserMfaEnabled,
  useSoftDeleteUser,
  useUpdateUserProfile,
  useUserDataScopes,
  useUserPermissionOverrides,
  useUsersList,
} from "@/modules/personnel/hooks/useUsersQueries";
import {
  useAuthorizationMatrix,
  usePutUserPersonnelLink,
  usePutUserRoles,
} from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import { groupPermissionsForMatrix } from "@/modules/admin/lib/permission-groups";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { type SelectOption } from "@/shared/ui/Select";
import type { Personnel } from "@/types/personnel";
import type { AppUserRole, UserListItem } from "@/types/user";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  WarehouseScopeAssignment,
} from "@/types/user";
import type { PermissionDefinition } from "@/types/authorization-matrix";
import {
  adminUsersRoleDescription,
  adminUsersRoleTitleOrFallback,
} from "@/modules/account/lib/role-label";
import { cn } from "@/lib/cn";
import { ToolbarGlyphUserPlus } from "@/shared/ui/ToolbarGlyph";
import { AlertTriangle, ChevronDown, History, KeyRound, Link2, MapPinned, Pencil, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { UsersAccountStatusDialog } from "@/modules/personnel/components/users/UsersAccountStatusDialog";
import { UsersMfaToggleDialog } from "@/modules/personnel/components/users/UsersMfaToggleDialog";
import { UsersDeleteDialog } from "@/modules/personnel/components/users/UsersDeleteDialog";
import { UsersPersonnelLinkModal } from "@/modules/personnel/components/users/UsersPersonnelLinkModal";
import { UsersEditProfileModal } from "@/modules/personnel/components/users/UsersEditProfileModal";
import { UsersCreateModal } from "@/modules/personnel/components/users/UsersCreateModal";
import { UsersRoleEditorModal } from "@/modules/personnel/components/users/UsersRoleEditorModal";
import { UsersPermissionsModal } from "@/modules/personnel/components/users/UsersPermissionsModal";
import { UsersScopesModal } from "@/modules/personnel/components/users/UsersScopesModal";
import { UsersListTable } from "@/modules/personnel/components/users/UsersListTable";
import { useUsersDialogs } from "@/modules/personnel/hooks/useUsersDialogs";
import { useUsersPermissionDraft } from "@/modules/personnel/hooks/useUsersPermissionDraft";
import { useUsersScopesDraft } from "@/modules/personnel/hooks/useUsersScopesDraft";
import { useUsersActions } from "@/modules/personnel/hooks/useUsersActions";

type FormValues = {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  role: AppUserRole;
  personnelId: string;
};

function BranchDayRegisterAdminSetupCallout({
  t,
  canOpenScopesAfterSave,
}: {
  t: (key: string) => string;
  canOpenScopesAfterSave: boolean;
}) {
  return (
    <div className="rounded-xl border border-violet-200/90 bg-violet-50/90 p-4 text-sm text-violet-950 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/90">
        {t("users.branchDayRegisterSetupTitle")}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-violet-900/90">
        {t("users.branchDayRegisterSetupIntro")}
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-violet-900/90">
        <li>{t("users.branchDayRegisterSetupStep1")}</li>
        <li>{t("users.branchDayRegisterSetupStep2")}</li>
        <li>{t("users.branchDayRegisterSetupStep3")}</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-violet-800/90">{t("users.branchDayRegisterSetupNote")}</p>
      {canOpenScopesAfterSave ? (
        <p className="mt-2 text-xs font-semibold text-violet-900">{t("users.branchDayRegisterSetupAfterSaveHint")}</p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-violet-800/90">
          {t("users.branchDayRegisterSetupNeedScopesPermission")}
        </p>
      )}
      <p className="mt-3">
        <Link
          href="/guide?tab=admin"
          className="text-xs font-semibold text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950"
        >
          {t("users.branchDayRegisterSetupGuideLink")}
        </Link>
      </p>
    </div>
  );
}

type PermissionDraftValue = "INHERIT" | "ALLOW" | "DENY";

function isExplicitPersonnelScope(row: PersonnelScopeAssignment): boolean {
  return row.source !== "BRANCH_RESPONSIBLE";
}

function personnelAtBranchSorted(personnel: Personnel[], branchId: number, collatorLocale: string): Personnel[] {
  return personnel
    .filter((p) => !p.isDeleted && p.branchId === branchId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, collatorLocale));
}

function permissionPrimaryLabel(p: PermissionDefinition): string {
  return (p.description ?? "").trim() || p.code;
}

function formatUserListCountMessage(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count));
}

/** Kullanıcının atanmış rolleri (UPPER, sıralı). `roles` boşsa birincil role düşer. */
function userRolesUpper(r: UserListItem): string[] {
  const list =
    Array.isArray(r.roles) && r.roles.length > 0
      ? r.roles
      : r.role
        ? [r.role]
        : [];
  return list.map((c) => String(c).trim().toUpperCase()).filter((c) => c.length > 0);
}

function userHasRole(r: UserListItem, code: string): boolean {
  return userRolesUpper(r).includes(code.toUpperCase());
}

// Bir personel kaydına bağlanması ZORUNLU roller (portal rolleri): hesap bu kayıt üzerinden
// kimliklenir (şube/şoför kimliği, kendi mali görünümü, sevkiyat teslim imzası vb.).
const ROLES_REQUIRING_PERSONNEL = new Set(["PERSONNEL", "DRIVER"]);
function roleRequiresPersonnel(code: string): boolean {
  return ROLES_REQUIRING_PERSONNEL.has(String(code).trim().toUpperCase());
}

// Yerine `adminUsersRoleDescription` paylaşılan helper'ı kullanılıyor (@/modules/account/lib/role-label).

function userPermissionSummaryLines(
  r: UserListItem,
  t: (key: string) => string
): { overrides: string; scopes: string } {
  const oc = r.permissionOverrideCount ?? 0;
  const sc = r.customDataScopeCount ?? 0;
  return {
    overrides:
      oc === 0
        ? t("users.listOverrideNone")
        : formatUserListCountMessage(t("users.listOverrideSome"), oc),
    scopes:
      sc === 0
        ? t("users.listScopeNone")
        : formatUserListCountMessage(t("users.listScopeSome"), sc),
  };
}

export function UsersScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady } = useAuth();
  const dialogs = useUsersDialogs();
  const {
    modalOpen,
    setModalOpen,
    pulseUserId,
    setPulseUserId,
    permissionsModalUser,
    setPermissionsModalUser,
    scopesModalUser,
    setScopesModalUser,
    roleEditor,
    setRoleEditor,
    personnelLinkDialog,
    setPersonnelLinkDialog,
    accountStatusDialog,
    setAccountStatusDialog,
    deleteDialog,
    setDeleteDialog,
    mfaToggleDialog,
    setMfaToggleDialog,
    editDialog,
    setEditDialog,
  } = dialogs;
  const isAdminUser = hasPermissionCode(user, PERM.systemAdmin);
  const { data: rows = [], isLoading, isError, refetch } = useUsersList(
    Boolean(isReady && isAdminUser)
  );
  const { data: personnelListResult } = usePersonnelList(defaultPersonnelListFilters);
  const personnel = personnelListResult?.items ?? [];
  const createUser = useCreateUser();
  const patchSelfFin = usePatchUserSelfFinancials();
  const putRoles = usePutUserRoles();
  const putPersonnelLink = usePutUserPersonnelLink();
  const patchAccountStatus = usePatchUserAccountStatus();
  const softDeleteUser = useSoftDeleteUser();
  const hardDeleteUser = useHardDeleteUser();
  const updateProfile = useUpdateUserProfile();
  const resetPassword = useResetUserPassword();
  const setMfaEnabled = useSetUserMfaEnabled();
  const putUserPermissionOverrides = usePutUserPermissionOverrides();
  const putUserDataScopes = usePutUserDataScopes();
  const { data: matrixData } = useAuthorizationMatrix(Boolean(isReady && isAdminUser));
  const { data: userPermissionData, isLoading: isUserPermissionsLoading } =
    useUserPermissionOverrides(
      permissionsModalUser?.id ?? null,
      Boolean(isReady && isAdminUser && permissionsModalUser)
    );
  const { data: userScopesData, isLoading: isUserScopesLoading } = useUserDataScopes(
    scopesModalUser?.id ?? null,
    Boolean(isReady && isAdminUser && scopesModalUser)
  );

  const {
    permissionSearch,
    setPermissionSearch,
    permissionDraft,
    setPermissionDraft,
    permHelpDetailsRef,
  } = useUsersPermissionDraft({ permissionsModalUser, userPermissionData });

  const {
    branchScopeDraft,
    setBranchScopeDraft,
    warehouseScopeDraft,
    setWarehouseScopeDraft,
    personnelScopeDraft,
    setPersonnelScopeDraft,
  } = useUsersScopesDraft({
    scopesModalUser,
    userScopesData,
    isExplicitPersonnelScope,
  });

  const personnelNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of personnel) {
      if (!p.isDeleted) m.set(p.id, personnelDisplayName(p));
    }
    return m;
  }, [personnel]);

  useEffect(() => {
    if (isReady && user && !hasPermissionCode(user, PERM.systemAdmin))
      router.replace("/personnel");
  }, [isReady, user, router]);

  useEffect(() => {
    const raw = searchParams.get("openUser");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    setPulseUserId(id);
  }, [searchParams]);

  useEffect(() => {
    if (pulseUserId == null || rows.length === 0) return;
    if (!rows.some((r) => r.id === pulseUserId)) return;
    const el = document.getElementById(`global-user-row-${pulseUserId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setPulseUserId(null), 2800);
    return () => window.clearTimeout(timer);
  }, [pulseUserId, rows]);


  const personnelOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("users.personnelPlaceholder") },
      ...personnel
        .filter((p) => !p.isDeleted)
        .map((p) => ({
          value: String(p.id),
          label: personnelDisplayName(p),
        })),
    ],
    [personnel, t]
  );

  const personnelOptionsForPersonnelRole: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("users.personnelPlaceholder") },
      ...personnel
        .filter((p) => !p.isDeleted && p.branchId != null && p.branchId > 0)
        .map((p) => ({
          value: String(p.id),
          label: personnelDisplayName(p),
        })),
    ],
    [personnel, t]
  );

  const personnelOptionsForDriverRole: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("users.personnelPlaceholder") },
      ...personnel
        .filter((p) => !p.isDeleted)
        .map((p) => ({
          value: String(p.id),
          label: personnelDisplayName(p),
        })),
    ],
    [personnel, t]
  );

  const roleOptions: SelectOption[] = useMemo(
    () => [
      { value: "STAFF", label: t("users.roleStaff") },
      { value: "ADMIN", label: t("users.roleAdmin") },
      { value: "PERSONNEL", label: t("users.rolePersonnel") },
      { value: "DRIVER", label: t("users.roleDriver") },
      { value: "VIEWER", label: t("users.roleViewer") },
      { value: "FINANCE", label: t("users.roleFinance") },
      { value: "PROCUREMENT", label: t("users.roleProcurement") },
      { value: "BRANCH_DAY_REGISTER", label: t("users.roleBranchDayRegister") },
    ],
    [t]
  );

  const getRoleLabel = useCallback(
    (code: string) => {
      const ro = String(code).trim().toUpperCase();
      return adminUsersRoleTitleOrFallback(ro, ro, t);
    },
    [t]
  );

  // ---- Kapsam (scope) gerektiren rol tespiti ----
  // Backend tek doğruluk kaynağı: matrix `scopeRequiringPermissionCodes` döner. Bir rol setinin
  // izin birleşimi bu kümeyle kesişiyorsa, o roller kapsam tanımlanmadan eksik/hatalı çalışır.
  const scopeRequiringCodeSet = useMemo(
    () => new Set((matrixData?.scopeRequiringPermissionCodes ?? []).map((c) => c.toUpperCase())),
    [matrixData]
  );

  const rolePermsByCode = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of matrixData?.roles ?? []) {
      m.set(String(row.roleCode).toUpperCase(), row.permissionCodes ?? []);
    }
    return m;
  }, [matrixData]);

  // Verilen rol kodları kümesi kapsam gerektiriyor mu? (izin birleşimi ∩ scopeRequiringCodeSet)
  const rolesRequireScope = useCallback(
    (roleCodes: string[]) => {
      if (scopeRequiringCodeSet.size === 0) return false;
      for (const rc of roleCodes) {
        const perms = rolePermsByCode.get(rc.toUpperCase());
        if (!perms) continue;
        for (const p of perms) {
          if (scopeRequiringCodeSet.has(p.toUpperCase())) return true;
        }
      }
      return false;
    },
    [scopeRequiringCodeSet, rolePermsByCode]
  );

  // Kullanıcı kapsam-gerektiren bir role sahip ama hiç kapsam tanımı yoksa → eksik (uyarı göster).
  const userIsMissingScope = useCallback(
    (r: UserListItem) =>
      (r.customDataScopeCount ?? 0) === 0 && rolesRequireScope(userRolesUpper(r)),
    [rolesRequireScope]
  );

  const {
    register,
    watch,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
      fullName: "",
      role: "STAFF",
      personnelId: "",
    },
  });

  const { field: roleField } = useController({
    name: "role",
    control,
    defaultValue: "STAFF",
  });

  const { field: personnelField } = useController({
    name: "personnelId",
    control,
    defaultValue: "",
  });

  const createUserRoleDetailText = useMemo(
    () => adminUsersRoleDescription(String(roleField.value ?? "STAFF"), t),
    [roleField.value, t]
  );

  function personnelCell(r: UserListItem): string {
    if (r.personnelId == null) return t("users.personnelNone");
    return (
      personnelNameById.get(r.personnelId) ?? String(r.personnelId)
    );
  }

  // Personel bağı: ada ek olarak rolden bağımsız "bağla / değiştir" butonu. Kendi hesabında
  // personel bağı değişimi oturumu sonlandıracağından (personnel_id JWT claim'inde) engellenir.
  function renderPersonnelControl(r: UserListItem) {
    const linked = r.personnelId != null;
    const selfBlock = Boolean(user && r.id === user.id);
    const pending =
      putPersonnelLink.isPending && putPersonnelLink.variables?.userId === r.id;
    const label = linked
      ? t("users.personnelLinkChangeButton")
      : t("users.personnelLinkButton");
    return (
      <div className="flex min-w-0 items-center justify-end gap-2 lg:justify-start">
        <span
          className={cn(
            "min-w-0 truncate text-sm font-medium",
            linked ? "text-zinc-800" : "text-zinc-400"
          )}
        >
          {personnelCell(r)}
        </span>
        {selfBlock ? (
          <Tooltip content={t("users.personnelLinkSelfDisabled")} delayMs={200}>
            <span className="inline-flex shrink-0">
              <Button
                type="button"
                variant="secondary"
                disabled
                className="inline-flex h-8 w-8 items-center justify-center p-0"
                aria-label={t("users.personnelLinkSelfDisabled")}
              >
                <Link2 className="h-4 w-4" aria-hidden />
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Tooltip content={label} delayMs={200}>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 !rounded-lg !px-2.5 !text-xs !font-medium"
              onClick={() =>
                setPersonnelLinkDialog({
                  user: r,
                  draftPersonnelId: r.personnelId != null ? String(r.personnelId) : "",
                })
              }
              aria-label={label}
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }

  function closePersonnelLinkDialog() {
    setPersonnelLinkDialog(null);
  }

  async function confirmPersonnelLink() {
    if (!personnelLinkDialog) return;
    const { user: lu, draftPersonnelId } = personnelLinkDialog;
    if (user && lu.id === user.id) return;

    const sel = draftPersonnelId.trim();
    let personnelId: number | null = null;
    if (sel) {
      const id = Number.parseInt(sel, 10);
      if (!Number.isFinite(id) || id <= 0) {
        notify.error(t("users.personnelPickInvalid"));
        return;
      }
      personnelId = id;
    }

    try {
      await putPersonnelLink.mutateAsync({ userId: lu.id, personnelId });
      notify.success(
        personnelId == null
          ? t("users.personnelUnlinked")
          : t("users.personnelLinked")
      );
      setPersonnelLinkDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  const permissionDefinitions = matrixData?.permissions ?? [];
  const filteredPermissions = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();
    if (!q) return permissionDefinitions;
    return permissionDefinitions.filter((p) => {
      const label = permissionPrimaryLabel(p).toLowerCase();
      return label.includes(q) || p.code.toLowerCase().includes(q);
    });
  }, [permissionDefinitions, permissionSearch]);

  const groupedPermissions = useMemo(
    () => groupPermissionsForMatrix(filteredPermissions),
    [filteredPermissions]
  );

  const permUserRoleLabel = useMemo(() => {
    if (!permissionsModalUser) return "";
    const ro = String(permissionsModalUser.role ?? "").trim().toUpperCase();
    const opt = roleOptions.find((o) => String(o.value).toUpperCase() === ro);
    return opt?.label ?? permissionsModalUser.role;
  }, [permissionsModalUser, roleOptions]);

  const roleMatrixBaseline = useMemo(() => {
    if (!permissionsModalUser) return { kind: "idle" as const };
    if (!matrixData) return { kind: "loading" as const };
    const rc = String(permissionsModalUser.role ?? "").trim().toUpperCase();
    const sourcePerms =
      matrixData.permissions && matrixData.permissions.length > 0
        ? matrixData.permissions
        : permissionDefinitions;
    if (rc === "ADMIN") {
      return { kind: "ok" as const, set: new Set(sourcePerms.map((p) => p.code)) };
    }
    const row = matrixData.roles.find((r) => String(r.roleCode).toUpperCase() === rc);
    if (!row) return { kind: "missing" as const };
    return { kind: "ok" as const, set: new Set(row.permissionCodes) };
  }, [matrixData, permissionsModalUser, permissionDefinitions]);

  const branchScopeLevelOptions: SelectOption[] = useMemo(
    () => [
      { value: "SUMMARY", label: t("users.branchScopeSummary") },
      { value: "OPERATIONS", label: t("users.branchScopeOperations") },
      { value: "ALL_DATA", label: t("users.branchScopeAllData") },
    ],
    [t]
  );

  const warehouseScopeLevelOptions: SelectOption[] = useMemo(
    () => [
      { value: "READ", label: t("users.warehouseScopeRead") },
      { value: "OPERATIONS", label: t("users.warehouseScopeOperations") },
      { value: "ALL_DATA", label: t("users.warehouseScopeAllData") },
    ],
    [t]
  );

  const personnelScopeLevelOptions: SelectOption[] = useMemo(
    () => [
      { value: "SELF", label: t("users.personnelScopeSelf") },
      { value: "BRANCH_SUMMARY", label: t("users.personnelScopeBranchSummary") },
      { value: "BRANCH_ALL_DATA", label: t("users.personnelScopeBranchAllData") },
      { value: "ALL_PERSONNEL_DATA", label: t("users.personnelScopeAllPersonnelData") },
      { value: "ADVANCE_DELEGATE_TARGET", label: t("users.personnelScopeAdvanceDelegateTarget") },
    ],
    [t]
  );

  const permissionDraftStats = useMemo(() => {
    let allowCount = 0;
    let denyCount = 0;
    for (const value of Object.values(permissionDraft)) {
      if (value === "ALLOW") allowCount += 1;
      if (value === "DENY") denyCount += 1;
    }
    return { allowCount, denyCount };
  }, [permissionDraft]);

  const roleMatrixPermissionCounts = useMemo(() => {
    if (!permissionsModalUser) return { kind: "idle" as const };
    if (!matrixData || roleMatrixBaseline.kind === "loading") return { kind: "loading" as const };
    if (roleMatrixBaseline.kind === "missing") return { kind: "missing" as const };
    if (roleMatrixBaseline.kind === "idle") return { kind: "idle" as const };
    const total = permissionDefinitions.length;
    let granted = 0;
    for (const p of permissionDefinitions) {
      if (roleMatrixBaseline.set.has(p.code)) granted += 1;
    }
    return {
      kind: "ok" as const,
      granted,
      notGranted: Math.max(0, total - granted),
      total,
    };
  }, [permissionsModalUser, matrixData, roleMatrixBaseline, permissionDefinitions]);

  const savedOverrideStats = useMemo(() => {
    if (!userPermissionData) return null;
    const list = userPermissionData.overrides ?? [];
    let allow = 0;
    let deny = 0;
    for (const o of list) {
      if (o.effect === "DENY") deny += 1;
      else allow += 1;
    }
    return { allow, deny, total: list.length };
  }, [userPermissionData]);

  const permissionInheritDraftCount = useMemo(
    () =>
      Math.max(
        0,
        permissionDefinitions.length - permissionDraftStats.allowCount - permissionDraftStats.denyCount
      ),
    [permissionDefinitions.length, permissionDraftStats.allowCount, permissionDraftStats.denyCount]
  );

  const hasPermissionDraftChanges = useMemo(() => {
    if (!userPermissionData) return false;
    const original = new Map<string, PermissionDraftValue>();
    for (const item of userPermissionData.overrides) {
      original.set(item.permissionCode, item.effect === "DENY" ? "DENY" : "ALLOW");
    }
    const allCodes = new Set<string>([
      ...Object.keys(permissionDraft),
      ...original.keys(),
    ]);
    for (const code of allCodes) {
      const cur = permissionDraft[code] ?? "INHERIT";
      const prev = original.get(code) ?? "INHERIT";
      if (cur !== prev) return true;
    }
    return false;
  }, [permissionDraft, userPermissionData]);

  const hasScopesDraftChanges = useMemo(() => {
    if (!userScopesData) return false;
    const normBranch = (x: BranchScopeAssignment[]) =>
      [...x]
        .map((v) => `${v.branchId}:${v.scopeLevel}`)
        .sort()
        .join("|");
    const normWarehouse = (x: WarehouseScopeAssignment[]) =>
      [...x]
        .map((v) => `${v.warehouseId}:${v.scopeLevel}`)
        .sort()
        .join("|");
    const normPersonnel = (x: PersonnelScopeAssignment[]) =>
      [...x]
        .filter(isExplicitPersonnelScope)
        .map((v) => `${v.personnelId ?? 0}:${v.branchId ?? 0}:${v.scopeLevel}`)
        .sort()
        .join("|");
    return (
      normBranch(userScopesData.branchScopes ?? []) !== normBranch(branchScopeDraft) ||
      normWarehouse(userScopesData.warehouseScopes ?? []) !== normWarehouse(warehouseScopeDraft) ||
      normPersonnel(userScopesData.personnelScopes ?? []) !== normPersonnel(personnelScopeDraft)
    );
  }, [userScopesData, branchScopeDraft, warehouseScopeDraft, personnelScopeDraft]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!hasPermissionCode(user, PERM.systemAdmin)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  function closeRoleEditor() {
    if (putRoles.isPending) return;
    setRoleEditor(null);
  }

  function toggleDraftRole(code: string) {
    const C = code.toUpperCase();
    setRoleEditor((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.draftRoles);
      if (next.has(C)) next.delete(C);
      else next.add(C);
      return { ...prev, draftRoles: next };
    });
  }

  async function confirmRoleEditor() {
    if (!roleEditor) return;
    const { user: ru, draftRoles, draftPersonnelId, draftUnlinkPersonnel } = roleEditor;
    if (user && ru.id === user.id) return;

    const codes = [...draftRoles].map((c) => c.toUpperCase());
    if (codes.length === 0) {
      notify.error(t("users.rolesNoneSelectedError"));
      return;
    }

    const wantsPortal = draftRoles.has("PERSONNEL") || draftRoles.has("DRIVER");
    let personnelId: number | undefined;
    if (wantsPortal) {
      const sel = draftPersonnelId.trim();
      if (sel) {
        const id = Number.parseInt(sel, 10);
        if (!Number.isFinite(id) || id <= 0) {
          notify.error(t("users.personnelPickInvalid"));
          return;
        }
        personnelId = id;
      } else if (ru.personnelId == null) {
        notify.error(t("users.roleChangePersonnelRequired"));
        return;
      }
    }

    // Bağı kaldır yalnızca portal rolü yokken ve kullanıcı zaten bir personele bağlıyken geçerli.
    const unlinkPersonnel = !wantsPortal && draftUnlinkPersonnel && ru.personnelId != null;

    // Kapsam gerektiren rol atandı ve kullanıcının henüz hiç kapsamı yoksa → admini yönlendir (zorlamaz).
    const needsScopeGuidance =
      rolesRequireScope(codes) && (ru.customDataScopeCount ?? 0) === 0;

    try {
      await putRoles.mutateAsync({
        userId: ru.id,
        roleCodes: codes,
        ...(personnelId != null ? { personnelId } : {}),
        ...(unlinkPersonnel ? { unlinkPersonnel: true } : {}),
      });
      notify.success(t("users.roleUpdated"));
      setRoleEditor(null);
      if (needsScopeGuidance) {
        const row: UserListItem = { ...ru, role: codes[0], roles: codes };
        if (canManageUserDataScopes(user)) {
          queueMicrotask(() => openScopesModal(row));
        } else {
          notify.info(t("users.scopeRequiredRoleSavedNeedScopesPermission"), {
            autoClose: 9000,
          });
        }
      }
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  function renderUserRoleBadges(r: UserListItem) {
    const codes = userRolesUpper(r);
    if (codes.length === 0) {
      return <span className="text-sm text-zinc-400">{t("personnel.dash")}</span>;
    }
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {codes.map((c) => (
          <StatusBadge
            key={c}
            tone="neutral"
            className="!rounded-full !px-2 !py-0.5 !text-[10px] normal-case leading-tight tracking-normal"
            size="sm"
          >
            {getRoleLabel(c)}
          </StatusBadge>
        ))}
      </span>
    );
  }

  // Kapsam-gerektiren rol var ama kapsam tanımlı değil → kalıcı uyarı (engelleme yok).
  function renderScopeMissingWarning(r: UserListItem) {
    if (!userIsMissingScope(r)) return null;
    const canScope = getUserDataScopesBlockReason(user) === "none";
    return (
      <button
        type="button"
        disabled={!canScope}
        onClick={() => canScope && openScopesModal(r)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-left text-[11px] font-medium leading-snug text-amber-900",
          canScope ? "hover:bg-amber-100 cursor-pointer" : "cursor-default"
        )}
        title={t("users.scopeMissingHint")}
        aria-label={t("users.scopeMissingHint")}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
        <span>{t("users.scopeMissingBadge")}</span>
      </button>
    );
  }

  function renderUserRoleControl(r: UserListItem) {
    const selfBlock = Boolean(user && r.id === user.id);
    const pending = putRoles.isPending && putRoles.variables?.userId === r.id;
    // Roller artık düz badge olarak gösterilir; düzenleme yanlarındaki ayrı bir
    // "Rol düzenle" dropdown-tetikleyici butonla yapılır (badge'in kendisi tıklanabilir değil).
    return (
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <div className="min-w-0">{renderUserRoleBadges(r)}</div>
        {selfBlock ? (
          <Tooltip content={t("users.roleChangeSelfDisabled")} delayMs={200}>
            <span className="inline-flex shrink-0">
              <Button
                type="button"
                variant="secondary"
                disabled
                className="inline-flex h-8 w-8 items-center justify-center p-0"
                aria-label={t("users.roleChangeSelfDisabled")}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Tooltip content={t("users.roleEditButton")} delayMs={200}>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 !rounded-lg !px-2.5 !text-xs !font-medium"
              onClick={() =>
                setRoleEditor({
                  user: r,
                  draftRoles: new Set(userRolesUpper(r)),
                  draftPersonnelId: r.personnelId != null ? String(r.personnelId) : "",
                  draftUnlinkPersonnel: false,
                })
              }
              aria-label={t("users.roleEditButton")}
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{t("users.roleEditButton")}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }

  async function onToggleSelfFin(r: UserListItem, allow: boolean) {
    try {
      await patchSelfFin.mutateAsync({
        userId: r.id,
        allowPersonnelSelfFinancials: allow,
      });
      notify.success(t("users.selfFinancialsUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  const {
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
  } = useUsersActions({
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
  });

  function editAction(r: UserListItem) {
    return (
      <Tooltip content={t("users.editUser")} delayMs={200}>
        <Button
          type="button"
          variant="secondary"
          className={TABLE_TOOLBAR_ICON_BTN}
          onClick={() => openEditDialog(r)}
          aria-label={t("users.editUser")}
        >
          <Pencil className="h-5 w-5" aria-hidden />
        </Button>
      </Tooltip>
    );
  }

  function mfaToggleAction(r: UserListItem) {
    const isSystemAdmin = hasPermissionCode(user, PERM.systemAdmin);
    if (!isSystemAdmin) return null;

    const isEnabled = Boolean(r.totpEnabled);
    const secretPresent = Boolean(r.totpSecretPresent);

    // Hiç MFA kurulmamış kullanıcı için buton göstermek karışıklık yaratır — gizle.
    if (!isEnabled && !secretPresent) return null;

    const wantEnabled = !isEnabled;
    const tooltip = isEnabled
      ? t("users.mfaAdminDisableTooltip")
      : t("users.mfaAdminEnableTooltip");
    const label = isEnabled
      ? t("users.mfaAdminDisableButton")
      : t("users.mfaAdminEnableButton");

    return (
      <Tooltip content={tooltip} delayMs={200}>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center p-0",
            isEnabled
              ? "!border-amber-200 !text-amber-800 hover:!bg-amber-50"
              : "!border-emerald-200 !text-emerald-800 hover:!bg-emerald-50"
          )}
          disabled={setMfaEnabled.isPending}
          onClick={() => setMfaToggleDialog({ target: r, wantEnabled })}
          aria-label={label}
        >
          {isEnabled ? (
            <ShieldOff className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </Button>
      </Tooltip>
    );
  }

  function deleteAction(r: UserListItem, opts?: { compact?: boolean }) {
    const compact = opts?.compact === true;
    const selfBlock = Boolean(user && r.id === user.id);
    const pending =
      (softDeleteUser.isPending && softDeleteUser.variables === r.id) ||
      (hardDeleteUser.isPending && hardDeleteUser.variables === r.id);
    const label = t("users.deleteUser");
    return (
      <Tooltip
        content={selfBlock ? t("users.deleteSelfDisabled") : t("users.deleteUserHint")}
        delayMs={200}
      >
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "inline-flex shrink-0 items-center whitespace-nowrap !border-red-200 font-medium !text-red-700 hover:!bg-red-50",
            compact ? "h-8 w-8 justify-center p-0" : "gap-1.5 px-2.5 py-1.5 text-xs"
          )}
          disabled={selfBlock || pending}
          onClick={() => {
            if (selfBlock) return;
            setDeleteDialog({ target: r });
          }}
          aria-label={label}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          {compact ? null : <span>{label}</span>}
        </Button>
      </Tooltip>
    );
  }

  function accountStatusAction(r: UserListItem, opts?: { compact?: boolean }) {
    const compact = opts?.compact === true;
    const isActive = r.status.toUpperCase() === "ACTIVE";
    const selfBlock = Boolean(user && r.id === user.id);
    const pending =
      patchAccountStatus.isPending && patchAccountStatus.variables?.userId === r.id;
    const label = isActive ? t("users.deactivateUser") : t("users.activateUser");
    const hint = selfBlock
      ? t("users.statusChangeSelfDisabled")
      : isActive
        ? t("users.deactivateUserHint")
        : t("users.activateUserHint");
    return (
      <Tooltip content={hint} delayMs={200}>
        <Button
          type="button"
          variant={isActive ? "secondary" : "primary"}
          className={cn(
            "inline-flex shrink-0 items-center whitespace-nowrap font-medium",
            compact ? "h-8 w-8 justify-center p-0" : "gap-1.5 px-2.5 py-1.5 text-xs"
          )}
          disabled={selfBlock || pending}
          onClick={() => {
            if (selfBlock) return;
            setAccountStatusDialog({ target: r, wantActive: !isActive });
          }}
          aria-label={label}
        >
          {isActive ? (
            <UserX className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {compact ? null : <span>{label}</span>}
        </Button>
      </Tooltip>
    );
  }

  function renderUserAuthIconButtons(r: UserListItem) {
    const canPerm = canManageUserPermissionOverrides(user);
    const scopeBlock = getUserDataScopesBlockReason(user);
    const canScope = scopeBlock === "none";
    const scopeTooltip =
      scopeBlock === "none"
        ? t("users.manageScopes")
        : scopeBlock === "need_permission_overrides"
          ? t("users.manageScopesRequiresPermissionOverridesFirst")
          : t("users.manageScopesForbidden");
    return (
      <div className="flex flex-wrap items-center gap-2">
        {editAction(r)}
        <Tooltip
          content={
            canPerm ? t("users.managePermissions") : t("users.managePermissionsForbidden")
          }
          delayMs={200}
        >
          <Button
            type="button"
            variant="secondary"
            className={TABLE_TOOLBAR_ICON_BTN}
            disabled={!canPerm}
            onClick={() => openPermissionsModal(r)}
            aria-label={t("users.managePermissions")}
          >
            <KeyRound className="h-5 w-5" aria-hidden />
          </Button>
        </Tooltip>
        <Tooltip content={scopeTooltip} delayMs={200}>
          <Button
            type="button"
            variant="secondary"
            className={TABLE_TOOLBAR_ICON_BTN}
            disabled={!canScope}
            onClick={() => openScopesModal(r)}
            aria-label={t("users.manageScopes")}
          >
            <MapPinned className="h-5 w-5" aria-hidden />
          </Button>
        </Tooltip>
        <Tooltip content={t("audit.openButtonAria")} delayMs={200}>
          <Button
            type="button"
            variant="secondary"
            className={TABLE_TOOLBAR_ICON_BTN}
            disabled={!isAdminUser}
            onClick={() => router.push(`/admin/users/${r.id}/audit`)}
            aria-label={t("audit.openButtonAria")}
          >
            <History className="h-5 w-5" aria-hidden />
          </Button>
        </Tooltip>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const pw = values.password;
    if (pw.length < 8) {
      notify.error(t("users.passwordTooShort"));
      return;
    }
    if (pw !== values.passwordConfirm) {
      notify.error(t("users.passwordMismatch"));
      return;
    }
    const pidRaw = values.personnelId.trim();
    let personnelId: number | null = null;
    if (pidRaw !== "") {
      const n = Number(pidRaw);
      if (Number.isNaN(n) || n <= 0 || !Number.isInteger(n)) {
        notify.error(t("users.personnelPickInvalid"));
        return;
      }
      personnelId = n;
    }

    if (values.role === "PERSONNEL" && personnelId == null) {
      notify.error(t("users.personnelRequiredForPortalRole"));
      return;
    }

    if (values.role === "DRIVER" && personnelId == null) {
      notify.error(t("users.personnelRequiredForDriverRole"));
      return;
    }

    try {
      const created = await createUser.mutateAsync({
        username: values.username.trim(),
        password: pw,
        fullName: values.fullName.trim() || null,
        role: values.role,
        personnelId,
      });
      notify.success(t("toast.userCreated"));
      reset();
      setModalOpen(false);
      // Yeni kullanıcının (tek) rolü kapsam gerektiriyorsa → kapsam tanımlamaya yönlendir.
      if (rolesRequireScope([values.role])) {
        if (canManageUserDataScopes(user)) {
          queueMicrotask(() => openScopesModal(created));
        } else {
          notify.info(t("users.scopeRequiredUserCreatedNeedScopesPermission"), {
            autoClose: 9000,
          });
        }
      }
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const requestModalClose = () => {
    if (
      isDirty &&
      !createUser.isPending &&
      !window.confirm(t("common.modalConfirmOutsideCloseMessage"))
    ) {
      return;
    }
    setModalOpen(false);
    reset();
  };

  return (
    <>
      <PageScreenScaffold
        className="mx-auto w-full min-w-0 flex-1 app-page-max p-4 md:p-6"
        top={
          <div className="min-w-0">
            <Link
              href="/admin/settings"
              className="text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              ← {t("settings.backToSettings")}
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
              {t("users.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t("users.description")}</p>
          </div>
        }
        intro={
          <PageWhenToUseGuide
            guideTab="admin"
            className="mt-1"
            title={t("common.pageWhenToUseTitle")}
            description={t("pageHelp.users.intro")}
            listVariant="ordered"
            items={[
              { text: t("pageHelp.users.step1") },
              { text: t("pageHelp.users.step2") },
              { text: t("pageHelp.users.step4") },
              {
                text: t("pageHelp.users.step3"),
                link: {
                  href: "/admin/settings/authorization",
                  label: t("pageHelp.users.step3Link"),
                },
              },
              { text: t("pageHelp.users.step5") },
            ]}
          />
        }
        main={
          <Card
            className="overflow-hidden"
            headerActions={
              <Tooltip content={t("users.addUser")} delayMs={200}>
                <Button
                  type="button"
                  variant="primary"
                  className={TABLE_TOOLBAR_ICON_BTN}
                  onClick={() => setModalOpen(true)}
                  aria-label={t("users.addUser")}
                >
                  <ToolbarGlyphUserPlus className="h-5 w-5" />
                </Button>
              </Tooltip>
            }
          >
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {t("common.loading")}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 p-8">
            <p className="text-sm text-red-600">{t("users.loadError")}</p>
            <Button type="button" variant="secondary" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {t("users.empty")}
          </div>
        ) : (
          <UsersListTable
            rows={rows}
            api={{
              isPulse: (r) => pulseUserId === r.id,
              permSummary: (r) => userPermissionSummaryLines(r, t),
              userHasRole,
              mfaToggleAction,
              accountStatusAction,
              deleteAction,
              renderUserRoleControl,
              renderPersonnelControl,
              renderScopeMissingWarning,
              renderUserAuthIconButtons,
              canManageUserDataScopes: canManageUserDataScopes(user),
              patchSelfFinPendingForUser: (r) =>
                patchSelfFin.isPending && patchSelfFin.variables?.userId === r.id,
              onToggleSelfFin: (r, checked) => void onToggleSelfFin(r, checked),
            }}
          />
        )}
          </Card>
        }
      />

      <UsersScopesModal
        user={scopesModalUser}
        onClose={closeScopesModal}
        loading={isUserScopesLoading}
        saving={putUserDataScopes.isPending}
        onSave={() => void saveUserScopes()}
        hasChanges={hasScopesDraftChanges}
        data={userScopesData}
        personnel={personnel}
        branchScopeLevelOptions={branchScopeLevelOptions}
        warehouseScopeLevelOptions={warehouseScopeLevelOptions}
        personnelScopeLevelOptions={personnelScopeLevelOptions}
        branchScopeDraft={branchScopeDraft}
        setBranchScopeDraft={setBranchScopeDraft}
        warehouseScopeDraft={warehouseScopeDraft}
        setWarehouseScopeDraft={setWarehouseScopeDraft}
        personnelScopeDraft={personnelScopeDraft}
        setPersonnelScopeDraft={setPersonnelScopeDraft}
        personnelAtBranchSorted={personnelAtBranchSorted}
      />

      <UsersPermissionsModal
        user={permissionsModalUser}
        onClose={closePermissionsModal}
        permHelpDetailsRef={permHelpDetailsRef}
        permUserRoleLabel={permUserRoleLabel}
        permissionSearch={permissionSearch}
        onSearchChange={setPermissionSearch}
        groupedPermissions={groupedPermissions}
        permissionDraft={permissionDraft}
        setPermissionDecision={setPermissionDecision}
        hasPermissionDraftChanges={hasPermissionDraftChanges}
        roleMatrixBaseline={roleMatrixBaseline}
        roleMatrixPermissionCounts={roleMatrixPermissionCounts}
        permissionDraftStats={permissionDraftStats}
        permissionInheritDraftCount={permissionInheritDraftCount}
        savedOverrideStats={savedOverrideStats}
        isLoading={isUserPermissionsLoading}
        saving={putUserPermissionOverrides.isPending}
        onSave={() => void saveUserPermissionOverrides()}
        permissionPrimaryLabel={permissionPrimaryLabel}
      />

      <UsersRoleEditorModal
        state={roleEditor}
        roleOptions={roleOptions}
        personnelOptionsForPersonnelRole={personnelOptionsForPersonnelRole}
        personnelOptionsForDriverRole={personnelOptionsForDriverRole}
        personnelNameById={personnelNameById}
        getRoleLabel={getRoleLabel}
        roleRequiresPersonnel={roleRequiresPersonnel}
        userRolesUpper={userRolesUpper}
        branchDayRegisterCallout={
          <BranchDayRegisterAdminSetupCallout
            t={t}
            canOpenScopesAfterSave={canManageUserDataScopes(user)}
          />
        }
        pending={putRoles.isPending}
        onClose={closeRoleEditor}
        onToggleRole={toggleDraftRole}
        onPatch={(patch) => setRoleEditor((prev) => (prev ? { ...prev, ...patch } : prev))}
        onConfirm={() => void confirmRoleEditor()}
      />

      <UsersPersonnelLinkModal
        state={personnelLinkDialog}
        personnelOptions={personnelOptions}
        personnelCell={personnelCell}
        isPortalRoleUser={(u) => userHasRole(u, "PERSONNEL") || userHasRole(u, "DRIVER")}
        pending={putPersonnelLink.isPending}
        onClose={closePersonnelLinkDialog}
        onChangeDraft={(draftPersonnelId) =>
          setPersonnelLinkDialog((prev) => (prev ? { ...prev, draftPersonnelId } : prev))
        }
        onConfirm={() => void confirmPersonnelLink()}
      />

      <UsersAccountStatusDialog
        state={accountStatusDialog}
        pending={patchAccountStatus.isPending}
        onClose={closeAccountStatusDialog}
        onConfirm={() => void confirmAccountStatusDialog()}
      />

      <UsersMfaToggleDialog
        state={mfaToggleDialog}
        pending={setMfaEnabled.isPending}
        onClose={closeMfaToggleDialog}
        onConfirm={() => void confirmMfaToggle()}
      />

      <UsersDeleteDialog
        state={deleteDialog}
        softPending={softDeleteUser.isPending}
        hardPending={hardDeleteUser.isPending}
        onClose={closeDeleteDialog}
        onSoftConfirm={() => void confirmSoftDelete()}
        onHardConfirm={() => void confirmHardDelete()}
      />

      <UsersEditProfileModal
        state={editDialog}
        profilePending={updateProfile.isPending}
        resetPending={resetPassword.isPending}
        onClose={closeEditDialog}
        onPatch={(patch) =>
          setEditDialog((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        onSaveProfile={() => void confirmEditProfile()}
        onResetPassword={() => void confirmResetPassword()}
      />

      <UsersCreateModal
        open={modalOpen}
        onClose={requestModalClose}
        register={register}
        watch={watch}
        errors={errors}
        roleField={roleField}
        personnelField={personnelField}
        onSubmit={onSubmit}
        roleOptions={roleOptions}
        personnelOptions={personnelOptions}
        createUserRoleDetailText={createUserRoleDetailText}
        roleRequiresPersonnel={roleRequiresPersonnel}
        branchDayRegisterCallout={
          <BranchDayRegisterAdminSetupCallout
            t={t}
            canOpenScopesAfterSave={canManageUserDataScopes(user)}
          />
        }
        creating={createUser.isPending}
      />
    </>
  );
}
