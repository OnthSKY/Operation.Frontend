"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useBranchProductBalances } from "@/modules/branch/hooks/useBranchStockConsumptions";

type Props = {
  branchId: number;
  active: boolean;
};

/**
 * Güncel stok (anlık bakiye) görünümü — depodan-gelen (inbound) ve düşüm-girişinden ayrı, salt-okunur.
 * Mevcut `useBranchProductBalances` ile beslenir (ekstra backend yok). Backend yalnız bakiyesi
 * sıfır olmayan ürünleri döner.
 */
export function BranchStockBalancesPanel({ branchId, active }: Props) {
  const { t } = useI18n();
  const { data, isPending, isError, error } = useBranchProductBalances(branchId, undefined, active);

  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLocaleLowerCase("tr");
    if (!q) return all;
    return all.filter((r) => r.productName.toLocaleLowerCase("tr").includes(q));
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("branchStockConsumption.balancesHeading")}
        </h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("branchStockConsumption.balancesHint")}
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("branchStockConsumption.searchPlaceholder")}
        className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
      />

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
          {toErrorMessage(error) || t("branchStockConsumption.loadFailed")}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesEmpty")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesSearchEmpty")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t("branchStockConsumption.colProduct")}</TableHeader>
              <TableHeader>{t("branchStockConsumption.balancesColUnit")}</TableHeader>
              <TableHeader className="text-right">
                {t("branchStockConsumption.balancesColBalance")}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell dataLabel={t("branchStockConsumption.colProduct")}>
                  <span className="font-medium text-zinc-900">{r.productName}</span>
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.balancesColUnit")}>
                  <span className="text-xs text-zinc-600">{r.productUnit ?? "—"}</span>
                </TableCell>
                <TableCell
                  dataLabel={t("branchStockConsumption.balancesColBalance")}
                  className="text-right font-semibold tabular-nums text-zinc-900"
                >
                  {r.balance}
                  {r.productUnit ? (
                    <span className="ml-1 text-xs font-normal text-zinc-500">{r.productUnit}</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
