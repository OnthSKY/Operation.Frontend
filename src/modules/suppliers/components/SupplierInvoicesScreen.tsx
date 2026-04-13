"use client";

import type { SupplierInvoiceListItem } from "@/modules/suppliers/api/suppliers-api";
import { SupplierLineBranchAllocationModal } from "@/modules/suppliers/components/SupplierLineBranchAllocationModal";
import {
  supplierKeys,
  useCreateSupplierInvoice,
  useCreateSupplierPayment,
  useSupplierInvoice,
  useSupplierInvoices,
  useSuppliers,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useWarehousePeopleOptions, useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { DateField } from "@/shared/ui/DateField";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LineReceiveTarget = "none" | "warehouse" | "branch";

type InvoiceLineDraft = {
  key: string;
  receiveTarget: LineReceiveTarget;
  receiveBranchId: string;
  receiveWarehouseId: string;
  description: string;
  lineAmount: string;
  quantity: string;
  unitPrice: string;
  productId: string;
};

function emptyLine(): InvoiceLineDraft {
  return {
    key: crypto.randomUUID(),
    receiveTarget: "none",
    receiveBranchId: "",
    receiveWarehouseId: "",
    description: "",
    lineAmount: "",
    quantity: "",
    unitPrice: "",
    productId: "",
  };
}

function parseDec(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntId(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function SupplierInvoicesScreen() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useSuppliers(false);
  const searchParams = useSearchParams();

  const [invSupplierId, setInvSupplierId] = useState<number | "">("");
  const [invDateFrom, setInvDateFrom] = useState("");
  const [invDateTo, setInvDateTo] = useState("");
  const [minLinesTotalStr, setMinLinesTotalStr] = useState("");
  const [maxLinesTotalStr, setMaxLinesTotalStr] = useState("");
  const [payFilter, setPayFilter] = useState<"" | "paid" | "unpaid">("");

  useEffect(() => {
    const raw = searchParams.get("supplierId");
    if (raw == null || raw === "") return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    setInvSupplierId(n);
  }, [searchParams]);

  const invFilters = useMemo(() => {
    const minN = parseDec(minLinesTotalStr);
    const maxN = parseDec(maxLinesTotalStr);
    return {
      supplierId: invSupplierId === "" ? undefined : invSupplierId,
      dateFrom: invDateFrom || undefined,
      dateTo: invDateTo || undefined,
      minLinesTotal: minN != null && minN >= 0 ? minN : undefined,
      maxLinesTotal: maxN != null && maxN >= 0 ? maxN : undefined,
      paymentStatus: payFilter === "" ? undefined : payFilter,
    };
  }, [invSupplierId, invDateFrom, invDateTo, minLinesTotalStr, maxLinesTotalStr, payFilter]);

  const {
    data: invoices = [],
    isPending: invPending,
    isError: invErr,
    error: invError,
  } = useSupplierInvoices(invFilters);
  const createInv = useCreateSupplierInvoice();
  const createPay = useCreateSupplierPayment();

  const { data: catalog = [] } = useProductsCatalog();
  const { data: branches = [] } = useBranchesList();
  const productOptions = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((p) => ({ id: p.id, name: p.name })),
    [catalog]
  );

  const supplierFilterOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.allSuppliers") },
      ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suppliers, t]
  );

  const invoiceSupplierOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.pickSupplier") },
      ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suppliers, t]
  );

  const productLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.noProduct") },
      ...productOptions.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productOptions, t]
  );

  const branchLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.allocPickBranch") },
      ...[...branches]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const paySourceOptions = useMemo(
    () => [
      { value: "CASH", label: t("suppliers.sourceCash") },
      { value: "BANK", label: t("suppliers.sourceBank") },
      { value: "PATRON", label: t("suppliers.sourcePatron") },
    ],
    [t]
  );

  const paymentStatusOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.filterPaymentAll") },
      { value: "unpaid", label: t("suppliers.filterPaymentUnpaid") },
      { value: "paid", label: t("suppliers.filterPaymentPaid") },
    ],
    [t]
  );

  const [invOpen, setInvOpen] = useState(false);
  const [invSupplierPick, setInvSupplierPick] = useState<number | "">("");
  const [invDocNo, setInvDocNo] = useState("");
  const [invDocDate, setInvDocDate] = useState("");
  const [invDue, setInvDue] = useState("");
  const [invDesc, setInvDesc] = useState("");
  const [invCur, setInvCur] = useState("TRY");
  const [invPaymentMarked, setInvPaymentMarked] = useState(false);
  const [invFormalIssued, setInvFormalIssued] = useState(false);
  const [invLines, setInvLines] = useState<InvoiceLineDraft[]>(() => [emptyLine()]);
  const [invWhCheckedBy, setInvWhCheckedBy] = useState("");
  const [invWhApprovedBy, setInvWhApprovedBy] = useState("");

  const { data: warehouses = [] } = useWarehousesList();
  const { data: whPeopleRaw = [] } = useWarehousePeopleOptions(invOpen);

  const warehouseLineSelectOptions = useMemo(
    () => [
      { value: "", label: t("suppliers.pickReceiveWarehouse") },
      ...[...warehouses]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  const whPersonnelOptions = useMemo(
    () =>
      whPeopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [whPeopleRaw]
  );

  const whPersonnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...whPersonnelOptions],
    [whPersonnelOptions, t]
  );

  const invNeedsWhPersonnel = useMemo(
    () => invLines.some((l) => l.receiveTarget === "warehouse"),
    [invLines]
  );

  const openInvoiceModal = () => {
    setInvSupplierPick(invSupplierId === "" ? "" : invSupplierId);
    setInvDocNo("");
    setInvDocDate("");
    setInvDue("");
    setInvDesc("");
    setInvCur("TRY");
    setInvPaymentMarked(false);
    setInvFormalIssued(false);
    setInvLines([emptyLine()]);
    setInvWhCheckedBy("");
    setInvWhApprovedBy("");
    setInvOpen(true);
  };

  const saveInvoice = async () => {
    if (invSupplierPick === "" || invSupplierPick <= 0) {
      notify.error(t("common.required"));
      return;
    }
    if (!invDocDate.trim()) {
      notify.error(t("common.required"));
      return;
    }
    if (invNeedsWhPersonnel) {
      const wck = parseIntId(invWhCheckedBy);
      const wap = parseIntId(invWhApprovedBy);
      if (wck == null || wap == null) {
        notify.error(t("suppliers.whIntakePersonnelRequired"));
        return;
      }
    }
    for (const l of invLines) {
      if (l.receiveTarget !== "warehouse") continue;
      if (parseIntId(l.productId) == null) {
        notify.error(t("suppliers.whIntakeProductRequired"));
        return;
      }
      const wq = parseDec(l.quantity);
      if (wq == null || wq <= 0) {
        notify.error(t("suppliers.whIntakeQuantityRequired"));
        return;
      }
      if (parseIntId(l.receiveWarehouseId) == null) {
        notify.error(t("suppliers.whIntakeWarehouseRequired"));
        return;
      }
    }
    const lines = invLines
      .map((l) => {
        const amt = parseDec(l.lineAmount);
        if (amt == null || amt <= 0) return null;
        const pid = parseIntId(l.productId);
        const rwid = l.receiveTarget === "warehouse" ? parseIntId(l.receiveWarehouseId) : null;
        const bid = l.receiveTarget === "branch" ? parseIntId(l.receiveBranchId) : null;
        const qty = parseDec(l.quantity);
        const up = parseDec(l.unitPrice);
        return {
          description: l.description.trim() || null,
          lineAmount: amt,
          quantity: qty != null && qty > 0 ? qty : null,
          unitPrice: up != null && up >= 0 ? up : null,
          productId: pid,
          receiveWarehouseId: rwid,
          receiveBranchId: bid,
        };
      })
      .filter(Boolean) as Array<{
      description: string | null;
      lineAmount: number;
      quantity: number | null;
      unitPrice: number | null;
      productId: number | null;
      receiveWarehouseId: number | null;
      receiveBranchId: number | null;
    }>;
    if (lines.length === 0) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await createInv.mutateAsync({
        supplierId: invSupplierPick,
        documentNumber: invDocNo.trim() || null,
        documentDate: invDocDate.trim(),
        dueDate: invDue.trim() || null,
        currencyCode: invCur.trim() || "TRY",
        description: invDesc.trim() || null,
        paymentMarkedComplete: invPaymentMarked,
        formalSupplierInvoiceIssued: invFormalIssued,
        autoWarehouseCheckedByPersonnelId: invNeedsWhPersonnel ? parseIntId(invWhCheckedBy) : null,
        autoWarehouseApprovedByPersonnelId: invNeedsWhPersonnel ? parseIntId(invWhApprovedBy) : null,
        lines,
      });
      notify.success(t("toast.supplierInvoiceCreated"));
      setInvOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const [viewId, setViewId] = useState<number | null>(null);
  const { data: viewInvoice, isPending: viewPending } = useSupplierInvoice(viewId, viewId != null);
  const [allocLineId, setAllocLineId] = useState<number | null>(null);

  const [payTarget, setPayTarget] = useState<SupplierInvoiceListItem | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [paySrc, setPaySrc] = useState("BANK");
  const [payBranchId, setPayBranchId] = useState("");
  const [payDesc, setPayDesc] = useState("");

  const openPay = (row: SupplierInvoiceListItem) => {
    setPayTarget(row);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmt(String(row.openAmount));
    setPaySrc("BANK");
    setPayBranchId("");
    setPayDesc("");
  };

  const savePay = async () => {
    if (!payTarget) return;
    const amt = parseDec(payAmt);
    if (!payDate.trim() || amt == null || amt <= 0) {
      notify.error(t("common.required"));
      return;
    }
    const cashBranch = paySrc === "CASH" ? parseIntId(payBranchId) : null;
    if (paySrc === "CASH" && cashBranch == null) {
      notify.error(t("common.required"));
      return;
    }
    try {
      await createPay.mutateAsync({
        paymentDate: payDate.trim(),
        amount: amt,
        currencyCode: payTarget.currencyCode,
        sourceType: paySrc,
        branchId: cashBranch,
        description: payDesc.trim() || null,
        allocations: [{ invoiceId: payTarget.id, amount: amt }],
      });
      notify.success(t("toast.supplierPaymentCreated"));
      setPayTarget(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto w-full app-page-max p-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t("suppliers.invoicesPageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("suppliers.invoicesPageSubtitle")}</p>
        </div>
        <Link
          href="/suppliers"
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 sm:min-h-9"
          )}
        >
          {t("suppliers.backToSuppliers")}
        </Link>
      </div>

      <Card className="mt-6" title={t("suppliers.invoicesSection")}>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Select
              name="invSupplierFilter"
              label={t("suppliers.filterSupplier")}
              options={supplierFilterOptions}
              value={invSupplierId === "" ? "" : String(invSupplierId)}
              onChange={(e) => setInvSupplierId(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
          <DateField label={t("suppliers.dateFrom")} value={invDateFrom} onChange={(e) => setInvDateFrom(e.target.value)} />
          <DateField label={t("suppliers.dateTo")} value={invDateTo} onChange={(e) => setInvDateTo(e.target.value)} />
          <Input
            label={t("suppliers.filterLinesTotalMin")}
            value={minLinesTotalStr}
            onChange={(e) => setMinLinesTotalStr(e.target.value)}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <Input
            label={t("suppliers.filterLinesTotalMax")}
            value={maxLinesTotalStr}
            onChange={(e) => setMaxLinesTotalStr(e.target.value)}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <Select
              name="invPaymentStatus"
              label={t("suppliers.filterPaymentStatus")}
              options={paymentStatusOptions}
              value={payFilter}
              onChange={(e) => setPayFilter((e.target.value as "" | "paid" | "unpaid") || "")}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
        </div>
        {invErr ? (
          <p className="text-sm text-red-600">{toErrorMessage(invError)}</p>
        ) : invPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("suppliers.noInvoices")}</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("suppliers.documentDate")}</TableHeader>
                  <TableHeader>{t("suppliers.name")}</TableHeader>
                  <TableHeader>{t("suppliers.documentNumber")}</TableHeader>
                  <TableHeader className="text-right">{t("suppliers.linesTotal")}</TableHeader>
                  <TableHeader className="text-right">{t("suppliers.openAmount")}</TableHeader>
                  <TableHeader className="text-right">{t("common.actions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell dataLabel={t("suppliers.documentDate")} className="whitespace-nowrap text-zinc-700">
                      {row.documentDate}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.name")} className="text-zinc-900">
                      {row.supplierName}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.documentNumber")} className="text-zinc-600">
                      {row.documentNumber ?? "—"}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.linesTotal")} className="text-right tabular-nums text-zinc-800">
                      {formatLocaleAmount(row.linesTotal, locale, row.currencyCode)}
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.openAmount")} className="text-right tabular-nums font-medium text-zinc-900">
                      {formatLocaleAmount(row.openAmount, locale, row.currencyCode)}
                    </TableCell>
                    <TableCell dataLabel={t("common.actions")} className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="secondary" className="min-h-9" onClick={() => setViewId(row.id)}>
                          {t("suppliers.view")}
                        </Button>
                        {row.openAmount > 0.005 ? (
                          <Button type="button" className="min-h-9" onClick={() => openPay(row)}>
                            {t("suppliers.pay")}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Button type="button" className="mt-4 min-h-11 sm:min-h-9" onClick={openInvoiceModal}>
          {t("suppliers.newInvoice")}
        </Button>
      </Card>

      <Modal
        open={invOpen}
        onClose={() => setInvOpen(false)}
        titleId="inv-create-title"
        title={t("suppliers.newInvoice")}
        wide
        wideFixedHeight
        closeButtonLabel={t("common.close")}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            <div className="flex min-w-0 flex-col gap-3 pr-0.5 pt-1">
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.intakeFormHint")}</p>
              <Select
                name="invSupplierPick"
                label={t("suppliers.name")}
                labelRequired
                options={invoiceSupplierOptions}
                value={invSupplierPick === "" ? "" : String(invSupplierPick)}
                onChange={(e) => setInvSupplierPick(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => {}}
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label={t("suppliers.documentNumber")} value={invDocNo} onChange={(e) => setInvDocNo(e.target.value)} />
                <DateField label={t("suppliers.documentDate")} labelRequired value={invDocDate} onChange={(e) => setInvDocDate(e.target.value)} />
                <DateField label={t("suppliers.dueDate")} value={invDue} onChange={(e) => setInvDue(e.target.value)} />
                <Input label={t("suppliers.currency")} value={invCur} onChange={(e) => setInvCur(e.target.value)} />
              </div>
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.documentNumberHint")}</p>
              <Input label={t("suppliers.description")} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} />
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 sm:p-4">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoicePaymentMarked")}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoicePaymentMarkedHint")}</p>
                  </div>
                  <Switch checked={invPaymentMarked} onCheckedChange={setInvPaymentMarked} />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoiceFormalIssued")}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoiceFormalIssuedHint")}</p>
                  </div>
                  <Switch checked={invFormalIssued} onCheckedChange={setInvFormalIssued} />
                </div>
              </div>
              {invNeedsWhPersonnel ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-zinc-800">{t("suppliers.whIntakePersonnelSection")}</p>
                  <p className="mt-1 text-xs text-zinc-600">{t("suppliers.whIntakePersonnelHint")}</p>
                  <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      name="invWhCheckedBy"
                      label={t("warehouse.checkedByPersonnel")}
                      labelRequired
                      options={whPersonnelSelectOptions}
                      value={invWhCheckedBy}
                      onChange={(e) => setInvWhCheckedBy(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                    <Select
                      name="invWhApprovedBy"
                      label={t("warehouse.approvedByPersonnel")}
                      labelRequired
                      options={whPersonnelSelectOptions}
                      value={invWhApprovedBy}
                      onChange={(e) => setInvWhApprovedBy(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-zinc-800">{t("suppliers.lines")}</p>
                <p className="mt-1 text-xs leading-snug text-zinc-500">{t("suppliers.invoiceLinesSectionHint")}</p>
              </div>
              {invLines.map((line, idx) => (
                <div
                  key={line.key}
                  className="min-w-0 rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/90 p-3 shadow-sm sm:p-4"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold tracking-wide text-zinc-400">#{idx + 1}</span>
                    {invLines.length > 1 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full shrink-0 text-xs sm:min-h-8 sm:w-auto"
                        onClick={() => setInvLines((rows) => rows.filter((r) => r.key !== line.key))}
                      >
                        {t("suppliers.removeLine")}
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    <Select
                      name={`invLineProduct-${line.key}`}
                      label={t("suppliers.product")}
                      options={productLineSelectOptions}
                      value={line.productId}
                      onChange={(e) =>
                        setInvLines((rows) =>
                          rows.map((r) => (r.key === line.key ? { ...r, productId: e.target.value } : r))
                        )
                      }
                      onBlur={() => {}}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input
                        label={t("suppliers.lineAmount")}
                        labelRequired
                        value={line.lineAmount}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, lineAmount: e.target.value } : r))
                          )
                        }
                      />
                      <Input
                        label={t("suppliers.quantity")}
                        value={line.quantity}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, quantity: e.target.value } : r))
                          )
                        }
                      />
                      <Input
                        label={t("suppliers.unitPrice")}
                        value={line.unitPrice}
                        onChange={(e) =>
                          setInvLines((rows) =>
                            rows.map((r) => (r.key === line.key ? { ...r, unitPrice: e.target.value } : r))
                          )
                        }
                      />
                    </div>
                    <Input
                      label={t("suppliers.lineDescription")}
                      value={line.description}
                      onChange={(e) =>
                        setInvLines((rows) =>
                          rows.map((r) => (r.key === line.key ? { ...r, description: e.target.value } : r))
                        )
                      }
                    />
                    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("suppliers.lineReceiveTarget")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{t("suppliers.movementHint")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(
                          [
                            ["none", t("suppliers.lineReceiveNone")] as const,
                            ["warehouse", t("suppliers.lineReceiveWarehouse")] as const,
                            ["branch", t("suppliers.lineReceiveBranch")] as const,
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() =>
                              setInvLines((rows) =>
                                rows.map((r) =>
                                  r.key === line.key
                                    ? {
                                        ...r,
                                        receiveTarget: mode,
                                        ...(mode !== "warehouse" ? { receiveWarehouseId: "" } : {}),
                                        ...(mode !== "branch" ? { receiveBranchId: "" } : {}),
                                      }
                                    : r
                                )
                              )
                            }
                            className={cn(
                              "rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                              line.receiveTarget === mode
                                ? "border-violet-500 bg-violet-50 text-violet-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {line.receiveTarget === "warehouse" ? (
                        <div className="mt-3">
                          <Select
                            name={`invLineWh-${line.key}`}
                            label={t("suppliers.receiveWarehouseLabel")}
                            labelRequired
                            options={warehouseLineSelectOptions}
                            value={line.receiveWarehouseId}
                            onChange={(e) =>
                              setInvLines((rows) =>
                                rows.map((r) =>
                                  r.key === line.key ? { ...r, receiveWarehouseId: e.target.value } : r
                                )
                              )
                            }
                            onBlur={() => {}}
                            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                          />
                        </div>
                      ) : null}
                      {line.receiveTarget === "branch" ? (
                        <div className="mt-3">
                          <Select
                            name={`invLineBranch-${line.key}`}
                            label={t("suppliers.receiveBranchLabel")}
                            options={branchLineSelectOptions}
                            value={line.receiveBranchId}
                            onChange={(e) =>
                              setInvLines((rows) =>
                                rows.map((r) => (r.key === line.key ? { ...r, receiveBranchId: e.target.value } : r))
                              )
                            }
                            onBlur={() => {}}
                            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:min-h-9 sm:w-fit"
                onClick={() => setInvLines((r) => [...r, emptyLine()])}
              >
                {t("suppliers.addLine")}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={() => setInvOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={() => void saveInvoice()}
              disabled={createInv.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={viewId != null}
        onClose={() => setViewId(null)}
        titleId="inv-view-title"
        title={t("suppliers.invoiceDetail")}
        wide
        wideFixedHeight
      >
        {viewPending || !viewInvoice ? (
          <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.name")}</dt>
                <dd className="text-zinc-900">{viewInvoice.supplierName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.documentNumber")}</dt>
                <dd>{viewInvoice.documentNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.documentDate")}</dt>
                <dd>{viewInvoice.documentDate}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.openAmount")}</dt>
                <dd className="font-semibold">
                  {formatLocaleAmount(viewInvoice.openAmount, locale, viewInvoice.currencyCode)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.invoicePaymentMarked")}</dt>
                <dd className="text-zinc-800">{viewInvoice.paymentMarkedComplete ? t("common.yes") : t("common.no")}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">{t("suppliers.invoiceFormalIssued")}</dt>
                <dd className="text-zinc-800">{viewInvoice.formalSupplierInvoiceIssued ? t("common.yes") : t("common.no")}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3 sm:hidden">
              {viewInvoice.lines.map((l) => {
                const stockLinked =
                  (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                  (l.receiveBranchId != null && l.receiveBranchId > 0);
                return (
                  <div key={l.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-400">#{l.lineNo}</p>
                        <p className="mt-0.5 font-medium text-zinc-900">{l.description ?? l.productName ?? "—"}</p>
                        {l.warehouseMovementId ? (
                          <p className="mt-1 text-xs text-zinc-500">WM #{l.warehouseMovementId}</p>
                        ) : null}
                        {l.receiveBranchName ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-base font-semibold tabular-nums text-zinc-900">
                        {formatLocaleAmount(l.lineAmount, locale, viewInvoice.currencyCode)}
                      </p>
                    </div>
                    <div className="mt-3">
                      {stockLinked ? (
                        <p className="text-xs text-zinc-500">{t("suppliers.allocNarrowHint")}</p>
                      ) : (
                        <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={() => setAllocLineId(l.id)}>
                          {t("suppliers.allocOpen")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto sm:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>#</TableHeader>
                    <TableHeader>{t("suppliers.lineDescription")}</TableHeader>
                    <TableHeader className="text-right">{t("suppliers.lineAmount")}</TableHeader>
                    <TableHeader className="text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewInvoice.lines.map((l) => {
                    const stockLinked =
                      (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                      (l.receiveBranchId != null && l.receiveBranchId > 0);
                    return (
                      <TableRow key={l.id}>
                        <TableCell dataLabel="#">{l.lineNo}</TableCell>
                        <TableCell dataLabel={t("suppliers.lineDescription")}>
                          <div className="text-zinc-900">{l.description ?? l.productName ?? "—"}</div>
                          {l.warehouseMovementId ? (
                            <div className="text-xs text-zinc-500">WM #{l.warehouseMovementId}</div>
                          ) : null}
                          {l.receiveBranchName ? (
                            <div className="text-xs text-zinc-500">
                              {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell dataLabel={t("suppliers.lineAmount")} className="text-right tabular-nums">
                          {formatLocaleAmount(l.lineAmount, locale, viewInvoice.currencyCode)}
                        </TableCell>
                        <TableCell dataLabel={t("common.actions")} className="text-right">
                          {stockLinked ? (
                            <span className="text-xs text-zinc-400">{t("suppliers.allocNarrowHint")}</span>
                          ) : (
                            <Button type="button" variant="secondary" className="min-h-9 whitespace-nowrap" onClick={() => setAllocLineId(l.id)}>
                              {t("suppliers.allocOpen")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Modal>

      <SupplierLineBranchAllocationModal
        open={allocLineId != null}
        lineId={allocLineId ?? 0}
        onClose={() => setAllocLineId(null)}
        onPosted={() => {
          if (viewId != null) {
            void queryClient.invalidateQueries({ queryKey: supplierKeys.invoice(viewId) });
          }
        }}
      />

      <Modal
        open={payTarget != null}
        onClose={() => setPayTarget(null)}
        titleId="pay-title"
        title={t("suppliers.paymentTitle")}
        narrow
        nested
      >
        {payTarget ? (
          <div className="flex flex-col gap-3 p-1">
            <p className="text-xs text-zinc-600">{t("suppliers.allocationsHint")}</p>
            <p className="text-sm text-zinc-800">
              {payTarget.supplierName} · #{payTarget.id} · {t("suppliers.openAmount")}:{" "}
              {formatLocaleAmount(payTarget.openAmount, locale, payTarget.currencyCode)}
            </p>
            <DateField label={t("suppliers.paymentDate")} labelRequired value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <Input label={t("suppliers.paymentAmount")} labelRequired value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
            <Select
              name="paySourceType"
              label={t("suppliers.sourceType")}
              options={paySourceOptions}
              value={paySrc}
              onChange={(e) => {
                const v = e.target.value;
                setPaySrc(v);
                if (v !== "CASH") setPayBranchId("");
              }}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
            {paySrc === "CASH" ? (
              <Select
                name="payBranchId"
                label={t("suppliers.paymentBranch")}
                labelRequired
                options={branchLineSelectOptions}
                value={payBranchId}
                onChange={(e) => setPayBranchId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            ) : null}
            <Input label={t("suppliers.description")} value={payDesc} onChange={(e) => setPayDesc(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPayTarget(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void savePay()} disabled={createPay.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
