"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { toErrorMessage } from "@/shared/lib/error-message";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { hasLinkedSystemUser } from "@/modules/personnel/lib/personnel-user-link";
import type { Personnel } from "@/types/personnel";
import type { WarehouseListItem } from "@/types/warehouse";

export type PersonnelDetailRolesTabRoleKind = "manager" | "master" | "both";

/**
 * Roller sekmesi: bağlı şubeler listesi (geçmiş + güncel) + depo atama formu +
 * mevcut depo rolleri listesi (arama destekli). Tüm callback'ler dışarıdan.
 */
export function PersonnelDetailRolesTab({
  personnel,
  branchNameById,
  orderedLinkedBranchIds,
  mgmtSnapLoading,
  mgmtSnapError,
  mgmtSnapErr,
  warehouseAssignOptions,
  roleAssignOptions,
  assignWarehouseId,
  onAssignWarehouseIdChange,
  assignRole,
  onAssignRoleChange,
  whLoading,
  assignBusy,
  onApplyAssignment,
  rolesSearch,
  onRolesSearchChange,
  debouncedRolesSearch,
  warehouseRoles,
  t,
}: {
  personnel: Personnel;
  branchNameById: Map<number, string>;
  orderedLinkedBranchIds: number[];
  mgmtSnapLoading: boolean;
  mgmtSnapError: boolean;
  mgmtSnapErr: unknown;
  warehouseAssignOptions: SelectOption[];
  roleAssignOptions: SelectOption[];
  assignWarehouseId: string;
  onAssignWarehouseIdChange: (v: string) => void;
  assignRole: PersonnelDetailRolesTabRoleKind;
  onAssignRoleChange: (v: PersonnelDetailRolesTabRoleKind) => void;
  whLoading: boolean;
  assignBusy: boolean;
  /** Atama formunu çalıştır (async); caller mutation + notify zincirini yürütür. */
  onApplyAssignment: () => void;
  rolesSearch: string;
  onRolesSearchChange: (v: string) => void;
  debouncedRolesSearch: string;
  warehouseRoles: { warehouse: WarehouseListItem; tags: string[] }[];
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50/90 to-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("personnel.detailRolesStoryTitle")}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">
          {personnelDisplayName(personnel)}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-violet-900">
              {t("personnel.detailRolesStorySummaryBranchEyebrow")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-700">
              {t("personnel.detailRolesStorySummaryBranchBody")}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/45 p-3 sm:p-3.5">
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-950">
              {t("personnel.detailRolesStorySummaryWarehouseEyebrow")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-800">
              {t("personnel.detailRolesStorySummaryWarehouseBody")}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.detailRolesBranchesListTitle")}
            </h4>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-500">
              {t("personnel.detailRolesBranchesListIntro")}
            </p>
          </div>
        </div>
        {mgmtSnapLoading && orderedLinkedBranchIds.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : null}
        {mgmtSnapError ? (
          <p className="mt-3 text-sm text-red-600">
            {toErrorMessage(mgmtSnapErr)}
          </p>
        ) : null}
        {!mgmtSnapLoading &&
        !mgmtSnapError &&
        orderedLinkedBranchIds.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {t("personnel.detailRolesBranchesEmpty")}
          </p>
        ) : null}
        {!mgmtSnapLoading &&
        !mgmtSnapError &&
        orderedLinkedBranchIds.length > 0 ? (
          <ul className="mt-4 grid gap-2">
            {orderedLinkedBranchIds.map((branchId) => {
              const nm = branchNameById.get(branchId) ?? `#${branchId}`;
              const isCurrent = personnel.branchId === branchId;
              const roleLabel = t(`personnel.jobTitles.${personnel.jobTitle}`);
              return (
                <li
                  key={branchId}
                  className={cn(
                    "rounded-xl border p-3.5 shadow-sm transition-colors",
                    isCurrent
                      ? "border-violet-200 bg-gradient-to-br from-violet-50/90 to-white ring-1 ring-violet-500/[0.12]"
                      : "border-zinc-200/90 bg-zinc-50/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">
                      {nm}
                    </p>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                        {t("personnel.detailRolesBranchCurrentTag")}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("personnel.detailRolesBranchHistoricTag")}
                      </span>
                    )}
                  </div>
                  {isCurrent ? (
                    <p className="mt-2.5 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-500">
                        {t("personnel.detailRolesBranchTitleLabel")}
                      </span>{" "}
                      <span className="text-sm font-medium text-zinc-800">
                        {roleLabel}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
                      {t("personnel.detailRolesBranchHistoricHint")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="border-b border-zinc-100 pb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("personnel.detailRolesWarehousesListTitle")}
          </h4>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
            {t("personnel.detailRolesWarehousesSectionPurpose")}
          </p>
        </div>

        {!hasLinkedSystemUser(personnel) ? (
          <div className="mt-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              {t("personnel.detailRolesWarehouseNeedUserTitle")}
            </p>
            <p className="text-sm leading-relaxed text-amber-950/90">
              {t("personnel.detailRolesWarehouseNeedUserP1")}
            </p>
            <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-amber-950/90">
              <li>{t("personnel.detailRolesWarehouseNeedUserStep1")}</li>
              <li>{t("personnel.detailRolesWarehouseNeedUserStep2")}</li>
            </ol>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/85">
                {t("personnel.detailRolesAssignWarehouseTitle")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                {t("personnel.detailRolesAssignWarehouseIntro")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select
                  name="assignWh"
                  label={t("personnel.detailRolesAssignWarehouseSelect")}
                  labelRequired
                  options={warehouseAssignOptions}
                  value={assignWarehouseId}
                  onChange={(e) => onAssignWarehouseIdChange(e.target.value)}
                  onBlur={() => {}}
                  disabled={whLoading}
                />
                <Select
                  name="assignRole"
                  label={t("personnel.detailRolesAssignRoleLabel")}
                  options={roleAssignOptions}
                  value={assignRole}
                  onChange={(e) =>
                    onAssignRoleChange(
                      e.target.value as PersonnelDetailRolesTabRoleKind,
                    )
                  }
                  onBlur={() => {}}
                  disabled={whLoading}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 min-h-[44px] min-w-[44px]"
                disabled={assignBusy || whLoading}
                onClick={onApplyAssignment}
              >
                {t("personnel.detailRolesAssignApply")}
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 sm:max-w-xs sm:flex-1 sm:ml-auto">
                <Input
                  name="rolesSearch"
                  label={t("personnel.detailRolesSearchShort")}
                  placeholder={t("personnel.fieldOptionalPlaceholder")}
                  value={rolesSearch}
                  onChange={(e) => onRolesSearchChange(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {t("personnel.detailRolesStoryWarehouseHint")}
            </p>

            {whLoading ? (
              <p className="mt-4 text-sm text-zinc-500">
                {t("common.loading")}
              </p>
            ) : warehouseRoles.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                {debouncedRolesSearch
                  ? t("personnel.detailRolesStoryNoDepotsMatch")
                  : t("personnel.detailRolesStoryNoDepots")}
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {warehouseRoles.map(({ warehouse: w, tags }) => (
                  <li
                    key={w.id}
                    className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3.5 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      {w.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.includes("manager") ? (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
                          {t("personnel.detailRolesAssignRoleManager")}
                        </span>
                      ) : null}
                      {tags.includes("master") ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
                          {t("personnel.detailRolesAssignRoleMaster")}
                        </span>
                      ) : null}
                    </div>
                    {w.city?.trim() || w.address?.trim() ? (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        {[w.city?.trim(), w.address?.trim()]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
