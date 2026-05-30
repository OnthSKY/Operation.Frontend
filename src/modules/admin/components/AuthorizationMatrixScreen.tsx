"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermissionCode, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import {
  useAuthorizationMatrix,
  useCreateCustomRole,
  useDeleteCustomRole,
  usePutRolePermissions,
} from "@/modules/admin/hooks/useAuthorizationAdminQueries";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, X } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PermissionDefinition } from "@/types/authorization-matrix";
import {
  groupPermissionsForMatrix,
  resolvePermissionGroupTitle,
  resolvePermissionLocalizedDescription,
  resolvePermissionScreenHint,
} from "@/modules/admin/lib/permission-groups";
import {
  adminUsersRoleDescription,
  adminUsersRoleTitleOrFallback,
} from "@/modules/account/lib/role-label";

function permissionPrimaryLabel(p: PermissionDefinition): string {
  return (p.description ?? "").trim() || p.code;
}

export function AuthorizationMatrixScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdmin = hasPermissionCode(user, PERM.systemAdmin);
  const { data, isLoading, isError, refetch } = useAuthorizationMatrix(Boolean(isReady && isAdmin));
  const putRole = usePutRolePermissions();

  const [draft, setDraft] = useState<Record<string, Set<string>> | null>(null);
  const [dialogRoleCode, setDialogRoleCode] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const createRole = useCreateCustomRole();
  const deleteRole = useDeleteCustomRole();

  // Modal-içi navigasyon: arama + grup tab strip + bulk select.
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Modal kapanırken arama state'ini sıfırla — yeniden açıldığında fresh başlasın.
  useEffect(() => {
    if (!dialogRoleCode) {
      setSearch("");
      setActiveGroup("");
    }
  }, [dialogRoleCode]);

  // Sistem rolleri (UI heuristik; backend güvenlik için ayrıca enforce eder).
  const SYSTEM_ROLE_CODES = useMemo(
    () => new Set(["ADMIN", "STAFF", "PERSONNEL", "DRIVER", "VIEWER", "FINANCE", "PROCUREMENT", "BRANCH_DAY_REGISTER"]),
    [],
  );

  useEffect(() => {
    if (isReady && user && !hasPermissionCode(user, PERM.systemAdmin))
      router.replace("/personnel");
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

  // Implication map'leri normalize et + reverse hesapla (narrower → broader).
  const broaderToNarrower = useMemo(() => data?.implications ?? {}, [data]);
  const narrowerToBroader = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [broader, narrowers] of Object.entries(broaderToNarrower)) {
      for (const n of narrowers) {
        if (!out[n]) out[n] = [];
        out[n].push(broader);
      }
    }
    return out;
  }, [broaderToNarrower]);

  const toggle = useCallback((roleCode: string, permCode: string, adminRole: boolean) => {
    if (adminRole && permCode === "system.admin") return;
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = { ...prev };
      const set = new Set(copy[roleCode] ?? []);
      if (set.has(permCode)) {
        // Uncheck: doğrudan kaldır, ek logic yok.
        set.delete(permCode);
      } else {
        // Check: mutex uygula.
        // (1) Bu kod bir broader ise, kapsadığı narrower kodlarını setten çıkar (redundancy).
        const impliedNarrower = broaderToNarrower[permCode];
        if (impliedNarrower) {
          for (const n of impliedNarrower) set.delete(n);
        }
        // (2) Bu kod bir narrower ise, kapsayan broader kodları setten çıkar (admin restrict istiyor).
        const coveringBroader = narrowerToBroader[permCode];
        if (coveringBroader) {
          for (const b of coveringBroader) set.delete(b);
        }
        set.add(permCode);
      }
      copy[roleCode] = set;
      return copy;
    });
  }, [broaderToNarrower, narrowerToBroader]);

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

  // Search-filtered groups (case-insensitive; matches code, screen hint, or description).
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissionGroups;
    return permissionGroups
      .map((grp) => {
        const matchedPerms = grp.permissions.filter((p) => {
          if (p.code.toLowerCase().includes(q)) return true;
          const where = resolvePermissionScreenHint(p.code, t).toLowerCase();
          if (where.includes(q)) return true;
          const desc = resolvePermissionLocalizedDescription(p, t).toLowerCase();
          if (desc.includes(q)) return true;
          return false;
        });
        return { ...grp, permissions: matchedPerms };
      })
      .filter((grp) => grp.permissions.length > 0);
  }, [permissionGroups, search, t]);

  // Bulk select/deselect tüm grup. ADMIN'in system.admin'i koruyor; broader varsa narrower otomatik düşer.
  const bulkSelectGroup = useCallback(
    (roleCode: string, groupCodes: string[], select: boolean) => {
      const adminRole = roleCode === "ADMIN";
      setDraft((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        const set = new Set(copy[roleCode] ?? []);
        if (select) {
          for (const code of groupCodes) set.add(code);
          // Mutex: broader varsa kapsadığı narrower'lar düşer.
          for (const [broader, narrowers] of Object.entries(broaderToNarrower)) {
            if (set.has(broader)) {
              for (const n of narrowers) set.delete(n);
            }
          }
        } else {
          for (const code of groupCodes) {
            if (adminRole && code === "system.admin") continue;
            set.delete(code);
          }
        }
        copy[roleCode] = set;
        return copy;
      });
    },
    [broaderToNarrower],
  );

  // Tab chip'e tıklayınca o gruba yumuşak scroll (modal scroll container içinde).
  const scrollToGroup = useCallback((prefix: string) => {
    const el = groupRefs.current[prefix];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveGroup(prefix);
    }
  }, []);

  // IntersectionObserver: hangi grup görünür (chip vurgusu için).
  useEffect(() => {
    if (!dialogRoleCode) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // En yüksek görünür oranı olan grubu aktif yap.
        let best: { prefix: string; ratio: number } | null = null;
        for (const entry of entries) {
          const prefix = entry.target.getAttribute("data-group-prefix");
          if (!prefix || !entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { prefix, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveGroup(best.prefix);
      },
      { root: container, threshold: [0.1, 0.5, 0.9] },
    );
    for (const el of Object.values(groupRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [dialogRoleCode, filteredGroups]);

  const modalRole = useMemo(() => {
    if (!data?.roles?.length || !dialogRoleCode) return null;
    return data.roles.find((ro) => ro.roleCode === dialogRoleCode) ?? null;
  }, [data, dialogRoleCode]);

  const modalRoleTitle = useMemo(() => {
    if (!modalRole) return "";
    return adminUsersRoleTitleOrFallback(modalRole.roleCode, modalRole.displayName, t);
  }, [modalRole, t]);

  const modalRoleDescription = useMemo(() => {
    if (!modalRole) return "";
    return adminUsersRoleDescription(modalRole.roleCode, t);
  }, [modalRole, t]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!hasPermissionCode(user, PERM.systemAdmin)) {
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

      {/* Custom role create CTA — sistem rollerinden ayrılıp burada */}
      {!isLoading && !isError && data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50/60 p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 sm:text-base">{t("userRoles.createRoleTitle")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">
              {t("userRoles.createRoleDescription")}
            </p>
          </div>
          <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
            {t("userRoles.createRoleButton")}
          </Button>
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
              const roleDescription = adminUsersRoleDescription(r.roleCode, t);
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
                    "flex w-full items-start gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 text-left shadow-md shadow-zinc-900/[0.04] ring-1 ring-zinc-950/[0.03] transition-colors sm:gap-4 sm:rounded-3xl sm:px-5 sm:py-4",
                    "bg-gradient-to-r from-violet-50/90 via-white to-fuchsia-50/50 hover:from-violet-50 hover:to-fuchsia-50/70 active:scale-[0.99]"
                  )}
                  onClick={() => setDialogRoleCode(r.roleCode)}
                >
                  <ChevronRight
                    className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 sm:h-6 sm:w-6"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">{roleTitle}</p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700/85 sm:text-[11px]">
                      {r.roleCode}
                    </p>
                    {roleDescription ? (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600 sm:text-[13px]">
                        {roleDescription}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    {rowDirty ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80 sm:text-[10px]">
                        {t("settings.authzUnsaved")}
                      </span>
                    ) : null}
                    {!SYSTEM_ROLE_CODES.has(r.roleCode) ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200/80 sm:text-[10px]">
                        {t("userRoles.customBadge")}
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
              description={modalRoleDescription || t("settings.authzRoleModalDescription")}
              closeButtonLabel={t("common.close")}
              wide
              wideFixedHeight
              wideFullScreenMobile
              backdropCloseRequiresConfirm={dirty.has(modalRole.roleCode)}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/80 sm:bg-white">
                {/* Sticky top bar: search + grup chip strip (modal scroll'undan ayrı kalır) */}
                <div className="shrink-0 border-b border-zinc-200 bg-white px-3 pt-3 sm:px-6">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("settings.authzSearchPlaceholder")}
                      className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      aria-label={t("settings.authzSearchPlaceholder")}
                    />
                    {search ? (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label={t("common.cancel")}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {/* Tab strip — yatay scroll, mobile parmak swipe */}
                  <div className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-2.5 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredGroups.map((grp) => {
                      const set = draft[modalRole.roleCode] ?? new Set();
                      const total = grp.permissions.length;
                      const sel = grp.permissions.filter((p) => set.has(p.code)).length;
                      const isActive = activeGroup === grp.prefix;
                      return (
                        <button
                          key={grp.prefix}
                          type="button"
                          onClick={() => scrollToGroup(grp.prefix)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                            isActive
                              ? "border-violet-300 bg-violet-100 text-violet-900 ring-2 ring-violet-200/80"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
                          )}
                        >
                          <span>{resolvePermissionGroupTitle(grp.prefix, t)}</span>
                          <span className={cn(
                            "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                            isActive ? "bg-white text-violet-900" : "bg-zinc-100 text-zinc-600",
                          )}>
                            {sel}/{total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  ref={scrollContainerRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-4 sm:pt-3"
                >
                  <p className="mb-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-[11px] font-medium text-zinc-600 shadow-sm sm:px-4 sm:text-xs">
                    <span className="font-mono font-semibold text-violet-800">{modalRole.roleCode}</span>
                    <span className="mx-1.5 text-zinc-400">·</span>
                    {t("settings.authzMobileRolePerms")}
                  </p>
                  {filteredGroups.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                      {t("settings.authzSearchNoMatch")}
                    </div>
                  ) : null}
                  <div className="space-y-6">
                    {filteredGroups.map((grp) => {
                      const set = draft[modalRole.roleCode] ?? new Set();
                      const groupCodes = grp.permissions.map((p) => p.code);
                      const sel = groupCodes.filter((c) => set.has(c)).length;
                      const allSelected = sel === groupCodes.length;
                      const noneSelected = sel === 0;
                      return (
                      <div
                        key={grp.prefix}
                        ref={(el) => { groupRefs.current[grp.prefix] = el; }}
                        data-group-prefix={grp.prefix}
                      >
                        <div className="mb-2 flex items-end justify-between gap-2 border-b border-zinc-200 pb-1">
                          <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 sm:text-xs">
                            {resolvePermissionGroupTitle(grp.prefix, t)}
                          </h3>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => bulkSelectGroup(modalRole.roleCode, groupCodes, true)}
                              disabled={allSelected}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 sm:text-[11px]"
                            >
                              {t("settings.authzBulkAll")}
                            </button>
                            <button
                              type="button"
                              onClick={() => bulkSelectGroup(modalRole.roleCode, groupCodes, false)}
                              disabled={noneSelected}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 sm:text-[11px]"
                            >
                              {t("settings.authzBulkNone")}
                            </button>
                          </div>
                        </div>
                        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                          {grp.permissions.map((p) => {
                            const permSet = draft[modalRole.roleCode] ?? new Set();
                            const checked = permSet.has(p.code);
                            const isSaving =
                              putRole.isPending && putRole.variables?.roleCode === modalRole.roleCode;
                            // Implication state: bu kod bir narrower mi ve onu kapsayan bir broader şu an checked mi?
                            const coveringBroaderList = narrowerToBroader[p.code] ?? [];
                            const coveredByChecked = coveringBroaderList.find((b) => permSet.has(b));
                            // Implication state: bu kod broader mı ve hangi narrower'ları kapsıyor?
                            const impliesList = broaderToNarrower[p.code] ?? [];
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
                                      : coveredByChecked
                                        ? "border-emerald-200/90 bg-emerald-50/45 ring-1 ring-emerald-200/40"
                                        : "border-zinc-200/85 hover:border-zinc-300",
                                    disabled && "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  <span className="min-w-0 flex-1 space-y-2">
                                    {/* Implication hint badge'leri — kod yerine localized label, tooltip ile tam metin */}
                                    {coveredByChecked ? (
                                      <span
                                        className="inline-flex max-w-full items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80"
                                        title={`${resolvePermissionScreenHint(coveredByChecked, t) || coveredByChecked} — ${coveredByChecked}`}
                                      >
                                        <span aria-hidden>✓</span>
                                        <span className="truncate">
                                          {t("settings.authzImpliedByLabel")}: {resolvePermissionScreenHint(coveredByChecked, t) || coveredByChecked}
                                        </span>
                                      </span>
                                    ) : null}
                                    {!coveredByChecked && impliesList.length > 0 ? (
                                      <span
                                        className="inline-flex max-w-full items-start gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200/80"
                                        title={impliesList
                                          .map((c) => `${resolvePermissionScreenHint(c, t) || c} (${c})`)
                                          .join("\n")}
                                      >
                                        <span aria-hidden>⊃</span>
                                        <span className="truncate">
                                          {t("settings.authzCoversN").replace("{n}", String(impliesList.length))}
                                        </span>
                                      </span>
                                    ) : null}
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
                                      // Broader checked ise narrower otomatik granted gibi görünür ama
                                      // store'da yok — visual only checked, toggle ettiklerinde broader uncheck'lenir.
                                      checked={checked || Boolean(coveredByChecked)}
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
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:bg-zinc-50/70 sm:p-4">
                  <div className="flex gap-2">
                    {!SYSTEM_ROLE_CODES.has(modalRole.roleCode) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-12 rounded-xl border-red-200 px-4 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
                        disabled={deleteRole.isPending}
                        onClick={async () => {
                          const ok = window.confirm(
                            t("userRoles.deleteRoleConfirmTitle").replace("{role}", modalRoleTitle),
                          );
                          if (!ok) return;
                          try {
                            await deleteRole.mutateAsync(modalRole.roleCode);
                            notify.success(
                              t("userRoles.deleteRoleSuccess").replace("{role}", modalRoleTitle),
                            );
                            setDialogRoleCode(null);
                          } catch (e) {
                            notify.error(toErrorMessage(e));
                          }
                        }}
                      >
                        {deleteRole.isPending ? t("common.saving") : t("userRoles.deleteRoleSubmit")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 flex-1 rounded-xl text-sm font-semibold shadow-sm ring-1 ring-zinc-200/80"
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
              </div>
            </Modal>
          ) : null}

          {/* Yeni özel rol modal'ı */}
          {createOpen ? (
            <Modal
              open
              onClose={() => {
                setCreateOpen(false);
                setNewCode("");
                setNewDisplay("");
              }}
              titleId="authz-create-role-title"
              title={t("userRoles.createRoleTitle")}
              description={t("userRoles.createRoleDescription")}
              closeButtonLabel={t("common.close")}
            >
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    {t("userRoles.createRoleCodeLabel")}
                  </label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                    placeholder={t("userRoles.createRoleCodePlaceholder")}
                    autoFocus
                  />
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    {t("userRoles.createRoleCodeHint")}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    {t("userRoles.createRoleDisplayLabel")}
                  </label>
                  <Input
                    value={newDisplay}
                    onChange={(e) => setNewDisplay(e.target.value)}
                    placeholder={t("userRoles.createRoleDisplayPlaceholder")}
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-2 min-h-12 w-full rounded-xl text-sm font-semibold"
                  disabled={createRole.isPending || newCode.trim().length === 0}
                  onClick={async () => {
                    const code = newCode.trim();
                    if (!code) {
                      notify.error(t("userRoles.createRoleCodeRequired"));
                      return;
                    }
                    try {
                      const created = await createRole.mutateAsync({
                        code,
                        displayName: newDisplay.trim() || undefined,
                      });
                      notify.success(t("userRoles.createRoleSuccess").replace("{role}", created.code));
                      setCreateOpen(false);
                      setNewCode("");
                      setNewDisplay("");
                    } catch (e) {
                      notify.error(toErrorMessage(e));
                    }
                  }}
                >
                  {createRole.isPending ? t("common.saving") : t("userRoles.createRoleSubmit")}
                </Button>
              </div>
            </Modal>
          ) : null}
        </>
      )}
    </div>
  );
}
