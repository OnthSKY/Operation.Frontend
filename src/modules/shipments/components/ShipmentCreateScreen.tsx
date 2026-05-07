"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";
import {
  useCreateShipmentDraft,
  useShipmentCreatableBranches,
} from "@/modules/shipments/hooks/useShipmentQueries";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import type { ProductListItem } from "@/types/product";

const PAGE_SIZE = 100;
const FALLBACK_WAREHOUSE_ID = 1;

type DraftLine = {
  key: string;
  productId: string;
  quantity: string;
};

function replaceVars(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

function productTitle(product: ProductListItem) {
  const parent = product.parentProductName?.trim();
  const name = product.name.trim();
  return parent && parent !== name ? `${parent} › ${name}` : name;
}

function warehouseSummary(product: ProductListItem, maxItems = 2) {
  return (product.byWarehouse ?? [])
    .filter((x) => Number(x.quantity) > 0)
    .sort((a, b) => Number(b.quantity) - Number(a.quantity))
    .slice(0, maxItems)
    .map((x) => ({
      warehouseId: x.warehouseId,
      warehouseName: x.warehouseName?.trim() || `#${x.warehouseId}`,
      quantity: Number(x.quantity) || 0,
    }));
}

function chooseWarehouseId(lines: DraftLine[], productsById: Map<number, ProductListItem>) {
  const scores = new Map<number, number>();
  for (const line of lines) {
    const productId = Number(line.productId);
    const product = Number.isFinite(productId) ? productsById.get(productId) : undefined;
    if (!product) continue;
    for (const wh of product.byWarehouse ?? []) {
      const warehouseId = Number(wh.warehouseId);
      const quantity = Number(wh.quantity) || 0;
      if (!Number.isFinite(warehouseId) || warehouseId <= 0 || quantity <= 0) continue;
      scores.set(warehouseId, (scores.get(warehouseId) ?? 0) + quantity);
    }
  }

  let bestWarehouseId = 0;
  let bestScore = -1;
  for (const [warehouseId, score] of scores) {
    if (score > bestScore) {
      bestWarehouseId = warehouseId;
      bestScore = score;
    }
  }

  return bestWarehouseId > 0 ? bestWarehouseId : FALLBACK_WAREHOUSE_ID;
}

export function ShipmentCreateScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const createDraft = useCreateShipmentDraft();
  const { data: creatableBranches = [], isPending: branchesPending } = useShipmentCreatableBranches();
  const { data: productPage, isPending: productsPending } = useProductsCatalogPaged(
    1,
    PAGE_SIZE,
    "",
    true,
    true,
    true
  );
  const [branchId, setBranchId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ key: "line-1", productId: "", quantity: "" }]);
  const [submitted, setSubmitted] = useState(false);

  const products = useMemo(() => productPage?.items ?? [], [productPage?.items]);
  const productsById = useMemo(() => new Map(products.map((x) => [x.id, x])), [products]);

  const branchOptions = useMemo(
    () => creatableBranches.map((x) => ({ value: String(x.id), title: x.name })),
    [creatableBranches]
  );

  const productOptions = useMemo((): RichComboboxOption[] => {
    return products.map((product) => {
      const unit = product.unit?.trim();
      const total = formatLocaleAmount(Number(product.totalQuantity) || 0, locale);
      const stockText = replaceVars(t("shipments.create.productTotalStock"), {
        quantity: unit ? `${total} ${unit}` : total,
      });
      const warehouses = warehouseSummary(product);
      const warehouseText = warehouses.length
        ? warehouses
            .map((x) => `${x.warehouseName}: ${formatLocaleAmount(x.quantity, locale)}${unit ? ` ${unit}` : ""}`)
            .join(" · ")
        : t("shipments.create.noWarehouseStock");
      return {
        value: String(product.id),
        title: productTitle(product),
        description: product.categoryName ?? (unit ? replaceVars(t("shipments.create.unit"), { unit }) : undefined),
        detail: `${stockText} · ${warehouseText}`,
      };
    });
  }, [locale, products, t]);

  const effectiveBranchId =
    branchId || (creatableBranches.length > 0 ? String(creatableBranches[0].id) : "");
  const normalizedLines = useMemo(
    () =>
      lines
        .map((line) => ({
          productId: Number(line.productId),
          requestedQuantity: Number(line.quantity),
        }))
        .filter(
          (line) =>
            Number.isFinite(line.productId) &&
            line.productId > 0 &&
            Number.isFinite(line.requestedQuantity) &&
            line.requestedQuantity > 0
        ),
    [lines]
  );
  const selectedWarehouseId = useMemo(() => chooseWarehouseId(lines, productsById), [lines, productsById]);
  const canSubmit = Boolean(effectiveBranchId) && normalizedLines.length > 0;
  const showLineError = submitted && normalizedLines.length === 0;

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { key: `line-${Date.now()}-${prev.length}`, productId: "", quantity: "" }]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {t("shipments.create.eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              {t("shipments.create.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              {t("shipments.create.subtitle")}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 sm:text-right">
            {replaceVars(t("shipments.create.linesCount"), { count: normalizedLines.length })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 sm:text-lg">{t("shipments.create.branchSection")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t("shipments.create.branchHint")}</p>
          </div>

          {creatableBranches.length <= 1 ? (
            <Input
              name="branchName"
              label={t("shipments.create.branchLabel")}
              value={branchesPending ? t("common.loading") : creatableBranches[0]?.name ?? ""}
              readOnly
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">{t("shipments.create.branchLabel")}</label>
              <RichCombobox
                value={effectiveBranchId}
                onChange={(next) => setBranchId(next)}
                options={branchOptions}
                placeholder={t("shipments.create.selectBranch")}
                searchPlaceholder={t("shipments.create.searchBranch")}
                emptyText={branchesPending ? t("common.loading") : t("shipments.create.noBranch")}
                disabled={branchesPending}
              />
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-950 shadow-sm sm:p-5 lg:row-span-2">
          <h2 className="font-semibold">{t("shipments.create.summaryTitle")}</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-indigo-800/75">{t("shipments.create.summaryBranch")}</dt>
              <dd className="truncate font-semibold">{creatableBranches.find((x) => String(x.id) === effectiveBranchId)?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-indigo-800/75">{t("shipments.create.summaryLines")}</dt>
              <dd className="font-semibold">{normalizedLines.length}</dd>
            </div>
          </dl>
          <p className="mt-5 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-indigo-900/80">
            {t("shipments.create.autoWarehouseHint")}
          </p>
        </aside>

        <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 sm:text-lg">{t("shipments.create.productsSection")}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t("shipments.create.productsHint")}</p>
            </div>
            <Button type="button" variant="secondary" className="sm:w-auto" onClick={addLine}>
              {t("shipments.create.addProduct")}
            </Button>
          </div>

          {showLineError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t("shipments.create.productRequired")}
            </div>
          ) : null}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const product = productsById.get(Number(line.productId));
              const unit = product?.unit?.trim();
              return (
                <div
                  key={line.key}
                  className={cn(
                    "rounded-2xl border bg-zinc-50/70 p-3 sm:p-4",
                    showLineError ? "border-red-200" : "border-zinc-200"
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
                    <div className="flex min-w-0 flex-col gap-1">
                      <label className="text-sm font-medium text-zinc-700">
                        {replaceVars(t("shipments.create.productLineLabel"), { index: index + 1 })}
                      </label>
                      <RichCombobox
                        value={line.productId}
                        onChange={(value) => updateLine(line.key, { productId: value })}
                        options={productOptions}
                        placeholder={t("shipments.create.selectProduct")}
                        searchPlaceholder={t("products.catalogSearchPlaceholder")}
                        emptyText={productsPending ? t("common.loading") : t("shipments.create.noProduct")}
                        disabled={productsPending}
                      />
                    </div>
                    <Input
                      name={`quantity-${line.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      label={t("shipments.create.quantityLabel")}
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="md:w-auto"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 1}
                    >
                      {t("common.remove")}
                    </Button>
                  </div>
                  {product ? (
                    <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <span className="font-medium text-zinc-800">{t("shipments.create.availableTotal")}: </span>
                        {formatLocaleAmount(Number(product.totalQuantity) || 0, locale)}{unit ? ` ${unit}` : ""}
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <span className="font-medium text-zinc-800">{t("shipments.create.topStocks")}: </span>
                        {warehouseSummary(product).length
                          ? warehouseSummary(product)
                              .map((x) => `${x.warehouseName} ${formatLocaleAmount(x.quantity, locale)}${unit ? ` ${unit}` : ""}`)
                              .join(" · ")
                          : t("shipments.create.noWarehouseStock")}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="sticky bottom-2 z-10 rounded-3xl border border-zinc-200 bg-white/95 p-3 shadow-xl shadow-zinc-900/10 backdrop-blur sm:static sm:shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => router.push("/shipments")}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={async () => {
              setSubmitted(true);
              if (!canSubmit) return;
              const created = await createDraft.mutateAsync({
                branchId: Number(effectiveBranchId),
                warehouseId: selectedWarehouseId,
                priority: "NORMAL",
                items: normalizedLines,
              });
              router.push(`/shipments/${created.id}`);
            }}
            disabled={createDraft.isPending || branchesPending || productsPending || !effectiveBranchId}
          >
            {createDraft.isPending ? t("shipments.create.savingDraft") : t("shipments.create.saveDraft")}
          </Button>
        </div>
      </div>
    </div>
  );
}
