"use client";

import { useCallback } from "react";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  emptyLine,
  newId,
} from "@/modules/order-account-statement/components/oas-helpers";
import {
  fetchShipmentInvoiceability,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { fetchWarehouseOutboundShipmentMovementForEdit } from "@/modules/warehouse/api/warehouses-api";
import { fetchBranchStockReceiptTotalsByProduct } from "@/modules/branch/api/branches-api";
import type { ShipmentOption } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";
import type { ProductListItem } from "@/types/product";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";
import type { useOasInvoicing } from "@/modules/order-account-statement/hooks/useOasInvoicing";
import type { useOasLines } from "@/modules/order-account-statement/hooks/useOasLines";
import type { useOasPreview } from "@/modules/order-account-statement/hooks/useOasPreview";
import type { useOasShipmentSelection } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";

/**
 * Tek bir sevkiyat hareketini ya da bir sevkiyat grubunu (auto/manual) forma yükler;
 * manual giriş için kullanıcının verdiği warehouse/movement id'leri ile tek noktada
 * akış yönetimini sağlar.
 *
 * SRP: yalnızca "shipment → form" davranışı. State hook'larını bucket olarak alır;
 * UI side-effect'leri (notify) içerden uygulanır.
 */
type Params = {
  t: (k: string) => string;
  locale: "tr" | "en";
  catalog: ProductListItem[];
  shipmentPrefillDraftMode: boolean;
  identity: ReturnType<typeof useOasIdentity>;
  invoicing: ReturnType<typeof useOasInvoicing>;
  linesState: ReturnType<typeof useOasLines>;
  preview: ReturnType<typeof useOasPreview>;
  shipment: ReturnType<typeof useOasShipmentSelection>;
};

export function useOasShipmentLoader(params: Params) {
  const {
    t,
    locale,
    catalog,
    shipmentPrefillDraftMode,
    identity,
    invoicing,
    linesState,
    preview,
    shipment,
  } = params;

  const loadShipmentIntoForm = useCallback(
    async (warehouseId: number, movementId: number, source: "auto" | "manual") => {
      const sh = await fetchWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId);
      const productMeta = catalog.find((p) => p.id === sh.productId);
      const productKind: "parent" | "child" | "unknown" = productMeta
        ? productMeta.parentProductId && productMeta.parentProductId > 0
          ? "child"
          : "parent"
        : "unknown";
      shipment.setSelectedShipmentProductKind(productKind);
      shipment.setSelectedShipmentDetail(sh);
      shipment.setManualShipmentWarehouseIdText(String(warehouseId));
      shipment.setManualShipmentMovementIdText(String(movementId));
      identity.setBranchName(sh.branchName?.trim() || "");
      identity.setLinkedBranchId(String(sh.branchId));
      // Belge başlığı: şube + tarih + sevkiyat no'dan kurumsal kısa öneri (manuel yazılmadıysa).
      {
        const curTitle = (identity.documentTitle ?? "").trim();
        const defTitle = t("reports.orderAccountStatementDefaultDocumentTitle");
        if (!curTitle || curTitle === defTitle) {
          identity.setDocumentTitle(
            t("reports.orderAccountStatementAutoTitleShipment")
              .replace("{branch}", sh.branchName?.trim() || "—")
              .replace("{date}", formatLocaleDate(sh.businessDate, locale, ""))
              .replace("{no}", String(movementId))
          );
        }
      }
      preview.setShowQuantityColumn(true);
      invoicing.setInformationalOnly(false);
      invoicing.setSaveAsInvoice(true);
      invoicing.setSaveToSystem(true);
      if (source === "auto") invoicing.setInvoiceAutoPost(!shipmentPrefillDraftMode);
      invoicing.setCustomerAccountIdText("");
      linesState.setLines([
        {
          id: newId(),
          description: sh.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(sh.quantity) || 0), locale),
          unitText: sh.unit?.trim() || "",
          amount: 0,
          amountText: "",
          isGift: false,
          unitPriceText: "",
          selectedProductId: sh.productId,
          parentProductId: productMeta?.parentProductId ?? null,
          parentProductName: productMeta?.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: sh.branchStockMovementId,
          sourceWarehouseMovementId: sh.id,
        },
      ]);
      shipment.setSelectedShipmentSource({
        key: `${warehouseId}:${movementId}`,
        warehouseId,
        primaryMovementId: movementId,
        movementIds: [movementId],
        source,
      });
      const rows = await fetchShipmentInvoiceability(movementId);
      shipment.setShipmentInvoiceability(rows);
    },
    [catalog, identity, invoicing, linesState, locale, preview, shipment, shipmentPrefillDraftMode, t]
  );

  const loadShipmentGroupIntoForm = useCallback(
    async (option: ShipmentOption, source: "auto" | "manual") => {
      const firstMovementId = option.movementIds[0];
      if (!firstMovementId) return;
      const first = await fetchWarehouseOutboundShipmentMovementForEdit(option.warehouseId, firstMovementId);
      shipment.setSelectedShipmentDetail(first);
      shipment.setManualShipmentWarehouseIdText(String(option.warehouseId));
      shipment.setManualShipmentMovementIdText(String(firstMovementId));
      identity.setBranchName(first.branchName?.trim() || option.branchName || "");
      identity.setLinkedBranchId(String(first.branchId));
      // Belge başlığı: şube + tarih + sevkiyat no'dan kurumsal kısa öneri.
      // Yalnız boş ya da varsayılan başlıkta — kullanıcı manuel yazdıysa dokunma.
      {
        const curTitle = (identity.documentTitle ?? "").trim();
        const defTitle = t("reports.orderAccountStatementDefaultDocumentTitle");
        if (!curTitle || curTitle === defTitle) {
          const branch = (first.branchName?.trim() || option.branchName || "").trim();
          const dateStr = formatLocaleDate(first.businessDate, locale, "");
          identity.setDocumentTitle(
            t("reports.orderAccountStatementAutoTitleShipment")
              .replace("{branch}", branch || "—")
              .replace("{date}", dateStr)
              .replace("{no}", String(firstMovementId))
          );
        }
      }
      preview.setShowQuantityColumn(true);
      invoicing.setInformationalOnly(false);
      invoicing.setSaveAsInvoice(true);
      invoicing.setSaveToSystem(true);
      if (source === "auto") invoicing.setInvoiceAutoPost(!shipmentPrefillDraftMode);
      invoicing.setCustomerAccountIdText("");
      const productById = new Map(catalog.map((p) => [p.id, p] as const));
      const hasChild = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(p?.parentProductId && p.parentProductId > 0);
      });
      const hasParent = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(!p || !p.parentProductId || p.parentProductId <= 0);
      });
      shipment.setSelectedShipmentProductKind(hasChild && hasParent ? "unknown" : hasChild ? "child" : "parent");
      linesState.setLines(
        option.items.map((it) => ({
          ...emptyLine(),
          id: newId(),
          description: it.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(it.quantity) || 0), locale),
          unitText: it.unit?.trim() || "",
          selectedProductId: it.productId,
          parentProductId: it.parentProductId ?? null,
          parentProductName: it.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: it.movementId,
        }))
      );
      shipment.setSelectedShipmentSource({
        key: option.key,
        warehouseId: option.warehouseId,
        primaryMovementId: firstMovementId,
        movementIds: option.movementIds,
        source,
      });
      const invoiceabilityGroups = await Promise.all(
        option.movementIds.map(async (movementId) => await fetchShipmentInvoiceability(movementId))
      );
      shipment.setShipmentInvoiceability(invoiceabilityGroups.flat());
    },
    [catalog, identity, invoicing, linesState, locale, preview, shipment, shipmentPrefillDraftMode, t]
  );

  /**
   * Şubeye gelen tüm ürünleri (tarih aralığında, faturalı sevkiyatlar dahil) ürün bazında toplayıp
   * Kalemler'e yükler ve bilgi amaçlı moda geçer: fatura/sistem kaydı download akışında zorla kapalı.
   * Boş tarih = tüm zamanlar. Dönen değer: yüklenen satır sayısı (0 = form değişmedi).
   */
  const loadBranchProductTotalsIntoForm = useCallback(
    async (range: { dateFrom: string; dateTo: string; label: string }, mode: "replace" | "append") => {
      const branchId = Number.parseInt(identity.linkedBranchId, 10);
      if (!Number.isFinite(branchId) || branchId <= 0) {
        notify.error(t("reports.orderAccountStatementBranchProductsBranchRequired"));
        return 0;
      }
      const rows = await fetchBranchStockReceiptTotalsByProduct(branchId, {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      });
      if (rows.length === 0) {
        notify.info(t("reports.orderAccountStatementBranchProductsEmpty"));
        return 0;
      }
      const loaded = rows.map((r) => ({
        ...emptyLine(),
        description: r.productName,
        quantityText: formatLocaleAmountInput(Math.max(0, r.quantity), locale),
        unitText: r.unit?.trim() || "",
        selectedProductId: r.productId,
        parentProductId: r.parentProductId,
        parentProductName: r.parentProductName,
        lineSource: "manual" as const,
        manualReasonCode: "OPS_BRANCH_SUMMARY",
      }));
      invoicing.setInformationalOnly(true);
      invoicing.setSaveAsInvoice(false);
      invoicing.setSaveToSystem(false);
      shipment.setCreationMode("manual");
      shipment.setSelectedShipmentSource(null);
      linesState.setPromoLines([]);
      linesState.setPaidLines([]);
      linesState.setAdvanceText("");
      linesState.setPreviousBalanceText("");
      linesState.setLines((prev) =>
        mode === "append"
          ? [...prev.filter((l) => l.description.trim() || l.selectedProductId || l.amount > 0), ...loaded]
          : loaded
      );
      preview.setShowQuantityColumn(true);
      identity.setDocumentTitle(
        t("reports.orderAccountStatementBranchProductsTitle")
          .replace("{branch}", identity.branchName.trim() || "—")
          .replace("{range}", range.label)
      );
      return loaded.length;
    },
    [identity, invoicing, linesState, locale, preview, shipment, t]
  );

  const onLoadManualShipment = useCallback(async () => {
    const selectedGroup = shipment.shipmentOptions.find(
      (x) => x.key === shipment.selectedShipmentOptionKey
    );
    if (selectedGroup) {
      shipment.setManualShipmentBusy(true);
      try {
        await loadShipmentGroupIntoForm(selectedGroup, "manual");
        notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
      } catch (error) {
        notify.error(toErrorMessage(error));
      } finally {
        shipment.setManualShipmentBusy(false);
      }
      return;
    }
    const warehouseId = Number.parseInt(shipment.manualShipmentWarehouseIdText, 10);
    const movementId = Number.parseInt(shipment.manualShipmentMovementIdText, 10);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0 || !Number.isFinite(movementId) || movementId <= 0) {
      notify.error(t("reports.orderAccountStatementShipmentManualInputRequired"));
      return;
    }
    shipment.setManualShipmentBusy(true);
    try {
      await loadShipmentIntoForm(warehouseId, movementId, "manual");
      notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
    } catch (error) {
      notify.error(toErrorMessage(error));
    } finally {
      shipment.setManualShipmentBusy(false);
    }
  }, [loadShipmentGroupIntoForm, loadShipmentIntoForm, shipment, t]);

  return {
    loadShipmentIntoForm,
    loadShipmentGroupIntoForm,
    loadBranchProductTotalsIntoForm,
    onLoadManualShipment,
  };
}
