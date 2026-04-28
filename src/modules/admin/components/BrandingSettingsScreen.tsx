"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import type { BrandingSettingsPayload } from "@/modules/admin/api/system-branding-api";
import {
  useDeleteSystemBrandingLogoMutation,
  usePostSystemBrandingLogoMutation,
  usePutSystemBrandingMutation,
  useSystemBrandingQuery,
} from "@/modules/admin/hooks/useSystemBrandingQuery";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { SidebarBrandingLogo } from "@/shared/components/SidebarBrandingLogo";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function BrandingSettingsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, isPending, isError, error, refetch } = useSystemBrandingQuery(
    Boolean(user && user.role === "ADMIN")
  );
  const putMut = usePutSystemBrandingMutation();
  const postLogoMut = usePostSystemBrandingLogoMutation();
  const delLogoMut = useDeleteSystemBrandingLogoMutation();
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

  useEffect(() => {
    if (data) setNameDraft(data.companyName ?? "");
  }, [data]);

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

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    try {
      await putMut.mutateAsync({
        companyName: trimmed.length > 0 ? trimmed : "",
      });
      notify.success(t("settings.brandingSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onPickLogo = async (f: File | null) => {
    if (!f || f.size <= 0) return;
    const max = MAX_IMAGE_UPLOAD_BYTES;
    if (f.size > max) {
      notify.error(t("common.imageUploadTooLarge"));
      return;
    }
    try {
      await postLogoMut.mutateAsync(f);
      notify.success(t("settings.brandingLogoSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    try {
      await delLogoMut.mutateAsync();
      notify.success(t("settings.brandingLogoRemoved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const metaLine = (d: BrandingSettingsPayload) => {
    if (!d.updatedAtUtc) return t("settings.brandingNeverUpdated");
    return `${t("settings.notificationsLastSaved")} ${formatLocaleDateTime(d.updatedAtUtc, locale)}`;
  };

  return (
    <>
      <PageScreenScaffold
        variant="form"
        className={cn("w-full pb-24 pt-2 sm:pt-4")}
        top={
          <Link
            href="/admin/settings"
            className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
          >
            ← {t("settings.backToSettings")}
          </Link>
        }
        intro={
          <>
            <div className="min-w-0">
              <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
                {t("settings.brandingPageTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                {t("settings.brandingPageDescription")}
              </p>
            </div>
            <PageWhenToUseGuide
              guideTab="admin"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.settingsBranding.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.settingsBranding.step1") },
                { text: t("pageHelp.settingsBranding.step2") },
              ]}
            />
          </>
        }
        main={
          isPending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
              <p className="break-words leading-relaxed">{toErrorMessage(error)}</p>
              <button
                type="button"
                className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-red-100 px-4 text-sm font-semibold text-red-900 ring-1 ring-red-200/80 active:bg-red-200/80 sm:mt-3 sm:w-auto sm:justify-start sm:bg-transparent sm:px-0 sm:ring-0 sm:underline"
                onClick={() => void refetch()}
              >
                {t("common.retry")}
              </button>
            </div>
          ) : data ? (
            <div className="flex min-h-0 min-w-0 flex-col gap-4">
              <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              {t("settings.brandingSectionName")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{t("settings.brandingSectionNameHint")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="brand-name">
                  {t("settings.brandingCompanyNameLabel")}
                </label>
                <Input
                  id="brand-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder={t("settings.brandingCompanyNamePlaceholder")}
                  maxLength={120}
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                disabled={putMut.isPending}
                onClick={() => void saveName()}
              >
                {putMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </Card>

              <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              {t("settings.brandingSectionLogo")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{t("settings.brandingSectionLogoHint")}</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                {data.hasLogo ? (
                  <SidebarBrandingLogo
                    hasLogo
                    updatedAtUtc={data.updatedAtUtc}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="px-2 text-center text-[0.65rem] font-medium text-zinc-400">
                    {t("settings.brandingLogoEmpty")}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
                  className="hidden"
                  onChange={(e) => void onPickLogo(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={postLogoMut.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    {data.hasLogo ? t("settings.brandingReplaceLogo") : t("settings.brandingUploadLogo")}
                  </Button>
                  {data.hasLogo ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-red-700 ring-red-200 hover:bg-red-50"
                      disabled={delLogoMut.isPending}
                      onClick={() => void removeLogo()}
                    >
                      {t("settings.brandingRemoveLogo")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

              <p className="text-xs text-zinc-500">{metaLine(data)}</p>
            </div>
          ) : null
        }
      />
      <StickyActionBar>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/admin/settings"
            className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
          >
            {t("common.cancel")}
          </Link>
          <Button
            type="button"
            className="min-h-11 w-full rounded-xl text-sm font-semibold"
            disabled={putMut.isPending || isPending || isError || !data}
            onClick={() => void saveName()}
          >
            {putMut.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </StickyActionBar>
    </>
  );
}
