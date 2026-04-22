"use client";

import { useI18n } from "@/i18n/context";
import {
  useUpdateWarehouse,
  useWarehouseDetail,
  useWarehouseUserOptions,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useEffect, useMemo } from "react";
import { useForm, useController } from "react-hook-form";

type FormValues = {
  name: string;
  address: string;
  city: string;
  responsibleManagerUserId: string;
  responsibleMasterUserId: string;
};

type Props = {
  open: boolean;
  warehouseId: number;
  onClose: () => void;
};

const TITLE_ID = "edit-warehouse-title";

export function EditWarehouseModal({ open, warehouseId, onClose }: Props) {
  const { t } = useI18n();
  const updateWh = useUpdateWarehouse();
  const { data: detail, isPending: detailLoading } = useWarehouseDetail(
    open ? warehouseId : null,
    open
  );
  const { data: userOptions = [], isPending: usersLoading } = useWarehouseUserOptions(open);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      responsibleManagerUserId: "",
      responsibleMasterUserId: "",
    },
  });

  const mgrField = useController({ control, name: "responsibleManagerUserId" });
  const masterField = useController({ control, name: "responsibleMasterUserId" });

  const userSelectOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.responsibleUserNone") },
      ...userOptions.map((u) => ({ value: String(u.id), label: u.displayName })),
    ],
    [t, userOptions]
  );

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || !detail) return;
    reset({
      name: detail.name,
      address: detail.address?.trim() ?? "",
      city: detail.city?.trim() ?? "",
      responsibleManagerUserId:
        detail.responsibleManagerUserId != null && detail.responsibleManagerUserId > 0
          ? String(detail.responsibleManagerUserId)
          : "",
      responsibleMasterUserId:
        detail.responsibleMasterUserId != null && detail.responsibleMasterUserId > 0
          ? String(detail.responsibleMasterUserId)
          : "",
    });
  }, [open, detail, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const mid = values.responsibleManagerUserId ? Number(values.responsibleManagerUserId) : null;
    const sid = values.responsibleMasterUserId ? Number(values.responsibleMasterUserId) : null;
    try {
      await updateWh.mutateAsync({
        id: warehouseId,
        input: {
          name: values.name.trim(),
          address: values.address.trim() || null,
          city: values.city.trim() || null,
          responsibleManagerUserId: mid != null && mid > 0 ? mid : null,
          responsibleMasterUserId: sid != null && sid > 0 ? sid : null,
        },
      });
      notify.success(t("toast.warehouseUpdated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });

  const busy = detailLoading || !detail;
  const requestClose = () => {
    if (
      isDirty &&
      !updateWh.isPending &&
      !window.confirm(t("common.modalConfirmOutsideCloseMessage"))
    ) {
      return;
    }
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        titleId={TITLE_ID}
        title={t("warehouse.editWarehouseTitle")}
        description={t("warehouse.editWarehouseHint")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-xl"
      >
        {busy ? (
          <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <form onSubmit={onSubmit}>
            <ModalFormLayout
              body={
                <FormSection>
                  <Input
                    label={t("warehouse.fieldName")}
                    labelRequired
                    required
                    {...register("name", { required: t("common.required") })}
                    error={errors.name?.message}
                    autoComplete="off"
                    maxLength={100}
                  />
                  <Input
                    label={t("warehouse.fieldCity")}
                    {...register("city")}
                    autoComplete="address-level2"
                    maxLength={100}
                  />
                  <div className="flex w-full flex-col gap-1">
                    <label htmlFor="warehouse-address-edit" className="text-sm font-medium text-zinc-700">
                      {t("warehouse.fieldAddress")}
                    </label>
                    <textarea
                      id="warehouse-address-edit"
                      rows={3}
                      className="min-h-[5.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
                      {...register("address")}
                      maxLength={4000}
                      autoComplete="street-address"
                    />
                  </div>
                  <Select
                    label={t("warehouse.responsibleManager")}
                    options={userSelectOptions}
                    name={mgrField.field.name}
                    value={String(mgrField.field.value ?? "")}
                    onChange={(e) => mgrField.field.onChange(e.target.value)}
                    onBlur={mgrField.field.onBlur}
                    ref={mgrField.field.ref}
                    disabled={usersLoading}
                  />
                  <Select
                    label={t("warehouse.responsibleMaster")}
                    options={userSelectOptions}
                    name={masterField.field.name}
                    value={String(masterField.field.value ?? "")}
                    onChange={(e) => masterField.field.onChange(e.target.value)}
                    onBlur={masterField.field.onBlur}
                    ref={masterField.field.ref}
                    disabled={usersLoading}
                  />
                </FormSection>
              }
              footer={
                <>
                  <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" className="min-w-[120px]" disabled={updateWh.isPending}>
                    {updateWh.isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </>
              }
            />
          </form>
        )}
      </Modal>
    </>
  );
}
