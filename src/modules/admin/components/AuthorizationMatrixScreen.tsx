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
import { Tooltip } from "@/shared/ui/Tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PermissionDefinition } from "@/types/authorization-matrix";

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

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Set<string>> = {};
    for (const r of data.roles) {
      next[r.roleCode] = new Set(r.permissionCodes);
    }
    setDraft(next);
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
        ]}
      />

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
          {/* Küçük / orta ekran (xl altı): kartlar — dar masaüstünde tablo yerine */}
          <div className="flex flex-col gap-5 xl:hidden">
            {data.roles.map((r) => {
              const set = draft[r.roleCode] ?? new Set();
              const isSaving = putRole.isPending && putRole.variables?.roleCode === r.roleCode;
              const rowDirty = dirty.has(r.roleCode);
              return (
                <section
                  key={r.roleCode}
                  className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-900/[0.06] ring-1 ring-zinc-950/[0.04]"
                >
                  <header className="relative border-b border-violet-100 bg-gradient-to-r from-violet-50/95 via-white to-fuchsia-50/80 px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
                          {r.displayName}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-violet-700/90">
                          {r.roleCode}
                        </p>
                      </div>
                      {rowDirty ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
                          {t("settings.authzUnsaved")}
                        </span>
                      ) : null}
                    </div>
                  </header>
                  <p className="border-b border-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-500 sm:px-5">
                    {t("settings.authzMobileRolePerms")}
                  </p>
                  <div className="max-h-[min(58vh,28rem)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-3 py-3 sm:px-4">
                    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {data.permissions.map((p) => {
                        const checked = set.has(p.code);
                        const disabled =
                          (r.roleCode === "ADMIN" && p.code === "system.admin") || isSaving;
                        const label = permissionPrimaryLabel(p);
                        return (
                          <li key={p.code}>
                            <label
                              className={cn(
                                "flex min-h-[4.25rem] cursor-pointer flex-col justify-between gap-2 rounded-2xl border p-3 shadow-sm transition active:scale-[0.99] motion-reduce:active:scale-100 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3.5",
                                checked
                                  ? "border-violet-200/90 bg-violet-50/50 ring-1 ring-violet-200/60"
                                  : "border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/90 hover:border-zinc-300/90",
                                disabled && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-3 text-sm font-semibold leading-snug text-zinc-900">
                                  {label}
                                </span>
                                <span className="mt-1 block truncate font-mono text-[10px] text-zinc-500">
                                  {p.code}
                                </span>
                              </span>
                              <div className="flex shrink-0 items-center justify-end sm:pl-2">
                                <Checkbox
                                  className="h-5 w-5 rounded-md [&_svg]:h-3 [&_svg]:w-3"
                                  checked={checked}
                                  disabled={disabled}
                                  onCheckedChange={() =>
                                    void toggle(r.roleCode, p.code, r.roleCode === "ADMIN")
                                  }
                                  aria-label={`${r.roleCode} — ${p.code}`}
                                />
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/60 p-3 sm:p-4">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 w-full rounded-xl text-sm font-semibold shadow-sm ring-1 ring-zinc-200/80 sm:min-h-11"
                      disabled={!rowDirty || isSaving}
                      onClick={() => void saveRow(r.roleCode)}
                    >
                      {isSaving ? t("common.saving") : t("settings.authzSaveRow")}
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Geniş ekran (xl+): yatay başlıklı tablo; w-max ile sütunlar gereksiz genişlemez, taşarsa kaydır */}
          <div className="relative hidden xl:block">
            <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-violet-400/0 via-violet-400/25 to-fuchsia-400/0" />
            <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-900/[0.07] ring-1 ring-zinc-950/[0.04]">
              <div className="max-h-[min(78vh,56rem)] overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
                <table className="w-max max-w-none border-collapse text-left text-sm 2xl:text-base">
                  <thead className="sticky top-0 z-20 border-b border-zinc-200/90 bg-zinc-50/95 backdrop-blur-md">
                    <tr>
                      <th
                        className={cn(
                          "sticky left-0 z-30 min-w-[13rem] max-w-[18rem] border-b border-r border-zinc-200/80 bg-zinc-50/95 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-zinc-600 backdrop-blur-md 2xl:min-w-[15rem] 2xl:px-5 2xl:py-4",
                          "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)]"
                        )}
                      >
                        {t("settings.authzRole")}
                      </th>
                      {data.permissions.map((p) => {
                        const label = permissionPrimaryLabel(p);
                        const tip = (
                          <div className="space-y-1.5">
                            <p className="text-[13px] font-semibold leading-snug text-white">{label}</p>
                            <p className="font-mono text-[11px] leading-normal text-zinc-300">{p.code}</p>
                          </div>
                        );
                        return (
                          <th
                            key={p.code}
                            className="w-14 min-w-[3.5rem] max-w-[3.5rem] border-b border-zinc-200/80 px-0 py-2.5 align-middle 2xl:w-16 2xl:min-w-[4rem] 2xl:max-w-[4rem] 2xl:py-3"
                          >
                            <Tooltip
                              content={tip}
                              side="bottom"
                              delayMs={160}
                              className="flex w-full justify-center"
                              panelClassName="max-w-[min(20rem,calc(100vw-1.5rem))] whitespace-normal"
                            >
                              <button
                                type="button"
                                className="flex w-full max-w-full cursor-help flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center outline-none hover:bg-violet-100/60 focus-visible:ring-2 focus-visible:ring-violet-400"
                                aria-label={`${label} — ${p.code}`}
                              >
                                <span className="line-clamp-4 w-full break-all font-mono text-[9px] font-semibold leading-[1.2] text-zinc-800 2xl:text-[10px]">
                                  {p.code}
                                </span>
                                <span
                                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-violet-200/90 bg-violet-50 text-[9px] font-serif font-bold leading-none text-violet-800 2xl:h-[1.125rem] 2xl:w-[1.125rem]"
                                  aria-hidden
                                >
                                  i
                                </span>
                              </button>
                            </Tooltip>
                          </th>
                        );
                      })}
                      <th className="sticky right-0 z-30 min-w-[8.5rem] border-b border-l border-zinc-200/80 bg-zinc-50/95 px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-zinc-600 backdrop-blur-md shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] 2xl:min-w-[9.5rem]">
                        {t("settings.authzActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.roles.map((r) => {
                      const set = draft[r.roleCode] ?? new Set();
                      const isSaving = putRole.isPending && putRole.variables?.roleCode === r.roleCode;
                      const rowDirty = dirty.has(r.roleCode);
                      return (
                        <tr
                          key={r.roleCode}
                          className="group transition-colors hover:bg-violet-50/[0.35]"
                        >
                          <td
                            className={cn(
                              "sticky left-0 z-10 min-w-[13rem] max-w-[18rem] border-r border-zinc-100 bg-white px-4 py-3 align-middle shadow-[4px_0_12px_-6px_rgba(0,0,0,0.06)] transition-colors group-hover:bg-violet-50/40 2xl:min-w-[15rem] 2xl:px-5"
                            )}
                          >
                            <div className="font-semibold text-zinc-900">{r.displayName}</div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500" title={r.roleCode}>
                              {r.roleCode}
                            </div>
                            {rowDirty ? (
                              <div className="mt-1.5 inline-flex rounded-md bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                                {t("settings.authzUnsaved")}
                              </div>
                            ) : null}
                          </td>
                          {data.permissions.map((p) => {
                            const checked = set.has(p.code);
                            const disabled =
                              (r.roleCode === "ADMIN" && p.code === "system.admin") || isSaving;
                            return (
                              <td
                                key={p.code}
                                className="w-14 min-w-[3.5rem] max-w-[3.5rem] px-0 py-2.5 text-center align-middle 2xl:w-16 2xl:min-w-[4rem] 2xl:max-w-[4rem] 2xl:py-3"
                              >
                                <div className="flex min-h-[3rem] items-center justify-center 2xl:min-h-[3.25rem]">
                                  <Checkbox
                                    className="h-5 w-5 shrink-0 2xl:h-[1.375rem] 2xl:w-[1.375rem]"
                                    checked={checked}
                                    disabled={disabled}
                                    onCheckedChange={() =>
                                      void toggle(r.roleCode, p.code, r.roleCode === "ADMIN")
                                    }
                                    aria-label={`${r.roleCode} ${p.code}`}
                                  />
                                </div>
                              </td>
                            );
                          })}
                          <td
                            className={cn(
                              "sticky right-0 z-10 min-w-[8.5rem] border-l border-zinc-100 bg-white px-3 py-2.5 text-center align-middle shadow-[-4px_0_12px_-6px_rgba(0,0,0,0.06)] transition-colors group-hover:bg-violet-50/40 2xl:min-w-[9.5rem]"
                            )}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              className="rounded-lg px-3.5 py-2 text-xs font-semibold 2xl:text-sm"
                              disabled={!rowDirty || isSaving}
                              onClick={() => void saveRow(r.roleCode)}
                            >
                              {isSaving ? t("common.saving") : t("settings.authzSaveRow")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-400">
              {t("settings.authzDesktopScrollHint")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
