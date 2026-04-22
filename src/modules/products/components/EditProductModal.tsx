"use client";

import {
  useProductCategories,
  useProductsCatalog,
  useUpdateProduct,
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

export type EditProductModalProduct = {
  id: number;
  name: string;
  unit: string | null;
  categoryId?: number | null;
  parentProductId?: number | null;
  hasChildren?: boolean;
};

type Props = {
  open: boolean;
  product: EditProductModalProduct | null;
  onClose: () => void;
  onUpdated?: (p: { id: number; name: string }) => void;
};

const TITLE_ID = "edit-product-title";

export function EditProductModal({ open, product, onClose, onUpdated }: Props) {
  const { t } = useI18n();
  const updateProductMut = useUpdateProduct();
  const {
    data: categories = [],
    isPending: categoriesLoading,
    isError: categoriesError,
  } = useProductCategories(open);
  const { data: catalog = [] } = useProductsCatalog();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [parentPick, setParentPick] = useState("");
  const [categoryRootPick, setCategoryRootPick] = useState("");
  const [categorySubPick, setCategorySubPick] = useState("");

  const hasChildren = Boolean(product?.hasChildren);

  useEffect(() => {
    if (!open) {
      setName("");
      setUnit("");
      setParentPick("");
      setCategoryRootPick("");
      setCategorySubPick("");
      return;
    }
    if (product == null) return;
    setName(product.name);
    setUnit(product.unit?.trim() ?? "");
    if (hasChildren) setParentPick("");
    else if (product.parentProductId != null && product.parentProductId > 0) {
      setParentPick(String(product.parentProductId));
    } else {
      setParentPick("");
    }
  }, [open, product, hasChildren]);

  useEffect(() => {
    if (!open || product == null) return;
    const cid = product.categoryId;
    if (cid == null || cid <= 0 || categories.length === 0) {
      setCategoryRootPick("");
      setCategorySubPick("");
      return;
    }
    const cat = categories.find((c) => c.id === cid);
    if (cat == null) {
      setCategoryRootPick("");
      setCategorySubPick("");
      return;
    }
    if (cat.parentCategoryId == null) {
      setCategoryRootPick(String(cat.id));
      setCategorySubPick("");
    } else {
      setCategoryRootPick(String(cat.parentCategoryId));
      setCategorySubPick(String(cat.id));
    }
  }, [open, product, categories]);

  const parentSelectOptions = useMemo(() => {
    const roots = catalog
      .filter((p) => p.parentProductId == null && p.id !== product?.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("products.noParentOption") },
      ...roots.map((p) => ({ value: String(p.id), label: p.name })),
    ];
  }, [catalog, product?.id, t]);

  const rootCategoryOptions = useMemo(() => {
    const roots = categories
      .filter((c) => c.parentCategoryId == null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("products.categoryNone") },
      ...roots.map((c) => ({ value: String(c.id), label: c.name })),
    ];
  }, [categories, t]);

  const subCategoryOptions = useMemo(() => {
    const rootId =
      categoryRootPick !== "" && Number(categoryRootPick) > 0
        ? Math.trunc(Number(categoryRootPick))
        : null;
    if (rootId == null) return [];
    const subs = categories
      .filter((c) => c.parentCategoryId === rootId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("products.categorySubPickMainOnly") },
      ...subs.map((c) => ({ value: String(c.id), label: c.name })),
    ];
  }, [categories, categoryRootPick, t]);

  const showSubCategorySelect =
    categoryRootPick !== "" &&
    Number(categoryRootPick) > 0 &&
    categories.some((c) => c.parentCategoryId === Math.trunc(Number(categoryRootPick)));
  const initialCategoryPicks = useMemo(() => {
    if (product == null) return { root: "", sub: "" };
    const cid = product.categoryId;
    if (cid == null || cid <= 0) return { root: "", sub: "" };
    const cat = categories.find((c) => c.id === cid);
    if (!cat) return { root: "", sub: "" };
    if (cat.parentCategoryId == null) return { root: String(cat.id), sub: "" };
    return { root: String(cat.parentCategoryId), sub: String(cat.id) };
  }, [categories, product]);

  const onSave = async () => {
    if (product == null) return;
    const n = name.trim();
    if (!n) {
      notify.error(t("common.required"));
      return;
    }
    const rootId =
      categoryRootPick !== "" && Number(categoryRootPick) > 0
        ? Math.trunc(Number(categoryRootPick))
        : null;
    const subId =
      categorySubPick !== "" && Number(categorySubPick) > 0
        ? Math.trunc(Number(categorySubPick))
        : null;
    let catId: number | null = null;
    if (rootId != null) {
      if (subId != null) {
        const sub = categories.find((c) => c.id === subId && c.parentCategoryId === rootId);
        catId = sub != null ? subId : rootId;
      } else {
        catId = rootId;
      }
    }
    const parentId =
      hasChildren
        ? null
        : parentPick !== "" && Number(parentPick) > 0
          ? Math.trunc(Number(parentPick))
          : null;
    try {
      await updateProductMut.mutateAsync({
        id: product.id,
        name: n,
        unit: unit.trim() || null,
        categoryId: catId,
        parentProductId: parentId,
      });
      notify.success(t("toast.productUpdated"));
      onUpdated?.({ id: product.id, name: n });
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const saveDisabled =
    updateProductMut.isPending ||
    product == null ||
    (categoriesLoading && !categoriesError);
  const isDirty =
    product != null &&
    (name.trim() !== product.name.trim() ||
      unit.trim() !== (product.unit?.trim() ?? "") ||
      (hasChildren ? "" : parentPick) !==
        (hasChildren
          ? ""
          : product.parentProductId != null && product.parentProductId > 0
            ? String(product.parentProductId)
            : "") ||
      categoryRootPick !== initialCategoryPicks.root ||
      categorySubPick !== initialCategoryPicks.sub);
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: updateProductMut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("products.editModalTitle")}
      description={t("products.editModalHint")}
      className="w-full max-w-xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <ModalFormLayout
          body={
            <>
              <FormSection>
                <Input
                  label={t("warehouse.productName")}
                  labelRequired
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  maxLength={150}
                />
                <Input
                  label={t("warehouse.productUnit")}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  autoComplete="off"
                  maxLength={20}
                />
                {hasChildren ? (
                  <p className="text-sm text-zinc-600">{t("products.editParentLockedHint")}</p>
                ) : (
                  <Select
                    label={t("products.parentProduct")}
                    name="edit-product-parent"
                    options={parentSelectOptions}
                    value={parentPick}
                    onChange={(e) => setParentPick(e.target.value)}
                    onBlur={() => {}}
                  />
                )}
              </FormSection>
              <FormSection>
                {categoriesLoading ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : null}
                {categoriesError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {t("products.categoryLoadFailed")}
                  </p>
                ) : null}
                {!categoriesLoading ? (
                  <>
                    <Select
                      label={t("products.categoryMainLabel")}
                      name="edit-product-category-root"
                      options={rootCategoryOptions}
                      value={categoryRootPick}
                      onChange={(e) => {
                        setCategoryRootPick(e.target.value);
                        setCategorySubPick("");
                      }}
                      onBlur={() => {}}
                    />
                    {showSubCategorySelect ? (
                      <Select
                        label={t("products.categorySubLabel")}
                        name="edit-product-category-sub"
                        options={subCategoryOptions}
                        value={categorySubPick}
                        onChange={(e) => setCategorySubPick(e.target.value)}
                        onBlur={() => {}}
                      />
                    ) : null}
                  </>
                ) : null}
              </FormSection>
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={saveDisabled}>
                {updateProductMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
