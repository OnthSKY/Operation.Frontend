"use client";

import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "@/modules/branch/components/BranchQuickActionsMenu";
import { vehiclePhotoUrl } from "@/modules/vehicles/api/vehicles-api";
import { vehicleListStatusTone } from "@/modules/vehicles/lib/vehicle-status-display";
import { cn } from "@/lib/cn";
import type { VehicleInsuranceBadge, VehicleListItem } from "@/types/vehicle";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, EyeIcon, PencilIcon } from "@/shared/ui/EyeIcon";
import { Tooltip } from "@/shared/ui/Tooltip";
import {
  Building2,
  CalendarDays,
  CarFront,
  Factory,
  Gauge,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

function formatFleetKm(km: number | null | undefined, locale: string): string {
  if (km == null) return "—";
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(km);
}

function insuranceIconClass(b: VehicleInsuranceBadge): string {
  switch (b) {
    case "EXPIRED":
      return "text-red-500";
    case "SOON":
      return "text-amber-500";
    case "OK":
      return "text-emerald-500";
    default:
      return "text-zinc-400";
  }
}

function statusPulseClass(status: string): string {
  const tone = vehicleListStatusTone(status);
  switch (tone) {
    case "active":
      return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]";
    case "inactive":
      return "bg-zinc-400";
    case "danger":
      return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]";
    case "warning":
    default:
      return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]";
  }
}

function FleetSpec({
  icon,
  children,
  ariaLabel,
}: {
  icon: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-lg bg-zinc-50/90 px-2 py-1.5 ring-1 ring-zinc-100/90"
      title={ariaLabel}
    >
      <span className="shrink-0 text-zinc-400 [&_svg]:size-[15px]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate text-[13px] font-semibold tabular-nums text-zinc-800">{children}</span>
    </div>
  );
}

export type VehicleFleetCardProps = {
  vehicle: VehicleListItem;
  locale: string;
  canEdit: boolean;
  deletePending: boolean;
  extrasSections: QuickActionsMenuSection[];
  statusDescription: string;
  insuranceDescription: string;
  assignmentDescription: string;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  openDetailsLabel: string;
  editLabel: string;
  deleteLabel: string;
  menuExtrasLabel: string;
};

export function VehicleFleetCard({
  vehicle: r,
  locale,
  canEdit,
  deletePending,
  extrasSections,
  statusDescription,
  insuranceDescription,
  assignmentDescription,
  onOpenDetail,
  onEdit,
  onDelete,
  openDetailsLabel,
  editLabel,
  deleteLabel,
  menuExtrasLabel,
}: VehicleFleetCardProps) {
  const assignee = r.assignedPersonnelName ?? r.assignedBranchName;
  const AssignIcon = r.assignedPersonnelName ? UserRound : Building2;

  return (
    <li className="group/card min-w-0 list-none">
      <article
        className={cn(
          "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm",
          "transition-[box-shadow,transform,border-color] duration-200",
          "hover:border-zinc-300 hover:shadow-md",
          "focus-within:border-zinc-300 focus-within:shadow-md"
        )}
      >
        <button
          type="button"
          className="relative block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
          onClick={onOpenDetail}
          aria-label={openDetailsLabel}
        >
          <div className="relative aspect-[5/3] w-full overflow-hidden bg-zinc-900">
            {r.hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated blob URL from API
              <img
                src={vehiclePhotoUrl(r.id)}
                alt=""
                className="h-full w-full object-cover transition duration-500 ease-out group-hover/card:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-950">
                <CarFront className="size-[4.5rem] text-white/[0.12]" strokeWidth={1} aria-hidden />
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-3.5">
              <p className="font-mono text-lg font-bold tracking-[0.12em] text-white drop-shadow-md sm:text-xl">
                {r.plateNumber}
              </p>
              <Tooltip content={statusDescription} delayMs={250}>
                <span
                  className={cn(
                    "inline-flex size-3 shrink-0 rounded-full ring-2 ring-white/40",
                    statusPulseClass(r.status)
                  )}
                  aria-label={statusDescription}
                />
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:gap-2.5 sm:p-3.5">
            <FleetSpec icon={<Factory aria-hidden />} ariaLabel={r.brand}>
              {r.brand || "—"}
            </FleetSpec>
            <FleetSpec icon={<CarFront aria-hidden />} ariaLabel={r.model}>
              {r.model || "—"}
            </FleetSpec>
            <FleetSpec icon={<CalendarDays aria-hidden />} ariaLabel={String(r.year ?? "—")}>
              {r.year != null ? String(r.year) : "—"}
            </FleetSpec>
            <FleetSpec icon={<Gauge aria-hidden />} ariaLabel={formatFleetKm(r.odometerKm, locale)}>
              {formatFleetKm(r.odometerKm, locale)}
            </FleetSpec>
            <FleetSpec icon={<AssignIcon aria-hidden />} ariaLabel={assignmentDescription}>
              {assignee ?? "—"}
            </FleetSpec>
            <div className="flex min-h-[38px] items-center justify-center rounded-lg bg-zinc-50/90 ring-1 ring-zinc-100/90">
              <Tooltip content={insuranceDescription} delayMs={250}>
                <span className="inline-flex items-center justify-center p-1.5" aria-label={insuranceDescription}>
                  <Shield className={cn("size-[18px]", insuranceIconClass(r.insuranceBadge))} strokeWidth={2} />
                </span>
              </Tooltip>
            </div>
          </div>
        </button>

        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-zinc-100 bg-zinc-50/40 px-2 py-2">
          <Tooltip content={openDetailsLabel} delayMs={200}>
            <Button
              type="button"
              variant="secondary"
              className={cn(detailOpenIconButtonClass, "min-h-10 flex-1 sm:min-h-9")}
              aria-label={openDetailsLabel}
              onClick={onOpenDetail}
            >
              <EyeIcon />
            </Button>
          </Tooltip>
          {canEdit ? (
            <>
              <Tooltip content={editLabel} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(detailOpenIconButtonClass, "min-h-10 flex-1 sm:min-h-9")}
                  aria-label={editLabel}
                  onClick={onEdit}
                >
                  <PencilIcon />
                </Button>
              </Tooltip>
              <Tooltip content={deleteLabel} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(detailOpenIconButtonClass, "min-h-10 text-red-700 sm:min-h-9")}
                  aria-label={deleteLabel}
                  disabled={deletePending}
                  onClick={onDelete}
                >
                  <Trash2 className="size-[15px]" strokeWidth={2} aria-hidden />
                </Button>
              </Tooltip>
              {extrasSections.length > 0 ? (
                <div className="flex min-h-10 shrink-0 items-stretch">
                  <BranchQuickActionsMenu
                    menuId={`vehicle-fleet-${r.id}`}
                    triggerLabel={menuExtrasLabel}
                    compact
                    sections={extrasSections}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </article>
    </li>
  );
}
