"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeBranchStockConsumption } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";
import { BranchStockInboundPanel } from "./BranchStockInboundPanel";
import { BranchStockConsumptionPanel } from "./BranchStockConsumptionPanel";
import { BranchStockBalancesPanel } from "./BranchStockBalancesPanel";
import { BranchStockUsedPanel } from "./BranchStockUsedPanel";

type StockSubTabId = "inbound" | "consumption" | "balances" | "used";

type Props = {
  branchId: number;
  active?: boolean;
  /** Gelen mal (inbound) sekmesini gösterir. Şube çalışanı modunda false geçilir. */
  staffMode?: boolean;
  initialSubTab?: StockSubTabId;
};

export function BranchDetailStockTab({
  branchId,
  active = true,
  staffMode = true,
  initialSubTab,
}: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const mayConsume = canSeeBranchStockConsumption(user);

  // Görünür alt-sekmeler — sıra: Gelen mal → Kullanım & kalan → Güncel stok.
  // "Güncel stok" tüketim defterinin türevidir; consumption ile aynı yetkiye bağlı.
  const available: { id: StockSubTabId; label: string }[] = [
    ...(staffMode ? [{ id: "inbound" as const, label: t("branchStockConsumption.subTabInbound") }] : []),
    ...(mayConsume
      ? [
          { id: "consumption" as const, label: t("branchStockConsumption.subTabConsumption") },
          { id: "used" as const, label: t("branchStockConsumption.subTabUsed") },
          { id: "balances" as const, label: t("branchStockConsumption.subTabBalances") },
        ]
      : []),
  ];

  const defaultSubTab: StockSubTabId =
    initialSubTab ?? (staffMode ? "inbound" : "consumption");
  const [rawSubTab, setRawSubTab] = useState<StockSubTabId>(defaultSubTab);

  // Yetki/mod değişimi sonrası geçersiz kalan subtab'ı render esnasında düzelt — efekt-free.
  const subTab = available.some((s) => s.id === rawSubTab)
    ? rawSubTab
    : available[0]?.id ?? "consumption";

  return (
    <div className="space-y-4">
      {available.length > 1 ? (
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label={t("branchStockConsumption.subTabsAria")}
          className="-mx-1 flex w-auto min-w-0 gap-1 overflow-x-auto px-1 pb-2"
        >
          {available.map((s) => (
            <SubTabButton
              key={s.id}
              active={subTab === s.id}
              label={s.label}
              onClick={() => setRawSubTab(s.id)}
            />
          ))}
        </div>
      ) : null}

      {subTab === "inbound" && staffMode ? (
        <BranchStockInboundPanel branchId={branchId} />
      ) : null}
      {subTab === "consumption" && mayConsume ? (
        <BranchStockConsumptionPanel branchId={branchId} active={active} />
      ) : null}
      {subTab === "used" && mayConsume ? (
        <BranchStockUsedPanel branchId={branchId} active={active} />
      ) : null}
      {subTab === "balances" && mayConsume ? (
        <BranchStockBalancesPanel branchId={branchId} active={active} />
      ) : null}
    </div>
  );
}

function SubTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "min-h-[40px] shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
