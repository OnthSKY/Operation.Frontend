export type AppUserRole =
  | "ADMIN"
  | "STAFF"
  | "PERSONNEL"
  | "DRIVER"
  | "VIEWER"
  | "FINANCE"
  | "PROCUREMENT"
  | "BRANCH_DAY_REGISTER";

export type UserListItem = {
  id: number;
  username: string;
  fullName: string | null;
  role: string;
  status: string;
  personnelId: number | null;
  allowPersonnelSelfFinancials: boolean;
  /** Sunucu: TOTP / MFA etkin mi */
  totpEnabled?: boolean;
  /** `user_permissions` satır sayısı */
  permissionOverrideCount?: number;
  /** Şube + depo + personel kapsam ataması satırları toplamı */
  customDataScopeCount?: number;
};

export type UserPermissionEffect = "ALLOW" | "DENY";

export type UserPermissionOverride = {
  permissionCode: string;
  effect: UserPermissionEffect;
};

export type UserPermissionOverridesResponse = {
  userId: number;
  overrides: UserPermissionOverride[];
};

export type ScopeLookupItem = {
  id: number;
  name: string;
};

export type BranchScopeAssignment = {
  branchId: number;
  scopeLevel: "SUMMARY" | "OPERATIONS" | "ALL_DATA";
};

export type WarehouseScopeAssignment = {
  warehouseId: number;
  scopeLevel: "READ" | "OPERATIONS" | "ALL_DATA";
};

export type PersonnelScopeAssignment = {
  personnelId: number | null;
  branchId: number | null;
  scopeLevel:
    | "SELF"
    | "BRANCH_SUMMARY"
    | "BRANCH_ALL_DATA"
    | "ALL_PERSONNEL_DATA"
    | "ADVANCE_DELEGATE_TARGET";
  /** Sunucu: şube kartı sorumlusu; `user_personnel_scopes` satırı değil. */
  source?: "USER" | "BRANCH_RESPONSIBLE";
};

export type UserDataScopesResponse = {
  userId: number;
  branchScopes: BranchScopeAssignment[];
  warehouseScopes: WarehouseScopeAssignment[];
  personnelScopes: PersonnelScopeAssignment[];
  branchOptions: ScopeLookupItem[];
  warehouseOptions: ScopeLookupItem[];
  personnelOptions: ScopeLookupItem[];
};

export type CreateUserInput = {
  username: string;
  password: string;
  fullName?: string | null;
  role: AppUserRole;
  personnelId?: number | null;
};
