"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  useAuthorizationMatrix,
  usePutRolePermissions,
} from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Modal } from "@/shared/ui/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import type { PermissionDefinition } from "@/types/authorization-matrix";
import {
  groupPermissionsForMatrix,
  resolvePermissionGroupTitle,
  resolvePermissionLocalizedDescription,
  resolvePermissionScreenHint,
} from "@/modules/admin/lib/permission-groups";
import { adminUsersRoleTitleOrFallback } from "@/modules/account/lib/role-label";

function permissionPrimaryLabel(p: PermissionDefinition): string {
  return (p.description ?? "").trim() || p.code;
}

export function AuthorizationMatrixScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data, isLoading, isError, refetch } = useAuthorizationMatrix(Boolean(isReady && isAdmin));
  const putRole = usePutRolePermissions();

  const [draft, setDraft] = useState<Record<string, Set<string>> | null>(null);
  const [dialogRoleCode, setDialogRoleCode] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Set<string>> = {};
    for (const r of data.roles) {
      next[r.roleCode] = new Set(r.permissionCodes);
    }
    startTransition(() => {
      setDraft(next);
    });
  }, [data]);

  const toggle = useCallback((roleCode: string, permCode: string, adminRole: boolean) => {
    if (adminRole && permCode === "system.admin") return;
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = { ...prev };
      const set = new Set(copy[roleCode] ?? []);
      if (set.has(permCode)) set.delete(permCode);
      else set.add(permCode);
      copy[roleCode] = set;
      return copy;
    });
  }, []);

  const saveRow = useCallback(
    async (roleCode: string) => {
      if (!draft?.[roleCode]) return;
      let codes = [...draft[roleCode]];
      if (roleCode === "ADMIN" && !codes.includes("system.admin")) {
        codes = [...codes, "system.admin"];
      }
      try {
        await putRole.mutateAsync({ roleCode, permissionCodes: codes });
        notify.success(t("settings.authzSaved"));
      } catch (e) {
        notify.error(toErrorMessage(e));
      }
    },
    [draft, putRole, t]
  );

  const dirty = useMemo(() => {
    if (!data || !draft) return new Set<string>();
    const d = new Set<string>();
    for (const r of data.roles) {
      const a = new Set(r.permissionCodes);
      const b = draft[r.roleCode];
      if (!b || a.size !== b.size) {
        d.add(r.roleCode);
        continue;
      }
      for (const x of a) {
        if (!b.has(x)) {
          d.add(r.roleCode);
          break;
        }
      }
      if (!d.has(r.roleCode)) {
        for (const x of b) {
          if (!a.has(x)) {
            d.add(r.roleCode);
            break;
          }
        }
      }
    }
    return d;
  }, [data, draft]);

  const permissionGroups = useMemo(
    () => (data ? groupPermissionsForMatrix(data.permissions) : []),
    [data]
  );

  const modalRole = useMemo(() => {
    if (!data?.roles?.length || !dialogRoleCode) return null;
    return data.roles.find((ro) => ro.roleCode === dialogRoleCode) ?? null;
  }, [data, dialogRoleCode]);

  const modalRoleTitle = useMemo(() => {
    if (!modalRole) return "";
    return adminUsersRoleTitleOrFallback(modalRole.roleCode, modalRole.displayName, t);
  }, [modalRole, t]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 app-page-max flex-1 flex-col gap-5 p-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-6 sm:p-4 md:p-6">
      <div className="min-w-0">
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 hover:text-violet-800"
        >
          ← {t("settings.backToSettings")}
        </Link>
        <h1 className="mt-1 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
          {t("settings.authzPageTitle")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t("settings.authzPageDescription")}</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 sm:text-sm">{t("settings.authzMatrixHint")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">{t("settings.authzRoleAccordionHint")}</p>
      </div>

      <PageWhenToUseGuide
        guideTab="admin"
        title={t("common.pageWhenToUseTitle")}
        description={t("pageHelp.settingsAuthorization.intro")}
        listVariant="ordered"
        items={[
          { text: t("pageHelp.settingsAuthorization.step1") },
          {
            text: t("pageHelp.settingsAuthorization.step2"),
            link: { href: "/admin/users", label: t("pageHelp.settingsAuthorization.step2Link") },
          },
          { text: t("pageHelp.settingsAuthorization.step3") },
        ]}
      />

      {!isLoading && !isError && data ? (
        <div className="rounded-2xl border border-sky-200/90 bg-sky-50/80 p-4 text-sm leading-relaxed text-zinc-800 shadow-sm sm:p-5">
          <p className="font-semibold text-zinc-900">{t("permissionMeta.roleVsUserMatrixIntro")}</p>
          <p className="mt-2 text-zinc-700">{t("permissionMeta.roleVsUserOverrideIntro")}</p>
          <Link
            href="/admin/users"
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
          >
            {t("settings.authzUsersLink")} →
          </Link>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-10 text-center text-sm text-zinc-500 shadow-inner">
          {t("common.loading")}
        </div>
      ) : isError || !data || !draft ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50/40 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-700">{t("settings.authzLoadError")}</p>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:gap-4">
            {data.roles.map((r) => {
              const set = draft[r.roleCode] ?? new Set();
              const rowDirty = dirty.has(r.roleCode);
              const permTotal = data.permissions.length;
              const permCurrent = set.size;
              const roleTitle = adminUsersRoleTitleOrFallback(r.roleCode, r.displayName, t);
              const countLabel = t("settings.authzRolePermissionCount")
                .replace("{current}", String(permCurrent))
                .replace("{total}", String(permTotal));
              const openAria = t("settings.authzExpandRoleAria").replace("{role}", roleTitle);
              return (
                <button
                  key={r.roleCode}
                  type="button"
                  aria-label={openAria}
                  className={cn(
                    "flex w-full min-h-[4.25rem] items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 text-left shadow-md shadow-zinc-900/[0.04] ring-1 ring-zinc-950/[0.03] transition-colors sm:min-h-[4.5rem] sm:gap-4 sm:rounded-3xl sm:px-5 sm:py-4",
                    "bg-gradient-to-r from-violet-50/90 via-white to-fuchsia-50/50 hover:from-violet-50 hover:to-fuchsia-50/70 active:scale-[0.99]"
                  )}
                  onClick={() => setDialogRoleCode(r.roleCode)}
                >
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-violet-700 sm:h-6 sm:w-6"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">{roleTitle}</p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700/85 sm:text-[11px]">
                      {r.roleCode}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    {rowDirty ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80 sm:text-[10px]">
                        {t("settings.authzUnsaved")}
                      </span>
                    ) : null}
                    <span className="text-[11px] font-medium tabular-nums text-zinc-600 sm:text-xs">{countLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {modalRole ? (
            <Modal
              open
              onClose={() => setDialogRoleCode(null)}
              titleId="authz-role-dialog-title"
              title={modalRoleTitle}
              description={t("settings.authzRoleModalDescription")}
              closeButtonLabel={t("common.close")}
              wide
              wideFixedHeight
              wideFullScreenMobile
              backdropCloseRequiresConfirm={dirty.has(modalRole.roleCode)}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/80 sm:bg-white">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-4 sm:pt-3">
                  <p className="mb-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-[11px] font-medium text-zinc-600 shadow-sm sm:px-4 sm:text-xs">
                    <span className="font-mono font-semibold text-violet-800">{modalRole.roleCode}</span>
                    <span className="mx-1.5 text-zinc-400">·</span>
                    {t("settings.authzMobileRolePerms")}
                  </p>
                  <div className="space-y-6">
                    {permissionGroups.map((grp) => (
                      <div key={grp.prefix}>
                        <h3 className="mb-2 border-b border-zinc-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500 sm:text-xs">
                          {resolvePermissionGroupTitle(grp.prefix, t)}
                        </h3>
                        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                          {grp.permissions.map((p) => {
                            const permSet = draft[modalRole.roleCode] ?? new Set();
                            const checked = permSet.has(p.code);
                            const isSaving =
                              putRole.isPending && putRole.variables?.roleCode === modalRole.roleCode;
                            const disabled =
                              (modalRole.roleCode === "ADMIN" && p.code === "system.admin") || isSaving;
                            const whereHint = resolvePermissionScreenHint(p.code, t);
                            const detailBody = resolvePermissionLocalizedDescription(p, t);
                            const sameWhereAndDetail =
                              Boolean(whereHint) &&
                              Boolean(detailBody) &&
                              whereHint.trim() === detailBody.trim();
                            const ariaTitle = whereHint || detailBody || permissionPrimaryLabel(p);
                            return (
                              <li key={p.code}>
                                <label
                                  className={cn(
                                    "flex min-h-0 cursor-pointer flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm transition sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-4",
                                    checked
                                      ? "border-violet-200/90 bg-violet-50/45 ring-1 ring-violet-200/50"
                                      : "border-zinc-200/85 hover:border-zinc-300",
                                    disabled && "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  <span className="min-w-0 flex-1 space-y-2">
                                    {whereHint && !sameWhereAndDetail ? (
                                      <span className="block space-y-1">
                                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-violet-800/90">
                                          {t("users.permissionCardWhereHeading")}
                                        </span>
                                        <span className="block text-sm font-semibold leading-snug text-zinc-900 sm:text-[0.9375rem]">
                                          {whereHint}
                                        </span>
                                      </span>
                                    ) : null}
                                    <span className="block space-y-1">
                                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                        {t("users.permissionCardDetailHeading")}
                                      </span>
                                      <span className="block text-xs leading-snug text-zinc-700 sm:text-[0.8125rem] sm:leading-relaxed">
                                        {detailBody || permissionPrimaryLabel(p)}
                                      </span>
                                    </span>
                                    <span className="block rounded-md bg-zinc-50/95 px-2 py-1.5 ring-1 ring-zinc-200/80">
                                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                        {t("users.permissionCardTechnicalCodeHeading")}
                                      </span>
                                      <span className="mt-0.5 block break-all font-mono text-[10px] leading-normal text-zinc-800 sm:text-[11px]">
                                        {p.code}
                                      </span>
                                    </span>
                                  </span>
                                  <div className="flex shrink-0 items-center justify-end pt-0.5 sm:pt-1">
                                    <Checkbox
                                      className="h-5 w-5 rounded-md [&_svg]:h-3 [&_svg]:w-3 sm:h-6 sm:w-6"
                                      checked={checked}
                                      disabled={disabled}
                                      onCheckedChange={() =>
                                        void toggle(
                                          modalRole.roleCode,
                                          p.code,
                                          modalRole.roleCode === "ADMIN"
                                        )
                                      }
                                      aria-label={`${modalRoleTitle} — ${ariaTitle} — ${p.code}`}
                                    />
                                  </div>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:bg-zinc-50/70 sm:p-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-12 w-full rounded-xl text-sm font-semibold shadow-sm ring-1 ring-zinc-200/80"
                    disabled={
                      !dirty.has(modalRole.roleCode) ||
                      (putRole.isPending && putRole.variables?.roleCode === modalRole.roleCode)
                    }
                    onClick={() => void saveRow(modalRole.roleCode)}
                  >
                    {putRole.isPending && putRole.variables?.roleCode === modalRole.roleCode
                      ? t("common.saving")
                      : t("settings.authzSaveRow")}
                  </Button>
                </div>
              </div>
            </Modal>
          ) : null}
        </>
      )}
    </div>
  );
}
