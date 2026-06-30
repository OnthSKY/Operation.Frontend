"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import Link from "next/link";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import {
  OasIconButton,
  RequiredMark,
  StatementFormStep,
  FlowStepPill,
} from "@/modules/order-account-statement/components/oas-ui";
import { OrderAccountStatementActionsSection } from "@/modules/order-account-statement/components/OrderAccountStatementActionsSection";
import { OrderAccountStatementDocumentContentSection } from "@/modules/order-account-statement/components/OrderAccountStatementDocumentContentSection";
import type { CounterpartySuggestionRow } from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { ShipmentOption } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";
import { OasTemplatePickers } from "@/modules/order-account-statement/components/oas-template-pickers";
import {
  IcDownload,
  IcEraser,
  IcMaximize,
  IcPlay,
  IcLoader,
} from "@/modules/order-account-statement/components/oas-icons";
import { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import type {
  StatementLayoutVariant,
} from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";
import type { useOasIdentity } from "@/modules/order-account-statement/hooks/useOasIdentity";
import type { useOasShipmentSelection } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";

/**
 * Belge başlığı + akış modu seçimi + sevkiyat seçim formu form step'i.
 * Saf sunum bölümü — yalnızca prop ile gelen state ve callback'leri render eder.
 */
type Props = {
  // identity bucket
  identity: ReturnType<typeof useOasIdentity>;
  branchSelectOptions: SelectOption[];
  emblemFileInputRef: RefObject<HTMLInputElement | null>;
  onEmblemFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onUseBrandingEmblem: () => void;

  // shipment bucket
  shipment: ReturnType<typeof useOasShipmentSelection>;
  shipmentComboboxOptions: RichComboboxOption[];
  shipmentInvoiceabilityBusy: boolean;
  shipmentInvoiceability: { remainingQuantity: number; unit?: string | null }[];
  onLoadManualShipment: () => void;

  // preview/template
  locale: "tr" | "en";
  layoutVariant: StatementLayoutVariant;
  setLayoutVariant: (v: StatementLayoutVariant) => void;
  contentPreset: OrderAccountContentPreset;
  applyContentPreset: (p: OrderAccountContentPreset) => void;
  layoutSelectOptions: SelectOption[];
  contentSelectOptions: SelectOption[];

  // misc
  saveToSystem: boolean;
  setSaveToSystem: React.Dispatch<React.SetStateAction<boolean>>;
  setPreviousBalanceText: React.Dispatch<React.SetStateAction<string>>;
  previousBalanceText: string;
  applySelectedBranchOpenBalance: () => void;
  applyBranchOpenBalanceBusy: boolean;
  suggestionsBusy: boolean;

  // flow + extras
  flowCurrentStep: number;
  loadShipmentGroupIntoForm: (option: ShipmentOption, source: "auto" | "manual") => Promise<void>;
  suggestions: CounterpartySuggestionRow[];
};

export function OasHeadStep(props: Props) {
  const { t } = useI18n();
  // Sevkiyat seçildikten sonra seçim kontrollerini katla (kompakt). "Değiştir" ile geri açılır.
  const [shipmentPickerOpen, setShipmentPickerOpen] = useState(false);
  const {
    identity,
    branchSelectOptions,
    emblemFileInputRef,
    onEmblemFileChange,
    onUseBrandingEmblem,
    shipment,
    shipmentComboboxOptions,
    shipmentInvoiceabilityBusy,
    shipmentInvoiceability,
    onLoadManualShipment,
    locale,
    layoutVariant,
    setLayoutVariant,
    contentPreset,
    applyContentPreset,
    layoutSelectOptions,
    contentSelectOptions,
    saveToSystem,
    setSaveToSystem,
    setPreviousBalanceText,
    previousBalanceText,
    applySelectedBranchOpenBalance,
    applyBranchOpenBalanceBusy,
    suggestionsBusy,
    flowCurrentStep,
    loadShipmentGroupIntoForm,
    suggestions,
  } = props;
  // Aliases — block içeriğinde yerel isimlerle uyumlu kalmak için.
  const {
    companyName, setCompanyName,
    branchName, setBranchName,
    documentTitle, setDocumentTitle,
    showDocumentTagline, setShowDocumentTagline,
    emblemDataUrl, setEmblemDataUrl,
    linkedBranchId, setLinkedBranchId,
    brandingLogoBusy,
  } = identity;
  const {
    creationMode, setCreationMode,
    shipmentLinkMode, setShipmentLinkMode,
    selectedShipmentSource,
    selectedShipmentProductKind,
    selectedShipmentDetail,
    setShipmentDetailOpen,
    shipmentOptions,
    shipmentOptionsBusy,
    selectedShipmentOptionKey,
    setSelectedShipmentOptionKey,
    manualShipmentBusy,
    manualShipmentWarehouseIdText,
    setManualShipmentWarehouseIdText,
    manualShipmentMovementIdText,
    setManualShipmentMovementIdText,
  } = shipment;

  return (
    <StatementFormStep
      title={t("reports.orderAccountStatementStepHead")}
      stepVisual={{ tone: "indigo", icon: "header" }}
      scopeKinds={["document", "system"]}
    >
      <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">
          {t("reports.orderAccountStatementFlowTitle")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <FlowStepPill index={1} label={t("reports.orderAccountStatementFlowStep1")} state={flowCurrentStep > 1 ? "done" : "current"} />
          <FlowStepPill
            index={2}
            label={
              creationMode === "shipmentBased"
                ? t("reports.orderAccountStatementFlowStep2Shipment")
                : t("reports.orderAccountStatementFlowStep2Manual")
            }
            state={flowCurrentStep > 2 ? "done" : flowCurrentStep === 2 ? "current" : "todo"}
          />
          <FlowStepPill
            index={3}
            label={t("reports.orderAccountStatementFlowStep3")}
            state={flowCurrentStep > 3 ? "done" : flowCurrentStep === 3 ? "current" : "todo"}
          />
          <FlowStepPill index={4} label={t("reports.orderAccountStatementFlowStep4")} state={flowCurrentStep === 4 ? "current" : "todo"} />
        </div>
        {flowCurrentStep <= 2 ? (
          <p className="mt-1.5 text-[11px] text-violet-800">
            {creationMode === "shipmentBased"
              ? t("reports.orderAccountStatementFlowHintShipment")
              : t("reports.orderAccountStatementFlowHintManual")}
          </p>
        ) : null}
      </div>
      <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
          {t("reports.orderAccountStatementModeCardTitle")}
        </p>
        {!selectedShipmentSource ? (
          <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600">
            {t("reports.orderAccountStatementSelectFirstBadge")}
          </span>
        ) : null}
        </div>
        {!selectedShipmentSource ? (
          <p className="mb-2 text-[11px] text-zinc-600">
            {t("reports.orderAccountStatementModeCardHelp")}
          </p>
        ) : null}
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
                {t("reports.orderAccountStatementShipmentPreselectHint")}
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
            {selectedShipmentSource && !shipmentPickerOpen ? (
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShipmentPickerOpen(true)}
                  className="min-h-8 text-xs"
                >
                  {t("reports.orderAccountStatementShipmentChange")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShipmentDetailOpen(true)}
                  disabled={!selectedShipmentDetail}
                  className="min-h-8 text-xs"
                >
                  {t("reports.orderAccountStatementShipmentDetailButton")}
                </Button>
              </div>
            ) : (
            <div className="mt-2 grid gap-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <RichCombobox
                  value={selectedShipmentOptionKey}
                  onChange={(nextKey) => {
                    setSelectedShipmentOptionKey(nextKey);
                    const selected = shipmentOptions.find((x) => x.key === nextKey);
                    if (!selected) return;
                    void loadShipmentGroupIntoForm(selected, "manual");
                    setShipmentPickerOpen(false);
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
            )}
          </div>
        ) : null}
        </div>
      </div>
      {/* Marka/belge görünümü ikincil → varsayılan kapalı (kompakt); gerekince aç. */}
      <details className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/70">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-700 marker:hidden">
          ▸ {t("reports.orderAccountStatementBrandingSection")}
        </summary>
        <div className="px-3 pb-3">
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
        </div>
      </details>
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

  );
}
