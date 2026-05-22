"use client";

import { personnelLabelFromMap } from "@/modules/personnel/lib/held-register-personnel-label";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";
import { buildPersonnelDetailHref } from "@/shared/personnel-detail/personnel-detail-deep-link";
import type { Personnel } from "@/types/personnel";
import Link from "next/link";

type Props = {
  personnelId: number | null | undefined;
  fullName?: string | null;
  personnelById: Map<number, Personnel>;
  dash: string;
  /** Kasa nakit sekmesine açılsın mı */
  openCashPhysicalTab?: boolean;
  className?: string;
};

export function PersonnelHeldRegisterPersonLink({
  personnelId,
  fullName,
  personnelById,
  dash,
  openCashPhysicalTab = false,
  className = "font-medium text-sky-800 underline-offset-2 hover:underline",
}: Props) {
  const { openPersonnelDetail } = usePersonnelDetailOverlay();
  const label = personnelLabelFromMap(personnelId, fullName, personnelById, dash);
  const id = personnelId != null && personnelId > 0 ? personnelId : null;

  if (id == null) {
    return <span className={className}>{label}</span>;
  }

  const tab = openCashPhysicalTab ? ("personnelCashPhysical" as const) : undefined;

  return (
    <Link
      href={buildPersonnelDetailHref(id, { tab })}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openPersonnelDetail(id, { initialTab: tab ?? undefined });
      }}
    >
      {label}
    </Link>
  );
}
