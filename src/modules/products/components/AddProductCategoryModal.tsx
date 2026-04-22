"use client";

import {
  useCreateProductCategory,
  useProductCategories,
} from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const TITLE_ID = "add-product-category-title";

export function AddProductCategoryModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const createCategory = useCreateProductCategory();
  const { data: categories = [], isPending: categoriesLoading } = useProductCategories(open);
  const [name, setName] = useState("");
  const [parentRootPick, setParentRootPick] = useState("");

  const parentRootOptions = useMemo(() => {
    const roots = categories
      .filter((c) => c.parentCategoryId == null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("products.addCategoryAsRootOption") },
      ...roots.map((c) => ({ value: String(c.id), label: c.name })),
    ];
  }, [categories, t]);

  useEffect(() => {
    if (!open) {
      setName("");
      setParentRootPick("");
    }
  }, [open]);

  const onSave = async () => {
    const n = name.trim();
    if (!n) {
      notify.error(t("common.required"));
      return;
    }
    const parentId =
      parentRootPick !== "" && Number(parentRootPick) > 0
        ? Math.trunc(Number(parentRootPick))
        : null;
    try {
      await createCategory.mutateAsync({
        name: n,
        parentCategoryId: parentId ?? undefined,
      });
      notify.success(t("toast.productCategoryCreated"));
      setName("");
      setParentRootPick("");
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };
  const isDirty = name.trim().length > 0 || parentRootPick !== "";
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: createCategory.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("products.addCategoryModalTitle")}
      description={t("products.addCategoryModalHint")}
      className="w-full max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <ModalFormLayout
          body={
            <FormSection>
              <Select
                label={t("products.addCategoryParentLabel")}
                name="add-product-category-parent-root"
                options={parentRootOptions}
                value={parentRootPick}
                disabled={categoriesLoading}
                onChange={(e) => setParentRootPick(e.target.value)}
                onBlur={() => {}}
              />
              <Input
                label={t("products.newCategoryName")}
                labelRequired
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                maxLength={120}
              />
            </FormSection>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={createCategory.isPending}>
                {createCategory.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
