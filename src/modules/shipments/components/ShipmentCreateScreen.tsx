"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasEffectivePermission } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";

import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";

import {
  useCreateShipmentDraft,
  useShipmentCreatableBranches,
  useWarehouseReservations,
} from "@/modules/shipments/hooks/useShipmentQueries";

import { formatLocaleAmount } from "@/shared/lib/locale-amount";

import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

import {
  RichCombobox,
  type RichComboboxOption,
} from "@/shared/ui/RichCombobox";

import type { ProductListItem } from "@/types/product";

const PAGE_SIZE = 100;
const FALLBACK_WAREHOUSE_ID = 1;

const SCREEN_CLASS_NAME =
  "mx-auto flex w-full max-w-[100rem] flex-col gap-4 p-3 sm:p-4 lg:p-6 xl:px-8 2xl:px-10";

const HERO_CARD_CLASS_NAME =
  "rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 xl:p-7";

type DraftLine = {
  key: string;
  productId: string;
  quantity: string;
};

function replaceVars(
  template: string,
  vars: Record<string, string | number>
) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) =>
      acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

function productTitle(product: ProductListItem) {
  const parent = product.parentProductName?.trim();
  const name = product.name.trim();

  return parent && parent !== name
    ? `${parent} › ${name}`
    : name;
}

function warehouseSummary(
  product: ProductListItem,
  maxItems = 2
) {
  return (product.byWarehouse ?? [])
    .filter((x) => Number(x.quantity) > 0)
    .sort(
      (a, b) =>
        Number(b.quantity) - Number(a.quantity)
    )
    .slice(0, maxItems)
    .map((x) => ({
      warehouseId: x.warehouseId,
      warehouseName:
        x.warehouseName?.trim() ||
        `#${x.warehouseId}`,
      quantity: Number(x.quantity) || 0,
    }));
}

function chooseWarehouseId(
  lines: DraftLine[],
  productsById: Map<number, ProductListItem>
) {
  const scores = new Map<number, number>();

  for (const line of lines) {
    const productId = Number(line.productId);

    const product = Number.isFinite(productId)
      ? productsById.get(productId)
      : undefined;

    if (!product) continue;

    for (const wh of product.byWarehouse ?? []) {
      const warehouseId = Number(wh.warehouseId);

      const quantity =
        Number(wh.quantity) || 0;

      if (
        !Number.isFinite(warehouseId) ||
        warehouseId <= 0 ||
        quantity <= 0
      ) {
        continue;
      }

      scores.set(
        warehouseId,
        (scores.get(warehouseId) ?? 0) +
          quantity
      );
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

  return bestWarehouseId > 0
    ? bestWarehouseId
    : FALLBACK_WAREHOUSE_ID;
}

type SummaryEntry = {
  productId: number;
  product: ProductListItem;
  quantity: number;
};

function collectSummary(
  lines: DraftLine[],
  productsById: Map<number, ProductListItem>
): SummaryEntry[] {
  const out: SummaryEntry[] = [];
  for (const line of lines) {
    const productId = Number(line.productId);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(productId) || productId <= 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const product = productsById.get(productId);
    if (!product) continue;
    out.push({ productId, product, quantity });
  }
  return out;
}

function formatQty(qty: number, unit: string | null | undefined, locale: Locale, t: (k: string) => string) {
  const cleanUnit = unit?.trim();
  const amount = formatLocaleAmount(qty, locale);
  return cleanUnit
    ? replaceVars(t("shipments.create.summaryQuantity"), { quantity: amount, unit: cleanUnit })
    : replaceVars(t("shipments.create.summaryQuantityNoUnit"), { quantity: amount });
}

function SummaryLineItems({
  lines,
  productsById,
  locale,
  t,
}: {
  lines: DraftLine[];
  productsById: Map<number, ProductListItem>;
  locale: Locale;
  t: (k: string) => string;
}) {
  const entries = useMemo(() => collectSummary(lines, productsById), [lines, productsById]);
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {t("shipments.create.summaryLineItems")}
      </p>
      {entries.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-indigo-900/60">
          {t("shipments.create.summaryEmpty")}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-indigo-100 overflow-hidden rounded-2xl bg-white/80">
          {entries.map((entry, idx) => (
            <li key={`${entry.productId}-${idx}`} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{productTitle(entry.product)}</p>
                {entry.product.parentProductName?.trim() &&
                entry.product.parentProductName.trim() !== entry.product.name.trim() ? (
                  <p className="truncate text-[10px] text-zinc-500">
                    {entry.product.parentProductName}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 tabular-nums font-semibold text-indigo-900">
                {formatQty(entry.quantity, entry.product.unit, locale, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function resolveParentName(product: ProductListItem, productsById: Map<number, ProductListItem>): string {
  // 1) parentProductId → look up the parent product in the catalog and use its name
  const parentId = product.parentProductId;
  if (parentId && parentId > 0) {
    const parent = productsById.get(parentId);
    if (parent) return parent.name.trim();
  }
  // 2) Fallback to parentProductName if backend populated it
  const fromField = product.parentProductName?.trim();
  if (fromField) return fromField;
  // 3) Root product — group it under itself
  return product.name.trim();
}

function SummaryParentTotals({
  lines,
  productsById,
  locale,
  t,
}: {
  lines: DraftLine[];
  productsById: Map<number, ProductListItem>;
  locale: Locale;
  t: (k: string) => string;
}) {
  const totals = useMemo(() => {
    const entries = collectSummary(lines, productsById);
    type Bucket = { name: string; unit: string | null | undefined; quantity: number };
    const map = new Map<string, Bucket>();
    for (const entry of entries) {
      const parentName = resolveParentName(entry.product, productsById);
      const unit = entry.product.unit;
      // Group by parent name AND unit — different units stay split (cannot sum kg + adet).
      const key = `${parentName}::${unit ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += entry.quantity;
      } else {
        map.set(key, { name: parentName, unit, quantity: entry.quantity });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [lines, productsById]);

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {t("shipments.create.summaryParentTotals")}
      </p>
      {totals.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-indigo-900/60">
          {t("shipments.create.summaryEmpty")}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-indigo-100 overflow-hidden rounded-2xl bg-white/80">
          {totals.map((bucket) => (
            <li key={`${bucket.name}-${bucket.unit ?? ""}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="truncate font-medium text-zinc-900">{bucket.name}</span>
              <span className="shrink-0 tabular-nums font-semibold text-indigo-900">
                {formatQty(bucket.quantity, bucket.unit, locale, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ShipmentCreateScreen() {
  const router = useRouter();

  const { locale, t } = useI18n();
  const { user, isReady } = useAuth();

  // Defense-in-depth: liste ekranındaki buton zaten `shipment.create` ister, ama doğrudan
  // /shipments/create URL'ine gelen yetkisiz kullanıcıyı da burada engelle (backend ile aynı semantik).
  const canCreate = hasEffectivePermission(user, PERM.shipmentCreate);

  const createDraft =
    useCreateShipmentDraft();

  const {
    data: creatableBranches = [],
    isPending: branchesPending,
  } = useShipmentCreatableBranches();

  const {
    data: productPage,
    isPending: productsPending,
  } = useProductsCatalogPaged(
    1,
    PAGE_SIZE,
    "",
    true,
    true,
    true
  );

  const [branchId, setBranchId] =
    useState("");

  const [lines, setLines] = useState<
    DraftLine[]
  >([
    {
      key: "line-1",
      productId: "",
      quantity: "",
    },
  ]);

  const [submitted, setSubmitted] =
    useState(false);

  const lineQtyRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});
  const focusLineQty = useCallback(
    (lineKey: string) => {
      requestAnimationFrame(() => {
        const el = lineQtyRefs.current[lineKey];
        el?.focus();
        el?.select?.();
      });
    },
    []
  );

  const products = useMemo(
    () => productPage?.items ?? [],
    [productPage?.items]
  );

  const productsById = useMemo(
    () =>
      new Map(products.map((x) => [x.id, x])),
    [products]
  );

  // Şu anki satırlardan optimal depo seçimi — reservations sorgusunu da bu key'le hook'larız.
  const chosenWarehouseId = useMemo(
    () => chooseWarehouseId(lines, productsById),
    [lines, productsById],
  );

  // Rezervasyonlar (PREPARING + ON_THE_WAY sevkiyatlardan): productId → reserved qty.
  // Effective stock = product.byWarehouse[chosen].quantity - reservations[productId]
  const { data: reservations } = useWarehouseReservations(
    chosenWarehouseId > 0 ? chosenWarehouseId : null,
  );

  function effectiveAvailableForLine(productId: number): {
    rawStock: number;
    reserved: number;
    effective: number;
  } {
    const product = productsById.get(productId);
    const rawStock = product
      ? Number(
          product.byWarehouse?.find((w) => Number(w.warehouseId) === chosenWarehouseId)
            ?.quantity ?? 0,
        ) || 0
      : 0;
    const reserved = reservations?.[productId] ?? 0;
    const effective = Math.max(0, rawStock - reserved);
    return { rawStock, reserved, effective };
  }

  // Stok entegrasyonu: herhangi bir satırda kullanıcı EFEKTİF stoktan fazla istediyse
  // (mevcut - rezerve) veya hiç stoğu olmayan ürün seçtiyse submit'i blokla.
  const hasStockError = useMemo(() => {
    return lines.some((line) => {
      const productId = Number(line.productId);
      if (!Number.isFinite(productId) || productId <= 0) return false;
      const product = productsById.get(productId);
      if (!product) return false;
      if (Number(product.totalQuantity ?? 0) === 0) return true;
      const { effective } = effectiveAvailableForLine(productId);
      const requested = Number(line.quantity) || 0;
      return requested > 0 && requested > effective;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, productsById, reservations]);

  const branchOptions = useMemo(
    () =>
      creatableBranches.map((x) => ({
        value: String(x.id),
        title: x.name,
      })),
    [creatableBranches]
  );

  const productOptions =
    useMemo((): RichComboboxOption[] => {
      return products.map((product) => {
        const unit = product.unit?.trim();

        const total = formatLocaleAmount(
          Number(product.totalQuantity) || 0,
          locale
        );

        const stockText = replaceVars(
          t(
            "shipments.create.productTotalStock"
          ),
          {
            quantity: unit
              ? `${total} ${unit}`
              : total,
          }
        );

        const warehouses =
          warehouseSummary(product);

        const warehouseText =
          warehouses.length
            ? warehouses
                .map(
                  (x) =>
                    `${x.warehouseName}: ${formatLocaleAmount(
                      x.quantity,
                      locale
                    )}${
                      unit ? ` ${unit}` : ""
                    }`
                )
                .join(" · ")
            : t(
                "shipments.create.noWarehouseStock"
              );

        return {
          value: String(product.id),

          title: productTitle(product),

          description:
            product.categoryName ??
            (unit
              ? replaceVars(
                  t(
                    "shipments.create.unit"
                  ),
                  { unit }
                )
              : undefined),

          detail: `${stockText} · ${warehouseText}`,
        };
      });
    }, [locale, products, t]);

  const effectiveBranchId =
    branchId ||
    (creatableBranches.length > 0
      ? String(creatableBranches[0].id)
      : "");

  const normalizedLines = useMemo(
    () =>
      lines
        .map((line) => ({
          productId: Number(line.productId),

          requestedQuantity: Number(
            line.quantity
          ),
        }))
        .filter(
          (line) =>
            Number.isFinite(line.productId) &&
            line.productId > 0 &&
            Number.isFinite(
              line.requestedQuantity
            ) &&
            line.requestedQuantity > 0
        ),
    [lines]
  );

  const selectedWarehouseId = useMemo(
    () =>
      chooseWarehouseId(
        lines,
        productsById
      ),
    [lines, productsById]
  );

  const canSubmit =
    Boolean(effectiveBranchId) &&
    normalizedLines.length > 0;

  const showLineError =
    submitted &&
    normalizedLines.length === 0;

  const updateLine = (
    key: string,
    patch: Partial<DraftLine>
  ) => {
    setLines((prev) =>
      prev.map((line) =>
        line.key === key
          ? { ...line, ...patch }
          : line
      )
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${prev.length}`,
        productId: "",
        quantity: "",
      },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter(
            (line) => line.key !== key
          )
    );
  };

  if (isReady && !canCreate) {
    return (
      <div className={SCREEN_CLASS_NAME}>
        <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-amber-900">
            {t("shipments.create.noPermissionTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            {t("shipments.create.noPermissionHint")}
          </p>
          <div className="mt-5">
            <Button type="button" variant="secondary" onClick={() => router.push("/shipments")}>
              {t("shipments.create.noPermissionBack")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={SCREEN_CLASS_NAME}>
      <div className={HERO_CARD_CLASS_NAME}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {t("shipments.create.eyebrow")}
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              {t("shipments.create.title")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              {t(
                "shipments.create.subtitle"
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 sm:text-right">
            {replaceVars(
              t(
                "shipments.create.linesCount"
              ),
              {
                count:
                  normalizedLines.length,
              }
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 xl:p-7">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 sm:text-lg">
              {t(
                "shipments.create.branchSection"
              )}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {t(
                "shipments.create.branchHint"
              )}
            </p>
          </div>

          {creatableBranches.length <= 1 ? (
            <Input
              name="branchName"
              label={t(
                "shipments.create.branchLabel"
              )}
              value={
                branchesPending
                  ? t("common.loading")
                  : creatableBranches[0]
                      ?.name ?? ""
              }
              readOnly
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">
                {t(
                  "shipments.create.branchLabel"
                )}
              </label>

              <RichCombobox
                value={effectiveBranchId}
                onChange={(next) =>
                  setBranchId(next)
                }
                options={branchOptions}
                placeholder={t(
                  "shipments.create.selectBranch"
                )}
                searchPlaceholder={t(
                  "shipments.create.searchBranch"
                )}
                emptyText={
                  branchesPending
                    ? t("common.loading")
                    : t(
                        "shipments.create.noBranch"
                      )
                }
                disabled={branchesPending}
              />
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-950 shadow-sm sm:p-5 xl:row-span-2 xl:p-6">
          <h2 className="font-semibold">
            {t("shipments.create.summaryTitle")}
          </h2>

          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-indigo-800/75">
                {t("shipments.create.summaryBranch")}
              </dt>
              <dd className="truncate font-semibold">
                {creatableBranches.find(
                  (x) => String(x.id) === effectiveBranchId
                )?.name ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-indigo-800/75">
                {t("shipments.create.summaryLines")}
              </dt>
              <dd className="font-semibold">{normalizedLines.length}</dd>
            </div>
          </dl>

          <SummaryLineItems
            lines={lines}
            productsById={productsById}
            locale={locale}
            t={t}
          />

          <SummaryParentTotals
            lines={lines}
            productsById={productsById}
            locale={locale}
            t={t}
          />

          <p className="mt-5 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-indigo-900/80">
            {t("shipments.create.autoWarehouseHint")}
          </p>
        </aside>

        <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 xl:p-7">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 sm:text-lg">
              {t("shipments.create.productsSection")}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {t("shipments.create.productsHint")}
            </p>
          </div>

          {showLineError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t(
                "shipments.create.productRequired"
              )}
            </div>
          ) : null}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const product =
                productsById.get(
                  Number(line.productId)
                );

              const unit =
                product?.unit?.trim();

              // Efektif stok = depodaki ham stok - başka onaylı sevkiyatlarda rezerve.
              // chosenWarehouseId tüm satırlardan en optimal depoyu döner; rezervasyonlar
              // useWarehouseReservations ile bu deponun productId→reserved haritası.
              const productIdNum = Number(line.productId);
              const stockInfo = product
                ? effectiveAvailableForLine(productIdNum)
                : { rawStock: 0, reserved: 0, effective: 0 };
              const availableInChosen = stockInfo.effective;
              const requestedNum = Number(line.quantity) || 0;
              const overRequest =
                product && requestedNum > 0 && requestedNum > availableInChosen;
              const zeroStockEverywhere =
                product && Number(product.totalQuantity ?? 0) === 0;
              // "Rezerve nedeniyle azaldı" görsel ipucu — ham stok > 0 ama efektif < ham.
              const reducedByReservation =
                product && stockInfo.reserved > 0 && stockInfo.rawStock > 0;

              return (
                <div
                  key={line.key}
                  className={cn(
                    "rounded-2xl border bg-zinc-50/70 p-3 sm:p-4 xl:p-5 transition-colors",
                    showLineError
                      ? "border-red-200"
                      : overRequest || zeroStockEverywhere
                        ? "border-red-300 bg-red-50/40"
                        : "border-zinc-200",
                  )}
                >
                  {/* Üç sütun: ürün + miktar + sil. lg+: label'lar üstte hizalı (items-start),
                      Combobox / Input / Sil butonu altta sabit yükseklikte. Delete button'un üstüne
                      görünmez label spacer konularak labels satırında boşluk bırakılır. */}
                  <div className="grid gap-3 lg:grid-cols-[minmax(20rem,1fr)_12rem_2.75rem] lg:items-start 2xl:grid-cols-[minmax(28rem,1fr)_14rem_2.75rem]">
                    <div className="flex min-w-0 flex-col gap-1">
                      <label className="text-sm font-medium text-zinc-700">
                        {replaceVars(
                          t(
                            "shipments.create.productLineLabel"
                          ),
                          {
                            index: index + 1,
                          }
                        )}
                      </label>

                      <RichCombobox
                        value={line.productId}
                        onChange={(value) =>
                          updateLine(
                            line.key,
                            {
                              productId:
                                value,
                            }
                          )
                        }
                        options={
                          productOptions
                        }
                        placeholder={t(
                          "shipments.create.selectProduct"
                        )}
                        searchPlaceholder={t(
                          "products.catalogSearchPlaceholder"
                        )}
                        emptyText={
                          productsPending
                            ? t(
                                "common.loading"
                              )
                            : t(
                                "shipments.create.noProduct"
                              )
                        }
                        disabled={
                          productsPending
                        }
                        onAfterCommit={() => focusLineQty(line.key)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Input
                        ref={(node) => {
                          lineQtyRefs.current[line.key] = node;
                        }}
                        name={`quantity-${line.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        // Stok entegrasyonu: input max'i seçilen depodaki mevcut miktarla sınırlı.
                        // Native HTML max + JS validation birlikte çalışır (mobile keyboards step uyar).
                        max={product ? availableInChosen : undefined}
                        inputMode="decimal"
                        label={t("shipments.create.quantityLabel")}
                        className="md:h-11"
                        placeholder="0"
                        value={line.quantity}
                        disabled={Boolean(zeroStockEverywhere)}
                        error={
                          overRequest
                            ? replaceVars(t("shipments.create.qtyExceedsStock"), {
                                available: formatLocaleAmount(availableInChosen, locale),
                              })
                            : undefined
                        }
                        onChange={(e) =>
                          updateLine(line.key, { quantity: e.target.value })
                        }
                      />
                      {product ? (
                        <div className="space-y-0.5">
                          <p
                            className={cn(
                              "text-[11px] tabular-nums",
                              zeroStockEverywhere
                                ? "font-semibold text-red-700"
                                : overRequest
                                  ? "font-medium text-red-700"
                                  : availableInChosen <= 0
                                    ? "text-amber-700"
                                    : "text-zinc-600",
                            )}
                          >
                            {zeroStockEverywhere
                              ? t("shipments.create.zeroStockEverywhere")
                              : availableInChosen <= 0
                                ? t("shipments.create.zeroStockHere")
                                : replaceVars(
                                    t("shipments.create.availableInWarehouse"),
                                    {
                                      quantity: `${formatLocaleAmount(availableInChosen, locale)}${unit ? ` ${unit}` : ""}`,
                                    },
                                  )}
                          </p>
                          {/* Rezervasyon detayı — kullanıcıya neden düştüğünü açıklar */}
                          {reducedByReservation ? (
                            <p className="text-[10px] tabular-nums text-amber-700">
                              {replaceVars(
                                t("shipments.create.reservationDetail"),
                                {
                                  rawStock: `${formatLocaleAmount(stockInfo.rawStock, locale)}${unit ? ` ${unit}` : ""}`,
                                  reserved: `${formatLocaleAmount(stockInfo.reserved, locale)}${unit ? ` ${unit}` : ""}`,
                                },
                              )}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* lg+: ürün ve miktar label'larıyla aynı satırda kalmak için görünmez label spacer */}
                    <div className="flex flex-col gap-1">
                      <span
                        className="hidden select-none text-sm font-medium lg:block lg:opacity-0"
                        aria-hidden
                      >
                        &nbsp;
                      </span>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-40 lg:w-11"
                      onClick={() =>
                        removeLine(
                          line.key
                        )
                      }
                      disabled={
                        lines.length <= 1
                      }
                      aria-label={t(
                        "common.remove"
                      )}
                    >
                      <Trash2
                        className="h-4 w-4"
                        aria-hidden
                      />

                      <span className="lg:sr-only">
                        {t(
                          "common.remove"
                        )}
                      </span>
                      </button>
                    </div>
                  </div>

                  {product ? (
                    <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-2 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <span className="font-medium text-zinc-800">
                          {t(
                            "shipments.create.availableTotal"
                          )}
                          :
                        </span>{" "}
                        {formatLocaleAmount(
                          Number(
                            product.totalQuantity
                          ) || 0,
                          locale
                        )}
                        {unit
                          ? ` ${unit}`
                          : ""}
                      </div>

                      <div className="rounded-xl bg-white px-3 py-2">
                        <span className="font-medium text-zinc-800">
                          {t(
                            "shipments.create.topStocks"
                          )}
                          :
                        </span>{" "}
                        {warehouseSummary(
                          product
                        ).length
                          ? warehouseSummary(
                              product
                            )
                              .map(
                                (x) =>
                                  `${x.warehouseName} ${formatLocaleAmount(
                                    x.quantity,
                                    locale
                                  )}${
                                    unit
                                      ? ` ${unit}`
                                      : ""
                                  }`
                              )
                              .join(
                                " · "
                              )
                          : t(
                              "shipments.create.noWarehouseStock"
                            )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {/* Ürün ekle: satırların hemen altında, tam genişlikte modern "dashed add-row".
                Yeni satır burada belirir; kullanıcı yukarı kaydırmadan ekleme yapar. */}
            <button
              type="button"
              onClick={addLine}
              className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/40 px-4 py-3 text-sm font-semibold text-zinc-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Plus
                className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                aria-hidden
              />
              <span>{t("shipments.create.addProduct")}</span>
            </button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-2 z-10 rounded-3xl border border-zinc-200 bg-white/95 p-3 shadow-xl shadow-zinc-900/10 backdrop-blur sm:static sm:shadow-sm xl:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(
                "/shipments"
              )
            }
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            onClick={async () => {
              setSubmitted(true);

              if (!canSubmit) return;

              try {
                const created =
                  await createDraft.mutateAsync(
                    {
                      branchId: Number(
                        effectiveBranchId
                      ),

                      warehouseId:
                        selectedWarehouseId,

                      priority: "NORMAL",

                      items:
                        normalizedLines,
                    }
                  );

                router.push(
                  `/shipments/${created.id}`
                );
              } catch (e) {
                // Backend iş kuralı/yetki hataları (ör. shipment.create eksikse 403) sessiz
                // kalmamalı — kullanıcıya backend mesajını göster.
                notify.error(toErrorMessage(e));
              }
            }}
            disabled={
              createDraft.isPending ||
              branchesPending ||
              productsPending ||
              !effectiveBranchId ||
              hasStockError
            }
          >
            {createDraft.isPending
              ? t(
                  "shipments.create.savingDraft"
                )
              : t(
                  "shipments.create.saveDraft"
                )}
          </Button>
        </div>
      </div>
    </div>
  );
}