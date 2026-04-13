"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import type { UpdateTourismSeasonClosedPolicyBody } from "@/modules/admin/api/tourism-season-closed-policy-api";
import {
  useTourismSeasonClosedPolicyQuery,
  useUpdateTourismSeasonClosedPolicyMutation,
} from "@/modules/admin/hooks/useTourismSeasonClosedPolicyQuery";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { Switch } from "@/shared/ui/Switch";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  listTourismSeasonPolicyWarningIds,
  tourismSeasonPolicyWarningI18nKey,
} from "@/modules/admin/lib/tourism-season-closed-policy-warnings";

export function TourismSeasonClosedPolicyScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { data, isPending, isError, error, refetch } = useTourismSeasonClosedPolicyQuery(
    Boolean(user && user.role === "ADMIN")
  );
  const mut = useUpdateTourismSeasonClosedPolicyMutation();

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

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

  const save = async (patch: UpdateTourismSeasonClosedPolicyBody) => {
    try {
      await mut.mutateAsync(patch);
      notify.success(t("settings.tourismSeasonSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const rows: {
    key: keyof UpdateTourismSeasonClosedPolicyBody;
    title: string;
    desc: string;
  }[] = [
    {
      key: "allowRegisterIncomeWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowRegisterIncome"),
      desc: t("settings.tourismSeasonAllowRegisterIncomeDesc"),
    },
    {
      key: "allowRegisterPersonnelExpenseWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowPersonnelExpense"),
      desc: t("settings.tourismSeasonAllowPersonnelExpenseDesc"),
    },
    {
      key: "allowRegisterPocketRepayExpenseWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowPocketRepay"),
      desc: t("settings.tourismSeasonAllowPocketRepayDesc"),
    },
    {
      key: "allowRegisterOtherExpenseWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowOtherExpense"),
      desc: t("settings.tourismSeasonAllowOtherExpenseDesc"),
    },
    {
      key: "allowAdvanceBranchCashWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowAdvanceBranchCash"),
      desc: t("settings.tourismSeasonAllowAdvanceBranchCashDesc"),
    },
    {
      key: "allowSupplierBranchAllocationPostWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowSupplierPost"),
      desc: t("settings.tourismSeasonAllowSupplierPostDesc"),
    },
    {
      key: "allowGeneralOverheadAllocateWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowGeneralOverhead"),
      desc: t("settings.tourismSeasonAllowGeneralOverheadDesc"),
    },
    {
      key: "allowVehicleBranchExpenseWhenSeasonClosed",
      title: t("settings.tourismSeasonAllowVehicleExpense"),
      desc: t("settings.tourismSeasonAllowVehicleExpenseDesc"),
    },
  ];

  const policyWarnings = useMemo(
    () => (data ? listTourismSeasonPolicyWarningIds(data) : []),
    [data]
  );

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-h-0 min-w-0 app-page-max flex-1 flex-col gap-5 sm:gap-6",
        "max-md:pt-2 md:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-8"
      )}
    >
      <div className="min-w-0">
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
        >
          ← {t("settings.backToSettings")}
        </Link>
        <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
          {t("settings.tourismSeasonPageTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
          {t("settings.tourismSeasonPageDescription")}
        </p>
      </div>

      <PageWhenToUseGuide
        guideTab="admin"
        title={t("common.pageWhenToUseTitle")}
        description={t("pageHelp.settingsTourismSeason.intro")}
        listVariant="ordered"
        items={[
          { text: t("pageHelp.settingsTourismSeason.step1") },
          { text: t("pageHelp.settingsTourismSeason.step2") },
          {
            text: t("pageHelp.settingsTourismSeason.step3"),
            link: { href: "/branches", label: t("pageHelp.settingsTourismSeason.step3Link") },
          },
        ]}
      />

      {isPending ? (
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
      ) : (
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          {policyWarnings.length > 0 ? (
            <div
              className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 sm:px-5"
              role="status"
            >
              <p className="font-semibold leading-snug text-amber-950">
                {t("settings.tourismSeasonWarningsTitle")}
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-amber-900/95 sm:text-sm">
                {policyWarnings.map((id) => (
                  <li key={id}>{t(tourismSeasonPolicyWarningI18nKey(id))}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Card className="overflow-hidden !p-0">
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">
                {t("settings.tourismSeasonSectionFlows")}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                {t("settings.tourismSeasonSectionFlowsHint")}
              </p>
            </div>

            <ul className="flex flex-col divide-y divide-zinc-100">
              {rows.map((row) => {
                const checked = Boolean(data?.[row.key]);
                return (
                  <li key={row.key} className={cn(mut.isPending && "pointer-events-none opacity-60")}>
                    <label className="flex min-h-[3.25rem] cursor-pointer gap-3 px-4 py-4 active:bg-zinc-50 sm:min-h-0 sm:items-center sm:px-5 sm:py-4">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-zinc-900">
                          {row.title}
                        </span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-zinc-600 sm:text-sm">
                          {row.desc}
                        </span>
                      </span>
                      <Switch
                        checked={checked}
                        disabled={mut.isPending}
                        onCheckedChange={(next) => void save({ [row.key]: next })}
                        className="self-start sm:self-center"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>

            <p className="border-t border-zinc-100 px-4 py-3 text-[11px] leading-relaxed text-zinc-400 sm:px-5">
              {data?.updatedAtUtc
                ? `${t("settings.tourismSeasonLastSaved")} ${formatLocaleDateTime(data.updatedAtUtc, locale)}`
                : t("settings.tourismSeasonNeverUpdated")}
            </p>
          </Card>

          <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{t("settings.tourismSeasonDefaultsNote")}</p>
        </div>
      )}
    </div>
  );
}
