"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useProductCostHistory } from "@/modules/products/hooks/useProductCostQueries";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { OasMultiActionProgressModal } from "@/modules/order-account-statement/components/OasMultiActionProgressModal";
import { OasShipmentDetailModal } from "@/modules/order-account-statement/components/OasShipmentDetailModal";
import { OasPageHeader } from "@/modules/order-account-statement/components/OasPageHeader";
import { OasMobileActionBar } from "@/modules/order-account-statement/components/OasMobileActionBar";
import { OasPreviewPortal } from "@/modules/order-account-statement/components/OasPreviewPortal";
import { OasPromoLinesStep } from "@/modules/order-account-statement/components/OasPromoLinesStep";
import { OasPaidLinesStep } from "@/modules/order-account-statement/components/OasPaidLinesStep";
import { OasLinesStep } from "@/modules/order-account-statement/components/OasLinesStep";
import { OasHeadStep } from "@/modules/order-account-statement/components/OasHeadStep";
import { OasProductPricingModal } from "@/modules/order-account-statement/components/OasProductPricingModal";
import { OasResetButton } from "@/modules/order-account-statement/components/OasResetButton";
import { useOasMultiAction } from "@/modules/order-account-statement/hooks/useOasMultiAction";
import { useOasShipmentSelection } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";
import { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";
import { useOasInvoicing } from "@/modules/order-account-statement/hooks/useOasInvoicing";
import { useOasPreview } from "@/modules/order-account-statement/hooks/useOasPreview";
import { useOasLines } from "@/modules/order-account-statement/hooks/useOasLines";
import { useOasSuggestions } from "@/modules/order-account-statement/hooks/useOasSuggestions";
import { useOasLineEditing } from "@/modules/order-account-statement/hooks/useOasLineEditing";
import { useOasSamplePresets } from "@/modules/order-account-statement/hooks/useOasSamplePresets";
import { useOasProductPricing } from "@/modules/order-account-statement/hooks/useOasProductPricing";
import { useOasBrandingLogo } from "@/modules/order-account-statement/hooks/useOasBrandingLogo";
import { useOasBranchBalance } from "@/modules/order-account-statement/hooks/useOasBranchBalance";
import { useOasShipmentLoader } from "@/modules/order-account-statement/hooks/useOasShipmentLoader";
import { useOasDownloadFlow } from "@/modules/order-account-statement/hooks/useOasDownloadFlow";
import { useOasComputed } from "@/modules/order-account-statement/hooks/useOasComputed";
import { useOasEffects } from "@/modules/order-account-statement/hooks/useOasEffects";
import { useOasShipmentEffects } from "@/modules/order-account-statement/hooks/useOasShipmentEffects";
import { useOasBrandingDefaults } from "@/modules/order-account-statement/hooks/useOasBrandingDefaults";
import { useOasPricingEffects } from "@/modules/order-account-statement/hooks/useOasPricingEffects";
import { useOasFlowDerived } from "@/modules/order-account-statement/hooks/useOasFlowDerived";
// Geriye dönük uyumluluk: tip eskiden bu modülden export ediliyordu.
export type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";
import { type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { useBranchDetailOverlay } from "@/shared/branch-detail";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

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
  const identity = useOasIdentity();
  const {
    companyName,
    branchName,
    setBranchName,
    linkedBranchId,
    documentTitle,
    showDocumentTagline,
    emblemDataUrl,
  } = identity;

  const canSee =
    canSeeUiModule(user, PERM.uiProducts) || canSeeUiModule(user, PERM.uiReports);
  const canPickProducts = canSeeUiModule(user, PERM.uiProducts);
  const { data: catalog = [] } = useProductsCatalog(canPickProducts);
  const { data: costHistoryRows = [] } = useProductCostHistory({}, canPickProducts);
  const { data: branches = [] } = useBranchesList();

  const invoicing = useOasInvoicing();
  const {
    saveToSystem,
    setSaveToSystem,
    saveAsInvoice,
    setSaveAsInvoice,
    invoiceAutoPost,
    setInvoiceAutoPost,
    invoicePaymentDetailsOpen,
    setInvoicePaymentDetailsOpen,
    customerAccountIdText,
    setCustomerAccountIdText,
    paymentIban,
    setPaymentIban,
    paymentAccountHolder,
    setPaymentAccountHolder,
    paymentBankName,
    setPaymentBankName,
    paymentNote,
    setPaymentNote,
    showPaymentOnPdf,
    setShowPaymentOnPdf,
    lastSavedDocumentId,
  } = invoicing;
  const suggestionsState = useOasSuggestions();
  const {
    suggestions,
    setSuggestions,
    suggestionsBusy,
    setSuggestionsBusy,
    linePriceSuggestionByLineId,
    productPricingOpen,
    productPricingLineId,
    productPricingProductId,
    productPricingTitle,
    priceHistoryRows,
    priceHistoryBusy,
  } = suggestionsState;
  const linesState = useOasLines();
  const {
    lines,
    setLines,
    paidLines,
    setPaidLines,
    promoLines,
    setPromoLines,
    advanceText,
    setAdvanceText,
    receivedAdvancePostToLedger,
    setReceivedAdvancePostToLedger,
    previousBalanceText,
    setPreviousBalanceText,
    draggingLineId,
    setDraggingLineId,
    dragOverLineId,
    setDragOverLineId,
  } = linesState;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const preview = useOasPreview();
  const {
    statementDate,
    layoutVariant,
    setLayoutVariant,
    contentPreset,
    showQuantityColumn,
    setShowQuantityColumn,
    desktopLineDetailsOpen,
    setDesktopLineDetailsOpen,
    previewModalOpen,
    setPreviewModalOpen,
    previewToolsCollapsed,
    setPreviewToolsCollapsed,
    portalMounted,
    setPortalMounted,
  } = preview;
  const multiAction = useOasMultiAction();
  const shipment = useOasShipmentSelection();
  const {
    creationMode,
    setCreationMode,
    shipmentLinkMode,
    shipmentInvoiceability,
    setShipmentInvoiceability,
    shipmentInvoiceabilityBusy,
    setShipmentInvoiceabilityBusy,
    setShipmentOptionsBusy,
    shipmentOptions,
    setShipmentOptions,
    setSelectedShipmentOptionKey,
    shipmentDetailOpen,
    setShipmentDetailOpen,
    selectedShipmentDetail,
    selectedShipmentSource,
  } = shipment;
  const [orderDocumentKey, setOrderDocumentKey] = useState(() => `oas-${Date.now().toString(36)}`);

  const {
    focusLineEditor,
    focusLineField,
    lineAddBlocked,
    mobileLineIssueCount,
    flowCurrentStep,
  } = useOasFlowDerived({
    locale,
    lines,
    showQuantityColumn,
    creationMode,
    shipmentLinkMode,
    selectedShipmentSource,
    companyName,
    branchName,
    documentTitle,
    linesSectionRef,
  });

  const {
    handleAddLine,
    handleDuplicateLastLine,
    handleMobileLineEnter,
    beginLineDrag,
    finishLineDrag,
    hoverLineDropTarget,
    dropLineOnTarget,
  } = useOasLineEditing({
    lines,
    setLines,
    lineAddBlocked,
    focusLineEditor,
    focusLineField,
    draggingLineId,
    setDraggingLineId,
    setDragOverLineId,
  });

  const shipmentPrefillDraftMode = useMemo(() => {
    const raw = (searchParams.get("invoiceDraft") ?? "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
  }, [searchParams]);
  const orderKeyFromQuery = useMemo(() => (searchParams.get("orderKey") ?? "").trim(), [searchParams]);

  const {
    loadShipmentIntoForm,
    loadShipmentGroupIntoForm,
    onLoadManualShipment,
  } = useOasShipmentLoader({
    t,
    locale,
    catalog,
    shipmentPrefillDraftMode,
    identity,
    invoicing,
    linesState,
    preview,
    shipment,
  });


  const { shipmentPrefillParams } = useOasShipmentEffects({
    searchParams,
    creationMode,
    setCreationMode,
    selectedShipmentSource,
    setShipmentOptions,
    setShipmentOptionsBusy,
    setSelectedShipmentOptionKey,
    setShipmentInvoiceability,
    setShipmentInvoiceabilityBusy,
    loadShipmentIntoForm,
    loadShipmentGroupIntoForm,
    setPreviewModalOpen,
    shipmentPrefillKeyRef,
  });

  const { loadBrandingLogoAsDataUrl, onEmblemFileChange, onUseBrandingEmblem } =
    useOasBrandingLogo({ t, identity });

  useOasBrandingDefaults({
    identity,
    loadBrandingLogoAsDataUrl,
    loadedRef: brandingDefaultsLoadedRef,
  });



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



  const {
    latestCostByProductId,
    productPricingCostRows,
    activeCounterparty,
    loadSalesSuggestionForLine,
  } = useOasPricingEffects({
    locale,
    linkedBranchId,
    customerAccountIdText,
    costHistoryRows,
    suggestions: suggestionsState,
    setLines,
    linesRef,
  });
  const {
    closeProductPricingPanel,
    openProductPricingPanel,
    applyProductListItemToLine,
    collapseLinesToParentProduct,
  } = useOasProductPricing({
    t,
    locale,
    suggestions: suggestionsState,
    lines,
    setLines,
    catalog,
    latestCostByProductId,
    activeCounterparty,
    loadSalesSuggestionForLine,
  });


  const {
    lineCompact,
    lineDense,
    parsedLines,
    parsedPaid,
    parsedPromo,
    advanceDeduction,
    previousBalance,
    totals,
    issuedDateLabel,
    previewLines,
    previewPaid,
    previewPromo,
    labels,
    layoutSelectOptions,
    contentSelectOptions,
    branchSelectOptions,
  } = useOasComputed({
    t,
    locale,
    lines,
    paidLines,
    promoLines,
    advanceText,
    previousBalanceText,
    statementDate,
    branches,
  });

  useOasEffects({
    branches,
    linkedBranchId,
    setBranchName,
    setCustomerAccountIdText,
    setPortalMounted,
    lines,
    setShowQuantityColumn,
    previewModalOpen,
    setPreviewModalOpen,
    setPreviewToolsCollapsed,
    orderKeyFromQuery,
    setOrderDocumentKey,
    setSuggestions,
    setSuggestionsBusy,
  });

  const {
    applySelectedBranchOpenBalance,
    applyBranchOpenBalanceBusy,
  } = useOasBranchBalance({
    t,
    locale,
    suggestions,
    linkedBranchId,
    setPreviousBalanceText,
  });

  const {
    applyContentPreset,
    resetForm,
  } = useOasSamplePresets({
    locale,
    identity,
    invoicing,
    linesState,
    preview,
    shipment,
    setOrderDocumentKey,
    shipmentPrefillActive: shipmentPrefillParams != null,
  });

  const { busy, hasMultipleActions, onDownloadPdfClick, onRedirectNow, cancelPendingRedirect } = useOasDownloadFlow({
    t,
    locale,
    previewRef,
    router,
    openBranchDetail,
    identity,
    invoicing,
    multiAction,
    shipment,
    suggestionsState,
    lines,
    parsedLines,
    parsedPaid,
    parsedPromo,
    advanceDeduction,
    previousBalance,
    totals,
    orderDocumentKey,
    receivedAdvancePostToLedger,
    statementDate,
  });


  if (!canSee) {
    return (
      <div className="w-full min-w-0 px-4 py-16 text-center text-sm text-zinc-600 sm:px-6">
        {t("reports.orderAccountStatementNoAccess")}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-2.5 pb-24 pt-3 sm:px-4 sm:pb-28 sm:pt-4 md:px-6 md:py-6 md:pb-32 lg:px-8">
      <OasPageHeader />

      <div className="min-w-0 space-y-6">
          <OasHeadStep
            identity={identity}
            branchSelectOptions={branchSelectOptions}
            emblemFileInputRef={emblemFileInputRef}
            onEmblemFileChange={onEmblemFileChange}
            onUseBrandingEmblem={onUseBrandingEmblem}
            shipment={shipment}
            shipmentComboboxOptions={shipmentComboboxOptions}
            shipmentInvoiceabilityBusy={shipmentInvoiceabilityBusy}
            shipmentInvoiceability={shipmentInvoiceability}
            onLoadManualShipment={onLoadManualShipment}
            locale={locale}
            layoutVariant={layoutVariant}
            setLayoutVariant={setLayoutVariant}
            contentPreset={contentPreset}
            applyContentPreset={applyContentPreset}
            layoutSelectOptions={layoutSelectOptions}
            contentSelectOptions={contentSelectOptions}
            saveToSystem={saveToSystem}
            setSaveToSystem={setSaveToSystem}
            setPreviousBalanceText={setPreviousBalanceText}
            previousBalanceText={previousBalanceText}
            applySelectedBranchOpenBalance={applySelectedBranchOpenBalance}
            applyBranchOpenBalanceBusy={applyBranchOpenBalanceBusy}
            suggestionsBusy={suggestionsBusy}
            flowCurrentStep={flowCurrentStep}
            loadShipmentGroupIntoForm={loadShipmentGroupIntoForm}
            suggestions={suggestions}
          />

          <div ref={linesSectionRef}>
          <OasLinesStep
            lines={lines}
            setLines={setLines}
            showQuantityColumn={showQuantityColumn}
            setShowQuantityColumn={setShowQuantityColumn}
            desktopLineDetailsOpen={desktopLineDetailsOpen}
            setDesktopLineDetailsOpen={setDesktopLineDetailsOpen}
            lineAddBlocked={lineAddBlocked}
            lineCompact={lineCompact}
            lineDense={lineDense}
            canPickProducts={canPickProducts}
            locale={locale}
            catalog={catalog}
            latestCostByProductId={latestCostByProductId}
            linePriceSuggestionByLineId={linePriceSuggestionByLineId}
            creationMode={creationMode}
            shipmentLinkMode={shipmentLinkMode}
            draggingLineId={draggingLineId}
            dragOverLineId={dragOverLineId}
            handleAddLine={handleAddLine}
            handleMobileLineEnter={handleMobileLineEnter}
            beginLineDrag={beginLineDrag}
            hoverLineDropTarget={hoverLineDropTarget}
            dropLineOnTarget={dropLineOnTarget}
            finishLineDrag={finishLineDrag}
            applyProductListItemToLine={applyProductListItemToLine}
            openProductPricingPanel={openProductPricingPanel}
            collapseLinesToParentProduct={collapseLinesToParentProduct}
          />
          </div>

          <OasPromoLinesStep
            promoLines={promoLines}
            setPromoLines={setPromoLines}
            advanceText={advanceText}
            setAdvanceText={setAdvanceText}
            receivedAdvancePostToLedger={receivedAdvancePostToLedger}
            setReceivedAdvancePostToLedger={setReceivedAdvancePostToLedger}
            advanceDeduction={advanceDeduction}
            locale={locale}
          />

          <OasPaidLinesStep
            paidLines={paidLines}
            setPaidLines={setPaidLines}
            locale={locale}
          />

          <OasResetButton onClick={resetForm} />

      </div>

      <OasMobileActionBar
        mobileLineIssueCount={mobileLineIssueCount}
        lineAddBlocked={lineAddBlocked}
        hasLines={lines.length > 0}
        onAddLine={handleAddLine}
        onDuplicateLastLine={handleDuplicateLastLine}
        onOpenPreview={() => setPreviewModalOpen(true)}
      />

      <OasPreviewPortal
        open={previewModalOpen}
        portalMounted={portalMounted}
        onClose={() => setPreviewModalOpen(false)}
        toolsCollapsed={previewToolsCollapsed}
        onToggleTools={() => setPreviewToolsCollapsed((c) => !c)}
        busy={busy}
        hasMultipleActions={hasMultipleActions}
        onDownloadClick={onDownloadPdfClick}
        template={{
          layoutVariant,
          setLayoutVariant,
          contentPreset,
          applyContentPreset,
          layoutOptions: layoutSelectOptions,
          contentOptions: contentSelectOptions,
        }}
        settings={{
          t,
          saveAsInvoice,
          setSaveAsInvoice,
          saveToSystem,
          setSaveToSystem,
          invoiceAutoPost,
          setInvoiceAutoPost,
          customerAccountIdText,
          setCustomerAccountIdText,
          linkedBranchId,
          invoicePaymentDetailsOpen,
          setInvoicePaymentDetailsOpen,
          paymentIban,
          setPaymentIban,
          paymentAccountHolder,
          setPaymentAccountHolder,
          paymentBankName,
          setPaymentBankName,
          paymentNote,
          setPaymentNote,
          showPaymentOnPdf,
          setShowPaymentOnPdf,
        }}
        paper={{
          ref: previewRef,
          layoutVariant,
          locale,
          companyName,
          branchName,
          emblemDataUrl,
          documentTitle,
          showDocumentTagline,
          issuedDate: issuedDateLabel,
          lines: previewLines,
          showQuantityColumn,
          promoLines: previewPromo,
          totals,
          advanceDeduction,
          previousBalance,
          paidOnBehalf: previewPaid,
          paymentInfo: {
            iban: paymentIban,
            accountHolder: paymentAccountHolder,
            bankName: paymentBankName,
            paymentNote: paymentNote,
            showOnPdf: showPaymentOnPdf,
          },
          paymentLabels: {
            section: "Ödeme bilgileri",
            iban: t("reports.orderAccountStatementPaymentIban"),
            accountHolder: t("reports.orderAccountStatementPaymentAccountHolder"),
            bankName: t("reports.orderAccountStatementPaymentBankName"),
            paymentNote: t("reports.orderAccountStatementPaymentNote"),
          },
          documentMeta: {
            referenceId: orderDocumentKey,
            systemDocumentId: lastSavedDocumentId,
            generationLabel: "PDF oluşturma",
          },
          labels,
          emptyHint: t("reports.orderAccountStatementPreviewEmpty"),
          previewFit: true,
        }}
      />
      <OasShipmentDetailModal
        open={shipmentDetailOpen}
        detail={selectedShipmentDetail}
        warehouseId={selectedShipmentSource?.warehouseId ?? null}
        onClose={() => setShipmentDetailOpen(false)}
      />
      <OasMultiActionProgressModal
        open={multiAction.open}
        running={multiAction.running}
        steps={multiAction.steps}
        error={multiAction.error}
        redirectInSec={multiAction.redirectInSec}
        onClose={() => {
          cancelPendingRedirect();
          multiAction.close();
        }}
        onRedirectNow={onRedirectNow}
      />
      <OasProductPricingModal
        open={productPricingOpen}
        onClose={closeProductPricingPanel}
        locale={locale}
        productPricingProductId={productPricingProductId}
        productPricingLineId={productPricingLineId}
        productPricingTitle={productPricingTitle}
        latestCostByProductId={latestCostByProductId}
        linePriceSuggestionByLineId={linePriceSuggestionByLineId}
        activeCounterparty={activeCounterparty}
        priceHistoryRows={priceHistoryRows}
        priceHistoryBusy={priceHistoryBusy}
        productPricingCostRows={productPricingCostRows}
        onRefreshSales={(lineId, productId) => void loadSalesSuggestionForLine(lineId, productId, true)}
      />
    </div>
  );
}
