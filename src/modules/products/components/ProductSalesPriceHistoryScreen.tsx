"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { fetchSalesPriceHistory, type SalesPriceHistoryRow } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { Card } from "@/shared/components/Card";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN, TABLE_TOOLBAR_ICON_LINK, TableToolbarSplit } from "@/shared/components/TableToolbar";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { TablePagination } from "@/shared/ui/TablePagination";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { ToolbarGlyphArrowLeft } from "@/shared/ui/ToolbarGlyph";
import { Tooltip } from "@/shared/ui/Tooltip";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CounterpartyScope = "all" | "branches_all" | "branch_one" | "customers_all";

const DRAWER_SELECT_Z = 280;

function rowMatchesTableSearch(
  r: SalesPriceHistoryRow,
  qLower: string,
  typeBranchLabel: string,
  typeCustomerLabel: string
): boolean {
  if (!qLower) return true;
  const blob = [
    r.productName,
    r.counterpartyName,
    r.currencyCode,
    (r.unit ?? "").trim(),
    r.counterpartyType === "branch" ? typeBranchLabel : typeCustomerLabel,
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(qLower);
}

export function ProductSalesPriceHistoryScreen() {
  const { t, locale } = useI18n();
  const { data: catalog = [], isPending: catalogPending } = useProductsCatalog();
  const { data: branches = [] } = useBranchesList();

  const [counterpartyScope, setCounterpartyScope] = useState<CounterpartyScope>("all");
  const [branchId, setBranchId] = useState(0);
  const [productId, setProductId] = useState(0);
  const [currencyCode, setCurrencyCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [pageIndex, setPageIndex] = useState(0);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const [rows, setRows] = useState<SalesPriceHistoryRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: t("products.salesPriceHistory.scopeAll") },
      { value: "branches_all", label: t("products.salesPriceHistory.scopeBranchesAll") },
      { value: "branch_one", label: t("products.salesPriceHistory.scopeBranchOne") },
      { value: "customers_all", label: t("products.salesPriceHistory.scopeCustomersAll") },
    ],
    [t]
  );

  const productOptions = useMemo(
    () => [
      { value: "0", label: t("products.salesPriceHistory.anyProduct") },
      ...catalog.map((p) => ({
        value: String(p.id),
        label: `${p.name} (#${p.id})`,
      })),
    ],
    [catalog, t]
  );

  const branchOptions = useMemo(
    () => [
      { value: "0", label: t("products.salesPriceHistory.selectBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const pageSizeOptions = useMemo(
    () => [
      { value: "25", label: "25" },
      { value: "50", label: "50" },
      { value: "100", label: "100" },
    ],
    []
  );

  const currencyOptions = useMemo(
    () => [
      { value: "", label: t("products.salesPriceHistory.anyCurrency") },
      { value: "TRY", label: "TRY" },
      { value: "USD", label: "USD" },
      { value: "EUR", label: "EUR" },
      { value: "GBP", label: "GBP" },
    ],
    [t]
  );

  const load = useCallback(async () => {
    if (counterpartyScope === "branch_one" && branchId <= 0) {
      setRows([]);
      setTotalCount(0);
      return;
    }
    let counterpartyType: "branch" | "customer" | "" = "";
    let counterpartyId: number | null = null;
    if (counterpartyScope === "branches_all") counterpartyType = "branch";
    else if (counterpartyScope === "customers_all") counterpartyType = "customer";
    else if (counterpartyScope === "branch_one") {
      counterpartyType = "branch";
      counterpartyId = branchId;
    }

    setBusy(true);
    try {
      const page = await fetchSalesPriceHistory({
        productId: productId > 0 ? productId : null,
        counterpartyType,
        counterpartyId,
        currencyCode: currencyCode.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
      });
      setRows(page.items);
      setTotalCount(page.totalCount);
    } catch (e) {
      notify.error(toErrorMessage(e));
      setRows([]);
      setTotalCount(0);
    } finally {
      setBusy(false);
    }
  }, [
    branchId,
    counterpartyScope,
    currencyCode,
    dateFrom,
    dateTo,
    pageIndex,
    pageSize,
    productId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (totalCount <= 0) return;
    const maxIdx = Math.max(0, Math.ceil(totalCount / pageSize) - 1);
    if (pageIndex > maxIdx) setPageIndex(maxIdx);
  }, [totalCount, pageSize, pageIndex]);

  const onScopeChange = (value: string) => {
    setCounterpartyScope(value as CounterpartyScope);
    setPageIndex(0);
    if (value !== "branch_one") setBranchId(0);
  };

  const counterpartyTypeLabel = (type: string) =>
    type === "branch" ? t("products.salesPriceHistory.typeBranch") : t("products.salesPriceHistory.typeCustomer");

  const typeBranchLabel = t("products.salesPriceHistory.typeBranch");
  const typeCustomerLabel = t("products.salesPriceHistory.typeCustomer");

  const filtersActive = useMemo(() => {
    return (
      counterpartyScope !== "all" ||
      branchId > 0 ||
      productId > 0 ||
      currencyCode.trim() !== "" ||
      dateFrom.trim() !== "" ||
      dateTo.trim() !== "" ||
      pageSize !== 50
    );
  }, [branchId, counterpartyScope, currencyCode, dateFrom, dateTo, pageSize, productId]);

  const displayRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => rowMatchesTableSearch(r, q, typeBranchLabel, typeCustomerLabel));
  }, [rows, tableSearch, typeBranchLabel, typeCustomerLabel]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const pageNumShown = totalCount === 0 ? 0 : Math.min(pageIndex + 1, totalPages);

  return (
    <PageScreenScaffold
      className="w-full p-4 pb-6 sm:pb-4"
      intro={
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {t("products.salesPriceHistory.title")}
          </h1>
          <p className="text-sm text-zinc-500">{t("products.salesPriceHistory.subtitle")}</p>
        </div>
      }
      main={
        <div className="flex flex-col gap-4">
          <Card
            title={t("products.salesPriceHistory.tableTitle")}
            headerActions={
              <Tooltip content={t("products.salesPriceHistory.filtersTitle")} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(TABLE_TOOLBAR_ICON_BTN, "relative")}
                  onClick={() => setFiltersDrawerOpen(true)}
                  aria-label={t("products.salesPriceHistory.filterIconAria")}
                >
                  <FilterFunnelIcon className="h-5 w-5" />
                  {filtersActive ? (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </Button>
              </Tooltip>
            }
          >
            <TableToolbarSplit
              lead={
                <Input
                  name="salesPhTableSearch"
                  type="search"
                  placeholder={t("products.salesPriceHistory.tableSearchPlaceholder")}
                  autoComplete="off"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  aria-label={t("products.salesPriceHistory.tableSearchPlaceholder")}
                  className="min-w-0"
                />
              }
              trailing={
                <>
                  <Tooltip content={t("products.categoriesPage.backToProducts")} delayMs={200}>
                    <Link
                      href="/products"
                      className={TABLE_TOOLBAR_ICON_LINK}
                      aria-label={t("products.categoriesPage.backToProducts")}
                    >
                      <ToolbarGlyphArrowLeft className="h-5 w-5" />
                    </Link>
                  </Tooltip>
                  <p className="text-sm text-zinc-600">
                    {t("products.pagingTotal")}{" "}
                    <span className="font-medium text-zinc-900">{totalCount}</span>
                    {totalCount > 0 ? (
                      <span className="text-zinc-500">
                        {" "}
                        ·{" "}
                        {t("products.salesPriceHistory.pageOf")
                          .replace("{{current}}", String(pageNumShown))
                          .replace("{{total}}", String(totalPages))}
                      </span>
                    ) : null}
                  </p>
                </>
              }
            />

            {busy ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : counterpartyScope === "branch_one" && branchId <= 0 ? (
              <p className="text-sm text-zinc-600">{t("products.salesPriceHistory.emptyNoBranch")}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("products.salesPriceHistory.empty")}</p>
            ) : displayRows.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("products.salesPriceHistory.tableSearchFilteredEmpty")}</p>
            ) : (
              <>
                <div className="flex flex-col gap-4 md:hidden">
                  {displayRows.map((r) => (
                    <MobileListCard key={r.id} as="div" className="flex flex-col gap-1 shadow-zinc-900/5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {formatLocaleDate(r.issueDate, locale)}
                      </p>
                      <p className="truncate text-sm font-semibold text-zinc-900">{r.productName}</p>
                      <p className="text-sm text-zinc-700">
                        {counterpartyTypeLabel(r.counterpartyType)} · {r.counterpartyName}
                      </p>
                      <p className="text-sm font-medium text-zinc-900">
                        {formatLocaleAmount(r.unitPrice, locale, r.currencyCode)}
                        {r.unit?.trim() ? ` / ${r.unit}` : ""}
                      </p>
                    </MobileListCard>
                  ))}
                </div>

                <div className="-mx-1 hidden overflow-x-auto md:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("products.salesPriceHistory.colDate")}</TableHeader>
                        <TableHeader>{t("products.salesPriceHistory.colProduct")}</TableHeader>
                        <TableHeader>{t("products.salesPriceHistory.colCounterpartyType")}</TableHeader>
                        <TableHeader>{t("products.salesPriceHistory.colCounterparty")}</TableHeader>
                        <TableHeader>{t("products.salesPriceHistory.colUnit")}</TableHeader>
                        <TableHeader>{t("products.salesPriceHistory.colCurrency")}</TableHeader>
                        <TableHeader className="text-right">{t("products.salesPriceHistory.colUnitPrice")}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{formatLocaleDate(r.issueDate, locale)}</TableCell>
                          <TableCell>{r.productName}</TableCell>
                          <TableCell>{counterpartyTypeLabel(r.counterpartyType)}</TableCell>
                          <TableCell>{r.counterpartyName}</TableCell>
                          <TableCell>{r.unit?.trim() || "—"}</TableCell>
                          <TableCell>{r.currencyCode}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatLocaleAmount(r.unitPrice, locale, r.currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <TablePagination
                  className="mt-1"
                  page={pageIndex + 1}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  disabled={busy}
                  onPageChange={(p) => setPageIndex(p - 1)}
                />
              </>
            )}
          </Card>

          <RightDrawer
            open={filtersDrawerOpen}
            onClose={() => setFiltersDrawerOpen(false)}
            title={t("products.salesPriceHistory.filtersTitle")}
            closeLabel={t("common.close")}
            backdropCloseRequiresConfirm={false}
            className="max-w-lg"
          >
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-relaxed text-zinc-500">{t("products.salesPriceHistory.filtersDrawerHint")}</p>
              <Select
                name="salesPhScope"
                label={t("products.salesPriceHistory.counterpartyScope")}
                value={counterpartyScope}
                options={scopeOptions}
                onBlur={() => undefined}
                onChange={(e) => onScopeChange(e.target.value)}
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              {counterpartyScope === "branch_one" ? (
                <Select
                  name="salesPhBranch"
                  label={t("products.salesPriceHistory.branchLabel")}
                  value={branchId > 0 ? String(branchId) : "0"}
                  options={branchOptions}
                  onBlur={() => undefined}
                  onChange={(e) => {
                    setBranchId(Number.parseInt(e.target.value, 10) || 0);
                    setPageIndex(0);
                  }}
                  menuZIndex={DRAWER_SELECT_Z}
                  className="min-w-0 max-w-full"
                />
              ) : null}
              <Select
                name="salesPhProduct"
                label={t("products.salesPriceHistory.productLabel")}
                value={productId > 0 ? String(productId) : "0"}
                options={productOptions}
                disabled={catalogPending}
                onBlur={() => undefined}
                onChange={(e) => {
                  setProductId(Number.parseInt(e.target.value, 10) || 0);
                  setPageIndex(0);
                }}
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              <Select
                name="salesPhCurrency"
                label={t("products.salesPriceHistory.currencyLabel")}
                value={currencyCode}
                options={currencyOptions}
                onBlur={() => undefined}
                onChange={(e) => {
                  setCurrencyCode(e.target.value);
                  setPageIndex(0);
                }}
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField
                  name="salesPhDateFrom"
                  label={t("products.salesPriceHistory.dateFromLabel")}
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPageIndex(0);
                  }}
                  className="min-w-0 max-w-full"
                />
                <DateField
                  name="salesPhDateTo"
                  label={t("products.salesPriceHistory.dateToLabel")}
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPageIndex(0);
                  }}
                  className="min-w-0 max-w-full"
                />
              </div>
              <Select
                name="salesPhPageSize"
                label={t("products.salesPriceHistory.pageSizeLabel")}
                value={String(pageSize)}
                options={pageSizeOptions}
                onBlur={() => undefined}
                onChange={(e) => {
                  setPageSize(Number.parseInt(e.target.value, 10) || 50);
                  setPageIndex(0);
                }}
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              {counterpartyScope === "branch_one" && branchId <= 0 ? (
                <p className="text-sm text-amber-700">{t("products.salesPriceHistory.pickBranchHint")}</p>
              ) : null}
              <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 w-full sm:flex-1"
                  onClick={() => {
                    setCounterpartyScope("all");
                    setBranchId(0);
                    setProductId(0);
                    setCurrencyCode("");
                    setDateFrom("");
                    setDateTo("");
                    setPageSize(50);
                    setPageIndex(0);
                  }}
                >
                  {t("products.salesPriceHistory.clearFilters")}
                </Button>
                <Button type="button" className="min-h-11 w-full sm:flex-1" onClick={() => void load()} disabled={busy}>
                  {t("products.salesPriceHistory.refresh")}
                </Button>
              </div>
            </div>
          </RightDrawer>
        </div>
      }
    />
  );
}
