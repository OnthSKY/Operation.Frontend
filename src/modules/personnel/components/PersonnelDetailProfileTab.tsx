"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  formatHireDate,
  formatOptionalIso,
  formatSalary,
} from "@/modules/personnel/lib/personnel-formatters";
import { hasLinkedSystemUser } from "@/modules/personnel/lib/personnel-user-link";
import {
  personnelNationalIdPhotoUrl,
  personnelProfilePhotoUrl,
} from "@/modules/personnel/api/personnel-api";
import { NationalIdPreviewImg } from "@/modules/personnel/components/NationalIdPreviewImg";
import { PersonnelProfilePhotoAvatar } from "@/modules/personnel/components/PersonnelProfilePhotoAvatar";
import type { Personnel } from "@/types/personnel";

/**
 * Profil sekmesi: özet kart (avatar + ad + statü + temel alanlar) + profil fotoğrafları
 * + kimlik fotoğrafları kartları. Salt-okunur sunum; tüm tıklanır eylemler header'da.
 */
export function PersonnelDetailProfileTab({
  personnel,
  branchNameById,
  photoViewNonce,
  t,
  locale,
  dash,
}: {
  personnel: Personnel;
  branchNameById: Map<number, string>;
  /** Avatar URL'sini zorla yenilemek için nonce (cache-bust). */
  photoViewNonce: number;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}) {
  const cardCls = cn(
    "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
    personnel.isDeleted
      ? "border-zinc-200/90 bg-zinc-100/50"
      : "border-zinc-200 bg-white",
  );

  return (
    <div className="space-y-4 pb-2">
      <article className={cardCls}>
        <div className="flex flex-wrap items-start gap-3">
          <PersonnelProfilePhotoAvatar
            personnelId={personnel.id}
            hasPhoto={personnel.hasProfilePhoto1}
            profilePhotoPaths={{
              profilePhoto1Url: personnel.profilePhoto1Url,
              profilePhoto2Url: personnel.profilePhoto2Url,
            }}
            nonce={photoViewNonce}
            displayName={personnelDisplayName(personnel)}
            photoLabel={t("personnel.profilePhotoAvatarAria")}
            className="h-14 w-14 sm:h-16 sm:w-16"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-base font-semibold text-zinc-900",
                  personnel.isDeleted && "text-zinc-600",
                )}
              >
                {personnelDisplayName(personnel)}
              </h3>
              {personnel.isDeleted ? (
                <StatusBadge tone="inactive">
                  {t("personnel.badgePassive")}
                </StatusBadge>
              ) : null}
            </div>
          </div>
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.tableJobTitle")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {t(`personnel.jobTitles.${personnel.jobTitle}`)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">
              {t("personnel.tableCompanyHireDate")}
            </dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {formatHireDate(personnel, dash, locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.tableSalary")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {formatSalary(personnel, dash, locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.tableBranch")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {personnel.branchId != null
                ? (branchNameById.get(personnel.branchId) ??
                  `#${personnel.branchId}`)
                : dash}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.tableSystemUser")}</dt>
            <dd
              className="truncate font-medium text-zinc-900 sm:text-left"
              title={
                hasLinkedSystemUser(personnel) && personnel.username
                  ? personnel.username
                  : undefined
              }
            >
              {hasLinkedSystemUser(personnel) && personnel.username
                ? personnel.username
                : t("personnel.systemUserNone")}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">
              {t("personnel.insuranceSectionTitle")}
            </dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              <span>
                {personnel.insuranceStarted
                  ? t("personnel.insuranceStatusStarted")
                  : t("personnel.insuranceStatusPending")}
              </span>
              <span className="mt-1 block text-xs font-normal text-zinc-500">
                {t("personnel.detailInsuranceProfileHint")}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.fieldNationalId")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {personnel.nationalId?.trim() ? personnel.nationalId.trim() : dash}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">
              {t("personnel.nationalIdCardGenerationLabel")}
            </dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {personnel.nationalIdCardGeneration === "OLD"
                ? t("personnel.nationalIdCardGenerationOld")
                : personnel.nationalIdCardGeneration === "NEW"
                  ? t("personnel.nationalIdCardGenerationNew")
                  : dash}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.fieldBirthDate")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {formatOptionalIso(personnel.birthDate, dash, locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 sm:block sm:space-y-1">
            <dt className="text-zinc-500">{t("personnel.fieldPhone")}</dt>
            <dd className="font-medium text-zinc-900 sm:text-left">
              {personnel.phone?.trim() ? (
                <a
                  href={`tel:${personnel.phone.trim().replace(/\s+/g, "")}`}
                  className="text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800"
                >
                  {personnel.phone.trim()}
                </a>
              ) : (
                dash
              )}
            </dd>
          </div>
        </dl>
      </article>

      <article className={cardCls}>
        <h4 className="text-sm font-semibold text-zinc-900">
          {t("personnel.profilePhotosSectionTitle")}
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          {t("personnel.profilePhotosDetailViewHint")}
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-zinc-600">
              {t("personnel.profilePhotoSlot1")}
            </p>
            <div className="mt-1">
              <NationalIdPreviewImg
                href={
                  personnel.hasProfilePhoto1
                    ? personnelProfilePhotoUrl(personnel.id, 1, {
                        profilePhoto1Url: personnel.profilePhoto1Url,
                        profilePhoto2Url: personnel.profilePhoto2Url,
                      })
                    : null
                }
                emptyLabel={t("personnel.profilePhotosNoFile")}
                loadingLabel={t("common.loading")}
                fileBaseName={`personnel-${personnel.id}-profile-1`}
                lightboxTitle={t("personnel.profilePhotoLightbox1")}
                enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                downloadLabel={t("personnel.nationalIdPhotoDownload")}
                closeLabel={t("common.close")}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">
              {t("personnel.profilePhotoSlot2")}
            </p>
            <div className="mt-1">
              <NationalIdPreviewImg
                href={
                  personnel.hasProfilePhoto2
                    ? personnelProfilePhotoUrl(personnel.id, 2, {
                        profilePhoto1Url: personnel.profilePhoto1Url,
                        profilePhoto2Url: personnel.profilePhoto2Url,
                      })
                    : null
                }
                emptyLabel={t("personnel.profilePhotosNoFile")}
                loadingLabel={t("common.loading")}
                fileBaseName={`personnel-${personnel.id}-profile-2`}
                lightboxTitle={t("personnel.profilePhotoLightbox2")}
                enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                downloadLabel={t("personnel.nationalIdPhotoDownload")}
                closeLabel={t("common.close")}
              />
            </div>
          </div>
        </div>
      </article>

      <article className={cardCls}>
        <h4 className="text-sm font-semibold text-zinc-900">
          {t("personnel.nationalIdPhotosSectionTitle")}
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          {t("personnel.nationalIdPhotosDetailViewHint")}
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-zinc-600">
              {t("personnel.nationalIdPhotosFront")}
            </p>
            <div className="mt-1">
              <NationalIdPreviewImg
                href={
                  personnel.hasNationalIdPhotoFront
                    ? personnelNationalIdPhotoUrl(personnel.id, "front")
                    : null
                }
                emptyLabel={t("personnel.nationalIdPhotosNoFile")}
                loadingLabel={t("common.loading")}
                fileBaseName={`personnel-${personnel.id}-national-id-front`}
                lightboxTitle={t("personnel.nationalIdPhotoLightboxFront")}
                enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                downloadLabel={t("personnel.nationalIdPhotoDownload")}
                closeLabel={t("common.close")}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">
              {t("personnel.nationalIdPhotosBack")}
            </p>
            <div className="mt-1">
              <NationalIdPreviewImg
                href={
                  personnel.hasNationalIdPhotoBack
                    ? personnelNationalIdPhotoUrl(personnel.id, "back")
                    : null
                }
                emptyLabel={t("personnel.nationalIdPhotosNoFile")}
                loadingLabel={t("common.loading")}
                fileBaseName={`personnel-${personnel.id}-national-id-back`}
                lightboxTitle={t("personnel.nationalIdPhotoLightboxBack")}
                enlargeLabel={t("personnel.nationalIdPhotoEnlarge")}
                downloadLabel={t("personnel.nationalIdPhotoDownload")}
                closeLabel={t("common.close")}
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
