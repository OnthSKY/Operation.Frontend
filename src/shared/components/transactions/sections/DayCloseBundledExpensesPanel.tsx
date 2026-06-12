"use client";

import { useEffect, useRef, useState } from "react";
import type { ControllerRenderProps, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import { cn } from "@/lib/cn";
import type { UseDayCloseBundleApi } from "../hooks/useDayCloseBundle";
import type { TxFormValues } from "../lib/tx-form-types";
import { DAY_CLOSE_BUNDLED_EXPENSE_MAX } from "../lib/tx-form-constants";

/**
 * Gün sonu kasa kapatma ile birlikte aynı güne eklenebilen 1-3 «hızlı gider» satırı paneli.
 *
 * Switch (aç/kapa) + onaylı satırlar listesi (mobil card + desktop table) + yeni satır formu.
 * State `useDayCloseBundle` hook'unda; form alanları RHF üzerinden bağlanır.
 *
 * Tüm side-effect (confirm validasyonu, notify, setValue çağrıları) caller'dan gelir.
 */
export type DayCloseBundledTableRow = {
  id: string;
  amount: number;
  mainLabel: string;
  subLabel: string;
  payLabel: string;
  amountFmt: string;
  description: string | null;
};

export type DayCloseBundledExpensePreview =
  | { incomplete: false; line: string }
  | { incomplete: true; line: string };

export type DayCloseBundledExpensesPanelProps = {
  bundle: UseDayCloseBundleApi;
  tableDisplay: DayCloseBundledTableRow[];
  preview: DayCloseBundledExpensePreview | null;
  needsSubCategory: boolean;
  mainOptions: SelectOption[];
  subOptions: SelectOption[];
  mainField: ControllerRenderProps<TxFormValues, "dayCloseBundledExpenseMainCategory">;
  subField: ControllerRenderProps<TxFormValues, "dayCloseBundledExpenseCategory">;
  payField: ControllerRenderProps<TxFormValues, "dayCloseBundledExpensePaymentSource">;
  register: UseFormRegister<TxFormValues>;
  setValue: UseFormSetValue<TxFormValues>;
  onConfirm: () => void;
};

export function DayCloseBundledExpensesPanel(props: DayCloseBundledExpensesPanelProps) {
  const { t } = useI18n();
  const [hintOpen, setHintOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  // İlk açılışta form görünür; her başarılı onaydan sonra kapanır → "+ Yeni gider ekle".
  const [formOpen, setFormOpen] = useState(true);
  const prevLinesCount = useRef(props.bundle.lines.length);
  useEffect(() => {
    const curr = props.bundle.lines.length;
    if (curr > prevLinesCount.current) {
      setFormOpen(false);
      setDescOpen(false);
    }
    prevLinesCount.current = curr;
  }, [props.bundle.lines.length]);
  // bundle ilk açılınca form yeniden görünsün.
  useEffect(() => {
    if (props.bundle.open && props.bundle.lines.length === 0) setFormOpen(true);
  }, [props.bundle.open, props.bundle.lines.length]);
  const {
    bundle,
    tableDisplay,
    preview,
    needsSubCategory,
    mainOptions,
    subOptions,
    mainField,
    subField,
    payField,
    register,
    setValue,
    onConfirm,
  } = props;

  const onSwitchToggle = () => {
    const on = !bundle.open;
    bundle.setOpen(on);
    if (on) {
      setValue("dayCloseBundledExpenseMainCategory", "OUT_OPS");
      setValue("dayCloseBundledExpenseCategory", "OPS_MEAL");
      setValue("dayCloseBundledExpensePaymentSource", "REGISTER");
    } else {
      bundle.clearLines();
      setValue("dayCloseBundledExpenseAmount", "");
      setValue("dayCloseBundledExpenseMainCategory", "");
      setValue("dayCloseBundledExpenseCategory", "");
      setValue("dayCloseBundledExpenseDescription", "");
      setValue("dayCloseBundledExpensePaymentSource", "");
    }
  };

  return (
    <div className="min-w-0 space-y-2 rounded-xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/90 to-white px-2.5 py-2.5 shadow-sm ring-1 ring-zinc-950/[0.03] sm:px-3 sm:py-3 lg:col-span-2">
      {/* Tek satır header: başlık + (i) + toggle */}
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {t("branch.txDayCloseOptionalExpenseTitle")}
        </p>
        <button
          type="button"
          onClick={() => setHintOpen((v) => !v)}
          aria-label={t("branch.txDayCloseOptionalExpenseTitle")}
          aria-expanded={hintOpen}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8h.01" />
            <path d="M11 12h1v4h1" />
          </svg>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={bundle.open}
          aria-label={t("branch.txDayCloseBundledExpenseCheckbox")}
          onClick={onSwitchToggle}
          className={cn(
            "inline-flex h-6 w-[2.5rem] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
            bundle.open ? "justify-end bg-emerald-600" : "justify-start bg-zinc-300"
          )}
        >
          <span className="pointer-events-none size-5 rounded-full bg-white shadow-md ring-1 ring-zinc-950/10" />
        </button>
      </div>
      {hintOpen ? (
        <p className="border-t border-zinc-200/70 pt-1.5 text-[11px] leading-snug text-zinc-600">
          {t("branch.txDayCloseOptionalExpenseHint")}
        </p>
      ) : null}

      {/* Onaylı satırlar */}
      {bundle.open && tableDisplay.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("branch.txDayCloseBundledExpenseListTitle")}
          </p>
          <ul className="space-y-1.5 sm:hidden">
            {tableDisplay.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-zinc-900 leading-tight">
                    {row.mainLabel} · <span className="text-zinc-600 font-normal">{row.subLabel}</span>
                  </p>
                  <p className="truncate text-[10px] text-zinc-500 leading-tight">
                    {row.payLabel}
                    {row.description ? <> · {row.description}</> : null}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {row.amountFmt}
                </span>
                <button
                  type="button"
                  aria-label={t("branch.txDayCloseBundledExpenseRemove")}
                  onClick={() => bundle.removeLine(row.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm sm:block">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/95 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2.5 pl-3 sm:px-3">
                    {t("branch.txDayCloseBundledExpenseTableType")}
                  </th>
                  <th className="px-2 py-2.5 sm:px-3">
                    {t("branch.txDayCloseBundledExpenseTableSub")}
                  </th>
                  <th className="px-2 py-2.5 sm:px-3">
                    {t("branch.txDayCloseBundledExpenseTablePay")}
                  </th>
                  <th className="px-2 py-2.5 text-right sm:px-3">
                    {t("branch.txDayCloseBundledExpenseTableAmount")}
                  </th>
                  <th className="hidden min-w-[6rem] px-2 py-2.5 lg:table-cell lg:px-3">
                    {t("branch.txDayCloseBundledExpenseTableNote")}
                  </th>
                  <th className="w-10 px-2 py-2.5 pr-3 text-right sm:px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tableDisplay.map((row) => (
                  <tr key={row.id} className="align-top text-zinc-800">
                    <td className="px-2 py-2.5 pl-3 font-medium sm:px-3">
                      {row.mainLabel}
                    </td>
                    <td className="px-2 py-2.5 text-zinc-600 sm:px-3">{row.subLabel}</td>
                    <td className="px-2 py-2.5 text-zinc-600 sm:px-3">{row.payLabel}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums sm:px-3">
                      {row.amountFmt}
                    </td>
                    <td className="hidden max-w-[10rem] truncate px-2 py-2.5 text-xs text-zinc-500 lg:table-cell lg:px-3">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-2 py-2 pr-3 sm:px-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-[44px] min-w-[44px] shrink-0 px-3 text-sm text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => bundle.removeLine(row.id)}
                      >
                        {t("branch.txDayCloseBundledExpenseRemove")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Max uyarısı */}
      {bundle.open && bundle.atCapacity ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-950">
          {t("branch.txDayCloseBundledExpenseMax")}
        </p>
      ) : null}

      {/* Onaydan sonra: yeni gider ekle butonu */}
      {bundle.open && !formOpen && bundle.lines.length > 0 && bundle.lines.length < DAY_CLOSE_BUNDLED_EXPENSE_MAX ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 hover:border-emerald-400 transition"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          {t("branch.txDayCloseBundledExpenseAddAnother")}
        </button>
      ) : null}

      {/* Yeni satır formu */}
      {bundle.open && formOpen && bundle.lines.length < DAY_CLOSE_BUNDLED_EXPENSE_MAX ? (
        <div className="space-y-2 border-t border-zinc-200/80 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 col-span-2">
              <Input
                label={t("branch.txDayCloseOptionalExpenseAmount")}
                inputMode="decimal"
                autoComplete="off"
                {...register("dayCloseBundledExpenseAmount")}
              />
            </div>
            <div className={cn("min-w-0", !needsSubCategory ? "col-span-2" : "")}>
              <Select
                label={t("branch.txDayCloseBundledExpenseMainLabel")}
                labelRequired
                options={mainOptions}
                name={mainField.name}
                value={String(mainField.value ?? "")}
                onChange={(e) => mainField.onChange(e.target.value)}
                onBlur={mainField.onBlur}
                ref={mainField.ref}
              />
            </div>
            {needsSubCategory ? (
              <div className="min-w-0">
                <Select
                  label={t("branch.txDayCloseBundledExpenseSubLabel")}
                  labelRequired
                  options={subOptions}
                  name={subField.name}
                  value={String(subField.value ?? "")}
                  onChange={(e) => subField.onChange(e.target.value)}
                  onBlur={subField.onBlur}
                  ref={subField.ref}
                />
              </div>
            ) : null}
            <div className="min-w-0 col-span-2">
              <Select
                label={t("branch.expensePaymentLabel")}
                labelRequired
                options={[
                  { value: "", label: t("branch.expensePaymentUnset") },
                  { value: "REGISTER", label: t("branch.expensePayRegister") },
                  { value: "PATRON", label: t("branch.expensePayPatron") },
                ]}
                name={payField.name}
                value={String(payField.value ?? "")}
                onChange={(e) => payField.onChange(e.target.value)}
                onBlur={payField.onBlur}
                ref={payField.ref}
              />
            </div>
            <div className="min-w-0 col-span-2">
              {!descOpen ? (
                <button
                  type="button"
                  onClick={() => setDescOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  <span aria-hidden>+</span>
                  {t("branch.txDayCloseOptionalExpenseDescription")}
                </button>
              ) : (
                <Input
                  label={t("branch.txDayCloseOptionalExpenseDescription")}
                  {...register("dayCloseBundledExpenseDescription")}
                />
              )}
            </div>
          </div>
          {preview?.incomplete ? (
            <p className="text-xs text-amber-900/90">
              {t("branch.txDayCloseBundledExpensePreviewIncomplete")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={
              !preview || preview.incomplete || bundle.atCapacity
            }
            onClick={onConfirm}
          >
            {t("branch.txDayCloseBundledExpenseConfirm")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
