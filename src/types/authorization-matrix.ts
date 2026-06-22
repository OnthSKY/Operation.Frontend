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
  /** Veri kapsamı (scope) gerektiren izin kodları. Bu izinlerden birini içeren rol
   * atanınca admin kapsam tanımlamaya yönlendirilir (backend tek doğruluk kaynağı). */
  scopeRequiringPermissionCodes?: string[];
  /** Veri kapsamı (scope) gerektiren ROL kodları. İzin-bazlı tetikleyicinin geniş rollerde
   * yanlış pozitif vereceği durumlar için (ör. depo personeli). Bu rollerden biri atanınca
   * admin kapsam tanımlamaya yönlendirilir. */
  scopeRequiringRoleCodes?: string[];
};
