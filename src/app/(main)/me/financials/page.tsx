"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isDriverPortalRole, postLoginHomePath } from "@/lib/auth/roles";
import { fetchMyAttributedExpenses } from "@/modules/account/api/me-api";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_LINK, TableToolbarRow } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useI18n } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphBuilding } from "@/shared/ui/ToolbarGlyph";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function MyFinancialsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const year = useMemo(() => new Date().getFullYear(), []);
  const personnelId = user?.personnelId ?? null;
  const allowed =
    isDriverPortalRole(user?.role) && Boolean(user?.allowPersonnelSelfFinancials);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed) router.replace(postLoginHomePath(user));
  }, [isReady, user, allowed, router]);

  const advQ = useQuery({
    queryKey: ["me", "advances", personnelId, year],
    queryFn: () => fetchAdvancesByPersonnel(personnelId!, year),
    enabled: Boolean(allowed && personnelId),
  });

  const expQ = useQuery({
    queryKey: ["me", "attributed-expenses"],
    queryFn: fetchMyAttributedExpenses,
    enabled: allowed,
  });

  if (!isReady || !user || !allowed) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <PageScreenScaffold
      className="w-full min-w-0 flex-1 p-4 md:p-6"
      intro={
        <>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 md:text-2xl">
              {t("nav.myFinances")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{t("nav.tooltip.myFinances")}</p>
          </div>

          <PageWhenToUseGuide
            guideTab="portal"
            className="mt-1"
            title={t("common.pageWhenToUseTitle")}
            description={t("pageHelp.meFinancials.intro")}
            listVariant="ordered"
            items={[
              { text: t("pageHelp.meFinancials.step1") },
              { text: t("pageHelp.meFinancials.step2") },
              { text: t("pageHelp.meFinancials.step3") },
            ]}
          />
        </>
      }
      main={
        <>
          <Card className="p-4 md:p-5">
            <TableToolbarRow className="mb-3">
              <Tooltip content={t("nav.warehouse")} delayMs={200}>
                <Link
                  href="/warehouses"
                  className={TABLE_TOOLBAR_ICON_LINK}
                  aria-label={t("nav.warehouse")}
                >
                  <ToolbarGlyphBuilding className="h-5 w-5" />
                </Link>
              </Tooltip>
            </TableToolbarRow>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
          {t("nav.myFinancesAdvances")} ({year})
        </h2>
        {advQ.isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : advQ.isError ? (
          <p className="mt-3 text-sm text-red-600">{t("personnel.advanceHistoryError")}</p>
        ) : !advQ.data?.length ? (
          <p className="mt-3 text-sm text-zinc-500">{t("personnel.advanceHistoryEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {advQ.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-zinc-700">{a.advanceDate}</span>
                <span className="font-semibold text-zinc-900">
                  {formatMoneyDash(a.amount, a.currencyCode, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
          {t("nav.myFinancesExpenses")}
        </h2>
        {expQ.isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : expQ.isError ? (
          <p className="mt-3 text-sm text-red-600">{t("users.loadError")}</p>
        ) : !expQ.data?.length ? (
          <p className="mt-3 text-sm text-zinc-500">{t("personnel.detailExpensesEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {expQ.data.map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="min-w-0 text-zinc-700">
                  {x.transactionDate}{" "}
                  <span className="text-zinc-500">
                    {x.description?.trim() ? `· ${x.description.trim()}` : ""}
                  </span>
                </span>
                <span className="font-semibold text-zinc-900">
                  {formatMoneyDash(x.amount, x.currencyCode, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
          </Card>
        </>
      }
    />
  );
}
