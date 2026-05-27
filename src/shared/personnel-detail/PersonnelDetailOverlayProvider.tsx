"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchPersonnel } from "@/modules/personnel/api/personnel-api";
import {
  PersonnelDetailModal,
  type PersonnelDetailTabId,
} from "@/modules/personnel/components/PersonnelDetailModal";
import type { Personnel } from "@/types/personnel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parsePersonnelDetailTabParam,
  stripPersonnelDetailSearchParams,
} from "./personnel-detail-deep-link";

export type OpenPersonnelDetailOptions = {
  initialTab?: PersonnelDetailTabId | null;
  /** Costs sekmesinde işaretlenecek avans id (reconciliation drill-down'dan). */
  focusAdvanceId?: number | null;
  /** Costs sekmesinde işaretlenecek gider transaction id. */
  focusExpenseTransactionId?: number | null;
  /** Kasa nakit (cash physical) sekmesinde işaretlenecek handover/outflow transaction id. */
  focusCashTransactionId?: number | null;
};

type ProgrammaticOpen = {
  personnelId: number;
  initialTab: PersonnelDetailTabId;
  focusAdvanceId?: number | null;
  focusExpenseTransactionId?: number | null;
  focusCashTransactionId?: number | null;
};

export type PersonnelDetailOverlayContextValue = {
  openPersonnelDetail: (personnelId: number, options?: OpenPersonnelDetailOptions) => void;
  closePersonnelDetail: () => void;
  personnelDetailPersonnelId: number | null;
};

const PersonnelDetailOverlayContext = createContext<PersonnelDetailOverlayContextValue | null>(
  null
);

export function usePersonnelDetailOverlay(): PersonnelDetailOverlayContextValue {
  const ctx = useContext(PersonnelDetailOverlayContext);
  if (!ctx) {
    throw new Error("usePersonnelDetailOverlay must be used within PersonnelDetailOverlayProvider");
  }
  return ctx;
}

export function PersonnelDetailOverlayProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const [programmaticOpen, setProgrammaticOpen] = useState<ProgrammaticOpen | null>(null);
  const [resolvedPersonnel, setResolvedPersonnel] = useState<Personnel | null>(null);

  const { data: branches = [] } = useBranchesList();
  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  useEffect(() => {
    setProgrammaticOpen(null);
  }, [pathname]);

  const urlPersonnelId = useMemo(() => {
    const raw = searchParams.get("openPersonnel");
    if (!raw?.trim()) return null;
    const id = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [searchParams]);

  const urlInitialTab = useMemo(
    () => parsePersonnelDetailTabParam(searchParams.get("personnelTab")) ?? "profile",
    [searchParams]
  );

  const overlayPersonnelId = programmaticOpen?.personnelId ?? urlPersonnelId;

  const overlayInitialTab = useMemo(() => {
    if (programmaticOpen) {
      return programmaticOpen.initialTab;
    }
    return urlInitialTab;
  }, [programmaticOpen, urlInitialTab]);

  const closePersonnelDetail = useCallback(() => {
    setProgrammaticOpen(null);
    stripPersonnelDetailSearchParams(pathname, searchParams.toString(), (href) =>
      router.replace(href)
    );
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (overlayPersonnelId == null) {
      setResolvedPersonnel(null);
      return;
    }
    let cancelled = false;
    setResolvedPersonnel(null);
    void fetchPersonnel(overlayPersonnelId)
      .then((p) => {
        if (cancelled) return;
        setResolvedPersonnel(p);
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedPersonnel(null);
        queueMicrotask(() => {
          setProgrammaticOpen(null);
          stripPersonnelDetailSearchParams(pathname, searchParams.toString(), (href) =>
            router.replace(href)
          );
        });
      });
    return () => {
      cancelled = true;
    };
  }, [overlayPersonnelId, pathname, router, searchParams]);

  const openPersonnelDetail = useCallback(
    (personnelId: number, options?: OpenPersonnelDetailOptions) => {
      if (!Number.isFinite(personnelId) || personnelId <= 0) return;
      stripPersonnelDetailSearchParams(pathname, searchParams.toString(), (href) =>
        router.replace(href)
      );
      setProgrammaticOpen({
        personnelId,
        initialTab: options?.initialTab ?? "profile",
        focusAdvanceId: options?.focusAdvanceId ?? null,
        focusExpenseTransactionId: options?.focusExpenseTransactionId ?? null,
        focusCashTransactionId: options?.focusCashTransactionId ?? null,
      });
    },
    [pathname, router, searchParams]
  );

  const ctxValue = useMemo<PersonnelDetailOverlayContextValue>(
    () => ({
      openPersonnelDetail,
      closePersonnelDetail,
      personnelDetailPersonnelId: overlayPersonnelId,
    }),
    [openPersonnelDetail, closePersonnelDetail, overlayPersonnelId]
  );

  const modalOpen = overlayPersonnelId != null && resolvedPersonnel != null;

  return (
    <PersonnelDetailOverlayContext.Provider value={ctxValue}>
      {children}
      <PersonnelDetailModal
        open={modalOpen}
        onClose={closePersonnelDetail}
        personnel={resolvedPersonnel}
        branchNameById={branchNameById}
        initialTab={overlayInitialTab}
        focusAdvanceId={programmaticOpen?.focusAdvanceId ?? null}
        focusExpenseTransactionId={programmaticOpen?.focusExpenseTransactionId ?? null}
        focusCashTransactionId={programmaticOpen?.focusCashTransactionId ?? null}
      />
    </PersonnelDetailOverlayContext.Provider>
  );
}
