"use client";

import { useI18n } from "@/i18n/context";
import { Modal } from "@/shared/ui/Modal";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  SalesPriceSuggestion,
  SalesPriceHistoryRow,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { ProductCostHistoryRow } from "@/types/product-cost";

/**
 * Ürün başına maliyet + satış önerisi + önceki satışlar + maliyet geçmişi modal'ı.
 *
 * SRP: yalnızca sunum. Veri ve fetch çağrıları orchestrator'dan prop olarak gelir.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  locale: "tr" | "en";
  productPricingProductId: number;
  productPricingLineId: string | null;
  productPricingTitle: string;
  latestCostByProductId: Map<number, ProductCostHistoryRow>;
  linePriceSuggestionByLineId: Record<string, SalesPriceSuggestion | undefined>;
  activeCounterparty: { counterpartyType: "branch" | "customer"; counterpartyId: number } | null;
  priceHistoryRows: SalesPriceHistoryRow[];
  priceHistoryBusy: boolean;
  productPricingCostRows: ProductCostHistoryRow[];
  onRefreshSales: (lineId: string, productId: number) => void;
  onUseSalesPrice: (lineId: string) => void;
};

/** Ham basis kodunu (counterparty_90d…) kullanıcı diline çevirir. */
function basisLabel(basis: string): string {
  switch (basis) {
    case "counterparty_90d":
      return "Son 90 gün · bu cari";
    case "counterparty_all":
      return "Tüm zaman · bu cari";
    case "product_global":
      return "Genel · tüm cariler";
    default:
      return basis;
  }
}

export function OasProductPricingModal(props: Props) {
  const {
    open,
    onClose,
    locale,
    productPricingProductId,
    productPricingLineId,
    productPricingTitle,
    latestCostByProductId,
    linePriceSuggestionByLineId,
    activeCounterparty,
    priceHistoryRows,
    priceHistoryBusy,
    productPricingCostRows,
    onRefreshSales,
    onUseSalesPrice,
  } = props;
  const { t } = useI18n();

  return (
<Modal
  open={open}
  onClose={onClose}
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
                    onRefreshSales(productPricingLineId, productPricingProductId);
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
                  Önerilen · medyan
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-violet-100 pt-2.5 text-[11px]">
                  <span className="text-zinc-400">Ortalama</span>
                  <span className="text-right tabular-nums font-medium text-zinc-700">
                    {formatLocaleAmount(Number(sales.avgUnitPrice || 0), locale, sales.currencyCode)}
                  </span>
                  <span className="text-zinc-400">Son satış</span>
                  <span className="text-right tabular-nums font-medium text-zinc-700">
                    {formatLocaleAmount(Number(sales.lastUnitPrice || 0), locale, sales.currencyCode)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  {basisLabel(sales.basis)} · {sales.sampleCount} satıştan
                </p>
                <button
                  type="button"
                  disabled={!productPricingLineId}
                  onClick={() => {
                    if (productPricingLineId) onUseSalesPrice(productPricingLineId);
                  }}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40"
                >
                  Bu fiyatı kullan
                </button>
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

  );
}
