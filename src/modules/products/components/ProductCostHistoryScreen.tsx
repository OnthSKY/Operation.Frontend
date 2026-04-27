"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import {
  useCreateProductCostEntry,
  useDeleteProductCostEntry,
  useProductCostHistory,
  useUpdateProductCostEntry,
} from "@/modules/products/hooks/useProductCostQueries";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_LINK } from "@/shared/components/TableToolbar";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphArrowLeft } from "@/shared/ui/ToolbarGlyph";

function parseNum(raw: string): number {
  return Number.parseFloat(raw.replace(",", "."));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ProductCostHistoryScreen() {
  const { t, locale } = useI18n();
  const { data: catalog = [], isPending: isCatalogPending } = useProductsCatalog();
  const createEntry = useCreateProductCostEntry();
  const updateEntry = useUpdateProductCostEntry();
  const deleteEntry = useDeleteProductCostEntry();

  const [filterProductId, setFilterProductId] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productId, setProductId] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [unit, setUnit] = useState("");
  const [currencyCode, setCurrencyCode] = useState("TRY");
  const [vatRate, setVatRate] = useState("20");
  const [unitCostExVat, setUnitCostExVat] = useState("");
  const [unitCostIncVat, setUnitCostIncVat] = useState("");
  const [note, setNote] = useState("");
  const [lastEditedCostField, setLastEditedCostField] = useState<"ex" | "inc" | null>(null);

  const params = useMemo(
    () => ({
      productId: filterProductId > 0 ? filterProductId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [filterProductId, dateFrom, dateTo]
  );

  const { data: rows = [], isPending, isError, error, refetch } = useProductCostHistory(
    params,
    true
  );

  const productOptions = useMemo(
    () => [
      { value: "0", label: t("products.costHistory.selectProduct") },
      ...catalog.map((p) => {
        const category = p.categoryName?.trim();
        const unitLabel = p.unit?.trim() || "—";
        const unitText = t("products.costHistory.productUnitShort").replace("{{unit}}", unitLabel);
        const details = [category, unitText]
          .filter(Boolean)
          .join(" | ");
        return {
          value: String(p.id),
          label: `${p.name} (#${p.id})${details ? ` - ${details}` : ""}`,
        };
      }),
    ],
    [catalog, t]
  );

  const currencyOptions = useMemo(
    () => [
      { value: "TRY", label: "TRY" },
      { value: "USD", label: "USD" },
      { value: "EUR", label: "EUR" },
      { value: "GBP", label: "GBP" },
    ],
    []
  );

  useEffect(() => {
    const selected = catalog.find((p) => p.id === productId);
    if (!selected) return;
    const nextUnit = selected.unit?.trim() || "";
    setUnit(nextUnit);
  }, [catalog, productId]);

  const handleExVatBlur = () => {
    const ex = parseNum(unitCostExVat);
    const rate = parseNum(vatRate);
    if (!Number.isFinite(ex) || !Number.isFinite(rate)) return;
    setUnitCostIncVat(((ex * (100 + rate)) / 100).toFixed(2));
  };

  const handleIncVatBlur = () => {
    const inc = parseNum(unitCostIncVat);
    const rate = parseNum(vatRate);
    if (!Number.isFinite(inc) || !Number.isFinite(rate) || rate <= -100) return;
    setUnitCostExVat(((inc * 100) / (100 + rate)).toFixed(2));
  };

  useEffect(() => {
    const rate = parseNum(vatRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return;
    if (lastEditedCostField === "ex") {
      const ex = parseNum(unitCostExVat);
      if (!Number.isFinite(ex)) return;
      setUnitCostIncVat(((ex * (100 + rate)) / 100).toFixed(2));
      return;
    }
    if (lastEditedCostField === "inc") {
      const inc = parseNum(unitCostIncVat);
      if (!Number.isFinite(inc) || rate <= -100) return;
      setUnitCostExVat(((inc * 100) / (100 + rate)).toFixed(2));
    }
  }, [vatRate, lastEditedCostField]);

  const onCreate = async () => {
    const ex = parseNum(unitCostExVat);
    const inc = parseNum(unitCostIncVat);
    const rate = parseNum(vatRate);
    if (productId <= 0 || !effectiveDate || !unit.trim() || !currencyCode.trim() || !Number.isFinite(ex) || !Number.isFinite(inc)) {
      notify.error(t("products.costHistory.validationRequired"));
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      notify.error(t("products.costHistory.validationVat"));
      return;
    }
    try {
      await createEntry.mutateAsync({
        productId,
        effectiveDate,
        unit: unit.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
        vatRate: rate,
        unitCostExcludingVat: ex,
        unitCostIncludingVat: inc,
        note: note.trim() || null,
      });
      notify.success(t("products.costHistory.createSuccess"));
      setUnitCostExVat("");
      setUnitCostIncVat("");
      setNote("");
      setAddDialogOpen(false);
      void refetch();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onEditOpen = (rowId: number) => {
    const row = rows.find((x) => x.id === rowId);
    if (!row) return;
    setEditingId(row.id);
    setProductId(row.productId);
    setEffectiveDate(row.effectiveDate);
    setUnit(row.unit);
    setCurrencyCode(row.currencyCode);
    setVatRate(String(row.vatRate));
    setUnitCostExVat(String(row.unitCostExcludingVat));
    setUnitCostIncVat(String(row.unitCostIncludingVat));
    setNote(row.note ?? "");
    setLastEditedCostField(null);
    setEditDialogOpen(true);
  };

  const onUpdate = async () => {
    const id = editingId ?? 0;
    const ex = parseNum(unitCostExVat);
    const inc = parseNum(unitCostIncVat);
    const rate = parseNum(vatRate);
    if (id <= 0 || !effectiveDate || !unit.trim() || !currencyCode.trim() || !Number.isFinite(ex) || !Number.isFinite(inc)) {
      notify.error(t("products.costHistory.validationRequired"));
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      notify.error(t("products.costHistory.validationVat"));
      return;
    }
    try {
      await updateEntry.mutateAsync({
        id,
        effectiveDate,
        unit: unit.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
        vatRate: rate,
        unitCostExcludingVat: ex,
        unitCostIncludingVat: inc,
        note: note.trim() || null,
      });
      notify.success(t("products.costHistory.updateSuccess"));
      setEditDialogOpen(false);
      setEditingId(null);
      void refetch();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm(t("products.costHistory.deleteConfirm"))) return;
    try {
      await deleteEntry.mutateAsync(id);
      notify.success(t("products.costHistory.deleteSuccess"));
      void refetch();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const resetFilters = () => {
    setFilterProductId(0);
    setDateFrom("");
    setDateTo("");
  };

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-6 sm:pb-4"
        intro={
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
              {t("products.costHistory.title")}
            </h1>
            <p className="text-sm text-zinc-500">{t("products.costHistory.subtitle")}</p>
          </div>
        }
        main={
          <div className="flex flex-col gap-4">
            <Card title={t("products.costHistory.tableTitle")}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <Tooltip content={t("products.categoriesPage.backToProducts")} delayMs={200}>
                  <Link
                    href="/products"
                    className={TABLE_TOOLBAR_ICON_LINK}
                    aria-label={t("products.categoriesPage.backToProducts")}
                  >
                    <ToolbarGlyphArrowLeft className="h-5 w-5" />
                  </Link>
                </Tooltip>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setFilterOpen(true)}>
                    <span aria-hidden className="mr-1.5 inline-flex">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
                      </svg>
                    </span>
                    {t("products.costHistory.filterButton")}
                  </Button>
                  <Button type="button" onClick={() => setAddDialogOpen(true)}>
                    {t("products.costHistory.newEntry")}
                  </Button>
                </div>
              </div>

              {isError ? (
                <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
              ) : isPending ? (
                <p className="text-sm text-zinc-500">{t("common.loading")}</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-zinc-600">{t("products.costHistory.empty")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-4 md:hidden">
                    {rows.map((r) => (
                      <MobileListCard
                        key={r.id}
                        as="div"
                        className="flex flex-col gap-1 shadow-zinc-900/5"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {r.effectiveDate}
                        </p>
                        <p className="truncate text-sm font-semibold text-zinc-900">{r.productName}</p>
                        <p className="mt-1 text-sm text-zinc-700">
                          {t("products.costHistory.unitCostExVatLabel")}:{" "}
                          {formatLocaleAmount(r.unitCostExcludingVat, locale, r.currencyCode)}
                        </p>
                        <p className="text-sm text-zinc-700">
                          {t("products.costHistory.unitCostIncVatLabel")}:{" "}
                          {formatLocaleAmount(r.unitCostIncludingVat, locale, r.currencyCode)}
                        </p>
                        <p className="text-sm text-zinc-700">{t("products.costHistory.unitLabel")}: {r.unit}</p>
                        <p className="text-sm text-zinc-700">
                          {t("products.costHistory.vatRateShort")}: %{r.vatRate}
                        </p>
                        <p className="mt-1 break-words text-xs text-zinc-500">{r.note?.trim() || "—"}</p>
                        <div className="mt-2 flex justify-end gap-2">
                          <Button type="button" variant="secondary" onClick={() => onEditOpen(r.id)}>
                            {t("common.edit")}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => void onDelete(r.id)}>
                            {t("common.delete")}
                          </Button>
                        </div>
                      </MobileListCard>
                    ))}
                  </div>

                  <div className="-mx-1 hidden overflow-x-auto md:block">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>{t("products.costHistory.colDate")}</TableHeader>
                          <TableHeader>{t("products.costHistory.colProduct")}</TableHeader>
                          <TableHeader>{t("products.costHistory.colUnit")}</TableHeader>
                          <TableHeader>{t("products.costHistory.colCurrency")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colExVat")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colIncVat")}</TableHeader>
                          <TableHeader className="text-right">{t("products.costHistory.colVatRate")}</TableHeader>
                          <TableHeader>{t("products.costHistory.colNote")}</TableHeader>
                          <TableHeader className="text-right">{t("common.actions")}</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.effectiveDate}</TableCell>
                            <TableCell>{r.productName}</TableCell>
                            <TableCell>{r.unit}</TableCell>
                            <TableCell>{r.currencyCode}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLocaleAmount(r.unitCostExcludingVat, locale, r.currencyCode)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLocaleAmount(r.unitCostIncludingVat, locale, r.currencyCode)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">%{r.vatRate}</TableCell>
                            <TableCell>{r.note?.trim() || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button type="button" size="sm" variant="secondary" onClick={() => onEditOpen(r.id)}>
                                  {t("common.edit")}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(r.id)}>
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </Card>
          </div>
        }
      />

      <Modal
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        titleId="product-cost-edit-modal"
        title={t("products.costHistory.editFormTitle")}
        description={t("products.costHistory.subtitle")}
        closeButtonLabel={t("common.close")}
      >
        <div className="space-y-3 px-4 pb-4 pt-1 sm:px-6 sm:pb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              name="productReadonly"
              label={t("products.costHistory.productLabel")}
              value={productOptions.find((opt) => opt.value === String(productId))?.label || ""}
              readOnly
            />
            <DateField
              name="effectiveDateEdit"
              label={t("products.costHistory.effectiveDateLabel")}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
            <Input
              name="unitEdit"
              label={t("products.costHistory.unitLabel")}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={20}
            />
            <Select
              name="currencyCodeEdit"
              label={t("products.costHistory.currencyLabel")}
              value={currencyCode}
              options={currencyOptions}
              onBlur={() => undefined}
              onChange={(e) => setCurrencyCode((e.target.value || "TRY").toUpperCase())}
            />
            <Input
              name="vatRateEdit"
              label={t("products.costHistory.vatRateLabel")}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
            <Input
              name="noteEdit"
              label={t("products.costHistory.noteLabel")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={250}
            />
            <Input
              name="unitCostExVatEdit"
              label={t("products.costHistory.unitCostExVatLabel")}
              type="number"
              min={0}
              step="0.01"
              value={unitCostExVat}
              onChange={(e) => {
                const next = e.target.value;
                setLastEditedCostField("ex");
                setUnitCostExVat(next);
                const ex = parseNum(next);
                const rate = parseNum(vatRate);
                if (!Number.isFinite(ex) || !Number.isFinite(rate) || rate < 0 || rate > 100) return;
                setUnitCostIncVat(((ex * (100 + rate)) / 100).toFixed(2));
              }}
              onBlur={handleExVatBlur}
            />
            <Input
              name="unitCostIncVatEdit"
              label={t("products.costHistory.unitCostIncVatLabel")}
              type="number"
              min={0}
              step="0.01"
              value={unitCostIncVat}
              onChange={(e) => {
                const next = e.target.value;
                setLastEditedCostField("inc");
                setUnitCostIncVat(next);
                const inc = parseNum(next);
                const rate = parseNum(vatRate);
                if (!Number.isFinite(inc) || !Number.isFinite(rate) || rate < 0 || rate > 100) return;
                setUnitCostExVat(((inc * 100) / (100 + rate)).toFixed(2));
              }}
              onBlur={handleIncVatBlur}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void onUpdate()} disabled={updateEntry.isPending}>
              {updateEntry.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        titleId="product-cost-add-modal"
        title={t("products.costHistory.formTitle")}
        description={t("products.costHistory.subtitle")}
        closeButtonLabel={t("common.close")}
      >
        <div className="space-y-3 px-4 pb-4 pt-1 sm:px-6 sm:pb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              name="productId"
              label={t("products.costHistory.productLabel")}
              value={String(productId)}
              options={productOptions}
              className="rounded-xl border-zinc-200/80 bg-zinc-50/50 shadow-sm hover:border-zinc-300 hover:bg-white"
              disabled={isCatalogPending}
              onBlur={() => undefined}
              onChange={(e) => setProductId(Number.parseInt(e.target.value, 10) || 0)}
            />
            <DateField
              name="effectiveDate"
              label={t("products.costHistory.effectiveDateLabel")}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
            <Input
              name="unit"
              label={t("products.costHistory.unitLabel")}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={20}
            />
            <Select
              name="currencyCode"
              label={t("products.costHistory.currencyLabel")}
              value={currencyCode}
              options={currencyOptions}
              onBlur={() => undefined}
              onChange={(e) => setCurrencyCode((e.target.value || "TRY").toUpperCase())}
            />
            <Input
              name="vatRate"
              label={t("products.costHistory.vatRateLabel")}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
            <Input
              name="note"
              label={t("products.costHistory.noteLabel")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={250}
            />
            <Input
              name="unitCostExVat"
              label={t("products.costHistory.unitCostExVatLabel")}
              type="number"
              min={0}
              step="0.01"
              value={unitCostExVat}
              onChange={(e) => {
                const next = e.target.value;
                setLastEditedCostField("ex");
                setUnitCostExVat(next);
                const ex = parseNum(next);
                const rate = parseNum(vatRate);
                if (!Number.isFinite(ex) || !Number.isFinite(rate) || rate < 0 || rate > 100) return;
                setUnitCostIncVat(((ex * (100 + rate)) / 100).toFixed(2));
              }}
              onBlur={handleExVatBlur}
            />
            <Input
              name="unitCostIncVat"
              label={t("products.costHistory.unitCostIncVatLabel")}
              type="number"
              min={0}
              step="0.01"
              value={unitCostIncVat}
              onChange={(e) => {
                const next = e.target.value;
                setLastEditedCostField("inc");
                setUnitCostIncVat(next);
                const inc = parseNum(next);
                const rate = parseNum(vatRate);
                if (!Number.isFinite(inc) || !Number.isFinite(rate) || rate < 0 || rate > 100) return;
                setUnitCostExVat(((inc * 100) / (100 + rate)).toFixed(2));
              }}
              onBlur={handleIncVatBlur}
            />
          </div>
          <p className="text-xs text-zinc-500">{t("products.costHistory.autoCalcHint")}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={createEntry.isPending}>
              {createEntry.isPending ? t("common.saving") : t("products.costHistory.addCost")}
            </Button>
          </div>
        </div>
      </Modal>

      {filterOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/25"
            aria-label={t("common.close")}
            onClick={() => setFilterOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-zinc-200 bg-white p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">{t("products.costHistory.filterTitle")}</h2>
              <Button type="button" variant="secondary" onClick={() => setFilterOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              <Select
                name="filterProductId"
                label={t("products.costHistory.productLabel")}
                value={String(filterProductId)}
                options={productOptions}
                disabled={isCatalogPending}
                onBlur={() => undefined}
                onChange={(e) => setFilterProductId(Number.parseInt(e.target.value, 10) || 0)}
              />
              <DateField
                name="dateFrom"
                label={t("products.costHistory.dateFromLabel")}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <DateField
                name="dateTo"
                label={t("products.costHistory.dateToLabel")}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetFilters}>
                {t("products.costHistory.clearFilters")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void refetch();
                  setFilterOpen(false);
                }}
              >
                {t("products.costHistory.applyFilters")}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
