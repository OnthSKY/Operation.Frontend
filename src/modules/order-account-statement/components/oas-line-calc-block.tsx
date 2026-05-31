import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/i18n/messages";
import { computeSuggestedLineTotal } from "@/modules/order-account-statement/lib/suggested-line-total";
import { formatLocaleAmount, formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";
import { OasIconButton } from "@/modules/order-account-statement/components/oas-ui";
import {
  IcChevronRight,
  IcX,
  IcBox,
  IcScale,
  IcCheck,
} from "@/modules/order-account-statement/components/oas-icons";

/**
 * Tek bir sipariş-hesap satırı için "tutar hesapla" bloğu: parça/kg moduna göre
 * öneri üretir ve onaylanınca satırı (setLines ile) günceller. Tamamen prop-güdümlü;
 * parent state'e doğrudan kapanmaz, satırı `line` + `setLines` üzerinden yönetir.
 * (OrderAccountStatementScreen.tsx'ten Faz-2 refactor kapsamında çıkarıldı.)
 */
export function LineCalcBlock({
  line,
  locale,
  t,
  setLines,
  className,
  compact,
  ultraCompact,
}: {
  line: LineDraft;
  locale: Locale;
  t: (key: string) => string;
  setLines: Dispatch<SetStateAction<LineDraft[]>>;
  className?: string;
  /** Birden fazla satırda formu sıkılaştırır */
  compact?: boolean;
  /** Çok sayıda satırda (4+) ek daraltma */
  ultraCompact?: boolean;
}) {
  const [calcOpen, setCalcOpen] = useState(false);
  const suggestion = useMemo(() => {
    const fromMode = computeSuggestedLineTotal(
      {
        ...line,
        qtyText: line.qtyText.trim() ? line.qtyText : line.quantityText,
      },
      locale
    );
    if (fromMode != null) return fromMode;
    // Fallback: satır modu farklı olsa bile tablo adet + birim fiyatından öneri üret.
    return computeSuggestedLineTotal(
      {
        ...line,
        priceCalcMode: "piece",
        qtyText: line.quantityText,
        unitPriceText: line.unitPriceText,
      },
      locale
    );
  }, [line, locale]);

  const patch = useCallback(
    (p: Partial<LineDraft>) => {
      setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, ...p } : x)));
    },
    [line.id, setLines]
  );

  const apply = useCallback(() => {
    if (suggestion == null || !Number.isFinite(suggestion)) return;
    const qtyForPdf = (line.priceCalcMode === "piece" ? line.qtyText : line.kgText).trim();
    const unitPriceForPdf = (line.priceCalcMode === "piece" ? line.unitPriceText : line.tryPerKgText).trim();
    const unitForPdf = line.priceCalcMode === "piece" ? line.unitText ?? "" : "kg";
    setLines((prev) =>
      prev.map((x) =>
        x.id === line.id
          ? {
              ...x,
              amount: suggestion,
              amountText: formatLocaleAmountInput(suggestion, locale),
              quantityText: qtyForPdf,
              unitPriceText: unitPriceForPdf,
              unitText: unitForPdf,
            }
          : x
      )
    );
    setCalcOpen(false);
  }, [line.id, line.kgText, line.priceCalcMode, line.qtyText, line.tryPerKgText, line.unitPriceText, line.unitText, locale, setLines, suggestion]);

  const modePiece = line.priceCalcMode === "piece";
  const c = Boolean(compact);
  const u = Boolean(ultraCompact);
  const hideLabel = t("reports.orderAccountStatementPriceCalcToggleHide");
  const showLabel = t("reports.orderAccountStatementPriceCalcToggleShow");
  const wrap = cn("min-w-0", u && "origin-top scale-[0.97]", className);

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setCalcOpen(true)}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-dashed border-zinc-300 bg-white text-left text-zinc-800 transition",
          u ? "px-1.5 py-1" : c ? "px-2 py-1.5" : "px-2.5 py-2",
          "hover:border-zinc-400 hover:bg-zinc-50"
        )}
      >
        <span className={cn("min-w-0 font-medium text-zinc-600", u ? "text-[8px]" : c ? "text-[9px]" : "text-xs")}>
          {showLabel}
        </span>
        <IcChevronRight className={u ? "h-4 w-4 shrink-0 text-zinc-500" : "h-5 w-5 shrink-0 text-zinc-500"} />
      </button>

      {suggestion != null ? (
        <p className={cn("mt-1 text-zinc-500", u ? "text-[8px]" : "text-[9px]")}>
          {t("reports.orderAccountStatementSuggestedTotal")}: {formatLocaleAmount(suggestion, locale, "TRY")}
        </p>
      ) : null}

      {calcOpen
        ? createPortal(
            <div
              role="presentation"
              className={cn(
                "fixed inset-0 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4",
                OVERLAY_Z_TW.modal
              )}
              onClick={() => setCalcOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("reports.orderAccountStatementCalcHint")}
                className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight text-zinc-950">
                      {t("reports.orderAccountStatementCalcHint")}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {modePiece ? t("reports.orderAccountStatementCalcHintPiece") : t("reports.orderAccountStatementCalcHintKg")}
                    </p>
                  </div>
                  <OasIconButton
                    title={hideLabel}
                    aria-label={hideLabel}
                    onClick={() => setCalcOpen(false)}
                    className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14"
                  >
                    <IcX className="h-8 w-8" />
                  </OasIconButton>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5">
                  <p className="text-xs font-medium text-zinc-700">{t("reports.orderAccountStatementPriceModeLabel")}</p>
                  <div className="flex gap-2">
                    <OasIconButton
                      title={t("reports.orderAccountStatementPriceModePiece")}
                      aria-label={t("reports.orderAccountStatementPriceModePiece")}
                      onClick={() => patch({ priceCalcMode: "piece" })}
                      className={cn(
                        "!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14",
                        modePiece ? "!border-zinc-800 !bg-zinc-900 !text-white" : "!text-zinc-600 hover:!bg-zinc-50"
                      )}
                    >
                      <IcBox className="h-8 w-8" />
                    </OasIconButton>
                    <OasIconButton
                      title={t("reports.orderAccountStatementPriceModeKg")}
                      aria-label={t("reports.orderAccountStatementPriceModeKg")}
                      onClick={() => patch({ priceCalcMode: "kg" })}
                      className={cn(
                        "!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14",
                        !modePiece ? "!border-zinc-800 !bg-zinc-900 !text-white" : "!text-zinc-600 hover:!bg-zinc-50"
                      )}
                    >
                      <IcScale className="h-8 w-8" />
                    </OasIconButton>
                  </div>

                  {modePiece ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementUnit")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={line.unitText ?? ""}
                          onChange={(e) => patch({ unitText: e.target.value })}
                          placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementQty")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.qtyText}
                          onChange={(e) => patch({ qtyText: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementUnitPrice")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.unitPriceText}
                          onChange={(e) => patch({ unitPriceText: e.target.value })}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            patch({ unitPriceText: formatLocaleAmountInput(n, locale) });
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementKg")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.kgText}
                          onChange={(e) => patch({ kgText: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementTryPerKg")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.tryPerKgText}
                          onChange={(e) => patch({ tryPerKgText: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {t("reports.orderAccountStatementSuggestedTotal")}:{" "}
                    <strong className="tabular-nums text-zinc-950">
                      {suggestion != null ? formatLocaleAmount(suggestion, locale, "TRY") : "—"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 sm:px-5">
                  <Button type="button" variant="ghost" className="min-h-11 px-4" onClick={() => setCalcOpen(false)}>
                    {t("common.close")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-11 gap-2 px-4"
                    onClick={apply}
                    disabled={suggestion == null || !Number.isFinite(suggestion)}
                  >
                    <IcCheck className="h-5 w-5" />
                    <span>{t("reports.orderAccountStatementApplySuggestion")}</span>
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
