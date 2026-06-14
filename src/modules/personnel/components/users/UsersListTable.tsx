"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import Link from "next/link";
import { ResponsiveTableFrame } from "@/shared/tables/ResponsiveTableFrame";
import { StatusBadge, appUserAccountStatusTone } from "@/shared/components/StatusBadge";
import type { ReactNode } from "react";
import type { UserListItem } from "@/types/user";

/**
 * Kullanıcı listesi: mobil kart + masaüstü tablo. Saf sunum.
 *
 * Tüm action button'ları ve row-bazlı render'lar dışarıdan callback olarak gelir
 * (action/render API). Bu sayede orchestrator handler'larıyla bu component arası
 * sıkı kuplaj olmaz (SRP).
 */
type RowApi = {
  /** True ise satır vurgulanır (geçici "pulse"). */
  isPulse: (r: UserListItem) => boolean;
  /** Satır başına özet metinleri (override + scope). */
  permSummary: (r: UserListItem) => { overrides: string; scopes: string };
  userHasRole: (r: UserListItem, code: string) => boolean;

  // Sınırlı action / render helpers
  mfaToggleAction: (r: UserListItem) => ReactNode;
  accountStatusAction: (r: UserListItem, opts?: { compact?: boolean }) => ReactNode;
  deleteAction: (r: UserListItem, opts?: { compact?: boolean }) => ReactNode;
  renderUserRoleControl: (r: UserListItem) => ReactNode;
  renderPersonnelControl: (r: UserListItem) => ReactNode;
  renderScopeMissingWarning: (r: UserListItem) => ReactNode;
  renderUserAuthIconButtons: (r: UserListItem) => ReactNode;

  /** "Veri kapsamlarını yönet" yetkisi yoksa ek link gösterilir. */
  canManageUserDataScopes: boolean;

  /** DRIVER rolü için self-financials checkbox handler ve loading durumu. */
  patchSelfFinPendingForUser: (r: UserListItem) => boolean;
  onToggleSelfFin: (r: UserListItem, checked: boolean) => void;
};

type Props = {
  rows: UserListItem[];
  api: RowApi;
};

export function UsersListTable({ rows, api }: Props) {
  const { t } = useI18n();
  return (
    <ResponsiveTableFrame
      mobileVisibilityClassName="md:flex lg:hidden"
      desktopVisibilityClassName="hidden lg:block"
      mobileClassName="p-3"
      desktopClassName="lg:overflow-x-auto"
      mobile={
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const permSummary = api.permSummary(r);
            return (
              <li
                key={r.id}
                id={`global-user-row-${r.id}`}
                className={cn(
                  "rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm transition-[box-shadow,ring] duration-500 sm:p-4",
                  api.isPulse(r) &&
                    "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-base font-semibold leading-snug text-zinc-900">
                      {r.fullName?.trim() || t("personnel.dash")}
                    </p>
                    <p className="truncate text-xs font-medium text-zinc-500">@{r.username}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-zinc-500">
                        {t("users.tableMfa")}
                      </span>
                      <StatusBadge
                        tone={Boolean(r.totpEnabled) ? "success" : "muted"}
                        className="normal-case tracking-normal"
                        size="md"
                      >
                        {Boolean(r.totpEnabled)
                          ? t("users.mfaOnShort")
                          : t("users.mfaOffShort")}
                      </StatusBadge>
                      {api.mfaToggleAction(r)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                      {r.status.toUpperCase() === "ACTIVE"
                        ? t("users.statusActive")
                        : t("users.statusInactive")}
                    </StatusBadge>
                    {api.accountStatusAction(r)}
                    {api.deleteAction(r)}
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <dt className="shrink-0 text-zinc-500">{t("users.tableRole")}</dt>
                    <dd>{api.renderUserRoleControl(r)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="shrink-0 text-zinc-500">{t("users.tablePersonnel")}</dt>
                    <dd className="min-w-0">{api.renderPersonnelControl(r)}</dd>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-zinc-200/60 pt-2">
                    <dt className="shrink-0 text-zinc-500">{t("users.tablePermissions")}</dt>
                    <dd className="space-y-1 text-xs leading-snug text-zinc-700">
                      <p>{permSummary.overrides}</p>
                      <p>{permSummary.scopes}</p>
                    </dd>
                    {api.renderScopeMissingWarning(r)}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">{api.renderUserAuthIconButtons(r)}</div>
                      {!api.canManageUserDataScopes ? (
                        <Link
                          href="/admin/settings/authorization"
                          className="text-xs font-medium text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                        >
                          {t("users.manageScopesGoAuthorization")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {api.userHasRole(r, "DRIVER") ? (
                    <div className="flex flex-col gap-1 border-t border-zinc-200/60 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="shrink-0 text-zinc-500">{t("users.tableSelfFinancials")}</dt>
                        <dd>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-violet-600"
                            checked={Boolean(r.allowPersonnelSelfFinancials)}
                            disabled={api.patchSelfFinPendingForUser(r)}
                            onChange={(e) => api.onToggleSelfFin(r, e.target.checked)}
                            aria-label={t("users.selfFinancialsHint")}
                          />
                        </dd>
                      </div>
                      <p className="text-xs text-zinc-500">{t("users.selfFinancialsHint")}</p>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      }
      desktop={
        <table className="w-full min-w-0 lg:min-w-[920px] border-collapse text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tableUser")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tableName")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tableRole")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tableMfa")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tableStatus")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tablePersonnel")}</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                {t("users.tableSelfFinancials")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">{t("users.tablePermissions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {rows.map((r) => {
              const permSummary = api.permSummary(r);
              return (
                <tr
                  key={r.id}
                  id={`global-user-row-${r.id}`}
                  className={cn(
                    "hover:bg-zinc-50/80 transition-[box-shadow] duration-500",
                    api.isPulse(r) &&
                      "bg-violet-50/50 shadow-[inset_0_0_0_2px_rgb(139_92_246)]"
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                    {r.username}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 lg:max-w-none">
                    {r.fullName?.trim() || t("personnel.dash")}
                  </td>
                  <td className="max-w-[20rem] px-4 py-3">{api.renderUserRoleControl(r)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={Boolean(r.totpEnabled) ? "success" : "muted"}
                        className="normal-case tracking-normal"
                        size="md"
                      >
                        {Boolean(r.totpEnabled)
                          ? t("users.mfaOnShort")
                          : t("users.mfaOffShort")}
                      </StatusBadge>
                      {api.mfaToggleAction(r)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                        {r.status.toUpperCase() === "ACTIVE"
                          ? t("users.statusActive")
                          : t("users.statusInactive")}
                      </StatusBadge>
                      <div className="flex items-center gap-1">
                        {api.accountStatusAction(r, { compact: true })}
                        {api.deleteAction(r, { compact: true })}
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-zinc-600 lg:max-w-xs">
                    {api.renderPersonnelControl(r)}
                  </td>
                  <td className="px-4 py-3">
                    {api.userHasRole(r, "DRIVER") ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-600"
                        checked={Boolean(r.allowPersonnelSelfFinancials)}
                        disabled={api.patchSelfFinPendingForUser(r)}
                        onChange={(e) => api.onToggleSelfFin(r, e.target.checked)}
                        title={t("users.selfFinancialsHint")}
                        aria-label={t("users.selfFinancialsHint")}
                      />
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[11rem] flex-col gap-2">
                      <div className="space-y-0.5 text-xs leading-snug text-zinc-600">
                        <p>{permSummary.overrides}</p>
                        <p>{permSummary.scopes}</p>
                      </div>
                      {api.renderScopeMissingWarning(r)}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {api.renderUserAuthIconButtons(r)}
                        </div>
                        {!api.canManageUserDataScopes ? (
                          <Link
                            href="/admin/settings/authorization"
                            className="text-xs font-medium text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
                          >
                            {t("users.manageScopesGoAuthorization")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }
    />
  );
}
