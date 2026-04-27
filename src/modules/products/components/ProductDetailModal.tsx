"use client";

import { useProductInventory } from "@/modules/products/hooks/useProductQueries";
import { ProductDetailMovementsTab } from "@/modules/products/components/ProductDetailMovementsTab";
import { useProductCostHistory } from "@/modules/products/hooks/useProductCostQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, PencilIcon } from "@/shared/ui/EyeIcon";
import { Modal } from "@/shared/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  productId: number | null;
  productLabel: string;
  onClose: () => void;
  onEdit?: () => void;
};

type TabId = "inventory" | "movements" | "costHistory";

export function ProductDetailModal({ open, productId, productLabel, onClose, onEdit }: Props) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<TabId>("inventory");
  const { data: inv, isPending: invLoading, isError: invErr, error: invError } =
    useProductInventory(open && productId != null ? productId : null);
  const {
    data: costRows = [],
    isPending: costLoading,
    isError: costErr,
    error: costError,
  } = useProductCostHistory(
    {
      productId: open && productId != null ? productId : undefined,
    },
    open && tab === "costHistory" && productId != null && productId > 0
  );
  const parentProductId = inv?.parentProductId ?? null;
  const hasParentProduct = parentProductId != null && parentProductId > 0;
  const {
    data: parentCostRows = [],
    isPending: parentCostLoading,
    isError: parentCostErr,
    error: parentCostError,
  } = useProductCostHistory(
    {
      productId: hasParentProduct ? parentProductId : undefined,
    },
    open && tab === "costHistory" && hasParentProduct
  );

  useEffect(() => {
    if (open) setTab("inventory");
  }, [open, productId]);

  const titleId = "product-detail-title";
  const pid = productId ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={productLabel}
      description={t("products.detailDescription")}
      wide
      wideFixedHeight
      wideExpanded
      closeButtonLabel={t("common.close")}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          role="tablist"
          aria-label={t("products.detailTabsLabel")}
          className="flex shrink-0 gap-1 border-b border-zinc-200 px-4 sm:px-6"
        >
          <button
            type="button"
            role="tab"
            id="product-tab-inventory"
            aria-selected={tab === "inventory"}
            className={
              tab === "inventory"
                ? "-mb-px min-h-12 border-b-2 border-zinc-900 px-4 text-sm font-semibold text-zinc-900"
                : "min-h-12 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            }
            onClick={() => setTab("inventory")}
          >
            {t("products.tabInventory")}
          </button>
          <button
            type="button"
            role="tab"
            id="product-tab-movements"
            aria-selected={tab === "movements"}
            className={
              tab === "movements"
                ? "-mb-px min-h-12 border-b-2 border-zinc-900 px-4 text-sm font-semibold text-zinc-900"
                : "min-h-12 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            }
            onClick={() => setTab("movements")}
          >
            {t("products.tabMovements")}
          </button>
          <button
            type="button"
            role="tab"
            id="product-tab-cost-history"
            aria-selected={tab === "costHistory"}
            className={
              tab === "costHistory"
                ? "-mb-px min-h-12 border-b-2 border-zinc-900 px-4 text-sm font-semibold text-zinc-900"
                : "min-h-12 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            }
            onClick={() => setTab("costHistory")}
          >
            {t("products.tabCostHistory")}
          </button>
          {onEdit ? (
            <div className="ml-auto flex items-center">
              <Button
                type="button"
                variant="secondary"
                className={detailOpenIconButtonClass}
                onClick={onEdit}
                aria-label={t("products.editProduct")}
                title={t("products.editProduct")}
              >
                <PencilIcon className="h-5 w-5" />
              </Button>
            </div>
          ) : null}
        </div>

        <div
          role="tabpanel"
          aria-labelledby={
            tab === "inventory"
              ? "product-tab-inventory"
              : tab === "movements"
                ? "product-tab-movements"
                : "product-tab-cost-history"
          }
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:py-5"
        >
          {tab === "inventory" && (
            <section>
              <h3 className="sr-only">{t("products.sectionInventory")}</h3>
              {invErr ? (
                <p className="text-sm text-red-600">{toErrorMessage(invError)}</p>
              ) : invLoading ? (
                <p className="text-sm text-zinc-500">{t("common.loading")}</p>
              ) : inv ? (
                <>
                  {inv.parentProductName?.trim() ? (
                    <p className="text-sm text-zinc-600">
                      <span className="font-medium text-zinc-800">{t("products.detailParentLine")}:</span>{" "}
                      {inv.parentProductName}
                    </p>
                  ) : null}
                  {inv.categoryName?.trim() ? (
                    <p
                      className={`text-sm text-zinc-600 ${inv.parentProductName?.trim() ? "mt-1" : ""}`}
                    >
                      <span className="font-medium text-zinc-800">{t("products.colCategory")}:</span>{" "}
                      {inv.categoryName}
                    </p>
                  ) : null}
                  {inv.hasChildren ? (
                    <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                      {t("products.detailGroupNote")}
                    </p>
                  ) : null}
                  <div
                    className={`space-y-1 text-sm text-zinc-600 ${
                      inv.parentProductName?.trim() || inv.categoryName?.trim() || inv.hasChildren
                        ? "mt-2"
                        : ""
                    }`}
                  >
                    {inv.hasChildren ? (
                      <>
                        <p>
                          {t("products.detailOwnQtyLabel")}:{" "}
                          <span className="font-semibold text-zinc-900 tabular-nums">
                            {inv.ownTotalQuantity ?? inv.totalQuantity}
                          </span>
                        </p>
                        <p>
                          {t("products.detailGroupTotalLabel")}:{" "}
                          <span className="font-semibold text-zinc-900 tabular-nums">{inv.totalQuantity}</span>
                        </p>
                      </>
                    ) : (
                      <p>
                        {t("products.totalQty")}:{" "}
                        <span className="font-semibold text-zinc-900 tabular-nums">{inv.totalQuantity}</span>
                      </p>
                    )}
                  </div>
                  <Table className="mt-3">
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("products.colWarehouse")}</TableHeader>
                        <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inv.byWarehouse.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-sm text-zinc-500">
                            {t("products.notInAnyWarehouse")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        inv.byWarehouse.map((row) => (
                          <TableRow key={row.warehouseId}>
                            <TableCell dataLabel={t("products.colWarehouse")}>{row.warehouseName}</TableCell>
                            <TableCell dataLabel={t("products.colQty")} className="text-right tabular-nums">
                              {row.quantity}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </>
              ) : null}
            </section>
          )}

          {tab === "movements" && pid > 0 && (
            <section className="flex min-h-0 flex-1 flex-col">
              <h3 className="sr-only">{t("products.sectionMovements")}</h3>
              <ProductDetailMovementsTab
                productId={pid}
                enabled={open && tab === "movements"}
              />
            </section>
          )}
          {tab === "costHistory" && pid > 0 && (
            <section className="flex min-h-0 flex-1 flex-col">
              <h3 className="sr-only">{t("products.sectionCostHistory")}</h3>
              {costErr ? (
                <p className="text-sm text-red-600">{toErrorMessage(costError)}</p>
              ) : costLoading ? (
                <p className="text-sm text-zinc-500">{t("common.loading")}</p>
              ) : costRows.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("products.costHistory.empty")}</p>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("products.costHistory.colDate")}</TableHeader>
                      <TableHeader className="text-right">{t("products.costHistory.colExVat")}</TableHeader>
                      <TableHeader className="text-right">{t("products.costHistory.colIncVat")}</TableHeader>
                      <TableHeader className="text-right">{t("products.costHistory.colVatRate")}</TableHeader>
                      <TableHeader>{t("products.costHistory.colNote")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.effectiveDate}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatLocaleAmount(r.unitCostExcludingVat, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatLocaleAmount(r.unitCostIncludingVat, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">%{r.vatRate}</TableCell>
                        <TableCell>{r.note?.trim() || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {hasParentProduct ? (
                <div className="mt-5 border-t border-zinc-200 pt-4">
                  <p className="mb-2 text-sm font-medium text-zinc-800">
                    {t("products.parentCostHistoryTitle").replace(
                      "{name}",
                      inv?.parentProductName?.trim() || t("products.detailParentLine")
                    )}
                  </p>
                  {parentCostErr ? (
                    <p className="text-sm text-red-600">{toErrorMessage(parentCostError)}</p>
                  ) : parentCostLoading ? (
                    <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : parentCostRows.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("products.parentCostHistoryEmpty")}</p>
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>{t("products.costHistory.colDate")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colExVat")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colIncVat")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colVatRate")}</TableHeader>
                          <TableHeader>{t("products.costHistory.colNote")}</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parentCostRows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.effectiveDate}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLocaleAmount(r.unitCostExcludingVat, locale)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLocaleAmount(r.unitCostIncludingVat, locale)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">%{r.vatRate}</TableCell>
                            <TableCell>{r.note?.trim() || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
