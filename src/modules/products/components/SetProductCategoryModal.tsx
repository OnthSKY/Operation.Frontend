"use client";

import { categoryOptionLabel } from "@/modules/products/lib/category-labels";
import { useProductCategories, useSetProductCategory } from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("products.setCategoryTitle")}
      description={t("products.setCategoryHint")}
    >
      {product != null ? (
        <div className="mt-4 flex flex-col gap-3">
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
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="sm:min-w-[120px]" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="sm:min-w-[120px]"
              disabled={setCat.isPending || catLoading}
              onClick={() => void onSave()}
            >
              {setCat.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
