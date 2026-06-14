"use client";

import { useCallback, useEffect, useState } from "react";
import { useVehicleExpenseSummary as useVehicleExpenseSummaryQuery } from "@/modules/vehicles/hooks/useVehicleQueries";

export type VehicleExpenseSummaryParams = {
  year?: number;
  month?: number;
  vehicleId?: number;
  branchId?: number;
};

/**
 * Araç gider özet raporu (Costs tab → Report sub-tab) için filtre durumu +
 * summary query yönetimi.
 *
 *  - 4 filtre input'u (sumYear/sumMonth/sumVehicleId/sumBranchId)
 *  - `applyFilters()`: input → query params'a aktarır
 *  - Tab/altsekme costs/report değilse params null → query disabled
 *  - Costs/report tab'ına girince mevcut araç + bu yılla otomatik doldurur
 *  - `summaryRows`/`summaryPending` döndürür
 */
export function useVehicleExpenseSummary({
  detailId,
  active,
  canEdit,
}: {
  /** Detaydaki araç id (yoksa null). */
  detailId: number | null;
  /** Costs/report tab aktif mi (auto-fill + query enable için). */
  active: boolean;
  /** Yetki (`useVehicleExpenseSummary` query enable koşulu). */
  canEdit: boolean;
}) {
  const [sumYear, setSumYear] = useState(String(new Date().getFullYear()));
  const [sumMonth, setSumMonth] = useState("");
  const [sumVehicleId, setSumVehicleId] = useState("");
  const [sumBranchId, setSumBranchId] = useState("");
  const [params, setParams] = useState<VehicleExpenseSummaryParams | null>(
    null,
  );

  const applyFilters = useCallback(() => {
    const y = sumYear.trim() ? parseInt(sumYear, 10) : undefined;
    const m = sumMonth.trim() ? parseInt(sumMonth, 10) : undefined;
    const vid = sumVehicleId.trim() ? parseInt(sumVehicleId, 10) : undefined;
    const bid = sumBranchId.trim() ? parseInt(sumBranchId, 10) : undefined;
    setParams({
      year: y != null && Number.isFinite(y) ? y : undefined,
      month:
        m != null && Number.isFinite(m) && m >= 1 && m <= 12 ? m : undefined,
      vehicleId: vid != null && Number.isFinite(vid) ? vid : undefined,
      branchId: bid != null && Number.isFinite(bid) ? bid : undefined,
    });
  }, [sumYear, sumMonth, sumVehicleId, sumBranchId]);

  // Tab açılış/çıkışında auto-fill ve sıfırlama.
  useEffect(() => {
    if (!active || detailId == null) {
      setParams(null);
      return;
    }
    const y = new Date().getFullYear();
    setSumYear(String(y));
    setSumMonth("");
    setSumVehicleId(String(detailId));
    setSumBranchId("");
    setParams({
      year: y,
      month: undefined,
      vehicleId: detailId,
      branchId: undefined,
    });
  }, [active, detailId]);

  const queryEnabled =
    canEdit && active && detailId != null && params != null;
  const { data: summaryRows = [], isPending: summaryPending } =
    useVehicleExpenseSummaryQuery(params ?? {}, queryEnabled);

  return {
    sumYear,
    setSumYear,
    sumMonth,
    setSumMonth,
    sumVehicleId,
    setSumVehicleId,
    sumBranchId,
    setSumBranchId,
    params,
    applyFilters,
    summaryRows,
    summaryPending,
    queryEnabled,
  };
}

export type VehicleExpenseSummaryState = ReturnType<
  typeof useVehicleExpenseSummary
>;
