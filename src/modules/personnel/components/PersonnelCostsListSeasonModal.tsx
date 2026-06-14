"use client";

import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { notify } from "@/shared/lib/notify";
import { parseSettlementSeasonYearChoice } from "@/modules/personnel/lib/settlement-print-season";

/**
 * Costs sekmesi liste sezonu filtresi modal'ı.
 * Draft state caller'da; `value` ile mevcut taslak görünür, `onChange` ile taslak değişir,
 * "Uygula"da geçerli yıl doğrulanır ve `onApply(value)` çağrılır.
 */
export function PersonnelCostsListSeasonModal({
  open,
  onClose,
  titleId,
  value,
  onChange,
  onApply,
  seasonScopeOptions,
  t,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  value: string;
  onChange: (v: string) => void;
  onApply: (v: string) => void;
  seasonScopeOptions: SelectOption[];
  t: (k: string) => string;
}) {
  return (
    <Modal
      nested
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={t("personnel.detailCostsListSeasonModalTitle")}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="space-y-4 px-1 pb-2 pt-1">
        <Select
          name="personnelDetailCostsListSeasonModal"
          label={t("personnel.detailCostsListSeasonLabel")}
          options={seasonScopeOptions}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {}}
        />
        <p className="text-xs text-zinc-500">
          {t("personnel.detailCostsListSeasonHint")}
        </p>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              const y = parseSettlementSeasonYearChoice(value);
              if (value.trim() !== "" && y == null) {
                notify.error(t("personnel.effectiveYearInvalid"));
                return;
              }
              onApply(value);
            }}
          >
            {t("personnel.detailCostsListSeasonApply")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
