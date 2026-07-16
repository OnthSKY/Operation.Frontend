"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { ProductUnitPicker } from "@/modules/products/components/ProductUnitPicker";
import type { ProductListItem } from "@/types/product";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { ModalFormLayout, FormSection } from "@/shared/components/ModalFormLayout";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { cn } from "@/lib/cn";
import {
  useBranchProductBalances,
  useRecordBranchStockAdjustment,
  useRecordBranchStockConsumption,
} from "@/modules/branch/hooks/useBranchStockConsumptions";
import type { BranchStockDirection } from "@/modules/branch/api/branch-stock-consumptions-api";

export type ConsumptionQuickEntryMode = "consume" | "adjust";

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  mode: ConsumptionQuickEntryMode;
};

const TITLE_ID = "branch-stock-consumption-quick-entry-title";

function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isLeafProduct(p: ProductListItem): boolean {
  return p.hasChildren !== true;
}

/** Kayan nokta gürültüsünü kırparak miktarı gösterir (backend `0.####` ile aynı çözünürlük). */
function formatQty(n: number): string {
  return String(Number(n.toFixed(4)));
}

/** IN düzeltmede eklenebilir tavanın altındaki çok küçük taşmaları yok say (float toleransı). */
const QTY_EPSILON = 1e-9;

export function ConsumptionQuickEntryModal({ open, onClose, branchId, mode }: Props) {
  const { t } = useI18n();
  const title =
    mode === "consume"
      ? t("branchStockConsumption.quickEntryTitle")
      : t("branchStockConsumption.adjustEntryTitle");

  return (
    <Modal open={open} onClose={onClose} titleId={TITLE_ID} title={title} narrow sheetMobile bodyScroll>
      {open ? <QuickEntryFormBody onClose={onClose} branchId={branchId} mode={mode} /> : null}
    </Modal>
  );
}

function QuickEntryFormBody({
  onClose,
  branchId,
  mode,
}: {
  onClose: () => void;
  branchId: number;
  mode: ConsumptionQuickEntryMode;
}) {
  const { t } = useI18n();
  const { data: catalog = [], isPending: catalogPending } = useProductsCatalog(true);
  const { data: balances = [] } = useBranchProductBalances(branchId, undefined, true);
  const consumeMut = useRecordBranchStockConsumption(branchId);
  const adjustMut = useRecordBranchStockAdjustment(branchId);
  const isSubmitting = consumeMut.isPending || adjustMut.isPending;

  const balanceByProductId = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of balances) m.set(b.productId, b.balance);
    return m;
  }, [balances]);

  // Şubeye sevkiyatla net giren miktar. IN düzeltme bu sınırı aşamaz (stok kaynağı izlenebilir kalsın).
  const shippedInByProductId = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of balances) m.set(b.productId, b.netShippedIn);
    return m;
  }, [balances]);

  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  // Hızlı kullanım (consume) modunda miktar 1 ile gelir — tek tıkla hızlı düşüm kolaylığı.
  const [quantityText, setQuantityText] = useState(mode === "consume" ? "1" : "");
  const [dateText, setDateText] = useState(() => localIsoDate());
  const [direction, setDirection] = useState<BranchStockDirection>("OUT");
  const [note, setNote] = useState("");
  const [unitName, setUnitName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const leafProducts = useMemo(() => catalog.filter(isLeafProduct), [catalog]);

  const matched = useMemo(() => {
    if (!search.trim()) return leafProducts.slice(0, 20);
    const q = normalizeSearch(search);
    return leafProducts
      .filter((p) => normalizeSearch(`${p.name} ${p.parentProductName ?? ""}`).includes(q))
      .slice(0, 20);
  }, [leafProducts, search]);

  const selectedProduct = useMemo(
    () => (productId != null ? catalog.find((p) => p.id === productId) ?? null : null),
    [catalog, productId]
  );

  const isInAdjust = mode === "adjust" && direction === "IN";

  // IN düzeltme tavanı = net sevkiyat − mevcut bakiye (o zamana dek çıkmış/tüketilmiş net miktar).
  // Yalnız IN düzeltme + seçili ürün varken anlamlı; aksi halde null.
  const maxAddable = useMemo(() => {
    if (!isInAdjust || selectedProduct == null) return null;
    const bal = balanceByProductId.get(selectedProduct.id) ?? 0;
    const shipped = shippedInByProductId.get(selectedProduct.id) ?? 0;
    return Math.max(0, shipped - bal);
  }, [isInAdjust, selectedProduct, balanceByProductId, shippedInByProductId]);

  const submit = async () => {
    setFormError(null);
    if (productId == null) {
      setFormError(t("branchStockConsumption.errorProductRequired"));
      return;
    }
    const qty = Number(quantityText.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError(t("branchStockConsumption.errorQuantityInvalid"));
      return;
    }
    if (dateText.length !== 10) {
      setFormError(t("branchStockConsumption.errorDateRequired"));
      return;
    }
    // IN düzeltme sevkiyatla geleni aşamaz — backend de zorunlu kılar, burada erken/anlaşılır uyarı.
    if (isInAdjust && maxAddable != null && qty - maxAddable > QTY_EPSILON) {
      const unit = selectedProduct?.unit ? ` ${selectedProduct.unit}` : "";
      setFormError(
        `${t("branchStockConsumption.errorAdjustInExceedsShippedIn")} ${formatQty(maxAddable)}${unit}`
      );
      return;
    }
    try {
      const unitForSubmit = unitName.trim() || null;
      if (mode === "consume") {
        await consumeMut.mutateAsync({
          productId,
          quantity: qty,
          consumptionDate: dateText,
          note: note.trim() || null,
          unitName: unitForSubmit,
        });
        notify.success(t("toast.branchStockConsumptionSaved"));
      } else {
        await adjustMut.mutateAsync({
          productId,
          direction,
          quantity: qty,
          consumptionDate: dateText,
          note: note.trim() || null,
          unitName: unitForSubmit,
        });
        notify.success(t("toast.branchStockAdjustmentSaved"));
      }
      onClose();
    } catch (e) {
      setFormError(toErrorMessage(e));
    }
  };

  return (
    <ModalFormLayout
      body={
        <>
          <FormSection
            title={t("branchStockConsumption.productLabel")}
            description={t("branchStockConsumption.productHint")}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setProductId(null);
              }}
              placeholder={t("branchStockConsumption.searchPlaceholder")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              disabled={isSubmitting}
            />
            {selectedProduct ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                <div className="min-w-0">
                  <div className="truncate font-medium">{selectedProduct.name}</div>
                  {selectedProduct.parentProductName ? (
                    <div className="truncate text-xs text-emerald-800/70">
                      {selectedProduct.parentProductName}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-800/70">
                    {t("branchStockConsumption.currentBalanceLabel")}
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-emerald-900">
                    {balanceByProductId.get(selectedProduct.id) ?? 0}
                    {selectedProduct.unit ? ` ${selectedProduct.unit}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200">
                {catalogPending ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.loadingProducts")}</li>
                ) : matched.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.noMatches")}</li>
                ) : (
                  matched.map((p) => (
                    <li key={p.id} className="border-b border-zinc-100 last:border-b-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100"
                        onClick={() => {
                          setProductId(p.id);
                          setSearch(p.name);
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-900">{p.name}</span>
                          {p.parentProductName ? (
                            <span className="block truncate text-xs text-zinc-500">{p.parentProductName}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
                          {t("branchStockConsumption.balanceShort")}: {balanceByProductId.get(p.id) ?? 0}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </FormSection>

          {mode === "adjust" ? (
            <FormSection title={t("branchStockConsumption.directionLabel")}>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
                    direction === "OUT"
                      ? "border-rose-300 bg-rose-50 text-rose-900"
                      : "border-zinc-300 bg-white text-zinc-700"
                  )}
                  onClick={() => setDirection("OUT")}
                  disabled={isSubmitting}
                >
                  {t("branchStockConsumption.directionOut")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
                    direction === "IN"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-zinc-300 bg-white text-zinc-700"
                  )}
                  onClick={() => setDirection("IN")}
                  disabled={isSubmitting}
                >
                  {t("branchStockConsumption.directionIn")}
                </button>
              </div>
            </FormSection>
          ) : null}

          <FormSection title={t("branchStockConsumption.quantityLabel")}>
            <ProductUnitPicker
              productId={selectedProduct?.id ?? null}
              baseUnit={selectedProduct?.stockUnit ?? null}
              legacyUnit={selectedProduct?.unit ?? null}
              preferredContext="SALE"
              value={unitName}
              onChange={setUnitName}
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={quantityText}
                onChange={(e) => setQuantityText(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                disabled={isSubmitting}
              />
              {selectedProduct ? (
                <span className="text-sm text-zinc-500">
                  {unitName.trim() || selectedProduct.stockUnit || selectedProduct.unit || ""}
                </span>
              ) : null}
            </div>
            {isInAdjust && selectedProduct ? (
              maxAddable != null && maxAddable <= 0 ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  {t("branchStockConsumption.adjustInNoRoom")}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {t("branchStockConsumption.adjustInMaxHint")}{" "}
                  <span className="font-medium tabular-nums text-zinc-700">
                    {formatQty(maxAddable ?? 0)}
                    {selectedProduct.unit ? ` ${selectedProduct.unit}` : ""}
                  </span>
                </p>
              )
            ) : null}
          </FormSection>

          <FormSection title={t("branchStockConsumption.dateLabel")}>
            <DateField
              value={dateText}
              max={localIsoDate()}
              onChange={(e) => setDateText(e.target.value)}
              disabled={isSubmitting}
            />
          </FormSection>

          <FormSection title={t("branchStockConsumption.noteLabel")}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("branchStockConsumption.notePlaceholder")}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              disabled={isSubmitting}
            />
          </FormSection>

          {formError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {formError}
            </p>
          ) : null}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              isSubmitting ||
              productId == null ||
              (isInAdjust && maxAddable != null && maxAddable <= 0)
            }
          >
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    />
  );
}
