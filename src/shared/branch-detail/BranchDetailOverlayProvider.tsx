"use client";

import { fetchBranches } from "@/modules/branch/api/branches-api";
import { BranchDetailSheet } from "@/modules/branch/components/BranchDetailSheet";
import { EditBranchModal } from "@/modules/branch/components/EditBranchModal";
import {
  parseBranchDetailTabParam,
  type BranchDetailTabId,
} from "@/modules/branch/lib/branch-detail-tab";
import { parseRegisterDaySearchParam } from "@/modules/branch/lib/register-day-search-param";
import { stripBranchDetailSearchParams } from "@/shared/branch-detail/branch-detail-deep-link";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermissionCode, PERM } from "@/lib/auth/permissions";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
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

export type OpenBranchDetailOptions = {
  initialTab?: BranchDetailTabId | null;
  initialRegisterDay?: string | null;
};

type ProgrammaticOpen = {
  branchId: number;
  initialTab?: BranchDetailTabId | null;
  initialRegisterDay?: string | null;
};

export type BranchDetailOverlayContextValue = {
  openBranchDetail: (branchId: number, options?: OpenBranchDetailOptions) => void;
  closeBranchDetail: () => void;
  branchDetailBranchId: number | null;
};

const BranchDetailOverlayContext = createContext<BranchDetailOverlayContextValue | null>(null);

export function useBranchDetailOverlay(): BranchDetailOverlayContextValue {
  const ctx = useContext(BranchDetailOverlayContext);
  if (!ctx) {
    throw new Error("useBranchDetailOverlay must be used within BranchDetailOverlayProvider");
  }
  return ctx;
}

/** Modallar / paylaşılan bileşenler: sağlayıcı yoksa `null` (ağaç dışı veya test) — `router` ile yedeklenebilir. */
export function useBranchDetailOverlayOptional(): BranchDetailOverlayContextValue | null {
  return useContext(BranchDetailOverlayContext);
}

export function BranchDetailOverlayProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const branchDayClerkMode = Boolean(
    user &&
      hasPermissionCode(user, PERM.uiBranchDayClerk) &&
      !hasPermissionCode(user, PERM.uiBranches)
  );
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const [programmaticOpen, setProgrammaticOpen] = useState<ProgrammaticOpen | null>(null);
  const [resolvedBranch, setResolvedBranch] = useState<Branch | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    !personnelPortal
  );
  const personnel = useMemo(() => personnelListResult?.items ?? [], [personnelListResult]);

  useEffect(() => {
    setProgrammaticOpen(null);
  }, [pathname]);

  const urlBranchId = useMemo(() => {
    const raw = searchParams.get("openBranch");
    if (!raw?.trim()) return null;
    const id = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [searchParams]);

  const urlInitialTab = useMemo(
    () => parseBranchDetailTabParam(searchParams.get("branchTab")),
    [searchParams]
  );

  const urlRegisterDay = useMemo(
    () => parseRegisterDaySearchParam(searchParams.get("registerDay")),
    [searchParams]
  );

  const overlayBranchId = programmaticOpen?.branchId ?? urlBranchId;

  const overlayInitialTab = useMemo(() => {
    if (programmaticOpen) {
      return programmaticOpen.initialTab ?? null;
    }
    return urlInitialTab;
  }, [programmaticOpen, urlInitialTab]);

  const overlayRegisterDay = useMemo(() => {
    if (programmaticOpen) {
      return programmaticOpen.initialRegisterDay ?? null;
    }
    return urlRegisterDay;
  }, [programmaticOpen, urlRegisterDay]);

  const closeBranchDetail = useCallback(() => {
    setProgrammaticOpen(null);
    setEditOpen(false);
    stripBranchDetailSearchParams(pathname, searchParams.toString(), (href) =>
      router.replace(href)
    );
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (overlayBranchId == null) {
      setResolvedBranch(null);
      setEditOpen(false);
      return;
    }
    let cancelled = false;
    void fetchBranches().then((all) => {
      if (cancelled) return;
      const b = all.find((x) => x.id === overlayBranchId) ?? null;
      setResolvedBranch(b);
      if (!b) {
        queueMicrotask(() => {
          setProgrammaticOpen(null);
          stripBranchDetailSearchParams(pathname, searchParams.toString(), (href) =>
            router.replace(href)
          );
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [overlayBranchId, pathname, router, searchParams]);

  const staff = useMemo(() => {
    if (overlayBranchId == null) return [];
    return personnel.filter((p) => p.branchId === overlayBranchId);
  }, [personnel, overlayBranchId]);

  const openBranchDetail = useCallback(
    (branchId: number, options?: OpenBranchDetailOptions) => {
      if (!Number.isFinite(branchId) || branchId <= 0) return;
      stripBranchDetailSearchParams(pathname, searchParams.toString(), (href) =>
        router.replace(href)
      );
      setProgrammaticOpen({
        branchId,
        initialTab: options?.initialTab ?? null,
        initialRegisterDay: options?.initialRegisterDay ?? null,
      });
    },
    [pathname, router, searchParams]
  );

  const ctxValue = useMemo<BranchDetailOverlayContextValue>(
    () => ({
      openBranchDetail,
      closeBranchDetail,
      branchDetailBranchId: overlayBranchId,
    }),
    [openBranchDetail, closeBranchDetail, overlayBranchId]
  );

  const sheetOpen = overlayBranchId != null && resolvedBranch != null;

  return (
    <BranchDetailOverlayContext.Provider value={ctxValue}>
      {children}
      {sheetOpen ? (
        <BranchDetailSheet
          open
          branch={resolvedBranch}
          staff={staff}
          employeeSelfService={personnelPortal}
          branchDayClerkMode={branchDayClerkMode}
          initialTab={overlayInitialTab}
          initialRegisterDay={overlayRegisterDay}
          canEditBranch={!personnelPortal && !branchDayClerkMode}
          onEditBranch={
            !personnelPortal
              ? () => {
                  setEditOpen(true);
                }
              : undefined
          }
          onClose={closeBranchDetail}
        />
      ) : null}
      {!personnelPortal ? (
        <EditBranchModal
          open={editOpen && resolvedBranch != null}
          branch={resolvedBranch}
          staff={personnel}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </BranchDetailOverlayContext.Provider>
  );
}
