"use client";

import { categoryOptionLabel } from "@/modules/products/lib/category-labels";
import { useProductCategories, useSetProductCategory } from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

type ProductPick = {
  id: number;
  name: string;
  categoryId?: number | null;
};

type Props = {
  open: boolean;
  product: ProductPick | null;
  onClose: () => void;
};

const TITLE_ID = "set-product-category-title";

export function SetProductCategoryModal({ open, product, onClose }: Props) {
  const { t } = useI18n();
  const { data: categories = [], isPending: catLoading } = useProductCategories(open);
  const setCat = useSetProductCategory();

  const [pick, setPick] = useState("");

  useEffect(() => {
    if (!open || product == null) return;
    const id = product.categoryId;
    setPick(id != null && id > 0 ? String(id) : "");
  }, [open, product]);

  const options = useMemo(() => {
    const sorted = categories.slice().sort((a, b) =>
      categoryOptionLabel(categories, a).localeCompare(categoryOptionLabel(categories, b), undefined, {
        sensitivity: "base",
      })
    );
    return [
      { value: "", label: t("products.categoryNone") },
      ...sorted.map((c) => ({ value: String(c.id), label: categoryOptionLabel(categories, c) })),
    ];
  }, [categories, t]);

  const onSave = async () => {
    if (product == null) return;
    const catId = pick !== "" && Number(pick) > 0 ? Math.trunc(Number(pick)) : null;
    try {
      await setCat.mutateAsync({ productId: product.id, categoryId: catId });
      notify.success(t("toast.productCategoryUpdated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };
  const isDirty = pick !== (product?.categoryId != null && product.categoryId > 0 ? String(product.categoryId) : "");
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: setCat.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("products.setCategoryTitle")}
      description={t("products.setCategoryHint")}
      className="w-full max-w-lg"
    >
      {product != null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <ModalFormLayout
            body={
              <FormSection>
                <p className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">{t("products.colName")}:</span> {product.name}
                </p>
                {catLoading ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : (
                  <Select
                    label={t("products.categoryLabel")}
                    name="product-category-pick"
                    options={options}
                    value={pick}
                    onChange={(e) => setPick(e.target.value)}
                    onBlur={() => {}}
                  />
                )}
              </FormSection>
            }
            footer={
              <>
                <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="min-w-[120px]" disabled={setCat.isPending || catLoading}>
                  {setCat.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </>
            }
          />
        </form>
      ) : null}
    </Modal>
  );
}
