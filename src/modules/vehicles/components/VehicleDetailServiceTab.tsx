"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { labelVehicleMaintenanceType } from "@/modules/vehicles/lib/vehicle-maintenance-types";
import type { VehicleMaintenance } from "@/types/vehicle";

/**
 * Detay overlay → Service tab.
 *  - Üstte servis planı (km / ay aralıkları) sabit panel
 *  - Altında bakım log'u: tip filtresi + mobil kart / masaüstü tablo + edit/delete
 */
export function VehicleDetailServiceTab({
  vehicleId,
  serviceIntervalKm,
  serviceIntervalMonths,
  maintenances,
  filterType,
  filterOptions,
  filteredMaintenances,
  canEdit,
  locale,
  onAddMaintenance,
  onFilterTypeChange,
  onEditMaintenance,
  onDeleteMaintenance,
  t,
}: {
  vehicleId: number;
  serviceIntervalKm: number | null | undefined;
  serviceIntervalMonths: number | null | undefined;
  maintenances: VehicleMaintenance[];
  filterType: string;
  filterOptions: SelectOption[];
  filteredMaintenances: VehicleMaintenance[];
  canEdit: boolean;
  locale: Locale;
  onAddMaintenance: () => void;
  onFilterTypeChange: (v: string) => void;
  onEditMaintenance: (vehicleId: number, x: VehicleMaintenance) => void;
  onDeleteMaintenance: (maintenanceId: number) => void;
  t: (k: string) => string;
}) {
  const numberFmt = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US");
  return (
    <div className="flex flex-col gap-8">
      <section
        className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 ring-1 ring-zinc-100/60 sm:p-5"
        aria-labelledby="vehicle-service-plan-heading"
      >
        <h3
          id="vehicle-service-plan-heading"
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          {t("vehicles.serviceSectionPlan")}
        </h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-600">
          {t("vehicles.maintenancePlanHint")}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[0.65rem] font-bold uppercase text-zinc-400">
              {t("vehicles.serviceIntervalKm")}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
              {serviceIntervalKm == null ? "—" : numberFmt.format(serviceIntervalKm)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm">
            <p className="text-[0.65rem] font-bold uppercase text-zinc-400">
              {t("vehicles.serviceIntervalMonths")}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
              {serviceIntervalMonths == null
                ? "—"
                : numberFmt.format(serviceIntervalMonths)}
            </p>
          </div>
        </div>
      </section>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="vehicle-service-log-heading"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3
            id="vehicle-service-log-heading"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            {t("vehicles.serviceSectionLog")}
          </h3>
          {canEdit ? (
            <Button
              type="button"
              className="w-full !min-h-11 shrink-0 px-3 text-sm sm:w-auto sm:!min-h-9"
              onClick={onAddMaintenance}
            >
              {t("vehicles.addMaintenance")}
            </Button>
          ) : null}
        </div>
        {maintenances.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("vehicles.emptyMaintenances")}
          </p>
        ) : (
          <>
            <Select
              name="vehicle-maintenance-log-filter"
              label={t("vehicles.maintenanceFilterByType")}
              value={filterType}
              onBlur={() => {}}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              options={filterOptions}
              className="max-w-md"
            />
            {filteredMaintenances.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {t("vehicles.maintenanceFilterNoResults")}
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-4 md:hidden">
                  {filteredMaintenances.map((x) => {
                    const nextDueLabel = x.nextDueDate
                      ? x.nextDueDate.slice(0, 10)
                      : x.nextDueKm != null
                        ? `${numberFmt.format(x.nextDueKm)} km`
                        : null;
                    return (
                      <MobileListCard
                        as="li"
                        key={x.id}
                        className="flex flex-col gap-2 bg-white"
                      >
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate font-semibold text-zinc-900">
                              {labelVehicleMaintenanceType(x.maintenanceType, t)}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {t("vehicles.maintenanceServiceDate")}:{" "}
                              {x.serviceDate.slice(0, 10)}
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums text-sm font-medium text-zinc-800">
                            {x.cost != null
                              ? formatLocaleAmount(x.cost, locale, x.currencyCode)
                              : "—"}
                          </p>
                        </div>
                        <dl className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-zinc-600">
                          <div className="flex justify-between gap-2">
                            <dt>{t("vehicles.odometerKm")}</dt>
                            <dd className="tabular-nums text-zinc-800">
                              {x.odometerKm != null
                                ? numberFmt.format(x.odometerKm)
                                : "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>{t("vehicles.maintenanceWorkshop")}</dt>
                            <dd className="max-w-[60%] text-right text-zinc-800">
                              {x.workshop ?? "—"}
                            </dd>
                          </div>
                          {nextDueLabel ? (
                            <div className="flex justify-between gap-2">
                              <dt>{t("vehicles.maintenanceNextDueDate")}</dt>
                              <dd className="text-zinc-800">{nextDueLabel}</dd>
                            </div>
                          ) : null}
                          {x.description?.trim() ? (
                            <div className="border-t border-zinc-100 pt-2 text-zinc-700">
                              {x.description}
                            </div>
                          ) : null}
                        </dl>
                        {canEdit ? (
                          <div className="mt-3 flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full !min-h-11 touch-manipulation"
                              onClick={() => onEditMaintenance(vehicleId, x)}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full !min-h-11 touch-manipulation text-red-700 ring-red-200 hover:bg-red-50"
                              onClick={() => onDeleteMaintenance(x.id)}
                            >
                              {t("vehicles.delete")}
                            </Button>
                          </div>
                        ) : null}
                      </MobileListCard>
                    );
                  })}
                </ul>
                <div className="hidden md:block">
                  <div className="-mx-1 min-w-0 overflow-x-auto rounded-lg sm:mx-0">
                    <Table className="min-w-[40rem] text-sm sm:min-w-0 sm:text-base">
                      <TableHead>
                        <TableRow>
                          <TableHeader>
                            {t("vehicles.maintenanceServiceDate")}
                          </TableHeader>
                          <TableHeader>
                            {t("vehicles.maintenanceType")}
                          </TableHeader>
                          <TableHeader className="hidden sm:table-cell">
                            {t("vehicles.odometerKm")}
                          </TableHeader>
                          <TableHeader className="hidden md:table-cell">
                            {t("vehicles.maintenanceWorkshop")}
                          </TableHeader>
                          <TableHeader>{t("vehicles.amount")}</TableHeader>
                          <TableHeader className="hidden md:table-cell">
                            {t("vehicles.maintenanceNextDueDate")}
                          </TableHeader>
                          <TableHeader className="w-[1%]" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredMaintenances.map((x) => (
                          <TableRow key={x.id}>
                            <TableCell className="whitespace-nowrap">
                              {x.serviceDate.slice(0, 10)}
                            </TableCell>
                            <TableCell className="max-w-[10rem] truncate">
                              {labelVehicleMaintenanceType(
                                x.maintenanceType,
                                t,
                              )}
                            </TableCell>
                            <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 tabular-nums md:table-cell">
                              {x.odometerKm != null
                                ? numberFmt.format(x.odometerKm)
                                : "—"}
                            </TableCell>
                            <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[8rem] truncate md:table-cell">
                              {x.workshop ?? "—"}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {x.cost != null
                                ? formatLocaleAmount(
                                    x.cost,
                                    locale,
                                    x.currencyCode,
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 whitespace-nowrap text-xs text-zinc-600 md:table-cell">
                              {x.nextDueDate
                                ? x.nextDueDate.slice(0, 10)
                                : x.nextDueKm != null
                                  ? `${numberFmt.format(x.nextDueKm)} km`
                                  : "—"}
                            </TableCell>
                            <TableCell className="align-top">
                              {canEdit ? (
                                <div className="flex min-w-[7rem] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                    onClick={() =>
                                      onEditMaintenance(vehicleId, x)
                                    }
                                  >
                                    {t("common.edit")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                    onClick={() => onDeleteMaintenance(x.id)}
                                  >
                                    {t("vehicles.delete")}
                                  </Button>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
