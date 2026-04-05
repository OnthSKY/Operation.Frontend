"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useCreatePersonnel } from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  fullName: string;
  hireDate: string;
  salary: string;
  branchId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const TITLE_ID = "add-personnel-title";

export function AddPersonnelModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.branchNone") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );
  const createPersonnel = useCreatePersonnel();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      hireDate: "",
      salary: "",
      branchId: "",
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setFocus("fullName"), 80);
    return () => window.clearTimeout(id);
  }, [open, setFocus]);

  const onSubmit = handleSubmit(async (values) => {
    const salaryRaw = values.salary.trim();
    let salary: number | null | undefined;
    if (salaryRaw !== "") {
      const n = Number(salaryRaw);
      if (Number.isNaN(n) || n < 0) {
        notify.error(t("personnel.salaryInvalid"));
        return;
      }
      salary = n;
    }

    const branchRaw = values.branchId.trim();
    let branchId: number | null | undefined;
    if (branchRaw !== "") {
      const n = Number(branchRaw);
      if (Number.isNaN(n) || n <= 0 || !Number.isInteger(n)) {
        notify.error(t("personnel.branchInvalid"));
        return;
      }
      branchId = n;
    }

    try {
      await createPersonnel.mutateAsync({
        fullName: values.fullName.trim(),
        hireDate: values.hireDate,
        ...(salary !== undefined ? { salary } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      });
      notify.success(t("toast.personnelCreated"));
      reset();
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
      title={t("personnel.addTitle")}
      description={t("personnel.addHint")}
      closeButtonLabel={t("common.close")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          label={t("personnel.fieldFullName")}
          {...register("fullName", { required: t("common.required") })}
          error={errors.fullName?.message}
          autoComplete="name"
        />
        <Input
          label={t("personnel.fieldHireDate")}
          type="date"
          {...register("hireDate", { required: t("common.required") })}
          error={errors.hireDate?.message}
        />
        <Input
          label={t("personnel.fieldSalary")}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={t("personnel.fieldOptionalPlaceholder")}
          {...register("salary")}
          error={errors.salary?.message}
        />
        <Select
          label={t("personnel.fieldBranch")}
          options={branchOptions}
          {...register("branchId")}
          error={errors.branchId?.message}
        />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:min-w-[120px]"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="sm:min-w-[120px]"
            disabled={createPersonnel.isPending}
          >
            {createPersonnel.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
