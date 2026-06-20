"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useBranchConsumedTotals } from "@/modules/branch/hooks/useBranchStockConsumptions";

type Props = {
  branchId: number;
  active: boolean;
};

type UsedLeaf = {
  productId: number;
  productName: string;
  productUnit: string | null;
  total: number;
};

type UsedGroup = {
  key: string;
  isGroup: boolean;
  name: string;
  total: number;
  unit: string | null;
  children: UsedLeaf[];
};

/**
 * Kullanılan ürünler — ürün bazlı toplam tüketim (type=CONSUMPTION, OUT). Ana ürün altında alt ürünler
 * gruplanır, başlıkta ana ürünün toplam kullanımı görünür. Salt-okunur, responsive/mobil öncelikli.
 */
export function BranchStockUsedPanel({ branchId, active }: Props) {
  const { t } = useI18n();
  const { data, isPending, isError, error } = useBranchConsumedTotals(branchId, undefined, active);

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groups = useMemo<UsedGroup[]>(() => {
    const all = data ?? [];
    const q = search.trim().toLocaleLowerCase("tr");
    const filtered = q
      ? all.filter(
          (r) =>
            r.productName.toLocaleLowerCase("tr").includes(q) ||
            (r.parentProductName?.toLocaleLowerCase("tr").includes(q) ?? false)
        )
      : all;

    const byParent = new Map<number, { parentId: number; parentName: string; children: UsedLeaf[] }>();
    const standalone: UsedLeaf[] = [];

    for (const r of filtered) {
      const leaf: UsedLeaf = {
        productId: r.productId,
        productName: r.productName,
        productUnit: r.productUnit,
        total: r.totalConsumed,
      };
      if (r.parentProductId != null) {
        const g = byParent.get(r.parentProductId);
        if (g) g.children.push(leaf);
        else
          byParent.set(r.parentProductId, {
            parentId: r.parentProductId,
            parentName: r.parentProductName ?? r.productName,
            children: [leaf],
          });
      } else {
        standalone.push(leaf);
      }
    }

    const result: UsedGroup[] = [];
    for (const g of byParent.values()) {
      const total = g.children.reduce((sum, c) => sum + c.total, 0);
      const units = new Set(g.children.map((c) => c.productUnit ?? ""));
      const unit = units.size === 1 ? g.children[0]?.productUnit ?? null : null;
      result.push({ key: `p-${g.parentId}`, isGroup: true, name: g.parentName, total, unit, children: g.children });
    }
    for (const r of standalone) {
      result.push({
        key: `u-${r.productId}`,
        isGroup: false,
        name: r.productName,
        total: r.total,
        unit: r.productUnit ?? null,
        children: [r],
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return result;
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">{t("branchStockConsumption.usedHeading")}</h3>
        <p className="text-xs leading-relaxed text-zinc-500">{t("branchStockConsumption.usedHint")}</p>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("branchStockConsumption.searchPlaceholder")}
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
          {toErrorMessage(error) || t("branchStockConsumption.loadFailed")}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.usedEmpty")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesSearchEmpty")}</p>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) =>
            g.isGroup ? (
              <UsedGroupCard
                key={g.key}
                group={g}
                open={!collapsed.has(g.key)}
                onToggle={() => toggleGroup(g.key)}
                t={t}
              />
            ) : (
              <div
                key={g.key}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-sm sm:px-4"
              >
                <span className="truncate text-sm font-medium text-zinc-900 sm:text-base">{g.name}</span>
                <span className="shrink-0 text-base font-bold tabular-nums text-zinc-900">
                  {g.total}
                  {g.unit ? <span className="ml-1 text-xs font-medium text-zinc-400">{g.unit}</span> : null}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function UsedGroupCard({
  group,
  open,
  onToggle,
  t,
}: {
  group: UsedGroup;
  open: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-zinc-50 sm:px-4"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900 sm:text-base">{group.name}</span>
          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
            {group.children.length}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-base font-bold tabular-nums text-zinc-900 sm:text-lg">
            {group.total}
            {group.unit ? <span className="ml-1 text-xs font-medium text-zinc-400">{group.unit}</span> : null}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {t("branchStockConsumption.usedGroupTotal")}
          </span>
        </div>
      </button>

      {open ? (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
          {group.children.map((r) => (
            <li
              key={r.productId}
              className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2.5 pl-10 sm:px-4 sm:pl-12"
            >
              <span className="truncate text-sm font-medium text-zinc-700">{r.productName}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                {r.total}
                {r.productUnit ? <span className="ml-1 text-xs font-normal text-zinc-400">{r.productUnit}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
