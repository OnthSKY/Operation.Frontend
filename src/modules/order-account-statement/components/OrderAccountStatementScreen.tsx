"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { companyBrandingLogoUrl, fetchSystemBranding } from "@/modules/admin/api/system-branding-api";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useProductCostHistory } from "@/modules/products/hooks/useProductCostQueries";
import { computeOrderAccountTotals } from "@/modules/order-account-statement/lib/compute-order-account-totals";
import {
  buildOrderAccountPdfFileName,
  buildHtmlNodeSinglePagePdfBlob,
} from "@/modules/order-account-statement/lib/download-preview-as-pdf";
import { uploadBranchDocument } from "@/modules/branch/api/branch-documents-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  addOutboundInvoiceReceipt,
  createShipmentInvoice,
  createOutboundInvoice,
  fetchCounterpartySuggestions,
  fetchOutboundInvoices,
  fetchSalesPriceHistory,
  fetchSalesPriceSuggestion,
  fetchShipmentInvoiceability,
  type CounterpartySuggestionRow,
  type OutboundInvoiceResponse,
  type SalesPriceHistoryRow,
  type SalesPriceSuggestion,
  type ShipmentInvoiceabilityLine,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { OrderAccountStatementActionsSection } from "@/modules/order-account-statement/components/OrderAccountStatementActionsSection";
import { OrderAccountStatementDocumentContentSection } from "@/modules/order-account-statement/components/OrderAccountStatementDocumentContentSection";
import { OrderAccountStatementPreviewSettings } from "@/modules/order-account-statement/components/OrderAccountStatementPreviewSettings";
import { cn } from "@/lib/cn";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { apiFetch } from "@/shared/api/client";
import {
  fetchWarehouseOutboundShipmentMovementForEdit,
  fetchWarehouses,
  type WarehouseOutboundShipmentMovementEditResponse,
} from "@/modules/warehouse/api/warehouses-api";
import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount, formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Checkbox } from "@/shared/ui/Checkbox";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import { OrderAccountLineProductPicker } from "@/modules/order-account-statement/components/OrderAccountLineProductPicker";
import {
  IcCheck,
  IcX,
  IcDownload,
  IcPlay,
  IcMaximize,
  IcEraser,
  IcCopy,
  IcLoader,
} from "@/modules/order-account-statement/components/oas-icons";
import type {
  LineDraft,
  PaidDraft,
  PromoDraft,
  OrderAccountContentPreset,
} from "@/modules/order-account-statement/components/oas-types";
// Geriye dönük uyumluluk: tip eskiden bu modülden export ediliyordu.
export type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";
import {
  SAMPLE_LINES,
  SAMPLE_CAFE,
  SAMPLE_BAKERY,
  SAMPLE_CATERING,
} from "@/modules/order-account-statement/components/oas-sample-data";
import {
  newId,
  emptyLine,
  emptyPaid,
  emptyPromo,
  computeLineAmountMismatch,
  isoDateStamp,
  isoDateOnly,
  buildOrderAccountDocumentMetadata,
  parseLines,
  parsePaid,
  parsePromo,
} from "@/modules/order-account-statement/components/oas-helpers";
import {
  RequiredMark,
  FlowStepPill,
  OasIconButton,
  OasTrashButton,
  OasStepVisualBadge,
  StatementFormStep,
  OrderAccountProductPricingIconButton,
} from "@/modules/order-account-statement/components/oas-ui";
import { LineCalcBlock } from "@/modules/order-account-statement/components/oas-line-calc-block";
import { OasTemplatePickers } from "@/modules/order-account-statement/components/oas-template-pickers";
import {
  StatementPaper,
  type StatementLayoutVariant,
} from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import type { ProductListItem } from "@/types/product";
import { createPortal } from "react-dom";
import { useBranchDetailOverlay } from "@/shared/branch-detail";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type ShipmentOption = {
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

type MultiActionStepId = "download" | "invoice" | "system";
type MultiActionStepState = "pending" | "running" | "done" | "skipped";
type MultiActionStep = {
  id: MultiActionStepId;
  label: string;
  state: MultiActionStepState;
};

export function OrderAccountStatementScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { openBranchDetail } = useBranchDetailOverlay();
  const searchParams = useSearchParams();
  const previewRef = useRef<HTMLDivElement>(null);
  const linesSectionRef = useRef<HTMLDivElement>(null);
  const emblemFileInputRef = useRef<HTMLInputElement>(null);
  const shipmentPrefillKeyRef = useRef<string>("");
  const brandingDefaultsLoadedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [brandingLogoBusy, setBrandingLogoBusy] = useState(false);

  const canSee =
    canSeeUiModule(user, PERM.uiProducts) || canSeeUiModule(user, PERM.uiReports);
  const canPickProducts = canSeeUiModule(user, PERM.uiProducts);
  const { data: catalog = [] } = useProductsCatalog(canPickProducts);
  const { data: costHistoryRows = [] } = useProductCostHistory({}, canPickProducts);
  const { data: branches = [] } = useBranchesList();

  const [companyName, setCompanyName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [linkedBranchId, setLinkedBranchId] = useState("");
  const [saveToSystem, setSaveToSystem] = useState(true);
  const [saveAsInvoice, setSaveAsInvoice] = useState(false);
  const [invoiceAutoPost, setInvoiceAutoPost] = useState(true);
  const [invoicePaymentDetailsOpen, setInvoicePaymentDetailsOpen] = useState(false);
  const [customerAccountIdText, setCustomerAccountIdText] = useState("");
  const [paymentIban, setPaymentIban] = useState("");
  const [paymentAccountHolder, setPaymentAccountHolder] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [showPaymentOnPdf, setShowPaymentOnPdf] = useState(true);
  const [lastCreatedInvoiceNo, setLastCreatedInvoiceNo] = useState("");
  const [suggestions, setSuggestions] = useState<CounterpartySuggestionRow[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [linePriceSuggestionByLineId, setLinePriceSuggestionByLineId] = useState<
    Record<string, SalesPriceSuggestion | undefined>
  >({});
  const [productPricingOpen, setProductPricingOpen] = useState(false);
  const [productPricingLineId, setProductPricingLineId] = useState<string | null>(null);
  const [productPricingProductId, setProductPricingProductId] = useState(0);
  const [productPricingTitle, setProductPricingTitle] = useState("");
  const [priceHistoryRows, setPriceHistoryRows] = useState<SalesPriceHistoryRow[]>([]);
  const [priceHistoryBusy, setPriceHistoryBusy] = useState(false);
  const [applyBranchOpenBalanceBusy, setApplyBranchOpenBalanceBusy] = useState(false);
  const [emblemDataUrl, setEmblemDataUrl] = useState("");
  const [defaultEmblemDataUrl, setDefaultEmblemDataUrl] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [defaultCompanyName, setDefaultCompanyName] = useState("");
  const [showDocumentTagline, setShowDocumentTagline] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()]);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const [paidLines, setPaidLines] = useState<PaidDraft[]>(() => []);
  const [promoLines, setPromoLines] = useState<PromoDraft[]>(() => []);
  const [advanceText, setAdvanceText] = useState("");
  const [receivedAdvancePostToLedger, setReceivedAdvancePostToLedger] = useState(true);
  const [previousBalanceText, setPreviousBalanceText] = useState("");
  const [statementDate] = useState(() => new Date());
  const [layoutVariant, setLayoutVariant] = useState<StatementLayoutVariant>("corporate");
  const [contentPreset, setContentPreset] = useState<OrderAccountContentPreset>("custom");
  const [showQuantityColumn, setShowQuantityColumn] = useState(true);
  const [desktopLineDetailsOpen, setDesktopLineDetailsOpen] = useState(false);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dragOverLineId, setDragOverLineId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewToolsCollapsed, setPreviewToolsCollapsed] = useState(false);
  const [confirmMultiActionOpen, setConfirmMultiActionOpen] = useState(false);
  const [multiActionSteps, setMultiActionSteps] = useState<MultiActionStep[]>([]);
  const [multiActionRunning, setMultiActionRunning] = useState(false);
  const [multiActionError, setMultiActionError] = useState("");
  const [portalMounted, setPortalMounted] = useState(false);
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
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<WarehouseOutboundShipmentMovementEditResponse | null>(null);
  const [selectedShipmentSource, setSelectedShipmentSource] = useState<{
    key: string;
    warehouseId: number;
    primaryMovementId: number;
    movementIds: number[];
    source: "auto" | "manual";
  } | null>(null);
  const [selectedShipmentProductKind, setSelectedShipmentProductKind] = useState<"parent" | "child" | "unknown">(
    "unknown"
  );
  const [lastCreatedInvoiceId, setLastCreatedInvoiceId] = useState<number | null>(null);
  const [lastSavedDocumentId, setLastSavedDocumentId] = useState<number | null>(null);
  const [orderDocumentKey, setOrderDocumentKey] = useState(() => `oas-${Date.now().toString(36)}`);
  const hasMultipleActions = saveAsInvoice || saveToSystem;
  const lineAddBlocked = creationMode === "shipmentBased" && shipmentLinkMode === "strict";

  const focusLineEditor = useCallback((lineId: string) => {
    linesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-line-desc-id="${lineId}"]`);
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // no-op
      }
    }, 220);
  }, []);
  const focusLineField = useCallback((lineId: string, field: "description" | "amount") => {
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-line-id="${lineId}"][data-line-field="${field}"]`);
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // no-op
      }
    }, 120);
  }, []);

  const handleAddLine = useCallback(() => {
    if (lineAddBlocked) return;
    const id = newId();
    setLines((prev) => [
      ...prev,
      {
        ...emptyLine(),
        id,
        lineSource: lineAddBlocked ? "shipment" : "manual",
        manualReasonCode: lineAddBlocked ? null : "OPS_OTHER",
      },
    ]);
    focusLineEditor(id);
  }, [focusLineEditor, lineAddBlocked]);
  const moveLine = useCallback((fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    setLines((prev) => {
      const fromIndex = prev.findIndex((x) => x.id === fromId);
      const toIndex = prev.findIndex((x) => x.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);
  const beginLineDrag = useCallback((lineId: string) => {
    setDraggingLineId(lineId);
    setDragOverLineId(lineId);
  }, []);
  const finishLineDrag = useCallback(() => {
    setDraggingLineId(null);
    setDragOverLineId(null);
  }, []);
  const hoverLineDropTarget = useCallback((lineId: string) => {
    if (!draggingLineId || draggingLineId === lineId) return;
    setDragOverLineId(lineId);
  }, [draggingLineId]);
  const dropLineOnTarget = useCallback((lineId: string) => {
    if (!draggingLineId || draggingLineId === lineId) {
      finishLineDrag();
      return;
    }
    moveLine(draggingLineId, lineId);
    finishLineDrag();
  }, [draggingLineId, finishLineDrag, moveLine]);
  const handleDuplicateLastLine = useCallback(() => {
    if (lineAddBlocked) return;
    let createdId = "";
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      createdId = newId();
      return [
        ...prev,
        {
          ...last,
          id: createdId,
          amount: 0,
          amountText: "",
          isGift: false,
          lineSource: lineAddBlocked ? "shipment" : "manual",
          manualReasonCode: lineAddBlocked ? null : (last.manualReasonCode ?? "OPS_OTHER"),
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        },
      ];
    });
    if (createdId) focusLineEditor(createdId);
  }, [focusLineEditor, lineAddBlocked]);
  const mobileLineIssueCount = useMemo(() => {
    return lines.filter((line) => {
      const amount = parseLocaleAmount((line.amountText ?? "").trim(), locale) || 0;
      const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
      return !line.description.trim() || amount <= 0 || amountMismatch != null;
    }).length;
  }, [lines, locale, showQuantityColumn]);
  const hasShipmentSelected = creationMode !== "shipmentBased" || selectedShipmentSource != null;
  const hasDocumentBasics = Boolean(companyName.trim() && branchName.trim() && documentTitle.trim());
  const hasReadyLine = lines.some((line) => {
    const amount = parseLocaleAmount((line.amountText ?? "").trim(), locale) || 0;
    return line.description.trim().length > 0 && amount > 0;
  });
  const flowCurrentStep = useMemo(() => {
    if (!hasShipmentSelected) return 2;
    if (!hasDocumentBasics) return creationMode === "shipmentBased" ? 3 : 2;
    if (!hasReadyLine) return 3;
    return 4;
  }, [creationMode, hasDocumentBasics, hasReadyLine, hasShipmentSelected]);
  const handleMobileLineEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, lineId: string, field: "description" | "amount") => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (field === "description") {
        focusLineField(lineId, "amount");
        return;
      }
      const idx = lines.findIndex((x) => x.id === lineId);
      if (idx >= 0 && idx < lines.length - 1) {
        const next = lines[idx + 1];
        if (next) focusLineField(next.id, "description");
        return;
      }
      handleAddLine();
    },
    [focusLineField, handleAddLine, lines]
  );

  useEffect(() => {
    const branchIdText = linkedBranchId.trim();
    const branchIdNum = Number.parseInt(branchIdText, 10);
    if (!Number.isFinite(branchIdNum) || branchIdNum <= 0) return;
    // Şube seçildiğinde cari id'yi şube id ile başlayan bir taslak değere getir.
    setCustomerAccountIdText(`${branchIdNum}001`);
    // Sistem şubesi seçimi, belge başlığındaki şube adını da otomatik eşler.
    const selectedBranch = branches.find((b) => b.id === branchIdNum);
    if (selectedBranch?.name?.trim()) setBranchName(selectedBranch.name.trim());
  }, [branches, linkedBranchId]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  /** Hesaplayıcıdan veya sevkiyattan adet/birim/birim fiyatı geldiğinde PDF ile form aynı kalsın. */
  useEffect(() => {
    const has = lines.some(
      (l) =>
        String(l.quantityText ?? "").trim() !== "" ||
        String(l.unitText ?? "").trim() !== "" ||
        String(l.unitPriceText ?? "").trim() !== ""
    );
    if (has) setShowQuantityColumn(true);
  }, [lines]);

  useEffect(() => {
    if (!previewModalOpen) {
      setPreviewToolsCollapsed(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewModalOpen]);

  const shipmentPrefillParams = useMemo(() => {
    const warehouseIdRaw = searchParams.get("shipmentWarehouseId") ?? "";
    const movementIdRaw = searchParams.get("shipmentMovementId") ?? "";
    const movementIdsRaw = searchParams.get("shipmentMovementIds") ?? "";
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
  }, [searchParams]);
  const shipmentPrefillDraftMode = useMemo(() => {
    const raw = (searchParams.get("invoiceDraft") ?? "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
  }, [searchParams]);
  const orderKeyFromQuery = useMemo(() => (searchParams.get("orderKey") ?? "").trim(), [searchParams]);

  useEffect(() => {
    if (!shipmentPrefillParams) return;
    setCreationMode("shipmentBased");
  }, [shipmentPrefillParams]);

  const loadShipmentIntoForm = useCallback(
    async (warehouseId: number, movementId: number, source: "auto" | "manual") => {
      const shipment = await fetchWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId);
      const productMeta = catalog.find((p) => p.id === shipment.productId);
      const productKind: "parent" | "child" | "unknown" = productMeta
        ? productMeta.parentProductId && productMeta.parentProductId > 0
          ? "child"
          : "parent"
        : "unknown";
      setSelectedShipmentProductKind(productKind);
      setSelectedShipmentDetail(shipment);
      setManualShipmentWarehouseIdText(String(warehouseId));
      setManualShipmentMovementIdText(String(movementId));
      setBranchName(shipment.branchName?.trim() || "");
      setLinkedBranchId(String(shipment.branchId));
      setShowQuantityColumn(true);
      setSaveAsInvoice(true);
      setSaveToSystem(true);
      if (source === "auto") setInvoiceAutoPost(!shipmentPrefillDraftMode ? true : false);
      setCustomerAccountIdText("");
      setLines([
        {
          id: newId(),
          description: shipment.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(shipment.quantity) || 0), locale),
          unitText: shipment.unit?.trim() || "",
          amount: 0,
          amountText: "",
          isGift: false,
          priceCalcMode: "piece",
          qtyText: formatLocaleAmountInput(Math.max(0, Number(shipment.quantity) || 0), locale),
          unitPriceText: "",
          kgText: "",
          tryPerKgText: "",
          selectedProductId: shipment.productId,
          parentProductId: productMeta?.parentProductId ?? null,
          parentProductName: productMeta?.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: shipment.branchStockMovementId,
          sourceWarehouseMovementId: shipment.id,
        },
      ]);
      setSelectedShipmentSource({
        key: `${warehouseId}:${movementId}`,
        warehouseId,
        primaryMovementId: movementId,
        movementIds: [movementId],
        source,
      });
      const rows = await fetchShipmentInvoiceability(movementId);
      setShipmentInvoiceability(rows);
    },
    [catalog, locale, shipmentPrefillDraftMode]
  );
  const loadShipmentGroupIntoForm = useCallback(
    async (option: ShipmentOption, source: "auto" | "manual") => {
      const firstMovementId = option.movementIds[0];
      if (!firstMovementId) return;
      const first = await fetchWarehouseOutboundShipmentMovementForEdit(option.warehouseId, firstMovementId);
      setSelectedShipmentDetail(first);
      setManualShipmentWarehouseIdText(String(option.warehouseId));
      setManualShipmentMovementIdText(String(firstMovementId));
      setBranchName(first.branchName?.trim() || option.branchName || "");
      setLinkedBranchId(String(first.branchId));
      setShowQuantityColumn(true);
      setSaveAsInvoice(true);
      setSaveToSystem(true);
      if (source === "auto") setInvoiceAutoPost(!shipmentPrefillDraftMode ? true : false);
      setCustomerAccountIdText("");
      const productById = new Map(catalog.map((p) => [p.id, p] as const));
      const hasChild = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(p?.parentProductId && p.parentProductId > 0);
      });
      const hasParent = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(!p || !p.parentProductId || p.parentProductId <= 0);
      });
      setSelectedShipmentProductKind(hasChild && hasParent ? "unknown" : hasChild ? "child" : "parent");
      setLines(
        option.items.map((it) => ({
          ...emptyLine(),
          id: newId(),
          description: it.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(it.quantity) || 0), locale),
          unitText: it.unit?.trim() || "",
          qtyText: formatLocaleAmountInput(Math.max(0, Number(it.quantity) || 0), locale),
          selectedProductId: it.productId,
          parentProductId: it.parentProductId ?? null,
          parentProductName: it.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: it.movementId,
        }))
      );
      setSelectedShipmentSource({
        key: option.key,
        warehouseId: option.warehouseId,
        primaryMovementId: firstMovementId,
        movementIds: option.movementIds,
        source,
      });
      const invoiceabilityGroups = await Promise.all(
        option.movementIds.map(async (movementId) => await fetchShipmentInvoiceability(movementId))
      );
      setShipmentInvoiceability(invoiceabilityGroups.flat());
    },
    [catalog, locale, shipmentPrefillDraftMode]
  );

  useEffect(() => {
    if (!orderKeyFromQuery) return;
    setOrderDocumentKey(orderKeyFromQuery);
  }, [orderKeyFromQuery]);

  useEffect(() => {
    if (creationMode !== "shipmentBased") return;
    let alive = true;
    setShipmentOptionsBusy(true);
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
        setShipmentOptions(options);
      } catch {
        if (!alive) return;
        setShipmentOptions([]);
      } finally {
        if (!alive) return;
        setShipmentOptionsBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [creationMode]);

  const loadBrandingLogoAsDataUrl = useCallback(async (updatedAtUtc?: string | null): Promise<string> => {
    const res = await apiFetch(companyBrandingLogoUrl(updatedAtUtc));
    if (!res.ok) throw new Error("branding-logo-missing");
    const blob = await res.blob();
    if (!blob.size) throw new Error("branding-logo-empty");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result) {
          reject(new Error("branding-logo-read-failed"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("branding-logo-read-failed"));
      reader.readAsDataURL(blob);
    });
  }, []);

  useEffect(() => {
    if (brandingDefaultsLoadedRef.current) return;
    brandingDefaultsLoadedRef.current = true;
    let alive = true;
    void fetchSystemBranding()
      .then(async (branding) => {
        if (!alive) return;
        const brandingCompany = branding.companyName?.trim() || "";
        if (brandingCompany) {
          setDefaultCompanyName(brandingCompany);
          if (!companyName.trim()) setCompanyName(brandingCompany);
          if (!documentTitle.trim()) setDocumentTitle(brandingCompany);
        }
        if (branding.hasLogo) {
          try {
            const dataUrl = await loadBrandingLogoAsDataUrl(branding.updatedAtUtc);
            if (!alive) return;
            setDefaultEmblemDataUrl(dataUrl);
            const isUsingDefaultOrEmpty = !emblemDataUrl || emblemDataUrl === defaultEmblemDataUrl;
            if (isUsingDefaultOrEmpty) setEmblemDataUrl(dataUrl);
          } catch {
            // Branding logo yoksa sessiz geç; kullanıcı manuel seçebilir.
          }
        }
      })
      .catch(() => {
        // Branding varsayılanı alınamazsa sayfa normal kullanımına devam eder.
      });
    return () => {
      alive = false;
    };
  }, [loadBrandingLogoAsDataUrl]);

  useEffect(() => {
    if (!shipmentPrefillParams) return;
    if (shipmentPrefillKeyRef.current === shipmentPrefillParams.key) return;
    shipmentPrefillKeyRef.current = shipmentPrefillParams.key;
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
            await loadShipmentGroupIntoForm(option, "auto");
          })()
        : loadShipmentIntoForm(
            shipmentPrefillParams.warehouseId,
            shipmentPrefillParams.movementId,
            "auto"
          );
    void loadPromise
      .then(() => {
        if (!alive) return;
        // Sevkiyattan gelen akışta kullanıcı hızlıca PDF alabilsin diye önizlemeyi direkt aç.
        setPreviewModalOpen(true);
      })
      .catch((error) => {
        if (!alive) return;
        notify.error(toErrorMessage(error));
      });
    return () => {
      alive = false;
    };
  }, [loadShipmentGroupIntoForm, loadShipmentIntoForm, shipmentPrefillParams]);

  useEffect(() => {
    if (!selectedShipmentSource) {
      setSelectedShipmentOptionKey("");
      return;
    }
    setSelectedShipmentOptionKey(selectedShipmentSource.key);
  }, [selectedShipmentSource]);

  const shipmentComboboxOptions = useMemo<RichComboboxOption[]>(
    () =>
      shipmentOptions.map((opt) => ({
        value: opt.key,
        title: `${opt.warehouseName} · ${opt.branchName}`,
        description: `${t("reports.orderAccountStatementShipmentDetailBranch")}: ${opt.branchName} · ${t("reports.orderAccountStatementShipmentDetailDate")}: ${opt.movementDate}`,
        detail: `${t("reports.orderAccountStatementShipmentProductKindLabel")}: ${
          opt.items.some((x) => x.parentProductId && x.parentProductId > 0)
            ? t("reports.orderAccountStatementShipmentProductKindChild")
            : t("reports.orderAccountStatementShipmentProductKindParent")
        } · ${t("reports.orderAccountStatementShipmentProductCount")}: ${opt.items.length} · ${t("reports.orderAccountStatementShipmentDetailWarehouseId")}#${opt.warehouseId}`,
      })),
    [locale, shipmentOptions, t]
  );

  useEffect(() => {
    if (!selectedShipmentSource) {
      setShipmentInvoiceability([]);
      return;
    }
    let alive = true;
    setShipmentInvoiceabilityBusy(true);
    void Promise.all(
      selectedShipmentSource.movementIds.map(async (movementId) => await fetchShipmentInvoiceability(movementId))
    )
      .then((rowsGroups) => {
        if (!alive) return;
        setShipmentInvoiceability(rowsGroups.flat());
      })
      .catch(() => {
        if (!alive) return;
        setShipmentInvoiceability([]);
      })
      .finally(() => {
        if (!alive) return;
        setShipmentInvoiceabilityBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedShipmentSource]);

  useEffect(() => {
    let alive = true;
    setSuggestionsBusy(true);
    void fetchCounterpartySuggestions()
      .then((rows) => {
        if (!alive) return;
        setSuggestions(rows);
      })
      .catch(() => {
        if (!alive) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!alive) return;
        setSuggestionsBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!previewModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewModalOpen]);

  const latestCostByProductId = useMemo(() => {
    const map = new Map<number, (typeof costHistoryRows)[number]>();
    for (const row of costHistoryRows) {
      if (!map.has(row.productId)) map.set(row.productId, row);
    }
    return map;
  }, [costHistoryRows]);
  const productPricingCostRows = useMemo(() => {
    if (productPricingProductId <= 0) return [];
    return costHistoryRows
      .filter((r) => r.productId === productPricingProductId)
      .slice()
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [costHistoryRows, productPricingProductId]);
  const activeCounterparty = useMemo(() => {
    const branchId = Number.parseInt(linkedBranchId, 10);
    if (Number.isFinite(branchId) && branchId > 0) {
      return { counterpartyType: "branch" as const, counterpartyId: branchId };
    }
    const customerId = Number.parseInt(customerAccountIdText, 10);
    if (Number.isFinite(customerId) && customerId > 0) {
      return { counterpartyType: "customer" as const, counterpartyId: customerId };
    }
    return null;
  }, [linkedBranchId, customerAccountIdText]);
  const loadSalesSuggestionForLine = useCallback(
    async (lineId: string, productId: number, applyIfEmpty = true) => {
      if (!activeCounterparty || !Number.isFinite(productId) || productId <= 0) return;
      try {
        const suggestion = await fetchSalesPriceSuggestion({
          productId,
          counterpartyType: activeCounterparty.counterpartyType,
          counterpartyId: activeCounterparty.counterpartyId,
          currencyCode: "TRY",
          lookbackDays: 90,
        });
        setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: suggestion ?? undefined }));
        if (!suggestion || !applyIfEmpty) return;
        const normalizedSuggested = formatLocaleAmountInput(
          Math.max(0, Number(suggestion.suggestedUnitPrice) || 0),
          locale
        );
        setLines((prev) =>
          prev.map((line) => {
            if (line.id !== lineId) return line;
            const current = (line.unitPriceText ?? "").trim();
            if (current.length > 0) return line;
            return {
              ...line,
              unitPriceText: normalizedSuggested,
              tryPerKgText: line.priceCalcMode === "kg" ? normalizedSuggested : line.tryPerKgText,
            };
          })
        );
      } catch {
        setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      }
    },
    [activeCounterparty, locale]
  );
  const closeProductPricingPanel = useCallback(() => {
    setProductPricingOpen(false);
    setProductPricingLineId(null);
    setProductPricingProductId(0);
    setPriceHistoryRows([]);
  }, []);

  const openProductPricingPanel = useCallback(
    (line: LineDraft) => {
      const productId = line.selectedProductId ?? 0;
      if (productId <= 0) return;
      setProductPricingLineId(line.id);
      setProductPricingProductId(productId);
      setProductPricingTitle(line.description?.trim() || t("reports.orderAccountStatementPickProduct"));
      setPriceHistoryRows([]);
      setProductPricingOpen(true);
    },
    [t]
  );

  useEffect(() => {
    if (!productPricingOpen) return;
    if (!activeCounterparty || productPricingProductId <= 0) return;
    let cancelled = false;
    setPriceHistoryBusy(true);
    void fetchSalesPriceHistory({
      productId: productPricingProductId,
      counterpartyType: activeCounterparty.counterpartyType,
      counterpartyId: activeCounterparty.counterpartyId,
      currencyCode: "TRY",
      limit: 50,
    })
      .then((page) => {
        if (!cancelled) setPriceHistoryRows(page.items);
      })
      .catch((e) => {
        if (!cancelled) notify.error(toErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setPriceHistoryBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productPricingOpen, productPricingProductId, activeCounterparty]);

  useEffect(() => {
    if (!activeCounterparty) return;
    for (const line of linesRef.current) {
      const pid = line.selectedProductId ?? 0;
      if (pid <= 0) continue;
      void loadSalesSuggestionForLine(line.id, pid, false);
    }
  }, [activeCounterparty, loadSalesSuggestionForLine]);

  const applyProductListItemToLine = useCallback(
    (lineId: string, p: ProductListItem) => {
      if (!Number.isFinite(p.id) || p.id <= 0) return;
      const suggestion = latestCostByProductId.get(p.id);
      setLines((prev) =>
        prev.map((x) => {
          if (x.id !== lineId) return x;
          const nextUnitText = p.unit?.trim() || x.unitText || "";
          const suggestedUnitPrice = suggestion
            ? formatLocaleAmountInput(Math.max(0, Number(suggestion.unitCostExcludingVat) || 0), locale)
            : x.unitPriceText;
          const suggestedTryPerKg = suggestion
            ? formatLocaleAmountInput(Math.max(0, Number(suggestion.unitCostExcludingVat) || 0), locale)
            : x.tryPerKgText;
          return {
            ...x,
            selectedProductId: p.id,
            parentProductId: p.parentProductId ?? null,
            parentProductName: p.parentProductName ?? null,
            description: p.name,
            unitText: nextUnitText,
            unitPriceText: suggestedUnitPrice,
            tryPerKgText: x.priceCalcMode === "kg" ? suggestedTryPerKg : x.tryPerKgText,
          };
        })
      );
      setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      if (activeCounterparty) {
        void loadSalesSuggestionForLine(lineId, p.id, true);
      }
    },
    [activeCounterparty, latestCostByProductId, loadSalesSuggestionForLine, locale]
  );
  const collapseLinesToParentProduct = useCallback(() => {
    const productById = new Map(catalog.map((p) => [p.id, p] as const));
    const normalize = (v: string) =>
      v
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const productByName = new Map(
      catalog
        .map((p) => [normalize(p.name ?? ""), p] as const)
        .filter(([k]) => k.length > 0)
    );
    const grouped = new Map<string, LineDraft>();
    const passthrough: LineDraft[] = [];
    let changed = false;
    for (const line of lines) {
      const productId = line.selectedProductId ?? 0;
      const guessedByName = productByName.get(normalize(line.description ?? ""));
      const product = productById.get(productId) ?? guessedByName;
      const parentId = line.parentProductId ?? product?.parentProductId ?? null;
      const parentProduct = parentId ? productById.get(parentId) : null;
      const parentName = (
        line.parentProductName ??
        product?.parentProductName ??
        parentProduct?.name ??
        ""
      ).trim();
      if (!parentId || !parentName) {
        passthrough.push({ ...line });
        continue;
      }
      changed = true;
      const parentCostSuggestion = latestCostByProductId.get(parentId);
      const suggestedFromCost = parentCostSuggestion
        ? formatLocaleAmountInput(Math.max(0, Number(parentCostSuggestion.unitCostExcludingVat) || 0), locale)
        : "";
      const key = `${parentId}:${(line.unitText ?? "").trim().toLowerCase()}`;
      const qty = Math.max(0, parseLocaleAmount((line.quantityText ?? "").trim(), locale) || 0);
      const amount = Number.isFinite(line.amount) ? line.amount : parseLocaleAmount(line.amountText, locale) || 0;
      const prev = grouped.get(key);
      if (!prev) {
        grouped.set(key, {
          ...line,
          id: newId(),
          description: parentName,
          quantityText: qty > 0 ? formatLocaleAmountInput(qty, locale) : "",
          amount: Math.max(0, amount),
          amountText: amount > 0 ? formatLocaleAmountInput(amount, locale) : "",
          selectedProductId: parentId,
          parentProductId: null,
          parentProductName: null,
          unitPriceText: suggestedFromCost || line.unitPriceText || "",
          tryPerKgText:
            line.priceCalcMode === "kg" && suggestedFromCost ? suggestedFromCost : line.tryPerKgText,
          lineSource: "manual",
          manualReasonCode: "OPS_PARENT_MERGE",
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        });
      } else {
        const prevQty = Math.max(0, parseLocaleAmount((prev.quantityText ?? "").trim(), locale) || 0);
        const prevAmount = Number.isFinite(prev.amount) ? prev.amount : parseLocaleAmount(prev.amountText, locale) || 0;
        const mergedQty = prevQty + qty;
        const mergedAmount = Math.max(0, prevAmount + amount);
        grouped.set(key, {
          ...prev,
          quantityText: mergedQty > 0 ? formatLocaleAmountInput(mergedQty, locale) : "",
          amount: mergedAmount,
          amountText: mergedAmount > 0 ? formatLocaleAmountInput(mergedAmount, locale) : "",
        });
      }
    }
    const merged = [...passthrough, ...grouped.values()];
    if (!changed) {
      notify.error(t("reports.orderAccountStatementParentMergeNoop"));
      return;
    }
    setLines(merged);
    notify.success(t("reports.orderAccountStatementParentMergeApplied"));
    if (activeCounterparty) {
      window.setTimeout(() => {
        for (const l of merged) {
          const pid = l.selectedProductId ?? 0;
          if (pid > 0) void loadSalesSuggestionForLine(l.id, pid, false);
        }
      }, 0);
    }
  }, [activeCounterparty, catalog, latestCostByProductId, lines, loadSalesSuggestionForLine, locale, t]);
  const lineCompact = lines.length > 1;
  /** 4+ satır: liste ve tabloda ek sıkılaştırma */
  const lineDense = lines.length > 3;

  const parsedLines = useMemo(() => parseLines(lines, locale), [lines, locale]);
  const parsedPaid = useMemo(() => parsePaid(paidLines, locale), [paidLines, locale]);
  const parsedPromo = useMemo(() => parsePromo(promoLines, locale), [promoLines, locale]);
  const advanceDeduction = Math.max(0, parseLocaleAmount(advanceText, locale) || 0);
  const previousBalance = Math.max(0, parseLocaleAmount(previousBalanceText, locale) || 0);
  const totals = useMemo(
    () => computeOrderAccountTotals(parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance),
    [parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance]
  );

  const issuedDateLabel = useMemo(
    () =>
      statementDate.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale, statementDate]
  );

  const previewLines = useMemo(
    () => parsedLines.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedLines]
  );
  const previewPaid = useMemo(
    () => parsedPaid.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPaid]
  );
  const previewPromo = useMemo(
    () => parsedPromo.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPromo]
  );

  const labels = useMemo(
    () => ({
      headerCompany: t("reports.orderAccountStatementHeaderCompany"),
      headerBranch: t("reports.orderAccountStatementHeaderBranch"),
      documentTagline: t("reports.orderAccountStatementDocumentTagline"),
      issuedPrefix: t("reports.orderAccountStatementIssuedPrefix"),
      productCol: t("reports.orderAccountStatementColProduct"),
      qtyCol: t("reports.orderAccountStatementColQty"),
      unitCol: t("reports.orderAccountStatementUnit"),
      unitPriceCol: t("reports.orderAccountStatementUnitPrice"),
      amountCol: t("reports.orderAccountStatementColAmount"),
      gross: t("reports.orderAccountStatementGross"),
      giftTotal: t("reports.orderAccountStatementGiftTotalLine"),
      advance: t("reports.orderAccountStatementAdvanceLine"),
      subtotal: t("reports.orderAccountStatementSubtotal"),
      previousBalance: t("reports.orderAccountStatementPreviousBalanceLine"),
      net: t("reports.orderAccountStatementNet"),
      giftSuffix: t("reports.orderAccountStatementGiftSuffix"),
      paidSection: t("reports.orderAccountStatementPaidSectionPdf"),
      promoLineFallback: t("reports.orderAccountStatementPromoLineFallback"),
    }),
    [t]
  );

  const layoutSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "corporate", label: t("reports.orderAccountStatementLayoutCorporate") },
      { value: "compact", label: t("reports.orderAccountStatementLayoutCompact") },
      { value: "minimal", label: t("reports.orderAccountStatementLayoutMinimal") },
      { value: "invoiceClassic", label: t("reports.orderAccountStatementLayoutInvoiceClassic") },
      { value: "eInvoice", label: t("reports.orderAccountStatementLayoutEInvoice") },
      { value: "proforma", label: t("reports.orderAccountStatementLayoutProforma") },
      { value: "dispatch", label: t("reports.orderAccountStatementLayoutDispatch") },
      { value: "serviceForm", label: t("reports.orderAccountStatementLayoutServiceForm") },
    ],
    [t]
  );

  const contentSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "custom", label: t("reports.orderAccountStatementContentCustom") },
      { value: "tekin", label: t("reports.orderAccountStatementContentTekin") },
      { value: "cafe", label: t("reports.orderAccountStatementContentCafe") },
      { value: "bakery", label: t("reports.orderAccountStatementContentBakery") },
      { value: "catering", label: t("reports.orderAccountStatementContentCatering") },
    ],
    [t]
  );
  const branchSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("reports.orderAccountStatementSystemBranchNone") },
      ...branches
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, locale, t]
  );
  const branchOpenAmountById = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of suggestions) {
      if (row.counterpartyType !== "branch") continue;
      if (!Number.isFinite(row.counterpartyId) || row.counterpartyId <= 0) continue;
      const prev = map.get(row.counterpartyId) ?? 0;
      map.set(row.counterpartyId, prev + Math.max(0, Number(row.openAmount) || 0));
    }
    return map;
  }, [suggestions]);
  const applySelectedBranchOpenBalance = useCallback(async () => {
    const branchId = Number.parseInt(linkedBranchId.trim(), 10);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      notify.error(t("reports.orderAccountStatementSystemBranchBalanceSelectFirst"));
      return;
    }
    setApplyBranchOpenBalanceBusy(true);
    try {
      let amount = branchOpenAmountById.get(branchId);
      if (amount == null || !Number.isFinite(amount)) {
        // Fallback: öneri listesi boş/eksik geldiyse şubenin açık bakiyesini faturalardan yeniden topla.
        const invoices = await fetchOutboundInvoices();
        amount = invoices
          .filter((x) => x.counterpartyType === "branch" && x.counterpartyId === branchId)
          .reduce((sum, x) => sum + Math.max(0, Number(x.openAmount) || 0), 0);
      }
      if (!Number.isFinite(amount)) {
        notify.error(t("reports.orderAccountStatementSystemBranchBalanceMissing"));
        return;
      }
      setPreviousBalanceText(formatLocaleAmountInput(Math.max(0, amount), locale));
      notify.success(t("reports.orderAccountStatementSystemBranchBalanceApplied"));
    } catch (error) {
      notify.error(toErrorMessage(error));
    } finally {
      setApplyBranchOpenBalanceBusy(false);
    }
  }, [branchOpenAmountById, linkedBranchId, locale, t]);

  const fillTekinSample = useCallback(() => {
    setCompanyName("TEKİN USTA DONDURMA");
    setBranchName("Denizli Şubesi");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_LINES.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([
      {
        id: newId(),
        description: "Kira",
        amount: 750_000,
        amountText: formatLocaleAmountInput(750_000, locale),
      },
    ]);
    setAdvanceText(formatLocaleAmountInput(250_000, locale));
    setPreviousBalanceText(formatLocaleAmountInput(180_000, locale));
    setPaidLines([
      {
        id: newId(),
        description: "6 Adet Difiriz",
        amount: 306_000,
        amountText: formatLocaleAmountInput(306_000, locale),
      },
    ]);
    setShowQuantityColumn(true);
    setContentPreset("tekin");
  }, [locale]);

  const fillCafeSample = useCallback(() => {
    setCompanyName("Örnek İşletme A.Ş.");
    setBranchName("Merkez Şube");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_CAFE.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setPaidLines([]);
    setShowQuantityColumn(true);
    setContentPreset("cafe");
  }, [locale]);

  const fillBakerySample = useCallback(() => {
    setCompanyName(locale === "tr" ? "Örnek Fırın Unlu Mamuller" : "Sample Bakery Co.");
    setBranchName(locale === "tr" ? "Merkez üretim" : "Central production");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_BAKERY.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([
      {
        id: newId(),
        description: locale === "tr" ? "Bayi kampanya indirimi" : "Promotional discount",
        amount: 1_200,
        amountText: formatLocaleAmountInput(1_200, locale),
      },
    ]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setPaidLines([]);
    setShowQuantityColumn(true);
    setContentPreset("bakery");
  }, [locale]);

  const fillCateringSample = useCallback(() => {
    setCompanyName(locale === "tr" ? "Örnek Catering Hizmetleri" : "Sample Catering Services");
    setBranchName(locale === "tr" ? "Etkinlik: Gala gecesi" : "Event: gala dinner");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_CATERING.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([]);
    setAdvanceText(formatLocaleAmountInput(50_000, locale));
    setPreviousBalanceText("");
    setPaidLines([
      {
        id: newId(),
        description: locale === "tr" ? "Nakliye (dışarıdan ödenen)" : "Transport (paid externally)",
        amount: 9_500,
        amountText: formatLocaleAmountInput(9_500, locale),
      },
    ]);
    setShowQuantityColumn(true);
    setContentPreset("catering");
  }, [locale]);

  const applyContentPreset = useCallback(
    (v: OrderAccountContentPreset) => {
      if (v === "custom") setContentPreset("custom");
      else if (v === "tekin") fillTekinSample();
      else if (v === "cafe") fillCafeSample();
      else if (v === "bakery") fillBakerySample();
      else if (v === "catering") fillCateringSample();
    },
    [fillBakerySample, fillCafeSample, fillCateringSample, fillTekinSample]
  );

  /** Sihirli düğme: seçilen örnek şablona göre formu doldurur; «Özel» seçiliyken varsayılan toptan örneğini uygular. */
  const applySampleFromPreset = useCallback(() => {
    if (contentPreset === "custom") {
      fillTekinSample();
      return;
    }
    applyContentPreset(contentPreset);
  }, [applyContentPreset, contentPreset, fillTekinSample]);

  const resetForm = useCallback(() => {
    setCompanyName(defaultCompanyName);
    setBranchName("");
    setLinkedBranchId("");
    setSaveToSystem(true);
    setSaveAsInvoice(false);
    setInvoiceAutoPost(true);
    setCustomerAccountIdText("");
    setPaymentIban("");
    setPaymentAccountHolder("");
    setPaymentBankName("");
    setPaymentNote("");
    setShowPaymentOnPdf(true);
    setLastCreatedInvoiceNo("");
    setLastCreatedInvoiceId(null);
    setLastSavedDocumentId(null);
    setOrderDocumentKey(`oas-${Date.now().toString(36)}`);
    setEmblemDataUrl(defaultEmblemDataUrl);
    setDocumentTitle(defaultCompanyName);
    setShowDocumentTagline(true);
    setLines([emptyLine()]);
    setPaidLines([]);
    setPromoLines([]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setContentPreset("custom");
    setLayoutVariant("corporate");
    setCreationMode(shipmentPrefillParams ? "shipmentBased" : "manual");
    setShipmentLinkMode("strict");
    setSelectedShipmentSource(null);
    setSelectedShipmentProductKind("unknown");
    setShipmentInvoiceability([]);
    setShowQuantityColumn(true);
  }, [defaultCompanyName, defaultEmblemDataUrl, shipmentPrefillParams]);

  const onEmblemFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setEmblemDataUrl(result);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }, []);

  const onUseBrandingEmblem = useCallback(async () => {
    setBrandingLogoBusy(true);
    try {
      const dataUrl = await loadBrandingLogoAsDataUrl(new Date().toISOString());
      setEmblemDataUrl(dataUrl);
    } catch {
      window.alert(t("reports.orderAccountStatementEmblemFetchError"));
    } finally {
      setBrandingLogoBusy(false);
    }
  }, [loadBrandingLogoAsDataUrl, t]);

  const onDownloadPdf = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    setBusy(true);
    const showMultiActionProgress = hasMultipleActions;
    if (showMultiActionProgress) {
      setMultiActionError("");
      setMultiActionRunning(true);
      setMultiActionSteps([
        {
          id: "download",
          label: t("reports.orderAccountStatementActionDownloadPdf"),
          state: "pending",
        },
        {
          id: "invoice",
          label: t("reports.orderAccountStatementActionCreateInvoice"),
          state: saveAsInvoice ? "pending" : "skipped",
        },
        {
          id: "system",
          label: t("reports.orderAccountStatementActionSaveSystem"),
          state: saveToSystem ? "pending" : "skipped",
        },
      ]);
    }
    const setStepState = (id: MultiActionStepId, state: MultiActionStepState) => {
      if (!showMultiActionProgress) return;
      setMultiActionSteps((prev) =>
        prev.map((x) => (x.id === id ? { ...x, state } : x))
      );
    };
    try {
      setStepState("download", "running");
      const name = buildOrderAccountPdfFileName(
        companyName.trim() || "HesapOzeti",
        branchName.trim() || "Şube",
        isoDateStamp(new Date())
      );
      const docBlob = await buildHtmlNodeSinglePagePdfBlob(el);
      const dlUrl = URL.createObjectURL(docBlob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = name;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStepState("download", "done");

      const safeCompany = companyName.trim() || "—";
      const safeBranch = branchName.trim() || "—";
      const safeTitle = documentTitle.trim();
      const parsedBranchId = parseInt(linkedBranchId, 10);
      const parsedCustomerId = parseInt(customerAccountIdText, 10);
      const useBranchCounterparty = Number.isFinite(parsedBranchId) && parsedBranchId > 0;
      const counterpartyType: "branch" | "customer" = useBranchCounterparty
        ? "branch"
        : "customer";
      const counterpartyId = useBranchCounterparty ? parsedBranchId : parsedCustomerId;
      let createdInvoice: OutboundInvoiceResponse | null = null;

      if (saveAsInvoice) {
        setStepState("invoice", "running");
        if (!useBranchCounterparty && (!Number.isFinite(parsedCustomerId) || parsedCustomerId <= 0)) {
          notify.error(t("reports.orderAccountStatementInvoiceCounterpartyRequired"));
          setStepState("invoice", "pending");
          return;
        }
        const invalidLineCount = lines.filter(
          (l) => l.description.trim().length === 0 || !Number.isFinite(l.amount) || l.amount <= 0
        ).length;
        const payloadLines = lines
          .filter(
            (l) =>
              !l.isGift &&
              l.description.trim().length > 0 &&
              Number.isFinite(l.amount) &&
              l.amount > 0
          )
          .map((l) => ({
            productId: l.selectedProductId ?? null,
            description: l.description.trim(),
            quantity: Math.max(1, parseLocaleAmount((l.quantityText ?? "").trim(), locale) || 1),
            unit: (l.unitText ?? "").trim() || null,
            unitPrice: Math.max(0, parseLocaleAmount((l.unitPriceText ?? "").trim(), locale) || l.amount),
            lineAmount: Math.max(0, l.amount),
            lineSource: l.lineSource === "shipment" ? ("shipment" as const) : ("manual" as const),
            manualReasonCode: l.lineSource === "shipment" ? null : (l.manualReasonCode ?? "OPS_OTHER"),
            sourceShipmentLineId: l.sourceShipmentLineId ?? null,
          }));
        parsedPaid
          .filter((l) => l.description.trim().length > 0 && Number.isFinite(l.amount) && l.amount > 0)
          .forEach((l) => {
            payloadLines.push({
              productId: null,
              description: l.description.trim(),
              quantity: 1,
              unit: "adet",
              unitPrice: Math.max(0, l.amount),
              lineAmount: Math.max(0, l.amount),
              lineSource: "manual",
              manualReasonCode: "OPS_OTHER",
              sourceShipmentLineId: null,
            });
          });
        if (payloadLines.length === 0) {
          notify.error(
            t("reports.orderAccountStatementInvoiceLinesRequiredDetailed").replace(
              "{invalidCount}",
              String(invalidLineCount || lines.length)
            )
          );
          setStepState("invoice", "pending");
          return;
        }
        const hasManualLine = payloadLines.some((x) => x.lineSource === "manual");
        const effectiveShipmentLinkMode =
          creationMode === "shipmentBased" && hasManualLine ? "partial" : shipmentLinkMode;
        const giftDeductionTotal = parsedLines.reduce(
          (sum, row) => sum + (row.isGift ? Math.max(0, row.amount) : 0),
          0
        );
        const promoDeductionTotal = parsedPromo.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
        const advanceLedgerDeduction = Math.max(0, advanceDeduction);
        const invoicePayload = {
          counterpartyType,
          counterpartyId,
          issueDate: isoDateOnly(statementDate),
          currencyCode: "TRY",
          shipmentLinkMode: effectiveShipmentLinkMode,
          autoPostLedger: invoiceAutoPost,
          notes: buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            counterpartyLabel: `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
            giftAmount: giftDeductionTotal,
            promoAmount: promoDeductionTotal,
            advanceAmount: advanceLedgerDeduction,
          }),
          paymentInfo: {
            iban: paymentIban.trim() || null,
            accountHolder: paymentAccountHolder.trim() || null,
            bankName: paymentBankName.trim() || null,
            paymentNote: paymentNote.trim() || null,
            showOnPdf: showPaymentOnPdf,
          },
          lines: payloadLines,
        };
        const useShipmentEndpoint =
          creationMode === "shipmentBased" &&
          selectedShipmentSource != null &&
          payloadLines.some((x) => x.lineSource === "shipment");
        createdInvoice = useShipmentEndpoint
          ? await createShipmentInvoice(selectedShipmentSource.primaryMovementId, {
              ...invoicePayload,
              shipmentLinks:
                selectedShipmentSource != null
                  ? selectedShipmentSource.movementIds.map((movementId) => ({
                      warehouseMovementId: movementId,
                      quantity: 0,
                    }))
                  : [],
            })
          : await createOutboundInvoice(invoicePayload);
        if (!createdInvoice) {
          throw new Error("Invoice creation returned no result.");
        }
        if (promoDeductionTotal > 0 || advanceLedgerDeduction > 0) {
          let remainingOpen = Math.max(0, createdInvoice.openAmount);
          const receiptDate = isoDateOnly(statementDate);
          if (promoDeductionTotal > 0 && remainingOpen > 0) {
            const promoApply = Math.min(promoDeductionTotal, remainingOpen);
            createdInvoice = await addOutboundInvoiceReceipt(createdInvoice.id, {
              receiptDate,
              amount: promoApply,
              currencyCode: "TRY",
              receiptKind: "promo_discount",
              notes: "source=promo_discount · Sipariş hesap dökümü promosyon düşümü",
            });
            remainingOpen = Math.max(0, remainingOpen - promoApply);
          }
          if (advanceLedgerDeduction > 0 && remainingOpen > 0) {
            const advanceApply = Math.min(advanceLedgerDeduction, remainingOpen);
            createdInvoice = await addOutboundInvoiceReceipt(createdInvoice.id, {
              receiptDate,
              amount: advanceApply,
              currencyCode: "TRY",
              receiptKind: "advance_payment",
              notes: "source=advance_payment · Sipariş hesap dökümü ön ödeme düşümü",
            });
          }
        }
        const created = createdInvoice;
        setLastCreatedInvoiceNo(created.documentNumber);
        setLastCreatedInvoiceId(created.id);
        const createdCounterpartyType = created.counterpartyType;
        const createdCounterpartyId = created.counterpartyId;
        setSuggestions((prev) =>
          [
            {
              counterpartyType: created.counterpartyType,
              counterpartyId: created.counterpartyId,
              counterpartyName: created.counterpartyName,
              currencyCode: created.currencyCode,
              invoicedTotal: created.linesTotal,
              paidTotal: created.paidTotal,
              openAmount: created.openAmount,
              lastInvoiceDate: created.issueDate,
              lastDocumentNumber: created.documentNumber,
            },
            ...prev.filter(
              (x) =>
                !(x.counterpartyType === createdCounterpartyType && x.counterpartyId === createdCounterpartyId)
            ),
          ].slice(0, 10)
        );
        notify.success(t("reports.orderAccountStatementInvoiceSaved"));
        setStepState("invoice", "done");
      }

      if (saveToSystem) {
        setStepState("system", "running");
        const branchId = parsedBranchId;
        if (!Number.isFinite(branchId) || branchId <= 0) {
          notify.error(t("reports.orderAccountStatementSystemBranchRequired"));
          setStepState("system", "pending");
        } else {
          const pdfDocumentNo = `CRP-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
          const systemFile = new File([docBlob], name, { type: "application/pdf" });
          const note = buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            pdfDocumentNo,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            invoiceId: createdInvoice?.id,
            invoiceNo: createdInvoice?.documentNumber,
            counterpartyLabel:
              createdInvoice != null
                ? `${createdInvoice.counterpartyType}:${createdInvoice.counterpartyId}`
                : `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
            giftAmount: totals.giftLinesSum,
            promoAmount: totals.promoLinesSum,
            advanceAmount: Math.max(0, advanceDeduction),
            previousBalance,
          });
          const saved = await uploadBranchDocument(branchId, {
            file: systemFile,
            kind: "OTHER",
            notes: note,
          });
          setLastSavedDocumentId(saved.id);
          notify.success(t("reports.orderAccountStatementSystemSaved"));
          setStepState("system", "done");
        }
      }

      if (saveToSystem && Number.isFinite(parsedBranchId) && parsedBranchId > 0) {
        openBranchDetail(parsedBranchId, { initialTab: "currentAccount" });
      } else if (saveAsInvoice) {
        router.push("/products/order-account-statement/summary");
      }

    } catch (error) {
      if (showMultiActionProgress) setMultiActionError(toErrorMessage(error));
      notify.error(toErrorMessage(error));
    } finally {
      if (showMultiActionProgress) setMultiActionRunning(false);
      setBusy(false);
    }
  }, [
    branchName,
    companyName,
    customerAccountIdText,
    documentTitle,
    invoiceAutoPost,
    linkedBranchId,
    locale,
    parsedLines,
    parsedPaid,
    parsedPromo,
    previousBalance,
    advanceDeduction,
    paymentAccountHolder,
    paymentBankName,
    paymentIban,
    paymentNote,
    creationMode,
    shipmentLinkMode,
    receivedAdvancePostToLedger,
    selectedShipmentSource,
    orderDocumentKey,
    saveAsInvoice,
    saveToSystem,
    hasMultipleActions,
    showPaymentOnPdf,
    statementDate,
    totals,
    openBranchDetail,
    router,
    t,
  ]);

  const operationPreviewItems = useMemo(() => {
    const items: string[] = [t("reports.orderAccountStatementActionDownloadPdf")];
    if (saveAsInvoice) items.push(t("reports.orderAccountStatementActionCreateInvoice"));
    if (saveToSystem) items.push(t("reports.orderAccountStatementActionSaveSystem"));
    return items;
  }, [saveAsInvoice, saveToSystem, t]);

  const onDownloadPdfClick = useCallback(() => {
    if (!hasMultipleActions) {
      void onDownloadPdf();
      return;
    }
    setConfirmMultiActionOpen(true);
    setMultiActionError("");
    void onDownloadPdf();
  }, [hasMultipleActions, onDownloadPdf]);

  const multiActionProgressPercent = useMemo(() => {
    const completed = multiActionSteps.filter(
      (x) => x.state === "done" || x.state === "skipped"
    ).length;
    return Math.round((completed / Math.max(1, multiActionSteps.length)) * 100);
  }, [multiActionSteps]);

  const onLoadManualShipment = useCallback(async () => {
    const selectedGroup = shipmentOptions.find((x) => x.key === selectedShipmentOptionKey);
    if (selectedGroup) {
      setManualShipmentBusy(true);
      try {
        await loadShipmentGroupIntoForm(selectedGroup, "manual");
        notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
      } catch (error) {
        notify.error(toErrorMessage(error));
      } finally {
        setManualShipmentBusy(false);
      }
      return;
    }
    const warehouseId = Number.parseInt(manualShipmentWarehouseIdText, 10);
    const movementId = Number.parseInt(manualShipmentMovementIdText, 10);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0 || !Number.isFinite(movementId) || movementId <= 0) {
      notify.error(t("reports.orderAccountStatementShipmentManualInputRequired"));
      return;
    }
    setManualShipmentBusy(true);
    try {
      await loadShipmentIntoForm(warehouseId, movementId, "manual");
      notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
    } catch (error) {
      notify.error(toErrorMessage(error));
    } finally {
      setManualShipmentBusy(false);
    }
  }, [
    loadShipmentGroupIntoForm,
    loadShipmentIntoForm,
    manualShipmentMovementIdText,
    manualShipmentWarehouseIdText,
    selectedShipmentOptionKey,
    shipmentOptions,
    t,
  ]);

  if (!canSee) {
    return (
      <div className="w-full min-w-0 px-4 py-16 text-center text-sm text-zinc-600 sm:px-6">
        {t("reports.orderAccountStatementNoAccess")}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 pb-24 pt-4 sm:px-6 sm:pb-28 md:py-6 md:pb-32 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-950/[0.035] sm:px-6 sm:py-5">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <OasStepVisualBadge tone="indigo" icon="header" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-zinc-950 sm:text-xl">
              {t("reports.orderAccountStatementTitle")}
            </h1>
            <p className="mt-2 border-t border-zinc-100 pt-2 text-sm leading-relaxed text-zinc-600">
              {t("reports.orderAccountStatementSubtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-6">
          <StatementFormStep
            title={t("reports.orderAccountStatementStepHead")}
            stepVisual={{ tone: "indigo", icon: "header" }}
            scopeKinds={["document", "system"]}
          >
            <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Doldurma sirasi</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <FlowStepPill index={1} label="Mod secimi" state={flowCurrentStep > 1 ? "done" : "current"} />
                <FlowStepPill
                  index={2}
                  label={creationMode === "shipmentBased" ? "Sevkiyat secimi" : "Belge icerigi"}
                  state={flowCurrentStep > 2 ? "done" : flowCurrentStep === 2 ? "current" : "todo"}
                />
                <FlowStepPill
                  index={3}
                  label="Kalemler ve tutarlar"
                  state={flowCurrentStep > 3 ? "done" : flowCurrentStep === 3 ? "current" : "todo"}
                />
                <FlowStepPill index={4} label="Onizle ve indir" state={flowCurrentStep === 4 ? "current" : "todo"} />
              </div>
              {creationMode === "shipmentBased" ? (
                <p className="mt-1.5 text-[11px] text-violet-800">
                  Sevkiyat bazli akista once sevkiyat secin; sistem kalemleri ve sube bilgisini otomatik doldurur.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-violet-800">
                  Manuel akista once belge icerigini, sonra kalem/tutar alanlarini doldurup onizleme gecin.
                </p>
              )}
            </div>
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                2A · Sevkiyat / Mod
              </p>
              <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                Once bunu secin
              </span>
              </div>
              <p className="mb-2 text-[11px] text-zinc-600">
                Bu kart, verinin nereden gelecegini belirler (manuel / sevkiyat).
              </p>
              <div className="grid gap-3 md:grid-cols-2">
              <Select
                label={t("reports.orderAccountStatementCreationMode")}
                name="order-account-creation-mode"
                value={creationMode}
                onChange={(e) => setCreationMode(e.target.value === "shipmentBased" ? "shipmentBased" : "manual")}
                onBlur={() => {}}
                options={[
                  { value: "manual", label: t("reports.orderAccountStatementCreationModeManual") },
                  { value: "shipmentBased", label: t("reports.orderAccountStatementCreationModeShipment") },
                ]}
              />
              <Select
                label={t("reports.orderAccountStatementShipmentLinkMode")}
                name="order-account-shipment-link-mode"
                value={shipmentLinkMode}
                onChange={(e) => setShipmentLinkMode(e.target.value === "partial" ? "partial" : "strict")}
                onBlur={() => {}}
                options={[
                  { value: "strict", label: t("reports.orderAccountStatementShipmentLinkModeStrict") },
                  { value: "partial", label: t("reports.orderAccountStatementShipmentLinkModePartial") },
                ]}
                disabled={creationMode !== "shipmentBased"}
              />
              {creationMode === "shipmentBased" ? (
                <div className="md:col-span-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
                  {!selectedShipmentSource ? (
                    <p className="mb-2 rounded-md border border-violet-200 bg-white/70 px-2 py-1.5 text-[11px]">
                      1) Sevkiyat secin, 2) kalemler otomatik gelir, 3) sadece eksikleri duzenleyin.
                    </p>
                  ) : null}
                  {selectedShipmentSource ? (
                    <>
                      <p className="font-semibold text-violet-900">
                        {t("reports.orderAccountStatementShipmentSourceSelected")
                          .replace("{warehouseId}", String(selectedShipmentSource.warehouseId))
                          .replace("{movementId}", String(selectedShipmentSource.primaryMovementId))}
                      </p>
                      <p className="mt-0.5">
                        {shipmentInvoiceabilityBusy
                          ? t("reports.loading")
                          : shipmentInvoiceability.length > 0
                            ? t("reports.orderAccountStatementShipmentInvoiceabilityHint").replace(
                                "{remaining}",
                                formatLocaleAmount(
                                  shipmentInvoiceability.reduce((sum, x) => sum + Math.max(0, Number(x.remainingQuantity) || 0), 0),
                                  locale,
                                  "TRY"
                                )
                              )
                            : t("reports.orderAccountStatementShipmentNoInvoiceability")}
                      </p>
                      <p className="mt-0.5">
                        {t("reports.orderAccountStatementShipmentProductKindLabel")}:{" "}
                        {selectedShipmentProductKind === "child"
                          ? t("reports.orderAccountStatementShipmentProductKindChild")
                          : selectedShipmentProductKind === "parent"
                            ? t("reports.orderAccountStatementShipmentProductKindParent")
                            : t("reports.orderAccountStatementShipmentProductKindUnknown")}
                      </p>
                      {shipmentInvoiceability.length > 0 &&
                      shipmentInvoiceability.reduce((sum, x) => sum + Math.max(0, Number(x.remainingQuantity) || 0), 0) <= 0 ? (
                        <p className="mt-1 text-amber-900">
                          {t("reports.orderAccountStatementShipmentAlreadyInvoicedHint")}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-violet-900">
                        {t("reports.orderAccountStatementShipmentSourceMissingTitle")}
                      </p>
                      <p className="mt-0.5">
                        {t("reports.orderAccountStatementShipmentSourceMissingHelp")}
                      </p>
                      <div className="mt-2">
                        <Link
                          href="/warehouses"
                          className="inline-flex rounded-md border border-violet-300 bg-white px-2 py-1 text-[11px] font-semibold text-violet-800"
                        >
                          {t("reports.orderAccountStatementShipmentSourceMissingCta")}
                        </Link>
                      </div>
                    </>
                  )}
                  <div className="mt-2 grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <RichCombobox
                        value={selectedShipmentOptionKey}
                        onChange={(nextKey) => {
                          setSelectedShipmentOptionKey(nextKey);
                          const selected = shipmentOptions.find((x) => x.key === nextKey);
                          if (!selected) return;
                          void loadShipmentGroupIntoForm(selected, "manual");
                        }}
                        options={shipmentComboboxOptions}
                        placeholder={t("reports.orderAccountStatementShipmentSelectPlaceholder")}
                        searchPlaceholder={t("reports.orderAccountStatementShipmentSearchPlaceholder")}
                        emptyText={shipmentOptionsBusy ? t("common.loading") : t("documents.empty")}
                        disabled={shipmentOptionsBusy || manualShipmentBusy}
                      />
                      <Button type="button" variant="secondary" onClick={() => void onLoadManualShipment()} disabled={manualShipmentBusy} className="min-h-9 text-xs">
                        {manualShipmentBusy
                          ? t("common.loading")
                          : t("reports.orderAccountStatementShipmentManualLoadButton")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShipmentDetailOpen(true)}
                        disabled={!selectedShipmentDetail}
                        className="min-h-9 text-xs"
                      >
                        {t("reports.orderAccountStatementShipmentDetailButton")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-violet-800">
                      {t("reports.orderAccountStatementShipmentManualInputHint")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                      <input
                        inputMode="numeric"
                        value={manualShipmentWarehouseIdText ?? ""}
                        onChange={(e) => setManualShipmentWarehouseIdText(e.target.value)}
                        placeholder={t("reports.orderAccountStatementShipmentManualWarehousePlaceholder")}
                        className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400"
                      />
                      <input
                        inputMode="numeric"
                        value={manualShipmentMovementIdText ?? ""}
                        onChange={(e) => setManualShipmentMovementIdText(e.target.value)}
                        placeholder={t("reports.orderAccountStatementShipmentManualMovementPlaceholder")}
                        className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
            <OrderAccountStatementDocumentContentSection
              t={t}
              companyName={companyName}
              setCompanyName={setCompanyName}
              branchName={branchName}
              setBranchName={setBranchName}
              emblemDataUrl={emblemDataUrl}
              setEmblemDataUrl={setEmblemDataUrl}
              emblemFileInputRef={emblemFileInputRef}
              onEmblemFileChange={onEmblemFileChange}
              onUseBrandingEmblem={onUseBrandingEmblem}
              brandingLogoBusy={brandingLogoBusy}
              documentTitle={documentTitle}
              setDocumentTitle={setDocumentTitle}
              showDocumentTagline={showDocumentTagline}
            />
            <OrderAccountStatementActionsSection
              t={t}
              locale={locale}
              saveToSystem={saveToSystem}
              setSaveToSystem={setSaveToSystem}
              branchSelectOptions={branchSelectOptions}
              linkedBranchId={linkedBranchId}
              setLinkedBranchId={setLinkedBranchId}
              previousBalanceText={previousBalanceText}
              setPreviousBalanceText={setPreviousBalanceText}
              applySelectedBranchOpenBalance={applySelectedBranchOpenBalance}
              applyBranchOpenBalanceBusy={applyBranchOpenBalanceBusy}
              suggestionsBusy={suggestionsBusy}
            />
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {t("reports.orderAccountStatementReceiptSectionTitle")}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {t("reports.orderAccountStatementReceiptMovedOutHelp")}
              </p>
              <div className="mt-2">
                <Link
                  href="/products/order-account-statement/summary"
                  className="inline-flex rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700"
                >
                  {t("reports.orderAccountStatementReceiptOpenSummaryCta")}
                </Link>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  {t("reports.orderAccountStatementSuggestionsTitle")}
                </p>
                <Link
                  href="/products/order-account-statement/summary"
                  className="text-xs font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:decoration-violet-600"
                >
                  {t("reports.orderAccountStatementSuggestionsOpenReport")}
                </Link>
              </div>
              {suggestionsBusy ? (
                <p className="mt-1 text-xs text-zinc-500">{t("reports.loading")}</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">{t("reports.orderAccountStatementSuggestionsEmpty")}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                  {suggestions.slice(0, 5).map((s) => (
                    <li key={`${s.counterpartyType}-${s.counterpartyId}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.counterpartyName}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatLocaleAmount(s.openAmount, locale, "TRY")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={showDocumentTagline}
                onCheckedChange={setShowDocumentTagline}
              />
              <span className="min-w-0">
                <span className="font-medium text-zinc-800">{t("reports.orderAccountStatementShowTagline")}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                  {t("reports.orderAccountStatementShowTaglineHelp")}
                </span>
              </span>
            </label>
            <div className="mt-4">
              <OasTemplatePickers
                layoutVariant={layoutVariant}
                onLayoutChange={setLayoutVariant}
                contentPreset={contentPreset}
                onContentPresetChange={applyContentPreset}
                layoutOptions={layoutSelectOptions}
                contentOptions={contentSelectOptions}
                nameSuffix="form"
              />
            </div>
          </StatementFormStep>

          <div ref={linesSectionRef}>
          <StatementFormStep
            title={t("reports.orderAccountStatementStepLines")}
            stepVisual={{ tone: "emerald", icon: "lines" }}
            scopeKinds={["document", "system"]}
            actions={
              <div className="hidden lg:block">
                <OasIconButton
                  title={t("reports.orderAccountStatementAddLine")}
                  aria-label={t("reports.orderAccountStatementAddLine")}
                  onClick={handleAddLine}
                  disabled={lineAddBlocked}
                  className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
                >
                  <PlusIcon className="h-6 w-6 shrink-0 text-current" />
                </OasIconButton>
              </div>
            }
            collapsible
            collapseLabelExpand={t("reports.orderAccountStatementLinesSectionExpand")}
            collapseLabelCollapse={t("reports.orderAccountStatementLinesSectionCollapse")}
          >
            <p className="mb-2 text-[11px] text-zinc-500 lg:hidden">{t("reports.orderAccountStatementTableScrollHint")}</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 px-3 text-xs"
                onClick={collapseLinesToParentProduct}
              >
                {t("reports.orderAccountStatementParentMergeButton")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="hidden min-h-9 px-3 text-xs lg:inline-flex"
                onClick={() => setDesktopLineDetailsOpen((v) => !v)}
              >
                {desktopLineDetailsOpen ? "Masaustu sade gorunum" : "Masaustu detaylari goster"}
              </Button>
            </div>
            {creationMode === "shipmentBased" && shipmentLinkMode === "strict" ? (
              <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                {t("reports.orderAccountStatementStrictModeManualBlocked")}
              </p>
            ) : null}
            <div
              className={cn(
                "rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3",
                lineDense ? "mb-2 py-2" : "mb-3 py-2.5"
              )}
            >
              <label className="flex cursor-pointer items-start gap-2.5 text-left">
                <Checkbox
                  className="mt-0.5"
                  checked={showQuantityColumn}
                  onCheckedChange={setShowQuantityColumn}
                />
                <span className="min-w-0 text-xs leading-snug text-zinc-700">
                  <span className="block font-medium text-zinc-900">{t("reports.orderAccountStatementShowQtyColumn")}</span>
                  <span className="text-[11px] text-zinc-500">{t("reports.orderAccountStatementShowQtyColumnHelp")}</span>
                </span>
              </label>
            </div>

            <ul
              className={cn(
                "lg:hidden",
                lineDense ? "mt-1.5 space-y-1" : lineCompact ? "mt-2 space-y-2" : "mt-3 space-y-3"
              )}
            >
              {lines.map((line, rowIndex) => {
                const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
                return (
                <li
                  key={line.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", line.id);
                    beginLineDrag(line.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    hoverLineDropTarget(line.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropLineOnTarget(line.id);
                  }}
                  onDragEnd={finishLineDrag}
                  className={cn(
                    "rounded-lg border border-zinc-200 bg-zinc-50/40 shadow-sm",
                    Boolean(amountMismatch) && "border-red-200 bg-red-50/40 ring-1 ring-red-100",
                    draggingLineId === line.id && "opacity-55",
                    dragOverLineId === line.id && draggingLineId !== line.id && "ring-2 ring-violet-200",
                    lineDense ? "p-2" : lineCompact ? "p-2.5" : "p-3"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 border-b border-zinc-200/80",
                      lineDense ? "pb-1.5" : "pb-2"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex min-w-[1.5rem] items-center justify-center rounded-md bg-zinc-200/80 font-bold text-zinc-800",
                        lineDense
                          ? "h-5 min-w-[1.25rem] text-[9px]"
                          : lineCompact
                            ? "h-6 min-w-[1.5rem] text-[10px]"
                            : "h-7 min-w-[1.75rem] text-xs"
                      )}
                    >
                      {rowIndex + 1}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">surukle</span>
                    {lines.length > 1 ? (
                      <OasTrashButton
                        label={t("reports.orderAccountStatementRemove")}
                        onClick={() => setLines((prev) => prev.filter((x) => x.id !== line.id))}
                      />
                    ) : null}
                  </div>
                  <label
                    className={cn(
                      "mt-2 block font-medium text-zinc-600",
                      lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    {t("reports.orderAccountStatementColProduct")}
                    <RequiredMark />
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        className={cn(
                          "min-w-0 flex-1 rounded-md border border-zinc-200 bg-white",
                          lineDense
                            ? "px-1.5 py-1 text-[11px]"
                            : lineCompact
                              ? "px-1.5 py-1.5 text-xs"
                              : "px-2 py-2 text-sm"
                        )}
                        data-line-desc-id={line.id}
                        data-line-id={line.id}
                        data-line-field="description"
                        value={line.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === line.id
                                ? {
                                    ...x,
                                    description: v,
                                    selectedProductId: null,
                                    parentProductId: null,
                                    parentProductName: null,
                                    lineSource:
                                      creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                        ? "shipment"
                                        : "manual",
                                    manualReasonCode:
                                      creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                        ? null
                                        : "OPS_OTHER",
                                  }
                                : x
                            )
                          );
                        }}
                        onKeyDown={(e) => handleMobileLineEnter(e, line.id, "description")}
                        placeholder={t("reports.orderAccountStatementLinePlaceholder")}
                      />
                      {line.selectedProductId ? (
                        <OrderAccountProductPricingIconButton
                          ariaLabel={t("reports.orderAccountStatementPricingInfoAria")}
                          onClick={() => openProductPricingPanel(line)}
                        />
                      ) : null}
                    </div>
                  </label>
                  {showQuantityColumn ? (
                    <>
                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementColQtyShort")}
                        <input
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.quantityText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, quantityText: v } : x)));
                          }}
                          placeholder={t("reports.orderAccountStatementColQtyPlaceholder")}
                          autoComplete="off"
                        />
                      </label>
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementUnit")}
                        <input
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.unitText ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)));
                          }}
                          placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                          autoComplete="off"
                        />
                      </label>
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementUnitPrice")}
                        <input
                          inputMode="decimal"
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white text-right tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.unitPriceText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitPriceText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, unitPriceText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                          placeholder="0"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    {amountMismatch ? (
                      <p className="mt-1.5 rounded-md border border-red-200 bg-red-50/80 px-2 py-1 text-[11px] text-red-700">
                        Kalem tutarı uyumsuz: {formatLocaleAmount(amountMismatch.expected, locale, "TRY")} beklenirken{" "}
                        {formatLocaleAmount(amountMismatch.actual, locale, "TRY")} girildi.
                      </p>
                    ) : null}
                    </>
                  ) : null}
                  {canPickProducts ? (
                    <OrderAccountLineProductPicker
                      key={line.id}
                      lineId={line.id}
                      selectedProductId={line.selectedProductId}
                      description={line.description}
                      parentProductName={line.parentProductName}
                      onSelectProduct={(p) => applyProductListItemToLine(line.id, p)}
                      latestCostByProductId={latestCostByProductId}
                      locale={locale}
                      t={t}
                      emptyResultsText={t("products.catalogSearchNoResults")}
                      loadingListText={t("common.loading")}
                      enabled={canPickProducts}
                      className={cn(lineDense ? "mt-1" : lineCompact ? "mt-1.5" : "mt-2")}
                    />
                  ) : null}
                  {line.selectedProductId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "mt-1.5 w-full gap-1.5 text-xs font-medium sm:w-auto",
                        lineDense ? "min-h-8" : "min-h-9"
                      )}
                      onClick={() => openProductPricingPanel(line)}
                    >
                      Maliyet, satış önerisi ve geçmiş
                    </Button>
                  ) : null}
                  <LineCalcBlock
                    line={line}
                    locale={locale}
                    t={t}
                    setLines={setLines}
                    compact={lineCompact}
                    ultraCompact={lineDense}
                    className={cn("border-t border-zinc-200/80", lineDense ? "mt-1.5 pt-1.5" : "mt-2.5 pt-2.5")}
                  />
                  <div className={cn("grid grid-cols-2 gap-2", lineDense ? "mt-1.5" : "mt-2.5")}>
                    <label
                      className={cn(
                        "block font-medium text-zinc-600",
                        lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                      )}
                    >
                      {t("reports.orderAccountStatementAmount")}
                      <RequiredMark />
                      <input
                        data-line-id={line.id}
                        data-line-field="amount"
                        inputMode="decimal"
                        className={cn(
                          "mt-0.5 w-full rounded-md border border-zinc-200 bg-white text-right tabular-nums",
                          lineDense
                            ? "px-1.5 py-1 text-[11px]"
                            : lineCompact
                              ? "px-1.5 py-1.5 text-xs"
                              : "px-2 py-2 text-sm"
                        )}
                        value={line.amountText}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                        }}
                        onBlur={() => {
                          const n = parseLocaleAmount(line.amountText, locale);
                          if (!Number.isFinite(n)) return;
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                            )
                          );
                        }}
                        onKeyDown={(e) => handleMobileLineEnter(e, line.id, "amount")}
                      />
                    </label>
                    <div className="flex min-h-0 items-end pb-0.5">
                      <label
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white",
                          lineDense ? "px-1.5 py-0.5" : lineCompact ? "px-1.5 py-1" : "px-2 py-1.5"
                        )}
                      >
                        <span
                          className={cn(
                            "whitespace-nowrap font-medium text-zinc-700",
                            lineDense ? "text-[10px]" : "text-xs"
                          )}
                        >
                          {t("reports.orderAccountStatementGift")}
                        </span>
                        <Checkbox
                          className="shrink-0"
                          checked={line.isGift}
                          onCheckedChange={(next) => {
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, isGift: next } : x)));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
            <div className="mt-3 lg:hidden">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddLine}
                disabled={lineAddBlocked}
                className="min-h-11 w-full gap-2 !border-zinc-300 !text-zinc-800"
              >
                <PlusIcon className="h-5 w-5 shrink-0 text-current" />
                <span>{t("reports.orderAccountStatementAddLine")}</span>
              </Button>
            </div>

            {/* Tablet ve üstü: tablo */}
            <div
              className={cn(
                "mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block",
                lineDense ? "text-[11px]" : lineCompact && "text-xs"
              )}
            >
              <table
                className={cn(
                  "w-full border-collapse text-left",
                  showQuantityColumn ? "min-w-0 xl:min-w-[63rem]" : "min-w-0 lg:min-w-[42rem]",
                  lineDense ? "text-[11px]" : lineCompact ? "text-xs" : "text-sm"
                )}
              >
                <thead>
                  <tr
                    className={cn(
                      "border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600",
                      lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    <th
                      scope="col"
                      className={cn(
                        "w-9 whitespace-nowrap px-1.5 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementColRow")}
                    </th>
                    <th
                      scope="col"
                      className={cn("min-w-[10rem] px-2", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5")}
                    >
                      {t("reports.orderAccountStatementColProduct")}
                      <RequiredMark />
                    </th>
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[5.5rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementColQtyShort")}
                      </th>
                    ) : null}
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[5rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementUnit")}
                      </th>
                    ) : null}
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[6.25rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementUnitPrice")}
                      </th>
                    ) : null}
                    <th
                      scope="col"
                      className={cn(
                        "w-[6.5rem] whitespace-nowrap px-1.5 text-right",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementAmount")}
                      <RequiredMark />
                    </th>
                    <th
                      scope="col"
                      className={cn(
                        "w-16 whitespace-nowrap px-1 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementGift")}
                    </th>
                    <th
                      scope="col"
                      className={cn(
                        "w-[5.5rem] whitespace-nowrap px-1 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementColActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, rowIndex) => {
                    const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
                    return (
                    <Fragment key={line.id}>
                    <tr
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", line.id);
                        beginLineDrag(line.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        hoverLineDropTarget(line.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        dropLineOnTarget(line.id);
                      }}
                      onDragEnd={finishLineDrag}
                      className={cn(
                        "border-b border-zinc-100 last:border-b-0",
                        Boolean(amountMismatch) && "bg-red-50/35",
                        draggingLineId === line.id && "opacity-60",
                        dragOverLineId === line.id && draggingLineId !== line.id && "ring-2 ring-inset ring-violet-200"
                      )}
                    >
                      <td
                        className={cn(
                          "align-top px-1.5 text-center text-zinc-500",
                          lineDense ? "py-1 text-[9px]" : lineCompact ? "py-1.5 text-[10px]" : "py-2 text-xs"
                        )}
                      >
                        {rowIndex + 1}
                      </td>
                      <td
                        className={cn("align-top px-2", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <div className="flex items-start gap-1">
                          <input
                            className={cn(
                              "min-w-0 flex-1 rounded-md border border-zinc-200",
                              lineDense ? "px-1 py-0.5" : lineCompact ? "px-1.5 py-1" : "px-2 py-1.5"
                            )}
                            data-line-desc-id={line.id}
                            value={line.description}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((x) =>
                                  x.id === line.id
                                    ? {
                                        ...x,
                                        description: v,
                                        selectedProductId: null,
                                        parentProductId: null,
                                        parentProductName: null,
                                        lineSource:
                                          creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                            ? "shipment"
                                            : "manual",
                                        manualReasonCode:
                                          creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                            ? null
                                            : "OPS_OTHER",
                                      }
                                    : x
                                )
                              );
                            }}
                            placeholder={t("reports.orderAccountStatementLinePlaceholder")}
                          />
                          {line.selectedProductId ? (
                            <OrderAccountProductPricingIconButton
                              ariaLabel={t("reports.orderAccountStatementPricingInfoAria")}
                              onClick={() => openProductPricingPanel(line)}
                            />
                          ) : null}
                        </div>
                        {canPickProducts && desktopLineDetailsOpen ? (
                          <OrderAccountLineProductPicker
                            key={`${line.id}-desktop`}
                            lineId={line.id}
                            selectedProductId={line.selectedProductId}
                            description={line.description}
                            parentProductName={line.parentProductName}
                            onSelectProduct={(p) => applyProductListItemToLine(line.id, p)}
                            latestCostByProductId={latestCostByProductId}
                            locale={locale}
                            t={t}
                            emptyResultsText={t("products.catalogSearchNoResults")}
                            loadingListText={t("common.loading")}
                            enabled={canPickProducts}
                            className={cn(
                              "border-dashed border-zinc-200 bg-zinc-50/80",
                              lineDense ? "mt-0.5" : lineCompact ? "mt-1" : "mt-1.5"
                            )}
                          />
                        ) : null}
                        {line.selectedProductId && desktopLineDetailsOpen ? (
                          (() => {
                            const cost = latestCostByProductId.get(line.selectedProductId);
                            if (!cost) {
                              return (
                                <div className="mt-1 space-y-1">
                                  <p className="text-[11px] text-zinc-500">
                                    {t("reports.orderAccountStatementCostSuggestionMissing")}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-auto min-h-0 px-0 py-0 text-[11px] font-medium text-violet-700 hover:bg-transparent hover:underline"
                                    onClick={() => openProductPricingPanel(line)}
                                  >
                                    Maliyet, satış önerisi ve geçmiş
                                  </Button>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 space-y-1">
                                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                                  {t("reports.orderAccountStatementSuggestedCostShort")}:{" "}
                                  {formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)}
                                  {" · "}
                                  {t("reports.orderAccountStatementCostIncVatShort")}:{" "}
                                  {formatLocaleAmount(Number(cost.unitCostIncludingVat || 0), locale, cost.currencyCode)}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto min-h-0 px-0 py-0 text-[11px] font-medium text-violet-700 hover:bg-transparent hover:underline"
                                  onClick={() => openProductPricingPanel(line)}
                                >
                                  Maliyet, satış önerisi ve geçmiş
                                </Button>
                              </div>
                            );
                          })()
                        ) : null}
                        {desktopLineDetailsOpen ? (
                          <LineCalcBlock
                            line={line}
                            locale={locale}
                            t={t}
                            setLines={setLines}
                            compact={lineCompact}
                            ultraCompact={lineDense}
                            className={cn("max-w-xl", lineDense ? "mt-1" : "mt-1.5")}
                          />
                        ) : null}
                      </td>
                        {showQuantityColumn ? (
                          <td
                            className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                          >
                            <input
                              className={cn(
                                "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                                lineDense
                                  ? "px-1 py-0.5 text-[10px]"
                                  : lineCompact
                                    ? "px-1 py-1 text-[11px]"
                                    : "px-1.5 py-1.5"
                              )}
                              value={line.quantityText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, quantityText: v } : x)));
                              }}
                              placeholder="—"
                              autoComplete="off"
                            />
                          </td>
                        ) : null}
                      {showQuantityColumn ? (
                        <td
                          className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                        >
                          <input
                            className={cn(
                              "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                              lineDense
                                ? "px-1 py-0.5 text-[10px]"
                                : lineCompact
                                  ? "px-1 py-1 text-[11px]"
                                  : "px-1.5 py-1.5"
                            )}
                            value={line.unitText ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)));
                            }}
                            placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                            autoComplete="off"
                          />
                        </td>
                      ) : null}
                      {showQuantityColumn ? (
                        <td
                          className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                        >
                          <input
                            inputMode="decimal"
                            className={cn(
                              "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                              lineDense
                                ? "px-1 py-0.5 text-[10px]"
                                : lineCompact
                                  ? "px-1 py-1 text-[11px]"
                                  : "px-1.5 py-1.5"
                            )}
                            value={line.unitPriceText}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitPriceText: v } : x)));
                            }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, unitPriceText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                            placeholder="0"
                            autoComplete="off"
                          />
                        </td>
                      ) : null}
                      <td
                        className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <input
                          inputMode="decimal"
                          className={cn(
                            "w-full rounded-md border border-zinc-200 text-right tabular-nums",
                            lineDense
                              ? "px-1 py-0.5 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1"
                                : "px-2 py-1.5"
                          )}
                          value={line.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </td>
                      <td
                        className={cn("align-top px-1 text-center", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <div
                          className={cn(
                            "inline-flex items-center justify-center",
                            lineDense ? "min-h-6 min-w-6" : "min-h-8 min-w-8"
                          )}
                        >
                          <Checkbox
                            checked={line.isGift}
                            onCheckedChange={(next) => {
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, isGift: next } : x)));
                            }}
                            className={lineDense ? "!h-4 !w-4" : "!h-5 !w-5"}
                            aria-label={t("reports.orderAccountStatementGift")}
                          />
                        </div>
                      </td>
                      <td
                        className={cn("align-top px-1", lineDense ? "py-0.5" : lineCompact ? "py-1" : "py-1.5")}
                      >
                        <div className="flex flex-wrap items-center justify-center">
                          {lines.length > 1 ? (
                            <OasTrashButton
                              label={t("reports.orderAccountStatementRemove")}
                              onClick={() => setLines((prev) => prev.filter((x) => x.id !== line.id))}
                            />
                          ) : (
                            <span className="text-sm text-zinc-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {amountMismatch ? (
                      <tr className="border-b border-red-100 bg-red-50/50">
                        <td colSpan={showQuantityColumn ? 8 : 5} className="px-2 py-1.5 text-[11px] text-red-700">
                          Kalem tutarı uyumsuz: {formatLocaleAmount(amountMismatch.expected, locale, "TRY")} beklenirken{" "}
                          {formatLocaleAmount(amountMismatch.actual, locale, "TRY")} girildi.
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StatementFormStep>
          </div>

          <StatementFormStep
            title={t("reports.orderAccountStatementStepPromoLines")}
            description={t("reports.orderAccountStatementPromoLinesHelp")}
            stepVisual={{ tone: "amber", icon: "promo" }}
            scopeKinds={["document", "system"]}
            actions={
              <OasIconButton
                title={t("reports.orderAccountStatementAddPromoLine")}
                aria-label={t("reports.orderAccountStatementAddPromoLine")}
                onClick={() => setPromoLines((p) => [...p, emptyPromo()])}
                className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
              >
                <PlusIcon className="h-6 w-6 shrink-0 text-current" />
              </OasIconButton>
            }
          >
            <p className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-800 ring-1 ring-zinc-950/[0.04]">
              {t("reports.orderAccountStatementGiftAutoHint")}
            </p>
            {promoLines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPromoLinesEmpty")}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 lg:hidden">
                  {promoLines.map((row, rowIndex) => (
                    <li key={row.id} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-200/90 text-xs font-bold text-zinc-800">
                          {rowIndex + 1}
                        </span>
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => setPromoLines((prev) => prev.filter((x) => x.id !== row.id))}
                        />
                      </div>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementPromoLineDesc")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={row.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, description: v } : x)));
                          }}
                        />
                      </label>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementPromoLineAmount")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm tabular-nums"
                          value={row.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(row.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setPromoLines((prev) =>
                              prev.map((x) =>
                                x.id === row.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
                  <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-900">
                        <th className="w-10 px-2 py-2 text-center">{t("reports.orderAccountStatementColRow")}</th>
                        <th className="px-3 py-2">{t("reports.orderAccountStatementPromoLineDesc")}</th>
                        <th className="w-[7.5rem] px-2 py-2 text-right">{t("reports.orderAccountStatementPromoLineAmount")}</th>
                        <th className="w-20 px-2 py-2 text-center">{t("reports.orderAccountStatementColActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoLines.map((row, rowIndex) => (
                        <tr key={row.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                              value={row.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, description: v } : x)));
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="decimal"
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                              value={row.amountText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, amountText: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseLocaleAmount(row.amountText, locale);
                                if (!Number.isFinite(n)) return;
                                setPromoLines((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                                  )
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex justify-center">
                              <OasTrashButton
                                label={t("reports.orderAccountStatementRemove")}
                                onClick={() => setPromoLines((prev) => prev.filter((x) => x.id !== row.id))}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-4">
              <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm ring-1 ring-zinc-950/[0.02]">
                <label className="block text-sm">
                  <span className="mb-1.5 inline-flex items-center gap-2 text-zinc-700">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M10 2.75a.75.75 0 01.75.75v.87a5.75 5.75 0 014.88 4.88h.87a.75.75 0 010 1.5h-.87a5.75 5.75 0 01-4.88 4.88v.87a.75.75 0 01-1.5 0v-.87a5.75 5.75 0 01-4.88-4.88h-.87a.75.75 0 010-1.5h.87a5.75 5.75 0 014.88-4.88V3.5a.75.75 0 01.75-.75zm0 3a4.25 4.25 0 100 8.5 4.25 4.25 0 000-8.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span className="font-medium">{t("reports.orderAccountStatementAdvanceShort")}</span>
                  </span>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm tabular-nums shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-300/60"
                    placeholder="0"
                    value={advanceText}
                    onChange={(e) => setAdvanceText(e.target.value)}
                    onBlur={() => {
                      const n = parseLocaleAmount(advanceText, locale);
                      if (Number.isFinite(n)) setAdvanceText(formatLocaleAmountInput(Math.max(0, n), locale));
                    }}
                  />
                </label>
                {advanceDeduction > 0 ? (
                  <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={receivedAdvancePostToLedger}
                      onCheckedChange={(next) => setReceivedAdvancePostToLedger(next === true)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-zinc-800">
                        {t("reports.orderAccountStatementReceivedAdvancePostToLedger")}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                        {t("reports.orderAccountStatementReceivedAdvancePostToLedgerHelp")}
                      </span>
                    </span>
                  </label>
                ) : null}
              </section>
            </div>
          </StatementFormStep>

          <StatementFormStep
            title={t("reports.orderAccountStatementStepExtraPaid")}
            description={t("reports.orderAccountStatementPaidOnBehalfHelp")}
            stepVisual={{ tone: "sky", icon: "paid" }}
            scopeKinds={["document", "system"]}
            actions={
              <OasIconButton
                title={t("reports.orderAccountStatementAddPaidLine")}
                aria-label={t("reports.orderAccountStatementAddPaidLine")}
                onClick={() => setPaidLines((p) => [...p, emptyPaid()])}
                className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
              >
                <PlusIcon className="h-6 w-6 shrink-0 text-current" />
              </OasIconButton>
            }
          >
            {paidLines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPaidEmpty")}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 lg:hidden">
                  {paidLines.map((line, rowIndex) => (
                    <li key={line.id} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-200/80 pb-2">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-200/80 text-xs font-bold text-zinc-700">
                          {rowIndex + 1}
                        </span>
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => setPaidLines((prev) => prev.filter((x) => x.id !== line.id))}
                        />
                      </div>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementColProduct")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={line.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, description: v } : x)));
                          }}
                        />
                      </label>
                      <label className="mt-3 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementAmount")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm tabular-nums"
                          value={line.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setPaidLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                        <th scope="col" className="w-10 px-2 py-2.5 text-center">
                          {t("reports.orderAccountStatementColRow")}
                        </th>
                        <th scope="col" className="min-w-[10rem] px-3 py-2.5">
                          {t("reports.orderAccountStatementColProduct")}
                        </th>
                        <th scope="col" className="w-[7.5rem] px-2 py-2.5 text-right">
                          {t("reports.orderAccountStatementAmount")}
                        </th>
                        <th scope="col" className="w-24 px-2 py-2.5 text-center">
                          {t("reports.orderAccountStatementColActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidLines.map((line, rowIndex) => (
                        <tr key={line.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                              value={line.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, description: v } : x)));
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="decimal"
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                              value={line.amountText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseLocaleAmount(line.amountText, locale);
                                if (!Number.isFinite(n)) return;
                                setPaidLines((prev) =>
                                  prev.map((x) =>
                                    x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                                  )
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex justify-center">
                              <OasTrashButton
                                label={t("reports.orderAccountStatementRemove")}
                                onClick={() => setPaidLines((prev) => prev.filter((x) => x.id !== line.id))}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </StatementFormStep>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2.5 px-4"
              title={t("reports.orderAccountStatementReset")}
              aria-label={t("reports.orderAccountStatementReset")}
              onClick={resetForm}
            >
              <IcEraser className="h-5 w-5" />
              <span>{t("reports.orderAccountStatementReset")}</span>
            </Button>
          </div>

      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 border-t border-zinc-200/90 bg-white/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-4 sm:py-3",
          OVERLAY_Z_TW.branchDetailSheet
        )}
      >
        {mobileLineIssueCount > 0 ? (
          <p className="mb-2 text-center text-[11px] font-medium text-amber-700 lg:hidden">
            {mobileLineIssueCount} kalemde eksik/uyumsuz bilgi var.
          </p>
        ) : null}
        <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden">
          <Button
            type="button"
            variant="secondary"
            className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
            onClick={handleAddLine}
            disabled={lineAddBlocked}
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            <span>Satır ekle</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
            onClick={handleDuplicateLastLine}
            disabled={lineAddBlocked || lines.length === 0}
          >
            <IcCopy className="h-4 w-4 shrink-0" />
            <span>Son satırı kopyala</span>
          </Button>
        </div>
        <div className="flex w-full justify-center">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center gap-2 py-3 text-sm font-semibold sm:w-full sm:text-base lg:w-auto lg:min-w-[clamp(14rem,40vw,20rem)] lg:px-8"
            title={t("reports.orderAccountStatementOpenFullscreenPreview")}
            aria-label={t("reports.orderAccountStatementOpenFullscreenPreview")}
            onClick={() => setPreviewModalOpen(true)}
          >
            <IcMaximize className="h-5 w-5" />
            <span>{t("reports.orderAccountStatementOpenFullscreenPreview")}</span>
          </Button>
        </div>
      </div>

      {portalMounted && previewModalOpen
        ? createPortal(
            <div
              role="presentation"
              className={cn(
                "fixed inset-0 flex items-stretch justify-center bg-zinc-950/55 p-[max(0.25rem,env(safe-area-inset-top,0px))_max(0.25rem,env(safe-area-inset-right,0px))_max(0.25rem,env(safe-area-inset-bottom,0px))_max(0.25rem,env(safe-area-inset-left,0px))] backdrop-blur-[1px] sm:p-3 sm:items-center",
                OVERLAY_Z_TW.modal
              )}
              onClick={() => setPreviewModalOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-account-preview-dialog-title"
                className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[min(100rem,calc(100vw-0px))] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:h-auto sm:max-h-[min(100dvh,100dvh-1.5rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
                  <div className="min-w-0 flex-1 pr-1">
                    <h2 id="order-account-preview-dialog-title" className="text-sm font-bold tracking-tight text-zinc-950 sm:text-base">
                      {t("reports.orderAccountStatementPreviewTitle")}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="!h-auto !min-h-0 !px-0 !py-0 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
                        onClick={() => setPreviewToolsCollapsed((c) => !c)}
                      >
                        {previewToolsCollapsed
                          ? t("reports.orderAccountStatementPreviewExpandTools")
                          : t("reports.orderAccountStatementPreviewCollapseTools")}
                      </Button>
                      <p className="hidden text-xs text-zinc-600 lg:inline">{t("reports.orderAccountStatementPreviewHint")}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
                    <OasIconButton
                      variant="secondary"
                      title={t("common.close")}
                      aria-label={t("common.close")}
                      onClick={() => setPreviewModalOpen(false)}
                      className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
                    >
                      <IcX className="h-7 w-7" />
                    </OasIconButton>
                    <OasIconButton
                      variant="primary"
                      title={
                        busy
                          ? t("reports.orderAccountStatementGeneratingPdf")
                          : hasMultipleActions
                            ? t("reports.orderAccountStatementRunActions")
                            : t("reports.orderAccountStatementDownloadPdf")
                      }
                      aria-label={
                        busy
                          ? t("reports.orderAccountStatementGeneratingPdf")
                          : hasMultipleActions
                            ? t("reports.orderAccountStatementRunActions")
                            : t("reports.orderAccountStatementDownloadPdf")
                      }
                      onClick={onDownloadPdfClick}
                      disabled={busy}
                      className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
                    >
                      {busy ? (
                        <IcLoader className="h-7 w-7" />
                      ) : hasMultipleActions ? (
                        <IcPlay className="h-7 w-7" />
                      ) : (
                        <IcDownload className="h-7 w-7" />
                      )}
                    </OasIconButton>
                  </div>
                </div>
                {!previewToolsCollapsed ? (
                  <div className="max-h-[min(38vh,320px)] shrink-0 overflow-y-auto overscroll-contain border-b border-zinc-200 bg-white px-3 py-2.5 sm:max-h-none sm:overflow-visible sm:px-5 sm:py-3">
                    <p className="mb-2 text-[11px] leading-snug text-zinc-500">
                      {t("reports.orderAccountStatementPreviewTemplateHint")}
                    </p>
                    <OasTemplatePickers
                      layoutVariant={layoutVariant}
                      onLayoutChange={setLayoutVariant}
                      contentPreset={contentPreset}
                      onContentPresetChange={applyContentPreset}
                      layoutOptions={layoutSelectOptions}
                      contentOptions={contentSelectOptions}
                      nameSuffix="preview"
                      menuZIndex={OVERLAY_Z_INDEX.modalNested + 20}
                      hideContentPicker
                    />
                    <OrderAccountStatementPreviewSettings
                      t={t}
                      saveAsInvoice={saveAsInvoice}
                      setSaveAsInvoice={setSaveAsInvoice}
                      saveToSystem={saveToSystem}
                      setSaveToSystem={setSaveToSystem}
                      invoiceAutoPost={invoiceAutoPost}
                      setInvoiceAutoPost={setInvoiceAutoPost}
                      customerAccountIdText={customerAccountIdText}
                      setCustomerAccountIdText={setCustomerAccountIdText}
                      linkedBranchId={linkedBranchId}
                      invoicePaymentDetailsOpen={invoicePaymentDetailsOpen}
                      setInvoicePaymentDetailsOpen={setInvoicePaymentDetailsOpen}
                      paymentIban={paymentIban}
                      setPaymentIban={setPaymentIban}
                      paymentAccountHolder={paymentAccountHolder}
                      setPaymentAccountHolder={setPaymentAccountHolder}
                      paymentBankName={paymentBankName}
                      setPaymentBankName={setPaymentBankName}
                      paymentNote={paymentNote}
                      setPaymentNote={setPaymentNote}
                      showPaymentOnPdf={showPaymentOnPdf}
                      setShowPaymentOnPdf={setShowPaymentOnPdf}
                    />
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100/90 p-2 sm:p-5">
                  <div className="mx-auto w-full min-w-0 max-w-[210mm] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <StatementPaper
                      ref={previewRef}
                      layoutVariant={layoutVariant}
                      locale={locale}
                      companyName={companyName}
                      branchName={branchName}
                      emblemDataUrl={emblemDataUrl}
                      documentTitle={documentTitle}
                      showDocumentTagline={showDocumentTagline}
                      issuedDate={issuedDateLabel}
                      lines={previewLines}
                      showQuantityColumn={showQuantityColumn}
                      promoLines={previewPromo}
                      totals={totals}
                      advanceDeduction={advanceDeduction}
                      previousBalance={previousBalance}
                      paidOnBehalf={previewPaid}
                      paymentInfo={{
                        iban: paymentIban,
                        accountHolder: paymentAccountHolder,
                        bankName: paymentBankName,
                        paymentNote: paymentNote,
                        showOnPdf: showPaymentOnPdf,
                      }}
                      paymentLabels={{
                        section: "Ödeme bilgileri",
                        iban: t("reports.orderAccountStatementPaymentIban"),
                        accountHolder: t("reports.orderAccountStatementPaymentAccountHolder"),
                        bankName: t("reports.orderAccountStatementPaymentBankName"),
                        paymentNote: t("reports.orderAccountStatementPaymentNote"),
                      }}
                      documentMeta={{
                        referenceId: orderDocumentKey,
                        systemDocumentId: lastSavedDocumentId,
                        generationLabel: "PDF oluşturma",
                      }}
                      labels={labels}
                      emptyHint={t("reports.orderAccountStatementPreviewEmpty")}
                      previewFit
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      <Modal
        open={shipmentDetailOpen && selectedShipmentDetail != null}
        onClose={() => setShipmentDetailOpen(false)}
        titleId="order-account-shipment-detail-title"
        title={t("reports.orderAccountStatementShipmentDetailTitle")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-lg"
      >
        {selectedShipmentDetail ? (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailWarehouseId")}:</span> {selectedShipmentSource?.warehouseId ?? "-"}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailMovementId")}:</span> {selectedShipmentDetail.id}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailBranch")}:</span> {selectedShipmentDetail.branchName}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailProduct")}:</span> {selectedShipmentDetail.productName}</p>
            <p>
              <span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailQuantity")}:</span>{" "}
              {formatLocaleAmount(selectedShipmentDetail.quantity, locale, "TRY")} {selectedShipmentDetail.unit ?? ""}
            </p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailDate")}:</span> {selectedShipmentDetail.businessDate}</p>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={confirmMultiActionOpen}
        onClose={() => {
          if (multiActionRunning) return;
          setConfirmMultiActionOpen(false);
        }}
        titleId="order-account-multi-action-confirm-title"
        title={t("reports.orderAccountStatementMultiActionConfirmTitle")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-md"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {t("reports.orderAccountStatementMultiActionConfirmBody")}
          </p>
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            {multiActionSteps.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-zinc-800">
                {item.state === "running" ? (
                  <IcLoader className="h-4 w-4 animate-spin text-violet-700" />
                ) : item.state === "done" ? (
                  <IcCheck className="h-4 w-4 text-emerald-700" />
                ) : item.state === "skipped" ? (
                  <IcX className="h-4 w-4 text-zinc-400" />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
                )}
                <span className={item.state === "skipped" ? "text-zinc-400 line-through" : ""}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {multiActionError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
              {multiActionError}
            </p>
          ) : null}
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={multiActionProgressPercent}
              aria-label={t("reports.orderAccountStatementProgressRunning")}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
                style={{ width: `${multiActionProgressPercent}%` }}
              />
            </div>
            <p className="mt-2">
              {t("reports.orderAccountStatementProgressPercent").replace(
                "{percent}",
                String(multiActionProgressPercent)
              )}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={multiActionRunning}
              onClick={() => setConfirmMultiActionOpen(false)}
            >
              {multiActionRunning ? t("reports.orderAccountStatementProgressRunning") : t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={productPricingOpen}
        onClose={closeProductPricingPanel}
        titleId="order-account-product-pricing-title"
        title={`Ürün · ${productPricingTitle || "—"}`}
        closeButtonLabel={t("common.close")}
        wide
        wideFullScreenMobile
      >
        {(() => {
          const cost =
            productPricingProductId > 0 ? latestCostByProductId.get(productPricingProductId) : undefined;
          const sales =
            productPricingLineId != null ? linePriceSuggestionByLineId[productPricingLineId] : undefined;
          const canRefreshSales =
            !!activeCounterparty && !!productPricingLineId && productPricingProductId > 0;
          return (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-zinc-50/40 px-3 py-4 sm:gap-5 sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <article className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {t("reports.orderAccountStatementSuggestedCostShort")}
                    </span>
                  </div>
                  {cost ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold leading-tight tabular-nums text-zinc-950 sm:text-3xl">
                        {formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                        KDV hariç
                      </p>
                      <div className="mt-3 flex items-baseline gap-2 border-t border-amber-100 pt-2.5">
                        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                          {t("reports.orderAccountStatementCostIncVatShort")}
                        </span>
                        <span className="tabular-nums text-sm font-semibold text-zinc-800">
                          {formatLocaleAmount(Number(cost.unitCostIncludingVat || 0), locale, cost.currencyCode)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-amber-800">
                      {t("reports.orderAccountStatementCostSuggestionMissing")}
                    </p>
                  )}
                </article>
                <article className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
                      {t("reports.orderAccountStatementSalesSuggestShort")}
                    </span>
                    <button
                      type="button"
                      disabled={!canRefreshSales}
                      onClick={() => {
                        if (productPricingLineId) {
                          void loadSalesSuggestionForLine(
                            productPricingLineId,
                            productPricingProductId,
                            true
                          );
                        }
                      }}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-violet-200 bg-white/80 px-2 text-[11px] font-medium text-violet-700 transition hover:bg-violet-50 disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Satış önerisini yenile"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 4v5h-5" />
                      </svg>
                      Yenile
                    </button>
                  </div>
                  {!activeCounterparty ? (
                    <p className="mt-4 text-sm text-zinc-600">
                      {t("reports.orderAccountStatementPricingInfoNoCounterparty")}
                    </p>
                  ) : sales ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold leading-tight tabular-nums text-zinc-950 sm:text-3xl">
                        {formatLocaleAmount(Number(sales.suggestedUnitPrice || 0), locale, sales.currencyCode)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                        Bu cariye önerilen
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-violet-100 pt-2.5 text-[11px] text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-zinc-400">Yöntem:</span>
                          <span className="font-medium text-zinc-700">{sales.basis}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-zinc-400">Örneklem:</span>
                          <span className="font-medium text-zinc-700">n={sales.sampleCount}</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-600">
                      {t("reports.orderAccountStatementPricingInfoSalesPending")}
                    </p>
                  )}
                </article>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                <section className="flex min-h-[14rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                        Önceki satışlar
                      </h3>
                    </div>
                    {activeCounterparty && priceHistoryRows.length > 0 ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {priceHistoryRows.length}
                      </span>
                    ) : null}
                  </header>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {!activeCounterparty ? (
                      <p className="px-4 py-6 text-sm text-zinc-500">
                        {t("reports.orderAccountStatementPricingInfoNoCounterparty")}
                      </p>
                    ) : priceHistoryBusy ? (
                      <p className="px-4 py-6 text-sm text-zinc-500">{t("common.loading")}</p>
                    ) : priceHistoryRows.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-zinc-500">Kayıt bulunamadı.</p>
                    ) : (
                      <ul className="divide-y divide-zinc-100">
                        {priceHistoryRows.map((row) => (
                          <li key={row.id} className="px-3 py-2.5 transition hover:bg-zinc-50 sm:px-4">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-xs font-medium text-zinc-500">{row.issueDate}</span>
                              <span className="tabular-nums text-sm font-semibold text-zinc-950">
                                {formatLocaleAmount(Number(row.unitPrice || 0), locale, row.currencyCode)}
                                {row.unit ? (
                                  <span className="ml-1 text-[10px] font-normal text-zinc-500">/{row.unit}</span>
                                ) : null}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-zinc-600">
                              <span className="truncate">{row.counterpartyName}</span>
                              {row.sourceOutboundInvoiceId ? (
                                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                                  #{row.sourceOutboundInvoiceId}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="flex min-h-[14rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                        Maliyet geçmişi
                      </h3>
                    </div>
                    {productPricingCostRows.length > 0 ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {productPricingCostRows.length}
                      </span>
                    ) : null}
                  </header>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {productPricingCostRows.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-zinc-500">Maliyet kaydı bulunamadı.</p>
                    ) : (
                      <ul className="divide-y divide-zinc-100">
                        {productPricingCostRows.map((row) => (
                          <li key={row.id} className="px-3 py-2.5 transition hover:bg-zinc-50 sm:px-4">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-xs font-medium text-zinc-500">{row.effectiveDate}</span>
                              <span className="tabular-nums text-sm font-semibold text-zinc-950">
                                {formatLocaleAmount(Number(row.unitCostExcludingVat || 0), locale, row.currencyCode)}
                                {row.unit ? (
                                  <span className="ml-1 text-[10px] font-normal text-zinc-500">/{row.unit}</span>
                                ) : null}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] text-zinc-600">
                              <span className="truncate">
                                {(row.note ?? "").trim() || (
                                  <span className="text-zinc-400">Not yok</span>
                                )}
                              </span>
                              <span className="shrink-0 tabular-nums text-zinc-500">
                                <span className="text-zinc-400">KDV dahil </span>
                                {formatLocaleAmount(Number(row.unitCostIncludingVat || 0), locale, row.currencyCode)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
