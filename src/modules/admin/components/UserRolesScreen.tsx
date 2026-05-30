"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermissionCode, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { useAuthorizationMatrix, usePutUserRoles, useUserRoles } from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import { adminUsersRoleTitleOrFallback } from "@/modules/account/lib/role-label";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = { userId: number };

export function UserRolesScreen({ userId }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdmin = hasPermissionCode(user, PERM.systemAdmin);

  // Admin değilse personnel'a yönlendir.
  useEffect(() => {
    if (isReady && user && !isAdmin) router.replace("/personnel");
  }, [isReady, user, isAdmin, router]);

  const matrix = useAuthorizationMatrix(Boolean(isReady && isAdmin));
  const userRoles = useUserRoles(userId, Boolean(isReady && isAdmin));
  const putRoles = usePutUserRoles();

  // draft = anlık çalışma kümesi (bukullanıcıya atanacak rol setleri).
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (userRoles.data) {
      setDraft(new Set(userRoles.data.roleCodes));
    }
  }, [userRoles.data]);

  const allRoles = matrix.data?.roles ?? [];

  // Sistem / Custom ayrımı — sistem rollerini matriks bilmiyor; AuthorizationMatrixResponse'da
  // bu bilgi yok. ListRolesAsync DTO'sunda isSystem var ama matrix.roles içinde her satır
  // RolePermissionsRowDto (isSystem field yok). Bu yüzden well-known sistem rolleri statik
  // listeden tanırız — UI heuristik; backend güvenlik kararı vermez.
  const SYSTEM_ROLE_CODES = useMemo(
    () => new Set(["ADMIN", "STAFF", "PERSONNEL", "DRIVER", "VIEWER", "FINANCE", "PROCUREMENT", "BRANCH_DAY_REGISTER"]),
    [],
  );

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRoles;
    return allRoles.filter((r) => {
      const title = adminUsersRoleTitleOrFallback(r.roleCode, r.displayName, t).toLowerCase();
      return r.roleCode.toLowerCase().includes(q) || title.includes(q);
    });
  }, [allRoles, search, t]);

  const systemRoles = useMemo(
    () => filteredRoles.filter((r) => SYSTEM_ROLE_CODES.has(r.roleCode)),
    [filteredRoles, SYSTEM_ROLE_CODES],
  );
  const customRoles = useMemo(
    () => filteredRoles.filter((r) => !SYSTEM_ROLE_CODES.has(r.roleCode)),
    [filteredRoles, SYSTEM_ROLE_CODES],
  );

  const dirty = useMemo(() => {
    if (!userRoles.data || !draft) return false;
    const orig = new Set(userRoles.data.roleCodes);
    if (orig.size !== draft.size) return true;
    for (const x of orig) if (!draft.has(x)) return true;
    return false;
  }, [userRoles.data, draft]);

  const draftCount = draft?.size ?? 0;
  const willHaveNoRoles = dirty && draftCount === 0;

  const toggle = (code: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (willHaveNoRoles) {
      const ok = window.confirm(t("userRoles.confirmEmpty"));
      if (!ok) return;
    }
    try {
      await putRoles.mutateAsync({ userId, roleCodes: [...draft] });
      notify.success(t("userRoles.saved"));
      router.back();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  const loading = matrix.isLoading || userRoles.isLoading;
  const error = matrix.isError || userRoles.isError;

  return (
    <div className="mx-auto flex w-full min-w-0 app-page-max flex-1 flex-col gap-4 p-3 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] sm:gap-5 sm:p-4 md:p-6">
      {/* Header */}
      <div className="min-w-0">
        <Link
          href="/admin/users"
          className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 hover:text-violet-800"
        >
          ← {t("userRoles.backToUsers")}
        </Link>
        <h1 className="mt-1 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
          {t("userRoles.pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t("userRoles.pageDescription")}</p>
      </div>

      {/* Mevcut roller — chips (atılı olanlar) */}
      {draft && draft.size > 0 ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-800 sm:text-sm">
            {t("userRoles.currentSelectedLabel")}
            <span className="ml-1 tabular-nums">({draft.size})</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...draft].map((code) => {
              const role = allRoles.find((r) => r.roleCode === code);
              const title = role ? adminUsersRoleTitleOrFallback(role.roleCode, role.displayName, t) : code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggle(code)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-900 shadow-sm ring-1 ring-violet-300/80 hover:bg-violet-50 active:bg-violet-100 sm:text-sm"
                  aria-label={t("userRoles.removeRoleAria").replace("{role}", title)}
                >
                  {title}
                  <span aria-hidden className="text-violet-500">×</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : draft ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 sm:p-4 sm:text-sm">
          <p className="font-semibold">{t("userRoles.noneSelectedTitle")}</p>
          <p className="mt-1">{t("userRoles.noneSelectedHint")}</p>
        </div>
      ) : null}

      {/* Arama */}
      <Input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("userRoles.searchPlaceholder")}
        aria-label={t("userRoles.searchPlaceholder")}
      />

      {loading ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-10 text-center text-sm text-zinc-500 shadow-inner">
          {t("common.loading")}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50/40 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-700">{t("userRoles.loadError")}</p>
          <Button type="button" variant="secondary" onClick={() => { void matrix.refetch(); void userRoles.refetch(); }}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {systemRoles.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:text-sm">
                {t("userRoles.sectionSystem")}
              </h2>
              <RoleList roles={systemRoles} draft={draft} onToggle={toggle} systemBadge />
            </section>
          ) : null}

          {customRoles.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:text-sm">
                {t("userRoles.sectionCustom")}
              </h2>
              <RoleList roles={customRoles} draft={draft} onToggle={toggle} />
            </section>
          ) : null}

          {filteredRoles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
              {t("userRoles.searchNoMatch")}
            </div>
          ) : null}
        </div>
      )}

      {/* Sticky save bar — mobile-friendly thumb zone */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex w-full app-page-max items-center gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => router.back()}
            disabled={putRoles.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-[2]"
            onClick={() => void handleSave()}
            disabled={!dirty || putRoles.isPending || !draft}
          >
            {putRoles.isPending
              ? t("common.saving")
              : dirty
                ? t("userRoles.saveWithCount").replace("{count}", String(draftCount))
                : t("userRoles.noChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type RoleListProps = {
  roles: { roleCode: string; displayName: string }[];
  draft: Set<string> | null;
  onToggle: (code: string) => void;
  systemBadge?: boolean;
};

function RoleList({ roles, draft, onToggle, systemBadge = false }: RoleListProps) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col gap-2">
      {roles.map((r) => {
        const checked = draft?.has(r.roleCode) ?? false;
        const title = adminUsersRoleTitleOrFallback(r.roleCode, r.displayName, t);
        return (
          <li key={r.roleCode}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onToggle(r.roleCode)}
              className={cn(
                "flex w-full min-h-14 items-center gap-3 rounded-2xl border bg-white px-3 py-3 text-left shadow-sm transition-colors sm:gap-4 sm:px-4",
                checked
                  ? "border-violet-300 bg-violet-50/40 ring-1 ring-violet-200"
                  : "border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100",
              )}
            >
              {/* Visual checkbox — büyük tap target için checkbox button içine entegre */}
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors sm:h-7 sm:w-7",
                  checked ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white",
                )}
                aria-hidden
              >
                {checked ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.41 0l-3.5-3.5a1 1 0 011.41-1.42L8.5 12.08l6.79-6.79a1 1 0 011.41 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 sm:text-base">{title}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                  {r.roleCode}
                </p>
              </div>
              {systemBadge ? (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-700 ring-1 ring-zinc-200 sm:text-[10px]">
                  {t("userRoles.systemBadge")}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
