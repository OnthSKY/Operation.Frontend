"use client";

import type { ProductCategory } from "@/modules/products/api/product-categories-api";
import {
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategories,
  useUpdateProductCategory,
} from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, PencilIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphPackage } from "@/shared/ui/ToolbarGlyph";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";

type TreeNode = ProductCategory & { children: ProductCategory[] };

function categoriesListToolbarSummary(
  t: (key: string) => string,
  rootCount: number,
  locale: string
) {
  const key =
    locale === "en" && rootCount === 1
      ? "products.categoriesPage.listToolbarSummaryOne"
      : "products.categoriesPage.listToolbarSummary";
  return t(key).replace("{{count}}", String(rootCount));
}

function buildTree(flat: ProductCategory[]): TreeNode[] {
  const roots = flat.filter((c) => c.parentCategoryId == null);
  return roots.map((r) => ({
    ...r,
    children: flat
      .filter((c) => c.parentCategoryId === r.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
  }));
}

export function ProductCategoriesScreen() {
  const { t, locale } = useI18n();
  const { data: flat = [], isPending, isError, error } = useProductCategories();
  const createCat = useCreateProductCategory();
  const updateCat = useUpdateProductCategory();
  const deleteCat = useDeleteProductCategory();

  const tree = useMemo(() => buildTree(flat), [flat]);

  const [addOpen, setAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [addName, setAddName] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const openAddRoot = () => {
    setAddParentId(null);
    setAddName("");
    setAddOpen(true);
  };

  const openAddSub = (parentId: number) => {
    setAddParentId(parentId);
    setAddName("");
    setAddOpen(true);
  };

  const openEdit = (c: ProductCategory) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditOpen(true);
  };

  const onSaveAdd = async () => {
    const n = addName.trim();
    if (!n) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await createCat.mutateAsync({
        name: n,
        parentCategoryId: addParentId ?? undefined,
      });
      notify.success(t("toast.productCategoryCreated"));
      setAddOpen(false);
      setAddName("");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onSaveEdit = async () => {
    if (editId == null) return;
    const n = editName.trim();
    if (!n) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await updateCat.mutateAsync({ id: editId, name: n });
      notify.success(t("toast.productCategoryUpdated"));
      setEditOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = async (c: ProductCategory) => {
    if (!window.confirm(`${t("products.categoriesPage.confirmDelete")}\n${c.name}`)) return;
    try {
      await deleteCat.mutateAsync(c.id);
      notify.success(t("toast.productCategoryDeleted"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const deleteBlockedReason = (c: ProductCategory): string | null => {
    if (c.productCount > 0) return t("products.categoriesPage.blockedHasProducts");
    if (c.childCount > 0) return t("products.categoriesPage.blockedHasChildren");
    return null;
  };

  return (
    <>
      <PageScreenScaffold
        className="min-w-0"
        intro={
          <>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
                {t("products.categoriesPage.title")}
              </h1>
              <p className="mt-1 text-sm leading-snug text-zinc-500">{t("products.categoriesPage.subtitle")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="products"
              className="mt-3 min-w-0 sm:mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.productCategories.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.productCategories.step1") },
                { text: t("pageHelp.productCategories.step2") },
                {
                  text: t("pageHelp.productCategories.step3"),
                  link: { href: "/products", label: t("pageHelp.productCategories.step3Link") },
                },
              ]}
            />
          </>
        }
        main={
          <>
            {isError ? (
              <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            ) : isPending ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : tree.length === 0 ? (
              <Card title={t("products.categoriesPage.title")}>
                <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200/90 bg-gradient-to-r from-violet-50/40 via-zinc-50/60 to-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      {t("products.categoriesPage.listToolbarEyebrow")}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-snug text-zinc-800">
                      {categoriesListToolbarSummary(t, 0, locale)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full shrink-0 px-4 touch-manipulation sm:w-auto sm:min-w-[12rem]"
                    onClick={openAddRoot}
                    aria-label={t("products.categoriesPage.addRoot")}
                    title={t("products.categoriesPage.addRoot")}
                  >
                    <ToolbarGlyphPackage className="mr-2 h-5 w-5 shrink-0 opacity-90" aria-hidden />
                    <span className="truncate">{t("products.categoriesPage.addRoot")}</span>
                  </Button>
                </div>
                <p className="text-sm text-zinc-600">{t("products.categoriesPage.empty")}</p>
              </Card>
            ) : (
              <>
                <div className="mb-3 flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200/90 bg-gradient-to-r from-violet-50/40 via-zinc-50/60 to-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/[0.03] sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      {t("products.categoriesPage.listToolbarEyebrow")}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-snug text-zinc-800">
                      {categoriesListToolbarSummary(t, tree.length, locale)}
                    </p>
                  </div>
                  <Tooltip content={t("products.categoriesPage.addRoot")} delayMs={200}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full shrink-0 px-4 touch-manipulation sm:w-auto sm:min-w-[12rem]"
                      onClick={openAddRoot}
                      aria-label={t("products.categoriesPage.addRoot")}
                      title={t("products.categoriesPage.addRoot")}
                    >
                      <ToolbarGlyphPackage className="mr-2 h-5 w-5 shrink-0 opacity-90" aria-hidden />
                      <span className="truncate">{t("products.categoriesPage.addRoot")}</span>
                    </Button>
                  </Tooltip>
                </div>
              <ul className="flex min-w-0 w-full flex-col gap-3">
          {tree.map((root) => (
            <li key={root.id} className="min-w-0">
              <Card className="overflow-hidden p-0 shadow-sm shadow-zinc-900/5 ring-1 ring-zinc-200/80">
                <div className="flex flex-col gap-3 border-b border-zinc-100 bg-gradient-to-r from-violet-50/50 to-white px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4 sm:py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700/90">
                      {t("products.categoriesPage.badgeRoot")}
                    </p>
                    <p className="mt-1 break-words text-lg font-semibold leading-snug text-zinc-900">{root.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {root.productCount} {t("products.categoriesPage.productsWord")} · {root.childCount}{" "}
                      {t("products.categoriesPage.subsWord")}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex min-w-0 flex-wrap items-center gap-1.5",
                      "w-full max-sm:pt-0.5 sm:w-auto sm:shrink-0 sm:justify-end"
                    )}
                  >
                    <Tooltip content={t("products.categoriesPage.addSub")} delayMs={200}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("products.categoriesPage.addSub")}
                        title={t("products.categoriesPage.addSub")}
                        onClick={() => openAddSub(root.id)}
                      >
                        <PlusIcon />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t("products.categoriesPage.edit")} delayMs={200}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={detailOpenIconButtonClass}
                        aria-label={t("products.categoriesPage.edit")}
                        title={t("products.categoriesPage.edit")}
                        onClick={() => openEdit(root)}
                      >
                        <PencilIcon />
                      </Button>
                    </Tooltip>
                    {(() => {
                      const reason = deleteBlockedReason(root);
                      return (
                        <Tooltip content={reason ?? t("common.delete")} delayMs={200}>
                          <button
                            type="button"
                            className={trashIconActionButtonClass}
                            disabled={reason != null || deleteCat.isPending}
                            aria-label={t("common.delete")}
                            title={reason ?? undefined}
                            onClick={() => void onDelete(root)}
                          >
                            <TrashIcon />
                          </button>
                        </Tooltip>
                      );
                    })()}
                  </div>
                </div>
                {root.children.length === 0 ? (
                  <p className="px-3 py-3 text-sm leading-snug text-zinc-500 sm:px-4">{t("products.categoriesPage.noSubs")}</p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {root.children.map((ch) => (
                      <li
                        key={ch.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5"
                      >
                        <div className="min-w-0 flex-1 border-s-2 border-violet-200 ps-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            {t("products.categoriesPage.badgeSub")}
                          </p>
                          <p className="mt-0.5 break-words font-medium leading-snug text-zinc-900">{ch.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {ch.productCount} {t("products.categoriesPage.productsWord")}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex flex-wrap items-center gap-1.5",
                            "w-full max-sm:ps-[calc(0.75rem+2px)] sm:w-auto sm:shrink-0 sm:justify-end sm:ps-0"
                          )}
                        >
                          <Tooltip content={t("products.categoriesPage.edit")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-label={t("products.categoriesPage.edit")}
                              title={t("products.categoriesPage.edit")}
                              onClick={() => openEdit(ch)}
                            >
                              <PencilIcon />
                            </Button>
                          </Tooltip>
                          {(() => {
                            const reason = deleteBlockedReason(ch);
                            return (
                              <Tooltip content={reason ?? t("common.delete")} delayMs={200}>
                                <button
                                  type="button"
                                  className={trashIconActionButtonClass}
                                  disabled={reason != null || deleteCat.isPending}
                                  aria-label={t("common.delete")}
                                  title={reason ?? undefined}
                                  onClick={() => void onDelete(ch)}
                                >
                                  <TrashIcon />
                                </button>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
              </>
            )}
          </>
        }
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        titleId="add-category-tree"
        title={
          addParentId == null
            ? t("products.categoriesPage.modalAddRootTitle")
            : t("products.categoriesPage.modalAddSubTitle")
        }
        description={
          addParentId == null
            ? t("products.categoriesPage.modalAddRootHint")
            : t("products.categoriesPage.modalAddSubHint")
        }
      >
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label={t("products.newCategoryName")}
            labelRequired
            required
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            autoComplete="off"
            maxLength={150}
          />
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 sm:min-h-9" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={createCat.isPending}
              onClick={() => void onSaveAdd()}
            >
              {createCat.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        titleId="edit-category-name"
        title={t("products.categoriesPage.modalEditTitle")}
        description={t("products.categoriesPage.modalEditHint")}
      >
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label={t("products.newCategoryName")}
            labelRequired
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoComplete="off"
            maxLength={150}
          />
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 sm:min-h-9" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={updateCat.isPending}
              onClick={() => void onSaveEdit()}
            >
              {updateCat.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
