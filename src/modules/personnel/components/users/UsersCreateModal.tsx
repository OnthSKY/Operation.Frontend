"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { PasswordStrengthMeter } from "@/shared/ui/PasswordStrengthMeter";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import type { AppUserRole } from "@/types/user";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormHandleSubmit,
  UseFormWatch,
} from "react-hook-form";
import type { ControllerRenderProps } from "react-hook-form";

type FormValues = {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  role: AppUserRole;
  personnelId: string;
};

/**
 * Yeni kullanıcı oluşturma modal'ı. React-hook-form ile çalışır; form helper'ları
 * dışarıdan prop olarak gelir (orchestrator'da `useForm()` çağrılır).
 */
type Props = {
  open: boolean;
  onClose: () => void;
  register: UseFormRegister<FormValues>;
  watch: UseFormWatch<FormValues>;
  errors: FieldErrors<FormValues>;
  roleField: ControllerRenderProps<FormValues, "role">;
  personnelField: ControllerRenderProps<FormValues, "personnelId">;
  onSubmit: ReturnType<UseFormHandleSubmit<FormValues>>;
  roleOptions: SelectOption[];
  personnelOptions: SelectOption[];
  /** Seçili role için detay açıklaması (örn. role descriptors). */
  createUserRoleDetailText: string | null;
  roleRequiresPersonnel: (code: string) => boolean;
  /** "BRANCH_DAY_REGISTER" rolü için scope kurulum hatırlatması. */
  branchDayRegisterCallout?: React.ReactNode;
  creating: boolean;
};

export function UsersCreateModal({
  open,
  onClose,
  register,
  watch,
  errors,
  roleField,
  personnelField,
  onSubmit,
  roleOptions,
  personnelOptions,
  createUserRoleDetailText,
  roleRequiresPersonnel,
  branchDayRegisterCallout,
  creating,
}: Props) {
  const { t } = useI18n();
  const currentRole = String(roleField.value ?? "").toUpperCase();
  const passwordValue = watch("password") ?? "";
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="create-user-title"
      title={t("users.modalTitle")}
      description={t("users.modalHint")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-lg"
    >
      <form onSubmit={onSubmit}>
        <ModalFormLayout
          body={
            <FormSection>
              <Input
                label={t("users.fieldUsername")}
                labelRequired
                required
                autoComplete="username"
                {...register("username", { required: t("common.required") })}
                error={errors.username?.message}
              />
              <Input
                label={t("users.fieldPassword")}
                labelRequired
                required
                type="password"
                autoComplete="new-password"
                {...register("password", { required: t("common.required") })}
                error={errors.password?.message}
              />
              <PasswordStrengthMeter password={passwordValue} />
              <Input
                label={t("users.fieldPasswordConfirm")}
                labelRequired
                required
                type="password"
                autoComplete="new-password"
                {...register("passwordConfirm", { required: t("common.required") })}
                error={errors.passwordConfirm?.message}
              />
              <Input
                label={t("users.fieldFullName")}
                autoComplete="name"
                {...register("fullName")}
                error={errors.fullName?.message}
              />
              <Select
                label={t("users.fieldRole")}
                options={roleOptions}
                name={roleField.name}
                value={String(roleField.value ?? "STAFF")}
                onChange={(e) => roleField.onChange(e.target.value as AppUserRole)}
                onBlur={roleField.onBlur}
                ref={roleField.ref}
              />
              {createUserRoleDetailText ? (
                <p className="-mt-1 text-xs leading-relaxed text-zinc-600">
                  {createUserRoleDetailText}
                </p>
              ) : null}
              {currentRole === "BRANCH_DAY_REGISTER" && branchDayRegisterCallout ? (
                <div className="mt-3">{branchDayRegisterCallout}</div>
              ) : null}
              <Select
                label={t("users.fieldPersonnel")}
                labelRequired={roleRequiresPersonnel(currentRole)}
                options={personnelOptions}
                name={personnelField.name}
                value={String(personnelField.value ?? "")}
                onChange={(e) => personnelField.onChange(e.target.value)}
                onBlur={personnelField.onBlur}
                ref={personnelField.ref}
              />
              {roleRequiresPersonnel(currentRole) ? (
                <p className="-mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-amber-800">
                  <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                    {t("users.rolePersonnelRequiredBadge")}
                  </span>
                  <span>{t("users.personnelRequiredForRoleHint")}</span>
                </p>
              ) : null}
            </FormSection>
          }
          footer={
            <Button
              type="submit"
              className="min-h-11 w-full min-w-[120px] sm:w-auto"
              disabled={creating}
            >
              {creating ? t("common.saving") : t("common.save")}
            </Button>
          }
        />
      </form>
    </Modal>
  );
}
