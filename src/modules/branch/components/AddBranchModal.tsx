"use client";

import { useI18n } from "@/i18n/context";
import { useCreateBranch } from "@/modules/branch/hooks/useBranchQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = { name: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

const TITLE_ID = "add-branch-title";

export function AddBranchModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const createBranch = useCreateBranch();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ defaultValues: { name: "" } });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createBranch.mutateAsync({ name: values.name.trim() });
      notify.success(t("toast.branchCreated"));
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
      title={t("branch.addTitle")}
      description={t("branch.addHint")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          label={t("branch.fieldName")}
          labelRequired
          required
          {...register("name", { required: t("common.required") })}
          error={errors.name?.message}
          autoComplete="organization"
          maxLength={100}
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
            disabled={createBranch.isPending}
          >
            {createBranch.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
