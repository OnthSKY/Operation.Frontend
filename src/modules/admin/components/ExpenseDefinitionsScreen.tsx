"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { useExpenseDefinitionsQuery } from "@/modules/admin/hooks/useExpenseDefinitionsQuery";
import { useI18n } from "@/i18n/context";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { ExpenseDefinition, ExpenseDefinitionGroup } from "@/types/expense-definition";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

type ExpenseDefinitionsScreenProps = {
  group: ExpenseDefinitionGroup;
  /** settings i18n başlık anahtarı */
  titleKey: string;
  /** settings i18n açıklama anahtarı */
  descriptionKey: string;
  /**
   * "cost-sections": cost_behavior'a göre Sabit/Değişken/Demirbaş bölümleri + Operasyon/Yatırım tag'i (şube gideri).
   * "flat": tek düz liste (personel gider türleri).
   */
  variant: "cost-sections" | "flat";
};

const COST_BEHAVIOR_LABEL_KEY: Record<string, string> = {
  FIXED: "settings.expenseDefsCostFixed",
  VARIABLE: "settings.expenseDefsCostVariable",
  CAPEX: "settings.expenseDefsCostCapex",
  NONE: "settings.expenseDefsCostNone",
};

/** cost_behavior bölüm sırası (şube gideri). */
const COST_SECTION_ORDER = ["FIXED", "VARIABLE", "CAPEX"];

/** Kod önekinden gider ailesi: yatırım (CAPEX) veya operasyon. */
function expenseFamily(code: string): "capex" | "ops" {
  return code.startsWith("OUT_CAPEX_") ? "capex" : "ops";
}

export function ExpenseDefinitionsScreen({
  group,
  titleKey,
  descriptionKey,
  variant,
}: ExpenseDefinitionsScreenProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const canView = hasPermissionCode(user, PERM.systemAdmin);
  const { data = [], isPending, isError, error, refetch } = useExpenseDefinitionsQuery(
    group,
    canView
  );

  useEffect(() => {
    if (isReady && user && !canView) router.replace("/personnel");
  }, [isReady, user, canView, router]);

  const name = (row: ExpenseDefinition) => (locale === "tr" ? row.nameTr : row.nameEn);
  const costLabel = (behavior: string) => {
    const key = COST_BEHAVIOR_LABEL_KEY[behavior];
    return key ? t(key) : behavior;
  };
  const familyLabel = (code: string) =>
    expenseFamily(code) === "capex"
      ? t("settings.expenseDefsFamilyCapex")
      : t("settings.expenseDefsFamilyOps");

  // cost_behavior'a göre bölümler (yalnızca cost-sections varyantında).
  const sections = useMemo(() => {
    if (variant !== "cost-sections") return [];
    const byBehavior = new Map<string, ExpenseDefinition[]>();
    for (const row of data) {
      const arr = byBehavior.get(row.costBehavior);
      if (arr) arr.push(row);
      else byBehavior.set(row.costBehavior, [row]);
    }
    const keys = [
      ...COST_SECTION_ORDER.filter((b) => byBehavior.has(b)),
      ...[...byBehavior.keys()].filter((b) => !COST_SECTION_ORDER.includes(b)),
    ];
    return keys.map((behavior) => ({ behavior, items: byBehavior.get(behavior)! }));
  }, [data, variant]);

  if (!isReady || !user || !canView) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  const renderRow = (row: ExpenseDefinition, showFamily: boolean) => (
    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-900">{name(row)}</span>
          {showFamily ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                expenseFamily(row.code) === "capex"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-sky-100 text-sky-800"
              }`}
            >
              {familyLabel(row.code)}
            </span>
          ) : null}
          {!row.isPnlRelevant ? (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
              {t("settings.expenseDefsBadgeArchived")}
            </span>
          ) : null}
        </div>
      </div>
      <code className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{row.code}</code>
    </li>
  );

  return (
    <PageScreenScaffold
      variant="form"
      className="w-full pt-2 sm:pt-4"
      top={
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
        >
          ← {t("settings.backToSettings")}
        </Link>
      }
      intro={
        <div className="min-w-0">
          <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
            {t(titleKey)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            {t(descriptionKey)}
          </p>
        </div>
      }
      main={
        isPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
            <p className="break-words leading-relaxed">{toErrorMessage(error)}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold underline"
              onClick={() => void refetch()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("settings.expenseDefsEmpty")}</p>
        ) : variant === "cost-sections" ? (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <section
                key={section.behavior}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-zinc-800">
                    {costLabel(section.behavior)}
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums">
                    {section.items.length}
                  </span>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {section.items.map((row) => renderRow(row, true))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-800">{t(titleKey)}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums">
                {data.length}
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {data.map((row) => renderRow(row, false))}
            </ul>
          </section>
        )
      }
    />
  );
}
