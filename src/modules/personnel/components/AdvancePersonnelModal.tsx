"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useBranchHeldRegisterCashByPerson } from "@/modules/branch/hooks/useBranchQueries";
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
import { useEffect, useMemo } from "react";
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
}: Props) {
  const { t, locale } = useI18n();
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
      sourceType: "CASH",
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

  const sourceOptions: SelectOption[] = useMemo(
    () => [
      { value: "CASH", label: t("personnel.sourceCash") },
      { value: "PATRON", label: t("personnel.sourcePatron") },
      { value: "PERSONNEL_POCKET", label: t("personnel.sourcePersonnelPocket") },
    ],
    [t]
  );

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
        const needsBranch = st === "CASH" || st === "PERSONNEL_POCKET";
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
    defaultValue: "CASH",
    rules: { required: t("common.required") },
  });

  const { field: sourcePersonnelField } = useController({
    name: "sourcePersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (!isPersonnelPocketSource) return true;
        const n = Number(v);
        if (!v || Number.isNaN(n) || n < 1) return t("personnel.advancePocketSourcePersonRequired");
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
  const branchIdWatch = useWatch({ control, name: "branchId" });
  const sourcePersonnelIdWatch = useWatch({ control, name: "sourcePersonnelId" });
  const currencyCodeWatch = useWatch({ control, name: "currencyCode" });
  const selectedPersonnel = personnel.find((x) => String(x.id) === personnelId);
  const selectedBranchId = Number.parseInt(String(branchIdWatch ?? "").trim(), 10);
  const isPersonnelPocketSource = (sourceTypeWatch || "CASH").toUpperCase() === "PERSONNEL_POCKET";

  const heldRegisterCashByPerson = useBranchHeldRegisterCashByPerson(
    Number.isFinite(selectedBranchId) && selectedBranchId > 0 ? selectedBranchId : null,
    localIsoDate(),
    open && isPersonnelPocketSource
  );

  const eligiblePersonnelIdsForPocket = useMemo(() => {
    const set = new Set<number>();
    for (const row of heldRegisterCashByPerson.data ?? []) {
      const amount = Number(row.amount) || 0;
      if (row.personnelId == null) continue;
      if (amount > 0.009) set.add(row.personnelId);
    }
    return set;
  }, [heldRegisterCashByPerson.data]);

  useEffect(() => {
    void trigger("branchId");
  }, [sourceTypeWatch, trigger]);

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
      sourceType: "CASH",
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
    if (!Number.isFinite(selectedBranchId) || selectedBranchId <= 0) {
      return [{ value: "", label: t("personnel.advancePocketSelectBranchFirst") }];
    }
    const filtered = personnel.filter(
      (p) => p.branchId === selectedBranchId && eligiblePersonnelIdsForPocket.has(p.id)
    );
    return [
      { value: "", label: t("personnel.selectPerson") },
      ...filtered.map((p) => ({
        value: String(p.id),
        label: personnelDisplayName(p),
      })),
    ];
  }, [t, personnel, selectedBranchId, eligiblePersonnelIdsForPocket]);

  useEffect(() => {
    if (!isPersonnelPocketSource) return;
    const selected = String(sourcePersonnelIdWatch ?? "").trim();
    if (!selected) return;
    const selectedId = Number.parseInt(selected, 10);
    if (!Number.isFinite(selectedId) || !eligiblePersonnelIdsForPocket.has(selectedId)) {
      sourcePersonnelField.onChange("");
    }
  }, [
    isPersonnelPocketSource,
    sourcePersonnelIdWatch,
    sourcePersonnelField,
    eligiblePersonnelIdsForPocket,
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
    if (st === "CASH" || st === "PERSONNEL_POCKET") {
      if (!hasExplicitBranch) {
        notify.error(t("personnel.advanceBranchInvalid"));
        return;
      }
      branchIdForPayload = explicitBranch;
      if (st === "PERSONNEL_POCKET") {
        const sourcePid = Number(values.sourcePersonnelId);
        if (!Number.isFinite(sourcePid) || sourcePid <= 0) {
          notify.error(t("personnel.advancePocketSourcePersonRequired"));
          return;
        }
        sourcePersonnelIdForPayload = sourcePid;
      }
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
        sourceType: "CASH",
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
      sourceType: "CASH",
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
      description={t("personnel.advanceHint")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-xl"
    >
      <form onSubmit={onSubmit}>
        <ModalFormLayout
          body={
            <>
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
                {isPersonnelPocketSource &&
                Number.isFinite(selectedBranchId) &&
                selectedBranchId > 0 &&
                !heldRegisterCashByPerson.isPending &&
                (sourcePersonnelOptions.length <= 1) ? (
                  <p className="text-xs text-zinc-500">{t("personnel.advancePocketNoEligiblePersonnel")}</p>
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
                <Select
                  label={t("personnel.branchForAdvance")}
                  labelRequired={["CASH", "PERSONNEL_POCKET"].includes((sourceTypeWatch || "CASH").toUpperCase())}
                  options={branchOptions}
                  name={branchField.name}
                  value={String(branchField.value ?? "")}
                  onChange={(e) => branchField.onChange(e.target.value)}
                  onBlur={branchField.onBlur}
                  ref={branchField.ref}
                  error={errors.branchId?.message}
                />
                {isPersonnelPocketSource ? (
                  <Select
                    label={t("personnel.advancePocketSourcePersonLabel")}
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
                {selectedPersonnel?.branchId != null && selectedPersonnel.branchId > 0 ? (
                  <p className="text-xs text-zinc-500">{t("personnel.advanceBranchPrefilledHint")}</p>
                ) : null}
                {(sourceTypeWatch || "CASH").toUpperCase() === "PATRON" ? (
                  <p className="text-xs text-zinc-500">{t("personnel.advanceBranchOptionalWhenNotCash")}</p>
                ) : null}
              </FormSection>
              <FormSection>
                <DateField
                  label={t("personnel.advanceDate")}
                  labelRequired
                  required
                  mode="datetime-local"
                  {...register("advanceDate", { required: t("common.required") })}
                  error={errors.advanceDate?.message}
                />
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
                <p className="-mt-0.5 text-xs leading-relaxed text-zinc-500">{t("personnel.effectiveYearHint")}</p>
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
