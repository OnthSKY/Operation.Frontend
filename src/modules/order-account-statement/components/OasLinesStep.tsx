"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import {
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { computeLineAmountMismatch } from "@/modules/order-account-statement/components/oas-helpers";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import {
  OasIconButton,
  OasTrashButton,
  StatementFormStep,
  RequiredMark,
  OrderAccountProductPricingIconButton,
} from "@/modules/order-account-statement/components/oas-ui";
import { LineCalcBlock } from "@/modules/order-account-statement/components/oas-line-calc-block";
import { OrderAccountLineProductPicker } from "@/modules/order-account-statement/components/OrderAccountLineProductPicker";
import { OasLineUnitInput } from "@/modules/order-account-statement/components/OasLineUnitInput";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";
import type { ProductListItem } from "@/types/product";
import type { ProductCostHistoryRow } from "@/types/product-cost";
import type { SalesPriceSuggestion } from "@/modules/order-account-statement/api/outbound-invoices-api";

/**
 * Ana sipariş kalemleri (lines) form step'i. Saf JSX bölümlemesi — orchestrator'dan
 * çıkarıldı. Tüm state ve handler bağımlılıkları açıkça prop olarak alınır.
 *
 * SRP: yalnızca kalem listesi + tablo + mobil kart + drag-drop sunumu. Karar/akış
 * (handle/apply/load) handler'larından gelir.
 */
type Props = {
  // state
  lines: LineDraft[];
  setLines: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  showQuantityColumn: boolean;
  setShowQuantityColumn: (v: boolean) => void;
  desktopLineDetailsOpen: boolean;
  setDesktopLineDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // computed
  lineAddBlocked: boolean;
  lineCompact: boolean;
  lineDense: boolean;
  canPickProducts: boolean;

  // domain
  locale: "tr" | "en";
  catalog: ProductListItem[];
  latestCostByProductId: Map<number, ProductCostHistoryRow>;
  linePriceSuggestionByLineId: Record<string, SalesPriceSuggestion | undefined>;
  creationMode: "manual" | "shipmentBased";
  shipmentLinkMode: "strict" | "partial";

  // drag
  draggingLineId: string | null;
  dragOverLineId: string | null;

  // handlers
  handleAddLine: () => void;
  handleMobileLineEnter: (
    e: React.KeyboardEvent<HTMLInputElement>,
    lineId: string,
    field: "description" | "amount"
  ) => void;
  beginLineDrag: (id: string) => void;
  hoverLineDropTarget: (id: string) => void;
  dropLineOnTarget: (id: string) => void;
  finishLineDrag: () => void;
  applyProductListItemToLine: (lineId: string, p: ProductListItem) => void;
  openProductPricingPanel: (line: LineDraft) => void;
  collapseLinesToParentProduct: () => void;
};

export function OasLinesStep(props: Props) {
  const {
    lines,
    setLines,
    showQuantityColumn,
    setShowQuantityColumn,
    desktopLineDetailsOpen,
    setDesktopLineDetailsOpen,
    lineAddBlocked,
    lineCompact,
    lineDense,
    canPickProducts,
    locale,
    catalog,
    latestCostByProductId,
    linePriceSuggestionByLineId,
    creationMode,
    shipmentLinkMode,
    draggingLineId,
    dragOverLineId,
    handleAddLine,
    handleMobileLineEnter,
    beginLineDrag,
    hoverLineDropTarget,
    dropLineOnTarget,
    finishLineDrag,
    applyProductListItemToLine,
    openProductPricingPanel,
    collapseLinesToParentProduct,
  } = props;
  const { t } = useI18n();

  return (
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
                  <OasLineUnitInput
                    productId={line.selectedProductId ?? null}
                    baseUnit={
                      (line.selectedProductId
                        ? catalog.find((p) => p.id === line.selectedProductId)
                        : null
                      )?.stockUnit ??
                      (line.selectedProductId
                        ? catalog.find((p) => p.id === line.selectedProductId)
                        : null
                      )?.unit ??
                      null
                    }
                    fallbackUnit={line.unitText}
                    value={line.unitText ?? ""}
                    onChange={(v) =>
                      setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)))
                    }
                    className={cn(
                      "mt-0.5 w-full rounded-md border border-zinc-200 bg-white tabular-nums",
                      lineDense
                        ? "px-1.5 py-1 text-[11px]"
                        : lineCompact
                          ? "px-1.5 py-1.5 text-xs"
                          : "px-2 py-1.5 text-sm"
                    )}
                    placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
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
                    <OasLineUnitInput
                      productId={line.selectedProductId ?? null}
                      fallbackUnit={line.unitText}
                      value={line.unitText ?? ""}
                      onChange={(v) =>
                        setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)))
                      }
                      className={cn(
                        "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                        lineDense
                          ? "px-1 py-0.5 text-[10px]"
                          : lineCompact
                            ? "px-1 py-1 text-[11px]"
                            : "px-1.5 py-1.5"
                      )}
                      placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
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

  );
}
