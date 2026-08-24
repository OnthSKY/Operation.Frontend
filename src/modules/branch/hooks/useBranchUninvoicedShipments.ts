"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchBranchUninvoicedShipments,
  type BranchUninvoicedShipmentLine,
} from "@/modules/order-account-statement/api/outbound-invoices-api";

export type BranchUninvoicedShipmentsSummary = {
  lines: BranchUninvoicedShipmentLine[];
  /** Faturalanmamış (kalanı > 0) satır sayısı. */
  lineCount: number;
  /** Ayrı sevkiyat sayısı (movement_batch_id yoksa hareket id'sine düşer). */
  shipmentCount: number;
  totalRemainingQuantity: number;
};

function summarize(lines: BranchUninvoicedShipmentLine[]): BranchUninvoicedShipmentsSummary {
  const batches = new Set<string>();
  let totalRemainingQuantity = 0;
  for (const l of lines) {
    batches.add(l.movementBatchId ?? `wm-${l.warehouseMovementId}`);
    totalRemainingQuantity += l.remainingQuantity;
  }
  return {
    lines,
    lineCount: lines.length,
    shipmentCount: batches.size,
    totalRemainingQuantity,
  };
}

/**
 * Bir şubeye gelen faturalandırılmamış sevkiyatları çeker. Cari Hesap tab'ında hem sekme rozeti
 * (BranchDetailTabs) hem de uyarı banner'ı (BranchDetailCurrentAccountTab) tarafından kullanılır;
 * React Query aynı anahtarı paylaştığı için tek istek atılır.
 */
export function useBranchUninvoicedShipments(branchId: number, enabled = true) {
  const query = useQuery({
    queryKey: ["branch-uninvoiced-shipments", branchId],
    queryFn: () => fetchBranchUninvoicedShipments(branchId),
    enabled: enabled && Number.isFinite(branchId) && branchId > 0,
    staleTime: 30_000,
  });
  const summary = summarize(query.data ?? []);
  return { ...query, summary };
}
