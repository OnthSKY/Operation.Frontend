"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { MobileListCard } from "@/shared/components/MobileListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type { VehicleAssignment } from "@/types/vehicle";

/**
 * Detay overlay → Assignments tab.
 * Mobil kart listesi + masaüstü tablo + "Atamayı değiştir" CTA (yetkiliyse).
 */
export function VehicleDetailAssignmentsTab({
  assignments,
  canEdit,
  locale,
  onOpenAssignmentDialog,
  t,
}: {
  assignments: VehicleAssignment[];
  canEdit: boolean;
  locale: Locale;
  onOpenAssignmentDialog: () => void;
  t: (k: string) => string;
}) {
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3 ring-1 ring-zinc-100/80 sm:p-4">
          <p className="text-pretty text-sm leading-relaxed text-zinc-600">
            {t("vehicles.assignmentTabHint")}
          </p>
          <Button
            type="button"
            className="mt-3 w-full !min-h-11 touch-manipulation sm:w-auto sm:!min-h-10"
            onClick={onOpenAssignmentDialog}
          >
            {t("vehicles.changeAssignment")}
          </Button>
        </div>
      ) : null}
      {assignments.length === 0 ? (
        <EmptyState
          icon="🚗"
          title={t("vehicles.emptyAssignments")}
          description="Aracı bir personele atayarak operasyonel kullanım kaydını başlatın."
          compact
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4 md:hidden">
            {assignments.map((a) => (
              <MobileListCard
                as="li"
                key={a.id}
                className="flex flex-col gap-1 bg-zinc-50/40 text-sm"
              >
                <p className="truncate font-medium text-zinc-900">
                  {a.personnelName ?? a.branchName ?? t("vehicles.idle")}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  <span className="font-medium text-zinc-500">
                    {t("vehicles.assignedAt")}:
                  </span>{" "}
                  {new Date(a.assignedAt).toLocaleString(dateLocale)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  <span className="font-medium text-zinc-500">
                    {t("vehicles.released")}:
                  </span>{" "}
                  {a.releasedAt
                    ? new Date(a.releasedAt).toLocaleString(dateLocale)
                    : t("vehicles.active")}
                </p>
              </MobileListCard>
            ))}
          </ul>
          <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
            <Table className="min-w-[32rem] text-sm sm:min-w-0 sm:text-base">
              <TableHead>
                <TableRow>
                  <TableHeader>{t("vehicles.assignment")}</TableHeader>
                  <TableHeader>{t("vehicles.assignedAt")}</TableHeader>
                  <TableHeader>{t("vehicles.released")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.personnelName ?? a.branchName ?? t("vehicles.idle")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-zinc-600">
                      {new Date(a.assignedAt).toLocaleString(dateLocale)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">
                      {a.releasedAt
                        ? new Date(a.releasedAt).toLocaleString(dateLocale)
                        : t("vehicles.active")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
