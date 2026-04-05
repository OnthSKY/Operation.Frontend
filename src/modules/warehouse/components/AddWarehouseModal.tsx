"use client";

import { useI18n } from "@/i18n/context";
import { useCreateWarehouse } from "@/modules/warehouse/hooks/useWarehouseQueries";
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

const TITLE_ID = "add-warehouse-title";

export function AddWarehouseModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const createWh = useCreateWarehouse();
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
      await createWh.mutateAsync(values.name.trim());
      notify.success(t("toast.warehouseCreated"));
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
      title={t("warehouse.addWarehouseTitle")}
      description={t("warehouse.addWarehouseHint")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          label={t("warehouse.fieldName")}
          {...register("name", { required: t("common.required") })}
          error={errors.name?.message}
          autoComplete="off"
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
          <Button type="submit" className="sm:min-w-[120px]" disabled={createWh.isPending}>
            {createWh.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
