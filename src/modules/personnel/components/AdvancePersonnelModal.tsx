"use client";

import { useI18n } from "@/i18n/context";
import { branchKeys, useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchBranchHeldRegisterCashByPerson } from "@/modules/branch/api/branches-api";
import { useCreateAdvance } from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Personnel } from "@/types/personnel";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  currencySelectOptions,
  DEFAULT_CURRENCY,
} from "@/shared/lib/iso4217-currencies";
import { localIsoDate, localIsoDateTime } from "@/shared/lib/local-iso-date";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

type FormValues = {
  personnelId: string;
  branchId: string;
  sourcePersonnelId: string;
  sourceType: string;
  currencyCode: string;
  advanceDate: string;
  effectiveYear: string;
  amount: string;
  description: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel[];
  /** Açılışta kişi seçili gelsin (tablo/karttan hızlı avans). */
  initialPersonnelId?: number | null;
  /**
   * false: yalnızca kasadan (CASH) avans — gün sonu kasiyeri / delegeli akış; patron ve zimmetteki kasa kaynağı gizlenir.
   * @default true
   */
  allowHeldRegisterCashAdvance?: boolean;
};

const TITLE_ID = "advance-title";

function currentCalendarYear(): string {
  return String(new Date().getFullYear());
}

export function AdvancePersonnelModal({
  open,
  onClose,
  personnel,
  initialPersonnelId = null,
  allowHeldRegisterCashAdvance = true,
}: Props) {
  const { t, locale } = useI18n();
  const [hintOpen, setHintOpen] = useState(false);
  const { data: branches = [] } = useBranchesList();
  const createAdvance = useCreateAdvance();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    setValue,
    setFocus,
    getValues,
    trigger,
  } = useForm<FormValues>({
    defaultValues: {
      personnelId: "",
      branchId: "",
      sourcePersonnelId: "",
      sourceType: allowHeldRegisterCashAdvance === false ? "CASH" : "PATRON",
      currencyCode: DEFAULT_CURRENCY,
      advanceDate: localIsoDateTime(),
      effectiveYear: currentCalendarYear(),
      amount: "",
      description: "",
    },
  });

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.advanceSelectBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const allowExtendedAdvanceSources = allowHeldRegisterCashAdvance !== false;
  const sourceOptions: SelectOption[] = useMemo(() => {
    const cash = { value: "CASH", label: t("personnel.sourceCash") } as const;
    if (!allowExtendedAdvanceSources) return [cash];
    return [
      cash,
      { value: "PATRON", label: t("personnel.sourcePatron") },
      { value: "PERSONNEL_HELD_REGISTER_CASH", label: t("personnel.sourceHeldRegisterCash") },
    ];
  }, [t, allowExtendedAdvanceSources]);

  const { field: personnelField } = useController({
    name: "personnelId",
    control,
    defaultValue: "",
    rules: { required: t("common.required") },
  });

  const { field: branchField } = useController({
    name: "branchId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        const st = (getValues("sourceType") || "CASH").toUpperCase();
        const needsBranch = st === "CASH";
        if (!needsBranch) return true;
        const n = Number(v);
        if (!v || Number.isNaN(n) || n < 1) {
          return t("personnel.advanceBranchInvalid");
        }
        return true;
      },
    },
  });

  const { field: sourceField } = useController({
    name: "sourceType",
    control,
    defaultValue: allowHeldRegisterCashAdvance === false ? "CASH" : "PATRON",
    rules: { required: t("common.required") },
  });

  const { field: sourcePersonnelField } = useController({
    name: "sourcePersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (!isHeldRegisterSource) return true;
        const n = Number(v);
        if (!v || Number.isNaN(n) || n < 1) return t("personnel.advanceHeldRegisterSourcePersonRequired");
        return true;
      },
    },
  });

  const { field: currencyField } = useController({
    name: "currencyCode",
    control,
    defaultValue: DEFAULT_CURRENCY,
    rules: { required: t("common.required") },
  });

  const { field: advanceDateField, fieldState: advanceDateFieldState } = useController({
    name: "advanceDate",
    control,
    defaultValue: localIsoDateTime(),
    rules: { required: t("common.required") },
  });

  const { field: amountField } = useController({
    name: "amount",
    control,
    defaultValue: "",
    rules: {
      required: t("common.required"),
      validate: (v) => {
        const n = parseLocaleAmount(String(v), locale);
        if (!Number.isFinite(n) || n <= 0) return t("personnel.positiveAmount");
        return true;
      },
    },
  });

  const personnelId = useWatch({ control, name: "personnelId" });
  const sourceTypeWatch = useWatch({ control, name: "sourceType" });
  const sourcePersonnelIdWatch = useWatch({ control, name: "sourcePersonnelId" });
  const currencyCodeWatch = useWatch({ control, name: "currencyCode" });
  const advanceDateWatch = useWatch({ control, name: "advanceDate" });
  const selectedPersonnel = personnel.find((x) => String(x.id) === personnelId);
  const isHeldRegisterSource = (sourceTypeWatch || "CASH").toUpperCase() === "PERSONNEL_HELD_REGISTER_CASH";
  /** Held-register bakiyesi işlem gününe kadar; `datetime-local` → YYYY-MM-DD */
  const heldRegisterAsOfYmd = useMemo(() => {
    const raw = String(advanceDateWatch ?? "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localIsoDate();
  }, [advanceDateWatch]);

  const heldRegisterCashByBranchQueries = useQueries({
    queries: branches.map((branch) => ({
      queryKey: branchKeys.heldRegisterCashByPerson(branch.id, heldRegisterAsOfYmd),
      queryFn: () => fetchBranchHeldRegisterCashByPerson(branch.id, heldRegisterAsOfYmd),
      enabled: open && isHeldRegisterSource && branch.id > 0,
      staleTime: 30_000,
    })),
  });

  const heldRegisterSourceRows = useMemo(() => {
    const byPersonnelId = new Map<number, { amount: number; fullName: string }>();
    for (const q of heldRegisterCashByBranchQueries) {
      for (const row of q.data ?? []) {
        if (row.personnelId == null) continue;
        const amount = Number(row.amount) || 0;
        if (amount <= 0.009) continue;
        const current = byPersonnelId.get(row.personnelId) ?? { amount: 0, fullName: "" };
        byPersonnelId.set(row.personnelId, {
          amount: current.amount + amount,
          fullName: current.fullName || String(row.fullName ?? "").trim(),
        });
      }
    }
    return [...byPersonnelId.entries()]
      .map(([personnelId, v]) => ({ personnelId, amount: v.amount, fullName: v.fullName }))
      .filter((x) => x.amount > 0.009);
  }, [heldRegisterCashByBranchQueries]);

  const eligiblePersonnelIdsForHeldRegister = useMemo(() => {
    const set = new Set<number>();
    for (const row of heldRegisterSourceRows) {
      set.add(row.personnelId);
    }
    return set;
  }, [heldRegisterSourceRows]);

  const isHeldRegisterSourceLoading = useMemo(
    () => heldRegisterCashByBranchQueries.some((q) => q.isPending),
    [heldRegisterCashByBranchQueries]
  );

  useEffect(() => {
    void trigger("branchId");
  }, [sourceTypeWatch, trigger]);

  useEffect(() => {
    if (!open || allowExtendedAdvanceSources) return;
    const st = (sourceTypeWatch || "CASH").toUpperCase();
    if (st !== "CASH") setValue("sourceType", "CASH", { shouldValidate: true });
  }, [open, allowExtendedAdvanceSources, sourceTypeWatch, setValue]);

  useEffect(() => {
    if (!personnelId) return;
    const p = personnel.find((x) => String(x.id) === personnelId);
    if (p?.branchId != null && p.branchId > 0) {
      setValue("branchId", String(p.branchId), { shouldValidate: true });
    } else {
      setValue("branchId", "", { shouldValidate: true });
    }
  }, [personnelId, personnel, setValue]);

  useEffect(() => {
    const base = {
      branchId: "",
      sourcePersonnelId: "",
      sourceType: allowHeldRegisterCashAdvance === false ? "CASH" : "PATRON",
      currencyCode: DEFAULT_CURRENCY,
      advanceDate: localIsoDateTime(),
      effectiveYear: currentCalendarYear(),
      amount: "",
      description: "",
    };
    if (!open) {
      reset({ personnelId: "", ...base });
      return;
    }
    reset({
      personnelId:
        initialPersonnelId != null && initialPersonnelId > 0
          ? String(initialPersonnelId)
          : "",
      ...base,
    });
  }, [open, initialPersonnelId, reset]);

  useEffect(() => {
    if (!open) return;
    const field =
      initialPersonnelId != null && initialPersonnelId > 0 ? "amount" : "personnelId";
    const id = window.setTimeout(() => setFocus(field), 90);
    return () => window.clearTimeout(id);
  }, [open, initialPersonnelId, setFocus]);

  const recipientOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.selectPerson") },
      ...personnel.map((p) => ({
        value: String(p.id),
        label: personnelDisplayName(p),
      })),
    ],
    [personnel, t]
  );

  const sourcePersonnelOptions: SelectOption[] = useMemo(() => {
    const loc = locale === "tr" ? "tr" : "en";
    const currencyCode =
      String(currencyCodeWatch ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
    return [
      { value: "", label: t("personnel.selectPerson") },
      ...[...heldRegisterSourceRows]
      .sort((a, b) => {
        const pA = personnel.find((p) => p.id === a.personnelId);
        const pB = personnel.find((p) => p.id === b.personnelId);
        const nameA = pA ? personnelDisplayName(pA) : (a.fullName || `#${a.personnelId}`);
        const nameB = pB ? personnelDisplayName(pB) : (b.fullName || `#${b.personnelId}`);
        return nameA.localeCompare(nameB, loc);
      })
      .map((row) => {
        const p = personnel.find((x) => x.id === row.personnelId);
        const displayName = p
          ? personnelDisplayName(p)
          : (row.fullName || `#${row.personnelId}`);
        return {
          value: String(row.personnelId),
          label: `${displayName} (${formatLocaleAmount(row.amount, locale, currencyCode)})`,
        };
      }),
    ];
  }, [t, personnel, heldRegisterSourceRows, currencyCodeWatch, locale]);

  useEffect(() => {
    if (!isHeldRegisterSource) return;
    const selected = String(sourcePersonnelIdWatch ?? "").trim();
    if (!selected) return;
    const selectedId = Number.parseInt(selected, 10);
    if (!Number.isFinite(selectedId) || !eligiblePersonnelIdsForHeldRegister.has(selectedId)) {
      sourcePersonnelField.onChange("");
    }
  }, [
    isHeldRegisterSource,
    sourcePersonnelIdWatch,
    sourcePersonnelField,
    eligiblePersonnelIdsForHeldRegister,
  ]);

  const onSubmit = handleSubmit(async (values) => {
    const amount = parseLocaleAmount(values.amount, locale);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(t("personnel.positiveAmount"));
      return;
    }
    const pid = Number(values.personnelId);
    const st = (values.sourceType || "CASH").toUpperCase();
    const explicitRaw = String(values.branchId ?? "").trim();
    const explicitBranch = explicitRaw ? Number(explicitRaw) : NaN;
    const hasExplicitBranch =
      Number.isFinite(explicitBranch) && explicitBranch > 0;

    let branchIdForPayload: number | undefined;
    let sourcePersonnelIdForPayload: number | undefined;
    if (st === "CASH") {
      if (!hasExplicitBranch) {
        notify.error(t("personnel.advanceBranchInvalid"));
        return;
      }
      branchIdForPayload = explicitBranch;
    } else if (st === "PERSONNEL_HELD_REGISTER_CASH") {
      const sourcePid = Number(values.sourcePersonnelId);
      if (!Number.isFinite(sourcePid) || sourcePid <= 0) {
        notify.error(t("personnel.advanceHeldRegisterSourcePersonRequired"));
        return;
      }
      sourcePersonnelIdForPayload = sourcePid;
      if (hasExplicitBranch) branchIdForPayload = explicitBranch;
    } else if (hasExplicitBranch) {
      branchIdForPayload = explicitBranch;
    }

    const effectiveYear = Math.trunc(Number(values.effectiveYear));
    if (!Number.isFinite(effectiveYear) || effectiveYear < 1900 || effectiveYear > 9999) {
      notify.error(t("personnel.effectiveYearInvalid"));
      return;
    }
    try {
      await createAdvance.mutateAsync({
        personnelId: pid,
        ...(branchIdForPayload != null ? { branchId: branchIdForPayload } : {}),
        ...(sourcePersonnelIdForPayload != null ? { sourcePersonnelId: sourcePersonnelIdForPayload } : {}),
        sourceType: values.sourceType || "CASH",
        amount,
        currencyCode:
          values.currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY,
        advanceDate: values.advanceDate,
        effectiveYear,
        description: values.description.trim() || undefined,
      });
      notify.success(t("toast.advanceCreated"));
      reset({
        personnelId: "",
        branchId: "",
        sourcePersonnelId: "",
        sourceType: allowHeldRegisterCashAdvance === false ? "CASH" : "PATRON",
        currencyCode: DEFAULT_CURRENCY,
        advanceDate: localIsoDateTime(),
        effectiveYear: currentCalendarYear(),
        amount: "",
        description: "",
      });
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const resetForm = () =>
    reset({
      personnelId: "",
      branchId: "",
      sourcePersonnelId: "",
      sourceType: allowHeldRegisterCashAdvance === false ? "CASH" : "PATRON",
      currencyCode: DEFAULT_CURRENCY,
      advanceDate: localIsoDateTime(),
      effectiveYear: currentCalendarYear(),
      amount: "",
      description: "",
    });
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: createAdvance.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => {
      resetForm();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("personnel.advanceTitle")}
      description={undefined}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-xl"
    >
      <form onSubmit={onSubmit}>
        <ModalFormLayout
          body={
            <>
              <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5">
                <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8h.01" />
                    <path d="M11 12h1v4h1" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setHintOpen((v) => !v)}
                    aria-expanded={hintOpen}
                    aria-label={t("personnel.advanceHintInfoAria")}
                    className="text-left text-[11px] font-medium text-zinc-700 hover:text-zinc-900 leading-snug"
                  >
                    {hintOpen ? t("personnel.advanceHintInfoAria") : t("personnel.advanceHint")}
                  </button>
                  {hintOpen ? (
                    <p className="mt-1 text-[11px] leading-snug text-zinc-600">
                      {t("personnel.advanceHintDetail")}
                    </p>
                  ) : null}
                </div>
              </div>
              <FormSection>
                <Select
                  label={t("nav.personnel")}
                  labelRequired
                  options={recipientOptions}
                  name={personnelField.name}
                  value={String(personnelField.value ?? "")}
                  onChange={(e) => personnelField.onChange(e.target.value)}
                  onBlur={personnelField.onBlur}
                  ref={personnelField.ref}
                  error={errors.personnelId?.message}
                />
                {isHeldRegisterSource &&
                !isHeldRegisterSourceLoading &&
                (sourcePersonnelOptions.length <= 1) ? (
                  <p className="text-xs text-zinc-500">{t("personnel.advanceHeldRegisterNoEligiblePersonnel")}</p>
                ) : null}
                <Select
                  label={t("personnel.sourceType")}
                  labelRequired
                  options={sourceOptions}
                  name={sourceField.name}
                  value={String(sourceField.value ?? "CASH")}
                  onChange={(e) => sourceField.onChange(e.target.value)}
                  onBlur={sourceField.onBlur}
                  ref={sourceField.ref}
                  error={errors.sourceType?.message}
                />
                {(sourceTypeWatch || "CASH").toUpperCase() === "CASH" ? (
                  <Select
                    label={t("personnel.branchForAdvance")}
                    labelRequired
                    options={branchOptions}
                    name={branchField.name}
                    value={String(branchField.value ?? "")}
                    onChange={(e) => branchField.onChange(e.target.value)}
                    onBlur={branchField.onBlur}
                    ref={branchField.ref}
                    error={errors.branchId?.message}
                  />
                ) : null}
                {isHeldRegisterSource ? (
                  <Select
                    label={t("personnel.advanceHeldRegisterSourcePersonLabel")}
                    labelRequired
                    options={sourcePersonnelOptions}
                    name={sourcePersonnelField.name}
                    value={String(sourcePersonnelField.value ?? "")}
                    onChange={(e) => sourcePersonnelField.onChange(e.target.value)}
                    onBlur={sourcePersonnelField.onBlur}
                    ref={sourcePersonnelField.ref}
                    error={errors.sourcePersonnelId?.message}
                  />
                ) : null}
                {(sourceTypeWatch || "CASH").toUpperCase() === "CASH" &&
                selectedPersonnel?.branchId != null &&
                selectedPersonnel.branchId > 0 ? (
                  <p className="text-xs text-zinc-500">{t("personnel.advanceBranchPrefilledHint")}</p>
                ) : null}
              </FormSection>
              <FormSection>
                <DateField
                  label={t("personnel.advanceDate")}
                  labelRequired
                  required
                  mode="datetime-local"
                  name={advanceDateField.name}
                  value={advanceDateField.value}
                  onChange={advanceDateField.onChange}
                  onBlur={advanceDateField.onBlur}
                  ref={advanceDateField.ref}
                  error={advanceDateFieldState.error?.message}
                />
                {selectedPersonnel && !selectedPersonnel.seasonArrivalDate ? (
                  <Input
                    label={t("personnel.effectiveYear")}
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={9999}
                    step={1}
                    labelRequired
                    required
                    {...register("effectiveYear", {
                      required: t("common.required"),
                      validate: (v) => {
                        const n = Math.trunc(Number(v));
                        if (!Number.isFinite(n) || n < 1900 || n > 9999) {
                          return t("personnel.effectiveYearInvalid");
                        }
                        return true;
                      },
                    })}
                    error={errors.effectiveYear?.message}
                  />
                ) : null}
                <Select
                  label={t("personnel.advanceCurrency")}
                  labelRequired
                  options={currencyOptions}
                  name={currencyField.name}
                  value={String(currencyField.value ?? DEFAULT_CURRENCY)}
                  onChange={(e) => currencyField.onChange(e.target.value)}
                  onBlur={currencyField.onBlur}
                  ref={currencyField.ref}
                  error={errors.currencyCode?.message}
                />
                <Input
                  label={t("personnel.amount")}
                  labelRequired
                  inputMode="decimal"
                  autoComplete="off"
                  name={amountField.name}
                  value={amountField.value}
                  onChange={(e) => amountField.onChange(e.target.value)}
                  onBlur={(e) => {
                    const n = parseLocaleAmount(e.target.value, locale);
                    if (Number.isFinite(n) && n > 0) {
                      const code = String(currencyCodeWatch ?? DEFAULT_CURRENCY).trim();
                      amountField.onChange(formatLocaleAmount(n, locale, code || DEFAULT_CURRENCY));
                    }
                    amountField.onBlur();
                  }}
                  ref={amountField.ref}
                  error={errors.amount?.message}
                />
                <Input label={t("personnel.note")} {...register("description")} error={errors.description?.message} />
              </FormSection>
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={createAdvance.isPending}>
                {createAdvance.isPending ? t("common.saving") : t("common.submit")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
