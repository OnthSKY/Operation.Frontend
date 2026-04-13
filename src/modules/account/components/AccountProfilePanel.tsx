"use client";

import type { AuthUser } from "@/lib/auth/types";
import { accountRoleLabel } from "@/modules/account/lib/role-label";
import { useI18n } from "@/i18n/context";
import { PersonnelProfilePhotoAvatar } from "@/modules/personnel/components/PersonnelProfilePhotoAvatar";
import { usePersonnelDetail } from "@/modules/personnel/hooks/usePersonnelQueries";
import { useEffect, useState } from "react";

type Props = {
  user: AuthUser;
};

export function AccountProfilePanel({ user }: Props) {
  const { t } = useI18n();
  const displayName = user.fullName?.trim() || user.username;
  const pid =
    user.personnelId != null && user.personnelId > 0 ? user.personnelId : null;
  const { data: personnelRow } = usePersonnelDetail(pid, pid != null);
  const [photoNonce, setPhotoNonce] = useState(0);

  useEffect(() => {
    if (!personnelRow) return;
    setPhotoNonce(Date.now());
  }, [
    personnelRow?.hasProfilePhoto1,
    personnelRow?.hasProfilePhoto2,
    personnelRow?.id,
  ]);

  return (
    <section aria-labelledby="account-profile-heading" className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        {pid != null ? (
          <PersonnelProfilePhotoAvatar
            personnelId={pid}
            hasPhoto={personnelRow?.hasProfilePhoto1 === true}
            nonce={photoNonce}
            displayName={displayName}
            photoLabel={t("personnel.profilePhotoAvatarAria")}
            className="h-16 w-16"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3
            id="account-profile-heading"
            className="text-base font-semibold text-zinc-900"
          >
            {displayName}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {t("profile.sectionProfile")}
          </p>
        </div>
      </div>
      <dl className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
          <dt className="shrink-0 text-zinc-500">{t("profile.username")}</dt>
          <dd className="break-all font-mono text-zinc-900">{user.username}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
          <dt className="shrink-0 text-zinc-500">{t("profile.userId")}</dt>
          <dd className="font-mono text-zinc-900">{user.id}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
          <dt className="shrink-0 text-zinc-500">{t("profile.role")}</dt>
          <dd className="text-right text-zinc-900">{accountRoleLabel(user.role, t)}</dd>
        </div>
        {user.personnelId != null ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-zinc-500">{t("profile.personnelId")}</dt>
            <dd className="font-mono text-zinc-900">{user.personnelId}</dd>
          </div>
        ) : null}
        {user.personnelBranchId != null ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-zinc-500">{t("profile.branchScope")}</dt>
            <dd className="font-mono text-zinc-900">{user.personnelBranchId}</dd>
          </div>
        ) : null}
        {user.totpEnabled ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-zinc-500">{t("profile.totpTitle")}</dt>
            <dd className="text-right text-emerald-700">{t("profile.totpEnabled")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
