"use client";

import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { notify } from "@/shared/lib/notify";
import { parseSettlementSeasonYearChoice } from "@/modules/personnel/lib/settlement-print-season";

/**
 * Costs sekmesi PDF yazdırma scope (sezon yılı) modal'ı. Draft state caller'da
 * tutulur. "Yazdır"da yıl doğrulanır ve `onSubmit(value)` çağrılır (caller print'i
 * tetikler ve modal'ı kapatır).
 */
export function PersonnelCostsPdfScopeModal({
  open,
  onClose,
  titleId,
  value,
  onChange,
  onSubmit,
  busy,
  seasonScopeOptions,
  t,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  value: string;
  onChange: (v: string) => void;
  /** Doğrulama geçince çağrılır; caller print + modal kapama yürütür. */
  onSubmit: (v: string) => void;
  /** Yazdır sürerken butonu disable et. */
  busy: boolean;
  seasonScopeOptions: SelectOption[];
  t: (k: string) => string;
}) {
  return (
    <Modal
      nested
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={t("personnel.detailCostsPdfModalTitle")}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="space-y-4 px-1 pb-2 pt-1">
        <Select
          name="personnelDetailPdfScopeSeasonModal"
          label={t("personnel.detailPdfScopeLabel")}
          options={seasonScopeOptions}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {}}
        />
        <p className="text-xs text-zinc-500">
          {t("personnel.detailPdfScopeHint")}
        </p>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              const y = parseSettlementSeasonYearChoice(value);
              if (value.trim() !== "" && y == null) {
                notify.error(t("personnel.effectiveYearInvalid"));
                return;
              }
              onSubmit(value);
            }}
          >
            {t("personnel.settlementPrintSeasonPickerConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
