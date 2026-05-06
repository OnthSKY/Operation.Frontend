import type { PermissionDefinition } from "@/types/authorization-matrix";

/** Stable column / section order (left → right). Unknown prefixes sort last alphabetically. */
export const PERMISSION_GROUP_ORDER = [
  "system",
  "operations",
  "warehouse",
  "ui",
  "branch",
  "personnel",
  "shipment",
  "other",
] as const;

export type PermissionGroup = { prefix: string; permissions: PermissionDefinition[] };

export function groupPermissionsForMatrix(permissions: PermissionDefinition[]): PermissionGroup[] {
  const map = new Map<string, PermissionDefinition[]>();
  for (const p of permissions) {
    const raw = p.code.split(".")[0] ?? "other";
    const prefix = raw.toLowerCase() || "other";
    const arr = map.get(prefix) ?? [];
    arr.push(p);
    map.set(prefix, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }

  const orderIndex = (prefix: string) => {
    const i = (PERMISSION_GROUP_ORDER as readonly string[]).indexOf(prefix);
    return i === -1 ? 999 : i;
  };

  const keys = [...map.keys()].sort((a, b) => {
    const da = orderIndex(a);
    const db = orderIndex(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  return keys.map((prefix) => ({ prefix, permissions: map.get(prefix)! }));
}

/** i18n key: permissionMeta.groupTitle_{prefix} */
export function permissionGroupTitleKey(prefix: string): string {
  return `permissionMeta.groupTitle_${prefix}`;
}

/** i18n key: permissionMeta.screen_{codeWithUnderscores} */
export function permissionScreenKeyForCode(code: string): string {
  return `permissionMeta.screen_${code.replace(/\./g, "_")}`;
}

/** i18n key: permissionMeta.prefixHint_{prefix} */
export function permissionPrefixHintKey(prefix: string): string {
  return `permissionMeta.prefixHint_${prefix}`;
}

export function resolvePermissionScreenHint(
  code: string,
  t: (key: string) => string
): string {
  const sk = permissionScreenKeyForCode(code);
  const specific = t(sk);
  if (specific !== sk) return specific;
  const prefix = (code.split(".")[0] ?? "other").toLowerCase() || "other";
  const pk = permissionPrefixHintKey(prefix);
  const fallback = t(pk);
  if (fallback !== pk) return fallback;
  return "";
}

/** i18n: permissionMeta.desc_{code_with_underscores} — sunucu `permissions.description` yerine çoklu dil metni. */
export function permissionDescriptionKeyForCode(code: string): string {
  return `permissionMeta.desc_${code.replace(/\./g, "_")}`;
}

/** Önce çeviri; yoksa API’den gelen İngilizce kısa açıklama. */
export function resolvePermissionLocalizedDescription(
  p: Pick<PermissionDefinition, "code" | "description">,
  t: (key: string) => string
): string {
  const dk = permissionDescriptionKeyForCode(p.code);
  const localized = t(dk);
  if (localized !== dk) return localized;
  return (p.description ?? "").trim();
}

export function resolvePermissionGroupTitle(prefix: string, t: (key: string) => string): string {
  const k = permissionGroupTitleKey(prefix);
  const v = t(k);
  if (v !== k) return v;
  return prefix;
}
