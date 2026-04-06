"use client";

import { useProductInventory } from "@/modules/products/hooks/useProductQueries";
import { ProductDetailMovementsTab } from "@/modules/products/components/ProductDetailMovementsTab";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
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
};

type TabId = "inventory" | "movements";

export function ProductDetailModal({ open, productId, productLabel, onClose }: Props) {
  const { t } = useI18n();
  const { data: inv, isPending: invLoading, isError: invErr, error: invError } =
    useProductInventory(open && productId != null ? productId : null);

  const [tab, setTab] = useState<TabId>("inventory");

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
        </div>

        <div
          role="tabpanel"
          aria-labelledby={tab === "inventory" ? "product-tab-inventory" : "product-tab-movements"}
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
                  <p className="text-sm text-zinc-600">
                    {t("products.totalQty")}:{" "}
                    <span className="font-semibold text-zinc-900">{inv.totalQuantity}</span>
                  </p>
                  <Table className="mt-3">
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("products.colWarehouse")}</TableHeader>
                        <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inv.byWarehouse.map((row) => (
                        <TableRow key={row.warehouseId}>
                          <TableCell>{row.warehouseName}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                        </TableRow>
                      ))}
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
        </div>
      </div>
    </Modal>
  );
}
