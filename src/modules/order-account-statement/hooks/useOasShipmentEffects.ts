"use client";

import { useEffect, useMemo, type MutableRefObject } from "react";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  fetchShipmentInvoiceability,
  type ShipmentInvoiceabilityLine,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  fetchWarehouseOutboundShipmentMovementForEdit,
  fetchWarehouses,
} from "@/modules/warehouse/api/warehouses-api";
import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import type {
  ShipmentOption,
  SelectedShipmentSource,
} from "@/modules/order-account-statement/hooks/useOasShipmentSelection";

/**
 * URL'den shipment prefill (query string) parse'ı + sevkiyat odaklı 4 effect:
 *  1. Prefill varsa creationMode = "shipmentBased",
 *  2. shipmentBased modda warehouse'lardan OUT hareketleri çek ve gruplara böl,
 *  3. Prefill key ile sevkiyatı/grup'u forma yükle (otomatik) + önizleme aç,
 *  4. Seçili kaynağa göre selectedShipmentOptionKey senkronu,
 *  5. Seçili kaynağa göre invoiceability satırlarını çek.
 *
 * SRP: yalnızca sevkiyat yan etkileri + prefill parsing.
 */
type Params = {
  searchParams: URLSearchParams | { get: (k: string) => string | null };
  creationMode: "manual" | "shipmentBased";
  setCreationMode: (m: "manual" | "shipmentBased") => void;
  selectedShipmentSource: SelectedShipmentSource | null;

  setShipmentOptions: (opts: ShipmentOption[]) => void;
  setShipmentOptionsBusy: (v: boolean) => void;
  setSelectedShipmentOptionKey: (key: string) => void;
  setShipmentInvoiceability: React.Dispatch<React.SetStateAction<ShipmentInvoiceabilityLine[]>>;
  setShipmentInvoiceabilityBusy: (v: boolean) => void;

  loadShipmentIntoForm: (warehouseId: number, movementId: number, source: "auto" | "manual") => Promise<void>;
  loadShipmentGroupIntoForm: (option: ShipmentOption, source: "auto" | "manual") => Promise<void>;
  setPreviewModalOpen: (v: boolean) => void;

  shipmentPrefillKeyRef: MutableRefObject<string>;
};

export function useOasShipmentEffects(p: Params) {
  const shipmentPrefillParams = useMemo(() => {
    const warehouseIdRaw = p.searchParams.get("shipmentWarehouseId") ?? "";
    const movementIdRaw = p.searchParams.get("shipmentMovementId") ?? "";
    const movementIdsRaw = p.searchParams.get("shipmentMovementIds") ?? "";
    const warehouseId = Number.parseInt(warehouseIdRaw, 10);
    const movementId = Number.parseInt(movementIdRaw, 10);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0) return null;
    if (!Number.isFinite(movementId) || movementId <= 0) return null;
    const parsedIds = movementIdsRaw
      .split(",")
      .map((x) => Number.parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const movementIds = Array.from(new Set([movementId, ...parsedIds]));
    return {
      warehouseId,
      movementId,
      movementIds,
      key: `${warehouseId}:${movementIds.join(",")}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.searchParams]);

  // (1) prefill varsa shipmentBased moduna geç.
  useEffect(() => {
    if (!shipmentPrefillParams) return;
    p.setCreationMode("shipmentBased");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentPrefillParams]);

  // (2) shipmentBased modda otomatik sevkiyat seçenekleri.
  useEffect(() => {
    if (p.creationMode !== "shipmentBased") return;
    let alive = true;
    p.setShipmentOptionsBusy(true);
    void (async () => {
      try {
        const warehouses = await fetchWarehouses();
        const pages = await Promise.all(
          warehouses.map(async (w) => {
            const page = await fetchWarehouseMovementsPage(w.id, { page: 1, pageSize: 200, type: "OUT" });
            return { warehouse: w, items: page.items };
          })
        );
        if (!alive) return;
        const groups = new Map<string, ShipmentOption>();
        for (const { warehouse, items } of pages) {
          for (const m of items) {
            if (!(m.type === "OUT" && m.isDepotToBranchShipment)) continue;
            const branchName = m.outDestinationBranchName?.trim() || "-";
            const groupKey = `${warehouse.id}|${branchName}|${m.movementDate}`;
            const existing = groups.get(groupKey);
            if (!existing) {
              groups.set(groupKey, {
                key: groupKey,
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                branchName,
                movementDate: m.movementDate,
                movementIds: [m.id],
                items: [
                  {
                    movementId: m.id,
                    productId: m.productId,
                    parentProductId: m.parentProductId ?? null,
                    parentProductName: m.parentProductName ?? null,
                    productName: m.productName,
                    quantity: Number(m.quantity) || 0,
                    unit: m.unit?.trim() || "",
                  },
                ],
              });
            } else {
              if (!existing.movementIds.includes(m.id)) existing.movementIds.push(m.id);
              existing.items.push({
                movementId: m.id,
                productId: m.productId,
                parentProductId: m.parentProductId ?? null,
                parentProductName: m.parentProductName ?? null,
                productName: m.productName,
                quantity: Number(m.quantity) || 0,
                unit: m.unit?.trim() || "",
              });
            }
          }
        }
        const options: ShipmentOption[] = [...groups.values()].sort((a, b) =>
          String(b.movementDate).localeCompare(String(a.movementDate))
        );
        p.setShipmentOptions(options);
      } catch {
        if (!alive) return;
        p.setShipmentOptions([]);
      } finally {
        if (!alive) return;
        p.setShipmentOptionsBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.creationMode]);

  // (3) Prefill loader — tek hareket veya grup; bittikten sonra önizlemeyi aç.
  useEffect(() => {
    if (!shipmentPrefillParams) return;
    if (p.shipmentPrefillKeyRef.current === shipmentPrefillParams.key) return;
    p.shipmentPrefillKeyRef.current = shipmentPrefillParams.key;
    let alive = true;
    const loadPromise =
      shipmentPrefillParams.movementIds.length > 1
        ? (async () => {
            const details = await Promise.all(
              shipmentPrefillParams.movementIds.map(async (movementId) =>
                await fetchWarehouseOutboundShipmentMovementForEdit(shipmentPrefillParams.warehouseId, movementId)
              )
            );
            const first = details[0];
            if (!first) return;
            const option: ShipmentOption = {
              key: shipmentPrefillParams.key,
              warehouseId: shipmentPrefillParams.warehouseId,
              warehouseName: "",
              branchName: first.branchName?.trim() || "",
              movementDate: first.businessDate,
              movementIds: details.map((x) => x.id),
              items: details.map((x) => ({
                movementId: x.id,
                productId: x.productId,
                parentProductId: null,
                parentProductName: null,
                productName: x.productName,
                quantity: Number(x.quantity) || 0,
                unit: x.unit?.trim() || "",
              })),
            };
            await p.loadShipmentGroupIntoForm(option, "auto");
          })()
        : p.loadShipmentIntoForm(
            shipmentPrefillParams.warehouseId,
            shipmentPrefillParams.movementId,
            "auto"
          );
    void loadPromise
      .then(() => {
        if (!alive) return;
        p.setPreviewModalOpen(true);
      })
      .catch((error) => {
        if (!alive) return;
        notify.error(toErrorMessage(error));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentPrefillParams, p.loadShipmentGroupIntoForm, p.loadShipmentIntoForm]);

  // (4) Seçili kaynağa göre option key senkronu.
  useEffect(() => {
    if (!p.selectedShipmentSource) {
      p.setSelectedShipmentOptionKey("");
      return;
    }
    p.setSelectedShipmentOptionKey(p.selectedShipmentSource.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.selectedShipmentSource]);

  // (5) Seçili kaynağa göre invoiceability satırlarını yükle.
  useEffect(() => {
    if (!p.selectedShipmentSource) {
      p.setShipmentInvoiceability([]);
      return;
    }
    let alive = true;
    p.setShipmentInvoiceabilityBusy(true);
    void Promise.all(
      p.selectedShipmentSource.movementIds.map(async (movementId) =>
        await fetchShipmentInvoiceability(movementId)
      )
    )
      .then((rowsGroups) => {
        if (!alive) return;
        p.setShipmentInvoiceability(rowsGroups.flat());
      })
      .catch(() => {
        if (!alive) return;
        p.setShipmentInvoiceability([]);
      })
      .finally(() => {
        if (!alive) return;
        p.setShipmentInvoiceabilityBusy(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.selectedShipmentSource]);

  return { shipmentPrefillParams };
}
