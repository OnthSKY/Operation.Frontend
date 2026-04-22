"use client";

import { AddProductCategoryModal } from "@/modules/products/components/AddProductCategoryModal";
import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { EditProductModal } from "@/modules/products/components/EditProductModal";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import { SetProductCategoryModal } from "@/modules/products/components/SetProductCategoryModal";
import {
  useProductsCatalog,
  useSoftDeleteProduct,
} from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { detailOpenIconButtonClass, EyeIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { ProductListItem } from "@/types/product";
import { ToolbarGlyphPackage, ToolbarGlyphReceipt } from "@/shared/ui/ToolbarGlyph";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function productKv(label: string, value: string) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-zinc-900">{value}</p>
    </div>
  );
}

function ProductWarehouseChips({
  r,
  t,
}: {
  r: ProductListItem;
  t: (key: string) => string;
}) {
  const list = r.byWarehouse ?? [];
  if (list.length === 0) {
    return <span className="text-sm text-zinc-400">{t("products.notInAnyWarehouse")}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((w) => (
        <Tooltip
          key={w.warehouseId}
          content={`${w.warehouseName}: ${w.quantity}`}
          delayMs={240}
        >
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900 ring-1 ring-violet-200/80">
            <span className="max-w-[12rem] truncate">{w.warehouseName}</span>
            <span className="shrink-0 tabular-nums text-violet-700">{w.quantity}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

export function ProductsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addFixedParent, setAddFixedParent] = useState<{ id: number; name: string } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailLabel, setDetailLabel] = useState("");
  const [categoryEdit, setCategoryEdit] = useState<ProductListItem | null>(null);
  const [productEdit, setProductEdit] = useState<ProductListItem | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");

  const productsMoreItems = useMemo(
    () => [
      {
        id: "categories",
        label: t("nav.productCategories"),
        onSelect: () => router.push("/products/categories"),
      },
      {
        id: "costHistory",
        label: t("nav.productCostHistory"),
        onSelect: () => router.push("/products/cost-history"),
      },
      {
        id: "addCategory",
        label: t("products.addCategory"),
        onSelect: () => setAddCategoryOpen(true),
      },
    ],
    [t, router]
  );

  const productCardHeaderActions = (
    <>
      <TableToolbarMoreMenu menuId="products-toolbar-more" items={productsMoreItems} />
      <Button
        type="button"
        variant="secondary"
        className="hidden sm:inline-flex"
        onClick={() => router.push("/products/cost-history")}
      >
        <span className="mr-2 inline-flex items-center">
          <ToolbarGlyphReceipt className="h-4 w-4" />
        </span>
        {t("nav.productCostHistory")}
      </Button>
      <Tooltip content={t("products.addProduct")} delayMs={200}>
        <Button
          type="button"
          variant="primary"
          className={TABLE_TOOLBAR_ICON_BTN}
          onClick={() => {
            setAddFixedParent(null);
            setAddOpen(true);
          }}
          aria-label={t("products.addProduct")}
        >
          <ToolbarGlyphPackage className="h-5 w-5" />
        </Button>
      </Tooltip>
    </>
  );

  const { data: catalogRows = [], isPending, isError, error } = useProductsCatalog();
  const del = useSoftDeleteProduct();

  const displayRows = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogRows;
    return catalogRows.filter((r) => {
      const name = r.name.toLowerCase();
      const cat = (r.categoryName ?? "").toLowerCase();
      const unit = (r.unit ?? "").toLowerCase();
      return name.includes(q) || cat.includes(q) || unit.includes(q);
    });
  }, [catalogRows, catalogSearch]);

  useEffect(() => {
    const raw = searchParams.get("openProduct");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    const row = catalogRows.find((r) => r.id === id);
    if (!row) return;
    setDetailId(id);
    setDetailLabel(row.name);
  }, [searchParams, catalogRows]);

  const onDelete = (id: number, label: string) => {
    notifyConfirmToast({
      toastId: "product-delete-confirm",
      title: t("products.confirmDeleteTitle"),
      message: (
        <>
          <p>{t("products.confirmDelete")}</p>
          <p className="break-words font-medium text-zinc-900">“{label}”</p>
        </>
      ),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await del.mutateAsync(id);
          notify.success(t("toast.productDeleted").replace("{name}", label));
          if (detailId === id) {
            setDetailId(null);
            setDetailLabel("");
          }
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  const openDetail = (id: number, name: string) => {
    setDetailId(id);
    setDetailLabel(name);
  };

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-6 sm:pb-4"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                {t("products.title")}
              </h1>
              <p className="text-sm text-zinc-500">{t("products.subtitle")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="products"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.products.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.products.step1") },
                { text: t("pageHelp.products.step2") },
                {
                  text: t("pageHelp.products.step3"),
                  link: { href: "/products/categories", label: t("pageHelp.products.step3Link") },
                },
                { text: t("pageHelp.products.step4") },
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
            ) : catalogRows.length === 0 ? (
              <Card title={t("common.pageSectionMain")} headerActions={productCardHeaderActions}>
                <p className="text-sm text-zinc-600">{t("products.emptyCatalog")}</p>
              </Card>
            ) : (
              <Card title={t("common.pageSectionMain")} headerActions={productCardHeaderActions}>
          <div className="mb-4">
            <Input
              name="product-catalog-search"
              placeholder={t("products.catalogSearchPlaceholder")}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoComplete="off"
              aria-label={t("products.catalogSearchPlaceholder")}
            />
          </div>
          {displayRows.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("products.catalogSearchNoResults")}</p>
          ) : (
            <>
          <div className="flex flex-col gap-4 md:hidden">
            {displayRows.map((r) => (
              <MobileListCard
                key={r.id}
                as="div"
                className="touch-manipulation flex flex-col gap-4 shadow-zinc-900/5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    className={`min-w-0 max-w-full truncate text-base font-semibold leading-snug text-zinc-900 ${r.parentProductId != null ? "border-l-2 border-violet-200 pl-3" : ""}`}
                  >
                    {r.name}
                  </p>
                  {r.hasChildren ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600">
                      {t("products.badgeGroup")}
                    </span>
                  ) : null}
                  {r.parentProductId != null ? (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
                      {t("products.badgeVariant")}
                    </span>
                  ) : null}
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {productKv(
                    t("products.colCategory"),
                    r.categoryName?.trim() ? r.categoryName : "—"
                  )}
                  {productKv(t("products.colUnit"), r.unit?.trim() ? r.unit : "—")}
                  <div className="min-w-0 sm:col-span-2">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("products.colTotal")}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
                      {r.totalQuantity}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                    {t("products.colInWarehouses")}
                  </p>
                  <div className="mt-1.5">
                    <ProductWarehouseChips r={r} t={t} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => setProductEdit(r)}
                  >
                    {t("products.editProduct")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => setCategoryEdit(r)}
                  >
                    {t("products.setCategory")}
                  </Button>
                  {r.parentProductId == null ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => {
                        setAddFixedParent({ id: r.id, name: r.name });
                        setAddOpen(true);
                      }}
                    >
                      {t("products.addSubProduct")}
                    </Button>
                  ) : null}
                  <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                    <Button
                      type="button"
                      variant="secondary"
                      className={`${detailOpenIconButtonClass} min-h-11 min-w-11`}
                      aria-haspopup="dialog"
                      aria-expanded={detailId === r.id}
                      aria-label={t("common.openDetailsDialog")}
                      title={t("common.openDetailsDialog")}
                      onClick={() => openDetail(r.id, r.name)}
                    >
                      <EyeIcon />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t("common.delete")} delayMs={200}>
                    <button
                      type="button"
                      className={`${trashIconActionButtonClass} min-h-11 min-w-11`}
                      aria-label={t("common.delete")}
                      onClick={() => onDelete(r.id, r.name)}
                      disabled={del.isPending}
                    >
                      <TrashIcon />
                    </button>
                  </Tooltip>
                </div>
              </MobileListCard>
            ))}
          </div>

          <div className="-mx-1 hidden overflow-x-auto md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("products.colName")}</TableHeader>
                  <TableHeader className="hidden lg:table-cell">{t("products.colCategory")}</TableHeader>
                  <TableHeader className="hidden md:table-cell">{t("products.colUnit")}</TableHeader>
                  <TableHeader className="min-w-[12rem]">{t("products.colInWarehouses")}</TableHeader>
                  <TableHeader className="text-right">{t("products.colTotal")}</TableHeader>
                  <TableHeader className="w-[1%] min-w-[6.5rem] whitespace-nowrap text-right">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={`font-medium text-zinc-900 ${r.parentProductId != null ? "pl-3 border-l-2 border-violet-200" : ""}`}
                        >
                          {r.name}
                        </div>
                        {r.hasChildren ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600">
                            {t("products.badgeGroup")}
                          </span>
                        ) : null}
                        {r.parentProductId != null ? (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
                            {t("products.badgeVariant")}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500 md:hidden">
                        {r.unit ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[10rem] truncate text-zinc-600 md:hidden lg:table-cell">
                      {r.categoryName?.trim() ? r.categoryName : "—"}
                    </TableCell>
                    <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-zinc-600 md:table-cell">
                      {r.unit ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1.5">
                        <ProductWarehouseChips r={r} t={t} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.totalQuantity}
                    </TableCell>
                    <TableCell className="w-[1%] whitespace-nowrap text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                        <Tooltip content={t("products.editProduct")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className="hidden px-2 text-xs md:inline-flex"
                            onClick={() => setProductEdit(r)}
                          >
                            {t("products.editProductShort")}
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("products.setCategory")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className="hidden px-2 text-xs lg:inline-flex"
                            onClick={() => setCategoryEdit(r)}
                          >
                            {t("products.setCategoryShort")}
                          </Button>
                        </Tooltip>
                        {r.parentProductId == null ? (
                          <Tooltip content={t("products.addSubProduct")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className="hidden px-2 text-xs sm:inline-flex"
                              onClick={() => {
                                setAddFixedParent({ id: r.id, name: r.name });
                                setAddOpen(true);
                              }}
                            >
                              {t("products.addSubProductShort")}
                            </Button>
                          </Tooltip>
                        ) : null}
                        <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-haspopup="dialog"
                            aria-expanded={detailId === r.id}
                            aria-label={t("common.openDetailsDialog")}
                            title={t("common.openDetailsDialog")}
                            onClick={() => openDetail(r.id, r.name)}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("common.delete")} delayMs={200}>
                          <button
                            type="button"
                            className={trashIconActionButtonClass}
                            aria-label={t("common.delete")}
                            onClick={() => onDelete(r.id, r.name)}
                            disabled={del.isPending}
                          >
                            <TrashIcon />
                          </button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            </>
          )}
        </Card>
            )}
          </>
        }
      />

      <AddProductCategoryModal open={addCategoryOpen} onClose={() => setAddCategoryOpen(false)} />
      <AddProductModal
        open={addOpen}
        fixedParent={addFixedParent}
        onClose={() => {
          setAddOpen(false);
          setAddFixedParent(null);
        }}
      />
      <SetProductCategoryModal
        open={categoryEdit != null}
        product={
          categoryEdit != null
            ? {
                id: categoryEdit.id,
                name: categoryEdit.name,
                categoryId: categoryEdit.categoryId,
              }
            : null
        }
        onClose={() => setCategoryEdit(null)}
      />
      <EditProductModal
        open={productEdit != null}
        product={
          productEdit != null
            ? {
                id: productEdit.id,
                name: productEdit.name,
                unit: productEdit.unit,
                categoryId: productEdit.categoryId ?? null,
                parentProductId: productEdit.parentProductId ?? null,
                hasChildren: Boolean(productEdit.hasChildren),
              }
            : null
        }
        onClose={() => setProductEdit(null)}
        onUpdated={({ id, name }) => {
          if (detailId === id) setDetailLabel(name);
        }}
      />
      <ProductDetailModal
        open={detailId != null}
        productId={detailId}
        productLabel={detailLabel}
        onClose={() => {
          setDetailId(null);
          setDetailLabel("");
        }}
        onEdit={
          detailId != null
            ? () => {
                const r = catalogRows.find((x) => x.id === detailId);
                if (r) setProductEdit(r);
              }
            : undefined
        }
      />
    </>
  );
}
