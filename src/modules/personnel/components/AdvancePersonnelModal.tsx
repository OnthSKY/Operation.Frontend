"use client";

import { useI18n } from "@/i18n/context";
import { useCreateAdvance } from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Personnel } from "@/types/personnel";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

type FormValues = {
  personnelId: string;
  branchId: string;
  sourceType: string;
  advanceDate: string;
  effectiveDate: string;
  amount: string;
  description: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel[];
};

const TITLE_ID = "advance-title";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfCurrentMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function AdvancePersonnelModal({ open, onClose, personnel }: Props) {
  const { t } = useI18n();
  const createAdvance = useCreateAdvance();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    setFocus,
  } = useForm<FormValues>({
    defaultValues: {
      personnelId: "",
      branchId: "",
      sourceType: "CASH",
      advanceDate: todayIsoDate(),
      effectiveDate: firstOfCurrentMonthIso(),
      amount: "",
      description: "",
    },
  });

  const personnelId = useWatch({ control, name: "personnelId" });
  const selectedPersonnel = personnel.find((x) => String(x.id) === personnelId);

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
    if (!open) {
      reset({
        personnelId: "",
        branchId: "",
        sourceType: "CASH",
        advanceDate: todayIsoDate(),
        effectiveDate: firstOfCurrentMonthIso(),
        amount: "",
        description: "",
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setFocus("personnelId"), 80);
    return () => window.clearTimeout(id);
  }, [open, setFocus]);

  const options: SelectOption[] = [
    { value: "", label: t("personnel.selectPerson") },
    ...personnel.map((p) => ({
      value: String(p.id),
      label: personnelDisplayName(p),
    })),
  ];

  const sourceOptions: SelectOption[] = [
    { value: "CASH", label: t("personnel.sourceCash") },
    { value: "BANK", label: t("personnel.sourceBank") },
  ];

  const onSubmit = handleSubmit(async (values) => {
    const amount = Number(values.amount);
    const pid = Number(values.personnelId);
    const branchId = Number(values.branchId);
    const person = personnel.find((x) => x.id === pid);
    if (person?.branchId == null || person.branchId <= 0) {
      notify.error(t("personnel.advanceNeedsBranch"));
      return;
    }
    if (branchId !== person.branchId) {
      notify.error(t("personnel.branchInvalid"));
      return;
    }
    try {
      await createAdvance.mutateAsync({
        personnelId: pid,
        branchId,
        sourceType: values.sourceType || "CASH",
        amount,
        advanceDate: values.advanceDate,
        effectiveDate: values.effectiveDate,
        description: values.description.trim() || undefined,
      });
      notify.success(t("toast.advanceCreated"));
      reset({
        personnelId: "",
        branchId: "",
        sourceType: "CASH",
        advanceDate: todayIsoDate(),
        effectiveDate: firstOfCurrentMonthIso(),
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
          options={options}
          {...register("personnelId", { required: t("common.required") })}
          error={errors.personnelId?.message}
        />
        <Input
          label={t("personnel.branchForAdvance")}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          readOnly={selectedPersonnel?.branchId != null && selectedPersonnel.branchId > 0}
          {...register("branchId", {
            required: t("common.required"),
            validate: (v) => {
              const n = Number(v);
              if (Number.isNaN(n) || n < 1) return t("personnel.branchInvalid");
              return true;
            },
          })}
          error={errors.branchId?.message}
        />
        <Select
          label={t("personnel.sourceType")}
          options={sourceOptions}
          {...register("sourceType", { required: true })}
          error={errors.sourceType?.message}
        />
        <Input
          label={t("personnel.advanceDate")}
          type="date"
          {...register("advanceDate", { required: t("common.required") })}
          error={errors.advanceDate?.message}
        />
        <Input
          label={t("personnel.effectiveDate")}
          type="date"
          {...register("effectiveDate", { required: t("common.required") })}
          error={errors.effectiveDate?.message}
        />
        <Input
          label={t("personnel.amount")}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          {...register("amount", {
            required: t("common.required"),
            validate: (v) => {
              const n = Number(v);
              if (Number.isNaN(n) || n <= 0) return t("personnel.positiveAmount");
              return true;
            },
          })}
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
                advanceDate: todayIsoDate(),
                effectiveDate: firstOfCurrentMonthIso(),
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
