"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UserListItem } from "@/types/user";

export type PermissionDraftValue = "INHERIT" | "ALLOW" | "DENY";

type Params = {
  permissionsModalUser: UserListItem | null;
  userPermissionData:
    | { overrides: { permissionCode: string; effect: "ALLOW" | "DENY" }[] }
    | null
    | undefined;
};

/**
 * Permission override modal'ı için arama metni + draft sözlüğü + yardım panel ref'i.
 *
 * - Modal açılınca aramayı sıfırlar ve draft'ı backend overrides'dan seed eder.
 * - Yardım paneli `<details>` öğesi mobilde kapalı, desktop'ta açık başlar.
 *
 * SRP: yalnızca permission editor'ün geçici state'i + seeding.
 */
export function useUsersPermissionDraft({ permissionsModalUser, userPermissionData }: Params) {
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<Record<string, PermissionDraftValue>>({});
  const permHelpDetailsRef = useRef<HTMLDetailsElement>(null);

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

  return {
    permissionSearch,
    setPermissionSearch,
    permissionDraft,
    setPermissionDraft,
    permHelpDetailsRef,
  };
}
