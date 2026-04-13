"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useCreatePersonnel,
  useUpdatePersonnel,
  useUploadNationalIdPhotos,
  useUploadProfilePhotos,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import {
  formatPersonnelPhoneDisplay,
  isCompleteTurkishMobileNational,
  nationalMobileDigitsFromStored,
  toPersonnelPhoneE164,
} from "@/shared/lib/personnel-phone";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type {
  CreatePersonnelInput,
  NationalIdCardGeneration,
  Personnel,
  PersonnelJobTitle,
} from "@/types/personnel";
import { useMemo, useEffect, useState } from "react";
import { Controller, useController, useForm } from "react-hook-form";

const jobTitleValues: PersonnelJobTitle[] = [
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
];

type DriverDocChoice = "" | "yes" | "no";

type FormValues = {
  fullName: string;
  hireDate: string;
  insuranceIntakeStartDate: string;
  insuranceAccountingNotified: boolean;
  jobTitle: PersonnelJobTitle;
  driverHasSrc: DriverDocChoice;
  driverHasPsychotechnical: DriverDocChoice;
  salary: string;
  branchId: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  nationalIdCardGeneration: "" | NationalIdCardGeneration;
  seasonArrivalActive: boolean;
  seasonArrivalDate: string;
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

  const driverDocOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.driverDocPlaceholder") },
      { value: "yes", label: t("personnel.driverDocYes") },
      { value: "no", label: t("personnel.driverDocNo") },
    ],
    [t]
  );

  const nationalIdGenOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.nationalIdCardGenerationUnset") },
      { value: "OLD", label: t("personnel.nationalIdCardGenerationOld") },
      { value: "NEW", label: t("personnel.nationalIdCardGenerationNew") },
    ],
    [t]
  );

  const createPersonnel = useCreatePersonnel();
  const updatePersonnel = useUpdatePersonnel();
  const uploadNat = useUploadNationalIdPhotos();
  const uploadProf = useUploadProfilePhotos();
  const [idPhotoFront, setIdPhotoFront] = useState<File | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<File | null>(null);
  const [profilePhoto1, setProfilePhoto1] = useState<File | null>(null);
  const [profilePhoto2, setProfilePhoto2] = useState<File | null>(null);
  const pending =
    (isEdit ? updatePersonnel.isPending : createPersonnel.isPending) ||
    uploadNat.isPending ||
    uploadProf.isPending;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
    setValue,
    watch,
    getValues,
    clearErrors,
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      hireDate: localIsoDate(),
      insuranceIntakeStartDate: "",
      insuranceAccountingNotified: false,
      jobTitle: "WAITER",
      driverHasSrc: "",
      driverHasPsychotechnical: "",
      salary: "",
      branchId: "",
      phone: "+90 ",
      nationalId: "",
      birthDate: "",
      nationalIdCardGeneration: "",
      seasonArrivalActive: false,
      seasonArrivalDate: "",
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

  const { field: seasonArrivalActiveField } = useController({
    name: "seasonArrivalActive",
    control,
    defaultValue: false,
  });

  const { field: nationalIdGenField } = useController({
    name: "nationalIdCardGeneration",
    control,
    defaultValue: "",
  });

  const { field: insuranceAccountingNotifiedField } = useController({
    name: "insuranceAccountingNotified",
    control,
    defaultValue: false,
  });

  const jobTitleWatched = watch("jobTitle");

  useEffect(() => {
    if (jobTitleWatched !== "DRIVER") {
      setValue("driverHasSrc", "", { shouldValidate: false });
      setValue("driverHasPsychotechnical", "", { shouldValidate: false });
      clearErrors(["driverHasSrc", "driverHasPsychotechnical"]);
    }
  }, [jobTitleWatched, setValue, clearErrors]);

  const {
    onChange: onNationalIdFieldChange,
    ...nationalIdFieldReg
  } = register("nationalId");

  useEffect(() => {
    if (!open) {
      reset({
        fullName: "",
        hireDate: "",
        insuranceIntakeStartDate: "",
        insuranceAccountingNotified: false,
        jobTitle: "WAITER",
        driverHasSrc: "",
        driverHasPsychotechnical: "",
        salary: "",
        branchId: "",
        phone: "+90 ",
        nationalId: "",
        birthDate: "",
        nationalIdCardGeneration: "",
        seasonArrivalActive: false,
        seasonArrivalDate: "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
      setIdPhotoFront(null);
      setIdPhotoBack(null);
      setProfilePhoto1(null);
      setProfilePhoto2(null);
      return;
    }
    if (initial) {
      reset({
        fullName: initial.fullName,
        hireDate: hireDateForInput(initial.hireDate),
        insuranceIntakeStartDate: hireDateForInput(
          initial.insuranceIntakeStartDate ?? ""
        ),
        insuranceAccountingNotified: initial.insuranceAccountingNotified,
        jobTitle: initial.jobTitle,
        driverHasSrc:
          initial.jobTitle === "DRIVER"
            ? initial.driverHasSrc === true
              ? "yes"
              : initial.driverHasSrc === false
                ? "no"
                : ""
            : "",
        driverHasPsychotechnical:
          initial.jobTitle === "DRIVER"
            ? initial.driverHasPsychotechnical === true
              ? "yes"
              : initial.driverHasPsychotechnical === false
                ? "no"
                : ""
            : "",
        salary:
          initial.salary != null
            ? formatLocaleAmount(initial.salary, locale)
            : "",
        branchId: initial.branchId != null ? String(initial.branchId) : "",
        phone: formatPersonnelPhoneDisplay(
          nationalMobileDigitsFromStored(initial.phone)
        ),
        nationalId: initial.nationalId ?? "",
        birthDate: hireDateForInput(initial.birthDate ?? ""),
        nationalIdCardGeneration:
          initial.nationalIdCardGeneration === "OLD" ||
          initial.nationalIdCardGeneration === "NEW"
            ? initial.nationalIdCardGeneration
            : "",
        seasonArrivalActive: false,
        seasonArrivalDate: "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
      setIdPhotoFront(null);
      setIdPhotoBack(null);
      setProfilePhoto1(null);
      setProfilePhoto2(null);
    } else {
      const today = localIsoDate();
      reset({
        fullName: "",
        hireDate: today,
        insuranceIntakeStartDate: "",
        insuranceAccountingNotified: false,
        jobTitle: "WAITER",
        driverHasSrc: "",
        driverHasPsychotechnical: "",
        salary: "",
        branchId: "",
        phone: "+90 ",
        nationalId: "",
        birthDate: "",
        nationalIdCardGeneration: "",
        seasonArrivalActive: false,
        seasonArrivalDate: "",
        createUser: false,
        userUsername: "",
        userPassword: "",
        userPasswordConfirm: "",
      });
      setIdPhotoFront(null);
      setIdPhotoBack(null);
      setProfilePhoto1(null);
      setProfilePhoto2(null);
    }
  }, [open, initial, reset, locale]);

  const seasonArrivalActiveWatched = watch("seasonArrivalActive");
  const seasonArrivalDateWatched = watch("seasonArrivalDate");
  useEffect(() => {
    if (!open || initial != null || !seasonArrivalActiveWatched) return;
    const s = String(seasonArrivalDateWatched ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
    setValue("insuranceIntakeStartDate", s, { shouldValidate: true });
  }, [
    seasonArrivalDateWatched,
    seasonArrivalActiveWatched,
    open,
    initial,
    setValue,
  ]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setFocus("fullName"), 80);
    return () => window.clearTimeout(id);
  }, [open, setFocus, initial?.id]);

  const onSubmit = handleSubmit(async (values) => {
    if (!isEdit && values.seasonArrivalActive) {
      const sd = values.seasonArrivalDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sd)) {
        notify.error(t("common.required"));
        return;
      }
    }

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

    const birth = values.birthDate.trim();
    if (birth !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
      notify.error(t("common.required"));
      return;
    }
    const intake = values.insuranceIntakeStartDate.trim();
    if (intake !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(intake)) {
      notify.error(t("common.required"));
      return;
    }
    const nationalDigits = values.nationalId.replace(/\D/g, "").slice(0, 11);
    if (nationalDigits.length > 0 && nationalDigits.length !== 11) {
      notify.error(t("personnel.insuranceNationalIdInvalid"));
      return;
    }

    for (const f of [idPhotoFront, idPhotoBack].filter(Boolean) as File[]) {
      const v = await validateImageFileForUpload(f);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }

    const gen: NationalIdCardGeneration | null =
      values.nationalIdCardGeneration === "OLD" ||
      values.nationalIdCardGeneration === "NEW"
        ? values.nationalIdCardGeneration
        : null;

    const phoneNational = nationalMobileDigitsFromStored(values.phone);
    if (
      phoneNational.length > 0 &&
      !isCompleteTurkishMobileNational(phoneNational)
    ) {
      notify.error(t("personnel.phoneInvalid"));
      return;
    }
    const phonePayload =
      phoneNational.length === 0 ? null : toPersonnelPhoneE164(phoneNational);

    const payload: CreatePersonnelInput = {
      fullName: values.fullName.trim(),
      hireDate: values.hireDate,
      jobTitle: values.jobTitle,
      phone: phonePayload,
      nationalId: nationalDigits.length > 0 ? nationalDigits : null,
      birthDate: birth !== "" ? birth : null,
      nationalIdCardGeneration: gen,
      insuranceIntakeStartDate: intake !== "" ? intake : null,
      insuranceAccountingNotified: values.insuranceAccountingNotified,
      ...(salary !== undefined ? { salary } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
      ...(values.jobTitle === "DRIVER"
        ? {
            driverHasSrc: values.driverHasSrc === "yes",
            driverHasPsychotechnical: values.driverHasPsychotechnical === "yes",
          }
        : {}),
    };

    if (!isEdit && values.seasonArrivalActive) {
      payload.seasonArrivalDate = values.seasonArrivalDate.trim();
    }

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
        if (idPhotoFront || idPhotoBack) {
          await uploadNat.mutateAsync({
            personnelId: initial.id,
            input: { photoFront: idPhotoFront, photoBack: idPhotoBack },
          });
        }
        if (profilePhoto1 || profilePhoto2) {
          await uploadProf.mutateAsync({
            personnelId: initial.id,
            input: { photo1: profilePhoto1, photo2: profilePhoto2 },
          });
        }
        notify.success(t("toast.personnelUpdated"));
      } else {
        const created = await createPersonnel.mutateAsync(payload);
        if (idPhotoFront || idPhotoBack) {
          await uploadNat.mutateAsync({
            personnelId: created.id,
            input: { photoFront: idPhotoFront, photoBack: idPhotoBack },
          });
        }
        if (profilePhoto1 || profilePhoto2) {
          await uploadProf.mutateAsync({
            personnelId: created.id,
            input: { photo1: profilePhoto1, photo2: profilePhoto2 },
          });
        }
        notify.success(
          !isEdit && values.createUser && isAdmin
            ? t("toast.personnelCreatedWithUser")
            : t("toast.personnelCreated")
        );
      }
      reset();
      setIdPhotoFront(null);
      setIdPhotoBack(null);
      setProfilePhoto1(null);
      setProfilePhoto2(null);
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
        {jobTitleWatched === "DRIVER" ? (
          <>
            <Controller
              name="driverHasSrc"
              control={control}
              rules={{
                validate: (v) => {
                  if (getValues("jobTitle") !== "DRIVER") return true;
                  return v === "yes" || v === "no"
                    ? true
                    : t("common.required");
                },
              }}
              render={({ field }) => (
                <Select
                  label={t("personnel.fieldDriverHasSrc")}
                  labelRequired
                  options={driverDocOptions}
                  name={field.name}
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(e.target.value as DriverDocChoice)
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errors.driverHasSrc?.message}
                />
              )}
            />
            <Controller
              name="driverHasPsychotechnical"
              control={control}
              rules={{
                validate: (v) => {
                  if (getValues("jobTitle") !== "DRIVER") return true;
                  return v === "yes" || v === "no"
                    ? true
                    : t("common.required");
                },
              }}
              render={({ field }) => (
                <Select
                  label={t("personnel.fieldDriverHasPsychotechnical")}
                  labelRequired
                  options={driverDocOptions}
                  name={field.name}
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(e.target.value as DriverDocChoice)
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errors.driverHasPsychotechnical?.message}
                />
              )}
            />
          </>
        ) : null}
        <Controller
          name="hireDate"
          control={control}
          rules={{ required: t("common.required") }}
          render={({ field }) => (
            <DateField
              label={t("personnel.fieldHireDate")}
              labelRequired
              required
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.hireDate?.message}
            />
          )}
        />
        <p className="text-xs text-zinc-500">{t("personnel.fieldHireDateHint")}</p>
        {!isEdit ? (
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
                checked={seasonArrivalActiveField.value}
                onChange={(e) => {
                  const on = e.target.checked;
                  seasonArrivalActiveField.onChange(on);
                  if (on) {
                    const today = localIsoDate();
                    setValue("seasonArrivalDate", today, {
                      shouldValidate: true,
                    });
                    setValue("insuranceIntakeStartDate", today, {
                      shouldValidate: true,
                    });
                  }
                }}
                onBlur={seasonArrivalActiveField.onBlur}
                ref={seasonArrivalActiveField.ref}
              />
              <span className="text-sm font-medium text-zinc-800">
                {t("personnel.seasonArrivalCheckbox")}
              </span>
            </label>
            <p className="mt-2 text-xs text-zinc-500">
              {t("personnel.seasonArrivalHint")}
            </p>
            {seasonArrivalActiveField.value ? (
              <div className="mt-3">
                <Controller
                  name="seasonArrivalDate"
                  control={control}
                  rules={{
                    validate: (v, fv) =>
                      !fv.seasonArrivalActive ||
                      (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))
                        ? true
                        : t("common.required"),
                  }}
                  render={({ field }) => (
                    <DateField
                      label={t("personnel.seasonArrivalDate")}
                      labelRequired
                      required
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      error={errors.seasonArrivalDate?.message}
                    />
                  )}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <Controller
            name="insuranceIntakeStartDate"
            control={control}
            render={({ field }) => (
              <DateField
                label={t("personnel.fieldInsuranceIntakeStartDate")}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <p className="text-xs text-zinc-500">
            {t("personnel.fieldInsuranceIntakeStartDateHint")}
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
            checked={insuranceAccountingNotifiedField.value}
            onChange={(e) =>
              insuranceAccountingNotifiedField.onChange(e.target.checked)
            }
            onBlur={insuranceAccountingNotifiedField.onBlur}
            ref={insuranceAccountingNotifiedField.ref}
          />
          <span className="text-sm text-zinc-800">
            {t("personnel.insuranceAccountingNotifiedLabel")}
          </span>
        </label>
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
        <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {t("personnel.identitySectionTitle")}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {t("personnel.identitySectionHint")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Controller
              name="birthDate"
              control={control}
              render={({ field }) => (
                <DateField
                  label={t("personnel.fieldBirthDate")}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
            <Input
              label={t("personnel.fieldNationalId")}
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              placeholder={t("personnel.fieldOptionalPlaceholder")}
              {...nationalIdFieldReg}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                const next = { ...e, target: { ...e.target, value: v } };
                onNationalIdFieldChange(next);
              }}
            />
            <div className="flex flex-col gap-1">
              <Controller
                name="phone"
                control={control}
                rules={{
                  validate: (v) => {
                    const n = nationalMobileDigitsFromStored(v);
                    if (n.length === 0) return true;
                    return (
                      isCompleteTurkishMobileNational(n) ||
                      t("personnel.phoneInvalid")
                    );
                  },
                }}
                render={({ field }) => (
                  <Input
                    label={t("personnel.fieldPhone")}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    name={field.name}
                    value={field.value}
                    onChange={(e) => {
                      const national = nationalMobileDigitsFromStored(
                        e.target.value
                      );
                      field.onChange(formatPersonnelPhoneDisplay(national));
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    error={errors.phone?.message}
                  />
                )}
              />
              <p className="text-xs text-zinc-500">
                {t("personnel.fieldPhoneHint")}
              </p>
            </div>
            <Select
              label={t("personnel.nationalIdCardGenerationLabel")}
              options={nationalIdGenOptions}
              name={nationalIdGenField.name}
              value={String(nationalIdGenField.value ?? "")}
              onChange={(e) =>
                nationalIdGenField.onChange(
                  e.target.value as "" | NationalIdCardGeneration
                )
              }
              onBlur={nationalIdGenField.onBlur}
              ref={nationalIdGenField.ref}
            />
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-medium text-zinc-600">
                {isEdit
                  ? t("personnel.nationalIdPhotosEditPickHint")
                  : t("personnel.nationalIdPhotosPickHint")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex min-h-10 cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600 sm:flex-1">
                  <span className="font-medium text-zinc-800">
                    {t("personnel.nationalIdPhotosFront")}
                  </span>
                  <input
                    type="file"
                    accept={IMAGE_FILE_INPUT_ACCEPT}
                    className="text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1"
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      if (!f) {
                        setIdPhotoFront(null);
                        return;
                      }
                      const v = await validateImageFileForUpload(f);
                      if (!v.ok) {
                        input.value = "";
                        setIdPhotoFront(null);
                        notify.error(
                          v.reason === "size"
                            ? t("common.imageUploadTooLarge")
                            : t("common.imageUploadNotImage")
                        );
                        return;
                      }
                      setIdPhotoFront(f);
                    }}
                  />
                  <LocalImageFileThumb file={idPhotoFront} />
                </label>
                <label className="flex min-h-10 cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600 sm:flex-1">
                  <span className="font-medium text-zinc-800">
                    {t("personnel.nationalIdPhotosBack")}
                  </span>
                  <input
                    type="file"
                    accept={IMAGE_FILE_INPUT_ACCEPT}
                    className="text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1"
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      if (!f) {
                        setIdPhotoBack(null);
                        return;
                      }
                      const v = await validateImageFileForUpload(f);
                      if (!v.ok) {
                        input.value = "";
                        setIdPhotoBack(null);
                        notify.error(
                          v.reason === "size"
                            ? t("common.imageUploadTooLarge")
                            : t("common.imageUploadNotImage")
                        );
                        return;
                      }
                      setIdPhotoBack(f);
                    }}
                  />
                  <LocalImageFileThumb file={idPhotoBack} />
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-medium text-zinc-600">
                {isEdit
                  ? t("personnel.profilePhotosEditPickHint")
                  : t("personnel.profilePhotosPickHint")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex min-h-10 cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600 sm:flex-1">
                  <span className="font-medium text-zinc-800">
                    {t("personnel.profilePhotoSlot1")}
                  </span>
                  <input
                    type="file"
                    accept={IMAGE_FILE_INPUT_ACCEPT}
                    className="text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1"
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      if (!f) {
                        setProfilePhoto1(null);
                        return;
                      }
                      const v = await validateImageFileForUpload(f);
                      if (!v.ok) {
                        input.value = "";
                        setProfilePhoto1(null);
                        notify.error(
                          v.reason === "size"
                            ? t("common.imageUploadTooLarge")
                            : t("common.imageUploadNotImage")
                        );
                        return;
                      }
                      setProfilePhoto1(f);
                    }}
                  />
                  <LocalImageFileThumb file={profilePhoto1} />
                </label>
                <label className="flex min-h-10 cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600 sm:flex-1">
                  <span className="font-medium text-zinc-800">
                    {t("personnel.profilePhotoSlot2")}
                  </span>
                  <input
                    type="file"
                    accept={IMAGE_FILE_INPUT_ACCEPT}
                    className="text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1"
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      if (!f) {
                        setProfilePhoto2(null);
                        return;
                      }
                      const v = await validateImageFileForUpload(f);
                      if (!v.ok) {
                        input.value = "";
                        setProfilePhoto2(null);
                        notify.error(
                          v.reason === "size"
                            ? t("common.imageUploadTooLarge")
                            : t("common.imageUploadNotImage")
                        );
                        return;
                      }
                      setProfilePhoto2(f);
                    }}
                  />
                  <LocalImageFileThumb file={profilePhoto2} />
                </label>
              </div>
            </div>
          </div>
        </div>
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
