"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import { InfoHint } from "@/shared/ui/InfoHint";
import { domainHint } from "@/shared/lib/domain-hints";
import { readRecentList, RECENT_BUCKETS } from "@/shared/lib/recent-values-store";
import { useMemo } from "react";
import type { Locale } from "@/i18n/messages";
import type { TxFormValues } from "../lib/tx-form-types";
import { PocketHeldPersonPicker } from "./PocketHeldPersonPicker";
import { PocketRepaySettlementSection } from "./PocketRepaySettlementSection";

/**
 * OUT (gider) akışında «kim ödedi?» seçici grubu.
 *
 * Üç katman:
 *   1) Bağlam hint (gün-içi ödeme, patron borcu, cep borcu, personel akışı, default)
 *   2) Payment source select (REGISTER / PATRON / POCKET / HELD)
 *   3) Seçilen kaynağa göre alt selectorlar:
 *      - POCKET/HELD → PocketHeldPersonPicker
 *      - POCKET_REPAY umbrella + REGISTER/PATRON → PocketRepaySettlementSection
 *
 * Caller `visible` koşulunu hesaplar; bu komponent sadece görünür olduğunda render edilir.
 */
export type ExpensePaymentSectionProps = {
  // Hint koşulları:
  isPatronDebtRepayMain: boolean;
  isPocketRepayMain: boolean;
  personnelExpenseFlow: boolean;
  propBranchId: number | null;
  resolvedBranchId: number | null;
  // Payment source select:
  expensePayField: ControllerRenderProps<TxFormValues, "expensePaymentSource">;
  expensePayWatch: string | null | undefined;
  expensePaymentOptions: SelectOption[];
  errors: FieldErrors<TxFormValues>;
  // PocketHeldPersonPicker (POCKET/HELD seçili olunca):
  expensePocketPersonnelField: ControllerRenderProps<TxFormValues, "expensePocketPersonnelId">;
  pocketExpensePersonOptions: SelectOption[];
  heldRegisterPersonOptions: SelectOption[];
  heldBalancesAcrossBranchesEnabled: boolean;
  heldRegisterPickerLoading: boolean;
  asOfDateYmd: string;
  // PocketRepaySettlementSection:
  isPocketRepaySettlementUmbrellaMain: boolean;
  branchStaffOptions: SelectOption[];
  expensePocketRepayPidNum: number;
  modalOpen: boolean;
  locale: Locale;
  formCurrencyCode: string;
  onSettlementChange: (ids: number[], sum: number, currencyOk: boolean) => void;
};

export function ExpensePaymentSection(props: ExpensePaymentSectionProps) {
  const { t } = useI18n();
  const {
    isPatronDebtRepayMain,
    isPocketRepayMain,
    personnelExpenseFlow,
    propBranchId,
    resolvedBranchId,
    expensePayField,
    expensePayWatch,
    expensePaymentOptions,
    errors,
    expensePocketPersonnelField,
    pocketExpensePersonOptions,
    heldRegisterPersonOptions,
    heldBalancesAcrossBranchesEnabled,
    heldRegisterPickerLoading,
    asOfDateYmd,
    isPocketRepaySettlementUmbrellaMain,
    branchStaffOptions,
    expensePocketRepayPidNum,
    modalOpen,
    locale,
    formCurrencyCode,
    onSettlementChange,
  } = props;

  return (
    <div className="min-w-0 lg:col-span-2">
      {/* Bağlam hint — özel akışlarda hâlâ gerekli (genel uzun hint kaldırıldı,
          yerine her seçeneğin altında sarı tek satırlık ipucu var). */}
      {isPatronDebtRepayMain ? (
        <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
          {t("branch.txPatronDebtRepayModalHint")}
        </p>
      ) : isPocketRepayMain ? (
        <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
          {t("branch.txPocketRepayModalHint")}
        </p>
      ) : null}

      {/* Payment source select */}
      <Select
        label={t("branch.expensePaymentLabel")}
        labelRequired
        labelHint={<InfoHint content={domainHint("expensePaymentSource")} />}
        options={expensePaymentOptions}
        recentlyUsedValues={useMemo(
          () => readRecentList(RECENT_BUCKETS.txExpensePaymentSource, 3).map(String),
          []
        )}
        name={expensePayField.name}
        value={String(expensePayField.value ?? "")}
        onChange={(e) => expensePayField.onChange(e.target.value)}
        onBlur={expensePayField.onBlur}
        ref={expensePayField.ref}
        error={errors.expensePaymentSource?.message}
      />
      {(() => {
        const u = String(expensePayWatch ?? "").trim().toUpperCase();
        if (!u) return null;
        const hintKey =
          u === "REGISTER"
            ? "branch.expensePayHintRegister"
            : u === "PATRON"
              ? "branch.expensePayHintPatron"
              : u === "PERSONNEL_POCKET"
                ? "branch.expensePayHintPersonnelPocket"
                : u === "PERSONNEL_HELD_REGISTER_CASH"
                  ? "branch.expensePayHintPersonnelHeldRegisterCash"
                  : "";
        if (!hintKey) return null;
        return (
          <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            {t(hintKey)}
          </p>
        );
      })()}

      {/* POCKET/HELD → personel seçici */}
      <PocketHeldPersonPicker
        expensePaymentSource={expensePayWatch}
        field={expensePocketPersonnelField}
        pocketOptions={pocketExpensePersonOptions}
        heldOptions={heldRegisterPersonOptions}
        acrossBranchesEnabled={heldBalancesAcrossBranchesEnabled}
        heldPickerLoading={heldRegisterPickerLoading}
        asOfDateYmd={asOfDateYmd}
        personnelExpenseFlow={personnelExpenseFlow}
        errors={errors}
      />

      {/* POCKET_REPAY + REGISTER/PATRON → önceki cep gider satırı picker */}
      <PocketRepaySettlementSection
        umbrellaActive={isPocketRepaySettlementUmbrellaMain}
        expensePaymentSource={expensePayWatch}
        field={expensePocketPersonnelField}
        branchStaffOptions={branchStaffOptions}
        errors={errors}
        personnelId={expensePocketRepayPidNum}
        resolvedBranchId={resolvedBranchId}
        modalOpen={modalOpen}
        locale={locale}
        formCurrencyCode={formCurrencyCode}
        onSettlementChange={onSettlementChange}
      />
    </div>
  );
}
