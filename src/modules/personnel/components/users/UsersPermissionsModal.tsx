"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import Link from "next/link";
import { Ban, Check, ChevronDown, Layers, X } from "lucide-react";
import {
  resolvePermissionGroupTitle,
  resolvePermissionLocalizedDescription,
  resolvePermissionScreenHint,
} from "@/modules/admin/lib/permission-groups";
import type { PermissionDefinition } from "@/types/authorization-matrix";
import type { UserListItem } from "@/types/user";
import type { RefObject } from "react";

type PermissionDraftValue = "INHERIT" | "ALLOW" | "DENY";

type RoleMatrixBaseline =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ok"; set: Set<string> };

type RoleMatrixPermissionCounts =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ok"; granted: number; notGranted: number; total: number };

/**
 * Kullanıcı permission override editörü modal'ı: INHERIT / ALLOW / DENY üçlüsünden
 * seçim, role-matrix temelinde sonuç önizlemesi.
 *
 * SRP: sunum. Tüm state ve helper'lar prop olarak gelir.
 */
type Props = {
  user: UserListItem | null;
  onClose: () => void;

  permHelpDetailsRef: RefObject<HTMLDetailsElement | null>;
  permUserRoleLabel: string;

  permissionSearch: string;
  onSearchChange: (v: string) => void;

  groupedPermissions: { prefix: string; permissions: PermissionDefinition[] }[];
  permissionDraft: Record<string, PermissionDraftValue>;
  setPermissionDecision: (code: string, v: PermissionDraftValue) => void;
  hasPermissionDraftChanges: boolean;

  roleMatrixBaseline: RoleMatrixBaseline;
  roleMatrixPermissionCounts: RoleMatrixPermissionCounts;

  permissionDraftStats: { allowCount: number; denyCount: number };
  permissionInheritDraftCount: number;
  savedOverrideStats: { allow: number; deny: number; total: number } | null;

  isLoading: boolean;
  saving: boolean;
  onSave: () => void;
  permissionPrimaryLabel: (p: PermissionDefinition) => string;
};

export function UsersPermissionsModal(props: Props) {
  const {
    user,
    onClose,
    permHelpDetailsRef,
    permUserRoleLabel,
    permissionSearch,
    onSearchChange,
    groupedPermissions,
    permissionDraft,
    setPermissionDecision,
    hasPermissionDraftChanges,
    roleMatrixBaseline,
    roleMatrixPermissionCounts,
    permissionDraftStats,
    permissionInheritDraftCount,
    savedOverrideStats,
    isLoading,
    saving,
    onSave,
    permissionPrimaryLabel,
  } = props;
  const { t } = useI18n();
  const permissionsModalUser = user;
  const isUserPermissionsLoading = isLoading;
  const putUserPermissionOverrides = { isPending: saving } as const;
  const closePermissionsModal = onClose;
  const saveUserPermissionOverrides = onSave;

  return (
<Modal
  open={Boolean(permissionsModalUser)}
  onClose={closePermissionsModal}
  titleId="user-permissions-title"
  title={t("users.permissionsModalTitle")}
  closeButtonLabel={t("common.close")}
  wide
  wideExpanded
  wideFixedHeight
  wideFullScreenMobile
>
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/80 sm:bg-white">
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 sm:space-y-4 sm:bg-transparent sm:px-6 sm:pb-6 [-webkit-overflow-scrolling:touch]">
    {permissionsModalUser ? (
      <div className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {t("users.permissionsModalRoleHighlight")}
            </p>
            <p className="break-words text-xl font-bold leading-tight text-zinc-950 sm:text-2xl">
              {permUserRoleLabel}
            </p>
            <p className="break-all font-mono text-xs font-medium text-zinc-600 sm:text-sm">
              {permissionsModalUser.role}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-left sm:px-4 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {t("users.permissionsModalUserLabel")}
            </p>
            <p className="break-all text-sm font-semibold text-zinc-900 sm:text-base">
              {permissionsModalUser.username}
            </p>
          </div>
        </div>
        <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-600">
          {t("users.permissionInheritSourceLine").replace("{role}", permUserRoleLabel)}
        </p>
      </div>
    ) : null}

    <details
      ref={permHelpDetailsRef}
      className="group rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/95 to-white shadow-sm open:shadow-md"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3.5 text-left outline-none ring-zinc-900 focus-visible:ring-2 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t("users.permissionsGuideEyebrow")}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-900">
            {t("users.permissionsGuideToggleLabel")}
          </p>
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-zinc-200/80 px-3 pb-3 pt-2 text-xs leading-relaxed text-zinc-700 sm:px-4 sm:pb-4 sm:text-sm">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
          <p>{t("users.permissionsHelpIntro")}</p>
          <p className="mt-2 text-zinc-800">
            <span className="font-semibold text-zinc-900">{t("users.permissionsRoleVsUserTitle")}</span>{" "}
            <Link
              href="/admin/settings/authorization"
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
            >
              {t("settings.authzPageTitle")}
            </Link>
            {" — "}
            {t("users.permissionsModalHint")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <p className="font-semibold text-zinc-900">{t("users.permissionsThreeStatesTitle")}</p>
          <ul className="mt-2 list-disc space-y-2 pl-4 marker:text-zinc-400">
            <li>{t("users.permissionsInheritExplain")}</li>
            <li>{t("users.permissionsAllowExplain")}</li>
            <li>{t("users.permissionsDenyExplain")}</li>
          </ul>
          <p className="mt-3 border-t border-zinc-100 pt-3 text-xs font-semibold leading-snug text-zinc-800 sm:text-sm">
            {t("users.permissionsInheritPlainMeaning")}
          </p>
        </div>
      </div>
    </details>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-xs font-bold text-zinc-900">{t("users.permissionsStatsMatrixTitle")}</p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-600">
          {t("users.permissionsStatsMatrixSubtitle").replace("{role}", permUserRoleLabel)}
        </p>
        {roleMatrixPermissionCounts.kind === "loading" || roleMatrixPermissionCounts.kind === "idle" ? (
          <p className="mt-3 text-sm text-zinc-600">{t("users.permissionsStatsMatrixLoading")}</p>
        ) : roleMatrixPermissionCounts.kind === "missing" ? (
          <p className="mt-3 text-sm font-medium text-zinc-800">{t("users.permissionsStatsMatrixMissing")}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
                  {t("users.permissionsStatsMatrixGrantsLabel")}
                </p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                  {roleMatrixPermissionCounts.granted}
                </p>
                <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                  {t("users.permissionsStatsMatrixGrantsLabel")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
                  {t("users.permissionsStatsMatrixNotGrantedLabel")}
                </p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
                  {roleMatrixPermissionCounts.notGranted}
                </p>
                <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                  {t("users.permissionsStatsMatrixNotGrantedLabel")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
                <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
                  {t("users.permissionsStatsMatrixTotalLabel")}
                </p>
                <p className="text-2xl font-bold tabular-nums text-zinc-800 sm:text-3xl">
                  {roleMatrixPermissionCounts.total}
                </p>
                <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
                  {t("users.permissionsStatsMatrixTotalLabel")}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-zinc-600">
              {t("users.permissionsStatsMatrixFootnote")}
            </p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4">
        <p className="text-xs font-bold text-zinc-900">{t("users.permissionsStatsOverridesTitle")}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">
          {t("users.permissionsStatsOverridesSubtitle")}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
            <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
              {t("users.permissionsAllowLabel")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
              {permissionDraftStats.allowCount}
            </p>
            <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
              {t("users.permissionsAllowLabel")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
            <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-800 sm:hidden">
              {t("users.permissionsDenyLabel")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
              {permissionDraftStats.denyCount}
            </p>
            <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
              {t("users.permissionsDenyLabel")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:flex-col sm:items-stretch sm:justify-center sm:px-2 sm:py-3 sm:text-center">
            <p className="min-w-0 text-sm font-semibold leading-tight text-zinc-700 sm:hidden">
              {t("users.permissionsStatsOverridesInheritLabel")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-800 sm:text-3xl">
              {permissionInheritDraftCount}
            </p>
            <p className="hidden text-[10px] font-semibold uppercase leading-tight text-zinc-600 sm:block">
              {t("users.permissionsStatsOverridesInheritLabel")}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-zinc-600">{t("users.permissionsInheritedStatHint")}</p>
        {permissionsModalUser ? (
          isUserPermissionsLoading ? (
            <p className="mt-2 text-[11px] text-zinc-500">{t("common.loading")}</p>
          ) : savedOverrideStats ? (
            savedOverrideStats.total > 0 ? (
              <p className="mt-2 text-[11px] font-medium text-zinc-700">
                {t("users.permissionsStatsOverridesSaved")
                  .replace("{allow}", String(savedOverrideStats.allow))
                  .replace("{deny}", String(savedOverrideStats.deny))
                  .replace("{total}", String(savedOverrideStats.total))}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-600">{t("users.permissionsStatsOverridesSavedEmpty")}</p>
            )
          ) : null
        ) : null}
      </div>
    </div>

    <Input
      value={permissionSearch}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={t("users.permissionsSearchPlaceholder")}
      aria-label={t("users.permissionsSearchPlaceholder")}
      className="text-base sm:text-sm"
      autoComplete="off"
    />

    <div className="space-y-4 sm:space-y-5">
      {isUserPermissionsLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
          {t("common.loading")}
        </div>
      ) : groupedPermissions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
          {t("users.permissionsSearchEmpty")}
        </div>
      ) : (
        groupedPermissions.map(({ prefix: group, permissions }) => (
          <section key={group} className="space-y-2 sm:space-y-3">
            <h3 className="sticky top-0 z-[1] border-b border-zinc-200/80 bg-zinc-50/95 py-2 text-sm font-bold text-zinc-900 backdrop-blur-sm supports-[backdrop-filter]:bg-zinc-50/80 sm:text-base">
              {resolvePermissionGroupTitle(group, t)}
            </h3>
            <div className="space-y-2">
              {permissions.map((p) => {
                const value = permissionDraft[p.code] ?? "INHERIT";
                const whereHint = resolvePermissionScreenHint(p.code, t);
                const detailBody = resolvePermissionLocalizedDescription(p, t);
                const sameWhereAndDetail =
                  Boolean(whereHint) &&
                  Boolean(detailBody) &&
                  whereHint.trim() === detailBody.trim();
                const roleLine =
                  roleMatrixBaseline.kind === "loading"
                    ? t("users.permissionMatrixPending")
                    : roleMatrixBaseline.kind === "missing"
                      ? t("users.permissionMatrixRoleMissing")
                      : roleMatrixBaseline.kind === "ok"
                        ? roleMatrixBaseline.set.has(p.code)
                          ? t("users.permissionMatrixRoleGrantsThis").replace("{role}", permUserRoleLabel)
                          : t("users.permissionMatrixRoleDoesNotGrant").replace("{role}", permUserRoleLabel)
                        : "";
                const outcome =
                  value === "ALLOW"
                    ? t("users.permissionSaveEffectAllow").replace("{role}", permUserRoleLabel)
                    : value === "DENY"
                      ? t("users.permissionSaveEffectDeny").replace("{role}", permUserRoleLabel)
                      : roleMatrixBaseline.kind === "ok"
                        ? roleMatrixBaseline.set.has(p.code)
                          ? t("users.permissionSaveEffectInheritOn").replace("{role}", permUserRoleLabel)
                          : t("users.permissionSaveEffectInheritOff").replace("{role}", permUserRoleLabel)
                        : roleMatrixBaseline.kind === "loading"
                          ? t("users.permissionSaveEffectInheritPending")
                          : t("users.permissionSaveEffectInheritUnknown");
                return (
                  <article
                    key={p.code}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4"
                  >
                    <div className="space-y-3">
                      {whereHint && !sameWhereAndDetail ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/90">
                            {t("users.permissionCardWhereHeading")}
                          </p>
                          <p className="mt-1 text-base font-semibold leading-snug text-zinc-900 sm:text-sm">
                            {whereHint}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          {t("users.permissionCardDetailHeading")}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-700 sm:text-xs sm:leading-snug">
                          {detailBody || permissionPrimaryLabel(p)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-50/95 px-3 py-2.5 ring-1 ring-zinc-200/80">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          {t("users.permissionCardTechnicalCodeHeading")}
                        </p>
                        <p className="mt-1 break-all font-mono text-[11px] text-zinc-800">{p.code}</p>
                      </div>
                      {roleLine &&
                      !(value === "INHERIT" && roleMatrixBaseline.kind === "ok") ? (
                        <div
                          className={cn(
                            "rounded-xl border px-3 py-2.5",
                            roleMatrixBaseline.kind === "missing" &&
                              "border-zinc-200 border-l-4 border-l-zinc-400 bg-zinc-50",
                            roleMatrixBaseline.kind === "loading" &&
                              "border-zinc-200 border-l-4 border-l-zinc-300 bg-zinc-50",
                            roleMatrixBaseline.kind === "ok" && "border-zinc-200 bg-zinc-50"
                          )}
                        >
                          <p className="text-sm leading-snug text-zinc-800 sm:text-xs">{roleLine}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 sm:mt-3">
                    <div
                      className="grid grid-cols-3 gap-1.5 sm:gap-1 sm:rounded-xl sm:border sm:border-zinc-200 sm:bg-zinc-100/80 sm:p-1"
                      role="group"
                      aria-label={`${p.code}: ${t("users.permissionChoiceGroupAria")}`}
                    >
                      <Button
                        type="button"
                        variant={value === "INHERIT" ? "primary" : "secondary"}
                        className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                        title={
                          roleMatrixBaseline.kind === "ok"
                            ? `${t("users.permissionButtonTitleInherit")} (${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritIconAriaMatrixOn") : t("users.permissionInheritIconAriaMatrixOff")}). ${t("users.permissionInheritBadgeTitle")}: ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritBadgeGranted") : t("users.permissionInheritBadgeNotGranted")}`
                            : t("users.permissionButtonTitleInherit")
                        }
                        aria-label={
                          roleMatrixBaseline.kind === "ok"
                            ? `${t("users.permissionsInheritedLabel")} — ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritIconAriaMatrixOn") : t("users.permissionInheritIconAriaMatrixOff")}. ${roleMatrixBaseline.set.has(p.code) ? t("users.permissionInheritBadgeGranted") : t("users.permissionInheritBadgeNotGranted")}`
                            : t("users.permissionsInheritedLabel")
                        }
                        onClick={() => setPermissionDecision(p.code, "INHERIT")}
                        disabled={putUserPermissionOverrides.isPending}
                      >
                        <span
                          className="flex flex-col items-center justify-center gap-0.5"
                          aria-hidden
                        >
                          <Layers
                            className={cn(
                              "h-[1.15rem] w-[1.15rem] shrink-0 sm:h-4 sm:w-4",
                              value === "INHERIT" ? "text-white" : "text-zinc-800"
                            )}
                            strokeWidth={2}
                          />
                          {roleMatrixBaseline.kind === "ok" ? (
                            roleMatrixBaseline.set.has(p.code) ? (
                              <Check
                                className={cn(
                                  "h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5",
                                  value === "INHERIT" ? "text-white/95" : "text-zinc-600"
                                )}
                                strokeWidth={2.75}
                              />
                            ) : (
                              <X
                                className={cn(
                                  "h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5",
                                  value === "INHERIT" ? "text-white/95" : "text-zinc-500"
                                )}
                                strokeWidth={2.5}
                              />
                            )
                          ) : null}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant={value === "ALLOW" ? "primary" : "secondary"}
                        className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                        title={t("users.permissionButtonTitleAllow")}
                        aria-label={t("users.permissionsAllowLabel")}
                        onClick={() => setPermissionDecision(p.code, "ALLOW")}
                        disabled={putUserPermissionOverrides.isPending}
                      >
                        <Check
                          className="h-5 w-5 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]"
                          aria-hidden
                          strokeWidth={2.5}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant={value === "DENY" ? "primary" : "secondary"}
                        className="!h-[3rem] !min-h-[3rem] w-full !px-0 sm:!h-10 sm:!min-h-10"
                        title={t("users.permissionButtonTitleDeny")}
                        aria-label={t("users.permissionsDenyLabel")}
                        onClick={() => setPermissionDecision(p.code, "DENY")}
                        disabled={putUserPermissionOverrides.isPending}
                      >
                        <Ban
                          className="h-5 w-5 shrink-0 opacity-90 sm:h-[1.125rem] sm:w-[1.125rem]"
                          aria-hidden
                          strokeWidth={2.25}
                        />
                      </Button>
                    </div>
                    </div>
                    {value === "INHERIT" && roleMatrixBaseline.kind === "ok" ? null : (
                      <div className="mt-3 rounded-lg bg-zinc-50/90 px-2.5 py-2 sm:mt-2 sm:bg-transparent sm:px-0 sm:py-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                          {t("users.permissionChoiceOutcomeTitle")}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-700 sm:text-xs">{outcome}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
    </div>

    <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:pb-3">
      <Button
        type="button"
        className="min-h-12 w-full sm:min-h-11 sm:w-auto sm:min-w-[140px]"
        onClick={() => void saveUserPermissionOverrides()}
        disabled={!hasPermissionDraftChanges || putUserPermissionOverrides.isPending}
      >
        {putUserPermissionOverrides.isPending ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  </div>
</Modal>

  );
}
