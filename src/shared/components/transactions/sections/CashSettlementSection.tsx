"use client";

import type {
  ControllerRenderProps,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { Locale } from "@/i18n/messages";
import type { TxFormValues } from "../lib/tx-form-types";
import { DayCloseCashHandoverSummaryCard } from "./DayCloseCashHandoverSummaryCard";

/**
 * Kasa nakit devri seçici: «kim devraldı?» (PATRON / BRANCH_MANAGER / REMAINS_AT_BRANCH).
 * Gün sonu (registerDayClose) modunda ekstra:
 *  - PATRON: «patron borcunu otomatik kapat» toggle
 *  - BRANCH_MANAGER: sorumlu personel seçici
 *  - Net nakit devri özet kartı (gün sonu + nakit > 0 + parti seçili)
 *
 * Tek sorumluluk = nakit devri akışı. Cash settlement view'a giren tüm logic burada.
 */
export type CashSettlementSectionProps = {
  registerDayClose: boolean;
  cashSettlementField: ControllerRenderProps<TxFormValues, "cashSettlementParty">;
  cashPartyWatch: string | null | undefined;
  settlementPersonnelField: ControllerRenderProps<TxFormValues, "cashSettlementPersonnelId">;
  cashSettlementResponsibleOptions: SelectOption[];
  register: UseFormRegister<TxFormValues>;
  errors: FieldErrors<TxFormValues>;
  // Net nakit devri özet kartı için:
  enteredCashIncome: number;
  priorRegisterExpenses: number;
  bundledRegisterExpenses: number;
  netCashHandover: number;
  locale: Locale;
  currencyCode: string;
};

export function CashSettlementSection(props: CashSettlementSectionProps) {
  const { t } = useI18n();
  const {
    registerDayClose,
    cashSettlementField,
    cashPartyWatch,
    settlementPersonnelField,
    cashSettlementResponsibleOptions,
    register,
    errors,
    enteredCashIncome,
    priorRegisterExpenses,
    bundledRegisterExpenses,
    netCashHandover,
    locale,
    currencyCode,
  } = props;

  const partyUpper = String(cashPartyWatch ?? "").trim().toUpperCase();
  const isPatron = partyUpper === "PATRON";
  const isBranchManager = partyUpper === "BRANCH_MANAGER";
  const partySelected = partyUpper !== "";

  return (
    <>
      {!registerDayClose ? (
        <p className="text-xs leading-relaxed text-zinc-600 lg:col-span-2">
          {t("branch.cashSettlementHintSplit")}
        </p>
      ) : null}
      <div className="min-w-0 lg:col-span-2">
        <Select
          label={t("branch.cashSettlementLabel")}
          options={[
            { value: "", label: t("branch.cashSettlementUnset") },
            { value: "PATRON", label: t("branch.cashSettlementPatron") },
            { value: "BRANCH_MANAGER", label: t("branch.cashSettlementBranchManager") },
            { value: "REMAINS_AT_BRANCH", label: t("branch.cashSettlementRemainsAtBranch") },
          ]}
          name={cashSettlementField.name}
          value={String(cashSettlementField.value ?? "")}
          onChange={(e) => cashSettlementField.onChange(e.target.value)}
          onBlur={cashSettlementField.onBlur}
          ref={cashSettlementField.ref}
        />
      </div>

      {/* Gün sonu + PATRON → otomatik borç kapatma toggle */}
      {registerDayClose && isPatron ? (
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 lg:col-span-2">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
              {...register("applyPatronDebtRepayFromDayClose")}
            />
            <span className="text-sm font-medium text-zinc-800">
              {t("branch.txDayClosePatronDebtRepayToggle")}
            </span>
          </label>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            {t("branch.txDayClosePatronAutoDebtHint")}
          </p>
        </div>
      ) : null}

      {/* BRANCH_MANAGER → sorumlu personel seçici */}
      {isBranchManager ? (
        <>
          <div className="min-w-0 lg:col-span-2">
            <Select
              label={t("branch.cashSettlementResponsiblePerson")}
              labelRequired
              options={cashSettlementResponsibleOptions}
              name={settlementPersonnelField.name}
              value={String(settlementPersonnelField.value ?? "")}
              onChange={(e) => settlementPersonnelField.onChange(e.target.value)}
              onBlur={settlementPersonnelField.onBlur}
              ref={settlementPersonnelField.ref}
              error={errors.cashSettlementPersonnelId?.message}
            />
          </div>
          {cashSettlementResponsibleOptions.length <= 1 ? (
            <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
              {t("branch.cashSettlementResponsibleEmptyGlobal")}
            </p>
          ) : null}
        </>
      ) : null}

      {/* Gün sonu net nakit devri özeti */}
      {registerDayClose && enteredCashIncome > 0 && partySelected ? (
        <DayCloseCashHandoverSummaryCard
          enteredCashIncome={enteredCashIncome}
          priorRegisterExpenses={priorRegisterExpenses}
          bundledRegisterExpenses={bundledRegisterExpenses}
          netCashHandover={netCashHandover}
          locale={locale}
          currencyCode={currencyCode}
        />
      ) : null}
    </>
  );
}
