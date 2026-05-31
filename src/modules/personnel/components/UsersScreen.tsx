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
import { useAuthorizationMatrix, usePutUserRoles } from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import {
  groupPermissionsForMatrix,
  resolvePermissionGroupTitle,
  resolvePermissionLocalizedDescription,
  resolvePermissionScreenHint,
} from "@/modules/admin/lib/permission-groups";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { appUserAccountStatusTone, StatusBadge } from "@/shared/components/StatusBadge";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
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
import { AlertTriangle, Ban, Check, ChevronDown, KeyRound, Layers, MapPinned, Pencil, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { ResponsiveTableFrame } from "@/shared/tables/ResponsiveTableFrame";

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

function DataScopesGuideColumn({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-semibold text-violet-950">{title}</p>
      <ol className="mt-2 list-none space-y-2.5 p-0">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-2.5 text-xs leading-snug text-zinc-700">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-200/90 text-[10px] font-bold tabular-nums text-violet-950"
              aria-hidden
            >
              {i + 1}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
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
  const [modalOpen, setModalOpen] = useState(false);
  const [pulseUserId, setPulseUserId] = useState<number | null>(null);
  const [permissionsModalUser, setPermissionsModalUser] = useState<UserListItem | null>(null);
  const [scopesModalUser, setScopesModalUser] = useState<UserListItem | null>(null);
  const [roleEditor, setRoleEditor] = useState<{
    user: UserListItem;
    draftRoles: Set<string>;
    draftPersonnelId: string;
    draftUnlinkPersonnel: boolean;
  } | null>(null);
  const [accountStatusDialog, setAccountStatusDialog] = useState<{
    target: UserListItem;
    wantActive: boolean;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ target: UserListItem } | null>(null);
  const [mfaToggleDialog, setMfaToggleDialog] = useState<{
    target: UserListItem;
    wantEnabled: boolean;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    target: UserListItem;
    username: string;
    fullName: string;
    email: string;
    newPassword: string;
  } | null>(null);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<Record<string, PermissionDraftValue>>({});
  const permHelpDetailsRef = useRef<HTMLDetailsElement>(null);
  const [branchScopeDraft, setBranchScopeDraft] = useState<BranchScopeAssignment[]>([]);
  const [warehouseScopeDraft, setWarehouseScopeDraft] = useState<WarehouseScopeAssignment[]>([]);
  const [personnelScopeDraft, setPersonnelScopeDraft] = useState<PersonnelScopeAssignment[]>([]);
  const isAdminUser = hasPermissionCode(user, PERM.systemAdmin);
  const { data: rows = [], isLoading, isError, refetch } = useUsersList(
    Boolean(isReady && isAdminUser)
  );
  const { data: personnelListResult } = usePersonnelList(defaultPersonnelListFilters);
  const personnel = personnelListResult?.items ?? [];
  const createUser = useCreateUser();
  const patchSelfFin = usePatchUserSelfFinancials();
  const putRoles = usePutUserRoles();
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

  useEffect(() => {
    if (!permissionsModalUser) {
      setPermissionSearch("");
      setPermissionDraft({});
      return;
    }
    if (!userPermissionData) return;
    const next: Record<string, PermissionDraftValue> = {};
    for (const item of userPermissionData.overrides) {
      next[item.permissionCode] = item.effect === "DENY" ? "DENY" : "ALLOW";
    }
    setPermissionDraft(next);
  }, [permissionsModalUser, userPermissionData]);

  useLayoutEffect(() => {
    if (!permissionsModalUser) return;
    const el = permHelpDetailsRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 640px)");
    el.open = mq.matches;
  }, [permissionsModalUser]);

  useEffect(() => {
    if (!scopesModalUser) {
      setBranchScopeDraft([]);
      setWarehouseScopeDraft([]);
      setPersonnelScopeDraft([]);
      return;
    }
    if (!userScopesData) return;
    setBranchScopeDraft(userScopesData.branchScopes ?? []);
    setWarehouseScopeDraft(userScopesData.warehouseScopes ?? []);
    setPersonnelScopeDraft(
      (userScopesData.personnelScopes ?? []).filter(isExplicitPersonnelScope)
    );
  }, [scopesModalUser, userScopesData]);

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
      notify.success(
        active ? t("users.accountActivatedToast") : t("users.accountDeactivatedToast")
      );
      setAccountStatusDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

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
      const res = await hardDeleteUser.mutateAsync(r.id);
      notify.success(
        res.mode === "HARD"
          ? t("users.deleteHardToast")
          : t("users.deleteHardFallbackToast")
      );
      setDeleteDialog(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

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
        <Tooltip content={t("userRoles.manageButton")} delayMs={200}>
          <Button
            type="button"
            variant="secondary"
            className={TABLE_TOOLBAR_ICON_BTN}
            disabled={!isAdminUser}
            onClick={() => router.push(`/admin/users/${r.id}/roles`)}
            aria-label={t("userRoles.manageButton")}
          >
            <Layers className="h-5 w-5" aria-hidden />
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
          <ResponsiveTableFrame
            mobileVisibilityClassName="md:flex lg:hidden"
            desktopVisibilityClassName="hidden lg:block"
            mobileClassName="p-3"
            desktopClassName="lg:overflow-x-auto"
            mobile={
            <ul className="flex flex-col gap-3">
              {rows.map((r) => {
                const permSummary = userPermissionSummaryLines(r, t);
                return (
                <li
                  key={r.id}
                  id={`global-user-row-${r.id}`}
                  className={cn(
                    "rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm transition-[box-shadow,ring] duration-500 sm:p-4",
                    pulseUserId === r.id &&
                      "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-base font-semibold leading-snug text-zinc-900">
                        {r.fullName?.trim() || t("personnel.dash")}
                      </p>
                      <p className="truncate text-xs font-medium text-zinc-500">
                        @{r.username}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-medium text-zinc-500">
                          {t("users.tableMfa")}
                        </span>
                        <StatusBadge
                          tone={Boolean(r.totpEnabled) ? "success" : "muted"}
                          className="normal-case tracking-normal"
                          size="md"
                        >
                          {Boolean(r.totpEnabled)
                            ? t("users.mfaOnShort")
                            : t("users.mfaOffShort")}
                        </StatusBadge>
                        {mfaToggleAction(r)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                        {r.status.toUpperCase() === "ACTIVE"
                          ? t("users.statusActive")
                          : t("users.statusInactive")}
                      </StatusBadge>
                      {accountStatusAction(r)}
                      {deleteAction(r)}
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="shrink-0 text-zinc-500">{t("users.tableRole")}</dt>
                      <dd>{renderUserRoleControl(r)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">
                        {t("users.tablePersonnel")}
                      </dt>
                      <dd className="min-w-0 truncate text-right font-medium text-zinc-800">
                        {personnelCell(r)}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-zinc-200/60 pt-2">
                      <dt className="shrink-0 text-zinc-500">{t("users.tablePermissions")}</dt>
                      <dd className="space-y-1 text-xs leading-snug text-zinc-700">
                        <p>{permSummary.overrides}</p>
                        <p>{permSummary.scopes}</p>
                      </dd>
                      {renderScopeMissingWarning(r)}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">{renderUserAuthIconButtons(r)}</div>
                        {!canManageUserDataScopes(user) ? (
                          <Link
                            href="/admin/settings/authorization"
                            className="text-xs font-medium text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                          >
                            {t("users.manageScopesGoAuthorization")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {userHasRole(r, "DRIVER") ? (
                      <div className="flex flex-col gap-1 border-t border-zinc-200/60 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="shrink-0 text-zinc-500">
                            {t("users.tableSelfFinancials")}
                          </dt>
                          <dd>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-violet-600"
                              checked={Boolean(r.allowPersonnelSelfFinancials)}
                              disabled={
                                patchSelfFin.isPending &&
                                patchSelfFin.variables?.userId === r.id
                              }
                              onChange={(e) => void onToggleSelfFin(r, e.target.checked)}
                              aria-label={t("users.selfFinancialsHint")}
                            />
                          </dd>
                        </div>
                        <p className="text-xs text-zinc-500">{t("users.selfFinancialsHint")}</p>
                      </div>
                    ) : null}
                  </dl>
                </li>
              );
              })}
            </ul>
            }
            desktop={
              <table className="w-full min-w-0 lg:min-w-[920px] border-collapse text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableUser")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableName")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableRole")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableMfa")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableStatus")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tablePersonnel")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableSelfFinancials")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tablePermissions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {rows.map((r) => {
                    const permSummary = userPermissionSummaryLines(r, t);
                    return (
                    <tr
                      key={r.id}
                      id={`global-user-row-${r.id}`}
                      className={cn(
                        "hover:bg-zinc-50/80 transition-[box-shadow] duration-500",
                        pulseUserId === r.id &&
                          "bg-violet-50/50 shadow-[inset_0_0_0_2px_rgb(139_92_246)]"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                        {r.username}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 lg:max-w-none">
                        {r.fullName?.trim() || t("personnel.dash")}
                      </td>
                      <td className="max-w-[20rem] px-4 py-3">{renderUserRoleControl(r)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            tone={Boolean(r.totpEnabled) ? "success" : "muted"}
                            className="normal-case tracking-normal"
                            size="md"
                          >
                            {Boolean(r.totpEnabled)
                              ? t("users.mfaOnShort")
                              : t("users.mfaOffShort")}
                          </StatusBadge>
                          {mfaToggleAction(r)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                            {r.status.toUpperCase() === "ACTIVE"
                              ? t("users.statusActive")
                              : t("users.statusInactive")}
                          </StatusBadge>
                          <div className="flex items-center gap-1">
                            {accountStatusAction(r, { compact: true })}
                            {deleteAction(r, { compact: true })}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-600 lg:max-w-xs">
                        {personnelCell(r)}
                      </td>
                      <td className="px-4 py-3">
                        {userHasRole(r, "DRIVER") ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-violet-600"
                            checked={Boolean(r.allowPersonnelSelfFinancials)}
                            disabled={
                              patchSelfFin.isPending &&
                              patchSelfFin.variables?.userId === r.id
                            }
                            onChange={(e) => void onToggleSelfFin(r, e.target.checked)}
                            title={t("users.selfFinancialsHint")}
                            aria-label={t("users.selfFinancialsHint")}
                          />
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[11rem] flex-col gap-2">
                          <div className="space-y-0.5 text-xs leading-snug text-zinc-600">
                            <p>{permSummary.overrides}</p>
                            <p>{permSummary.scopes}</p>
                          </div>
                          {renderScopeMissingWarning(r)}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {renderUserAuthIconButtons(r)}
                            </div>
                            {!canManageUserDataScopes(user) ? (
                              <Link
                                href="/admin/settings/authorization"
                                className="text-xs font-medium text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                              >
                                {t("users.manageScopesGoAuthorization")}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            }
          />
        )}
          </Card>
        }
      />

      <Modal
        open={Boolean(scopesModalUser)}
        onClose={closeScopesModal}
        titleId="user-scopes-title"
        title={t("users.scopesModalTitle")}
        description={t("users.scopesModalHint")}
        closeButtonLabel={t("common.close")}
        wide
        wideFixedHeight
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-2 pt-2 sm:px-6 [-webkit-overflow-scrolling:touch]">
          {scopesModalUser ? (
            <p className="text-xs text-zinc-600 sm:text-sm">
              <span className="font-semibold text-zinc-900">{scopesModalUser.username}</span>
              {" · "}
              {scopesModalUser.role}
            </p>
          ) : null}

          <div className="rounded-xl border border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-white to-violet-50/35 p-4 shadow-sm">
            <p className="text-sm font-semibold text-violet-950">{t("users.scopesHelpPanelTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
              {t("users.scopesHelpPanelSubtitle")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DataScopesGuideColumn
                title={t("users.branchScopesTitle")}
                steps={[
                  t("users.scopesHelpBranchStep1"),
                  t("users.scopesHelpBranchStep2"),
                  t("users.scopesHelpBranchStep3"),
                ]}
              />
              <DataScopesGuideColumn
                title={t("users.warehouseScopesTitle")}
                steps={[
                  t("users.scopesHelpWarehouseStep1"),
                  t("users.scopesHelpWarehouseStep2"),
                  t("users.scopesHelpWarehouseStep3"),
                ]}
              />
              <DataScopesGuideColumn
                title={t("users.personnelScopesTitle")}
                steps={[
                  t("users.scopesHelpPersonnelStep1"),
                  t("users.scopesHelpPersonnelStep2"),
                  t("users.scopesHelpPersonnelStep3"),
                  t("users.scopesHelpPersonnelStep4"),
                ]}
              />
            </div>
          </div>

          {isUserScopesLoading || !userScopesData ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
              {t("common.loading")}
            </div>
          ) : (
            <div className="space-y-4">
              <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("users.branchScopesTitle")}</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
                    onClick={() =>
                      setBranchScopeDraft((prev) => [
                        ...prev,
                        { branchId: userScopesData.branchOptions[0]?.id ?? 0, scopeLevel: "SUMMARY" },
                      ])
                    }
                  >
                    {t("common.add")}
                  </Button>
                </div>
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:gap-2 sm:px-1 sm:pb-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {t("users.scopesColumnTarget")}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {t("users.scopesColumnAccessLevel")}
                  </span>
                  <span className="sr-only">{t("common.remove")}</span>
                </div>
                <div className="space-y-2">
                  {branchScopeDraft.map((item, idx) => (
                    <div
                      key={`branch-${idx}`}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
                    >
                      <Select
                        name={`branch-scope-branch-${idx}`}
                        ariaLabel={t("users.branchScopesTitle")}
                        options={userScopesData.branchOptions.map((x) => ({
                          value: String(x.id),
                          label: x.name,
                        }))}
                        value={String(item.branchId)}
                        onBlur={() => {}}
                        onChange={(e) =>
                          setBranchScopeDraft((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx ? { ...row, branchId: Number(e.target.value) } : row
                            )
                          )
                        }
                      />
                      <Select
                        name={`branch-scope-level-${idx}`}
                        ariaLabel={t("users.branchScopeLevel")}
                        options={branchScopeLevelOptions}
                        value={item.scopeLevel}
                        onBlur={() => {}}
                        onChange={(e) =>
                          setBranchScopeDraft((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx
                                ? { ...row, scopeLevel: e.target.value as BranchScopeAssignment["scopeLevel"] }
                                : row
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                        onClick={() =>
                          setBranchScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                        }
                      >
                        {t("common.remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("users.warehouseScopesTitle")}</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
                    onClick={() =>
                      setWarehouseScopeDraft((prev) => [
                        ...prev,
                        { warehouseId: userScopesData.warehouseOptions[0]?.id ?? 0, scopeLevel: "READ" },
                      ])
                    }
                  >
                    {t("common.add")}
                  </Button>
                </div>
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:gap-2 sm:px-1 sm:pb-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {t("users.scopesColumnTarget")}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {t("users.scopesColumnAccessLevel")}
                  </span>
                  <span className="sr-only">{t("common.remove")}</span>
                </div>
                <div className="space-y-2">
                  {warehouseScopeDraft.map((item, idx) => (
                    <div
                      key={`warehouse-${idx}`}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
                    >
                      <Select
                        name={`warehouse-scope-warehouse-${idx}`}
                        ariaLabel={t("users.warehouseScopesTitle")}
                        options={userScopesData.warehouseOptions.map((x) => ({
                          value: String(x.id),
                          label: x.name,
                        }))}
                        value={String(item.warehouseId)}
                        onBlur={() => {}}
                        onChange={(e) =>
                          setWarehouseScopeDraft((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx ? { ...row, warehouseId: Number(e.target.value) } : row
                            )
                          )
                        }
                      />
                      <Select
                        name={`warehouse-scope-level-${idx}`}
                        ariaLabel={t("users.warehouseScopeLevel")}
                        options={warehouseScopeLevelOptions}
                        value={item.scopeLevel}
                        onBlur={() => {}}
                        onChange={(e) =>
                          setWarehouseScopeDraft((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx
                                ? {
                                    ...row,
                                    scopeLevel:
                                      e.target.value as WarehouseScopeAssignment["scopeLevel"],
                                  }
                                : row
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                        onClick={() =>
                          setWarehouseScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                        }
                      >
                        {t("common.remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("users.personnelScopesTitle")}</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
                    onClick={() =>
                      setPersonnelScopeDraft((prev) => [
                        ...prev,
                        { personnelId: userScopesData.personnelOptions[0]?.id ?? null, branchId: null, scopeLevel: "SELF" },
                      ])
                    }
                  >
                    {t("common.add")}
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border border-zinc-200 bg-white/80 p-3 text-xs leading-relaxed text-zinc-700 sm:text-sm">
                  <p className="font-semibold text-zinc-900">{t("users.howToBranchResponsibleTitle")}</p>
                  <p>{t("users.howToBranchResponsibleBody")}</p>
                  <p className="pt-1 font-semibold text-zinc-900">{t("users.howToPersonnelScopeTitle")}</p>
                  <p>{t("users.howToPersonnelScopeBody")}</p>
                </div>
                {(userScopesData.personnelScopes ?? []).some((x) => x.source === "BRANCH_RESPONSIBLE") ? (
                  <div className="space-y-2">
                    {(userScopesData.personnelScopes ?? []).filter((x) => x.source === "BRANCH_RESPONSIBLE")
                      .length > 1 ? (
                      <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                        {t("users.personnelScopeImpliedMultiBranchNote")}
                      </p>
                    ) : null}
                    {(userScopesData.personnelScopes ?? [])
                      .filter((x) => x.source === "BRANCH_RESPONSIBLE")
                      .map((item) => {
                        const bName =
                          userScopesData.branchOptions.find((b) => b.id === item.branchId)?.name ??
                          `#${item.branchId ?? ""}`;
                        const bid = item.branchId ?? 0;
                        const covered =
                          bid > 0 ? personnelAtBranchSorted(personnel, bid, locale) : [];
                        return (
                          <div
                            key={`implied-p-${item.branchId}`}
                            className="rounded-lg border border-dashed border-violet-300 bg-violet-50/70 px-3 py-2.5 text-sm"
                          >
                            <p className="font-semibold text-violet-950">{t("users.personnelScopeImpliedTitle")}</p>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-800 sm:text-sm">
                              <span className="font-medium text-zinc-900">{t("users.personnelScopeImpliedPrefix")}</span>{" "}
                              {bName}. {t("users.personnelScopeImpliedDetail")}
                            </p>
                            <div className="mt-2 border-t border-violet-200/80 pt-2">
                              <p className="text-xs font-medium text-violet-950">
                                {t("users.personnelScopeImpliedCoveredTitle")}{" "}
                                <span className="font-normal text-zinc-600">
                                  (
                                  {t("users.personnelScopeImpliedCoveredCount").replace(
                                    "{count}",
                                    String(covered.length)
                                  )}
                                  )
                                </span>
                              </p>
                              {covered.length === 0 ? (
                                <p className="mt-1 text-xs text-zinc-600">{t("users.personnelScopeImpliedCoveredEmpty")}</p>
                              ) : (
                                <ul className="mt-1 max-h-36 overflow-y-auto rounded-md border border-violet-100 bg-white/90 px-2 py-1.5 text-xs text-zinc-800">
                                  {covered.map((p) => (
                                    <li key={p.id} className="truncate py-0.5">
                                      {personnelDisplayName(p)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-zinc-600">{t("users.personnelScopeImpliedRemoveHint")}</p>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
                <div className="space-y-2">
                  {personnelScopeDraft.map((item, idx) => (
                    <div key={`personnel-${idx}`} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-2">
                      <Select
                        name={`personnel-scope-target-${idx}`}
                        ariaLabel={t("users.personnelScopeTarget")}
                        options={[
                          { value: "PERSONNEL", label: t("users.scopeTargetPersonnel") },
                          { value: "BRANCH", label: t("users.scopeTargetBranch") },
                        ]}
                        value={item.personnelId ? "PERSONNEL" : "BRANCH"}
                        onBlur={() => {}}
                        onChange={(e) =>
                          setPersonnelScopeDraft((prev) =>
                            prev.map((row, rowIdx) =>
                              rowIdx === idx
                                ? e.target.value === "PERSONNEL"
                                  ? { ...row, personnelId: userScopesData.personnelOptions[0]?.id ?? null, branchId: null }
                                  : { ...row, personnelId: null, branchId: userScopesData.branchOptions[0]?.id ?? null }
                                : row
                            )
                          )
                        }
                      />
                      {item.personnelId ? (
                        <Select
                          name={`personnel-scope-personnel-${idx}`}
                          ariaLabel={t("users.scopeTargetPersonnel")}
                          options={userScopesData.personnelOptions.map((x) => ({
                            value: String(x.id),
                            label: x.name,
                          }))}
                          value={String(item.personnelId)}
                          onBlur={() => {}}
                          onChange={(e) =>
                            setPersonnelScopeDraft((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, personnelId: Number(e.target.value), branchId: null } : row
                              )
                            )
                          }
                        />
                      ) : (
                        <Select
                          name={`personnel-scope-branch-${idx}`}
                          ariaLabel={t("users.scopeTargetBranch")}
                          options={userScopesData.branchOptions.map((x) => ({
                            value: String(x.id),
                            label: x.name,
                          }))}
                          value={String(item.branchId ?? "")}
                          onBlur={() => {}}
                          onChange={(e) =>
                            setPersonnelScopeDraft((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx ? { ...row, branchId: Number(e.target.value), personnelId: null } : row
                              )
                            )
                          }
                        />
                      )}
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Select
                          name={`personnel-scope-level-${idx}`}
                          ariaLabel={t("users.personnelScopeLevel")}
                          options={personnelScopeLevelOptions}
                          value={item.scopeLevel}
                          onBlur={() => {}}
                          onChange={(e) =>
                            setPersonnelScopeDraft((prev) =>
                              prev.map((row, rowIdx) =>
                                rowIdx === idx
                                  ? {
                                      ...row,
                                      scopeLevel:
                                        e.target.value as PersonnelScopeAssignment["scopeLevel"],
                                    }
                                  : row
                              )
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                          onClick={() =>
                            setPersonnelScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                          }
                        >
                          {t("common.remove")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          </div>

          <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-4 py-3 sm:justify-end sm:px-6">
            <Button
              type="button"
              className="min-h-11 w-full min-w-0 sm:w-auto sm:min-w-[130px]"
              onClick={() => void saveUserScopes()}
              disabled={!hasScopesDraftChanges || putUserDataScopes.isPending}
            >
              {putUserDataScopes.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(permissionsModalUser)}
        onClose={closePermissionsModal}
        titleId="user-permissions-title"
        title={t("users.permissionsModalTitle")}
        closeButtonLabel={t("common.close")}
        wide
        wideExpanded
        wideFixedHeight
        wideFullScreenMobile
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/80 sm:bg-white">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 sm:space-y-4 sm:bg-transparent sm:px-6 sm:pb-6 [-webkit-overflow-scrolling:touch]">
          {permissionsModalUser ? (
            <div className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t("users.permissionsModalRoleHighlight")}
                  </p>
                  <p className="break-words text-xl font-bold leading-tight text-zinc-950 sm:text-2xl">
                    {permUserRoleLabel}
                  </p>
                  <p className="break-all font-mono text-xs font-medium text-zinc-600 sm:text-sm">
                    {permissionsModalUser.role}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-left sm:px-4 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t("users.permissionsModalUserLabel")}
                  </p>
                  <p className="break-all text-sm font-semibold text-zinc-900 sm:text-base">
                    {permissionsModalUser.username}
                  </p>
                </div>
              </div>
              <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-600">
                {t("users.permissionInheritSourceLine").replace("{role}", permUserRoleLabel)}
              </p>
            </div>
          ) : null}

          <details
            ref={permHelpDetailsRef}
            className="group rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/95 to-white shadow-sm open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3.5 text-left outline-none ring-zinc-900 focus-visible:ring-2 sm:px-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {t("users.permissionsGuideEyebrow")}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-900">
                  {t("users.permissionsGuideToggleLabel")}
                </p>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="space-y-3 border-t border-zinc-200/80 px-3 pb-3 pt-2 text-xs leading-relaxed text-zinc-700 sm:px-4 sm:pb-4 sm:text-sm">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                <p>{t("users.permissionsHelpIntro")}</p>
                <p className="mt-2 text-zinc-800">
                  <span className="font-semibold text-zinc-900">{t("users.permissionsRoleVsUserTitle")}</span>{" "}
                  <Link
                    href="/admin/settings/authorization"
                    className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                  >
                    {t("settings.authzPageTitle")}
                  </Link>
                  {" — "}
                  {t("users.permissionsModalHint")}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
                <p className="font-semibold text-zinc-900">{t("users.permissionsThreeStatesTitle")}</p>
                <ul className="mt-2 list-disc space-y-2 pl-4 marker:text-zinc-400">
                  <li>{t("users.permissionsInheritExplain")}</li>
                  <li>{t("users.permissionsAllowExplain")}</li>
                  <li>{t("users.permissionsDenyExplain")}</li>
                </ul>
                <p className="mt-3 border-t border-zinc-100 pt-3 text-xs font-semibold leading-snug text-zinc-800 sm:text-sm">
                  {t("users.permissionsInheritPlainMeaning")}
                </p>
              </div>
            </div>
          </details>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs font-bold text-zinc-900">{t("users.permissionsStatsMatrixTitle")}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-600">
                {t("users.permissionsStatsMatrixSubtitle").replace("{role}", permUserRoleLabel)}
              </p>
              {roleMatrixPermissionCounts.kind === "loading" || roleMatrixPermissionCounts.kind === "idle" ? (
                <p className="mt-3 text-sm text-zinc-600">{t("users.permissionsStatsMatrixLoading")}</p>
              ) : roleMatrixPermissionCounts.kind === "missing" ? (
                <p className="mt-3 text-sm font-medium text-zinc-800">{t("users.permissionsStatsMatrixMissing")}</p>
              ) : (
                <>
                  <div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                      <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
                        {t("users.permissionsStatsMatrixGrantsLabel")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                        {roleMatrixPermissionCounts.granted}
                      </p>
                      <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                        {t("users.permissionsStatsMatrixGrantsLabel")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                      <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
                        {t("users.permissionsStatsMatrixNotGrantedLabel")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                        {roleMatrixPermissionCounts.notGranted}
                      </p>
                      <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                        {t("users.permissionsStatsMatrixNotGrantedLabel")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                      <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
                        {t("users.permissionsStatsMatrixTotalLabel")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-zinc-800 sm:text-3xl">
                        {roleMatrixPermissionCounts.total}
                      </p>
                      <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                        {t("users.permissionsStatsMatrixTotalLabel")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-600">
                    {t("users.permissionsStatsMatrixFootnote")}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs font-bold text-zinc-900">{t("users.permissionsStatsOverridesTitle")}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">
                {t("users.permissionsStatsOverridesSubtitle")}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                  <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
                    {t("users.permissionsAllowLabel")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                    {permissionDraftStats.allowCount}
                  </p>
                  <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                    {t("users.permissionsAllowLabel")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                  <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
                    {t("users.permissionsDenyLabel")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                    {permissionDraftStats.denyCount}
                  </p>
                  <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                    {t("users.permissionsDenyLabel")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                  <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
                    {t("users.permissionsStatsOverridesInheritLabel")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-zinc-800 sm:text-3xl">
                    {permissionInheritDraftCount}
                  </p>
                  <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                    {t("users.permissionsStatsOverridesInheritLabel")}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-zinc-600">{t("users.permissionsInheritedStatHint")}</p>
              {permissionsModalUser ? (
                isUserPermissionsLoading ? (
                  <p className="mt-2 text-[11px] text-zinc-500">{t("common.loading")}</p>
                ) : savedOverrideStats ? (
                  savedOverrideStats.total > 0 ? (
                    <p className="mt-2 text-[11px] font-medium text-zinc-700">
                      {t("users.permissionsStatsOverridesSaved")
                        .replace("{allow}", String(savedOverrideStats.allow))
                        .replace("{deny}", String(savedOverrideStats.deny))
                        .replace("{total}", String(savedOverrideStats.total))}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-600">{t("users.permissionsStatsOverridesSavedEmpty")}</p>
                  )
                ) : null
              ) : null}
            </div>
          </div>

          <Input
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
            placeholder={t("users.permissionsSearchPlaceholder")}
            aria-label={t("users.permissionsSearchPlaceholder")}
            className="text-base sm:text-sm"
            autoComplete="off"
          />

          <div className="space-y-4 sm:space-y-5">
            {isUserPermissionsLoading ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
                {t("common.loading")}
              </div>
            ) : groupedPermissions.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
                {t("users.permissionsSearchEmpty")}
              </div>
            ) : (
              groupedPermissions.map(({ prefix: group, permissions }) => (
                <section key={group} className="space-y-2 sm:space-y-3">
                  <h3 className="sticky top-0 z-[1] border-b border-zinc-200/80 bg-zinc-50/95 py-2 text-sm font-bold text-zinc-900 backdrop-blur-sm supports-[backdrop-filter]:bg-zinc-50/80 sm:text-base">
                    {resolvePermissionGroupTitle(group, t)}
                  </h3>
                  <div className="space-y-2">
                    {permissions.map((p) => {
                      const value = permissionDraft[p.code] ?? "INHERIT";
                      const whereHint = resolvePermissionScreenHint(p.code, t);
                      const detailBody = resolvePermissionLocalizedDescription(p, t);
                      const sameWhereAndDetail =
                        Boolean(whereHint) &&
                        Boolean(detailBody) &&
                        whereHint.trim() === detailBody.trim();
                      const roleLine =
                        roleMatrixBaseline.kind === "loading"
                          ? t("users.permissionMatrixPending")
                          : roleMatrixBaseline.kind === "missing"
                            ? t("users.permissionMatrixRoleMissing")
                            : roleMatrixBaseline.kind === "ok"
                              ? roleMatrixBaseline.set.has(p.code)
                                ? t("users.permissionMatrixRoleGrantsThis").replace("{role}", permUserRoleLabel)
                                : t("users.permissionMatrixRoleDoesNotGrant").replace("{role}", permUserRoleLabel)
                              : "";
                      const outcome =
                        value === "ALLOW"
                          ? t("users.permissionSaveEffectAllow").replace("{role}", permUserRoleLabel)
                          : value === "DENY"
                            ? t("users.permissionSaveEffectDeny").replace("{role}", permUserRoleLabel)
                            : roleMatrixBaseline.kind === "ok"
                              ? roleMatrixBaseline.set.has(p.code)
                                ? t("users.permissionSaveEffectInheritOn").replace("{role}", permUserRoleLabel)
                                : t("users.permissionSaveEffectInheritOff").replace("{role}", permUserRoleLabel)
                              : roleMatrixBaseline.kind === "loading"
                                ? t("users.permissionSaveEffectInheritPending")
                                : t("users.permissionSaveEffectInheritUnknown");
                      return (
                        <article
                          key={p.code}
                          className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4"
                        >
                          <div className="space-y-3">
                            {whereHint && !sameWhereAndDetail ? (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/90">
                                  {t("users.permissionCardWhereHeading")}
                                </p>
                                <p className="mt-1 text-base font-semibold leading-snug text-zinc-900 sm:text-sm">
                                  {whereHint}
                                </p>
                              </div>
                            ) : null}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("users.permissionCardDetailHeading")}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-zinc-700 sm:text-xs sm:leading-snug">
                                {detailBody || permissionPrimaryLabel(p)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-zinc-50/95 px-3 py-2.5 ring-1 ring-zinc-200/80">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("users.permissionCardTechnicalCodeHeading")}
                              </p>
                              <p className="mt-1 break-all font-mono text-[11px] text-zinc-800">{p.code}</p>
                            </div>
                            {roleLine &&
                            !(value === "INHERIT" && roleMatrixBaseline.kind === "ok") ? (
                              <div
                                className={cn(
                                  "rounded-xl border px-3 py-2.5",
                                  roleMatrixBaseline.kind === "missing" &&
                                    "border-zinc-200 border-l-4 border-l-zinc-400 bg-zinc-50",
                                  roleMatrixBaseline.kind === "loading" &&
                                    "border-zinc-200 border-l-4 border-l-zinc-300 bg-zinc-50",
                                  roleMatrixBaseline.kind === "ok" && "border-zinc-200 bg-zinc-50"
                                )}
                              >
                                <p className="text-sm leading-snug text-zinc-800 sm:text-xs">{roleLine}</p>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 sm:mt-3">
                          <div
                            className="grid grid-cols-3 gap-1.5 sm:gap-1 sm:rounded-xl sm:border sm:border-zinc-200 sm:bg-zinc-100/80 sm:p-1"
                            role="group"
                            aria-label={`${p.code}: ${t("users.permissionChoiceGroupAria")}`}
                          >
                            <Button
                              type="button"
                              variant={value === "INHERIT" ? "primary" : "secondary"}
                              className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                              title={
                                roleMatrixBaseline.kind === "ok"
                                  ? `${t("users.permissionButtonTitleInherit")} (${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritIconAriaMatrixOn") : t("users.permissionInheritIconAriaMatrixOff")}). ${t("users.permissionInheritBadgeTitle")}: ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritBadgeGranted") : t("users.permissionInheritBadgeNotGranted")}`
                                  : t("users.permissionButtonTitleInherit")
                              }
                              aria-label={
                                roleMatrixBaseline.kind === "ok"
                                  ? `${t("users.permissionsInheritedLabel")} — ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritIconAriaMatrixOn") : t("users.permissionInheritIconAriaMatrixOff")}. ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritBadgeGranted") : t("users.permissionInheritBadgeNotGranted")}`
                                  : t("users.permissionsInheritedLabel")
                              }
                              onClick={() => setPermissionDecision(p.code, "INHERIT")}
                              disabled={putUserPermissionOverrides.isPending}
                            >
                              <span
                                className="flex flex-col items-center justify-center gap-0.5"
                                aria-hidden
                              >
                                <Layers
                                  className={cn(
                                    "h-[1.15rem] w-[1.15rem] shrink-0 sm:h-4 sm:w-4",
                                    value === "INHERIT" ? "text-white" : "text-zinc-800"
                                  )}
                                  strokeWidth={2}
                                />
                                {roleMatrixBaseline.kind === "ok" ? (
                                  roleMatrixBaseline.set.has(p.code) ? (
                                    <Check
                                      className={cn(
                                        "h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5",
                                        value === "INHERIT" ? "text-white/95" : "text-zinc-600"
                                      )}
                                      strokeWidth={2.75}
                                    />
                                  ) : (
                                    <X
                                      className={cn(
                                        "h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5",
                                        value === "INHERIT" ? "text-white/95" : "text-zinc-500"
                                      )}
                                      strokeWidth={2.5}
                                    />
                                  )
                                ) : null}
                              </span>
                            </Button>
                            <Button
                              type="button"
                              variant={value === "ALLOW" ? "primary" : "secondary"}
                              className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                              title={t("users.permissionButtonTitleAllow")}
                              aria-label={t("users.permissionsAllowLabel")}
                              onClick={() => setPermissionDecision(p.code, "ALLOW")}
                              disabled={putUserPermissionOverrides.isPending}
                            >
                              <Check
                                className="h-5 w-5 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]"
                                aria-hidden
                                strokeWidth={2.5}
                              />
                            </Button>
                            <Button
                              type="button"
                              variant={value === "DENY" ? "primary" : "secondary"}
                              className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                              title={t("users.permissionButtonTitleDeny")}
                              aria-label={t("users.permissionsDenyLabel")}
                              onClick={() => setPermissionDecision(p.code, "DENY")}
                              disabled={putUserPermissionOverrides.isPending}
                            >
                              <Ban
                                className="h-5 w-5 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]"
                                aria-hidden
                                strokeWidth={2.25}
                              />
                            </Button>
                          </div>
                          </div>
                          {value === "INHERIT" && roleMatrixBaseline.kind === "ok" ? null : (
                            <div className="mt-3 rounded-lg bg-zinc-50/90 px-2.5 py-2 sm:mt-2 sm:bg-transparent sm:px-0 sm:py-0">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                {t("users.permissionChoiceOutcomeTitle")}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-zinc-700 sm:text-xs">{outcome}</p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
          </div>

          <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:pb-3">
            <Button
              type="button"
              className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
              onClick={() => void saveUserPermissionOverrides()}
              disabled={!hasPermissionDraftChanges || putUserPermissionOverrides.isPending}
            >
              {putUserPermissionOverrides.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={roleEditor !== null}
        onClose={closeRoleEditor}
        titleId="user-role-editor-title"
        title={t("users.roleChangeModalTitle")}
        description={t("users.roleChangeModalDescription")}
        closeButtonLabel={t("common.close")}
        narrow
        sheetMobile
      >
        {roleEditor ? (
          (() => {
            const originalRoles = new Set(userRolesUpper(roleEditor.user));
            const draftRoles = roleEditor.draftRoles;
            const wantsPortal = draftRoles.has("PERSONNEL") || draftRoles.has("DRIVER");
            const originalPersonnel =
              roleEditor.user.personnelId != null ? String(roleEditor.user.personnelId) : "";
            const rolesChanged =
              originalRoles.size !== draftRoles.size ||
              [...draftRoles].some((c) => !originalRoles.has(c));
            const personnelChanged =
              wantsPortal && roleEditor.draftPersonnelId.trim() !== originalPersonnel;
            // Portal rolü kalmadıysa ve kullanıcı zaten bir personele bağlıysa "bağı kaldır" sunulur.
            const canUnlinkPersonnel = !wantsPortal && roleEditor.user.personnelId != null;
            const unlinkChanged = canUnlinkPersonnel && roleEditor.draftUnlinkPersonnel;
            // Personel-gerektiren rol seçili ama ne yeni seçim ne de mevcut bağ var → zorunlu alan eksik.
            const personnelMissing =
              wantsPortal &&
              roleEditor.draftPersonnelId.trim() === "" &&
              roleEditor.user.personnelId == null;
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
                  {roleEditor.user.fullName?.trim() || roleEditor.user.username}
                </p>
                <p className="truncate text-sm text-zinc-500">@{roleEditor.user.username}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">{t("users.roleChangeCurrentBadge")}</span>
                  {originalRoles.size > 0 ? (
                    [...originalRoles].map((c) => (
                      <StatusBadge
                        key={c}
                        tone="neutral"
                        className="normal-case tracking-normal"
                        size="md"
                      >
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
                <div
                  className="mt-2 grid gap-2"
                  role="group"
                  aria-label={t("users.roleChangePickHeading")}
                >
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
                          onChange={() => toggleDraftRole(v)}
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
                    value={roleEditor.draftPersonnelId}
                    error={personnelMissing ? t("users.personnelRequiredError") : undefined}
                    onChange={(e) =>
                      setRoleEditor((prev) =>
                        prev ? { ...prev, draftPersonnelId: e.target.value } : prev
                      )
                    }
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
                      (roleEditor.user.personnelId != null
                        ? personnelNameById.get(roleEditor.user.personnelId)
                        : undefined) ??
                        roleEditor.user.fullName?.trim() ??
                        roleEditor.user.username
                    )}
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-amber-600"
                      checked={roleEditor.draftUnlinkPersonnel}
                      onChange={(e) =>
                        setRoleEditor((prev) =>
                          prev ? { ...prev, draftUnlinkPersonnel: e.target.checked } : prev
                        )
                      }
                    />
                    <span className="text-xs leading-relaxed text-amber-900">
                      {t("users.roleChangeUnlinkPersonnelCheckbox")}
                    </span>
                  </label>
                </div>
              ) : null}

              {draftRoles.has("BRANCH_DAY_REGISTER") ? (
                <BranchDayRegisterAdminSetupCallout
                  t={t}
                  canOpenScopesAfterSave={canManageUserDataScopes(user)}
                />
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
                      <StatusBadge
                        key={c}
                        tone="neutral"
                        className="normal-case tracking-normal"
                        size="md"
                      >
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
                disabled={putRoles.isPending || !canSave}
                onClick={() => void confirmRoleEditor()}
              >
                {putRoles.isPending ? t("common.saving") : t("users.roleChangeConfirm")}
              </Button>
            </div>
          </div>
            );
          })()
        ) : null}
      </Modal>

      <Modal
        open={accountStatusDialog !== null}
        onClose={closeAccountStatusDialog}
        titleId="user-account-status-title"
        title={
          accountStatusDialog?.wantActive
            ? t("users.accountStatusDialogTitleActivate")
            : t("users.accountStatusDialogTitleDeactivate")
        }
        description={
          accountStatusDialog?.wantActive
            ? t("users.accountStatusDialogDescriptionActivate")
            : t("users.accountStatusDialogDescriptionDeactivate")
        }
        closeButtonLabel={t("common.close")}
        narrow
        sheetMobile
      >
        {accountStatusDialog ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 sm:px-0">
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-sm text-zinc-800">
              <p className="font-semibold text-zinc-900">
                {accountStatusDialog.target.fullName?.trim() ||
                  accountStatusDialog.target.username}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                @{accountStatusDialog.target.username}
              </p>
            </div>
            <div className="mt-4 flex shrink-0 justify-stretch border-t border-zinc-200 pt-3 sm:justify-end">
              <Button
                type="button"
                variant="primary"
                className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
                disabled={patchAccountStatus.isPending}
                onClick={() => void confirmAccountStatusDialog()}
              >
                {patchAccountStatus.isPending
                  ? t("common.saving")
                  : accountStatusDialog.wantActive
                    ? t("users.activateUser")
                    : t("users.deactivateUser")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={mfaToggleDialog !== null}
        onClose={closeMfaToggleDialog}
        titleId="user-mfa-toggle-title"
        title={
          mfaToggleDialog?.wantEnabled
            ? t("users.mfaAdminToggleDialogTitleEnable")
            : t("users.mfaAdminToggleDialogTitleDisable")
        }
        description={(mfaToggleDialog?.wantEnabled
          ? t("users.mfaAdminToggleDialogDescriptionEnable")
          : t("users.mfaAdminToggleDialogDescriptionDisable")
        ).replace("{username}", mfaToggleDialog?.target.username ?? "")}
        closeButtonLabel={t("common.close")}
        narrow
        sheetMobile
      >
        {mfaToggleDialog ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 sm:px-0">
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-sm text-zinc-800">
              <p className="font-semibold text-zinc-900">
                {mfaToggleDialog.target.fullName?.trim() || mfaToggleDialog.target.username}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">@{mfaToggleDialog.target.username}</p>
            </div>
            <div className="mt-4 flex shrink-0 justify-stretch border-t border-zinc-200 pt-3 sm:justify-end">
              <Button
                type="button"
                variant="primary"
                className={cn(
                  "min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]",
                  mfaToggleDialog.wantEnabled
                    ? "!bg-emerald-600 hover:!bg-emerald-700"
                    : "!bg-amber-600 hover:!bg-amber-700"
                )}
                disabled={setMfaEnabled.isPending}
                onClick={() => void confirmMfaToggle()}
              >
                {setMfaEnabled.isPending
                  ? t("common.saving")
                  : mfaToggleDialog.wantEnabled
                    ? t("users.mfaAdminToggleConfirmEnable")
                    : t("users.mfaAdminToggleConfirmDisable")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteDialog !== null}
        onClose={closeDeleteDialog}
        titleId="user-delete-title"
        title={t("users.deleteDialogTitle")}
        description={t("users.deleteDialogDescription")}
        closeButtonLabel={t("common.close")}
        narrow
        sheetMobile
      >
        {deleteDialog ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 sm:px-0">
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-sm text-zinc-800">
              <p className="font-semibold text-zinc-900">
                {deleteDialog.target.fullName?.trim() || deleteDialog.target.username}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">@{deleteDialog.target.username}</p>
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
                disabled={softDeleteUser.isPending || hardDeleteUser.isPending}
                onClick={() => void confirmSoftDelete()}
              >
                {softDeleteUser.isPending ? t("common.saving") : t("users.deleteSoftButton")}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="min-h-12 w-full !bg-red-600 hover:!bg-red-700 sm:min-h-11 sm:w-auto sm:min-w-[120px]"
                disabled={softDeleteUser.isPending || hardDeleteUser.isPending}
                onClick={() => void confirmHardDelete()}
              >
                {hardDeleteUser.isPending ? t("common.saving") : t("users.deleteHardButton")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={editDialog !== null}
        onClose={closeEditDialog}
        titleId="user-edit-title"
        title={t("users.editDialogTitle")}
        description={t("users.editDialogDescription")}
        closeButtonLabel={t("common.close")}
        narrow
        sheetMobile
      >
        {editDialog ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-1 pb-2 sm:px-0">
            <div className="space-y-3">
              <Input
                label={t("users.editUsernameLabel")}
                labelRequired
                value={editDialog.username}
                onChange={(e) =>
                  setEditDialog((prev) => (prev ? { ...prev, username: e.target.value } : prev))
                }
                autoComplete="off"
              />
              <Input
                label={t("users.editFullNameLabel")}
                value={editDialog.fullName}
                onChange={(e) =>
                  setEditDialog((prev) => (prev ? { ...prev, fullName: e.target.value } : prev))
                }
                autoComplete="off"
              />
              <Input
                label={t("users.editEmailLabel")}
                type="email"
                value={editDialog.email}
                onChange={(e) =>
                  setEditDialog((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                }
                placeholder={t("users.editEmailPlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="flex shrink-0 justify-end border-t border-zinc-200 pt-3">
              <Button
                type="button"
                variant="primary"
                className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
                disabled={updateProfile.isPending}
                onClick={() => void confirmEditProfile()}
              >
                {updateProfile.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {t("users.editPasswordSectionTitle")}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {t("users.editPasswordSectionHint")}
                </p>
              </div>
              <Input
                label={t("users.editNewPasswordLabel")}
                type="password"
                value={editDialog.newPassword}
                onChange={(e) =>
                  setEditDialog((prev) => (prev ? { ...prev, newPassword: e.target.value } : prev))
                }
                placeholder={t("users.editNewPasswordPlaceholder")}
                autoComplete="new-password"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto sm:min-w-[140px]"
                  disabled={resetPassword.isPending || editDialog.newPassword.length < 8}
                  onClick={() => void confirmResetPassword()}
                >
                  {resetPassword.isPending ? t("common.saving") : t("users.resetPasswordButton")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={requestModalClose}
        titleId="create-user-title"
        title={t("users.modalTitle")}
        description={t("users.modalHint")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-lg"
      >
        <form onSubmit={onSubmit}>
          <ModalFormLayout
            body={
              <FormSection>
                <Input
                  label={t("users.fieldUsername")}
                  labelRequired
                  required
                  autoComplete="username"
                  {...register("username", { required: t("common.required") })}
                  error={errors.username?.message}
                />
                <Input
                  label={t("users.fieldPassword")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("password", { required: t("common.required") })}
                  error={errors.password?.message}
                />
                <Input
                  label={t("users.fieldPasswordConfirm")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("passwordConfirm", { required: t("common.required") })}
                  error={errors.passwordConfirm?.message}
                />
                <Input
                  label={t("users.fieldFullName")}
                  autoComplete="name"
                  {...register("fullName")}
                  error={errors.fullName?.message}
                />
                <Select
                  label={t("users.fieldRole")}
                  options={roleOptions}
                  name={roleField.name}
                  value={String(roleField.value ?? "STAFF")}
                  onChange={(e) => roleField.onChange(e.target.value as AppUserRole)}
                  onBlur={roleField.onBlur}
                  ref={roleField.ref}
                />
                {createUserRoleDetailText ? (
                  <p className="-mt-1 text-xs leading-relaxed text-zinc-600">
                    {createUserRoleDetailText}
                  </p>
                ) : null}
                {String(roleField.value ?? "").toUpperCase() === "BRANCH_DAY_REGISTER" ? (
                  <div className="mt-3">
                    <BranchDayRegisterAdminSetupCallout
                      t={t}
                      canOpenScopesAfterSave={canManageUserDataScopes(user)}
                    />
                  </div>
                ) : null}
                <Select
                  label={t("users.fieldPersonnel")}
                  labelRequired={roleRequiresPersonnel(String(roleField.value ?? ""))}
                  options={personnelOptions}
                  name={personnelField.name}
                  value={String(personnelField.value ?? "")}
                  onChange={(e) => personnelField.onChange(e.target.value)}
                  onBlur={personnelField.onBlur}
                  ref={personnelField.ref}
                />
                {roleRequiresPersonnel(String(roleField.value ?? "")) ? (
                  <p className="-mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-amber-800">
                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                      {t("users.rolePersonnelRequiredBadge")}
                    </span>
                    <span>{t("users.personnelRequiredForRoleHint")}</span>
                  </p>
                ) : null}
              </FormSection>
            }
            footer={
              <>
                <Button
                  type="submit"
                  className="min-h-11 w-full min-w-[120px] sm:w-auto"
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>
    </>
  );
}
