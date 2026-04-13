"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseTransferFreightFields,
  type WarehouseFreightPaymentSource,
} from "@/modules/warehouse/components/WarehouseTransferFreightFields";
import { WarehouseTransferFreightValuationBar } from "@/modules/warehouse/components/WarehouseTransferFreightValuationBar";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import {
  useRegisterWarehouseMovement,
  useTransferWarehouseToBranch,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { apiUserFacingMessage } from "@/shared/lib/api-user-facing-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { ProductListItem, WarehouseProductStockRow } from "@/types/product";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

function newDraftLineKey() {
  return globalThis.crypto?.randomUUID?.() ?? `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type LineDraft = { key: string; productId: string; qty: string };

const DEPO_TITLE_ID = "wh-list-depo-in-title";
const TRANSFER_TITLE_ID = "wh-list-transfer-title";

function productLabel(r: WarehouseProductStockRow) {
  const u = r.unit?.trim();
  const base = u ? `${r.productName} (${u})` : r.productName;
  const p = r.parentProductName?.trim();
  const c = r.categoryName?.trim();
  const sameAsParent =
    p &&
    p.localeCompare(r.productName.trim(), undefined, { sensitivity: "accent" }) === 0;
  const withParent = p && !sameAsParent ? `${p} › ${base}` : base;
  return c ? `${withParent} · ${c}` : withParent;
}

type WhRef = { id: number; name: string } | null;

export function WarehouseListDepoInModal({
  target,
  onClose,
}: {
  target: WhRef;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const open = target != null;
  const warehouseId = target?.id ?? null;
  const whName = target?.name?.trim() ?? "";

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
    open && warehouseId != null && warehouseId > 0 ? warehouseId : null
  );
  const { data: peopleRaw = [], isPending: peopleLoading } = useWarehousePeopleOptions(open);
  const movement = useRegisterWarehouseMovement();

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [lines, setLines] = useState<LineDraft[]>(() => [{ key: newDraftLineKey(), productId: "", qty: "1" }]);
  const [inCheckedBy, setInCheckedBy] = useState("");
  const [inApprovedBy, setInApprovedBy] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const addDepoLine = useCallback(() => {
    setLines((ls) => [...ls, { key: newDraftLineKey(), productId: "", qty: "1" }]);
  }, []);

  const removeDepoLine = useCallback((key: string) => {
    setLines((ls) => (ls.length <= 1 ? ls : ls.filter((l) => l.key !== key)));
  }, []);

  const updateDepoLine = useCallback(
    (key: string, patch: Partial<Pick<LineDraft, "productId" | "qty">>) => {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    },
    []
  );

  const personnelOptions = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );
  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );
  const productOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.listQuickPickProduct") },
      ...stockRows.map((r) => ({ value: String(r.productId), label: productLabel(r) })),
    ],
    [stockRows, t]
  );

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setLines([{ key: newDraftLineKey(), productId: "", qty: "1" }]);
    setInCheckedBy("");
    setInApprovedBy("");
    setInvoiceFile(null);
  }, [open, warehouseId]);

  const disabled = stockLoading || peopleLoading || pending || movement.isPending;
  const desc = whName ? `${whName} · ${t("warehouse.depoInModalHint")}` : t("warehouse.depoInModalHint");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const parsed: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      parsed.push({ productId: pid, quantity: n });
    }
    if (parsed.length === 0) {
      notify.error(t("warehouse.depoAtLeastOneProductLine"));
      return;
    }
    const ck = Number(inCheckedBy);
    const ap = Number(inApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    if (invoiceFile) {
      const v = await validateImageFileForUpload(invoiceFile);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }
    setPending(true);
    try {
      await movement.mutateAsync({
        warehouseId,
        lines: parsed,
        movementDate,
        direction: "in",
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        invoicePhoto: invoiceFile,
      });
      notify.success(t("toast.warehouseInOk"));
      onClose();
    } catch (err) {
      notify.error(apiUserFacingMessage(err, t));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (pending) return;
        onClose();
      }}
      titleId={DEPO_TITLE_ID}
      title={t("warehouse.actionDepoProductIn")}
      description={desc}
      closeButtonLabel={t("common.close")}
    >
      {stockLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <form
          className="mt-4 flex max-h-[min(78dvh,28rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible"
          onSubmit={(e) => void onSubmit(e)}
        >
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800">{t("warehouse.depoInLinesSection")}</p>
            {lines.map((line, idx) => {
              const selectedRow = stockRows.find((r) => String(r.productId) === line.productId);
              return (
                <div
                  key={line.key}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <Select
                        label={t("warehouse.movementProduct")}
                        labelRequired={idx === 0}
                        name={`wh-list-depo-product-${line.key}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={(e) => updateDepoLine(line.key, { productId: e.target.value })}
                        onBlur={() => {}}
                        disabled={disabled}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        label={t("warehouse.qtyLabelDepoIn")}
                        labelRequired={idx === 0}
                        value={line.qty}
                        onChange={(e) => updateDepoLine(line.key, { qty: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full shrink-0 sm:mb-0.5 sm:w-auto"
                      disabled={disabled || lines.length <= 1}
                      onClick={() => removeDepoLine(line.key)}
                      aria-label={t("warehouse.depoInRemoveLine")}
                    >
                      {t("warehouse.depoInRemoveLine")}
                    </Button>
                  </div>
                  {selectedRow?.unit ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      {t("warehouse.productUnit")}: {selectedRow.unit}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              className="w-full min-h-11 sm:w-auto"
              disabled={disabled}
              onClick={addDepoLine}
            >
              {t("warehouse.depoInAddLine")}
            </Button>
          </div>
          <Select
            label={t("warehouse.checkedByPersonnel")}
            labelRequired
            name="wh-list-depo-ck"
            options={personnelSelectOptions}
            value={inCheckedBy}
            onChange={(e) => setInCheckedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.approvedByPersonnel")}
            labelRequired
            name="wh-list-depo-ap"
            options={personnelSelectOptions}
            value={inApprovedBy}
            onChange={(e) => setInApprovedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <div>
            <label htmlFor="wh-list-depo-invoice" className="mb-1 block text-sm font-medium text-zinc-700">
              {t("warehouse.invoicePhotoOptional")}
            </label>
            <input
              id="wh-list-depo-invoice"
              name="wh-list-depo-invoice"
              type="file"
              accept={IMAGE_FILE_INPUT_ACCEPT}
              className="block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
              disabled={disabled}
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0] ?? null;
                if (!f) {
                  setInvoiceFile(null);
                  return;
                }
                const v = await validateImageFileForUpload(f);
                if (!v.ok) {
                  input.value = "";
                  setInvoiceFile(null);
                  notify.error(
                    v.reason === "size"
                      ? t("common.imageUploadTooLarge")
                      : t("common.imageUploadNotImage")
                  );
                  return;
                }
                setInvoiceFile(f);
              }}
            />
            <LocalImageFileThumb file={invoiceFile} />
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto sm:min-w-[7rem]"
              disabled={disabled}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="min-h-11 w-full sm:min-w-[10rem] sm:flex-1" disabled={disabled}>
              {t("warehouse.depoInSubmit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function WarehouseListTransferModal({
  target,
  onClose,
}: {
  target: WhRef;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const open = target != null;
  const warehouseId = target?.id ?? null;
  const whName = target?.name?.trim() ?? "";

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
    open && warehouseId != null && warehouseId > 0 ? warehouseId : null
  );
  const { data: branches = [], isPending: branchesLoading } = useBranchesList();
  const { data: peopleRaw = [], isPending: peopleLoading } = useWarehousePeopleOptions(open);
  const transfer = useTransferWarehouseToBranch();

  const inStockRows = useMemo(() => stockRows.filter((r) => r.quantity > 0), [stockRows]);

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [lines, setLines] = useState<LineDraft[]>(() => [
    { key: newDraftLineKey(), productId: "", qty: "1" },
  ]);
  const [branchId, setBranchId] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [trCheckedBy, setTrCheckedBy] = useState("");
  const [trApprovedBy, setTrApprovedBy] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [freightPay, setFreightPay] = useState<WarehouseFreightPaymentSource>("REGISTER");
  const [freightPocket, setFreightPocket] = useState("");
  const [freightNote, setFreightNote] = useState("");
  const [pending, setPending] = useState(false);

  const personnelOptions = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );
  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );
  const productOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.listQuickPickProduct") },
      ...inStockRows.map((r) => ({ value: String(r.productId), label: productLabel(r) })),
    ],
    [inStockRows, t]
  );
  const branchOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.personnelPickPlaceholder") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const transferValuationLines = useMemo(() => {
    const out: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(n) || n <= 0) continue;
      const row = inStockRows.find((r) => r.productId === pid);
      if (!row || n > row.quantity) continue;
      out.push({ productId: pid, quantity: n });
    }
    return out;
  }, [lines, inStockRows]);

  const addLine = useCallback(() => {
    setLines((ls) => [...ls, { key: newDraftLineKey(), productId: "", qty: "1" }]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((ls) => (ls.length <= 1 ? ls : ls.filter((l) => l.key !== key)));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<LineDraft, "productId" | "qty">>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setLines([{ key: newDraftLineKey(), productId: "", qty: "1" }]);
    setBranchId("");
    setTDesc("");
    setTrCheckedBy("");
    setTrApprovedBy("");
    setFreightAmount("");
    setFreightPay("REGISTER");
    setFreightPocket("");
    setFreightNote("");
  }, [open, warehouseId]);

  const disabled =
    stockLoading ||
    branchesLoading ||
    peopleLoading ||
    pending ||
    transfer.isPending ||
    inStockRows.length === 0;
  const desc = whName ? `${whName} · ${t("warehouse.transferModalHint")}` : t("warehouse.transferModalHint");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const b = Number(branchId);
    if (!Number.isFinite(b) || b <= 0) {
      notify.error(t("warehouse.transferPickBranch"));
      return;
    }
    const parsed: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      const row = inStockRows.find((r) => r.productId === pid);
      if (!row || n > row.quantity) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      parsed.push({ productId: pid, quantity: n });
    }
    if (parsed.length === 0) {
      notify.error(t("warehouse.transferAtLeastOneProductLine"));
      return;
    }
    const ck = Number(trCheckedBy);
    const ap = Number(trApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    const frN = Number(freightAmount.replace(",", "."));
    const hasFreight = Number.isFinite(frN) && frN > 0;
    let pocketPid: number | undefined;
    if (hasFreight && freightPay === "PERSONNEL_POCKET") {
      const p = Number(freightPocket);
      if (!Number.isFinite(p) || p <= 0) {
        notify.error(t("warehouse.transferFreightPocketRequired"));
        return;
      }
      pocketPid = p;
    }
    setPending(true);
    try {
      await transfer.mutateAsync({
        warehouseId,
        branchId: b,
        lines: parsed,
        movementDate,
        description: tDesc.trim() ? tDesc.trim() : null,
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        ...(hasFreight
          ? {
              freightAmount: frN,
              freightExpensePaymentSource: freightPay,
              freightExpensePocketPersonnelId: pocketPid ?? null,
              freightNote: freightNote.trim() ? freightNote.trim() : null,
            }
          : {}),
      });
      notify.success(t("toast.transferToBranchOk"));
      onClose();
    } catch (err) {
      notify.error(apiUserFacingMessage(err, t));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (pending) return;
        onClose();
      }}
      titleId={TRANSFER_TITLE_ID}
      title={t("warehouse.transferRowTitle")}
      description={desc}
      closeButtonLabel={t("common.close")}
    >
      {stockLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : inStockRows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">{t("warehouse.listQuickTransferNoStock")}</p>
      ) : (
        <form
          className="mt-4 flex max-h-[min(78dvh,28rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible"
          onSubmit={(e) => void onSubmit(e)}
        >
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800">{t("warehouse.transferLinesSection")}</p>
            {lines.map((line, idx) => {
              const selectedRow = inStockRows.find((r) => String(r.productId) === line.productId);
              return (
                <div
                  key={line.key}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <Select
                        label={t("warehouse.transferProduct")}
                        labelRequired={idx === 0}
                        name={`wh-list-tr-product-${line.key}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                        onBlur={() => {}}
                        disabled={disabled}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        label={t("warehouse.transferQty")}
                        labelRequired={idx === 0}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full shrink-0 sm:mb-0.5 sm:w-auto"
                      disabled={disabled || lines.length <= 1}
                      onClick={() => removeLine(line.key)}
                      aria-label={t("warehouse.transferRemoveLine")}
                    >
                      {t("warehouse.transferRemoveLine")}
                    </Button>
                  </div>
                  {selectedRow ? (
                    <p className="mt-2 text-sm font-medium tabular-nums text-zinc-700">
                      {t("warehouse.transferStockOnHand")}: {selectedRow.quantity}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <Button type="button" variant="secondary" className="w-full min-h-11 sm:w-auto" disabled={disabled} onClick={addLine}>
              {t("warehouse.transferAddLine")}
            </Button>
          </div>
          <Select
            label={t("warehouse.transferBranch")}
            labelRequired
            name="wh-list-tr-br"
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => {}}
            disabled={disabled || branchesLoading}
          />
          <WarehouseTransferFreightValuationBar
            warehouseId={warehouseId}
            lines={transferValuationLines}
            enabled={open && !disabled}
            onApplySuggestedFreight={setFreightAmount}
          />
          <WarehouseTransferFreightFields
            freightAmount={freightAmount}
            onFreightAmountChange={setFreightAmount}
            freightPaymentSource={freightPay}
            onFreightPaymentSourceChange={setFreightPay}
            freightPocketPersonnelId={freightPocket}
            onFreightPocketPersonnelIdChange={setFreightPocket}
            freightNote={freightNote}
            onFreightNoteChange={setFreightNote}
            personnelSelectOptions={personnelSelectOptions}
            disabled={disabled}
          />
          <Input
            type="text"
            autoComplete="off"
            label={t("warehouse.transferDescription")}
            placeholder={t("warehouse.transferDescriptionPlaceholder")}
            value={tDesc}
            onChange={(e) => setTDesc(e.target.value)}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.checkedByPersonnel")}
            labelRequired
            name="wh-list-tr-ck"
            options={personnelSelectOptions}
            value={trCheckedBy}
            onChange={(e) => setTrCheckedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.approvedByPersonnel")}
            labelRequired
            name="wh-list-tr-ap"
            options={personnelSelectOptions}
            value={trApprovedBy}
            onChange={(e) => setTrApprovedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto sm:min-w-[7rem]"
              disabled={disabled}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="min-h-11 w-full sm:min-w-[10rem] sm:flex-1" disabled={disabled}>
              {t("warehouse.transferSubmit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
