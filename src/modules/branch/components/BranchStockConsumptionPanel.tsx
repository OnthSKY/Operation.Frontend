"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import {
  canAdjustBranchStock,
  canConsumeBranchStock,
  canSnapshotBranchStock,
} from "@/lib/auth/permissions";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import type { Locale } from "@/i18n/messages";
import { useBranchStockConsumptions } from "@/modules/branch/hooks/useBranchStockConsumptions";
import { ConsumptionQuickEntryModal, type ConsumptionQuickEntryMode } from "./ConsumptionQuickEntryModal";
import { SnapshotEntryPanel } from "./SnapshotEntryPanel";
import { ConsumptionHistoryTable } from "./ConsumptionHistoryTable";

type Props = {
  branchId: number;
  active: boolean;
};

const PAGE_SIZE = 25;

export function BranchStockConsumptionPanel({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();

  const mayConsume = canConsumeBranchStock(user);
  const maySnapshot = canSnapshotBranchStock(user);
  const mayAdjust = canAdjustBranchStock(user);

  const [quickMode, setQuickMode] = useState<ConsumptionQuickEntryMode | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  const [page, setPage] = useState(1);
  const today = localIsoDate();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(today);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isPending, isError, error } = useBranchStockConsumptions(
    branchId,
    { dateFrom, dateTo, includeDeleted, page, pageSize: PAGE_SIZE },
    active
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {mayConsume ? (
          <Button onClick={() => setQuickMode("consume")}>
            {t("branchStockConsumption.actionQuickConsume")}
          </Button>
        ) : null}
        {maySnapshot ? (
          <Button variant="secondary" onClick={() => setSnapshotOpen(true)}>
            {t("branchStockConsumption.actionSnapshot")}
          </Button>
        ) : null}
        {mayAdjust ? (
          <Button variant="secondary" onClick={() => setQuickMode("adjust")}>
            {t("branchStockConsumption.actionAdjust")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-3">
        <FilterField label={t("branchStockConsumption.filterDateFrom")}>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || today}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </FilterField>
        <FilterField label={t("branchStockConsumption.filterDateTo")}>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={today}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </FilterField>
        {mayAdjust ? (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
              className="size-4 rounded border-zinc-300"
            />
            {t("branchStockConsumption.includeDeleted")}
          </label>
        ) : null}
      </div>

      <ConsumptionHistoryTable
        branchId={branchId}
        rows={data?.items ?? []}
        loading={isPending}
        error={isError}
        errorMessage={error}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
        canManage={mayAdjust}
        locale={locale as Locale}
      />

      <ConsumptionQuickEntryModal
        open={quickMode != null}
        onClose={() => setQuickMode(null)}
        branchId={branchId}
        mode={quickMode ?? "consume"}
      />

      <SnapshotEntryPanel
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        branchId={branchId}
      />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1")}>
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </div>
  );
}
