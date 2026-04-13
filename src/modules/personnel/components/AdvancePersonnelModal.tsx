"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useCreateAdvance } from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Personnel } from "@/types/personnel";
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
import { localIsoDateTime } from "@/shared/lib/local-iso-date";
import { useEffect, useMemo } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

type FormValues = {
  personnelId: string;
  branchId: string;
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
    formState: { errors },
    reset,
    setValue,
    setFocus,
    getValues,
    trigger,
  } = useForm<FormValues>({
    defaultValues: {
      personnelId: "",
      branchId: "",
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
        if (st !== "CASH") return true;
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
  const currencyCodeWatch = useWatch({ control, name: "currencyCode" });
  const selectedPersonnel = personnel.find((x) => String(x.id) === personnelId);

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

  const options: SelectOption[] = [
    { value: "", label: t("personnel.selectPerson") },
    ...personnel.map((p) => ({
      value: String(p.id),
      label: personnelDisplayName(p),
    })),
  ];

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
    if (st === "CASH") {
      if (!hasExplicitBranch) {
        notify.error(t("personnel.advanceBranchInvalid"));
        return;
      }
      branchIdForPayload = explicitBranch;
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("personnel.advanceTitle")}
      description={t("personnel.advanceHint")}
      closeButtonLabel={t("common.close")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Select
          label={t("nav.personnel")}
          labelRequired
          options={options}
          name={personnelField.name}
          value={String(personnelField.value ?? "")}
          onChange={(e) => personnelField.onChange(e.target.value)}
          onBlur={personnelField.onBlur}
          ref={personnelField.ref}
          error={errors.personnelId?.message}
        />
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
          labelRequired={(sourceTypeWatch || "CASH").toUpperCase() === "CASH"}
          options={branchOptions}
          name={branchField.name}
          value={String(branchField.value ?? "")}
          onChange={(e) => branchField.onChange(e.target.value)}
          onBlur={branchField.onBlur}
          ref={branchField.ref}
          error={errors.branchId?.message}
        />
        {selectedPersonnel?.branchId != null && selectedPersonnel.branchId > 0 ? (
          <p className="text-xs text-zinc-500">{t("personnel.advanceBranchPrefilledHint")}</p>
        ) : null}
        {(sourceTypeWatch || "CASH").toUpperCase() !== "CASH" ? (
          <p className="text-xs text-zinc-500">
            {t("personnel.advanceBranchOptionalWhenNotCash")}
          </p>
        ) : null}
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
        <p className="-mt-0.5 text-xs leading-relaxed text-zinc-500">
          {t("personnel.effectiveYearHint")}
        </p>
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
              amountField.onChange(
                formatLocaleAmount(n, locale, code || DEFAULT_CURRENCY)
              );
            }
            amountField.onBlur();
          }}
          ref={amountField.ref}
          error={errors.amount?.message}
        />
        <Input
          label={t("personnel.note")}
          {...register("description")}
          error={errors.description?.message}
        />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:min-w-[120px]"
            onClick={() => {
              reset({
                personnelId: "",
                branchId: "",
                sourceType: "CASH",
                currencyCode: DEFAULT_CURRENCY,
                advanceDate: localIsoDateTime(),
                effectiveYear: currentCalendarYear(),
                amount: "",
                description: "",
              });
              onClose();
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="sm:min-w-[120px]"
            disabled={createAdvance.isPending}
          >
            {createAdvance.isPending ? t("common.saving") : t("common.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
