"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useCreatePersonnel,
  useUpdatePersonnel,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type {
  CreatePersonnelInput,
  Personnel,
  PersonnelJobTitle,
} from "@/types/personnel";
import { useMemo, useEffect } from "react";
import { useController, useForm } from "react-hook-form";

const jobTitleValues: PersonnelJobTitle[] = [
  "MANAGER",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "CASHIER",
];

type FormValues = {
  fullName: string;
  hireDate: string;
  jobTitle: PersonnelJobTitle;
  salary: string;
  branchId: string;
  createUser: boolean;
  userUsername: string;
  userPassword: string;
  userPasswordConfirm: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** `null` = yeni personel; dolu = düzenleme */
  initial: Personnel | null;
};

function hireDateForInput(iso: string): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

export function PersonnelFormModal({ open, onClose, initial }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isEdit = initial != null;
  const titleId = isEdit ? "edit-personnel-title" : "add-personnel-title";

  const { data: branches = [] } = useBranchesList();
  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.branchNone") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const jobTitleOptions: SelectOption[] = useMemo(
    () =>
      jobTitleValues.map((code) => ({
        value: code,
        label: t(`personnel.jobTitles.${code}`),
      })),
    [t]
  );

  const createPersonnel = useCreatePersonnel();
  const updatePersonnel = useUpdatePersonnel();
  const pending = isEdit ? updatePersonnel.isPending : createPersonnel.isPending;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      hireDate: "",
      jobTitle: "WAITER",
      salary: "",
      branchId: "",
      createUser: false,
      userUsername: "",
      userPassword: "",
      userPasswordConfirm: "",
    },
  });

  const { field: branchField } = useController({
    name: "branchId",
    control,
    defaultValue: "",
  });

  const { field: salaryField } = useController({
    name: "salary",
    control,
    defaultValue: "",
  });

  const { field: jobTitleField } = useController({
    name: "jobTitle",
    control,
    defaultValue: "WAITER",
    rules: { required: t("common.required") },
  });

  const { field: createUserField } = useController({
    name: "createUser",
    control,
    defaultValue: false,
  });

  useEffect(() => {
    if (!open) {
      reset({
        fullName: "",
        hireDate: "",
        jobTitle: "WAITER",
        salary: "",
        branchId: "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
      return;
    }
    if (initial) {
      reset({
        fullName: initial.fullName,
        hireDate: hireDateForInput(initial.hireDate),
        jobTitle: initial.jobTitle,
        salary:
          initial.salary != null
            ? formatLocaleAmount(initial.salary, locale)
            : "",
        branchId: initial.branchId != null ? String(initial.branchId) : "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
    } else {
      reset({
        fullName: "",
        hireDate: "",
        jobTitle: "WAITER",
        salary: "",
        branchId: "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
    }
  }, [open, initial, reset, locale]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setFocus("fullName"), 80);
    return () => window.clearTimeout(id);
  }, [open, setFocus, initial?.id]);

  const onSubmit = handleSubmit(async (values) => {
    const salaryRaw = values.salary.trim();
    let salary: number | null | undefined;
    if (salaryRaw !== "") {
      const n = parseLocaleAmount(salaryRaw, locale);
      if (!Number.isFinite(n) || n < 0) {
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

    const payload: CreatePersonnelInput = {
      fullName: values.fullName.trim(),
      hireDate: values.hireDate,
      jobTitle: values.jobTitle,
      ...(salary !== undefined ? { salary } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
    };

    if (!isEdit && isAdmin && values.createUser) {
      const u = values.userUsername.trim();
      const p1 = values.userPassword;
      const p2 = values.userPasswordConfirm;
      if (!u) {
        notify.error(t("common.required"));
        return;
      }
      if (p1.length < 8) {
        notify.error(t("personnel.userPasswordTooShort"));
        return;
      }
      if (p1 !== p2) {
        notify.error(t("personnel.userPasswordMismatch"));
        return;
      }
      payload.userAccount = { username: u, password: p1 };
    }

    try {
      if (isEdit && initial) {
        await updatePersonnel.mutateAsync({ id: initial.id, ...payload });
        notify.success(t("toast.personnelUpdated"));
      } else {
        await createPersonnel.mutateAsync(payload);
        notify.success(
          !isEdit && values.createUser && isAdmin
            ? t("toast.personnelCreatedWithUser")
            : t("toast.personnelCreated")
        );
      }
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
      titleId={titleId}
      title={isEdit ? t("personnel.editTitle") : t("personnel.addTitle")}
      description={isEdit ? t("personnel.editHint") : t("personnel.addHint")}
      closeButtonLabel={t("common.close")}
    >
      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          label={t("personnel.fieldFullName")}
          labelRequired
          required
          {...register("fullName", { required: t("common.required") })}
          error={errors.fullName?.message}
          autoComplete="name"
        />
        <Select
          label={t("personnel.fieldJobTitle")}
          labelRequired
          options={jobTitleOptions}
          name={jobTitleField.name}
          value={String(jobTitleField.value ?? "WAITER")}
          onChange={(e) =>
            jobTitleField.onChange(e.target.value as PersonnelJobTitle)
          }
          onBlur={jobTitleField.onBlur}
          ref={jobTitleField.ref}
          error={errors.jobTitle?.message}
        />
        <Input
          label={t("personnel.fieldHireDate")}
          labelRequired
          required
          type="date"
          className="tabular-nums text-zinc-900 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          {...register("hireDate", { required: t("common.required") })}
          error={errors.hireDate?.message}
        />
        <Input
          label={t("personnel.fieldSalary")}
          inputMode="decimal"
          autoComplete="off"
          placeholder={t("personnel.fieldOptionalPlaceholder")}
          name={salaryField.name}
          value={salaryField.value}
          onChange={(e) => salaryField.onChange(e.target.value)}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              salaryField.onChange("");
              salaryField.onBlur();
              return;
            }
            const n = parseLocaleAmount(raw, locale);
            if (Number.isFinite(n) && n >= 0) {
              salaryField.onChange(formatLocaleAmount(n, locale));
            }
            salaryField.onBlur();
          }}
          ref={salaryField.ref}
          error={errors.salary?.message}
        />
        <Select
          label={t("personnel.fieldBranch")}
          options={branchOptions}
          name={branchField.name}
          value={String(branchField.value ?? "")}
          onChange={(e) => branchField.onChange(e.target.value)}
          onBlur={branchField.onBlur}
          ref={branchField.ref}
          error={errors.branchId?.message}
        />
        {!isEdit && isAdmin ? (
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {t("personnel.createUserSection")}
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
                checked={createUserField.value}
                onChange={(e) => createUserField.onChange(e.target.checked)}
                onBlur={createUserField.onBlur}
                ref={createUserField.ref}
              />
              <span className="text-sm text-zinc-800">
                {t("personnel.createUserLabel")}
              </span>
            </label>
            <p className="mt-2 text-xs text-zinc-500">
              {t("personnel.createUserHint")}
            </p>
            {createUserField.value ? (
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  label={t("personnel.fieldUserUsername")}
                  labelRequired
                  required
                  autoComplete="username"
                  {...register("userUsername", {
                    required: createUserField.value
                      ? t("common.required")
                      : false,
                  })}
                  error={errors.userUsername?.message}
                />
                <Input
                  label={t("personnel.fieldUserPassword")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("userPassword", {
                    required: createUserField.value
                      ? t("common.required")
                      : false,
                  })}
                  error={errors.userPassword?.message}
                />
                <Input
                  label={t("personnel.fieldUserPasswordConfirm")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("userPasswordConfirm", {
                    required: createUserField.value
                      ? t("common.required")
                      : false,
                  })}
                  error={errors.userPasswordConfirm?.message}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
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
            disabled={pending}
          >
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
