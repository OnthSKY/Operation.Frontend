"use client";

import {
  useCreateProduct,
  useProductCategories,
  useProductsCatalog,
} from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  name: string;
  unit: string;
  parentPick: string;
  categoryRootPick: string;
  categorySubPick: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  descriptionKey?: string;
  /** Bu ana ürünün altına ekle; ana ürün seçimi gizlenir. */
  fixedParent?: { id: number; name: string } | null;
};

const TITLE_ID = "add-product-title";

export function AddProductModal({ open, onClose, descriptionKey, fixedParent }: Props) {
  const { t } = useI18n();
  const createProduct = useCreateProduct();
  const { data: catalog = [] } = useProductsCatalog();
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useProductCategories(true);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      unit: "",
      parentPick: "",
      categoryRootPick: "",
      categorySubPick: "",
    },
  });

  const parentPick = watch("parentPick");
  const categoryRootPick = watch("categoryRootPick");
  const categorySubPick = watch("categorySubPick");

  const parentSelectOptions = useMemo(() => {
    const roots = catalog
      .filter((p) => p.parentProductId == null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("products.noParentOption") },
      ...roots.map((p) => ({ value: String(p.id), label: p.name })),
    ];
  }, [catalog, t]);

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

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        unit: "",
        parentPick: "",
        categoryRootPick: "",
        categorySubPick: "",
      });
      return;
    }
    reset({
      name: "",
      unit: "",
      parentPick: fixedParent != null ? String(fixedParent.id) : "",
      categoryRootPick: "",
      categorySubPick: "",
    });
  }, [open, fixedParent, reset]);

  useEffect(() => {
    if (!open) return;
    const pid =
      fixedParent?.id ??
      (parentPick !== "" && Number(parentPick) > 0 ? Math.trunc(Number(parentPick)) : null);
    if (pid == null) {
      setValue("categoryRootPick", "");
      setValue("categorySubPick", "");
      return;
    }
    const p = catalog.find((x) => x.id === pid);
    const cid = p?.categoryId;
    if (cid == null || cid <= 0 || categories.length === 0) {
      setValue("categoryRootPick", "");
      setValue("categorySubPick", "");
      return;
    }
    const cat = categories.find((c) => c.id === cid);
    if (cat == null) {
      setValue("categoryRootPick", "");
      setValue("categorySubPick", "");
      return;
    }
    if (cat.parentCategoryId == null) {
      setValue("categoryRootPick", String(cat.id));
      setValue("categorySubPick", "");
    } else {
      setValue("categoryRootPick", String(cat.parentCategoryId));
      setValue("categorySubPick", String(cat.id));
    }
  }, [open, fixedParent, parentPick, catalog, categories, setValue]);

  const effectiveParentId =
    fixedParent?.id ??
    (parentPick !== "" && Number(parentPick) > 0 ? Math.trunc(Number(parentPick)) : null);

  useEffect(() => {
    if (!open || effectiveParentId == null) return;
    const p = catalog.find((x) => x.id === effectiveParentId);
    const u = p?.unit?.trim();
    if (u) setValue("unit", u);
  }, [open, effectiveParentId, catalog, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const parentId =
      fixedParent != null
        ? fixedParent.id
        : parentPick !== "" && Number(parentPick) > 0
          ? Math.trunc(Number(parentPick))
          : null;
    const rootId =
      values.categoryRootPick !== "" && Number(values.categoryRootPick) > 0
        ? Math.trunc(Number(values.categoryRootPick))
        : null;
    const subId =
      values.categorySubPick !== "" && Number(values.categorySubPick) > 0
        ? Math.trunc(Number(values.categorySubPick))
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
    try {
      await createProduct.mutateAsync({
        name: values.name.trim(),
        unit: values.unit.trim() || null,
        parentProductId: parentId,
        categoryId: catId,
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
        {fixedParent != null ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">{t("products.mainProductLabel")}:</span>{" "}
            {fixedParent.name}
          </p>
        ) : (
          <Select
            label={t("products.parentProduct")}
            name="add-product-parent"
            options={parentSelectOptions}
            value={parentPick}
            onChange={(e) => setValue("parentPick", e.target.value)}
            onBlur={() => {}}
          />
        )}
        <Input
          label={t("warehouse.productName")}
          labelRequired
          required
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
              name="add-product-category-root"
              options={rootCategoryOptions}
              value={categoryRootPick}
              onChange={(e) => {
                setValue("categoryRootPick", e.target.value);
                setValue("categorySubPick", "");
              }}
              onBlur={() => {}}
            />
            {showSubCategorySelect ? (
              <Select
                label={t("products.categorySubLabel")}
                name="add-product-category-sub"
                options={subCategoryOptions}
                value={categorySubPick}
                onChange={(e) => setValue("categorySubPick", e.target.value)}
                onBlur={() => {}}
              />
            ) : null}
          </>
        ) : null}
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
            disabled={createProduct.isPending || (categoriesLoading && !categoriesError)}
          >
            {createProduct.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
