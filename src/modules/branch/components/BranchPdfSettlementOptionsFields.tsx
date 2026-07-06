"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import type {
  BranchPdfDetailMode,
  BranchSettlementPdfOptions,
} from "@/modules/personnel/lib/personnel-settlement-print";
import { Switch } from "@/shared/ui/Switch";
import type { ReactNode } from "react";

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
    <div className="flex flex-col gap-0.5 py-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] leading-tight text-zinc-800">
          {label}
        </label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {hint ? <p className="text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50">
      <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      <div className="divide-y divide-zinc-100 px-3">{children}</div>
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
      "min-h-9 flex-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
      active
        ? "border-violet-400 bg-violet-50 text-violet-900"
        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
      disabled && "pointer-events-none opacity-45"
    );
  return (
    <div className={cn("pb-2 pt-0", disabled && "opacity-50")}>
      <p id={`${idPrefix}-label`} className="mb-1 text-xs font-medium text-zinc-600">
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
    <div className="flex flex-col gap-2">
      <Section title={t("branch.branchPdfSectionGroupBranch")}>
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
        <OptRow
          id="bp-cari"
          label={t("branch.branchPdfOptCurrentAccount")}
          hint={t("branch.branchPdfOptCurrentAccountHint")}
          checked={value.includeBranchCurrentAccount}
          onCheckedChange={(v) => patch({ includeBranchCurrentAccount: v })}
        />
      </Section>

      <Section title={t("branch.branchPdfSectionGroupPersonnel")}>
        <OptRow
          id="bp-personnel"
          label={t("branch.branchPdfOptPersonnelCombined")}
          checked={value.includeAdvances && value.includePersonnelNonAdvanceExpenses}
          onCheckedChange={(v) =>
            patch({ includeAdvances: v, includePersonnelNonAdvanceExpenses: v })
          }
        />
        <DetailModeToggle
          idPrefix="bp-personnel-mode"
          groupLabel={t("branch.branchPdfPersonnelCombinedListMode")}
          value={value.advancesDetailMode}
          onChange={(mode) =>
            patch({ advancesDetailMode: mode, personnelExpensesDetailMode: mode })
          }
          disabled={
            !(value.includeAdvances && value.includePersonnelNonAdvanceExpenses)
          }
        />
        <OptRow
          id="bp-sal"
          label={t("branch.branchPdfOptPersonnelSalary")}
          checked={value.includePersonnelSalaryCost}
          onCheckedChange={(v) => patch({ includePersonnelSalaryCost: v })}
        />
      </Section>

      <Section title={t("branch.branchPdfSectionGroupStock")}>
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
        <OptRow
          id="bp-stock-group"
          label={t("branch.branchPdfOptStockGroupByParent")}
          hint={t("branch.branchPdfOptStockGroupByParentHint")}
          checked={value.stockGroupByParent}
          onCheckedChange={(v) => patch({ stockGroupByParent: v })}
          disabled={!value.includeStockInbound}
        />
      </Section>

      <Section title={t("branch.branchPdfSectionGroupOther")}>
        <OptRow
          id="bp-notes"
          label={t("branch.branchPdfOptNotes")}
          checked={value.includeNotes}
          onCheckedChange={(v) => patch({ includeNotes: v })}
        />
      </Section>
    </div>
  );
}
