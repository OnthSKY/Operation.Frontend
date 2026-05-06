"use client";

import type { BranchDetailTabId } from "@/modules/branch/lib/branch-detail-tab";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { buildBranchDetailHref, shouldUseDefaultLinkNavigation } from "./branch-detail-deep-link";
import { useBranchDetailOverlay } from "./BranchDetailOverlayProvider";
import type { OpenBranchDetailOptions } from "./BranchDetailOverlayProvider";

type Props = {
  branchId: number;
  initialTab?: BranchDetailTabId | null;
  initialRegisterDay?: string | null;
  className?: string;
  children: ReactNode;
};

export function BranchDetailHrefLink({
  branchId,
  initialTab,
  initialRegisterDay,
  className,
  children,
}: Props) {
  const { openBranchDetail } = useBranchDetailOverlay();
  const href = useMemo(
    () =>
      buildBranchDetailHref(branchId, {
        tab: initialTab ?? undefined,
        registerDay: initialRegisterDay ?? undefined,
      }),
    [branchId, initialTab, initialRegisterDay]
  );

  const opts = useMemo<OpenBranchDetailOptions | undefined>(() => {
    if (initialTab == null && (initialRegisterDay == null || !initialRegisterDay.trim())) {
      return undefined;
    }
    return { initialTab: initialTab ?? null, initialRegisterDay: initialRegisterDay ?? null };
  }, [initialTab, initialRegisterDay]);

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (shouldUseDefaultLinkNavigation(e)) return;
        e.preventDefault();
        openBranchDetail(branchId, opts);
      }}
    >
      {children}
    </Link>
  );
}
