"use client";

import { useCreateProduct } from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = { name: string; unit: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Modal alt metni (i18n anahtarı); varsayılan genel katalog açıklaması. */
  descriptionKey?: string;
};

const TITLE_ID = "add-product-title";

export function AddProductModal({ open, onClose, descriptionKey }: Props) {
  const { t } = useI18n();
  const createProduct = useCreateProduct();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ defaultValues: { name: "", unit: "" } });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createProduct.mutateAsync({
        name: values.name.trim(),
        unit: values.unit.trim() || null,
      });
      notify.success(t("toast.productCreated"));
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
      title={t("products.addModalTitle")}
      description={t(descriptionKey ?? "products.addModalHint")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          label={t("warehouse.productName")}
          {...register("name", { required: t("common.required") })}
          error={errors.name?.message}
          autoComplete="off"
          maxLength={150}
        />
        <Input
          label={t("warehouse.productUnit")}
          {...register("unit")}
          autoComplete="off"
          maxLength={20}
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
          <Button type="submit" className="sm:min-w-[120px]" disabled={createProduct.isPending}>
            {createProduct.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
