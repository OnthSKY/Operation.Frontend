"use client";

import { AddProductCategoryModal } from "@/modules/products/components/AddProductCategoryModal";
import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { EditProductModal } from "@/modules/products/components/EditProductModal";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import { SetProductCategoryModal } from "@/modules/products/components/SetProductCategoryModal";
import {
  useProductCategories,
  useProductsCatalogPaged,
  useSoftDeleteProduct,
} from "@/modules/products/hooks/useProductQueries";
import type { ProductCategory } from "@/modules/products/api/product-categories-api";
import { fetchProductInventory } from "@/modules/products/api/products-api";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { EyeIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import {
  TableToolbarMoreMenu,
  type TableToolbarMoreMenuItem,
} from "@/shared/components/TableToolbarMoreMenu";
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
import { cn } from "@/lib/cn";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type CatalogViewRow =
  | {
      kind: "parent";
      row: ProductListItem;
      subCount: number;
      subProductsVisible: boolean;
    }
  | { kind: "child"; row: ProductListItem };

function catalogRowMatchesQuery(r: ProductListItem, qLower: string): boolean {
  if (!qLower) return true;
  const name = r.name.toLowerCase();
  const cat = (r.categoryName ?? "").toLowerCase();
  const unit = (r.unit ?? "").toLowerCase();
  return name.includes(qLower) || cat.includes(qLower) || unit.includes(qLower);
}

function buildProductCatalogViewRows(
  catalogRows: ProductListItem[],
  catalogSearch: string,
  expandedParents: Record<number, boolean | undefined>
): CatalogViewRow[] {
  const q = catalogSearch.trim().toLowerCase();
  const childrenByParent = new Map<number, ProductListItem[]>();
  for (const r of catalogRows) {
    const pid = r.parentProductId;
    if (pid != null && pid > 0) {
      const list = childrenByParent.get(pid) ?? [];
      list.push(r);
      childrenByParent.set(pid, list);
    }
  }
  const parents = catalogRows.filter((r) => r.parentProductId == null);
  const out: CatalogViewRow[] = [];

  for (const p of parents) {
    const kids = childrenByParent.get(p.id) ?? [];
    const parentMatches = q ? catalogRowMatchesQuery(p, q) : true;
    const matchingKids = q ? kids.filter((c) => catalogRowMatchesQuery(c, q)) : kids;
    const childHitOnly = Boolean(q) && !parentMatches && matchingKids.length > 0;
    const parentVisible = !q || parentMatches || matchingKids.length > 0;
    if (!parentVisible) continue;

    const expanded = Boolean(expandedParents[p.id]);
    let visibleKids: ProductListItem[] = [];
    if (!q) {
      if (expanded && kids.length > 0) visibleKids = kids;
    } else if (childHitOnly) {
      visibleKids = matchingKids;
    } else if (parentMatches && expanded && kids.length > 0) {
      visibleKids = kids;
    }

    out.push({
      kind: "parent",
      row: p,
      subCount: kids.length,
      subProductsVisible: visibleKids.length > 0,
    });
    for (const c of visibleKids) {
      out.push({ kind: "child", row: c });
    }
  }
  return out;
}

function ChevronDownExpandIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200", expanded && "rotate-180", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function productKv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}

function renderCategoryValue(r: ProductListItem, t: (key: string) => string) {
  const category = r.categoryName?.trim() ? r.categoryName : "—";
  if (r.parentProductId == null) {
    return <span>{category}</span>;
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-200/90">
      <span className="truncate">{category}</span>
      <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-violet-700">
        {t("products.badgeVariant")}
      </span>
    </span>
  );
}

function getCategoryHierarchyLabel(
  row: ProductListItem,
  categoryById: Map<number, ProductCategory>
): { root: string; sub: string | null; full: string } | null {
  if (row.categoryId == null || row.categoryId <= 0) {
    return null;
  }
  const current = categoryById.get(row.categoryId);
  if (!current) {
    return null;
  }
  if (current.parentCategoryId == null) {
    return { root: current.name, sub: null, full: current.name };
  }
  const parent = categoryById.get(current.parentCategoryId);
  const root = parent?.name?.trim() || "—";
  const sub = current.name?.trim() || "—";
  return { root, sub, full: `${root} > ${sub}` };
}

function renderCategoryHierarchy(
  row: ProductListItem,
  categoryById: Map<number, ProductCategory>,
  t: (key: string) => string
) {
  const hierarchy = getCategoryHierarchyLabel(row, categoryById);
  if (!hierarchy) {
    return renderCategoryValue(row, t);
  }
  if (!hierarchy.sub) {
    return <span>{hierarchy.root}</span>;
  }
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-zinc-100/90 px-2 py-0.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
      <span className="truncate">{hierarchy.full}</span>
    </span>
  );
}

const CATALOG_PAGE_SIZE = 25;

function CatalogChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CatalogChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
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
          <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900 ring-1 ring-violet-200/80">
            <span className="min-w-0 max-w-[min(100%,12rem)] truncate sm:max-w-[14rem]">
              {w.warehouseName}
            </span>
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
  const [listPage, setListPage] = useState(1);
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean | undefined>>({});

  const toggleParentExpanded = useCallback((parentId: number) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  }, []);

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

  const {
    data: catalogPage,
    isPending,
    isError,
    error,
  } = useProductsCatalogPaged(listPage, CATALOG_PAGE_SIZE, catalogSearch);
  const { data: categories = [] } = useProductCategories();
  const del = useSoftDeleteProduct();

  const catalogRows = catalogPage?.items ?? [];
  const totalCount = catalogPage?.totalCount ?? 0;

  const listPageTotal = useMemo(
    () => Math.max(1, Math.ceil(totalCount / CATALOG_PAGE_SIZE)),
    [totalCount]
  );
  const categoryById = useMemo(() => {
    const map = new Map<number, ProductCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  useEffect(() => {
    setListPage(1);
  }, [catalogSearch]);

  useEffect(() => {
    if (listPage > listPageTotal) setListPage(listPageTotal);
  }, [listPage, listPageTotal]);

  const viewRows = useMemo(
    () => buildProductCatalogViewRows(catalogRows, catalogSearch, expandedParents),
    [catalogRows, catalogSearch, expandedParents]
  );

  useEffect(() => {
    const raw = searchParams.get("openProduct");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    setDetailId(id);
    const row = catalogRows.find((r) => r.id === id);
    if (row) {
      setDetailLabel(row.name);
      return;
    }
    setDetailLabel("");
    void fetchProductInventory(id)
      .then((inv) => {
        setDetailLabel(inv.productName);
      })
      .catch(() => {});
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

  const openWarehouseForProduct = (r: ProductListItem) => {
    const warehouseId = r.byWarehouse?.[0]?.warehouseId;
    if (warehouseId != null && warehouseId > 0) {
      router.push(`/warehouse?openWarehouse=${warehouseId}`);
      return;
    }
    router.push("/warehouse");
  };

  const quickActionsForRow = (r: ProductListItem): TableToolbarMoreMenuItem[] => [
    {
      id: `quick-add-sub-${r.id}`,
      label: t("products.quickAddSubProduct"),
      onSelect: () => {
        setAddFixedParent({ id: r.id, name: r.name });
        setAddOpen(true);
      },
      disabled: r.parentProductId != null,
    },
    {
      id: `quick-shipment-out-${r.id}`,
      label: t("products.quickShipmentOut"),
      onSelect: () => openWarehouseForProduct(r),
    },
    {
      id: `quick-warehouse-in-${r.id}`,
      label: t("products.quickWarehouseIn"),
      onSelect: () => openWarehouseForProduct(r),
    },
    {
      id: `quick-delete-${r.id}`,
      label: t("products.quickDelete"),
      onSelect: () => onDelete(r.id, r.name),
      disabled: del.isPending,
    },
  ];

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
            ) : isPending && !catalogPage ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : (
              <Card title={t("common.pageSectionMain")} headerActions={productCardHeaderActions}>
          <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <Input
              name="product-catalog-search"
              placeholder={t("products.catalogSearchPlaceholder")}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoComplete="off"
              aria-label={t("products.catalogSearchPlaceholder")}
            />
          </div>
          {totalCount === 0 && !catalogSearch.trim() ? (
            <p className="text-sm text-zinc-600">{t("products.emptyCatalog")}</p>
          ) : null}
          {totalCount === 0 && catalogSearch.trim() ? (
            <p className="text-sm text-zinc-600">{t("products.catalogSearchNoResults")}</p>
          ) : null}
          {totalCount > 0 ? (
            <>
          <div className="flex min-w-0 flex-col gap-3 sm:gap-4 md:hidden">
            {viewRows.map((item) => {
              const isChild = item.kind === "child";
              const r = item.row;
              const subCount = item.kind === "parent" ? item.subCount : 0;
              const subProductsVisible = item.kind === "parent" ? item.subProductsVisible : false;
              return (
              <MobileListCard
                key={r.id}
                as="div"
                className={cn(
                  "touch-manipulation flex w-full min-w-0 max-w-full flex-col gap-3 shadow-zinc-900/5 sm:gap-4",
                  isChild &&
                    "ml-1 border-l-[3px] border-violet-300/90 bg-violet-50/40 pl-2.5 sm:ml-3 sm:border-l-4 sm:pl-3"
                )}
              >
                <div className="flex min-w-0 items-stretch gap-2 sm:items-start sm:gap-2.5">
                  {!isChild && subCount > 0 ? (
                    <button
                      type="button"
                      className={cn(
                        "touch-manipulation select-none",
                        "inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 shadow-sm outline-none",
                        "min-h-11 active:bg-zinc-100",
                        "hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-400"
                      )}
                      onClick={() => toggleParentExpanded(r.id)}
                      aria-expanded={subProductsVisible}
                      aria-label={t("products.toggleSubProductsAria").replace(
                        "{count}",
                        String(subCount)
                      )}
                    >
                      <ChevronDownExpandIcon expanded={subProductsVisible} className="h-4 w-4 text-zinc-500" />
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600">
                        {t("products.badgeVariant")}
                      </span>
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.75rem] font-bold leading-none tabular-nums text-violet-700 ring-1 ring-violet-200/80">
                        {subCount}
                      </span>
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1 self-center sm:self-start">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-zinc-600 ring-1 ring-zinc-200">
                    #{r.id}
                  </span>
                  <p className="min-w-0 max-w-full break-words text-base font-semibold leading-snug text-zinc-900 [overflow-wrap:anywhere]">
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
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {productKv(
                    t("products.colCategory"),
                    renderCategoryHierarchy(r, categoryById, t)
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
                  <div className="mt-1.5 min-w-0">
                    <ProductWarehouseChips r={r} t={t} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                    aria-haspopup="dialog"
                    aria-expanded={detailId === r.id}
                    aria-label={t("products.quickView")}
                    title={t("products.quickView")}
                    onClick={() => openDetail(r.id, r.name)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <EyeIcon />
                      <span>{t("products.quickView")}</span>
                    </span>
                  </Button>
                  <TableToolbarMoreMenu
                    menuId={`product-mobile-quick-actions-${r.id}`}
                    items={quickActionsForRow(r)}
                    disabled={del.isPending}
                  />
                </div>
              </MobileListCard>
              );
            })}
          </div>

          <div className="hidden min-w-0 w-full md:block">
            <Table className="min-w-[40rem] sm:min-w-[44rem] lg:min-w-[720px]">
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
                {viewRows.map((item) => {
                  const isChild = item.kind === "child";
                  const r = item.row;
                  const subCount = item.kind === "parent" ? item.subCount : 0;
                  const subProductsVisible = item.kind === "parent" ? item.subProductsVisible : false;
                  return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      isChild && "bg-violet-50/35 hover:bg-violet-50/55",
                      "[&_td]:align-top"
                    )}
                  >
                    <TableCell className="min-w-0 max-w-[14rem] sm:max-w-none">
                      <div className={cn("flex min-w-0 items-center gap-2", isChild && "pl-4 sm:pl-8")}>
                        {!isChild && subCount > 0 ? (
                          <button
                            type="button"
                            className={cn(
                              "touch-manipulation select-none",
                              "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-700 outline-none",
                              "min-h-10 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-400 sm:min-h-9 sm:py-1"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleParentExpanded(r.id);
                            }}
                            aria-expanded={subProductsVisible}
                            aria-label={t("products.toggleSubProductsAria").replace(
                              "{count}",
                              String(subCount)
                            )}
                          >
                            <ChevronDownExpandIcon expanded={subProductsVisible} className="h-4 w-4 text-zinc-500" />
                            <span className="hidden text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600 lg:inline">
                              {t("products.badgeVariant")}
                            </span>
                            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums text-violet-700 ring-1 ring-violet-200/80 sm:text-xs">
                              {subCount}
                            </span>
                          </button>
                        ) : null}
                        {!isChild && subCount === 0 ? (
                          <span className="inline-flex w-9 shrink-0 justify-center sm:w-8" aria-hidden />
                        ) : null}
                        <span className="inline-flex shrink-0 items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-zinc-600 ring-1 ring-zinc-200">
                          #{r.id}
                        </span>
                        <div
                          className={cn(
                            "min-w-0 flex-1 break-words font-medium leading-snug text-zinc-900 [overflow-wrap:anywhere]",
                            isChild && "border-l-2 border-violet-200 pl-2"
                          )}
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
                      {renderCategoryHierarchy(r, categoryById, t)}
                    </TableCell>
                    <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-zinc-600 md:table-cell">
                      {r.unit ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-0">
                      <div className="flex min-w-0 max-w-md flex-wrap gap-1.5">
                        <ProductWarehouseChips r={r} t={t} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.totalQuantity}
                    </TableCell>
                    <TableCell className="w-[1%] whitespace-nowrap text-right align-middle">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-2.5 text-xs"
                          aria-haspopup="dialog"
                          aria-expanded={detailId === r.id}
                          aria-label={t("products.quickView")}
                          title={t("products.quickView")}
                          onClick={() => openDetail(r.id, r.name)}
                        >
                          <span className="inline-flex items-center gap-1">
                            <EyeIcon />
                            <span>{t("products.quickView")}</span>
                          </span>
                        </Button>
                        <TableToolbarMoreMenu
                          menuId={`product-row-quick-actions-${r.id}`}
                          items={quickActionsForRow(r)}
                          disabled={del.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

              {!isPending && !isError && totalCount > 0 ? (
                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-600">
                    {(listPage - 1) * CATALOG_PAGE_SIZE + 1}
                    {"–"}
                    {Math.min(listPage * CATALOG_PAGE_SIZE, totalCount)} · {t("products.pagingTotal")}{" "}
                    {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-11 px-0 sm:min-w-[6.75rem] sm:px-3"
                      aria-label={t("products.pagingPrev")}
                      disabled={listPage <= 1}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CatalogChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("products.pagingPrev")}</span>
                      </span>
                    </Button>
                    <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-zinc-700">
                      {listPage} / {listPageTotal}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-11 px-0 sm:min-w-[6.75rem] sm:px-3"
                      aria-label={t("products.pagingNext")}
                      disabled={listPage >= listPageTotal}
                      onClick={() => setListPage((p) => Math.min(listPageTotal, p + 1))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="hidden sm:inline">{t("products.pagingNext")}</span>
                        <CatalogChevronRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          </div>
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
                if (r) {
                  setProductEdit(r);
                  return;
                }
                void fetchProductInventory(detailId).then((inv) => {
                  setProductEdit({
                    id: inv.productId,
                    name: inv.productName,
                    unit: inv.unit,
                    categoryId: inv.categoryId ?? null,
                    categoryName: inv.categoryName ?? null,
                    parentProductId: inv.parentProductId ?? null,
                    hasChildren: Boolean(inv.hasChildren),
                    totalQuantity: inv.totalQuantity,
                    byWarehouse: (inv.byWarehouse ?? []).map((w) => ({
                      warehouseId: w.warehouseId,
                      warehouseName: w.warehouseName,
                      quantity: w.quantity,
                    })),
                  });
                });
              }
            : undefined
        }
      />
    </>
  );
}
