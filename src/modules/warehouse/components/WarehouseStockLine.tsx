"use client";

import type { WarehouseProductStockRow } from "@/types/product";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { cn } from "@/lib/cn";
import {
  IMAGE_FILE_INPUT_ACCEPT,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/shared/lib/image-upload-limits";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { TableCell, TableRow } from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";

type MoveInput = {
  warehouseId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  direction: "in" | "out";
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  invoicePhoto?: File | null;
};

type TransferInput = {
  warehouseId: number;
  branchId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
};

type Props = {
  row: WarehouseProductStockRow;
  warehouseId: number;
  movementDate: string;
  branchOptions: { value: string; label: string }[];
  branchesReady: boolean;
  disabled: boolean;
  movementMutate: (input: MoveInput) => Promise<unknown>;
  transferMutate: (input: TransferInput) => Promise<unknown>;
  personnelOptions: { value: string; label: string }[];
  variant: "card" | "table";
};

export function WarehouseStockLine({
  row,
  warehouseId,
  movementDate,
  branchOptions,
  branchesReady,
  disabled,
  movementMutate,
  transferMutate,
  personnelOptions,
  variant,
}: Props) {
  const { t } = useI18n();
  const [qty, setQty] = useState("1");
  const [depoInOpen, setDepoInOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [tQty, setTQty] = useState("1");
  const [tDesc, setTDesc] = useState("");
  const [inCheckedBy, setInCheckedBy] = useState("");
  const [inApprovedBy, setInApprovedBy] = useState("");
  const [trCheckedBy, setTrCheckedBy] = useState("");
  const [trApprovedBy, setTrApprovedBy] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [pending, setPending] = useState<null | "in" | "transfer">(null);

  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );

  useEffect(() => {
    if (!depoInOpen) return;
    setQty("1");
    setInCheckedBy("");
    setInApprovedBy("");
    setInvoiceFile(null);
  }, [depoInOpen]);

  useEffect(() => {
    if (!transferOpen) return;
    setBranchId("");
    setTQty("1");
    setTDesc("");
    setTrCheckedBy("");
    setTrApprovedBy("");
  }, [transferOpen]);

  const off = disabled || pending !== null;
  const canOut = row.quantity > 0;
  const canTransfer = canOut && branchesReady && branchOptions.length > 0;

  const transferTooltip = useMemo(() => {
    if (!branchesReady) return t("common.loading");
    if (branchOptions.length === 0) return t("branch.noData");
    if (!canOut) return t("warehouse.transferNoBranchStock");
    return t("warehouse.actionBranchProductOut");
  }, [t, branchesReady, branchOptions.length, canOut]);

  const runDepoIn = async (e: FormEvent) => {
    e.preventDefault();
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
    setPending("in");
    try {
      await movementMutate({
        warehouseId,
        productId: row.productId,
        quantity: n,
        movementDate,
        direction: "in",
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        invoicePhoto: invoiceFile,
      });
      notify.success(t("toast.warehouseInOk"));
      setDepoInOpen(false);
      setQty("1");
      setInvoiceFile(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const runTransfer = async (e: FormEvent) => {
    e.preventDefault();
    const b = Number(branchId);
    const n = Number(tQty.replace(",", "."));
    if (!Number.isFinite(b) || b <= 0) {
      notify.error(t("warehouse.transferPickBranch"));
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    if (n > row.quantity) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    const ck = Number(trCheckedBy);
    const ap = Number(trApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    setPending("transfer");
    try {
      await transferMutate({
        warehouseId,
        branchId: b,
        productId: row.productId,
        quantity: n,
        movementDate,
        description: tDesc.trim() ? tDesc.trim() : null,
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
      });
      notify.success(t("toast.transferToBranchOk"));
      setTransferOpen(false);
      setBranchId("");
      setTQty("1");
      setTDesc("");
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const actionButtons = (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        variant === "card" ? "items-stretch" : "items-center justify-end"
      )}
    >
      <Button
        type="button"
        disabled={off}
        aria-haspopup="dialog"
        aria-expanded={depoInOpen}
        onClick={() => setDepoInOpen(true)}
        className={cn(
          variant === "card" ? "min-h-11 flex-1 px-3 sm:flex-none" : "min-h-9 px-3 text-sm"
        )}
      >
        {t("warehouse.actionDepoProductIn")}
      </Button>
      <Tooltip
        content={transferTooltip}
        delayMs={280}
        className={variant === "card" ? "w-full sm:w-auto sm:flex-1" : undefined}
      >
        <Button
          type="button"
          variant="secondary"
          disabled={off || !canTransfer}
          aria-haspopup="dialog"
          aria-expanded={transferOpen}
          onClick={() => setTransferOpen(true)}
          className={cn(
            variant === "card" ? "min-h-11 w-full sm:w-auto sm:flex-1" : "min-h-9 px-3 text-sm",
            !canTransfer && "opacity-50"
          )}
        >
          {t("warehouse.actionBranchProductOut")}
        </Button>
      </Tooltip>
    </div>
  );

  const depoInTitleId = `wh-depo-in-title-${warehouseId}-${row.productId}`;
  const depoInFormId = `wh-depo-in-form-${warehouseId}-${row.productId}`;
  const transferTitleId = `wh-transfer-title-${warehouseId}-${row.productId}`;
  const transferFormId = `wh-transfer-form-${warehouseId}-${row.productId}`;

  const depoInModal = (
    <Modal
      nested
      open={depoInOpen}
      onClose={() => {
        if (pending === "in") return;
        setDepoInOpen(false);
      }}
      titleId={depoInTitleId}
      title={t("warehouse.actionDepoProductIn")}
      description={t("warehouse.depoInModalHint")}
      closeButtonLabel={t("common.close")}
    >
      <form
        id={depoInFormId}
        className="mt-4 flex max-h-[min(60dvh,22rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible"
        onSubmit={(e) => void runDepoIn(e)}
      >
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("warehouse.transferProduct")}
          </p>
          <p className="mt-0.5 font-semibold text-zinc-900">{row.productName}</p>
          {row.unit ? (
            <p className="mt-1 text-sm text-zinc-600">
              {t("warehouse.productUnit")}: {row.unit}
            </p>
          ) : null}
        </div>
        <Input
          id={`wh-in-qty-${warehouseId}-${row.productId}`}
          name={`wh-in-qty-${warehouseId}-${row.productId}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          label={t("warehouse.qtyLabelDepoIn")}
          labelRequired
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={off}
        />
        <Select
          label={t("warehouse.checkedByPersonnel")}
          labelRequired
          name={`wh-in-ck-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={inCheckedBy}
          onChange={(e) => setInCheckedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <Select
          label={t("warehouse.approvedByPersonnel")}
          labelRequired
          name={`wh-in-ap-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={inApprovedBy}
          onChange={(e) => setInApprovedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <div>
          <label
            htmlFor={`wh-in-invoice-${warehouseId}-${row.productId}`}
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            {t("warehouse.invoicePhotoOptional")}
          </label>
          <input
            id={`wh-in-invoice-${warehouseId}-${row.productId}`}
            name={`wh-in-invoice-${warehouseId}-${row.productId}`}
            type="file"
            accept={IMAGE_FILE_INPUT_ACCEPT}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
            disabled={off}
            onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[7rem]"
            disabled={off}
            onClick={() => setDepoInOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="min-h-11 w-full sm:min-w-[10rem] sm:flex-1" disabled={off}>
            {t("warehouse.depoInSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );

  const transferModal = (
    <Modal
      nested
      open={transferOpen}
      onClose={() => {
        if (pending === "transfer") return;
        setTransferOpen(false);
      }}
      titleId={transferTitleId}
      title={t("warehouse.transferRowTitle")}
      description={t("warehouse.transferModalHint")}
      closeButtonLabel={t("common.close")}
    >
      <form
        id={transferFormId}
        className="mt-4 flex max-h-[min(60dvh,22rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible"
        onSubmit={(e) => void runTransfer(e)}
      >
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("warehouse.transferProduct")}
          </p>
          <p className="mt-0.5 font-semibold text-zinc-900">{row.productName}</p>
          {row.unit ? (
            <p className="mt-1 text-sm text-zinc-600">
              {t("warehouse.productUnit")}: {row.unit}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-medium tabular-nums text-zinc-800">
            {t("warehouse.transferStockOnHand")}: {row.quantity}
          </p>
        </div>
        <Select
          label={t("warehouse.transferBranch")}
          labelRequired
          name={`wh-tr-br-${warehouseId}-${row.productId}`}
          options={branchOptions}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          onBlur={() => {}}
          disabled={off || !branchesReady}
        />
        <Input
          id={`wh-tr-qty-${warehouseId}-${row.productId}`}
          name={`wh-tr-qty-${warehouseId}-${row.productId}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          label={t("warehouse.transferQty")}
          labelRequired
          value={tQty}
          onChange={(e) => setTQty(e.target.value)}
          disabled={off}
        />
        <Input
          id={`wh-tr-note-${warehouseId}-${row.productId}`}
          name={`wh-tr-note-${warehouseId}-${row.productId}`}
          type="text"
          autoComplete="off"
          label={t("warehouse.transferDescription")}
          placeholder={t("warehouse.transferDescriptionPlaceholder")}
          value={tDesc}
          onChange={(e) => setTDesc(e.target.value)}
          disabled={off}
        />
        <Select
          label={t("warehouse.checkedByPersonnel")}
          labelRequired
          name={`wh-tr-ck-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={trCheckedBy}
          onChange={(e) => setTrCheckedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <Select
          label={t("warehouse.approvedByPersonnel")}
          labelRequired
          name={`wh-tr-ap-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={trApprovedBy}
          onChange={(e) => setTrApprovedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[7rem]"
            disabled={off}
            onClick={() => setTransferOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="min-h-11 w-full sm:min-w-[10rem] sm:flex-1" disabled={off}>
            {t("warehouse.transferSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ring-1 ring-zinc-100">
        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug text-zinc-900">{row.productName}</p>
            {row.unit ? (
              <p className="text-xs text-zinc-500">
                {t("warehouse.productUnit")}: {row.unit}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-lg font-semibold tabular-nums text-zinc-900">{row.quantity}</p>
        </div>
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">{actionButtons}</div>
        {depoInModal}
        {transferModal}
      </div>
    );
  }

  return (
    <Fragment>
      <TableRow>
        <TableCell>
          <div className="font-medium text-zinc-900">{row.productName}</div>
        </TableCell>
        <TableCell className="text-zinc-600">{row.unit ?? "—"}</TableCell>
        <TableCell className="text-right text-base font-semibold tabular-nums text-zinc-900">
          {row.quantity}
        </TableCell>
        <TableCell className="min-w-[220px] text-right">{actionButtons}</TableCell>
      </TableRow>
      {depoInModal}
      {transferModal}
    </Fragment>
  );
}
