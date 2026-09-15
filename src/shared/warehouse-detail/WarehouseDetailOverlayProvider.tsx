"use client";

import { WarehouseDetailModal } from "@/modules/warehouse/components/WarehouseDetailModal";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OpenWarehouseDetailOptions = {
  initialTab?: "history" | null;
  openMovementId?: number | null;
  /** History sekmesi açılırken uygulanacak tür/şube filtresi ön-ayarı (ör. şube stok panelinden). */
  historyType?: "IN" | "OUT" | "ALL" | null;
  historyBranchId?: number | null;
  /** Başka bir modalın üstünde açılırken true (varsayılan: true). */
  nested?: boolean;
};

type OverlayOpen = {
  warehouseId: number;
  initialTab: "history" | null;
  openMovementId: number | null;
  historyType: "IN" | "OUT" | "ALL" | null;
  historyBranchId: number | null;
  nested: boolean;
};

export type WarehouseDetailOverlayContextValue = {
  openWarehouseDetail: (warehouseId: number, options?: OpenWarehouseDetailOptions) => void;
  closeWarehouseDetail: () => void;
  warehouseDetailWarehouseId: number | null;
};

const WarehouseDetailOverlayContext = createContext<WarehouseDetailOverlayContextValue | null>(
  null
);

export function useWarehouseDetailOverlay(): WarehouseDetailOverlayContextValue {
  const ctx = useContext(WarehouseDetailOverlayContext);
  if (!ctx) {
    throw new Error(
      "useWarehouseDetailOverlay must be used within WarehouseDetailOverlayProvider"
    );
  }
  return ctx;
}

export function useWarehouseDetailOverlayOptional(): WarehouseDetailOverlayContextValue | null {
  return useContext(WarehouseDetailOverlayContext);
}

export function WarehouseDetailOverlayProvider({ children }: { children: ReactNode }) {
  const [overlayOpen, setOverlayOpen] = useState<OverlayOpen | null>(null);

  const closeWarehouseDetail = useCallback(() => {
    setOverlayOpen(null);
  }, []);

  const openWarehouseDetail = useCallback(
    (warehouseId: number, options?: OpenWarehouseDetailOptions) => {
      if (!Number.isFinite(warehouseId) || warehouseId <= 0) return;
      setOverlayOpen({
        warehouseId,
        initialTab: options?.initialTab ?? null,
        openMovementId:
          options?.openMovementId != null &&
          Number.isFinite(options.openMovementId) &&
          options.openMovementId > 0
            ? options.openMovementId
            : null,
        historyType: options?.historyType ?? null,
        historyBranchId:
          options?.historyBranchId != null &&
          Number.isFinite(options.historyBranchId) &&
          options.historyBranchId > 0
            ? options.historyBranchId
            : null,
        nested: options?.nested !== false,
      });
    },
    []
  );

  const ctxValue = useMemo<WarehouseDetailOverlayContextValue>(
    () => ({
      openWarehouseDetail,
      closeWarehouseDetail,
      warehouseDetailWarehouseId: overlayOpen?.warehouseId ?? null,
    }),
    [openWarehouseDetail, closeWarehouseDetail, overlayOpen?.warehouseId]
  );

  return (
    <WarehouseDetailOverlayContext.Provider value={ctxValue}>
      {children}
      {overlayOpen ? (
        <WarehouseDetailModal
          open
          nested={overlayOpen.nested}
          warehouseId={overlayOpen.warehouseId}
          initialTabIntent={overlayOpen.initialTab}
          openMovementIdIntent={overlayOpen.openMovementId}
          initialHistoryType={overlayOpen.historyType}
          initialHistoryBranchId={overlayOpen.historyBranchId}
          onClose={closeWarehouseDetail}
        />
      ) : null}
    </WarehouseDetailOverlayContext.Provider>
  );
}
