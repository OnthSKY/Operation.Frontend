"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { companyBrandingLogoUrl, fetchSystemBranding } from "@/modules/admin/api/system-branding-api";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useProductCostHistory } from "@/modules/products/hooks/useProductCostQueries";
import {
  computeOrderAccountTotals,
  type OrderAccountLine,
  type PaidOnBehalfLine,
  type PromoDeductionLine,
} from "@/modules/order-account-statement/lib/compute-order-account-totals";
import {
  buildOrderAccountPdfFileName,
  buildHtmlNodeSinglePagePdfBlob,
} from "@/modules/order-account-statement/lib/download-preview-as-pdf";
import { uploadBranchDocument } from "@/modules/branch/api/branch-documents-api";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { computeSuggestedLineTotal } from "@/modules/order-account-statement/lib/suggested-line-total";
import {
  addOutboundInvoiceReceipt,
  createShipmentInvoice,
  createOutboundInvoice,
  fetchCounterpartySuggestions,
  fetchSalesPriceHistory,
  fetchSalesPriceSuggestion,
  fetchShipmentInvoiceability,
  type CounterpartySuggestionRow,
  type OutboundInvoiceResponse,
  type SalesPriceHistoryRow,
  type SalesPriceSuggestion,
  type ShipmentInvoiceabilityLine,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { OrderAccountStatementActionsSection } from "@/modules/order-account-statement/components/OrderAccountStatementActionsSection";
import { OrderAccountStatementDocumentContentSection } from "@/modules/order-account-statement/components/OrderAccountStatementDocumentContentSection";
import { OrderAccountStatementPreviewSettings } from "@/modules/order-account-statement/components/OrderAccountStatementPreviewSettings";
import { cn } from "@/lib/cn";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { apiFetch } from "@/shared/api/client";
import {
  fetchWarehouseOutboundShipmentMovementForEdit,
  fetchWarehouses,
  type WarehouseOutboundShipmentMovementEditResponse,
} from "@/modules/warehouse/api/warehouses-api";
import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount, formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { Checkbox } from "@/shared/ui/Checkbox";
import { detailOpenIconButtonClass, PlusIcon } from "@/shared/ui/EyeIcon";
import { ModernSelect } from "@/shared/ui/ModernSelect";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { TrashIcon } from "@/shared/ui/TrashIcon";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type LineDraft = OrderAccountLine & {
  amountText: string;
  /** Form alanı: PDF adet sütununa yansır (boş bırakılabilir) */
  quantityText: string;
  /** Form alanı: PDF birim sütununa yansır (ör. kg, koli, adet). */
  unitText?: string;
  /** Tutar önerisi: parça mı kg mı hesaplanacak */
  priceCalcMode: "piece" | "kg";
  qtyText: string;
  unitPriceText: string;
  kgText: string;
  tryPerKgText: string;
  selectedProductId?: number | null;
  parentProductId?: number | null;
  parentProductName?: string | null;
  lineSource?: "shipment" | "manual";
  manualReasonCode?: string | null;
  sourceShipmentLineId?: number | null;
  sourceWarehouseMovementId?: number | null;
};
type PaidDraft = PaidOnBehalfLine & { amountText: string };
type PromoDraft = PromoDeductionLine & { amountText: string };
type ShipmentOption = {
  key: string;
  warehouseId: number;
  warehouseName: string;
  branchName: string;
  movementDate: string;
  movementIds: number[];
  items: Array<{
    movementId: number;
    productId: number;
    parentProductId?: number | null;
    parentProductName?: string | null;
    productName: string;
    quantity: number;
    unit: string;
  }>;
};

type MultiActionStepId = "download" | "invoice" | "system";
type MultiActionStepState = "pending" | "running" | "done" | "skipped";
type MultiActionStep = {
  id: MultiActionStepId;
  label: string;
  state: MultiActionStepState;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLine(): LineDraft {
  return {
    id: newId(),
    description: "",
    quantityText: "",
    unitText: "",
    amount: 0,
    amountText: "",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "",
    unitPriceText: "",
    kgText: "",
    tryPerKgText: "",
    selectedProductId: null,
    parentProductId: null,
    parentProductName: null,
    lineSource: "manual",
    manualReasonCode: "OPS_OTHER",
    sourceShipmentLineId: null,
    sourceWarehouseMovementId: null,
  };
}

function emptyPaid(): PaidDraft {
  return { id: newId(), description: "", amount: 0, amountText: "" };
}

function emptyPromo(): PromoDraft {
  return { id: newId(), description: "", amount: 0, amountText: "" };
}

const LINE_AMOUNT_MISMATCH_TOLERANCE = 0.01;

function computeLineAmountMismatch(
  line: Pick<LineDraft, "quantityText" | "unitText" | "unitPriceText" | "amountText" | "amount">,
  locale: Locale
): { expected: number; actual: number; diff: number } | null {
  const qty = parseLocaleAmount((line.quantityText ?? "").trim(), locale);
  const unitPrice = parseLocaleAmount((line.unitPriceText ?? "").trim(), locale);
  const unit = (line.unitText ?? "").trim();
  const explicitAmount = parseLocaleAmount((line.amountText ?? "").trim(), locale);
  const actual = Number.isFinite(explicitAmount) ? explicitAmount : Number(line.amount) || 0;
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
  if (!unit) return null;
  if (!Number.isFinite(actual) || actual < 0) return null;
  const expected = qty * unitPrice;
  const diff = Math.abs(expected - actual);
  if (diff <= LINE_AMOUNT_MISMATCH_TOLERANCE) return null;
  return { expected, actual, diff };
}

function RequiredMark() {
  return <span className="ml-1 font-semibold text-red-500">*</span>;
}

function ScopePill({ kind }: { kind: "document" | "system" }) {
  if (kind === "document") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Belge
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
      Sistem
    </span>
  );
}

function FlowStepPill({
  index,
  label,
  state = "todo",
}: {
  index: number;
  label: string;
  state?: "done" | "current" | "todo";
}) {
  const isCurrent = state === "current";
  const isDone = state === "done";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
        isCurrent
          ? "border-violet-300 bg-violet-50 text-violet-800"
          : isDone
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-zinc-200 bg-white text-zinc-600"
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
          isCurrent
            ? "bg-violet-600 text-white"
            : isDone
              ? "bg-emerald-600 text-white"
              : "bg-zinc-200 text-zinc-700"
        )}
      >
        {isDone ? "✓" : index}
      </span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

const oasIconSquareBtn = cn(
  detailOpenIconButtonClass,
  "!h-12 !min-h-12 !w-12 sm:!h-12 sm:!w-12 sm:!min-h-12"
);

function OasIconButton({
  "aria-label": ariaLabel,
  title: titleProp,
  onClick,
  disabled,
  children,
  variant = "secondary",
  className,
}: {
  "aria-label": string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "secondary" | "primary" | "ghost";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(oasIconSquareBtn, className)}
      onClick={onClick}
      disabled={disabled}
      title={titleProp}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

function OasTrashButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <OasIconButton
      title={label}
      aria-label={label}
      onClick={onClick}
      className="!border-zinc-200 !text-zinc-700 hover:!border-red-300 hover:!bg-red-50 hover:!text-red-700"
    >
      <TrashIcon className="h-6 w-6 shrink-0 text-current" />
    </OasIconButton>
  );
}

function IcChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 001.06.02l4.5-4.25a.75.75 0 000-1.08l-4.5-4.25a.75.75 0 10-1.04 1.08L11.1 10l-3.93 3.75a.75.75 0 00.04 1.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.22 12.22a.75.75 0 001.06 0L10 8.56l3.72 3.66a.75.75 0 001.06-1.07l-4.25-4.18a.75.75 0 00-1.06 0l-4.25 4.18a.75.75 0 010 1.07z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0L3.29 10.06a.75.75 0 111.06-1.06L9.2 14.2l5.45-5.45a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2.5 5.5v9A2.5 2.5 0 005 17h10a2.5 2.5 0 002.5-2.5v-9L10 1.5 2.5 5.5zm7.5 6.2l6.1-2.3v1.1L10 13.3 1.4 9.1V8l6.1 2.2z" />
    </svg>
  );
}

function IcScale({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 2.5h16V5H2V2.5zm.75 3.25H6V9a4 4 0 108 0V5.75h3.25V5H2.75v.75zM3.5 18h1.2l1-4H5a2.5 2.5 0 00-1.5 4zm12.2 0h-1.2a2.5 2.5 0 001.5-4H15l-1 4H15.7z" />
    </svg>
  );
}

function IcX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M4.3 4.3a.75.75 0 011.06 0L10 8.94l4.64-4.64a.75.75 0 111.06 1.06L11.06 10l4.64 4.64a.75.75 0 01-1.06 1.06L10 11.06l-4.64 4.64a.75.75 0 11-1.06-1.06L8.94 10 4.3 5.36a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3.5 12.5a.75.75 0 011.5 0V15A.5.5 0 005.5 16h9a.5.5 0 00.5-.5v-2.5a.75.75 0 011.5 0V15A2 2 0 0114.5 18h-9A2 2 0 013.5 15v-2.5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M9.25 1.5a.75.75 0 011.5 0V10a.75.75 0 11-1.5 0V1.5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcMaximize({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" strokeWidth="1.8" />
      <path d="M10 10l-4-4M6 6h4M6 6v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10l4-4M18 6h-4M18 6v4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14l-4 4M6 18h4M6 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 14l4 4M18 18h-4M18 18v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcWand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 18l1.2-1.2 1.1.15 3.1-3.1-.6-1.1L2 3.1 3.1 2l8.6 3.4 1.1-.4 2.1 2.1-.4 1.1L18 16.2l-1.2 1-6.1-1.1-1.1 1-2.1-1.1z" />
    </svg>
  );
}

function IcEraser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3.2 9.1a2 2 0 010-2.8L6.1 3.2a1 1 0 011.4 0l3.1 3.1L6.1 10.5 3.2 9.1zM4.2 7.1l2.6 1.1 1.1-1.1L4.1 3.2 3 4.2l3.1 2.1v.8zm8.1 1.1l-2.5 2.4v2.7h-3l-1.5 1.5H17v-2H9.1l.6-.5 2.6-2.4-1.1-1.1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6 2.75A2.25 2.25 0 003.75 5v8A2.25 2.25 0 006 15.25h8A2.25 2.25 0 0016.25 13V5A2.25 2.25 0 0014 2.75H6zm0 1.5h8c.414 0 .75.336.75.75v8a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V5c0-.414.336-.75.75-.75z" />
      <path d="M3.5 5.75a.75.75 0 01.75.75v8.25c0 .69.56 1.25 1.25 1.25h8.25a.75.75 0 010 1.5H5.5A2.75 2.75 0 012.75 14.75V6.5a.75.75 0 01.75-.75z" />
    </svg>
  );
}

function IcLoader({ className }: { className?: string }) {
  return (
    <svg
      className={cn("motion-safe:animate-spin", className)}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle className="opacity-25" cx="10" cy="10" r="8" />
      <path className="opacity-90" d="M10 2a8 8 0 018 8" strokeLinecap="round" />
    </svg>
  );
}

type OasStepVisualTone = "indigo" | "emerald" | "amber" | "sky" | "violet";
type OasStepVisualIcon = "header" | "lines" | "promo" | "paid" | "preview";

const oasStepToneClass: Record<OasStepVisualTone, string> = {
  indigo: "bg-indigo-600 shadow-md shadow-indigo-900/25 ring-1 ring-white/25",
  emerald: "bg-emerald-600 shadow-md shadow-emerald-900/25 ring-1 ring-white/25",
  amber: "bg-amber-500 shadow-md shadow-amber-900/20 ring-1 ring-white/25",
  sky: "bg-sky-600 shadow-md shadow-sky-900/25 ring-1 ring-white/25",
  violet: "bg-violet-600 shadow-md shadow-violet-900/25 ring-1 ring-white/25",
};

function OasStepVisualGlyph({ icon, className }: { icon: OasStepVisualIcon; className?: string }) {
  const g = cn("h-6 w-6 text-white", className);
  switch (icon) {
    case "header":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0015.5 2h-11zM6 5.75A.75.75 0 016.75 5h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 5.75zm0 3.5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "lines":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3.5 5h13v1.25h-13V5zm0 4.25h13v1.25h-13V9.25zm0 4.25h9v1.25h-9v-1.25z" />
        </svg>
      );
    case "promo":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M12.5 2.5a1 1 0 011 1v1.59l1.3 1.3a1 1 0 010 1.41l-6.3 6.3a1 1 0 01-.7.29H6.5a1 1 0 01-1-1v-2.3a1 1 0 01.29-.7l6.3-6.3a1 1 0 011.41 0l1.3 1.3H11.5a1 1 0 011-1zm-3 4.62L6.5 10.12V12h1.88l2.99-2.99-1.87-1.87zM4 16.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "paid":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4 5.5A1.5 1.5 0 015.5 4h9A1.5 1.5 0 0116 5.5v9A1.5 1.5 0 0114.5 16h-9A1.5 1.5 0 014 14.5v-9zm1.5 0v1.13a2.25 2.25 0 000 4.24V14h9v-3.13a2.25 2.25 0 000-4.24V5.5h-9zM7 9.25a.75.75 0 100-1.5.75.75 0 000 1.5zM9.25 10.5h3.5a.75.75 0 000-1.5h-3.5a.75.75 0 000 1.5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "preview":
      return (
        <svg className={g} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M1.5 4.5A1.5 1.5 0 013 3h14a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0117 15h-4.25v1.25H14a.75.75 0 010 1.5H6a.75.75 0 010-1.5h.75V15H3A1.5 1.5 0 011.5 13.5v-9zm1.5 0v9H17v-9H3z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return null;
  }
}

function OasStepVisualBadge({ tone, icon }: { tone: OasStepVisualTone; icon: OasStepVisualIcon }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12",
        oasStepToneClass[tone]
      )}
      aria-hidden
    >
      <OasStepVisualGlyph icon={icon} />
    </div>
  );
}

function StatementFormStep({
  title,
  description,
  actions,
  children,
  collapsible,
  defaultOpen = true,
  collapseLabelExpand,
  collapseLabelCollapse,
  stepVisual,
  scopeKinds,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  collapseLabelExpand?: string;
  collapseLabelCollapse?: string;
  /** Başlık yanında renkli ikon rozeti — adımları ayırt etmek için. */
  stepVisual?: { tone: OasStepVisualTone; icon: OasStepVisualIcon };
  scopeKinds?: Array<"document" | "system">;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h2 className="text-[15px] font-bold leading-snug tracking-tight text-zinc-950">{title}</h2>
      {description ? <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{description}</p> : null}
      {scopeKinds && scopeKinds.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {scopeKinds.map((kind) => (
            <ScopePill key={kind} kind={kind} />
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-950/[0.035]">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        {collapsible ? (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 sm:mt-0"
                aria-expanded={open}
                title={open ? collapseLabelCollapse : collapseLabelExpand}
                aria-label={open ? collapseLabelCollapse : collapseLabelExpand}
              >
                <svg
                  className={cn("h-5 w-5 transition-transform", open ? "rotate-0" : "-rotate-90")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {stepVisual ? <OasStepVisualBadge tone={stepVisual.tone} icon={stepVisual.icon} /> : null}
              {titleBlock}
            </div>
            {actions ? <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              {stepVisual ? <OasStepVisualBadge tone={stepVisual.tone} icon={stepVisual.icon} /> : null}
              {titleBlock}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
          </>
        )}
      </div>
      {(!collapsible || open) ? <div className="p-4 sm:p-5">{children}</div> : null}
    </section>
  );
}

function isoDateStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function isoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildOrderAccountDocumentMetadata(input: {
  orderDocumentKey: string;
  pdfDocumentNo?: string | null;
  companyName: string;
  branchName: string;
  title: string;
  invoiceId?: number | null;
  invoiceNo?: string | null;
  counterpartyLabel?: string | null;
  receivedAdvanceAmount?: number | null;
  receivedAdvancePostToLedger?: boolean | null;
  shipmentWarehouseId?: number | null;
  shipmentPrimaryMovementId?: number | null;
  shipmentMovementIds?: number[] | null;
}): string {
  const parts = [
    "Sipariş-hesap dökümü PDF",
    `orderKey=${input.orderDocumentKey}`,
    `pdfDocumentNo=${input.pdfDocumentNo?.trim() || input.orderDocumentKey}`,
    `company=${input.companyName || "—"}`,
    `branch=${input.branchName || "—"}`,
    `title=${input.title || "—"}`,
  ];
  if (input.invoiceId && Number.isFinite(input.invoiceId)) parts.push(`invoiceId=${input.invoiceId}`);
  if (input.invoiceNo?.trim()) parts.push(`invoiceNo=${input.invoiceNo.trim()}`);
  if (input.counterpartyLabel?.trim()) parts.push(`counterparty=${input.counterpartyLabel.trim()}`);
  if (Number.isFinite(input.shipmentWarehouseId) && (input.shipmentWarehouseId ?? 0) > 0) {
    parts.push(`shipmentWarehouseId=${input.shipmentWarehouseId}`);
  }
  if (Number.isFinite(input.shipmentPrimaryMovementId) && (input.shipmentPrimaryMovementId ?? 0) > 0) {
    parts.push(`shipmentPrimaryMovementId=${input.shipmentPrimaryMovementId}`);
  }
  if (Array.isArray(input.shipmentMovementIds) && input.shipmentMovementIds.length > 0) {
    const ids = input.shipmentMovementIds.filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length > 0) parts.push(`shipmentMovementIds=${ids.join(",")}`);
  }
  if (Number.isFinite(input.receivedAdvanceAmount) && (input.receivedAdvanceAmount ?? 0) > 0) {
    parts.push(`receivedAdvance=${input.receivedAdvanceAmount}`);
    if (input.receivedAdvancePostToLedger != null) {
      parts.push(`receivedAdvanceLedger=${input.receivedAdvancePostToLedger ? "yes" : "no"}`);
    }
  }
  return parts.join(" · ");
}


function parseLines(lines: LineDraft[], locale: Locale): OrderAccountLine[] {
  const resolveLineAmount = (line: LineDraft): number => {
    const explicitAmount = parseLocaleAmount((line.amountText ?? "").trim(), locale);
    if (Number.isFinite(explicitAmount) && explicitAmount > 0) return explicitAmount;

    const qty = parseLocaleAmount((line.quantityText ?? "").trim(), locale);
    const unitPrice = parseLocaleAmount((line.unitPriceText ?? "").trim(), locale);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
      return qty * unitPrice;
    }

    return Number.isFinite(line.amount) && line.amount > 0 ? line.amount : 0;
  };

  return lines.map((l) => {
    const q = (l.quantityText ?? "").trim();
    const unit = (l.unitText ?? "").trim();
    const u = (l.unitPriceText ?? "").trim();
    return {
      id: l.id,
      description: l.description.trim(),
      amount: resolveLineAmount(l),
      isGift: l.isGift,
      lineSource: l.lineSource ?? "manual",
      manualReasonCode: l.manualReasonCode ?? "OPS_OTHER",
      sourceShipmentLineId: l.sourceShipmentLineId ?? null,
      sourceWarehouseMovementId: l.sourceWarehouseMovementId ?? null,
      ...(q ? { quantityText: q } : {}),
      ...(unit ? { unitText: unit } : {}),
      ...(u ? { unitPriceText: u } : {}),
    };
  });
}

function parsePaid(lines: PaidDraft[], locale: Locale): PaidOnBehalfLine[] {
  return lines.map((l) => ({
    id: l.id,
    description: l.description.trim(),
    amount: parseLocaleAmount(l.amountText, locale) || 0,
  }));
}

function parsePromo(lines: PromoDraft[], locale: Locale): PromoDeductionLine[] {
  return lines.map((l) => ({
    id: l.id,
    description: l.description.trim(),
    amount: parseLocaleAmount(l.amountText, locale) || 0,
  }));
}

const SAMPLE_LINES: Omit<LineDraft, "id">[] = [
  {
    description: "304 Küvet Dondurma (1216 kg * 600 TL/kg)",
    amount: 729_600,
    amountText: "",
    quantityText: "1216",
    unitText: "kg",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "1216",
    unitPriceText: "600",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "5 kg Kese Kağıdı",
    amount: 1_250,
    amountText: "",
    quantityText: "5",
    unitText: "kg",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "5",
    unitPriceText: "250",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "40 Koli Kornet",
    amount: 40_400,
    amountText: "",
    quantityText: "40",
    unitText: "koli",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "40",
    unitPriceText: "1010",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "3 Adet El Kaşığı",
    amount: 6_000,
    amountText: "",
    quantityText: "3",
    unitText: "adet",
    isGift: true,
    priceCalcMode: "piece",
    qtyText: "3",
    unitPriceText: "2000",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "4 Adet Sos (40 kg)",
    amount: 8_000,
    amountText: "",
    quantityText: "4",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "4",
    unitPriceText: "2000",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "4 Koli Fıstık (40 kg)",
    amount: 4_800,
    amountText: "",
    quantityText: "4",
    unitText: "koli",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "4",
    unitPriceText: "1200",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "10 Adet Tişört",
    amount: 5_000,
    amountText: "",
    quantityText: "10",
    unitText: "adet",
    isGift: true,
    priceCalcMode: "piece",
    qtyText: "10",
    unitPriceText: "500",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "15 Koli Helva",
    amount: 9_000,
    amountText: "",
    quantityText: "15",
    unitText: "koli",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "15",
    unitPriceText: "600",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "5 kg Jelatin",
    amount: 900,
    amountText: "",
    quantityText: "5",
    unitText: "kg",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "5",
    unitPriceText: "180",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "1 Koli Islak Mendil (2000 Adet)",
    amount: 2_700,
    amountText: "",
    quantityText: "1",
    unitText: "koli",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "1",
    unitPriceText: "2700",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "2 Paket Strafor (72 Adet)",
    amount: 2_500,
    amountText: "",
    quantityText: "2",
    unitText: "paket",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "2",
    unitPriceText: "1250",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "125 Adet Büyük Çanta",
    amount: 875,
    amountText: "",
    quantityText: "125",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "125",
    unitPriceText: "7",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "125 Adet Küçük Çanta",
    amount: 625,
    amountText: "",
    quantityText: "125",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "125",
    unitPriceText: "5",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "2 Takım Etiket",
    amount: 4_000,
    amountText: "",
    quantityText: "2",
    unitText: "takım",
    isGift: true,
    priceCalcMode: "piece",
    qtyText: "2",
    unitPriceText: "2000",
    kgText: "",
    tryPerKgText: "",
  },
];

/** Kısa örnek liste şablonu (kafe / perakende). */
const SAMPLE_CAFE: Omit<LineDraft, "id">[] = [
  {
    description: "Kahve çekirdek (5 kg)",
    amount: 12_500,
    amountText: "",
    quantityText: "5",
    unitText: "kg",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "5",
    unitPriceText: "2500",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Servis malzemesi paketi",
    amount: 3_200,
    amountText: "",
    quantityText: "32",
    unitText: "paket",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "32",
    unitPriceText: "100",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Hoş geldin indirimi",
    amount: 500,
    amountText: "",
    quantityText: "1",
    unitText: "adet",
    isGift: true,
    priceCalcMode: "piece",
    qtyText: "1",
    unitPriceText: "500",
    kgText: "",
    tryPerKgText: "",
  },
];

/** Fırın / üretim satırları örneği. */
const SAMPLE_BAKERY: Omit<LineDraft, "id">[] = [
  {
    description: "Tip 650 un (25 kg)",
    amount: 18_500,
    amountText: "",
    quantityText: "25",
    unitText: "kg",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "25",
    unitPriceText: "740",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Kuru maya (500 g x 20)",
    amount: 4_200,
    amountText: "",
    quantityText: "20",
    unitText: "paket",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "20",
    unitPriceText: "210",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Kese kağıdı (baskılı)",
    amount: 6_800,
    amountText: "",
    quantityText: "200",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "200",
    unitPriceText: "34",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Poşet taşıma torbası",
    amount: 2_100,
    amountText: "",
    quantityText: "30",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "30",
    unitPriceText: "70",
    kgText: "",
    tryPerKgText: "",
  },
];

/** Catering / etkinlik satırları örneği. */
const SAMPLE_CATERING: Omit<LineDraft, "id">[] = [
  {
    description: "Açık büfe kişi başı (120 kişi)",
    amount: 96_000,
    amountText: "",
    quantityText: "120",
    unitText: "kişi",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "120",
    unitPriceText: "800",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "İkram içecek paketi",
    amount: 14_500,
    amountText: "",
    quantityText: "145",
    unitText: "paket",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "145",
    unitPriceText: "100",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Servis personeli (8 saat)",
    amount: 22_000,
    amountText: "",
    quantityText: "8",
    unitText: "saat",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "8",
    unitPriceText: "2750",
    kgText: "",
    tryPerKgText: "",
  },
  {
    description: "Tek kullanımlık servis seti",
    amount: 8_750,
    amountText: "",
    quantityText: "250",
    unitText: "adet",
    isGift: false,
    priceCalcMode: "piece",
    qtyText: "250",
    unitPriceText: "35",
    kgText: "",
    tryPerKgText: "",
  },
];

export type StatementLayoutVariant =
  | "corporate"
  | "compact"
  | "minimal"
  | "invoiceClassic"
  | "eInvoice"
  | "proforma"
  | "dispatch"
  | "serviceForm";

export type OrderAccountContentPreset = "custom" | "tekin" | "cafe" | "bakery" | "catering";

function LineCalcBlock({
  line,
  locale,
  t,
  setLines,
  className,
  compact,
  ultraCompact,
}: {
  line: LineDraft;
  locale: Locale;
  t: (key: string) => string;
  setLines: Dispatch<SetStateAction<LineDraft[]>>;
  className?: string;
  /** Birden fazla satırda formu sıkılaştırır */
  compact?: boolean;
  /** Çok sayıda satırda (4+) ek daraltma */
  ultraCompact?: boolean;
}) {
  const [calcOpen, setCalcOpen] = useState(false);
  const suggestion = useMemo(() => {
    const fromMode = computeSuggestedLineTotal(
      {
        ...line,
        qtyText: line.qtyText.trim() ? line.qtyText : line.quantityText,
      },
      locale
    );
    if (fromMode != null) return fromMode;
    // Fallback: satır modu farklı olsa bile tablo adet + birim fiyatından öneri üret.
    return computeSuggestedLineTotal(
      {
        ...line,
        priceCalcMode: "piece",
        qtyText: line.quantityText,
        unitPriceText: line.unitPriceText,
      },
      locale
    );
  }, [line, locale]);

  const patch = useCallback(
    (p: Partial<LineDraft>) => {
      setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, ...p } : x)));
    },
    [line.id, setLines]
  );

  const apply = useCallback(() => {
    if (suggestion == null || !Number.isFinite(suggestion)) return;
    const qtyForPdf = (line.priceCalcMode === "piece" ? line.qtyText : line.kgText).trim();
    const unitPriceForPdf = (line.priceCalcMode === "piece" ? line.unitPriceText : line.tryPerKgText).trim();
    const unitForPdf = line.priceCalcMode === "piece" ? line.unitText ?? "" : "kg";
    setLines((prev) =>
      prev.map((x) =>
        x.id === line.id
          ? {
              ...x,
              amount: suggestion,
              amountText: formatLocaleAmountInput(suggestion, locale),
              quantityText: qtyForPdf,
              unitPriceText: unitPriceForPdf,
              unitText: unitForPdf,
            }
          : x
      )
    );
    setCalcOpen(false);
  }, [line.id, line.kgText, line.priceCalcMode, line.qtyText, line.tryPerKgText, line.unitPriceText, line.unitText, locale, setLines, suggestion]);

  const modePiece = line.priceCalcMode === "piece";
  const c = Boolean(compact);
  const u = Boolean(ultraCompact);
  const hideLabel = t("reports.orderAccountStatementPriceCalcToggleHide");
  const showLabel = t("reports.orderAccountStatementPriceCalcToggleShow");
  const wrap = cn("min-w-0", u && "origin-top scale-[0.97]", className);

  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setCalcOpen(true)}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-dashed border-zinc-300 bg-white text-left text-zinc-800 transition",
          u ? "px-1.5 py-1" : c ? "px-2 py-1.5" : "px-2.5 py-2",
          "hover:border-zinc-400 hover:bg-zinc-50"
        )}
      >
        <span className={cn("min-w-0 font-medium text-zinc-600", u ? "text-[8px]" : c ? "text-[9px]" : "text-xs")}>
          {showLabel}
        </span>
        <IcChevronRight className={u ? "h-4 w-4 shrink-0 text-zinc-500" : "h-5 w-5 shrink-0 text-zinc-500"} />
      </button>

      {suggestion != null ? (
        <p className={cn("mt-1 text-zinc-500", u ? "text-[8px]" : "text-[9px]")}>
          {t("reports.orderAccountStatementSuggestedTotal")}: {formatLocaleAmount(suggestion, locale, "TRY")}
        </p>
      ) : null}

      {calcOpen
        ? createPortal(
            <div
              role="presentation"
              className={cn(
                "fixed inset-0 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4",
                OVERLAY_Z_TW.modal
              )}
              onClick={() => setCalcOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("reports.orderAccountStatementCalcHint")}
                className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight text-zinc-950">
                      {t("reports.orderAccountStatementCalcHint")}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {modePiece ? t("reports.orderAccountStatementCalcHintPiece") : t("reports.orderAccountStatementCalcHintKg")}
                    </p>
                  </div>
                  <OasIconButton
                    title={hideLabel}
                    aria-label={hideLabel}
                    onClick={() => setCalcOpen(false)}
                    className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14"
                  >
                    <IcX className="h-8 w-8" />
                  </OasIconButton>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5">
                  <p className="text-xs font-medium text-zinc-700">{t("reports.orderAccountStatementPriceModeLabel")}</p>
                  <div className="flex gap-2">
                    <OasIconButton
                      title={t("reports.orderAccountStatementPriceModePiece")}
                      aria-label={t("reports.orderAccountStatementPriceModePiece")}
                      onClick={() => patch({ priceCalcMode: "piece" })}
                      className={cn(
                        "!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14",
                        modePiece ? "!border-zinc-800 !bg-zinc-900 !text-white" : "!text-zinc-600 hover:!bg-zinc-50"
                      )}
                    >
                      <IcBox className="h-8 w-8" />
                    </OasIconButton>
                    <OasIconButton
                      title={t("reports.orderAccountStatementPriceModeKg")}
                      aria-label={t("reports.orderAccountStatementPriceModeKg")}
                      onClick={() => patch({ priceCalcMode: "kg" })}
                      className={cn(
                        "!h-14 !min-h-14 !w-14 sm:!h-14 sm:!w-14 sm:!min-h-14",
                        !modePiece ? "!border-zinc-800 !bg-zinc-900 !text-white" : "!text-zinc-600 hover:!bg-zinc-50"
                      )}
                    >
                      <IcScale className="h-8 w-8" />
                    </OasIconButton>
                  </div>

                  {modePiece ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementUnit")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={line.unitText ?? ""}
                          onChange={(e) => patch({ unitText: e.target.value })}
                          placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementQty")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.qtyText}
                          onChange={(e) => patch({ qtyText: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementUnitPrice")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.unitPriceText}
                          onChange={(e) => patch({ unitPriceText: e.target.value })}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            patch({ unitPriceText: formatLocaleAmountInput(n, locale) });
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementKg")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.kgText}
                          onChange={(e) => patch({ kgText: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs text-zinc-600">
                        {t("reports.orderAccountStatementTryPerKg")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums"
                          value={line.tryPerKgText}
                          onChange={(e) => patch({ tryPerKgText: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {t("reports.orderAccountStatementSuggestedTotal")}:{" "}
                    <strong className="tabular-nums text-zinc-950">
                      {suggestion != null ? formatLocaleAmount(suggestion, locale, "TRY") : "—"}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 sm:px-5">
                  <Button type="button" variant="ghost" className="min-h-11 px-4" onClick={() => setCalcOpen(false)}>
                    {t("common.close")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-11 gap-2 px-4"
                    onClick={apply}
                    disabled={suggestion == null || !Number.isFinite(suggestion)}
                  >
                    <IcCheck className="h-5 w-5" />
                    <span>{t("reports.orderAccountStatementApplySuggestion")}</span>
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type StatementPaperProps = {
  layoutVariant: StatementLayoutVariant;
  locale: Locale;
  companyName: string;
  branchName: string;
  emblemDataUrl?: string;
  documentTitle: string;
  showDocumentTagline: boolean;
  issuedDate: string;
  lines: OrderAccountLine[];
  showQuantityColumn: boolean;
  promoLines: PromoDeductionLine[];
  totals: ReturnType<typeof computeOrderAccountTotals>;
  advanceDeduction: number;
  previousBalance: number;
  paidOnBehalf: PaidOnBehalfLine[];
  labels: {
    headerCompany: string;
    headerBranch: string;
    documentTagline: string;
    issuedPrefix: string;
    productCol: string;
    qtyCol: string;
    unitCol: string;
    unitPriceCol: string;
    amountCol: string;
    gross: string;
    giftTotal: string;
    advance: string;
    subtotal: string;
    previousBalance: string;
    net: string;
    giftSuffix: string;
    paidSection: string;
    promoLineFallback: string;
  };
  paymentInfo?: {
    iban?: string | null;
    accountHolder?: string | null;
    bankName?: string | null;
    paymentNote?: string | null;
    showOnPdf?: boolean;
  };
  paymentLabels: {
    section: string;
    iban: string;
    accountHolder: string;
    bankName: string;
    paymentNote: string;
  };
  documentMeta: {
    referenceId: string;
    systemDocumentId?: number | null;
    generationLabel: string;
  };
  emptyHint: string;
};

const StatementPaper = forwardRef<HTMLDivElement, StatementPaperProps>(function StatementPaper(
  {
    layoutVariant,
    locale,
    companyName,
    branchName,
    emblemDataUrl,
    documentTitle,
    showDocumentTagline,
    issuedDate,
    lines,
    showQuantityColumn,
    promoLines,
    totals,
    advanceDeduction,
    previousBalance,
    paidOnBehalf,
    labels,
    paymentInfo,
    paymentLabels,
    documentMeta,
    emptyHint,
  },
  ref
) {
  const fmt = (n: number) => formatLocaleAmount(n, locale, "TRY");
  const dense = layoutVariant === "compact";
  const minimal = layoutVariant === "minimal";
  const hasQty = showQuantityColumn;
  const invoiceLike = layoutVariant === "invoiceClassic" || layoutVariant === "eInvoice";
  const hasDeductions = totals.giftLinesSum > 0 || promoLines.length > 0 || advanceDeduction > 0;
  const showSubtotalRow = hasDeductions || totals.subtotal !== totals.grossTotal;
  const paymentIban = (paymentInfo?.iban ?? "").trim();
  const paymentAccountHolder = (paymentInfo?.accountHolder ?? "").trim();
  const paymentBankName = (paymentInfo?.bankName ?? "").trim();
  const paymentNote = (paymentInfo?.paymentNote ?? "").trim();
  const showPaymentSection =
    Boolean(paymentInfo?.showOnPdf) &&
    (paymentIban.length > 0 ||
      paymentAccountHolder.length > 0 ||
      paymentBankName.length > 0 ||
      paymentNote.length > 0);

  const paperThemeClass =
    layoutVariant === "invoiceClassic"
      ? "border-slate-400 shadow-[0_0_0_1px_rgba(71,85,105,0.2)]"
      : layoutVariant === "eInvoice"
      ? "border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
      : layoutVariant === "proforma"
        ? "border-sky-300 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
        : layoutVariant === "dispatch"
          ? "border-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
          : layoutVariant === "serviceForm"
            ? "border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]"
            : minimal
              ? "border-zinc-300 shadow-none"
              : "border-zinc-400 shadow-sm";

  const headerThemeClass =
    layoutVariant === "invoiceClassic"
      ? "rounded-xl border-slate-300 bg-gradient-to-b from-slate-50 to-white shadow-sm ring-1 ring-slate-300/60"
      : layoutVariant === "eInvoice"
      ? "rounded-xl border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-sm ring-1 ring-emerald-200/50"
      : layoutVariant === "proforma"
        ? "rounded-xl border-sky-200 bg-gradient-to-b from-sky-50 to-white shadow-sm ring-1 ring-sky-200/55"
        : layoutVariant === "dispatch"
          ? "rounded-xl border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm ring-1 ring-amber-200/55"
          : layoutVariant === "serviceForm"
            ? "rounded-xl border-violet-200 bg-gradient-to-b from-violet-50 to-white shadow-sm ring-1 ring-violet-200/55"
            : minimal
              ? "rounded-lg border-zinc-200 bg-zinc-50 shadow-none ring-0"
              : "rounded-xl border-zinc-200 bg-gradient-to-b from-zinc-50 to-white shadow-sm ring-1 ring-zinc-950/[0.04]";

  const titleBandClass =
    layoutVariant === "invoiceClassic"
      ? "border border-slate-400 bg-slate-100 px-3 py-2 font-black uppercase tracking-tight text-slate-950 shadow-sm"
      : layoutVariant === "eInvoice"
      ? "border border-emerald-300 bg-emerald-50/70 px-3 py-2 font-black uppercase tracking-tight text-emerald-950 shadow-sm"
      : layoutVariant === "proforma"
        ? "border border-sky-300 bg-sky-50/75 px-3 py-2 font-black uppercase tracking-tight text-sky-950 shadow-sm"
        : layoutVariant === "dispatch"
          ? "border border-amber-300 bg-amber-50/75 px-3 py-2 font-black uppercase tracking-tight text-amber-950 shadow-sm"
          : layoutVariant === "serviceForm"
            ? "border border-violet-300 bg-violet-50/75 px-3 py-2 font-black uppercase tracking-tight text-violet-950 shadow-sm"
            : "border border-zinc-300 bg-white px-3 py-2 font-black uppercase tracking-tight text-zinc-950 shadow-sm";

  const tableHeadClass =
    layoutVariant === "invoiceClassic"
      ? "grid rounded-t-lg bg-slate-900 font-bold uppercase tracking-wide text-slate-50"
      : layoutVariant === "eInvoice"
      ? "grid rounded-t-lg bg-emerald-900 font-bold uppercase tracking-wide text-emerald-50"
      : layoutVariant === "proforma"
        ? "grid rounded-t-lg bg-sky-900 font-bold uppercase tracking-wide text-sky-50"
        : layoutVariant === "dispatch"
          ? "grid rounded-t-lg bg-amber-900 font-bold uppercase tracking-wide text-amber-50"
          : layoutVariant === "serviceForm"
            ? "grid rounded-t-lg bg-violet-900 font-bold uppercase tracking-wide text-violet-50"
            : "grid rounded-t-lg bg-zinc-900 font-bold uppercase tracking-wide text-zinc-50";

  const netRowClass =
    layoutVariant === "invoiceClassic"
      ? "mt-2 flex justify-between gap-3 rounded-lg bg-slate-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
      : layoutVariant === "eInvoice"
      ? "mt-2 flex justify-between gap-3 rounded-lg bg-emerald-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
      : layoutVariant === "proforma"
        ? "mt-2 flex justify-between gap-3 rounded-lg bg-sky-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
        : layoutVariant === "dispatch"
          ? "mt-2 flex justify-between gap-3 rounded-lg bg-amber-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
          : layoutVariant === "serviceForm"
            ? "mt-2 flex justify-between gap-3 rounded-lg bg-violet-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3"
            : "mt-2 flex justify-between gap-3 rounded-lg bg-zinc-950 px-3 py-2.5 font-black uppercase tracking-wide text-white shadow-md sm:px-4 sm:py-3";

  function rowLabel(l: OrderAccountLine): string {
    const d = l.description.trim();
    if (!d) return "—";
    return l.isGift ? `${d} (${labels.giftSuffix})` : d;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "box-border w-full border bg-white text-zinc-900 antialiased",
        paperThemeClass,
        dense
          ? "px-5 py-5 text-[10px] leading-tight sm:px-6 sm:py-6"
          : "px-5 py-6 text-[11px] leading-normal sm:px-8 sm:py-8 sm:text-xs md:px-10 md:py-10"
      )}
    >
      <header
        className={cn(
          "border px-4 py-4 text-center sm:px-6 sm:py-5",
          headerThemeClass,
          dense ? "px-3 py-3 sm:px-4" : ""
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-h-11 items-start">
            {emblemDataUrl ? (
              <img
                src={emblemDataUrl}
                alt=""
                className={cn(
                  "rounded-lg border border-zinc-200 bg-white object-contain p-1 shadow-sm",
                  dense ? "h-20 w-20" : "h-28 w-28 sm:h-32 sm:w-32"
                )}
              />
            ) : null}
          </div>
          <div className="rounded-lg border border-zinc-300 bg-white shadow-sm">
            <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-2.5 py-1.5 text-zinc-600">
              <span className={cn("font-medium", dense ? "text-[9px]" : "text-[10px] sm:text-xs")}>{labels.issuedPrefix}</span>
              <span
                className={cn(
                  "rounded border border-zinc-300 bg-zinc-50 font-semibold tabular-nums text-zinc-800",
                  dense ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[11px] sm:text-xs"
                )}
              >
                {issuedDate}
              </span>
            </div>
            <div className={cn("px-2.5 py-1.5 text-right text-zinc-700", dense ? "text-[8px]" : "text-[9px] sm:text-[10px]")}>
              <span className="font-semibold">{documentMeta.generationLabel}</span>
              <span className="mx-1.5 text-zinc-400">|</span>
              <span className="font-mono">REF: {documentMeta.referenceId}</span>
              {documentMeta.systemDocumentId ? (
                <>
                  <span className="mx-1.5 text-zinc-400">|</span>
                  <span className="font-mono">DOC: {documentMeta.systemDocumentId}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className={cn("pb-2 text-center", invoiceLike ? "border-b-2 border-zinc-900" : "border-b-2 border-zinc-900/85")}>
            <p
              className={cn(
                "font-black uppercase tracking-tight text-zinc-950",
                dense ? "text-sm leading-tight" : "text-lg leading-tight sm:text-2xl"
              )}
            >
              {companyName.trim() || "—"}
            </p>
            <p
              className={cn(
                "mt-1 font-medium text-zinc-700",
                dense ? "text-[10px]" : "text-xs sm:text-sm"
              )}
            >
              {branchName.trim() || "—"}
            </p>
          </div>
        </div>
        {showDocumentTagline ? (
          <p
            className={cn(
              "mt-3 font-semibold uppercase tracking-[0.18em] text-zinc-500",
              dense ? "text-[8px]" : "text-[10px] sm:text-[11px]"
            )}
          >
            {labels.documentTagline}
          </p>
        ) : null}
        <div className={cn("mx-auto max-w-2xl", showDocumentTagline ? "mt-3" : "mt-3")}>
          <p
            className={cn(
              titleBandClass,
              dense ? "text-xs" : "text-sm sm:text-lg"
            )}
          >
            {documentTitle.trim() || "—"}
          </p>
        </div>
      </header>

      <div className="mt-5">
        <div
          className={cn(
            tableHeadClass,
            hasQty
              ? "grid-cols-[minmax(0,1fr)_3.75rem_4.25rem_5.5rem_6.5rem] gap-x-2 sm:gap-x-3"
              : "grid-cols-[minmax(0,1fr)_auto] gap-x-3",
            dense ? "px-2.5 py-2 text-[8px]" : "px-3 py-2.5 text-[9px] sm:px-5 sm:py-3 sm:text-[10px]"
          )}
        >
          <span className="min-w-0">{labels.productCol}</span>
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.unitCol}</span> : null}
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.qtyCol}</span> : null}
          {hasQty ? <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">{labels.unitPriceCol}</span> : null}
          <span className="whitespace-nowrap text-right tabular-nums text-zinc-100">{labels.amountCol}</span>
        </div>
        <ul className="divide-y divide-zinc-200 rounded-b-lg border border-t-0 border-zinc-200 px-3 sm:px-5">
          {lines.length === 0 ? (
            <li className="px-1 py-6 text-center italic text-zinc-400">{emptyHint}</li>
          ) : (
            lines.map((l, i) => {
              const q = (l.quantityText ?? "").trim();
              const unit = (l.unitText ?? "").trim();
              const u = (l.unitPriceText ?? "").trim();
              return (
                <li
                  key={l.id}
                  className={cn(
                    "grid gap-x-2 py-2 sm:gap-x-3",
                    hasQty
                      ? "grid-cols-[minmax(0,1fr)_3.75rem_4.25rem_5.5rem_6.5rem] items-baseline"
                      : "grid-cols-[minmax(0,1fr)_auto]",
                    i % 2 === 1 && "bg-zinc-50/90",
                    dense ? "py-2" : "py-2.5 sm:py-3"
                  )}
                >
                  <span className="min-w-0 truncate text-zinc-800">{rowLabel(l)}</span>
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !unit && "text-zinc-300"
                      )}
                    >
                      {unit || "—"}
                    </span>
                  ) : null}
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !q && "text-zinc-300"
                      )}
                    >
                      {q || "—"}
                    </span>
                  ) : null}
                  {hasQty ? (
                    <span
                      className={cn(
                        "min-w-0 whitespace-nowrap text-right tabular-nums text-zinc-800",
                        !u && "text-zinc-300"
                      )}
                    >
                      {u || "—"}
                    </span>
                  ) : null}
                  <span className="whitespace-nowrap text-right font-medium tabular-nums text-zinc-900">
                    {fmt(l.amount)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div
        className={cn(
          "mt-5 space-y-1 border-t border-zinc-200 px-1 pt-4 sm:px-2",
          dense ? "space-y-0.5" : "space-y-1"
        )}
      >
        <div
          className={cn(
            "flex justify-between gap-3 text-zinc-800",
            dense ? "text-[10px]" : "text-[11px] sm:text-xs"
          )}
        >
          <span>{labels.gross}</span>
          <span className="shrink-0 tabular-nums font-black text-zinc-950">{fmt(totals.grossTotal)}</span>
        </div>
        {totals.giftLinesSum > 0 ? (
          <div className="flex justify-between gap-3 text-zinc-800">
            <span>{labels.giftTotal}</span>
            <span className="shrink-0 tabular-nums">−{fmt(totals.giftLinesSum)}</span>
          </div>
        ) : null}
        {promoLines.map((p) => (
          <div key={p.id} className="flex justify-between gap-3 text-zinc-800">
            <span className="min-w-0 break-words">{p.description.trim() || labels.promoLineFallback}</span>
            <span className="shrink-0 tabular-nums">−{fmt(p.amount)}</span>
          </div>
        ))}
        {advanceDeduction > 0 ? (
          <div className="flex justify-between gap-3 text-zinc-800">
            <span>{labels.advance}</span>
            <span className="shrink-0 tabular-nums">−{fmt(advanceDeduction)}</span>
          </div>
        ) : null}
        {showSubtotalRow ? (
          <div
            className={cn(
              "flex justify-between gap-3 border-t border-zinc-300 pt-2 font-black text-zinc-950",
              dense ? "text-[10px]" : "text-[11px] sm:text-xs"
            )}
          >
            <span>{labels.subtotal}</span>
            <span className="shrink-0 tabular-nums">{fmt(totals.subtotal)}</span>
          </div>
        ) : null}
        {previousBalance > 0 ? (
          <div
            className={cn(
              "mt-1 flex justify-between gap-3 rounded-md border border-zinc-300 bg-zinc-100/80 px-2 py-1.5 font-semibold text-zinc-900",
              dense ? "text-[10px]" : "text-[11px] sm:text-xs"
            )}
          >
            <span>{labels.previousBalance}</span>
            <span className="shrink-0 tabular-nums">+{fmt(previousBalance)}</span>
          </div>
        ) : null}
        {paidOnBehalf.length > 0 ? (
          <div className="border-t border-dashed border-zinc-300 pt-2">
            <p
              className={cn(
                "mb-2 inline-block rounded-md bg-zinc-200 px-2 py-1 font-black uppercase tracking-wide text-zinc-900",
                dense ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              )}
            >
              {labels.paidSection}
            </p>
            {paidOnBehalf.map((p) => (
              <div key={p.id} className="flex justify-between gap-3 py-0.5 text-zinc-800">
                <span className="min-w-0 break-words">{p.description.trim() || "—"}</span>
                <span className="shrink-0 tabular-nums font-semibold text-zinc-900">+{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {showPaymentSection ? (
          <div className="mt-2 rounded-md border border-zinc-400 bg-white px-2.5 py-2 text-zinc-800 shadow-[inset_0_0_0_1px_rgba(24,24,27,0.03)]">
            <p
              className={cn(
                "mb-2 inline-flex rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-black uppercase tracking-wide text-zinc-900",
                dense ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              )}
            >
              {paymentLabels.section}
            </p>
            {paymentIban ? (
              <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-zinc-200 py-1">
                <span className="font-semibold text-zinc-700">{paymentLabels.iban}</span>
                <span className="tabular-nums text-right">{paymentIban}</span>
              </div>
            ) : null}
            {paymentAccountHolder ? (
              <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-zinc-200 py-1">
                <span className="font-semibold text-zinc-700">{paymentLabels.accountHolder}</span>
                <span className="text-right">{paymentAccountHolder}</span>
              </div>
            ) : null}
            {paymentBankName ? (
              <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-zinc-200 py-1">
                <span className="font-semibold text-zinc-700">{paymentLabels.bankName}</span>
                <span className="text-right">{paymentBankName}</span>
              </div>
            ) : null}
            {paymentNote ? (
              <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-zinc-200 py-1">
                <span className="font-semibold text-zinc-700">{paymentLabels.paymentNote}</span>
                <span className="text-right">{paymentNote}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            netRowClass,
            dense ? "text-[9px]" : "text-[10px] sm:text-xs"
          )}
        >
          <span>{labels.net}</span>
          <span className="shrink-0 tabular-nums">{fmt(totals.netDue)}</span>
        </div>
      </div>
    </div>
  );
});

function OasTemplatePickers({
  layoutVariant,
  onLayoutChange,
  contentPreset,
  onContentPresetChange,
  layoutOptions,
  contentOptions,
  nameSuffix,
  menuZIndex,
  hideContentPicker = false,
}: {
  layoutVariant: StatementLayoutVariant;
  onLayoutChange: (v: StatementLayoutVariant) => void;
  contentPreset: OrderAccountContentPreset;
  onContentPresetChange: (v: OrderAccountContentPreset) => void;
  layoutOptions: SelectOption[];
  contentOptions: SelectOption[];
  nameSuffix: string;
  menuZIndex?: number;
  hideContentPicker?: boolean;
}) {
  const { t } = useI18n();
  const noopBlur = useCallback(() => {}, []);
  return (
    <div className={cn("grid gap-3", hideContentPicker ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
      <Select
        label={t("reports.orderAccountStatementLayoutTemplate")}
        name={`oas-layout-${nameSuffix}`}
        value={layoutVariant}
        options={layoutOptions}
        onChange={(e) => onLayoutChange(e.target.value as StatementLayoutVariant)}
        onBlur={noopBlur}
        menuZIndex={menuZIndex}
      />
      {!hideContentPicker ? (
        <Select
          label={t("reports.orderAccountStatementContentTemplate")}
          name={`oas-content-${nameSuffix}`}
          value={contentPreset}
          options={contentOptions}
          onChange={(e) => onContentPresetChange(e.target.value as OrderAccountContentPreset)}
          onBlur={noopBlur}
          menuZIndex={menuZIndex}
        />
      ) : null}
    </div>
  );
}

export function OrderAccountStatementScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const previewRef = useRef<HTMLDivElement>(null);
  const linesSectionRef = useRef<HTMLDivElement>(null);
  const emblemFileInputRef = useRef<HTMLInputElement>(null);
  const shipmentPrefillKeyRef = useRef<string>("");
  const brandingDefaultsLoadedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [brandingLogoBusy, setBrandingLogoBusy] = useState(false);

  const canSee =
    canSeeUiModule(user, PERM.uiProducts) || canSeeUiModule(user, PERM.uiReports);
  const canPickProducts = canSeeUiModule(user, PERM.uiProducts);
  const { data: catalog = [] } = useProductsCatalog(canPickProducts);
  const { data: costHistoryRows = [] } = useProductCostHistory({}, canPickProducts);
  const { data: branches = [] } = useBranchesList();

  const [companyName, setCompanyName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [linkedBranchId, setLinkedBranchId] = useState("");
  const [saveToSystem, setSaveToSystem] = useState(true);
  const [saveAsInvoice, setSaveAsInvoice] = useState(false);
  const [invoiceAutoPost, setInvoiceAutoPost] = useState(true);
  const [invoicePaymentDetailsOpen, setInvoicePaymentDetailsOpen] = useState(false);
  const [customerAccountIdText, setCustomerAccountIdText] = useState("");
  const [paymentIban, setPaymentIban] = useState("");
  const [paymentAccountHolder, setPaymentAccountHolder] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [showPaymentOnPdf, setShowPaymentOnPdf] = useState(true);
  const [lastCreatedInvoiceNo, setLastCreatedInvoiceNo] = useState("");
  const [suggestions, setSuggestions] = useState<CounterpartySuggestionRow[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [linePriceSuggestionByLineId, setLinePriceSuggestionByLineId] = useState<
    Record<string, SalesPriceSuggestion | undefined>
  >({});
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [priceHistoryRows, setPriceHistoryRows] = useState<SalesPriceHistoryRow[]>([]);
  const [priceHistoryBusy, setPriceHistoryBusy] = useState(false);
  const [priceHistoryTitle, setPriceHistoryTitle] = useState("");
  const [applyBranchOpenBalanceBusy, setApplyBranchOpenBalanceBusy] = useState(false);
  const [emblemDataUrl, setEmblemDataUrl] = useState("");
  const [defaultEmblemDataUrl, setDefaultEmblemDataUrl] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [defaultCompanyName, setDefaultCompanyName] = useState("");
  const [showDocumentTagline, setShowDocumentTagline] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()]);
  const [paidLines, setPaidLines] = useState<PaidDraft[]>(() => []);
  const [promoLines, setPromoLines] = useState<PromoDraft[]>(() => []);
  const [advanceText, setAdvanceText] = useState("");
  const [receivedAdvancePostToLedger, setReceivedAdvancePostToLedger] = useState(true);
  const [previousBalanceText, setPreviousBalanceText] = useState("");
  const [statementDate] = useState(() => new Date());
  const [layoutVariant, setLayoutVariant] = useState<StatementLayoutVariant>("corporate");
  const [contentPreset, setContentPreset] = useState<OrderAccountContentPreset>("custom");
  const [showQuantityColumn, setShowQuantityColumn] = useState(false);
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false);
  const [desktopLineDetailsOpen, setDesktopLineDetailsOpen] = useState(false);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dragOverLineId, setDragOverLineId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmMultiActionOpen, setConfirmMultiActionOpen] = useState(false);
  const [multiActionSteps, setMultiActionSteps] = useState<MultiActionStep[]>([]);
  const [multiActionRunning, setMultiActionRunning] = useState(false);
  const [multiActionError, setMultiActionError] = useState("");
  const [portalMounted, setPortalMounted] = useState(false);
  const [creationMode, setCreationMode] = useState<"manual" | "shipmentBased">("manual");
  const [shipmentLinkMode, setShipmentLinkMode] = useState<"strict" | "partial">("strict");
  const [shipmentInvoiceability, setShipmentInvoiceability] = useState<ShipmentInvoiceabilityLine[]>([]);
  const [shipmentInvoiceabilityBusy, setShipmentInvoiceabilityBusy] = useState(false);
  const [manualShipmentWarehouseIdText, setManualShipmentWarehouseIdText] = useState("");
  const [manualShipmentMovementIdText, setManualShipmentMovementIdText] = useState("");
  const [manualShipmentBusy, setManualShipmentBusy] = useState(false);
  const [shipmentOptionsBusy, setShipmentOptionsBusy] = useState(false);
  const [shipmentOptions, setShipmentOptions] = useState<ShipmentOption[]>([]);
  const [selectedShipmentOptionKey, setSelectedShipmentOptionKey] = useState("");
  const [shipmentDetailOpen, setShipmentDetailOpen] = useState(false);
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<WarehouseOutboundShipmentMovementEditResponse | null>(null);
  const [selectedShipmentSource, setSelectedShipmentSource] = useState<{
    key: string;
    warehouseId: number;
    primaryMovementId: number;
    movementIds: number[];
    source: "auto" | "manual";
  } | null>(null);
  const [selectedShipmentProductKind, setSelectedShipmentProductKind] = useState<"parent" | "child" | "unknown">(
    "unknown"
  );
  const [lastCreatedInvoiceId, setLastCreatedInvoiceId] = useState<number | null>(null);
  const [lastSavedDocumentId, setLastSavedDocumentId] = useState<number | null>(null);
  const [orderDocumentKey, setOrderDocumentKey] = useState(() => `oas-${Date.now().toString(36)}`);
  const hasMultipleActions = saveAsInvoice || saveToSystem;
  const lineAddBlocked = creationMode === "shipmentBased" && shipmentLinkMode === "strict";

  const focusLineEditor = useCallback((lineId: string) => {
    linesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-line-desc-id="${lineId}"]`);
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // no-op
      }
    }, 220);
  }, []);
  const focusLineField = useCallback((lineId: string, field: "description" | "amount") => {
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-line-id="${lineId}"][data-line-field="${field}"]`);
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // no-op
      }
    }, 120);
  }, []);

  const handleAddLine = useCallback(() => {
    if (lineAddBlocked) return;
    const id = newId();
    setLines((prev) => [
      ...prev,
      {
        ...emptyLine(),
        id,
        lineSource: lineAddBlocked ? "shipment" : "manual",
        manualReasonCode: lineAddBlocked ? null : "OPS_OTHER",
      },
    ]);
    focusLineEditor(id);
  }, [focusLineEditor, lineAddBlocked]);
  const moveLine = useCallback((fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    setLines((prev) => {
      const fromIndex = prev.findIndex((x) => x.id === fromId);
      const toIndex = prev.findIndex((x) => x.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);
  const beginLineDrag = useCallback((lineId: string) => {
    setDraggingLineId(lineId);
    setDragOverLineId(lineId);
  }, []);
  const finishLineDrag = useCallback(() => {
    setDraggingLineId(null);
    setDragOverLineId(null);
  }, []);
  const hoverLineDropTarget = useCallback((lineId: string) => {
    if (!draggingLineId || draggingLineId === lineId) return;
    setDragOverLineId(lineId);
  }, [draggingLineId]);
  const dropLineOnTarget = useCallback((lineId: string) => {
    if (!draggingLineId || draggingLineId === lineId) {
      finishLineDrag();
      return;
    }
    moveLine(draggingLineId, lineId);
    finishLineDrag();
  }, [draggingLineId, finishLineDrag, moveLine]);
  const handleDuplicateLastLine = useCallback(() => {
    if (lineAddBlocked) return;
    let createdId = "";
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      createdId = newId();
      return [
        ...prev,
        {
          ...last,
          id: createdId,
          amount: 0,
          amountText: "",
          isGift: false,
          lineSource: lineAddBlocked ? "shipment" : "manual",
          manualReasonCode: lineAddBlocked ? null : (last.manualReasonCode ?? "OPS_OTHER"),
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        },
      ];
    });
    if (createdId) focusLineEditor(createdId);
  }, [focusLineEditor, lineAddBlocked]);
  const mobileLineIssueCount = useMemo(() => {
    return lines.filter((line) => {
      const amount = parseLocaleAmount((line.amountText ?? "").trim(), locale) || 0;
      const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
      return !line.description.trim() || amount <= 0 || amountMismatch != null;
    }).length;
  }, [lines, locale, showQuantityColumn]);
  const hasShipmentSelected = creationMode !== "shipmentBased" || selectedShipmentSource != null;
  const hasDocumentBasics = Boolean(companyName.trim() && branchName.trim() && documentTitle.trim());
  const hasReadyLine = lines.some((line) => {
    const amount = parseLocaleAmount((line.amountText ?? "").trim(), locale) || 0;
    return line.description.trim().length > 0 && amount > 0;
  });
  const flowCurrentStep = useMemo(() => {
    if (!hasShipmentSelected) return 2;
    if (!hasDocumentBasics) return creationMode === "shipmentBased" ? 3 : 2;
    if (!hasReadyLine) return 3;
    return 4;
  }, [creationMode, hasDocumentBasics, hasReadyLine, hasShipmentSelected]);
  const handleMobileLineEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, lineId: string, field: "description" | "amount") => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (field === "description") {
        focusLineField(lineId, "amount");
        return;
      }
      const idx = lines.findIndex((x) => x.id === lineId);
      if (idx >= 0 && idx < lines.length - 1) {
        const next = lines[idx + 1];
        if (next) focusLineField(next.id, "description");
        return;
      }
      handleAddLine();
    },
    [focusLineField, handleAddLine, lines]
  );

  useEffect(() => {
    const branchIdText = linkedBranchId.trim();
    const branchIdNum = Number.parseInt(branchIdText, 10);
    if (!Number.isFinite(branchIdNum) || branchIdNum <= 0) return;
    // Şube seçildiğinde cari id'yi şube id ile başlayan bir taslak değere getir.
    setCustomerAccountIdText(`${branchIdNum}001`);
    // Sistem şubesi seçimi, belge başlığındaki şube adını da otomatik eşler.
    const selectedBranch = branches.find((b) => b.id === branchIdNum);
    if (selectedBranch?.name?.trim()) setBranchName(selectedBranch.name.trim());
  }, [branches, linkedBranchId]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!previewModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewModalOpen]);

  const shipmentPrefillParams = useMemo(() => {
    const warehouseIdRaw = searchParams.get("shipmentWarehouseId") ?? "";
    const movementIdRaw = searchParams.get("shipmentMovementId") ?? "";
    const movementIdsRaw = searchParams.get("shipmentMovementIds") ?? "";
    const warehouseId = Number.parseInt(warehouseIdRaw, 10);
    const movementId = Number.parseInt(movementIdRaw, 10);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0) return null;
    if (!Number.isFinite(movementId) || movementId <= 0) return null;
    const parsedIds = movementIdsRaw
      .split(",")
      .map((x) => Number.parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const movementIds = Array.from(new Set([movementId, ...parsedIds]));
    return {
      warehouseId,
      movementId,
      movementIds,
      key: `${warehouseId}:${movementIds.join(",")}`,
    };
  }, [searchParams]);
  const shipmentPrefillDraftMode = useMemo(() => {
    const raw = (searchParams.get("invoiceDraft") ?? "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
  }, [searchParams]);
  const orderKeyFromQuery = useMemo(() => (searchParams.get("orderKey") ?? "").trim(), [searchParams]);

  useEffect(() => {
    if (!shipmentPrefillParams) return;
    setCreationMode("shipmentBased");
  }, [shipmentPrefillParams]);

  const loadShipmentIntoForm = useCallback(
    async (warehouseId: number, movementId: number, source: "auto" | "manual") => {
      const shipment = await fetchWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId);
      const productMeta = catalog.find((p) => p.id === shipment.productId);
      const productKind: "parent" | "child" | "unknown" = productMeta
        ? productMeta.parentProductId && productMeta.parentProductId > 0
          ? "child"
          : "parent"
        : "unknown";
      setSelectedShipmentProductKind(productKind);
      setSelectedShipmentDetail(shipment);
      setManualShipmentWarehouseIdText(String(warehouseId));
      setManualShipmentMovementIdText(String(movementId));
      setBranchName(shipment.branchName?.trim() || "");
      setLinkedBranchId(String(shipment.branchId));
      setShowQuantityColumn(true);
      setSaveAsInvoice(true);
      setSaveToSystem(true);
      if (source === "auto") setInvoiceAutoPost(!shipmentPrefillDraftMode ? true : false);
      setCustomerAccountIdText("");
      setLines([
        {
          id: newId(),
          description: shipment.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(shipment.quantity) || 0), locale),
          unitText: shipment.unit?.trim() || "",
          amount: 0,
          amountText: "",
          isGift: false,
          priceCalcMode: "piece",
          qtyText: formatLocaleAmountInput(Math.max(0, Number(shipment.quantity) || 0), locale),
          unitPriceText: "",
          kgText: "",
          tryPerKgText: "",
          selectedProductId: shipment.productId,
          parentProductId: productMeta?.parentProductId ?? null,
          parentProductName: productMeta?.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: shipment.branchStockMovementId,
          sourceWarehouseMovementId: shipment.id,
        },
      ]);
      setSelectedShipmentSource({
        key: `${warehouseId}:${movementId}`,
        warehouseId,
        primaryMovementId: movementId,
        movementIds: [movementId],
        source,
      });
      const rows = await fetchShipmentInvoiceability(movementId);
      setShipmentInvoiceability(rows);
    },
    [catalog, locale, shipmentPrefillDraftMode]
  );
  const loadShipmentGroupIntoForm = useCallback(
    async (option: ShipmentOption, source: "auto" | "manual") => {
      const firstMovementId = option.movementIds[0];
      if (!firstMovementId) return;
      const first = await fetchWarehouseOutboundShipmentMovementForEdit(option.warehouseId, firstMovementId);
      setSelectedShipmentDetail(first);
      setManualShipmentWarehouseIdText(String(option.warehouseId));
      setManualShipmentMovementIdText(String(firstMovementId));
      setBranchName(first.branchName?.trim() || option.branchName || "");
      setLinkedBranchId(String(first.branchId));
      setShowQuantityColumn(true);
      setSaveAsInvoice(true);
      setSaveToSystem(true);
      if (source === "auto") setInvoiceAutoPost(!shipmentPrefillDraftMode ? true : false);
      setCustomerAccountIdText("");
      const productById = new Map(catalog.map((p) => [p.id, p] as const));
      const hasChild = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(p?.parentProductId && p.parentProductId > 0);
      });
      const hasParent = option.items.some((x) => {
        const p = productById.get(x.productId);
        return Boolean(!p || !p.parentProductId || p.parentProductId <= 0);
      });
      setSelectedShipmentProductKind(hasChild && hasParent ? "unknown" : hasChild ? "child" : "parent");
      setLines(
        option.items.map((it) => ({
          ...emptyLine(),
          id: newId(),
          description: it.productName?.trim() || "",
          quantityText: formatLocaleAmountInput(Math.max(0, Number(it.quantity) || 0), locale),
          unitText: it.unit?.trim() || "",
          qtyText: formatLocaleAmountInput(Math.max(0, Number(it.quantity) || 0), locale),
          selectedProductId: it.productId,
          parentProductId: it.parentProductId ?? null,
          parentProductName: it.parentProductName ?? null,
          lineSource: "shipment",
          manualReasonCode: null,
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: it.movementId,
        }))
      );
      setSelectedShipmentSource({
        key: option.key,
        warehouseId: option.warehouseId,
        primaryMovementId: firstMovementId,
        movementIds: option.movementIds,
        source,
      });
      const invoiceabilityGroups = await Promise.all(
        option.movementIds.map(async (movementId) => await fetchShipmentInvoiceability(movementId))
      );
      setShipmentInvoiceability(invoiceabilityGroups.flat());
    },
    [catalog, locale, shipmentPrefillDraftMode]
  );

  useEffect(() => {
    if (!orderKeyFromQuery) return;
    setOrderDocumentKey(orderKeyFromQuery);
  }, [orderKeyFromQuery]);

  useEffect(() => {
    if (creationMode !== "shipmentBased") return;
    let alive = true;
    setShipmentOptionsBusy(true);
    void (async () => {
      try {
        const warehouses = await fetchWarehouses();
        const pages = await Promise.all(
          warehouses.map(async (w) => {
            const page = await fetchWarehouseMovementsPage(w.id, { page: 1, pageSize: 200, type: "OUT" });
            return { warehouse: w, items: page.items };
          })
        );
        if (!alive) return;
        const groups = new Map<string, ShipmentOption>();
        for (const { warehouse, items } of pages) {
          for (const m of items) {
            if (!(m.type === "OUT" && m.isDepotToBranchShipment)) continue;
            const branchName = m.outDestinationBranchName?.trim() || "-";
            const groupKey = `${warehouse.id}|${branchName}|${m.movementDate}`;
            const existing = groups.get(groupKey);
            if (!existing) {
              groups.set(groupKey, {
                key: groupKey,
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                branchName,
                movementDate: m.movementDate,
                movementIds: [m.id],
                items: [
                  {
                    movementId: m.id,
                    productId: m.productId,
                    parentProductId: m.parentProductId ?? null,
                    parentProductName: m.parentProductName ?? null,
                    productName: m.productName,
                    quantity: Number(m.quantity) || 0,
                    unit: m.unit?.trim() || "",
                  },
                ],
              });
            } else {
              if (!existing.movementIds.includes(m.id)) existing.movementIds.push(m.id);
              existing.items.push({
                movementId: m.id,
                productId: m.productId,
                parentProductId: m.parentProductId ?? null,
                parentProductName: m.parentProductName ?? null,
                productName: m.productName,
                quantity: Number(m.quantity) || 0,
                unit: m.unit?.trim() || "",
              });
            }
          }
        }
        const options: ShipmentOption[] = [...groups.values()].sort((a, b) =>
          String(b.movementDate).localeCompare(String(a.movementDate))
        );
        setShipmentOptions(options);
      } catch {
        if (!alive) return;
        setShipmentOptions([]);
      } finally {
        if (!alive) return;
        setShipmentOptionsBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [creationMode]);

  const loadBrandingLogoAsDataUrl = useCallback(async (updatedAtUtc?: string | null): Promise<string> => {
    const res = await apiFetch(companyBrandingLogoUrl(updatedAtUtc));
    if (!res.ok) throw new Error("branding-logo-missing");
    const blob = await res.blob();
    if (!blob.size) throw new Error("branding-logo-empty");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result) {
          reject(new Error("branding-logo-read-failed"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("branding-logo-read-failed"));
      reader.readAsDataURL(blob);
    });
  }, []);

  useEffect(() => {
    if (brandingDefaultsLoadedRef.current) return;
    brandingDefaultsLoadedRef.current = true;
    let alive = true;
    void fetchSystemBranding()
      .then(async (branding) => {
        if (!alive) return;
        const brandingCompany = branding.companyName?.trim() || "";
        if (brandingCompany) {
          setDefaultCompanyName(brandingCompany);
          if (!companyName.trim()) setCompanyName(brandingCompany);
          if (!documentTitle.trim()) setDocumentTitle(brandingCompany);
        }
        if (branding.hasLogo) {
          try {
            const dataUrl = await loadBrandingLogoAsDataUrl(branding.updatedAtUtc);
            if (!alive) return;
            setDefaultEmblemDataUrl(dataUrl);
            const isUsingDefaultOrEmpty = !emblemDataUrl || emblemDataUrl === defaultEmblemDataUrl;
            if (isUsingDefaultOrEmpty) setEmblemDataUrl(dataUrl);
          } catch {
            // Branding logo yoksa sessiz geç; kullanıcı manuel seçebilir.
          }
        }
      })
      .catch(() => {
        // Branding varsayılanı alınamazsa sayfa normal kullanımına devam eder.
      });
    return () => {
      alive = false;
    };
  }, [loadBrandingLogoAsDataUrl]);

  useEffect(() => {
    if (!shipmentPrefillParams) return;
    if (shipmentPrefillKeyRef.current === shipmentPrefillParams.key) return;
    shipmentPrefillKeyRef.current = shipmentPrefillParams.key;
    let alive = true;
    const loadPromise =
      shipmentPrefillParams.movementIds.length > 1
        ? (async () => {
            const details = await Promise.all(
              shipmentPrefillParams.movementIds.map(async (movementId) =>
                await fetchWarehouseOutboundShipmentMovementForEdit(shipmentPrefillParams.warehouseId, movementId)
              )
            );
            const first = details[0];
            if (!first) return;
            const option: ShipmentOption = {
              key: shipmentPrefillParams.key,
              warehouseId: shipmentPrefillParams.warehouseId,
              warehouseName: "",
              branchName: first.branchName?.trim() || "",
              movementDate: first.businessDate,
              movementIds: details.map((x) => x.id),
              items: details.map((x) => ({
                movementId: x.id,
                productId: x.productId,
                parentProductId: null,
                parentProductName: null,
                productName: x.productName,
                quantity: Number(x.quantity) || 0,
                unit: x.unit?.trim() || "",
              })),
            };
            await loadShipmentGroupIntoForm(option, "auto");
          })()
        : loadShipmentIntoForm(
            shipmentPrefillParams.warehouseId,
            shipmentPrefillParams.movementId,
            "auto"
          );
    void loadPromise
      .then(() => {
        if (!alive) return;
        // Sevkiyattan gelen akışta kullanıcı hızlıca PDF alabilsin diye önizlemeyi direkt aç.
        setPreviewModalOpen(true);
      })
      .catch((error) => {
        if (!alive) return;
        notify.error(toErrorMessage(error));
      });
    return () => {
      alive = false;
    };
  }, [loadShipmentGroupIntoForm, loadShipmentIntoForm, shipmentPrefillParams]);

  useEffect(() => {
    if (!selectedShipmentSource) {
      setSelectedShipmentOptionKey("");
      return;
    }
    setSelectedShipmentOptionKey(selectedShipmentSource.key);
  }, [selectedShipmentSource]);

  const shipmentComboboxOptions = useMemo<RichComboboxOption[]>(
    () =>
      shipmentOptions.map((opt) => ({
        value: opt.key,
        title: `${opt.warehouseName} · ${opt.branchName}`,
        description: `${t("reports.orderAccountStatementShipmentDetailBranch")}: ${opt.branchName} · ${t("reports.orderAccountStatementShipmentDetailDate")}: ${opt.movementDate}`,
        detail: `${t("reports.orderAccountStatementShipmentProductKindLabel")}: ${
          opt.items.some((x) => x.parentProductId && x.parentProductId > 0)
            ? t("reports.orderAccountStatementShipmentProductKindChild")
            : t("reports.orderAccountStatementShipmentProductKindParent")
        } · ${t("reports.orderAccountStatementShipmentProductCount")}: ${opt.items.length} · ${t("reports.orderAccountStatementShipmentDetailWarehouseId")}#${opt.warehouseId}`,
      })),
    [locale, shipmentOptions, t]
  );

  useEffect(() => {
    if (!selectedShipmentSource) {
      setShipmentInvoiceability([]);
      return;
    }
    let alive = true;
    setShipmentInvoiceabilityBusy(true);
    void Promise.all(
      selectedShipmentSource.movementIds.map(async (movementId) => await fetchShipmentInvoiceability(movementId))
    )
      .then((rowsGroups) => {
        if (!alive) return;
        setShipmentInvoiceability(rowsGroups.flat());
      })
      .catch(() => {
        if (!alive) return;
        setShipmentInvoiceability([]);
      })
      .finally(() => {
        if (!alive) return;
        setShipmentInvoiceabilityBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedShipmentSource]);

  useEffect(() => {
    let alive = true;
    setSuggestionsBusy(true);
    void fetchCounterpartySuggestions()
      .then((rows) => {
        if (!alive) return;
        setSuggestions(rows);
      })
      .catch(() => {
        if (!alive) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!alive) return;
        setSuggestionsBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!previewModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewModalOpen]);

  const catalogOptions = useMemo(() => {
    return [...catalog].sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"));
  }, [catalog, locale]);
  const latestCostByProductId = useMemo(() => {
    const map = new Map<number, (typeof costHistoryRows)[number]>();
    for (const row of costHistoryRows) {
      if (!map.has(row.productId)) map.set(row.productId, row);
    }
    return map;
  }, [costHistoryRows]);
  const catalogOptionsWithCost = useMemo(() => {
    return catalogOptions.map((p) => {
      const unit = p.unit?.trim() || "—";
      const cost = latestCostByProductId.get(p.id);
      const costPart = cost
        ? `${formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)}`
        : t("reports.orderAccountStatementCostSuggestionMissing");
      return {
        ...p,
        optionLabel: `${p.name} (#${p.id}) - ${t("reports.orderAccountStatementUnit")}: ${unit} - ${t("reports.orderAccountStatementSuggestedCostShort")}: ${costPart}`,
      };
    });
  }, [catalogOptions, latestCostByProductId, locale, t]);
  const activeCounterparty = useMemo(() => {
    const branchId = Number.parseInt(linkedBranchId, 10);
    if (Number.isFinite(branchId) && branchId > 0) {
      return { counterpartyType: "branch" as const, counterpartyId: branchId };
    }
    const customerId = Number.parseInt(customerAccountIdText, 10);
    if (Number.isFinite(customerId) && customerId > 0) {
      return { counterpartyType: "customer" as const, counterpartyId: customerId };
    }
    return null;
  }, [linkedBranchId, customerAccountIdText]);
  const loadSalesSuggestionForLine = useCallback(
    async (lineId: string, productId: number, applyIfEmpty = true) => {
      if (!activeCounterparty || !Number.isFinite(productId) || productId <= 0) return;
      try {
        const suggestion = await fetchSalesPriceSuggestion({
          productId,
          counterpartyType: activeCounterparty.counterpartyType,
          counterpartyId: activeCounterparty.counterpartyId,
          currencyCode: "TRY",
          lookbackDays: 90,
        });
        setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: suggestion ?? undefined }));
        if (!suggestion || !applyIfEmpty) return;
        const normalizedSuggested = formatLocaleAmountInput(
          Math.max(0, Number(suggestion.suggestedUnitPrice) || 0),
          locale
        );
        setLines((prev) =>
          prev.map((line) => {
            if (line.id !== lineId) return line;
            const current = (line.unitPriceText ?? "").trim();
            if (current.length > 0) return line;
            return {
              ...line,
              unitPriceText: normalizedSuggested,
              tryPerKgText: line.priceCalcMode === "kg" ? normalizedSuggested : line.tryPerKgText,
            };
          })
        );
      } catch {
        setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
      }
    },
    [activeCounterparty, locale]
  );
  const openPriceHistoryForLine = useCallback(
    async (line: LineDraft) => {
      const productId = line.selectedProductId ?? 0;
      if (productId <= 0 || !activeCounterparty) return;
      setPriceHistoryOpen(true);
      setPriceHistoryBusy(true);
      setPriceHistoryRows([]);
      setPriceHistoryTitle(line.description?.trim() || t("reports.orderAccountStatementPickProduct"));
      try {
        const rows = await fetchSalesPriceHistory({
          productId,
          counterpartyType: activeCounterparty.counterpartyType,
          counterpartyId: activeCounterparty.counterpartyId,
          currencyCode: "TRY",
          limit: 50,
        });
        setPriceHistoryRows(rows);
      } catch (e) {
        notify.error(toErrorMessage(e));
      } finally {
        setPriceHistoryBusy(false);
      }
    },
    [activeCounterparty, t]
  );
  const applyCatalogProductToLine = useCallback(
    (lineId: string, productIdRaw: string) => {
      if (!productIdRaw) return;
      const productId = Number.parseInt(productIdRaw, 10);
      if (!Number.isFinite(productId) || productId <= 0) return;
      const p = catalog.find((x) => x.id === productId);
      if (!p) return;
      const suggestion = latestCostByProductId.get(productId);
      setLines((prev) =>
        prev.map((x) => {
          if (x.id !== lineId) return x;
          const nextUnitText = p.unit?.trim() || x.unitText || "";
          const suggestedUnitPrice = suggestion
            ? formatLocaleAmountInput(Math.max(0, Number(suggestion.unitCostExcludingVat) || 0), locale)
            : x.unitPriceText;
          const suggestedTryPerKg = suggestion
            ? formatLocaleAmountInput(Math.max(0, Number(suggestion.unitCostExcludingVat) || 0), locale)
            : x.tryPerKgText;
          return {
            ...x,
            selectedProductId: p.id,
            parentProductId: p.parentProductId ?? null,
            parentProductName: p.parentProductName ?? null,
            description: p.name,
            unitText: nextUnitText,
            unitPriceText: suggestedUnitPrice,
            tryPerKgText: x.priceCalcMode === "kg" ? suggestedTryPerKg : x.tryPerKgText,
          };
        })
      );
      setLinePriceSuggestionByLineId((prev) => ({ ...prev, [lineId]: undefined }));
    },
    [catalog, latestCostByProductId, locale]
  );
  const collapseLinesToParentProduct = useCallback(() => {
    const productById = new Map(catalog.map((p) => [p.id, p] as const));
    const normalize = (v: string) =>
      v
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const productByName = new Map(
      catalog
        .map((p) => [normalize(p.name ?? ""), p] as const)
        .filter(([k]) => k.length > 0)
    );
    const grouped = new Map<string, LineDraft>();
    const passthrough: LineDraft[] = [];
    let changed = false;
    for (const line of lines) {
      const productId = line.selectedProductId ?? 0;
      const guessedByName = productByName.get(normalize(line.description ?? ""));
      const product = productById.get(productId) ?? guessedByName;
      const parentId = line.parentProductId ?? product?.parentProductId ?? null;
      const parentProduct = parentId ? productById.get(parentId) : null;
      const parentName = (
        line.parentProductName ??
        product?.parentProductName ??
        parentProduct?.name ??
        ""
      ).trim();
      if (!parentId || !parentName) {
        passthrough.push({ ...line });
        continue;
      }
      changed = true;
      const key = `${parentId}:${(line.unitText ?? "").trim().toLowerCase()}`;
      const qty = Math.max(0, parseLocaleAmount((line.quantityText ?? "").trim(), locale) || 0);
      const amount = Number.isFinite(line.amount) ? line.amount : parseLocaleAmount(line.amountText, locale) || 0;
      const prev = grouped.get(key);
      if (!prev) {
        grouped.set(key, {
          ...line,
          id: newId(),
          description: parentName,
          quantityText: qty > 0 ? formatLocaleAmountInput(qty, locale) : "",
          amount: Math.max(0, amount),
          amountText: amount > 0 ? formatLocaleAmountInput(amount, locale) : "",
          selectedProductId: parentId,
          parentProductId: null,
          parentProductName: null,
          lineSource: "manual",
          manualReasonCode: "OPS_PARENT_MERGE",
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        });
      } else {
        const prevQty = Math.max(0, parseLocaleAmount((prev.quantityText ?? "").trim(), locale) || 0);
        const prevAmount = Number.isFinite(prev.amount) ? prev.amount : parseLocaleAmount(prev.amountText, locale) || 0;
        const mergedQty = prevQty + qty;
        const mergedAmount = Math.max(0, prevAmount + amount);
        grouped.set(key, {
          ...prev,
          quantityText: mergedQty > 0 ? formatLocaleAmountInput(mergedQty, locale) : "",
          amount: mergedAmount,
          amountText: mergedAmount > 0 ? formatLocaleAmountInput(mergedAmount, locale) : "",
        });
      }
    }
    const merged = [...passthrough, ...grouped.values()];
    if (!changed) {
      notify.error(t("reports.orderAccountStatementParentMergeNoop"));
      return;
    }
    setLines(merged);
    notify.success(t("reports.orderAccountStatementParentMergeApplied"));
  }, [catalog, lines, locale, t]);
  const lineCompact = lines.length > 1;
  /** 4+ satır: liste ve tabloda ek sıkılaştırma */
  const lineDense = lines.length > 3;

  const parsedLines = useMemo(() => parseLines(lines, locale), [lines, locale]);
  const parsedPaid = useMemo(() => parsePaid(paidLines, locale), [paidLines, locale]);
  const parsedPromo = useMemo(() => parsePromo(promoLines, locale), [promoLines, locale]);
  const advanceDeduction = Math.max(0, parseLocaleAmount(advanceText, locale) || 0);
  const previousBalance = Math.max(0, parseLocaleAmount(previousBalanceText, locale) || 0);
  const totals = useMemo(
    () => computeOrderAccountTotals(parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance),
    [parsedLines, parsedPromo, advanceDeduction, parsedPaid, previousBalance]
  );

  const issuedDateLabel = useMemo(
    () =>
      statementDate.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale, statementDate]
  );

  const previewLines = useMemo(
    () => parsedLines.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedLines]
  );
  const previewPaid = useMemo(
    () => parsedPaid.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPaid]
  );
  const previewPromo = useMemo(
    () => parsedPromo.filter((l) => l.description.length > 0 || l.amount !== 0),
    [parsedPromo]
  );

  const labels = useMemo(
    () => ({
      headerCompany: t("reports.orderAccountStatementHeaderCompany"),
      headerBranch: t("reports.orderAccountStatementHeaderBranch"),
      documentTagline: t("reports.orderAccountStatementDocumentTagline"),
      issuedPrefix: t("reports.orderAccountStatementIssuedPrefix"),
      productCol: t("reports.orderAccountStatementColProduct"),
      qtyCol: t("reports.orderAccountStatementColQty"),
      unitCol: t("reports.orderAccountStatementUnit"),
      unitPriceCol: t("reports.orderAccountStatementUnitPrice"),
      amountCol: t("reports.orderAccountStatementColAmount"),
      gross: t("reports.orderAccountStatementGross"),
      giftTotal: t("reports.orderAccountStatementGiftTotalLine"),
      advance: t("reports.orderAccountStatementAdvanceLine"),
      subtotal: t("reports.orderAccountStatementSubtotal"),
      previousBalance: t("reports.orderAccountStatementPreviousBalanceLine"),
      net: t("reports.orderAccountStatementNet"),
      giftSuffix: t("reports.orderAccountStatementGiftSuffix"),
      paidSection: t("reports.orderAccountStatementPaidSectionPdf"),
      promoLineFallback: t("reports.orderAccountStatementPromoLineFallback"),
    }),
    [t]
  );

  const layoutSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "corporate", label: t("reports.orderAccountStatementLayoutCorporate") },
      { value: "compact", label: t("reports.orderAccountStatementLayoutCompact") },
      { value: "minimal", label: t("reports.orderAccountStatementLayoutMinimal") },
      { value: "invoiceClassic", label: t("reports.orderAccountStatementLayoutInvoiceClassic") },
      { value: "eInvoice", label: t("reports.orderAccountStatementLayoutEInvoice") },
      { value: "proforma", label: t("reports.orderAccountStatementLayoutProforma") },
      { value: "dispatch", label: t("reports.orderAccountStatementLayoutDispatch") },
      { value: "serviceForm", label: t("reports.orderAccountStatementLayoutServiceForm") },
    ],
    [t]
  );

  const contentSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "custom", label: t("reports.orderAccountStatementContentCustom") },
      { value: "tekin", label: t("reports.orderAccountStatementContentTekin") },
      { value: "cafe", label: t("reports.orderAccountStatementContentCafe") },
      { value: "bakery", label: t("reports.orderAccountStatementContentBakery") },
      { value: "catering", label: t("reports.orderAccountStatementContentCatering") },
    ],
    [t]
  );
  const branchSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("reports.orderAccountStatementSystemBranchNone") },
      ...branches
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, locale, t]
  );
  const branchOpenAmountById = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of suggestions) {
      if (row.counterpartyType !== "branch") continue;
      if (!Number.isFinite(row.counterpartyId) || row.counterpartyId <= 0) continue;
      map.set(row.counterpartyId, Math.max(0, Number(row.openAmount) || 0));
    }
    return map;
  }, [suggestions]);
  const applySelectedBranchOpenBalance = useCallback(() => {
    const branchId = Number.parseInt(linkedBranchId.trim(), 10);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      notify.error(t("reports.orderAccountStatementSystemBranchBalanceSelectFirst"));
      return;
    }
    setApplyBranchOpenBalanceBusy(true);
    const amount = branchOpenAmountById.get(branchId);
    if (amount == null || !Number.isFinite(amount)) {
      notify.error(t("reports.orderAccountStatementSystemBranchBalanceMissing"));
      setApplyBranchOpenBalanceBusy(false);
      return;
    }
    setPreviousBalanceText(formatLocaleAmountInput(Math.max(0, amount), locale));
    notify.success(t("reports.orderAccountStatementSystemBranchBalanceApplied"));
    setApplyBranchOpenBalanceBusy(false);
  }, [branchOpenAmountById, linkedBranchId, locale, t]);

  const fillTekinSample = useCallback(() => {
    setCompanyName("TEKİN USTA DONDURMA");
    setBranchName("Denizli Şubesi");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_LINES.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([
      {
        id: newId(),
        description: "Kira",
        amount: 750_000,
        amountText: formatLocaleAmountInput(750_000, locale),
      },
    ]);
    setAdvanceText(formatLocaleAmountInput(250_000, locale));
    setPreviousBalanceText(formatLocaleAmountInput(180_000, locale));
    setPaidLines([
      {
        id: newId(),
        description: "6 Adet Difiriz",
        amount: 306_000,
        amountText: formatLocaleAmountInput(306_000, locale),
      },
    ]);
    setShowQuantityColumn(true);
    setContentPreset("tekin");
  }, [locale]);

  const fillCafeSample = useCallback(() => {
    setCompanyName("Örnek İşletme A.Ş.");
    setBranchName("Merkez Şube");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_CAFE.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setPaidLines([]);
    setShowQuantityColumn(true);
    setContentPreset("cafe");
  }, [locale]);

  const fillBakerySample = useCallback(() => {
    setCompanyName(locale === "tr" ? "Örnek Fırın Unlu Mamuller" : "Sample Bakery Co.");
    setBranchName(locale === "tr" ? "Merkez üretim" : "Central production");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_BAKERY.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([
      {
        id: newId(),
        description: locale === "tr" ? "Bayi kampanya indirimi" : "Promotional discount",
        amount: 1_200,
        amountText: formatLocaleAmountInput(1_200, locale),
      },
    ]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setPaidLines([]);
    setShowQuantityColumn(true);
    setContentPreset("bakery");
  }, [locale]);

  const fillCateringSample = useCallback(() => {
    setCompanyName(locale === "tr" ? "Örnek Catering Hizmetleri" : "Sample Catering Services");
    setBranchName(locale === "tr" ? "Etkinlik: Gala gecesi" : "Event: gala dinner");
    setDocumentTitle("SİPARİŞ VE HESAP DÖKÜMÜ");
    setLines(
      SAMPLE_CATERING.map((s) => ({
        ...s,
        id: newId(),
        amountText: formatLocaleAmountInput(s.amount, locale),
      }))
    );
    setPromoLines([]);
    setAdvanceText(formatLocaleAmountInput(50_000, locale));
    setPreviousBalanceText("");
    setPaidLines([
      {
        id: newId(),
        description: locale === "tr" ? "Nakliye (dışarıdan ödenen)" : "Transport (paid externally)",
        amount: 9_500,
        amountText: formatLocaleAmountInput(9_500, locale),
      },
    ]);
    setShowQuantityColumn(true);
    setContentPreset("catering");
  }, [locale]);

  const applyContentPreset = useCallback(
    (v: OrderAccountContentPreset) => {
      if (v === "custom") setContentPreset("custom");
      else if (v === "tekin") fillTekinSample();
      else if (v === "cafe") fillCafeSample();
      else if (v === "bakery") fillBakerySample();
      else if (v === "catering") fillCateringSample();
    },
    [fillBakerySample, fillCafeSample, fillCateringSample, fillTekinSample]
  );

  /** Sihirli düğme: seçilen örnek şablona göre formu doldurur; «Özel» seçiliyken varsayılan toptan örneğini uygular. */
  const applySampleFromPreset = useCallback(() => {
    if (contentPreset === "custom") {
      fillTekinSample();
      return;
    }
    applyContentPreset(contentPreset);
  }, [applyContentPreset, contentPreset, fillTekinSample]);

  const resetForm = useCallback(() => {
    setCompanyName(defaultCompanyName);
    setBranchName("");
    setLinkedBranchId("");
    setSaveToSystem(true);
    setSaveAsInvoice(false);
    setInvoiceAutoPost(true);
    setCustomerAccountIdText("");
    setPaymentIban("");
    setPaymentAccountHolder("");
    setPaymentBankName("");
    setPaymentNote("");
    setShowPaymentOnPdf(true);
    setLastCreatedInvoiceNo("");
    setLastCreatedInvoiceId(null);
    setLastSavedDocumentId(null);
    setOrderDocumentKey(`oas-${Date.now().toString(36)}`);
    setEmblemDataUrl(defaultEmblemDataUrl);
    setDocumentTitle(defaultCompanyName);
    setShowDocumentTagline(true);
    setLines([emptyLine()]);
    setPaidLines([]);
    setPromoLines([]);
    setAdvanceText("");
    setPreviousBalanceText("");
    setContentPreset("custom");
    setLayoutVariant("corporate");
    setCreationMode(shipmentPrefillParams ? "shipmentBased" : "manual");
    setShipmentLinkMode("strict");
    setSelectedShipmentSource(null);
    setSelectedShipmentProductKind("unknown");
    setShipmentInvoiceability([]);
  }, [defaultCompanyName, defaultEmblemDataUrl, shipmentPrefillParams]);

  const onEmblemFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setEmblemDataUrl(result);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }, []);

  const onUseBrandingEmblem = useCallback(async () => {
    setBrandingLogoBusy(true);
    try {
      const dataUrl = await loadBrandingLogoAsDataUrl(new Date().toISOString());
      setEmblemDataUrl(dataUrl);
    } catch {
      window.alert(t("reports.orderAccountStatementEmblemFetchError"));
    } finally {
      setBrandingLogoBusy(false);
    }
  }, [loadBrandingLogoAsDataUrl, t]);

  const onDownloadPdf = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    setBusy(true);
    const showMultiActionProgress = hasMultipleActions;
    if (showMultiActionProgress) {
      setMultiActionError("");
      setMultiActionRunning(true);
      setMultiActionSteps([
        {
          id: "download",
          label: t("reports.orderAccountStatementActionDownloadPdf"),
          state: "pending",
        },
        {
          id: "invoice",
          label: t("reports.orderAccountStatementActionCreateInvoice"),
          state: saveAsInvoice ? "pending" : "skipped",
        },
        {
          id: "system",
          label: t("reports.orderAccountStatementActionSaveSystem"),
          state: saveToSystem ? "pending" : "skipped",
        },
      ]);
    }
    const setStepState = (id: MultiActionStepId, state: MultiActionStepState) => {
      if (!showMultiActionProgress) return;
      setMultiActionSteps((prev) =>
        prev.map((x) => (x.id === id ? { ...x, state } : x))
      );
    };
    try {
      setStepState("download", "running");
      const name = buildOrderAccountPdfFileName(
        companyName.trim() || "HesapOzeti",
        branchName.trim() || "Şube",
        isoDateStamp(new Date())
      );
      const docBlob = await buildHtmlNodeSinglePagePdfBlob(el);
      const dlUrl = URL.createObjectURL(docBlob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = name;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(dlUrl);
      setStepState("download", "done");

      const safeCompany = companyName.trim() || "—";
      const safeBranch = branchName.trim() || "—";
      const safeTitle = documentTitle.trim();
      const parsedBranchId = parseInt(linkedBranchId, 10);
      const parsedCustomerId = parseInt(customerAccountIdText, 10);
      const useBranchCounterparty = Number.isFinite(parsedBranchId) && parsedBranchId > 0;
      const counterpartyType: "branch" | "customer" = useBranchCounterparty
        ? "branch"
        : "customer";
      const counterpartyId = useBranchCounterparty ? parsedBranchId : parsedCustomerId;
      let createdInvoice: OutboundInvoiceResponse | null = null;

      if (saveAsInvoice) {
        setStepState("invoice", "running");
        if (!useBranchCounterparty && (!Number.isFinite(parsedCustomerId) || parsedCustomerId <= 0)) {
          notify.error(t("reports.orderAccountStatementInvoiceCounterpartyRequired"));
          setStepState("invoice", "pending");
          return;
        }
        const invalidLineCount = lines.filter(
          (l) => l.description.trim().length === 0 || !Number.isFinite(l.amount) || l.amount <= 0
        ).length;
        const payloadLines = lines
          .filter(
            (l) =>
              !l.isGift &&
              l.description.trim().length > 0 &&
              Number.isFinite(l.amount) &&
              l.amount > 0
          )
          .map((l) => ({
            productId: l.selectedProductId ?? null,
            description: l.description.trim(),
            quantity: Math.max(1, parseLocaleAmount((l.quantityText ?? "").trim(), locale) || 1),
            unit: (l.unitText ?? "").trim() || null,
            unitPrice: Math.max(0, parseLocaleAmount((l.unitPriceText ?? "").trim(), locale) || l.amount),
            lineAmount: Math.max(0, l.amount),
            lineSource: l.lineSource === "shipment" ? ("shipment" as const) : ("manual" as const),
            manualReasonCode: l.lineSource === "shipment" ? null : (l.manualReasonCode ?? "OPS_OTHER"),
            sourceShipmentLineId: l.sourceShipmentLineId ?? null,
          }));
        if (previousBalance > 0) {
          payloadLines.push({
            productId: null,
            description: "Devreden cari bakiye",
            quantity: 1,
            unit: "adet",
            unitPrice: Math.max(0, previousBalance),
            lineAmount: Math.max(0, previousBalance),
            lineSource: "manual",
            manualReasonCode: "OPS_OTHER",
            sourceShipmentLineId: null,
          });
        }
        parsedPaid
          .filter((l) => l.description.trim().length > 0 && Number.isFinite(l.amount) && l.amount > 0)
          .forEach((l) => {
            payloadLines.push({
              productId: null,
              description: l.description.trim(),
              quantity: 1,
              unit: "adet",
              unitPrice: Math.max(0, l.amount),
              lineAmount: Math.max(0, l.amount),
              lineSource: "manual",
              manualReasonCode: "OPS_OTHER",
              sourceShipmentLineId: null,
            });
          });
        if (payloadLines.length === 0) {
          notify.error(
            t("reports.orderAccountStatementInvoiceLinesRequiredDetailed").replace(
              "{invalidCount}",
              String(invalidLineCount || lines.length)
            )
          );
          setStepState("invoice", "pending");
          return;
        }
        const hasManualLine = payloadLines.some((x) => x.lineSource === "manual");
        const effectiveShipmentLinkMode =
          creationMode === "shipmentBased" && hasManualLine ? "partial" : shipmentLinkMode;
        const invoicePayload = {
          counterpartyType,
          counterpartyId,
          issueDate: isoDateOnly(statementDate),
          currencyCode: "TRY",
          shipmentLinkMode: effectiveShipmentLinkMode,
          autoPostLedger: invoiceAutoPost,
          notes: buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            counterpartyLabel: `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
          }),
          paymentInfo: {
            iban: paymentIban.trim() || null,
            accountHolder: paymentAccountHolder.trim() || null,
            bankName: paymentBankName.trim() || null,
            paymentNote: paymentNote.trim() || null,
            showOnPdf: showPaymentOnPdf,
          },
          lines: payloadLines,
        };
        const useShipmentEndpoint =
          creationMode === "shipmentBased" &&
          selectedShipmentSource != null &&
          payloadLines.some((x) => x.lineSource === "shipment");
        createdInvoice = useShipmentEndpoint
          ? await createShipmentInvoice(selectedShipmentSource.primaryMovementId, {
              ...invoicePayload,
              shipmentLinks:
                selectedShipmentSource != null
                  ? selectedShipmentSource.movementIds.map((movementId) => ({
                      warehouseMovementId: movementId,
                      quantity: 0,
                    }))
                  : [],
            })
          : await createOutboundInvoice(invoicePayload);
        if (!createdInvoice) {
          throw new Error("Invoice creation returned no result.");
        }
        const promoDeductionTotal = parsedPromo.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
        // Cari işleme tarafında PDF toplam mantığı birebir korunur:
        // promosyon + ön ödeme her zaman açık bakiyeden düşülür.
        const advanceLedgerDeduction = Math.max(0, advanceDeduction);
        const deductionReceiptTotal = promoDeductionTotal + advanceLedgerDeduction;
        if (deductionReceiptTotal > 0) {
          const receiptAmount = Math.min(deductionReceiptTotal, Math.max(0, createdInvoice.openAmount));
          if (receiptAmount > 0) {
            createdInvoice = await addOutboundInvoiceReceipt(createdInvoice.id, {
              receiptDate: isoDateOnly(statementDate),
              amount: receiptAmount,
              currencyCode: "TRY",
              notes: "Sipariş hesap dökümü promosyon/ön ödeme düşümü",
            });
          }
        }
        const created = createdInvoice;
        setLastCreatedInvoiceNo(created.documentNumber);
        setLastCreatedInvoiceId(created.id);
        const createdCounterpartyType = created.counterpartyType;
        const createdCounterpartyId = created.counterpartyId;
        setSuggestions((prev) =>
          [
            {
              counterpartyType: created.counterpartyType,
              counterpartyId: created.counterpartyId,
              counterpartyName: created.counterpartyName,
              currencyCode: created.currencyCode,
              invoicedTotal: created.linesTotal,
              paidTotal: created.paidTotal,
              openAmount: created.openAmount,
              lastInvoiceDate: created.issueDate,
              lastDocumentNumber: created.documentNumber,
            },
            ...prev.filter(
              (x) =>
                !(x.counterpartyType === createdCounterpartyType && x.counterpartyId === createdCounterpartyId)
            ),
          ].slice(0, 10)
        );
        notify.success(t("reports.orderAccountStatementInvoiceSaved"));
        setStepState("invoice", "done");
      }

      if (saveToSystem) {
        setStepState("system", "running");
        const branchId = parsedBranchId;
        if (!Number.isFinite(branchId) || branchId <= 0) {
          notify.error(t("reports.orderAccountStatementSystemBranchRequired"));
          setStepState("system", "pending");
        } else {
          const pdfDocumentNo = `CRP-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
          const systemFile = new File([docBlob], name, { type: "application/pdf" });
          const note = buildOrderAccountDocumentMetadata({
            orderDocumentKey,
            pdfDocumentNo,
            companyName: safeCompany,
            branchName: safeBranch,
            title: safeTitle,
            invoiceId: createdInvoice?.id,
            invoiceNo: createdInvoice?.documentNumber,
            counterpartyLabel:
              createdInvoice != null
                ? `${createdInvoice.counterpartyType}:${createdInvoice.counterpartyId}`
                : `${counterpartyType}:${counterpartyId}`,
            shipmentWarehouseId: selectedShipmentSource?.warehouseId ?? null,
            shipmentPrimaryMovementId: selectedShipmentSource?.primaryMovementId ?? null,
            shipmentMovementIds: selectedShipmentSource?.movementIds ?? null,
            receivedAdvanceAmount: advanceDeduction,
            receivedAdvancePostToLedger:
              advanceDeduction > 0 ? receivedAdvancePostToLedger : null,
          });
          const saved = await uploadBranchDocument(branchId, {
            file: systemFile,
            kind: "OTHER",
            notes: note,
          });
          setLastSavedDocumentId(saved.id);
          notify.success(t("reports.orderAccountStatementSystemSaved"));
          setStepState("system", "done");
        }
      }

    } catch (error) {
      if (showMultiActionProgress) setMultiActionError(toErrorMessage(error));
      notify.error(toErrorMessage(error));
    } finally {
      if (showMultiActionProgress) setMultiActionRunning(false);
      setBusy(false);
    }
  }, [
    branchName,
    companyName,
    customerAccountIdText,
    documentTitle,
    invoiceAutoPost,
    linkedBranchId,
    locale,
    parsedLines,
    parsedPaid,
    parsedPromo,
    previousBalance,
    advanceDeduction,
    paymentAccountHolder,
    paymentBankName,
    paymentIban,
    paymentNote,
    creationMode,
    shipmentLinkMode,
    receivedAdvancePostToLedger,
    selectedShipmentSource,
    orderDocumentKey,
    saveAsInvoice,
    saveToSystem,
    hasMultipleActions,
    showPaymentOnPdf,
    statementDate,
    t,
  ]);

  const operationPreviewItems = useMemo(() => {
    const items: string[] = [t("reports.orderAccountStatementActionDownloadPdf")];
    if (saveAsInvoice) items.push(t("reports.orderAccountStatementActionCreateInvoice"));
    if (saveToSystem) items.push(t("reports.orderAccountStatementActionSaveSystem"));
    return items;
  }, [saveAsInvoice, saveToSystem, t]);

  const onDownloadPdfClick = useCallback(() => {
    if (!hasMultipleActions) {
      void onDownloadPdf();
      return;
    }
    setConfirmMultiActionOpen(true);
    setMultiActionError("");
    void onDownloadPdf();
  }, [hasMultipleActions, onDownloadPdf]);

  const multiActionProgressPercent = useMemo(() => {
    const completed = multiActionSteps.filter(
      (x) => x.state === "done" || x.state === "skipped"
    ).length;
    return Math.round((completed / Math.max(1, multiActionSteps.length)) * 100);
  }, [multiActionSteps]);

  const onLoadManualShipment = useCallback(async () => {
    const selectedGroup = shipmentOptions.find((x) => x.key === selectedShipmentOptionKey);
    if (selectedGroup) {
      setManualShipmentBusy(true);
      try {
        await loadShipmentGroupIntoForm(selectedGroup, "manual");
        notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
      } catch (error) {
        notify.error(toErrorMessage(error));
      } finally {
        setManualShipmentBusy(false);
      }
      return;
    }
    const warehouseId = Number.parseInt(manualShipmentWarehouseIdText, 10);
    const movementId = Number.parseInt(manualShipmentMovementIdText, 10);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0 || !Number.isFinite(movementId) || movementId <= 0) {
      notify.error(t("reports.orderAccountStatementShipmentManualInputRequired"));
      return;
    }
    setManualShipmentBusy(true);
    try {
      await loadShipmentIntoForm(warehouseId, movementId, "manual");
      notify.success(t("reports.orderAccountStatementShipmentManualLoaded"));
    } catch (error) {
      notify.error(toErrorMessage(error));
    } finally {
      setManualShipmentBusy(false);
    }
  }, [
    loadShipmentGroupIntoForm,
    loadShipmentIntoForm,
    manualShipmentMovementIdText,
    manualShipmentWarehouseIdText,
    selectedShipmentOptionKey,
    shipmentOptions,
    t,
  ]);

  if (!canSee) {
    return (
      <div className="w-full min-w-0 px-4 py-16 text-center text-sm text-zinc-600 sm:px-6">
        {t("reports.orderAccountStatementNoAccess")}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 pb-24 pt-4 sm:px-6 sm:pb-28 md:py-6 md:pb-32 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-950/[0.035] sm:px-6 sm:py-5">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <OasStepVisualBadge tone="indigo" icon="header" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-zinc-950 sm:text-xl">
              {t("reports.orderAccountStatementTitle")}
            </h1>
            <p className="mt-2 border-t border-zinc-100 pt-2 text-sm leading-relaxed text-zinc-600">
              {t("reports.orderAccountStatementSubtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-6">
          <StatementFormStep
            title={t("reports.orderAccountStatementStepHead")}
            stepVisual={{ tone: "indigo", icon: "header" }}
            scopeKinds={["document", "system"]}
          >
            <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Doldurma sirasi</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <FlowStepPill index={1} label="Mod secimi" state={flowCurrentStep > 1 ? "done" : "current"} />
                <FlowStepPill
                  index={2}
                  label={creationMode === "shipmentBased" ? "Sevkiyat secimi" : "Belge icerigi"}
                  state={flowCurrentStep > 2 ? "done" : flowCurrentStep === 2 ? "current" : "todo"}
                />
                <FlowStepPill
                  index={3}
                  label="Kalemler ve tutarlar"
                  state={flowCurrentStep > 3 ? "done" : flowCurrentStep === 3 ? "current" : "todo"}
                />
                <FlowStepPill index={4} label="Onizle ve indir" state={flowCurrentStep === 4 ? "current" : "todo"} />
              </div>
              {creationMode === "shipmentBased" ? (
                <p className="mt-1.5 text-[11px] text-violet-800">
                  Sevkiyat bazli akista once sevkiyat secin; sistem kalemleri ve sube bilgisini otomatik doldurur.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-violet-800">
                  Manuel akista once belge icerigini, sonra kalem/tutar alanlarini doldurup onizleme gecin.
                </p>
              )}
            </div>
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                2A · Sevkiyat / Mod
              </p>
              <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                Once bunu secin
              </span>
              </div>
              <p className="mb-2 text-[11px] text-zinc-600">
                Bu kart, verinin nereden gelecegini belirler (manuel / sevkiyat).
              </p>
              <div className="grid gap-3 md:grid-cols-2">
              <Select
                label={t("reports.orderAccountStatementCreationMode")}
                name="order-account-creation-mode"
                value={creationMode}
                onChange={(e) => setCreationMode(e.target.value === "shipmentBased" ? "shipmentBased" : "manual")}
                onBlur={() => {}}
                options={[
                  { value: "manual", label: t("reports.orderAccountStatementCreationModeManual") },
                  { value: "shipmentBased", label: t("reports.orderAccountStatementCreationModeShipment") },
                ]}
              />
              <Select
                label={t("reports.orderAccountStatementShipmentLinkMode")}
                name="order-account-shipment-link-mode"
                value={shipmentLinkMode}
                onChange={(e) => setShipmentLinkMode(e.target.value === "partial" ? "partial" : "strict")}
                onBlur={() => {}}
                options={[
                  { value: "strict", label: t("reports.orderAccountStatementShipmentLinkModeStrict") },
                  { value: "partial", label: t("reports.orderAccountStatementShipmentLinkModePartial") },
                ]}
                disabled={creationMode !== "shipmentBased"}
              />
              {creationMode === "shipmentBased" ? (
                <div className="md:col-span-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
                  {!selectedShipmentSource ? (
                    <p className="mb-2 rounded-md border border-violet-200 bg-white/70 px-2 py-1.5 text-[11px]">
                      1) Sevkiyat secin, 2) kalemler otomatik gelir, 3) sadece eksikleri duzenleyin.
                    </p>
                  ) : null}
                  {selectedShipmentSource ? (
                    <>
                      <p className="font-semibold text-violet-900">
                        {t("reports.orderAccountStatementShipmentSourceSelected")
                          .replace("{warehouseId}", String(selectedShipmentSource.warehouseId))
                          .replace("{movementId}", String(selectedShipmentSource.primaryMovementId))}
                      </p>
                      <p className="mt-0.5">
                        {shipmentInvoiceabilityBusy
                          ? t("reports.loading")
                          : shipmentInvoiceability.length > 0
                            ? t("reports.orderAccountStatementShipmentInvoiceabilityHint").replace(
                                "{remaining}",
                                formatLocaleAmount(
                                  shipmentInvoiceability.reduce((sum, x) => sum + Math.max(0, Number(x.remainingQuantity) || 0), 0),
                                  locale,
                                  "TRY"
                                )
                              )
                            : t("reports.orderAccountStatementShipmentNoInvoiceability")}
                      </p>
                      <p className="mt-0.5">
                        {t("reports.orderAccountStatementShipmentProductKindLabel")}:{" "}
                        {selectedShipmentProductKind === "child"
                          ? t("reports.orderAccountStatementShipmentProductKindChild")
                          : selectedShipmentProductKind === "parent"
                            ? t("reports.orderAccountStatementShipmentProductKindParent")
                            : t("reports.orderAccountStatementShipmentProductKindUnknown")}
                      </p>
                      {shipmentInvoiceability.length > 0 &&
                      shipmentInvoiceability.reduce((sum, x) => sum + Math.max(0, Number(x.remainingQuantity) || 0), 0) <= 0 ? (
                        <p className="mt-1 text-amber-900">
                          {t("reports.orderAccountStatementShipmentAlreadyInvoicedHint")}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-violet-900">
                        {t("reports.orderAccountStatementShipmentSourceMissingTitle")}
                      </p>
                      <p className="mt-0.5">
                        {t("reports.orderAccountStatementShipmentSourceMissingHelp")}
                      </p>
                      <div className="mt-2">
                        <Link
                          href="/warehouses"
                          className="inline-flex rounded-md border border-violet-300 bg-white px-2 py-1 text-[11px] font-semibold text-violet-800"
                        >
                          {t("reports.orderAccountStatementShipmentSourceMissingCta")}
                        </Link>
                      </div>
                    </>
                  )}
                  <div className="mt-2 grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <RichCombobox
                        value={selectedShipmentOptionKey}
                        onChange={(nextKey) => {
                          setSelectedShipmentOptionKey(nextKey);
                          const selected = shipmentOptions.find((x) => x.key === nextKey);
                          if (!selected) return;
                          void loadShipmentGroupIntoForm(selected, "manual");
                        }}
                        options={shipmentComboboxOptions}
                        placeholder={t("reports.orderAccountStatementShipmentSelectPlaceholder")}
                        searchPlaceholder={t("reports.orderAccountStatementShipmentSearchPlaceholder")}
                        emptyText={shipmentOptionsBusy ? t("common.loading") : t("documents.empty")}
                        disabled={shipmentOptionsBusy || manualShipmentBusy}
                      />
                      <Button type="button" variant="secondary" onClick={() => void onLoadManualShipment()} disabled={manualShipmentBusy} className="min-h-9 text-xs">
                        {manualShipmentBusy
                          ? t("common.loading")
                          : t("reports.orderAccountStatementShipmentManualLoadButton")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShipmentDetailOpen(true)}
                        disabled={!selectedShipmentDetail}
                        className="min-h-9 text-xs"
                      >
                        {t("reports.orderAccountStatementShipmentDetailButton")}
                      </Button>
                    </div>
                    <p className="text-[11px] text-violet-800">
                      {t("reports.orderAccountStatementShipmentManualInputHint")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                      <input
                        inputMode="numeric"
                        value={manualShipmentWarehouseIdText ?? ""}
                        onChange={(e) => setManualShipmentWarehouseIdText(e.target.value)}
                        placeholder={t("reports.orderAccountStatementShipmentManualWarehousePlaceholder")}
                        className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400"
                      />
                      <input
                        inputMode="numeric"
                        value={manualShipmentMovementIdText ?? ""}
                        onChange={(e) => setManualShipmentMovementIdText(e.target.value)}
                        placeholder={t("reports.orderAccountStatementShipmentManualMovementPlaceholder")}
                        className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
            <OrderAccountStatementDocumentContentSection
              t={t}
              companyName={companyName}
              setCompanyName={setCompanyName}
              branchName={branchName}
              setBranchName={setBranchName}
              emblemDataUrl={emblemDataUrl}
              setEmblemDataUrl={setEmblemDataUrl}
              emblemFileInputRef={emblemFileInputRef}
              onEmblemFileChange={onEmblemFileChange}
              onUseBrandingEmblem={onUseBrandingEmblem}
              brandingLogoBusy={brandingLogoBusy}
              documentTitle={documentTitle}
              setDocumentTitle={setDocumentTitle}
              showDocumentTagline={showDocumentTagline}
            />
            <OrderAccountStatementActionsSection
              t={t}
              locale={locale}
              saveToSystem={saveToSystem}
              setSaveToSystem={setSaveToSystem}
              branchSelectOptions={branchSelectOptions}
              linkedBranchId={linkedBranchId}
              setLinkedBranchId={setLinkedBranchId}
              previousBalanceText={previousBalanceText}
              setPreviousBalanceText={setPreviousBalanceText}
              applySelectedBranchOpenBalance={applySelectedBranchOpenBalance}
              applyBranchOpenBalanceBusy={applyBranchOpenBalanceBusy}
              suggestionsBusy={suggestionsBusy}
            />
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {t("reports.orderAccountStatementReceiptSectionTitle")}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {t("reports.orderAccountStatementReceiptMovedOutHelp")}
              </p>
              <div className="mt-2">
                <Link
                  href="/products/order-account-statement/summary"
                  className="inline-flex rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700"
                >
                  {t("reports.orderAccountStatementReceiptOpenSummaryCta")}
                </Link>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  {t("reports.orderAccountStatementSuggestionsTitle")}
                </p>
                <Link
                  href="/products/order-account-statement/summary"
                  className="text-xs font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:decoration-violet-600"
                >
                  {t("reports.orderAccountStatementSuggestionsOpenReport")}
                </Link>
              </div>
              {suggestionsBusy ? (
                <p className="mt-1 text-xs text-zinc-500">{t("reports.loading")}</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">{t("reports.orderAccountStatementSuggestionsEmpty")}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                  {suggestions.slice(0, 5).map((s) => (
                    <li key={`${s.counterpartyType}-${s.counterpartyId}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.counterpartyName}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatLocaleAmount(s.openAmount, locale, "TRY")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={showDocumentTagline}
                onCheckedChange={setShowDocumentTagline}
              />
              <span className="min-w-0">
                <span className="font-medium text-zinc-800">{t("reports.orderAccountStatementShowTagline")}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                  {t("reports.orderAccountStatementShowTaglineHelp")}
                </span>
              </span>
            </label>
            <div className="mt-4">
              <OasTemplatePickers
                layoutVariant={layoutVariant}
                onLayoutChange={setLayoutVariant}
                contentPreset={contentPreset}
                onContentPresetChange={applyContentPreset}
                layoutOptions={layoutSelectOptions}
                contentOptions={contentSelectOptions}
                nameSuffix="form"
              />
            </div>
          </StatementFormStep>

          <div ref={linesSectionRef}>
          <StatementFormStep
            title={t("reports.orderAccountStatementStepLines")}
            stepVisual={{ tone: "emerald", icon: "lines" }}
            scopeKinds={["document", "system"]}
            actions={
              <div className="hidden lg:block">
                <OasIconButton
                  title={t("reports.orderAccountStatementAddLine")}
                  aria-label={t("reports.orderAccountStatementAddLine")}
                  onClick={handleAddLine}
                  disabled={lineAddBlocked}
                  className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
                >
                  <PlusIcon className="h-6 w-6 shrink-0 text-current" />
                </OasIconButton>
              </div>
            }
            collapsible
            collapseLabelExpand={t("reports.orderAccountStatementLinesSectionExpand")}
            collapseLabelCollapse={t("reports.orderAccountStatementLinesSectionCollapse")}
          >
            <p className="mb-2 text-[11px] text-zinc-500 lg:hidden">{t("reports.orderAccountStatementTableScrollHint")}</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 px-3 text-xs"
                onClick={collapseLinesToParentProduct}
              >
                {t("reports.orderAccountStatementParentMergeButton")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="hidden min-h-9 px-3 text-xs lg:inline-flex"
                onClick={() => setDesktopLineDetailsOpen((v) => !v)}
              >
                {desktopLineDetailsOpen ? "Masaustu sade gorunum" : "Masaustu detaylari goster"}
              </Button>
            </div>
            {creationMode === "shipmentBased" && shipmentLinkMode === "strict" ? (
              <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                {t("reports.orderAccountStatementStrictModeManualBlocked")}
              </p>
            ) : null}
            <div
              className={cn(
                "rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3",
                lineDense ? "mb-2 py-2" : "mb-3 py-2.5"
              )}
            >
              <label className="flex cursor-pointer items-start gap-2.5 text-left">
                <Checkbox
                  className="mt-0.5"
                  checked={showQuantityColumn}
                  onCheckedChange={setShowQuantityColumn}
                />
                <span className="min-w-0 text-xs leading-snug text-zinc-700">
                  <span className="block font-medium text-zinc-900">{t("reports.orderAccountStatementShowQtyColumn")}</span>
                  <span className="text-[11px] text-zinc-500">{t("reports.orderAccountStatementShowQtyColumnHelp")}</span>
                </span>
              </label>
            </div>
            <div className="mb-2 lg:hidden">
              <button
                type="button"
                className="inline-flex min-h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
                onClick={() => setMobileAdvancedOpen((v) => !v)}
              >
                {mobileAdvancedOpen ? "Hizli giris modu" : "Gelismis alanlari goster"}
              </button>
            </div>

            <ul
              className={cn(
                "lg:hidden",
                lineDense ? "mt-1.5 space-y-1" : lineCompact ? "mt-2 space-y-2" : "mt-3 space-y-3"
              )}
            >
              {lines.map((line, rowIndex) => {
                const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
                return (
                <li
                  key={line.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", line.id);
                    beginLineDrag(line.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    hoverLineDropTarget(line.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropLineOnTarget(line.id);
                  }}
                  onDragEnd={finishLineDrag}
                  className={cn(
                    "rounded-lg border border-zinc-200 bg-zinc-50/40 shadow-sm",
                    Boolean(amountMismatch) && "border-red-200 bg-red-50/40 ring-1 ring-red-100",
                    draggingLineId === line.id && "opacity-55",
                    dragOverLineId === line.id && draggingLineId !== line.id && "ring-2 ring-violet-200",
                    lineDense ? "p-2" : lineCompact ? "p-2.5" : "p-3"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 border-b border-zinc-200/80",
                      lineDense ? "pb-1.5" : "pb-2"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex min-w-[1.5rem] items-center justify-center rounded-md bg-zinc-200/80 font-bold text-zinc-800",
                        lineDense
                          ? "h-5 min-w-[1.25rem] text-[9px]"
                          : lineCompact
                            ? "h-6 min-w-[1.5rem] text-[10px]"
                            : "h-7 min-w-[1.75rem] text-xs"
                      )}
                    >
                      {rowIndex + 1}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">surukle</span>
                    {lines.length > 1 ? (
                      <OasTrashButton
                        label={t("reports.orderAccountStatementRemove")}
                        onClick={() => setLines((prev) => prev.filter((x) => x.id !== line.id))}
                      />
                    ) : null}
                  </div>
                  <label
                    className={cn(
                      "mt-2 block font-medium text-zinc-600",
                      lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    {t("reports.orderAccountStatementColProduct")}
                    <RequiredMark />
                    <input
                      className={cn(
                        "mt-1 w-full rounded-md border border-zinc-200 bg-white",
                        lineDense
                          ? "px-1.5 py-1 text-[11px]"
                          : lineCompact
                            ? "px-1.5 py-1.5 text-xs"
                            : "px-2 py-2 text-sm"
                      )}
                      data-line-desc-id={line.id}
                      data-line-id={line.id}
                      data-line-field="description"
                      value={line.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x) =>
                            x.id === line.id
                              ? {
                                  ...x,
                                  description: v,
                                  selectedProductId: null,
                                  parentProductId: null,
                                  parentProductName: null,
                                  lineSource:
                                    creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                      ? "shipment"
                                      : "manual",
                                  manualReasonCode:
                                    creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                      ? null
                                      : "OPS_OTHER",
                                }
                              : x
                          )
                        );
                      }}
                      onKeyDown={(e) => handleMobileLineEnter(e, line.id, "description")}
                      placeholder={t("reports.orderAccountStatementLinePlaceholder")}
                    />
                  </label>
                  {showQuantityColumn && mobileAdvancedOpen ? (
                    <>
                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementColQtyShort")}
                        <input
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.quantityText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, quantityText: v } : x)));
                          }}
                          placeholder={t("reports.orderAccountStatementColQtyPlaceholder")}
                          autoComplete="off"
                        />
                      </label>
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementUnit")}
                        <input
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.unitText ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)));
                          }}
                          placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                          autoComplete="off"
                        />
                      </label>
                      <label
                        className={cn(
                          "block font-medium text-zinc-600",
                          lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                        )}
                      >
                        {t("reports.orderAccountStatementUnitPrice")}
                        <input
                          inputMode="decimal"
                          className={cn(
                            "mt-0.5 w-full rounded-md border border-zinc-200 bg-white text-right tabular-nums",
                            lineDense
                              ? "px-1.5 py-1 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1.5 text-xs"
                                : "px-2 py-1.5 text-sm"
                          )}
                          value={line.unitPriceText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitPriceText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, unitPriceText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                          placeholder="0"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    {amountMismatch ? (
                      <p className="mt-1.5 rounded-md border border-red-200 bg-red-50/80 px-2 py-1 text-[11px] text-red-700">
                        Kalem tutarı uyumsuz: {formatLocaleAmount(amountMismatch.expected, locale, "TRY")} beklenirken{" "}
                        {formatLocaleAmount(amountMismatch.actual, locale, "TRY")} girildi.
                      </p>
                    ) : null}
                    </>
                  ) : null}
                  {canPickProducts ? (
                    <ModernSelect
                      className={cn(
                        "border-dashed",
                        lineDense
                          ? "mt-1 py-1.5 pl-2 pr-8 text-[9px]"
                          : lineCompact
                            ? "mt-1.5 py-1.5 pl-2.5 pr-8 text-[10px]"
                            : "mt-2 py-2 pl-3 pr-8 text-xs"
                      )}
                      aria-label={t("reports.orderAccountStatementPickProduct")}
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        e.target.value = "";
                        applyCatalogProductToLine(line.id, id);
                      }}
                    >
                      <option value="">{t("reports.orderAccountStatementCatalogNone")}</option>
                      {catalogOptionsWithCost.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.optionLabel}
                        </option>
                      ))}
                    </ModernSelect>
                  ) : null}
                  {line.selectedProductId ? (
                    (() => {
                      const cost = latestCostByProductId.get(line.selectedProductId);
                      const priceSuggestion = linePriceSuggestionByLineId[line.id];
                      if (!cost) {
                        return (
                          <div className="mt-1 flex flex-col gap-1">
                            <p className="text-[11px] text-zinc-500">
                              {t("reports.orderAccountStatementCostSuggestionMissing")}
                            </p>
                            {priceSuggestion ? (
                              <p className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-800">
                                Satış önerisi:{" "}
                                {formatLocaleAmount(
                                  Number(priceSuggestion.suggestedUnitPrice || 0),
                                  locale,
                                  priceSuggestion.currencyCode
                                )}{" "}
                                ({priceSuggestion.basis}, n={priceSuggestion.sampleCount})
                              </p>
                            ) : null}
                            <div>
                              <Button
                                type="button"
                                variant="secondary"
                                className="mr-1 min-h-8 px-2 py-1 text-[11px]"
                                onClick={() =>
                                  line.selectedProductId
                                    ? void loadSalesSuggestionForLine(line.id, line.selectedProductId, true)
                                    : undefined
                                }
                              >
                                Satış önerisi çek
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-8 px-2 py-1 text-[11px]"
                                onClick={() => void openPriceHistoryForLine(line)}
                              >
                                Fiyat geçmişi
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1 flex flex-col gap-1">
                          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                            {t("reports.orderAccountStatementSuggestedCostShort")}:{" "}
                            {formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)}
                            {" · "}
                            {t("reports.orderAccountStatementCostIncVatShort")}:{" "}
                            {formatLocaleAmount(Number(cost.unitCostIncludingVat || 0), locale, cost.currencyCode)}
                          </p>
                          {priceSuggestion ? (
                            <p className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-800">
                              Satış önerisi:{" "}
                              {formatLocaleAmount(
                                Number(priceSuggestion.suggestedUnitPrice || 0),
                                locale,
                                priceSuggestion.currencyCode
                              )}{" "}
                              ({priceSuggestion.basis}, n={priceSuggestion.sampleCount})
                            </p>
                          ) : null}
                          <div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="mr-1 min-h-8 px-2 py-1 text-[11px]"
                              onClick={() =>
                                line.selectedProductId
                                  ? void loadSalesSuggestionForLine(line.id, line.selectedProductId, true)
                                  : undefined
                              }
                            >
                              Satış önerisi çek
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-8 px-2 py-1 text-[11px]"
                              onClick={() => void openPriceHistoryForLine(line)}
                            >
                              Fiyat geçmişi
                            </Button>
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                  <LineCalcBlock
                    line={line}
                    locale={locale}
                    t={t}
                    setLines={setLines}
                    compact={lineCompact}
                    ultraCompact={lineDense}
                    className={cn("border-t border-zinc-200/80", lineDense ? "mt-1.5 pt-1.5" : "mt-2.5 pt-2.5")}
                  />
                  <div className={cn("grid grid-cols-2 gap-2", lineDense ? "mt-1.5" : "mt-2.5")}>
                    <label
                      className={cn(
                        "block font-medium text-zinc-600",
                        lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                      )}
                    >
                      {t("reports.orderAccountStatementAmount")}
                      <RequiredMark />
                      <input
                        data-line-id={line.id}
                        data-line-field="amount"
                        inputMode="decimal"
                        className={cn(
                          "mt-0.5 w-full rounded-md border border-zinc-200 bg-white text-right tabular-nums",
                          lineDense
                            ? "px-1.5 py-1 text-[11px]"
                            : lineCompact
                              ? "px-1.5 py-1.5 text-xs"
                              : "px-2 py-2 text-sm"
                        )}
                        value={line.amountText}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                        }}
                        onBlur={() => {
                          const n = parseLocaleAmount(line.amountText, locale);
                          if (!Number.isFinite(n)) return;
                          setLines((prev) =>
                            prev.map((x) =>
                              x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                            )
                          );
                        }}
                        onKeyDown={(e) => handleMobileLineEnter(e, line.id, "amount")}
                      />
                    </label>
                    <div className="flex min-h-0 items-end pb-0.5">
                      <label
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white",
                          lineDense ? "px-1.5 py-0.5" : lineCompact ? "px-1.5 py-1" : "px-2 py-1.5"
                        )}
                      >
                        <span
                          className={cn(
                            "whitespace-nowrap font-medium text-zinc-700",
                            lineDense ? "text-[10px]" : "text-xs"
                          )}
                        >
                          {t("reports.orderAccountStatementGift")}
                        </span>
                        <Checkbox
                          className="shrink-0"
                          checked={line.isGift}
                          onCheckedChange={(next) => {
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, isGift: next } : x)));
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
            <div className="mt-3 lg:hidden">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddLine}
                disabled={lineAddBlocked}
                className="min-h-11 w-full gap-2 !border-zinc-300 !text-zinc-800"
              >
                <PlusIcon className="h-5 w-5 shrink-0 text-current" />
                <span>{t("reports.orderAccountStatementAddLine")}</span>
              </Button>
            </div>

            {/* Tablet ve üstü: tablo */}
            <div
              className={cn(
                "mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block",
                lineDense ? "text-[11px]" : lineCompact && "text-xs"
              )}
            >
              <table
                className={cn(
                  "w-full border-collapse text-left",
                  showQuantityColumn ? "min-w-0 xl:min-w-[63rem]" : "min-w-0 lg:min-w-[42rem]",
                  lineDense ? "text-[11px]" : lineCompact ? "text-xs" : "text-sm"
                )}
              >
                <thead>
                  <tr
                    className={cn(
                      "border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600",
                      lineDense ? "text-[9px]" : lineCompact ? "text-[10px]" : "text-xs"
                    )}
                  >
                    <th
                      scope="col"
                      className={cn(
                        "w-9 whitespace-nowrap px-1.5 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementColRow")}
                    </th>
                    <th
                      scope="col"
                      className={cn("min-w-[10rem] px-2", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5")}
                    >
                      {t("reports.orderAccountStatementColProduct")}
                      <RequiredMark />
                    </th>
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[5.5rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementColQtyShort")}
                      </th>
                    ) : null}
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[5rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementUnit")}
                      </th>
                    ) : null}
                    {showQuantityColumn ? (
                      <th
                        scope="col"
                        className={cn(
                          "w-[6.25rem] whitespace-nowrap px-1.5 text-right",
                          lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                        )}
                      >
                        {t("reports.orderAccountStatementUnitPrice")}
                      </th>
                    ) : null}
                    <th
                      scope="col"
                      className={cn(
                        "w-[6.5rem] whitespace-nowrap px-1.5 text-right",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementAmount")}
                      <RequiredMark />
                    </th>
                    <th
                      scope="col"
                      className={cn(
                        "w-16 whitespace-nowrap px-1 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementGift")}
                    </th>
                    <th
                      scope="col"
                      className={cn(
                        "w-[5.5rem] whitespace-nowrap px-1 text-center",
                        lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2.5"
                      )}
                    >
                      {t("reports.orderAccountStatementColActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, rowIndex) => {
                    const amountMismatch = showQuantityColumn ? computeLineAmountMismatch(line, locale) : null;
                    return (
                    <Fragment key={line.id}>
                    <tr
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", line.id);
                        beginLineDrag(line.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        hoverLineDropTarget(line.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        dropLineOnTarget(line.id);
                      }}
                      onDragEnd={finishLineDrag}
                      className={cn(
                        "border-b border-zinc-100 last:border-b-0",
                        Boolean(amountMismatch) && "bg-red-50/35",
                        draggingLineId === line.id && "opacity-60",
                        dragOverLineId === line.id && draggingLineId !== line.id && "ring-2 ring-inset ring-violet-200"
                      )}
                    >
                      <td
                        className={cn(
                          "align-top px-1.5 text-center text-zinc-500",
                          lineDense ? "py-1 text-[9px]" : lineCompact ? "py-1.5 text-[10px]" : "py-2 text-xs"
                        )}
                      >
                        {rowIndex + 1}
                      </td>
                      <td
                        className={cn("align-top px-2", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <input
                          className={cn(
                            "w-full min-w-0 rounded-md border border-zinc-200",
                            lineDense ? "px-1 py-0.5" : lineCompact ? "px-1.5 py-1" : "px-2 py-1.5"
                          )}
                          data-line-desc-id={line.id}
                          value={line.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id
                                  ? {
                                      ...x,
                                      description: v,
                                      selectedProductId: null,
                                      parentProductId: null,
                                      parentProductName: null,
                                      lineSource:
                                        creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                          ? "shipment"
                                          : "manual",
                                      manualReasonCode:
                                        creationMode === "shipmentBased" && shipmentLinkMode === "strict"
                                          ? null
                                          : "OPS_OTHER",
                                    }
                                  : x
                              )
                            );
                          }}
                          placeholder={t("reports.orderAccountStatementLinePlaceholder")}
                        />
                        {canPickProducts && desktopLineDetailsOpen ? (
                          <ModernSelect
                            className={cn(
                              "border-dashed bg-zinc-50/80",
                              lineDense
                                ? "mt-0.5 py-1.5 pl-1.5 pr-8 text-[9px]"
                                : lineCompact
                                  ? "mt-1 py-1.5 pl-2 pr-8 text-[10px]"
                                  : "mt-1.5 py-2 pl-2.5 pr-8 text-xs"
                            )}
                            aria-label={t("reports.orderAccountStatementPickProduct")}
                            value=""
                            onChange={(e) => {
                              const id = e.target.value;
                              e.target.value = "";
                              applyCatalogProductToLine(line.id, id);
                            }}
                          >
                            <option value="">{t("reports.orderAccountStatementCatalogNone")}</option>
                            {catalogOptionsWithCost.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.optionLabel}
                              </option>
                            ))}
                          </ModernSelect>
                        ) : null}
                        {line.selectedProductId && desktopLineDetailsOpen ? (
                          (() => {
                            const cost = latestCostByProductId.get(line.selectedProductId);
                            if (!cost) {
                              return (
                                <p className="mt-1 text-[11px] text-zinc-500">
                                  {t("reports.orderAccountStatementCostSuggestionMissing")}
                                </p>
                              );
                            }
                            return (
                              <p className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                                {t("reports.orderAccountStatementSuggestedCostShort")}:{" "}
                                {formatLocaleAmount(Number(cost.unitCostExcludingVat || 0), locale, cost.currencyCode)}
                                {" · "}
                                {t("reports.orderAccountStatementCostIncVatShort")}:{" "}
                                {formatLocaleAmount(Number(cost.unitCostIncludingVat || 0), locale, cost.currencyCode)}
                              </p>
                            );
                          })()
                        ) : null}
                        {desktopLineDetailsOpen ? (
                          <LineCalcBlock
                            line={line}
                            locale={locale}
                            t={t}
                            setLines={setLines}
                            compact={lineCompact}
                            ultraCompact={lineDense}
                            className={cn("max-w-xl", lineDense ? "mt-1" : "mt-1.5")}
                          />
                        ) : null}
                      </td>
                        {showQuantityColumn ? (
                          <td
                            className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                          >
                            <input
                              className={cn(
                                "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                                lineDense
                                  ? "px-1 py-0.5 text-[10px]"
                                  : lineCompact
                                    ? "px-1 py-1 text-[11px]"
                                    : "px-1.5 py-1.5"
                              )}
                              value={line.quantityText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, quantityText: v } : x)));
                              }}
                              placeholder="—"
                              autoComplete="off"
                            />
                          </td>
                        ) : null}
                      {showQuantityColumn ? (
                        <td
                          className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                        >
                          <input
                            className={cn(
                              "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                              lineDense
                                ? "px-1 py-0.5 text-[10px]"
                                : lineCompact
                                  ? "px-1 py-1 text-[11px]"
                                  : "px-1.5 py-1.5"
                            )}
                            value={line.unitText ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitText: v } : x)));
                            }}
                            placeholder={t("reports.orderAccountStatementUnitPlaceholder")}
                            autoComplete="off"
                          />
                        </td>
                      ) : null}
                      {showQuantityColumn ? (
                        <td
                          className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                        >
                          <input
                            inputMode="decimal"
                            className={cn(
                              "w-full min-w-0 rounded-md border border-zinc-200 text-right tabular-nums",
                              lineDense
                                ? "px-1 py-0.5 text-[10px]"
                                : lineCompact
                                  ? "px-1 py-1 text-[11px]"
                                  : "px-1.5 py-1.5"
                            )}
                            value={line.unitPriceText}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, unitPriceText: v } : x)));
                            }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.unitPriceText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, unitPriceText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                            placeholder="0"
                            autoComplete="off"
                          />
                        </td>
                      ) : null}
                      <td
                        className={cn("align-top px-1.5", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <input
                          inputMode="decimal"
                          className={cn(
                            "w-full rounded-md border border-zinc-200 text-right tabular-nums",
                            lineDense
                              ? "px-1 py-0.5 text-[11px]"
                              : lineCompact
                                ? "px-1.5 py-1"
                                : "px-2 py-1.5"
                          )}
                          value={line.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </td>
                      <td
                        className={cn("align-top px-1 text-center", lineDense ? "py-1" : lineCompact ? "py-1.5" : "py-2")}
                      >
                        <div
                          className={cn(
                            "inline-flex items-center justify-center",
                            lineDense ? "min-h-6 min-w-6" : "min-h-8 min-w-8"
                          )}
                        >
                          <Checkbox
                            checked={line.isGift}
                            onCheckedChange={(next) => {
                              setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, isGift: next } : x)));
                            }}
                            className={lineDense ? "!h-4 !w-4" : "!h-5 !w-5"}
                            aria-label={t("reports.orderAccountStatementGift")}
                          />
                        </div>
                      </td>
                      <td
                        className={cn("align-top px-1", lineDense ? "py-0.5" : lineCompact ? "py-1" : "py-1.5")}
                      >
                        <div className="flex flex-wrap items-center justify-center">
                          {lines.length > 1 ? (
                            <OasTrashButton
                              label={t("reports.orderAccountStatementRemove")}
                              onClick={() => setLines((prev) => prev.filter((x) => x.id !== line.id))}
                            />
                          ) : (
                            <span className="text-sm text-zinc-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {amountMismatch ? (
                      <tr className="border-b border-red-100 bg-red-50/50">
                        <td colSpan={showQuantityColumn ? 8 : 5} className="px-2 py-1.5 text-[11px] text-red-700">
                          Kalem tutarı uyumsuz: {formatLocaleAmount(amountMismatch.expected, locale, "TRY")} beklenirken{" "}
                          {formatLocaleAmount(amountMismatch.actual, locale, "TRY")} girildi.
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StatementFormStep>
          </div>

          <StatementFormStep
            title={t("reports.orderAccountStatementStepPromoLines")}
            description={t("reports.orderAccountStatementPromoLinesHelp")}
            stepVisual={{ tone: "amber", icon: "promo" }}
            scopeKinds={["document", "system"]}
            actions={
              <OasIconButton
                title={t("reports.orderAccountStatementAddPromoLine")}
                aria-label={t("reports.orderAccountStatementAddPromoLine")}
                onClick={() => setPromoLines((p) => [...p, emptyPromo()])}
                className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
              >
                <PlusIcon className="h-6 w-6 shrink-0 text-current" />
              </OasIconButton>
            }
          >
            <p className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-800 ring-1 ring-zinc-950/[0.04]">
              {t("reports.orderAccountStatementGiftAutoHint")}
            </p>
            {promoLines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPromoLinesEmpty")}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 lg:hidden">
                  {promoLines.map((row, rowIndex) => (
                    <li key={row.id} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-200/90 text-xs font-bold text-zinc-800">
                          {rowIndex + 1}
                        </span>
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => setPromoLines((prev) => prev.filter((x) => x.id !== row.id))}
                        />
                      </div>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementPromoLineDesc")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={row.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, description: v } : x)));
                          }}
                        />
                      </label>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementPromoLineAmount")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm tabular-nums"
                          value={row.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(row.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setPromoLines((prev) =>
                              prev.map((x) =>
                                x.id === row.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
                  <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-900">
                        <th className="w-10 px-2 py-2 text-center">{t("reports.orderAccountStatementColRow")}</th>
                        <th className="px-3 py-2">{t("reports.orderAccountStatementPromoLineDesc")}</th>
                        <th className="w-[7.5rem] px-2 py-2 text-right">{t("reports.orderAccountStatementPromoLineAmount")}</th>
                        <th className="w-20 px-2 py-2 text-center">{t("reports.orderAccountStatementColActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoLines.map((row, rowIndex) => (
                        <tr key={row.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                              value={row.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, description: v } : x)));
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="decimal"
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                              value={row.amountText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPromoLines((prev) => prev.map((x) => (x.id === row.id ? { ...x, amountText: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseLocaleAmount(row.amountText, locale);
                                if (!Number.isFinite(n)) return;
                                setPromoLines((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                                  )
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex justify-center">
                              <OasTrashButton
                                label={t("reports.orderAccountStatementRemove")}
                                onClick={() => setPromoLines((prev) => prev.filter((x) => x.id !== row.id))}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-4">
              <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm ring-1 ring-zinc-950/[0.02]">
                <label className="block text-sm">
                  <span className="mb-1.5 inline-flex items-center gap-2 text-zinc-700">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M10 2.75a.75.75 0 01.75.75v.87a5.75 5.75 0 014.88 4.88h.87a.75.75 0 010 1.5h-.87a5.75 5.75 0 01-4.88 4.88v.87a.75.75 0 01-1.5 0v-.87a5.75 5.75 0 01-4.88-4.88h-.87a.75.75 0 010-1.5h.87a5.75 5.75 0 014.88-4.88V3.5a.75.75 0 01.75-.75zm0 3a4.25 4.25 0 100 8.5 4.25 4.25 0 000-8.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span className="font-medium">{t("reports.orderAccountStatementAdvanceShort")}</span>
                  </span>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm tabular-nums shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-300/60"
                    placeholder="0"
                    value={advanceText}
                    onChange={(e) => setAdvanceText(e.target.value)}
                    onBlur={() => {
                      const n = parseLocaleAmount(advanceText, locale);
                      if (Number.isFinite(n)) setAdvanceText(formatLocaleAmountInput(Math.max(0, n), locale));
                    }}
                  />
                </label>
                {advanceDeduction > 0 ? (
                  <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={receivedAdvancePostToLedger}
                      onCheckedChange={(next) => setReceivedAdvancePostToLedger(next === true)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-zinc-800">
                        {t("reports.orderAccountStatementReceivedAdvancePostToLedger")}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                        {t("reports.orderAccountStatementReceivedAdvancePostToLedgerHelp")}
                      </span>
                    </span>
                  </label>
                ) : null}
              </section>
            </div>
          </StatementFormStep>

          <StatementFormStep
            title={t("reports.orderAccountStatementStepExtraPaid")}
            description={t("reports.orderAccountStatementPaidOnBehalfHelp")}
            stepVisual={{ tone: "sky", icon: "paid" }}
            scopeKinds={["document", "system"]}
            actions={
              <OasIconButton
                title={t("reports.orderAccountStatementAddPaidLine")}
                aria-label={t("reports.orderAccountStatementAddPaidLine")}
                onClick={() => setPaidLines((p) => [...p, emptyPaid()])}
                className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
              >
                <PlusIcon className="h-6 w-6 shrink-0 text-current" />
              </OasIconButton>
            }
          >
            {paidLines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPaidEmpty")}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3 lg:hidden">
                  {paidLines.map((line, rowIndex) => (
                    <li key={line.id} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-200/80 pb-2">
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-200/80 text-xs font-bold text-zinc-700">
                          {rowIndex + 1}
                        </span>
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => setPaidLines((prev) => prev.filter((x) => x.id !== line.id))}
                        />
                      </div>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementColProduct")}
                        <input
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                          value={line.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, description: v } : x)));
                          }}
                        />
                      </label>
                      <label className="mt-3 block text-xs font-medium text-zinc-600">
                        {t("reports.orderAccountStatementAmount")}
                        <input
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm tabular-nums"
                          value={line.amountText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                          }}
                          onBlur={() => {
                            const n = parseLocaleAmount(line.amountText, locale);
                            if (!Number.isFinite(n)) return;
                            setPaidLines((prev) =>
                              prev.map((x) =>
                                x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                              )
                            );
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                        <th scope="col" className="w-10 px-2 py-2.5 text-center">
                          {t("reports.orderAccountStatementColRow")}
                        </th>
                        <th scope="col" className="min-w-[10rem] px-3 py-2.5">
                          {t("reports.orderAccountStatementColProduct")}
                        </th>
                        <th scope="col" className="w-[7.5rem] px-2 py-2.5 text-right">
                          {t("reports.orderAccountStatementAmount")}
                        </th>
                        <th scope="col" className="w-24 px-2 py-2.5 text-center">
                          {t("reports.orderAccountStatementColActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidLines.map((line, rowIndex) => (
                        <tr key={line.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                              value={line.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, description: v } : x)));
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              inputMode="decimal"
                              className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                              value={line.amountText}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPaidLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, amountText: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseLocaleAmount(line.amountText, locale);
                                if (!Number.isFinite(n)) return;
                                setPaidLines((prev) =>
                                  prev.map((x) =>
                                    x.id === line.id ? { ...x, amount: n, amountText: formatLocaleAmountInput(n, locale) } : x
                                  )
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex justify-center">
                              <OasTrashButton
                                label={t("reports.orderAccountStatementRemove")}
                                onClick={() => setPaidLines((prev) => prev.filter((x) => x.id !== line.id))}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </StatementFormStep>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2.5 px-4"
              title={t("reports.orderAccountStatementReset")}
              aria-label={t("reports.orderAccountStatementReset")}
              onClick={resetForm}
            >
              <IcEraser className="h-5 w-5" />
              <span>{t("reports.orderAccountStatementReset")}</span>
            </Button>
          </div>

      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 border-t border-zinc-200/90 bg-white/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-4 sm:py-3",
          OVERLAY_Z_TW.branchDetailSheet
        )}
      >
        {mobileLineIssueCount > 0 ? (
          <p className="mb-2 text-center text-[11px] font-medium text-amber-700 lg:hidden">
            {mobileLineIssueCount} kalemde eksik/uyumsuz bilgi var.
          </p>
        ) : null}
        <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden">
          <Button
            type="button"
            variant="secondary"
            className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
            onClick={handleAddLine}
            disabled={lineAddBlocked}
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            <span>Satır ekle</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!min-h-10 !w-full gap-1.5 px-2 text-xs"
            onClick={handleDuplicateLastLine}
            disabled={lineAddBlocked || lines.length === 0}
          >
            <IcCopy className="h-4 w-4 shrink-0" />
            <span>Son satırı kopyala</span>
          </Button>
        </div>
        <div className="flex w-full justify-center">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center gap-2 py-3 text-sm font-semibold sm:w-full sm:text-base lg:w-auto lg:min-w-[clamp(14rem,40vw,20rem)] lg:px-8"
            title={t("reports.orderAccountStatementOpenFullscreenPreview")}
            aria-label={t("reports.orderAccountStatementOpenFullscreenPreview")}
            onClick={() => setPreviewModalOpen(true)}
          >
            <IcMaximize className="h-5 w-5" />
            <span>{t("reports.orderAccountStatementOpenFullscreenPreview")}</span>
          </Button>
        </div>
      </div>

      {portalMounted && previewModalOpen
        ? createPortal(
            <div
              role="presentation"
              className={cn(
                "fixed inset-0 flex items-stretch justify-center bg-zinc-950/55 p-[max(0.25rem,env(safe-area-inset-top,0px))_max(0.25rem,env(safe-area-inset-right,0px))_max(0.25rem,env(safe-area-inset-bottom,0px))_max(0.25rem,env(safe-area-inset-left,0px))] backdrop-blur-[1px] sm:p-3 sm:items-center",
                OVERLAY_Z_TW.modal
              )}
              onClick={() => setPreviewModalOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-account-preview-dialog-title"
                className="flex min-h-0 w-full max-w-[min(100rem,calc(100vw-0px))] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 sm:max-h-[min(100dvh,100dvh-1.5rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <h2 id="order-account-preview-dialog-title" className="text-base font-bold tracking-tight text-zinc-950">
                      {t("reports.orderAccountStatementPreviewTitle")}
                    </h2>
                    <p className="text-xs text-zinc-600">{t("reports.orderAccountStatementPreviewHint")}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <OasIconButton
                      variant="secondary"
                      title={t("common.close")}
                      aria-label={t("common.close")}
                      onClick={() => setPreviewModalOpen(false)}
                      className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
                    >
                      <IcX className="h-7 w-7" />
                    </OasIconButton>
                    <OasIconButton
                      variant="primary"
                      title={
                        busy
                          ? t("reports.orderAccountStatementGeneratingPdf")
                          : t("reports.orderAccountStatementDownloadPdf")
                      }
                      aria-label={
                        busy
                          ? t("reports.orderAccountStatementGeneratingPdf")
                          : t("reports.orderAccountStatementDownloadPdf")
                      }
                      onClick={onDownloadPdfClick}
                      disabled={busy}
                      className="!h-14 !min-h-14 !w-14 sm:!h-14 sm:!min-h-14 sm:!w-14"
                    >
                      {busy ? <IcLoader className="h-7 w-7" /> : <IcDownload className="h-7 w-7" />}
                    </OasIconButton>
                  </div>
                </div>
                <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
                  <p className="mb-2 text-[11px] leading-snug text-zinc-500">
                    {t("reports.orderAccountStatementPreviewTemplateHint")}
                  </p>
                  <OasTemplatePickers
                    layoutVariant={layoutVariant}
                    onLayoutChange={setLayoutVariant}
                    contentPreset={contentPreset}
                    onContentPresetChange={applyContentPreset}
                    layoutOptions={layoutSelectOptions}
                    contentOptions={contentSelectOptions}
                    nameSuffix="preview"
                    menuZIndex={OVERLAY_Z_INDEX.modalNested + 20}
                    hideContentPicker
                  />
                  <OrderAccountStatementPreviewSettings
                    t={t}
                    saveAsInvoice={saveAsInvoice}
                    setSaveAsInvoice={setSaveAsInvoice}
                    saveToSystem={saveToSystem}
                    setSaveToSystem={setSaveToSystem}
                    invoiceAutoPost={invoiceAutoPost}
                    setInvoiceAutoPost={setInvoiceAutoPost}
                    customerAccountIdText={customerAccountIdText}
                    setCustomerAccountIdText={setCustomerAccountIdText}
                    linkedBranchId={linkedBranchId}
                    invoicePaymentDetailsOpen={invoicePaymentDetailsOpen}
                    setInvoicePaymentDetailsOpen={setInvoicePaymentDetailsOpen}
                    paymentIban={paymentIban}
                    setPaymentIban={setPaymentIban}
                    paymentAccountHolder={paymentAccountHolder}
                    setPaymentAccountHolder={setPaymentAccountHolder}
                    paymentBankName={paymentBankName}
                    setPaymentBankName={setPaymentBankName}
                    paymentNote={paymentNote}
                    setPaymentNote={setPaymentNote}
                    showPaymentOnPdf={showPaymentOnPdf}
                    setShowPaymentOnPdf={setShowPaymentOnPdf}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100/90 p-3 sm:p-5">
                  <div className="w-full min-w-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <StatementPaper
                      ref={previewRef}
                      layoutVariant={layoutVariant}
                      locale={locale}
                      companyName={companyName}
                      branchName={branchName}
                      emblemDataUrl={emblemDataUrl}
                      documentTitle={documentTitle}
                      showDocumentTagline={showDocumentTagline}
                      issuedDate={issuedDateLabel}
                      lines={previewLines}
                      showQuantityColumn={showQuantityColumn}
                      promoLines={previewPromo}
                      totals={totals}
                      advanceDeduction={advanceDeduction}
                      previousBalance={previousBalance}
                      paidOnBehalf={previewPaid}
                      paymentInfo={{
                        iban: paymentIban,
                        accountHolder: paymentAccountHolder,
                        bankName: paymentBankName,
                        paymentNote: paymentNote,
                        showOnPdf: showPaymentOnPdf,
                      }}
                      paymentLabels={{
                        section: "Ödeme bilgileri",
                        iban: t("reports.orderAccountStatementPaymentIban"),
                        accountHolder: t("reports.orderAccountStatementPaymentAccountHolder"),
                        bankName: t("reports.orderAccountStatementPaymentBankName"),
                        paymentNote: t("reports.orderAccountStatementPaymentNote"),
                      }}
                      documentMeta={{
                        referenceId: orderDocumentKey,
                        systemDocumentId: lastSavedDocumentId,
                        generationLabel: "PDF oluşturma",
                      }}
                      labels={labels}
                      emptyHint={t("reports.orderAccountStatementPreviewEmpty")}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      <Modal
        open={shipmentDetailOpen && selectedShipmentDetail != null}
        onClose={() => setShipmentDetailOpen(false)}
        titleId="order-account-shipment-detail-title"
        title={t("reports.orderAccountStatementShipmentDetailTitle")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-lg"
      >
        {selectedShipmentDetail ? (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailWarehouseId")}:</span> {selectedShipmentSource?.warehouseId ?? "-"}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailMovementId")}:</span> {selectedShipmentDetail.id}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailBranch")}:</span> {selectedShipmentDetail.branchName}</p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailProduct")}:</span> {selectedShipmentDetail.productName}</p>
            <p>
              <span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailQuantity")}:</span>{" "}
              {formatLocaleAmount(selectedShipmentDetail.quantity, locale, "TRY")} {selectedShipmentDetail.unit ?? ""}
            </p>
            <p><span className="font-semibold">{t("reports.orderAccountStatementShipmentDetailDate")}:</span> {selectedShipmentDetail.businessDate}</p>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={confirmMultiActionOpen}
        onClose={() => {
          if (multiActionRunning) return;
          setConfirmMultiActionOpen(false);
        }}
        titleId="order-account-multi-action-confirm-title"
        title={t("reports.orderAccountStatementMultiActionConfirmTitle")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-md"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {t("reports.orderAccountStatementMultiActionConfirmBody")}
          </p>
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            {multiActionSteps.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-zinc-800">
                {item.state === "running" ? (
                  <IcLoader className="h-4 w-4 animate-spin text-violet-700" />
                ) : item.state === "done" ? (
                  <IcCheck className="h-4 w-4 text-emerald-700" />
                ) : item.state === "skipped" ? (
                  <IcX className="h-4 w-4 text-zinc-400" />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
                )}
                <span className={item.state === "skipped" ? "text-zinc-400 line-through" : ""}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          {multiActionError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
              {multiActionError}
            </p>
          ) : null}
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={multiActionProgressPercent}
              aria-label={t("reports.orderAccountStatementProgressRunning")}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
                style={{ width: `${multiActionProgressPercent}%` }}
              />
            </div>
            <p className="mt-2">
              {t("reports.orderAccountStatementProgressPercent").replace(
                "{percent}",
                String(multiActionProgressPercent)
              )}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={multiActionRunning}
              onClick={() => setConfirmMultiActionOpen(false)}
            >
              {multiActionRunning ? t("reports.orderAccountStatementProgressRunning") : t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={priceHistoryOpen}
        onClose={() => setPriceHistoryOpen(false)}
        titleId="order-account-price-history-title"
        title={`Fiyat geçmişi · ${priceHistoryTitle || "Ürün"}`}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-3xl"
      >
        <div className="mt-2">
          {priceHistoryBusy ? (
            <p className="text-sm text-zinc-600">{t("common.loading")}</p>
          ) : priceHistoryRows.length === 0 ? (
            <p className="text-sm text-zinc-500">Kayıt bulunamadı.</p>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-[680px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                    <th className="px-2 py-2 text-left">Tarih</th>
                    <th className="px-2 py-2 text-left">Cari</th>
                    <th className="px-2 py-2 text-right">Birim fiyat</th>
                    <th className="px-2 py-2 text-left">Birim</th>
                    <th className="px-2 py-2 text-left">Kaynak fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistoryRows.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 text-zinc-800 last:border-0">
                      <td className="px-2 py-1.5">{row.issueDate}</td>
                      <td className="px-2 py-1.5">{row.counterpartyName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatLocaleAmount(Number(row.unitPrice || 0), locale, row.currencyCode)}
                      </td>
                      <td className="px-2 py-1.5">{row.unit || "—"}</td>
                      <td className="px-2 py-1.5">
                        {row.sourceOutboundInvoiceId ? `#${row.sourceOutboundInvoiceId}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
