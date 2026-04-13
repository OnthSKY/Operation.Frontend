"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import {
  useAuthorizationMatrix,
  usePutRolePermissions,
} from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {t("common.loading")}
        </div>
      ) : isError || !data || !draft ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-8">
          <p className="text-sm text-red-600">{t("settings.authzLoadError")}</p>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <>
          {/* Mobil: rol kartları, tam genişlik dokunma alanı */}
          <div className="flex flex-col gap-4 md:hidden">
            {data.roles.map((r) => {
              const set = draft[r.roleCode] ?? new Set();
              const isSaving = putRole.isPending && putRole.variables?.roleCode === r.roleCode;
              return (
                <section
                  key={r.roleCode}
                  className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm"
                >
                  <header className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                    <p className="text-base font-semibold text-zinc-900">{r.displayName}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {r.roleCode}
                    </p>
                  </header>
                  <p className="px-4 pt-3 text-xs font-medium text-zinc-500">
                    {t("settings.authzMobileRolePerms")}
                  </p>
                  <ul className="divide-y divide-zinc-100 px-2 pb-2">
                    {data.permissions.map((p) => {
                      const checked = set.has(p.code);
                      const disabled =
                        (r.roleCode === "ADMIN" && p.code === "system.admin") || isSaving;
                      return (
                        <li key={p.code}>
                          <label
                            className={`flex min-h-[3.25rem] items-start gap-3 rounded-lg px-2 py-3 ${
                              disabled
                                ? "cursor-not-allowed opacity-70"
                                : "cursor-pointer active:bg-zinc-50"
                            }`}
                          >
                            <Checkbox
                              className="mt-0.5 h-5 w-5 rounded-md border-[1.5px] [&_svg]:h-3 [&_svg]:w-3"
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() =>
                                void toggle(r.roleCode, p.code, r.roleCode === "ADMIN")
                              }
                              aria-label={p.code}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-mono text-sm font-medium text-zinc-900">
                                {p.code}
                              </span>
                              {p.description ? (
                                <span className="mt-1 block text-xs leading-snug text-zinc-600">
                                  {p.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-zinc-100 p-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 w-full text-sm font-semibold"
                      disabled={!dirty.has(r.roleCode) || isSaving}
                      onClick={() => void saveRow(r.roleCode)}
                    >
                      {isSaving ? t("common.saving") : t("settings.authzSaveRow")}
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Masaüstü: matris tablosu */}
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-3 font-medium text-zinc-700">
                    {t("settings.authzRole")}
                  </th>
                  {data.permissions.map((p) => (
                    <th
                      key={p.code}
                      className="max-w-[10rem] px-2 py-3 text-center text-xs font-medium text-zinc-600"
                      title={p.description ?? p.code}
                    >
                      <span className="line-clamp-3">{p.code}</span>
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium text-zinc-700">{t("settings.authzActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.roles.map((r) => {
                  const set = draft[r.roleCode] ?? new Set();
                  const isSaving = putRole.isPending && putRole.variables?.roleCode === r.roleCode;
                  return (
                    <tr key={r.roleCode} className="hover:bg-zinc-50/80">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-zinc-900 shadow-[1px_0_0_0_rgb(228_228_231)]">
                        <div>{r.displayName}</div>
                        <div className="text-xs font-normal text-zinc-500">{r.roleCode}</div>
                      </td>
                      {data.permissions.map((p) => {
                        const checked = set.has(p.code);
                        const disabled =
                          (r.roleCode === "ADMIN" && p.code === "system.admin") || isSaving;
                        return (
                          <td key={p.code} className="px-1 py-2 text-center">
                            <div className="flex justify-center">
                              <Checkbox
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
                      <td className="whitespace-nowrap px-3 py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          disabled={!dirty.has(r.roleCode) || isSaving}
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
        </>
      )}
    </div>
  );
}
