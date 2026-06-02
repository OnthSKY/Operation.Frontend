"use client";

import { ContractorDetailModal } from "@/modules/contractors/components/ContractorDetailModal";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ContractorDetailOverlayContextValue = {
  /** Dış personel (taşeron / counterparty) detayını yerinde açar. */
  openContractorDetail: (contractorId: number) => void;
  closeContractorDetail: () => void;
  contractorDetailContractorId: number | null;
};

const ContractorDetailOverlayContext =
  createContext<ContractorDetailOverlayContextValue | null>(null);

export function useContractorDetailOverlay(): ContractorDetailOverlayContextValue {
  const ctx = useContext(ContractorDetailOverlayContext);
  if (!ctx) {
    throw new Error(
      "useContractorDetailOverlay must be used within ContractorDetailOverlayProvider"
    );
  }
  return ctx;
}

export function useContractorDetailOverlayOptional(): ContractorDetailOverlayContextValue | null {
  return useContext(ContractorDetailOverlayContext);
}

export function ContractorDetailOverlayProvider({ children }: { children: ReactNode }) {
  const [contractorId, setContractorId] = useState<number | null>(null);

  const closeContractorDetail = useCallback(() => setContractorId(null), []);

  const openContractorDetail = useCallback((id: number) => {
    if (!Number.isFinite(id) || id <= 0) return;
    setContractorId(id);
  }, []);

  const ctxValue = useMemo<ContractorDetailOverlayContextValue>(
    () => ({
      openContractorDetail,
      closeContractorDetail,
      contractorDetailContractorId: contractorId,
    }),
    [openContractorDetail, closeContractorDetail, contractorId]
  );

  return (
    <ContractorDetailOverlayContext.Provider value={ctxValue}>
      {children}
      <ContractorDetailModal
        open={contractorId != null}
        contractorId={contractorId}
        onClose={closeContractorDetail}
      />
    </ContractorDetailOverlayContext.Provider>
  );
}
