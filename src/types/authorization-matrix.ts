export type PermissionDefinition = {
  code: string;
  description: string | null;
  sortOrder: number;
};

export type RolePermissionsRow = {
  roleCode: string;
  displayName: string;
  permissionCodes: string[];
};

export type AuthorizationMatrix = {
  permissions: PermissionDefinition[];
  roles: RolePermissionsRow[];
  /** Broader code → kapsadığı narrower kodların listesi (scope hierarchy).
   * UI checkbox mutex'i ve "kapsanır" hint'leri bu maple kurulur. */
  implications?: Record<string, string[]>;
};
