"use client";

import { useI18n } from "@/i18n/context";
import { useCreateUser } from "@/modules/personnel/hooks/useUsersQueries";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import type { Personnel } from "@/types/personnel";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  username: string;
  password: string;
  passwordConfirm: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
};

export function CreatePersonnelSystemUserModal({
  open,
  onClose,
  personnel,
}: Props) {
  const { t } = useI18n();
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setFocus,
  } = useForm<FormValues>({
    defaultValues: { username: "", password: "", passwordConfirm: "" },
  });

  useEffect(() => {
    if (!open) {
      reset({ username: "", password: "", passwordConfirm: "" });
      return;
    }
    const id = window.setTimeout(() => setFocus("username"), 80);
    return () => window.clearTimeout(id);
  }, [open, reset, setFocus]);

  const onSubmit = handleSubmit(async (values) => {
    if (!personnel || personnel.isDeleted) return;
    const pw = values.password;
    if (pw.length < 8) {
      notify.error(t("personnel.userPasswordTooShort"));
      return;
    }
    if (pw !== values.passwordConfirm) {
      notify.error(t("personnel.userPasswordMismatch"));
      return;
    }
    try {
      await createUser.mutateAsync({
        username: values.username.trim(),
        password: pw,
        fullName: personnel.fullName.trim() || null,
        role: "STAFF",
        personnelId: personnel.id,
      });
      notify.success(t("toast.userCreated"));
      reset();
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: createUser.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => {
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId="create-personnel-user-title"
      title={t("personnel.createSystemUserTitle")}
      description={t("personnel.createSystemUserHint")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-lg"
    >
      <form onSubmit={onSubmit}>
        <ModalFormLayout
          body={
            <FormSection>
              {personnel ? (
                <p className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-900">{personnel.fullName}</span>
                </p>
              ) : null}
              <Input
                label={t("personnel.fieldUserUsername")}
                labelRequired
                required
                autoFocus
                autoComplete="username"
                {...register("username", { required: t("common.required") })}
                error={errors.username?.message}
              />
              <Input
                label={t("personnel.fieldUserPassword")}
                labelRequired
                required
                type="password"
                autoComplete="new-password"
                {...register("password", { required: t("common.required") })}
                error={errors.password?.message}
              />
              <Input
                label={t("personnel.fieldUserPasswordConfirm")}
                labelRequired
                required
                type="password"
                autoComplete="new-password"
                {...register("passwordConfirm", { required: t("common.required") })}
                error={errors.passwordConfirm?.message}
              />
            </FormSection>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={createUser.isPending || !personnel}>
                {createUser.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
