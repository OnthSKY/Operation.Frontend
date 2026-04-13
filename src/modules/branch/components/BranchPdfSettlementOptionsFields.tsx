"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import type {
  BranchPdfDetailMode,
  BranchSettlementPdfOptions,
} from "@/modules/personnel/lib/personnel-settlement-print";
import { Switch } from "@/shared/ui/Switch";

type Props = {
  value: BranchSettlementPdfOptions;
  onChange: (next: BranchSettlementPdfOptions) => void;
};

function OptRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-zinc-800">
          {label}
        </label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {hint ? <p className="text-xs leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function DetailModeToggle({
  groupLabel,
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  groupLabel: string;
  value: BranchPdfDetailMode;
  onChange: (v: BranchPdfDetailMode) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const { t } = useI18n();
  const btn = (active: boolean) =>
    cn(
      "min-h-9 flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
      active
        ? "border-violet-400 bg-violet-50 text-violet-900"
        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
      disabled && "pointer-events-none opacity-45"
    );
  return (
    <div className={cn("pb-3 pt-0", disabled && "opacity-50")}>
      <p id={`${idPrefix}-label`} className="mb-1.5 text-xs font-medium text-zinc-600">
        {groupLabel}
      </p>
      <div
        role="group"
        aria-labelledby={`${idPrefix}-label`}
        className="flex gap-2"
      >
        <button
          type="button"
          id={`${idPrefix}-detail`}
          role="radio"
          aria-checked={value === "detail"}
          className={btn(value === "detail")}
          disabled={disabled}
          onClick={() => onChange("detail")}
        >
          {t("branch.branchPdfModeDetail")}
        </button>
        <button
          type="button"
          id={`${idPrefix}-summary`}
          role="radio"
          aria-checked={value === "summary"}
          className={btn(value === "summary")}
          disabled={disabled}
          onClick={() => onChange("summary")}
        >
          {t("branch.branchPdfModeSummary")}
        </button>
      </div>
    </div>
  );
}

export function BranchPdfSettlementOptionsFields({ value, onChange }: Props) {
  const { t } = useI18n();
  const patch = (p: Partial<BranchSettlementPdfOptions>) => onChange({ ...value, ...p });

  return (
    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3">
      <OptRow
        id="bp-stock-in"
        label={t("branch.branchPdfOptStockInbound")}
        checked={value.includeStockInbound}
        onCheckedChange={(v) => patch({ includeStockInbound: v })}
      />
      <OptRow
        id="bp-stock-price"
        label={t("branch.branchPdfOptStockPricing")}
        checked={value.stockShowPricing}
        onCheckedChange={(v) => patch({ stockShowPricing: v })}
        disabled={!value.includeStockInbound}
      />
      <div>
        <OptRow
          id="bp-adv"
          label={t("branch.branchPdfOptAdvances")}
          checked={value.includeAdvances}
          onCheckedChange={(v) => patch({ includeAdvances: v })}
        />
        <DetailModeToggle
          idPrefix="bp-adv-mode"
          groupLabel={t("branch.branchPdfAdvancesListMode")}
          value={value.advancesDetailMode}
          onChange={(advancesDetailMode) => patch({ advancesDetailMode })}
          disabled={!value.includeAdvances}
        />
      </div>
      <div>
        <OptRow
          id="bp-pexp"
          label={t("branch.branchPdfOptPersonnelExpenses")}
          checked={value.includePersonnelNonAdvanceExpenses}
          onCheckedChange={(v) => patch({ includePersonnelNonAdvanceExpenses: v })}
        />
        <DetailModeToggle
          idPrefix="bp-pexp-mode"
          groupLabel={t("branch.branchPdfPersonnelExpensesListMode")}
          value={value.personnelExpensesDetailMode}
          onChange={(personnelExpensesDetailMode) => patch({ personnelExpensesDetailMode })}
          disabled={!value.includePersonnelNonAdvanceExpenses}
        />
      </div>
      <OptRow
        id="bp-sal"
        label={t("branch.branchPdfOptPersonnelSalary")}
        checked={value.includePersonnelSalaryCost}
        onCheckedChange={(v) => patch({ includePersonnelSalaryCost: v })}
      />
      <div>
        <OptRow
          id="bp-reg"
          label={t("branch.branchPdfOptRegister")}
          checked={value.includeRegisterLedger}
          onCheckedChange={(v) => patch({ includeRegisterLedger: v })}
        />
        <DetailModeToggle
          idPrefix="bp-reg-mode"
          groupLabel={t("branch.branchPdfRegisterListMode")}
          value={value.registerLedgerDetailMode}
          onChange={(registerLedgerDetailMode) => patch({ registerLedgerDetailMode })}
          disabled={!value.includeRegisterLedger}
        />
      </div>
      <OptRow
        id="bp-notes"
        label={t("branch.branchPdfOptNotes")}
        checked={value.includeNotes}
        onCheckedChange={(v) => patch({ includeNotes: v })}
      />
    </div>
  );
}
