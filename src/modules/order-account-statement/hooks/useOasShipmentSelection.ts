"use client";

import { useState } from "react";
import type {
  ShipmentInvoiceabilityLine,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { WarehouseOutboundShipmentMovementEditResponse } from "@/modules/warehouse/api/warehouses-api";

/** Otomatik sevkiyat listesinden seçilen grup (cüzdan/depo + hareket id'leri). */
export type ShipmentOption = {
  key: string;
  warehouseId: number;
  warehouseName: string;
  branchName: string;
  movementDate: string;
  movementIds: number[];
  items: Array<{
    movementId: number;
    productId: number;
    parentProductId?: number | null;
    parentProductName?: string | null;
    productName: string;
    quantity: number;
    unit: string;
  }>;
};

/** Seçilen kaynak sevkiyat (form yüklendikten sonra hatırlanan). */
export type SelectedShipmentSource = {
  key: string;
  warehouseId: number;
  primaryMovementId: number;
  movementIds: number[];
  source: "auto" | "manual";
};

export type SelectedShipmentProductKind = "parent" | "child" | "unknown";

/**
 * Sevkiyat seçim/yükleme akışının tüm geçici state'lerini tek noktada toplar:
 * yaratım modu, link davranışı, otomatik/manuel form, seçili detay modali.
 *
 * SRP: yalnızca state container. Yan etkiler (API çağrıları, side-effect'ler)
 * orchestrator'da kalır; ileri hooks'da business logic'i de buraya alabiliriz.
 */
export function useOasShipmentSelection() {
  const [creationMode, setCreationMode] = useState<"manual" | "shipmentBased">("manual");
  const [shipmentLinkMode, setShipmentLinkMode] = useState<"strict" | "partial">("strict");

  const [shipmentInvoiceability, setShipmentInvoiceability] = useState<ShipmentInvoiceabilityLine[]>([]);
  const [shipmentInvoiceabilityBusy, setShipmentInvoiceabilityBusy] = useState(false);

  const [manualShipmentWarehouseIdText, setManualShipmentWarehouseIdText] = useState("");
  const [manualShipmentMovementIdText, setManualShipmentMovementIdText] = useState("");
  const [manualShipmentBusy, setManualShipmentBusy] = useState(false);

  const [shipmentOptionsBusy, setShipmentOptionsBusy] = useState(false);
  const [shipmentOptions, setShipmentOptions] = useState<ShipmentOption[]>([]);
  const [selectedShipmentOptionKey, setSelectedShipmentOptionKey] = useState("");

  const [shipmentDetailOpen, setShipmentDetailOpen] = useState(false);
  const [selectedShipmentDetail, setSelectedShipmentDetail] =
    useState<WarehouseOutboundShipmentMovementEditResponse | null>(null);

  const [selectedShipmentSource, setSelectedShipmentSource] =
    useState<SelectedShipmentSource | null>(null);
  const [selectedShipmentProductKind, setSelectedShipmentProductKind] =
    useState<SelectedShipmentProductKind>("unknown");

  return {
    // mode
    creationMode,
    setCreationMode,
    shipmentLinkMode,
    setShipmentLinkMode,

    // invoiceability
    shipmentInvoiceability,
    setShipmentInvoiceability,
    shipmentInvoiceabilityBusy,
    setShipmentInvoiceabilityBusy,

    // manual
    manualShipmentWarehouseIdText,
    setManualShipmentWarehouseIdText,
    manualShipmentMovementIdText,
    setManualShipmentMovementIdText,
    manualShipmentBusy,
    setManualShipmentBusy,

    // auto options
    shipmentOptionsBusy,
    setShipmentOptionsBusy,
    shipmentOptions,
    setShipmentOptions,
    selectedShipmentOptionKey,
    setSelectedShipmentOptionKey,

    // detail modal
    shipmentDetailOpen,
    setShipmentDetailOpen,
    selectedShipmentDetail,
    setSelectedShipmentDetail,

    // selection result
    selectedShipmentSource,
    setSelectedShipmentSource,
    selectedShipmentProductKind,
    setSelectedShipmentProductKind,
  };
}
