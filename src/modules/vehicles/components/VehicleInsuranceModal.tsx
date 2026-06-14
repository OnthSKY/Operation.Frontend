"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { OVERLAY_Z_INDEX } from "@/shared/overlays/z-layers";
import { formatAmountInputOnBlur } from "@/shared/lib/locale-amount";
import { VEHICLE_INSURANCE_OTHER_SLUG } from "@/modules/vehicles/lib/vehicle-insurance-presets";
import type { VehicleInsuranceFormState } from "@/modules/vehicles/hooks/useVehicleInsuranceForm";

/**
 * Sigorta ekle/düzenle modal'ı. State + mutation `useVehicleInsuranceForm`'dan.
 * Sigorta türü/sağlayıcı seçenekleri caller'da hesaplanır (i18n + preset listesi).
 */
export function VehicleInsuranceModal({
  state,
  typeOptions,
  providerOptions,
  locale,
  t,
}: {
  state: VehicleInsuranceFormState;
  typeOptions: SelectOption[];
  providerOptions: SelectOption[];
  locale: Locale;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.modal != null}
      onClose={state.close}
      titleId="vehicle-insurance-form"
      title={
        state.modal === "add"
          ? t("vehicles.addInsurance")
          : t("vehicles.editInsurance")
      }
      narrow
      nested
      closeButtonLabel={t("common.close")}
    >
      <div className="flex flex-col gap-3 p-1">
        <Select
          name="vehicle-insurance-type"
          label={t("vehicles.insuranceType")}
          labelRequired
          menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 5}
          value={state.typeSlug}
          onBlur={() => {}}
          onChange={(e) => {
            state.setTypeSlug(e.target.value);
            if (e.target.value !== VEHICLE_INSURANCE_OTHER_SLUG)
              state.setTypeCustom("");
          }}
          options={typeOptions}
        />
        {state.typeSlug === VEHICLE_INSURANCE_OTHER_SLUG ? (
          <Input
            label={t("vehicles.insuranceCustomTypeLabel")}
            labelRequired
            value={state.typeCustom}
            onChange={(e) => state.setTypeCustom(e.target.value)}
            autoComplete="off"
          />
        ) : null}
        <Select
          name="vehicle-insurance-company"
          label={t("vehicles.provider")}
          labelRequired
          menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 5}
          value={state.provSlug}
          onBlur={() => {}}
          onChange={(e) => {
            state.setProvSlug(e.target.value);
            if (e.target.value !== VEHICLE_INSURANCE_OTHER_SLUG)
              state.setProvCustom("");
          }}
          options={providerOptions}
        />
        {state.provSlug === VEHICLE_INSURANCE_OTHER_SLUG ? (
          <Input
            label={t("vehicles.insuranceCustomCompanyLabel")}
            labelRequired
            value={state.provCustom}
            onChange={(e) => state.setProvCustom(e.target.value)}
            autoComplete="off"
          />
        ) : null}
        <Input
          label={t("vehicles.policyNumber")}
          value={state.policy}
          onChange={(e) => state.setPolicy(e.target.value)}
        />
        <DateField
          label={t("vehicles.startDate")}
          labelRequired
          required
          value={state.start}
          onChange={(e) => state.setStart(e.target.value)}
        />
        <DateField
          label={t("vehicles.endDate")}
          labelRequired
          required
          value={state.end}
          onChange={(e) => state.setEnd(e.target.value)}
        />
        <Input
          label={t("vehicles.amount")}
          value={state.amount}
          onChange={(e) => state.setAmount(e.target.value)}
          onBlur={() =>
            state.setAmount((s) => formatAmountInputOnBlur(s, locale))
          }
          inputMode="decimal"
          autoComplete="off"
        />
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={state.close}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={() => void state.save()}
            disabled={state.saveBusy}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
