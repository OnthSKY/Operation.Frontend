"use client";

import type { WarehouseProductStockRow } from "@/types/product";
import {
  WarehouseTransferFreightFields,
  type WarehouseFreightPaymentSource,
} from "@/modules/warehouse/components/WarehouseTransferFreightFields";
import { WarehouseTransferFreightValuationBar } from "@/modules/warehouse/components/WarehouseTransferFreightValuationBar";
import { useI18n } from "@/i18n/context";
import { withWarehousePersonnelPickPlaceholder } from "@/modules/warehouse/lib/warehouse-personnel-select";
import { apiUserFacingMessage } from "@/shared/lib/api-user-facing-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { cn } from "@/lib/cn";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { detailOpenIconButtonClass } from "@/shared/ui/EyeIcon";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { TableCell, TableRow } from "@/shared/ui/Table";
import { BranchTransferListIcon, PlusProductIcon } from "@/shared/ui/WarehouseListIcons";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";

const MANUAL_RECEIVER_PREFIX = "Manual receiver:";

function mergeDescriptionWithManualReceiver(base: string, manualReceiver: string): string | null {
  const cleanBase = base.trim();
  const receiver = manualReceiver.trim();
  if (!cleanBase && !receiver) return null;
  if (!receiver) return cleanBase;
  return cleanBase ? `${cleanBase}\n${MANUAL_RECEIVER_PREFIX} ${receiver}` : `${MANUAL_RECEIVER_PREFIX} ${receiver}`;
}

function parseFreightAmount(input: string): number {
  const normalized = input.replace(/\./g, "").replace(",", ".").trim();
  return Number(normalized);
}

type MoveInput =
  | {
      warehouseId: number;
      movementDate: string;
      direction: "in";
      lines: {
        productId: number;
        quantity: number;
        inboundUnitCost?: number;
        inboundCurrencyCode?: string;
      }[];
      checkedByPersonnelId: number;
      approvedByPersonnelId: number;
      description?: string | null;
      invoicePhoto?: File | null;
    }
  | {
      warehouseId: number;
      movementDate: string;
      direction: "out";
      productId: number;
      quantity: number;
      checkedByPersonnelId: number;
      approvedByPersonnelId: number;
    };

type TransferInput = {
  warehouseId: number;
  branchId: number;
  lines: { productId: number; quantity: number }[];
  movementDate: string;
  description?: string | null;
  transportedByPersonnelId: number;
  sentByPersonnelId: number;
  receivedByPersonnelId: number;
  freightAmount?: number | null;
  freightExpensePaymentSource?: string | null;
  freightExpensePocketPersonnelId?: number | null;
  freightNote?: string | null;
  confirmAllocation?: boolean;
  allocationToken?: string | null;
};

type TransferPreviewInput = {
  warehouseId: number;
  branchId: number;
  lines: { productId: number; quantity: number }[];
  movementDate: string;
  transportedByPersonnelId: number;
  sentByPersonnelId: number;
  receivedByPersonnelId: number;
};

type TransferPreviewResult = {
  allocations: { requestedProductId: number; allocatedProductId: number; quantity: number }[];
  allocationToken: string;
};

type Props = {
  row: WarehouseProductStockRow;
  warehouseId: number;
  branchOptions: { value: string; label: string }[];
  branchesReady: boolean;
  disabled: boolean;
  movementMutate: (input: MoveInput) => Promise<unknown>;
  transferPreviewMutate: (input: TransferPreviewInput) => Promise<TransferPreviewResult>;
  transferMutate: (input: TransferInput) => Promise<unknown>;
  personnelOptions: { value: string; label: string }[];
  variant: "card" | "table";
  /** Ana ürün grubu altında varyant satırı */
  isVariantLine?: boolean;
  /** Ana ürün grubunda: ana ürün koduna doğrudan stok satırı (alt varyantlardan ayrı). */
  groupMainProductLine?: boolean;
};

export function WarehouseStockLine({
  row,
  warehouseId,
  branchOptions,
  branchesReady,
  disabled,
  movementMutate,
  transferPreviewMutate,
  transferMutate,
  personnelOptions,
  variant,
  isVariantLine = false,
  groupMainProductLine = false,
}: Props) {
  const { t, locale } = useI18n();
  const [qty, setQty] = useState("1");
  const [depoInOpen, setDepoInOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [tQty, setTQty] = useState("1");
  const [tDesc, setTDesc] = useState("");
  const [inCheckedBy, setInCheckedBy] = useState("");
  const [inApprovedBy, setInApprovedBy] = useState("");
  const [trTransportedBy, setTrTransportedBy] = useState("");
  const [trSentBy, setTrSentBy] = useState("");
  const [trReceivedBy, setTrReceivedBy] = useState("");
  const [trManualReceiverEnabled, setTrManualReceiverEnabled] = useState(false);
  const [trManualReceiverName, setTrManualReceiverName] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [freightPay, setFreightPay] = useState<WarehouseFreightPaymentSource>("REGISTER");
  const [freightPocket, setFreightPocket] = useState("");
  const [freightNote, setFreightNote] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [inMovementNote, setInMovementNote] = useState("");
  const [inUnitCost, setInUnitCost] = useState("");
  const [inCurrency, setInCurrency] = useState("TRY");
  const [pending, setPending] = useState<null | "in" | "transfer">(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewAllocations, setPreviewAllocations] = useState<
    { requestedProductId: number; allocatedProductId: number; quantity: number }[]
  >([]);

  const personnelSelectOptions = useMemo(
    () => withWarehousePersonnelPickPlaceholder(personnelOptions, t("warehouse.personnelPickPlaceholder")),
    [personnelOptions, t]
  );

  useEffect(() => {
    if (!depoInOpen) return;
    setQty("1");
    setInCheckedBy("");
    setInApprovedBy("");
    setInvoiceFile(null);
    setInMovementNote("");
    setInUnitCost("");
    setInCurrency("TRY");
  }, [depoInOpen]);

  useEffect(() => {
    if (!transferOpen) return;
    setBranchId("");
    setTQty("1");
    setTDesc("");
    setTrTransportedBy("");
    setTrSentBy("");
    setTrReceivedBy("");
    setTrManualReceiverEnabled(false);
    setTrManualReceiverName("");
    setFreightAmount("");
    setFreightPay("REGISTER");
    setFreightPocket("");
    setFreightNote("");
    setPreviewToken(null);
    setPreviewAllocations([]);
  }, [transferOpen]);

  useEffect(() => {
    if (!transferOpen) return;
    setPreviewToken(null);
    setPreviewAllocations([]);
  }, [transferOpen, branchId, tQty, row.productId]);

  const off = disabled || pending !== null;
  const canOut = row.quantity > 0;
  const canTransfer = canOut && branchesReady && branchOptions.length > 0;

  const transferTooltip = useMemo(() => {
    if (!branchesReady) return t("common.loading");
    if (branchOptions.length === 0) return t("branch.noData");
    if (!canOut) return t("warehouse.transferNoBranchStock");
    return t("warehouse.actionBranchProductOut");
  }, [t, branchesReady, branchOptions.length, canOut]);

  const suggestedAvgLabel = useMemo(() => {
    const c = row.suggestedAverageUnitCost;
    if (c == null || !Number.isFinite(c) || c <= 0) return null;
    const cur = row.suggestedAverageCurrencyCode?.trim() || "TRY";
    return formatLocaleAmount(c, locale, cur);
  }, [row.suggestedAverageUnitCost, row.suggestedAverageCurrencyCode, locale]);

  const transferValuationLines = useMemo(() => {
    const n = Number(tQty.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > row.quantity) return [];
    return [{ productId: row.productId, quantity: n }];
  }, [tQty, row.productId, row.quantity]);
  const previewMainGroups = useMemo(() => {
    const groups = new Map<
      number,
      {
        mainProductId: number;
        mainProductName: string;
        quantity: number;
        allocations: Map<number, { productId: number; productName: string; unit: string | null; quantity: number }>;
      }
    >();
    for (const a of previewAllocations) {
      const requestedParentId = row.parentProductId;
      const mainProductId =
        requestedParentId != null && Number.isFinite(requestedParentId) && requestedParentId > 0
          ? requestedParentId
          : a.requestedProductId;
      const mainProductName = row.parentProductName?.trim() || row.productName.trim() || `#${mainProductId}`;
      const existingGroup = groups.get(mainProductId);
      if (existingGroup) {
        existingGroup.quantity += a.quantity;
      } else {
        groups.set(mainProductId, {
          mainProductId,
          mainProductName,
          quantity: a.quantity,
          allocations: new Map(),
        });
      }
      const group = groups.get(mainProductId)!;
      const existingAllocation = group.allocations.get(a.allocatedProductId);
      if (existingAllocation) {
        existingAllocation.quantity += a.quantity;
      } else {
        group.allocations.set(a.allocatedProductId, {
          productId: a.allocatedProductId,
          productName: a.allocatedProductId === row.productId ? row.productName.trim() : `#${a.allocatedProductId}`,
          unit: row.unit?.trim() || null,
          quantity: a.quantity,
        });
      }
    }
    return Array.from(groups.values()).map((group) => ({
      ...group,
      allocations: Array.from(group.allocations.values()),
    }));
  }, [previewAllocations, row.parentProductId, row.parentProductName, row.productId, row.productName, row.unit]);

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
    const costRaw = inUnitCost.trim();
    let inboundUnitCost: number | undefined;
    let inboundCurrencyCode: string | undefined;
    if (costRaw.length > 0) {
      const c = Number(costRaw.replace(",", "."));
      if (!Number.isFinite(c) || c <= 0) {
        notify.error(t("warehouse.invalidUnitCost"));
        return;
      }
      inboundUnitCost = c;
      inboundCurrencyCode = inCurrency.trim() ? inCurrency.trim().toUpperCase() : "TRY";
    }
    setPending("in");
    try {
      await movementMutate({
        warehouseId,
        movementDate: localIsoDate(),
        direction: "in",
        lines: [
          {
            productId: row.productId,
            quantity: n,
            ...(inboundUnitCost != null
              ? { inboundUnitCost, inboundCurrencyCode: inboundCurrencyCode! }
              : {}),
          },
        ],
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        description: inMovementNote.trim() ? inMovementNote.trim() : null,
        invoicePhoto: invoiceFile,
      });
      notify.success(t("toast.warehouseInOk"));
      setDepoInOpen(false);
      setQty("1");
      setInvoiceFile(null);
      setInMovementNote("");
    } catch (e) {
      notify.error(apiUserFacingMessage(e, t));
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
    const transportedBy = Number(trTransportedBy);
    const sentBy = Number(trSentBy);
    const receivedBy = Number(trReceivedBy);
    if (
      !Number.isFinite(transportedBy) ||
      transportedBy <= 0 ||
      !Number.isFinite(sentBy) ||
      sentBy <= 0 ||
      (!trManualReceiverEnabled && (!Number.isFinite(receivedBy) || receivedBy <= 0))
    ) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    if (trManualReceiverEnabled && !trManualReceiverName.trim()) {
      notify.error(t("warehouse.transferManualReceiverRequired"));
      return;
    }
    const frN = parseFreightAmount(freightAmount);
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
    setPending("transfer");
    try {
      if (!previewToken) {
        const preview = await transferPreviewMutate({
          warehouseId,
          branchId: b,
          lines: [{ productId: row.productId, quantity: n }],
          movementDate: localIsoDate(),
          transportedByPersonnelId: transportedBy,
          sentByPersonnelId: sentBy,
          receivedByPersonnelId: trManualReceiverEnabled ? sentBy : receivedBy,
        });
        setPreviewToken(preview.allocationToken);
        setPreviewAllocations(preview.allocations);
        notify.success("Önizleme hazır. Kaydet'e tekrar basarak onaylayın.");
        return;
      }

      await transferMutate({
        warehouseId,
        branchId: b,
        lines: [{ productId: row.productId, quantity: n }],
        movementDate: localIsoDate(),
        description: mergeDescriptionWithManualReceiver(
          tDesc,
          trManualReceiverEnabled ? trManualReceiverName : ""
        ),
        transportedByPersonnelId: transportedBy,
        sentByPersonnelId: sentBy,
        receivedByPersonnelId: trManualReceiverEnabled ? sentBy : receivedBy,
        ...(hasFreight
          ? {
              freightAmount: frN,
              freightExpensePaymentSource: freightPay,
              freightExpensePocketPersonnelId: pocketPid ?? null,
              freightNote: freightNote.trim() ? freightNote.trim() : null,
            }
          : {}),
        ...(previewToken
          ? {
              confirmAllocation: true,
              allocationToken: previewToken,
            }
          : {}),
      });
      notify.success(t("toast.transferToBranchOk"));
      setTransferOpen(false);
      setBranchId("");
      setTQty("1");
      setTDesc("");
    } catch (e) {
      notify.error(apiUserFacingMessage(e, t));
    } finally {
      setPending(null);
    }
  };

  const actionIconClass = "h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]";

  const actionButtons = (
    <div
      className={cn(
        "flex shrink-0 flex-nowrap items-center gap-2",
        variant === "card" ? "justify-end" : "justify-end"
      )}
    >
      <Tooltip content={t("warehouse.actionDepoProductIn")} delayMs={200} className="shrink-0">
        <Button
          type="button"
          variant="primary"
          disabled={off}
          aria-haspopup="dialog"
          aria-expanded={depoInOpen}
          aria-label={t("warehouse.actionDepoProductIn")}
          title={t("warehouse.actionDepoProductIn")}
          onClick={() => setDepoInOpen(true)}
          className={cn(detailOpenIconButtonClass, "rounded-xl shadow-sm")}
        >
          <PlusProductIcon className={actionIconClass} />
        </Button>
      </Tooltip>
      <Tooltip content={transferTooltip} delayMs={280} className="shrink-0">
        <Button
          type="button"
          variant="secondary"
          disabled={off || !canTransfer}
          aria-haspopup="dialog"
          aria-expanded={transferOpen}
          aria-label={t("warehouse.actionBranchProductOut")}
          title={t("warehouse.actionBranchProductOut")}
          onClick={() => setTransferOpen(true)}
          className={cn(
            detailOpenIconButtonClass,
            "rounded-xl shadow-sm",
            !canTransfer && "opacity-45"
          )}
        >
          <BranchTransferListIcon className={actionIconClass} />
        </Button>
      </Tooltip>
    </div>
  );

  const depoInTitleId = `wh-depo-in-title-${warehouseId}-${row.productId}`;
  const depoInFormId = `wh-depo-in-form-${warehouseId}-${row.productId}`;
  const transferTitleId = `wh-transfer-title-${warehouseId}-${row.productId}`;
  const transferFormId = `wh-transfer-form-${warehouseId}-${row.productId}`;
  const depoInDirty =
    qty.trim() !== "1" ||
    inCheckedBy.trim() !== "" ||
    inApprovedBy.trim() !== "" ||
    invoiceFile != null ||
    inUnitCost.trim() !== "";
  const transferDirty =
    branchId.trim() !== "" ||
    tQty.trim() !== "1" ||
    tDesc.trim() !== "" ||
    trTransportedBy.trim() !== "" ||
    trSentBy.trim() !== "" ||
    trReceivedBy.trim() !== "" ||
    trManualReceiverEnabled ||
    trManualReceiverName.trim() !== "" ||
    freightAmount.trim() !== "" ||
    freightPocket.trim() !== "" ||
    freightNote.trim() !== "";
  const requestDepoInClose = useDirtyGuard({
    isDirty: depoInDirty,
    isBlocked: pending === "in",
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => setDepoInOpen(false),
  });
  const requestTransferClose = useDirtyGuard({
    isDirty: transferDirty,
    isBlocked: pending === "transfer",
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => setTransferOpen(false),
  });

  const depoInModal = (
    <Modal
      nested
      bodyScroll
      open={depoInOpen}
      onClose={requestDepoInClose}
      titleId={depoInTitleId}
      title={t("warehouse.actionDepoProductIn")}
      description={t("warehouse.depoInModalHint")}
      closeButtonLabel={t("common.close")}
    >
      <form
        id={depoInFormId}
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => void runDepoIn(e)}
      >
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("warehouse.transferProduct")}
          </p>
          {groupMainProductLine ? (
            <>
              <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{row.productName}</p>
              <p className="mt-1.5 text-xs leading-snug text-zinc-600">{t("warehouse.stockLineParentRowInGroupHint")}</p>
            </>
          ) : isVariantLine && row.parentProductName?.trim() ? (
            <>
              <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{row.productName}</p>
              <p className="mt-1.5 text-sm leading-snug text-zinc-600">
                <span className="text-zinc-500">{t("products.parentProduct")}:</span>{" "}
                <span className="font-medium text-zinc-800">{row.parentProductName}</span>
              </p>
            </>
          ) : (
            <p className="mt-0.5 font-semibold text-zinc-900">{row.productName}</p>
          )}
          {row.unit ? (
            <p className="mt-1 text-sm text-zinc-600">
              {t("warehouse.productUnit")}: {row.unit}
            </p>
          ) : null}
          {suggestedAvgLabel ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("warehouse.suggestedAvgUnitLabel")}: {suggestedAvgLabel}
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
        <Input
          id={`wh-in-cost-${warehouseId}-${row.productId}`}
          name={`wh-in-cost-${warehouseId}-${row.productId}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          label={t("warehouse.depoInUnitCostOptional")}
          value={inUnitCost}
          onChange={(e) => setInUnitCost(e.target.value)}
          disabled={off}
        />
        <p className="text-xs text-zinc-500">{t("warehouse.depoInUnitCostHint")}</p>
        <Input
          id={`wh-in-cur-${warehouseId}-${row.productId}`}
          name={`wh-in-cur-${warehouseId}-${row.productId}`}
          type="text"
          autoComplete="off"
          label={t("warehouse.depoInCurrencyCode")}
          value={inCurrency}
          onChange={(e) => setInCurrency(e.target.value)}
          disabled={off || !inUnitCost.trim()}
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
        <Input
          id={`wh-in-note-${warehouseId}-${row.productId}`}
          name={`wh-in-note-${warehouseId}-${row.productId}`}
          type="text"
          autoComplete="off"
          label={t("warehouse.movementNote")}
          value={inMovementNote}
          onChange={(e) => setInMovementNote(e.target.value)}
          disabled={off}
        />
        <p className="-mt-1 text-xs leading-snug text-zinc-500">{t("warehouse.depoInSharedNoteHint")}</p>
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
            className="block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
            disabled={off}
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
          <Button type="submit" className="min-h-11 w-full sm:w-auto sm:min-w-[10rem]" disabled={off}>
            {t("warehouse.depoInSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );

  const transferModal = (
    <Modal
      nested
      bodyScroll
      open={transferOpen}
      onClose={requestTransferClose}
      titleId={transferTitleId}
      title={t("warehouse.transferRowTitle")}
      description={t("warehouse.transferModalHint")}
      closeButtonLabel={t("common.close")}
    >
      <form
        id={transferFormId}
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => void runTransfer(e)}
      >
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("warehouse.transferProduct")}
          </p>
          {groupMainProductLine ? (
            <>
              <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{row.productName}</p>
              <p className="mt-1.5 text-xs leading-snug text-zinc-600">{t("warehouse.stockLineParentRowInGroupHint")}</p>
            </>
          ) : isVariantLine && row.parentProductName?.trim() ? (
            <>
              <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{row.productName}</p>
              <p className="mt-1.5 text-sm leading-snug text-zinc-600">
                <span className="text-zinc-500">{t("products.parentProduct")}:</span>{" "}
                <span className="font-medium text-zinc-800">{row.parentProductName}</span>
              </p>
            </>
          ) : (
            <p className="mt-0.5 font-semibold text-zinc-900">{row.productName}</p>
          )}
          {row.unit ? (
            <p className="mt-1 text-sm text-zinc-600">
              {t("warehouse.productUnit")}: {row.unit}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-medium tabular-nums text-zinc-800">
            {t("warehouse.transferStockOnHand")}: {row.quantity}
          </p>
          {suggestedAvgLabel ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("warehouse.suggestedAvgUnitLabel")}: {suggestedAvgLabel}
            </p>
          ) : null}
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
        <WarehouseTransferFreightValuationBar
          warehouseId={warehouseId}
          lines={transferValuationLines}
          enabled={transferOpen && !off}
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
          disabled={off}
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
          label={t("warehouse.transportedByPersonnel")}
          labelRequired
          name={`wh-tr-transported-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={trTransportedBy}
          onChange={(e) => setTrTransportedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <Select
          label={t("warehouse.sentByPersonnel")}
          labelRequired
          name={`wh-tr-sent-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={trSentBy}
          onChange={(e) => setTrSentBy(e.target.value)}
          onBlur={() => {}}
          disabled={off}
        />
        <Select
          label={t("warehouse.receivedByPersonnel")}
          labelRequired
          name={`wh-tr-received-${warehouseId}-${row.productId}`}
          options={personnelSelectOptions}
          value={trReceivedBy}
          onChange={(e) => setTrReceivedBy(e.target.value)}
          onBlur={() => {}}
          disabled={off || trManualReceiverEnabled}
        />
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
          <Checkbox
            className="mt-0.5"
            checked={trManualReceiverEnabled}
            disabled={off}
            onCheckedChange={(checked) => setTrManualReceiverEnabled(checked === true)}
          />
          <span>{t("warehouse.transferManualReceiverToggle")}</span>
        </label>
        {trManualReceiverEnabled ? (
          <Input
            type="text"
            autoComplete="off"
            label={t("warehouse.transferManualReceiverName")}
            labelRequired
            value={trManualReceiverName}
            onChange={(e) => setTrManualReceiverName(e.target.value)}
            disabled={off}
          />
        ) : null}
        {previewAllocations.length > 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              {t("warehouse.transferPreviewTitle")}
            </p>
            {previewMainGroups.length > 0 ? (
              <ul className="mt-1.5 space-y-2 text-xs text-zinc-800">
                {previewMainGroups.map((group) => (
                  <li key={`main-${group.mainProductId}`} className="rounded-md border border-zinc-200 bg-white px-2 py-1.5">
                    <p className="font-semibold text-zinc-900">
                      {t("products.parentProduct")}: {group.mainProductName} ·{" "}
                      {formatLocaleAmount(group.quantity, locale)}
                    </p>
                    {group.allocations.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 pl-3 text-zinc-700">
                        {group.allocations.map((a) => (
                          <li key={`allocated-${group.mainProductId}-${a.productId}`}>
                            • {a.productName}: {formatLocaleAmount(a.quantity, locale)}
                            {a.unit ? ` ${a.unit}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="submit" className="min-h-11 w-full sm:w-auto sm:min-w-[10rem]" disabled={off}>
            {t("warehouse.transferSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className={cn(
              "min-w-0",
              isVariantLine &&
                row.parentProductName?.trim() &&
                !groupMainProductLine &&
                "border-l-[3px] border-zinc-300 pl-3"
            )}
          >
            {groupMainProductLine ? (
              <div className="min-w-0 space-y-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500">
                  {t("warehouse.stockLineGroupMainEyebrow")}
                </p>
                <p className="text-base font-semibold leading-snug text-zinc-900 sm:text-[1.0625rem]">
                  {row.productName}
                </p>
                <p className="pt-0.5 text-xs leading-snug text-zinc-600 sm:text-sm">
                  {t("warehouse.stockLineParentRowInGroupHint")}
                </p>
              </div>
            ) : isVariantLine && row.parentProductName?.trim() ? (
              <div className="min-w-0 space-y-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500">
                  {t("warehouse.stockLineSkuEyebrow")}
                </p>
                <p className="text-base font-semibold leading-snug text-zinc-900 sm:text-[1.0625rem]">
                  {row.productName}
                </p>
                <p className="pt-1 text-sm leading-snug text-zinc-600">
                  <span className="text-zinc-500">{t("products.parentProduct")}:</span>{" "}
                  <span className="font-medium text-zinc-800">{row.parentProductName}</span>
                </p>
              </div>
            ) : (
              <p className="text-base font-semibold leading-snug text-zinc-900 sm:text-[1.0625rem]">{row.productName}</p>
            )}
            {row.unit ? (
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                {t("warehouse.productUnit")}: {row.unit}
              </p>
            ) : null}
            {suggestedAvgLabel ? (
              <p className="mt-1 text-[0.65rem] text-zinc-500 sm:text-xs">
                {t("warehouse.suggestedAvgUnitLabel")}: {suggestedAvgLabel}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-xs font-medium text-zinc-500">{t("products.colQty")}</span>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-2xl">
                {row.quantity}
              </span>
            </div>
            {actionButtons}
          </div>
        </div>
        {depoInModal}
        {transferModal}
      </div>
    );
  }

  return (
    <Fragment>
      <TableRow>
        <TableCell>
          <div
            className={cn(
              "min-w-0",
              isVariantLine &&
                row.parentProductName?.trim() &&
                !groupMainProductLine &&
                "border-l-[3px] border-zinc-300 pl-2.5"
            )}
          >
            {groupMainProductLine ? (
              <div className="min-w-0 space-y-0.5">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500">
                  {t("warehouse.stockLineGroupMainEyebrow")}
                </p>
                <p className="text-sm font-semibold leading-snug text-zinc-900">{row.productName}</p>
                <p className="text-xs leading-snug text-zinc-600">{t("warehouse.stockLineParentRowInGroupHint")}</p>
              </div>
            ) : isVariantLine && row.parentProductName?.trim() ? (
              <div className="min-w-0 space-y-0.5">
                <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500">
                  {t("warehouse.stockLineSkuEyebrow")}
                </p>
                <p className="text-sm font-semibold leading-snug text-zinc-900">{row.productName}</p>
                <p className="text-xs leading-snug text-zinc-600">
                  <span className="text-zinc-500">{t("products.parentProduct")}:</span>{" "}
                  <span className="font-medium text-zinc-800">{row.parentProductName}</span>
                </p>
              </div>
            ) : (
              <div className="font-medium text-zinc-900">{row.productName}</div>
            )}
            {suggestedAvgLabel ? (
              <div className="mt-0.5 text-[0.65rem] text-zinc-500">
                {t("warehouse.suggestedAvgUnitLabel")}: {suggestedAvgLabel}
              </div>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-zinc-600">{row.unit ?? "—"}</TableCell>
        <TableCell className="text-right text-base font-semibold tabular-nums text-zinc-900">
          {row.quantity}
        </TableCell>
        <TableCell className="min-w-[6.5rem] text-right sm:min-w-[7.5rem]">{actionButtons}</TableCell>
      </TableRow>
      {depoInModal}
      {transferModal}
    </Fragment>
  );
}
