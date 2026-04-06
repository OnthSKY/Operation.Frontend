"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  useRegisterWarehouseMovement,
  useTransferWarehouseToBranch,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import {
  IMAGE_FILE_INPUT_ACCEPT,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/shared/lib/image-upload-limits";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { WarehouseProductStockRow } from "@/types/product";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const DEPO_TITLE_ID = "wh-list-depo-in-title";
const TRANSFER_TITLE_ID = "wh-list-transfer-title";

function productLabel(r: WarehouseProductStockRow) {
  const u = r.unit?.trim();
  return u ? `${r.productName} (${u})` : r.productName;
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
  const { data: personnelRaw = [], isPending: personnelLoading } = usePersonnelList();
  const movement = useRegisterWarehouseMovement();

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [inCheckedBy, setInCheckedBy] = useState("");
  const [inApprovedBy, setInApprovedBy] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const personnelOptions = useMemo(
    () =>
      personnelRaw
        .filter((p) => !p.isDeleted)
        .map((p) => ({ value: String(p.id), label: p.fullName })),
    [personnelRaw]
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

  const selectedRow = useMemo(
    () => stockRows.find((r) => String(r.productId) === productId),
    [stockRows, productId]
  );

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setProductId("");
    setQty("1");
    setInCheckedBy("");
    setInApprovedBy("");
    setInvoiceFile(null);
  }, [open, warehouseId]);

  const disabled = stockLoading || personnelLoading || pending || movement.isPending;
  const desc = whName ? `${whName} · ${t("warehouse.depoInModalHint")}` : t("warehouse.depoInModalHint");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      notify.error(t("warehouse.listQuickPickProductError"));
      return;
    }
    const n = Number(qty.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    const ck = Number(inCheckedBy);
    const ap = Number(inApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    if (invoiceFile && invoiceFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      notify.error(t("common.imageUploadTooLarge"));
      return;
    }
    setPending(true);
    try {
      await movement.mutateAsync({
        warehouseId,
        productId: pid,
        quantity: n,
        movementDate,
        direction: "in",
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        invoicePhoto: invoiceFile,
      });
      notify.success(t("toast.warehouseInOk"));
      onClose();
    } catch (err) {
      notify.error(toErrorMessage(err));
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
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <Input
            type="date"
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.transferProduct")}
            labelRequired
            name="wh-list-depo-product"
            options={productOptions}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          {selectedRow ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              {selectedRow.unit ? (
                <p>
                  {t("warehouse.productUnit")}: {selectedRow.unit}
                </p>
              ) : null}
            </div>
          ) : null}
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            label={t("warehouse.qtyLabelDepoIn")}
            labelRequired
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={disabled}
          />
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
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
              disabled={disabled}
              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            />
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
  const { data: personnelRaw = [], isPending: personnelLoading } = usePersonnelList();
  const transfer = useTransferWarehouseToBranch();

  const inStockRows = useMemo(() => stockRows.filter((r) => r.quantity > 0), [stockRows]);

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [productId, setProductId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [tQty, setTQty] = useState("1");
  const [tDesc, setTDesc] = useState("");
  const [trCheckedBy, setTrCheckedBy] = useState("");
  const [trApprovedBy, setTrApprovedBy] = useState("");
  const [pending, setPending] = useState(false);

  const personnelOptions = useMemo(
    () =>
      personnelRaw
        .filter((p) => !p.isDeleted)
        .map((p) => ({ value: String(p.id), label: p.fullName })),
    [personnelRaw]
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

  const selectedRow = useMemo(
    () => inStockRows.find((r) => String(r.productId) === productId),
    [inStockRows, productId]
  );

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setProductId("");
    setBranchId("");
    setTQty("1");
    setTDesc("");
    setTrCheckedBy("");
    setTrApprovedBy("");
  }, [open, warehouseId]);

  const disabled =
    stockLoading ||
    branchesLoading ||
    personnelLoading ||
    pending ||
    transfer.isPending ||
    inStockRows.length === 0;
  const desc = whName ? `${whName} · ${t("warehouse.transferModalHint")}` : t("warehouse.transferModalHint");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      notify.error(t("warehouse.listQuickPickProductError"));
      return;
    }
    const b = Number(branchId);
    if (!Number.isFinite(b) || b <= 0) {
      notify.error(t("warehouse.transferPickBranch"));
      return;
    }
    const n = Number(tQty.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    const row = inStockRows.find((r) => r.productId === pid);
    if (!row || n > row.quantity) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    const ck = Number(trCheckedBy);
    const ap = Number(trApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    setPending(true);
    try {
      await transfer.mutateAsync({
        warehouseId,
        branchId: b,
        productId: pid,
        quantity: n,
        movementDate,
        description: tDesc.trim() ? tDesc.trim() : null,
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
      });
      notify.success(t("toast.transferToBranchOk"));
      onClose();
    } catch (err) {
      notify.error(toErrorMessage(err));
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
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <Input
            type="date"
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.transferProduct")}
            labelRequired
            name="wh-list-tr-product"
            options={productOptions}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          {selectedRow ? (
            <p className="text-sm font-medium tabular-nums text-zinc-800">
              {t("warehouse.transferStockOnHand")}: {selectedRow.quantity}
            </p>
          ) : null}
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
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            label={t("warehouse.transferQty")}
            labelRequired
            value={tQty}
            onChange={(e) => setTQty(e.target.value)}
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
