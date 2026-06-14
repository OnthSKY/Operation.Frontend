"use client";

import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type {
  VehicleExpenseBranchPaySource,
  VehicleExpenseFormState,
  VehicleExpensePatronPay,
} from "@/modules/vehicles/hooks/useVehicleExpenseForm";

export type VehicleExpenseBranchOption = { id: number; name: string };

/**
 * Gider ekle/düzenle modal'ı. State + mutation `useVehicleExpenseForm`'dan.
 *  - Şube seçilince patronPaySource + patronPaymentMethod alanları açılır.
 *  - canEdit: yalnız staff kullanıcılar şube/ödeme kaynağı seçer.
 */
export function VehicleExpenseModal({
  state,
  branchOptions,
  canEdit,
  t,
}: {
  state: VehicleExpenseFormState;
  branchOptions: VehicleExpenseBranchOption[];
  canEdit: boolean;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.modal != null}
      onClose={state.close}
      titleId="vehicle-expense-form"
      title={
        state.modal === "add"
          ? t("vehicles.addExpense")
          : t("vehicles.editExpense")
      }
      narrow
      nested
      closeButtonLabel={t("common.close")}
    >
      <div className="flex flex-col gap-3 p-1">
        <Select
          name="vehicle-expense-type"
          label={t("vehicles.expenseType")}
          value={state.type}
          onBlur={() => {}}
          onChange={(e) => state.setType(e.target.value)}
          options={[
            { value: "fuel", label: t("vehicles.types.fuel") },
            { value: "maintenance", label: t("vehicles.types.maintenance") },
            { value: "insurance", label: t("vehicles.types.insurance") },
            { value: "repair", label: t("vehicles.types.repair") },
            { value: "other", label: t("vehicles.types.other") },
          ]}
        />
        <Input
          label={t("vehicles.amount")}
          value={state.amount}
          onChange={(e) => state.setAmount(e.target.value)}
        />
        <Input
          label={t("vehicles.currency")}
          value={state.currency}
          onChange={(e) => state.setCurrency(e.target.value.toUpperCase())}
        />
        <DateField
          label={t("vehicles.expenseDate")}
          value={state.date}
          onChange={(e) => state.setDate(e.target.value)}
        />
        <Input
          label={t("vehicles.description")}
          value={state.desc}
          onChange={(e) => state.setDesc(e.target.value)}
        />
        {canEdit ? (
          <Select
            name="vehicle-expense-branch"
            label={t("vehicles.expensePostToBranch")}
            value={state.branchId}
            onBlur={() => {}}
            onChange={(e) => {
              const v = e.target.value;
              state.setBranchId(v);
              if (!v.trim()) {
                state.setBranchPaySource("REGISTER");
                state.setPatronPay("CASH");
              }
            }}
            options={[
              { value: "", label: "—" },
              ...branchOptions.map((b) => ({
                value: String(b.id),
                label: b.name,
              })),
            ]}
          />
        ) : null}
        {canEdit && state.branchId.trim() ? (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3">
            <p className="text-xs text-zinc-600">
              {t("vehicles.expenseBranchPayHint")}
            </p>
            <Select
              name="vehicle-expense-branch-pay-source"
              label={t("vehicles.expenseBranchPaySource")}
              value={state.branchPaySource}
              onBlur={() => {}}
              onChange={(e) =>
                state.setBranchPaySource(
                  e.target.value as VehicleExpenseBranchPaySource,
                )
              }
              options={[
                {
                  value: "REGISTER",
                  label: t("vehicles.expenseBranchPayRegister"),
                },
                { value: "PATRON", label: t("vehicles.expenseBranchPayPatron") },
              ]}
            />
            {state.branchPaySource === "PATRON" ? (
              <Select
                name="vehicle-expense-patron-pay"
                label={t("vehicles.expensePatronPayMethod")}
                value={state.patronPay}
                onBlur={() => {}}
                onChange={(e) =>
                  state.setPatronPay(
                    e.target.value as VehicleExpensePatronPay,
                  )
                }
                options={[
                  { value: "CASH", label: t("vehicles.expensePayCash") },
                  { value: "CARD", label: t("vehicles.expensePayCard") },
                ]}
              />
            ) : null}
          </div>
        ) : null}
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
