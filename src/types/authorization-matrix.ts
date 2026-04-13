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
};
