"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { fetchPersonnelManagementSnapshot } from "@/modules/personnel/api/personnel-api";
import { personnelKeys } from "@/modules/personnel/hooks/usePersonnelQueries";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type Props = {
  personnelId: number;
  currencyCode: string;
  className?: string;
};

/** Personel listesinde kasa devri (IN kalan havuz) — avans/gider özetinden ayrı. */
export function PersonnelListCashHandoverPoolLine({
  personnelId,
  currencyCode,
  className,
}: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const ccy = currencyCode.trim().toUpperCase() || "TRY";
  const { data, isPending, isError } = useQuery({
    queryKey: personnelKeys.managementSnapshot(personnelId),
    queryFn: () => fetchPersonnelManagementSnapshot(personnelId),
    enabled: personnelId > 0,
    staleTime: 60_000,
  });

  const total = useMemo(() => {
    if (!data?.cashHandoverPoolRemainingByBranch?.length) return 0;
    return data.cashHandoverPoolRemainingByBranch
      .filter((r) => r.currencyCode.trim().toUpperCase() === ccy)
      .reduce((s, r) => s + (Number(r.totalRemainingHandover) || 0), 0);
  }, [data, ccy]);

  if (isPending) {
    return (
      <p className={cn(className)} aria-busy="true">
        <span className="text-zinc-400">{t("personnel.listCashHandoverPoolLoading")}</span>
      </p>
    );
  }
  if (isError) {
    return (
      <p className={cn("text-amber-800", className)} role="alert">
        {t("personnel.listCashHandoverPoolError")}
      </p>
    );
  }
  if (total <= 0.009) return null;

  return (
    <p className={cn(className)}>
      <span className="text-zinc-500">{t("personnel.listCashHandoverPoolLabel")} </span>
      <span className="font-semibold tabular-nums text-emerald-900">
        {formatMoneyDash(total, dash, locale, ccy)}
      </span>
    </p>
  );
}
