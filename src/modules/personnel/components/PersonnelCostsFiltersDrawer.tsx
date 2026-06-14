"use client";

import { RightDrawer } from "@/shared/components/RightDrawer";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";

/**
 * Costs sekmesi filtre çekmecesi: şube, kaynak, sayfa boyutu Select'leri +
 * sistem yöneticisi için "silinmiş avansları göster" checkbox.
 */
export function PersonnelCostsFiltersDrawer({
  open,
  onClose,
  branchOptions,
  sourceOptions,
  pageSizeOptions,
  branchFilter,
  onBranchFilterChange,
  sourceFilter,
  onSourceFilterChange,
  pageSizeValue,
  onPageSizeChange,
  isSystemAdmin,
  showDeletedAdvances,
  onShowDeletedAdvancesChange,
  t,
}: {
  open: boolean;
  onClose: () => void;
  branchOptions: SelectOption[];
  sourceOptions: SelectOption[];
  pageSizeOptions: SelectOption[];
  branchFilter: string;
  onBranchFilterChange: (v: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (v: string) => void;
  pageSizeValue: string;
  onPageSizeChange: (v: string) => void;
  isSystemAdmin: boolean;
  showDeletedAdvances: boolean;
  onShowDeletedAdvancesChange: (v: boolean) => void;
  t: (k: string) => string;
}) {
  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t("personnel.detailCostsFiltersDrawerTitle")}
      closeLabel={t("common.close")}
      backdropCloseRequiresConfirm={false}
      rootClassName={OVERLAY_Z_TW.modalNested}
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("personnel.detailCostsFiltersDrawerHint")}
        </p>
        <div className="grid gap-4">
          <Select
            name="advBranchDrawer"
            label={t("personnel.tableBranch")}
            options={branchOptions}
            value={branchFilter}
            onChange={(e) => onBranchFilterChange(e.target.value)}
            onBlur={() => {}}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
          />
          <Select
            name="advSourceDrawer"
            label={t("personnel.sourceType")}
            options={sourceOptions}
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            onBlur={() => {}}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
          />
          <Select
            name="advPageSizeDrawer"
            label={t("personnel.detailPageSize")}
            options={pageSizeOptions}
            value={pageSizeValue}
            onChange={(e) => onPageSizeChange(e.target.value)}
            onBlur={() => {}}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 60}
          />
          {isSystemAdmin ? (
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                checked={showDeletedAdvances}
                onChange={(e) => onShowDeletedAdvancesChange(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block font-medium text-zinc-900">
                  {t("personnel.detailCostsShowDeletedAdvances")}
                </span>
                <span className="block text-xs text-zinc-500">
                  {t("personnel.detailCostsShowDeletedAdvancesHint")}
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </div>
    </RightDrawer>
  );
}
