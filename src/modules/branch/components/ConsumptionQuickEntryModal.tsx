"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import type { ProductListItem } from "@/types/product";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { ModalFormLayout, FormSection } from "@/shared/components/ModalFormLayout";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { cn } from "@/lib/cn";
import {
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
  const consumeMut = useRecordBranchStockConsumption(branchId);
  const adjustMut = useRecordBranchStockAdjustment(branchId);
  const isSubmitting = consumeMut.isPending || adjustMut.isPending;

  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [quantityText, setQuantityText] = useState("");
  const [dateText, setDateText] = useState(() => localIsoDate());
  const [direction, setDirection] = useState<BranchStockDirection>("OUT");
  const [note, setNote] = useState("");
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
    try {
      if (mode === "consume") {
        await consumeMut.mutateAsync({
          productId,
          quantity: qty,
          consumptionDate: dateText,
          note: note.trim() || null,
        });
        notify.success(t("toast.branchStockConsumptionSaved"));
      } else {
        await adjustMut.mutateAsync({
          productId,
          direction,
          quantity: qty,
          consumptionDate: dateText,
          note: note.trim() || null,
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
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div className="font-medium">{selectedProduct.name}</div>
                {selectedProduct.parentProductName ? (
                  <div className="text-xs text-emerald-800/70">
                    {selectedProduct.parentProductName}
                  </div>
                ) : null}
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-zinc-200">
                {catalogPending ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.loadingProducts")}</li>
                ) : matched.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.noMatches")}</li>
                ) : (
                  matched.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                        onClick={() => {
                          setProductId(p.id);
                          setSearch(p.name);
                        }}
                      >
                        <span className="font-medium text-zinc-900">{p.name}</span>
                        {p.parentProductName ? (
                          <span className="text-xs text-zinc-500">{p.parentProductName}</span>
                        ) : null}
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
              {selectedProduct?.unit ? (
                <span className="text-sm text-zinc-500">{selectedProduct.unit}</span>
              ) : null}
            </div>
          </FormSection>

          <FormSection title={t("branchStockConsumption.dateLabel")}>
            <input
              type="date"
              value={dateText}
              max={localIsoDate()}
              onChange={(e) => setDateText(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
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
          <Button onClick={submit} disabled={isSubmitting || productId == null}>
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    />
  );
}
