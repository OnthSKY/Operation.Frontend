"use client";

import { BranchStockInboundPanel } from "./BranchStockInboundPanel";

export function BranchDetailStockTab({ branchId }: { branchId: number }) {
  return <BranchStockInboundPanel branchId={branchId} />;
}
