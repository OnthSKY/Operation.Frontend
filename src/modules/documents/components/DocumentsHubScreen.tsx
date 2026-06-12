"use client";

import { apiFetch } from "@/shared/api/client";
import { useI18n } from "@/i18n/context";
import { useDocumentsHubQuery } from "@/modules/documents/hooks/useDocumentsHubQuery";
import type { DocumentsHubRow } from "@/modules/documents/types";
import { ImagePreview } from "./ImagePreview";
import { PdfBlobPreview } from "./PdfBlobPreview";
import { useBranchesList, useUploadBranchDocument } from "@/modules/branch/hooks/useBranchQueries";
import { useUploadCompanyDocument } from "@/modules/company/hooks/useCompanyDocumentQueries";
import { useVehicles, useUploadVehicleDocument } from "@/modules/vehicles/hooks/useVehicleQueries";
import type { CompanyDocumentKind } from "@/types/company-document";
import type { VehicleDocumentKind } from "@/types/vehicle-document";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
  useUploadNationalIdPhotos,
  useUploadPersonnelYearClosurePdf,
  useUploadProfilePhotos,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { notify } from "@/shared/lib/notify";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { TablePagination } from "@/shared/ui/TablePagination";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { BranchDocumentKind } from "@/types/branch-document";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FocusEventHandler, type ReactNode } from "react";

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};

/**
 * Categories that cannot be created via the quick-add modal: the "ALL" pseudo-filter, the
 * insurance-policy view (its files are uploaded as a regular vehicle document with an
 * INSURANCE_POLICY kind), and the invoice categories (those rows are system-generated from
 * warehouse movements / supplier invoices, not uploaded here).
 */
const NON_UPLOAD_CATEGORIES: ReadonlySet<string> = new Set([
  "ALL",
  "WAREHOUSE_INBOUND_INVOICE",
  "WAREHOUSE_OUTBOUND_INVOICE",
  "OTHER_INVOICE",
  // SHIPMENT_DELIVERY_SLIP sistem üretir (sevkiyat DELIVERED transition'ı) — manuel upload yok.
  "BRANCH_SHIPMENT_SLIP",
  // Tedarikçi fatura fotoğrafı supplier invoice modülünden upload edilir.
  "SUPPLIER_INVOICE_PHOTO",
]);

/** Belge hub upload combobox'taki branch sub-kategori → backend kind eşlemesi. */
const BRANCH_CATEGORY_TO_KIND: Record<string, "TAX_BASE" | "WORK_PERMIT" | "AGRICULTURE_CERT" | "OTHER"> = {
  BRANCH_TAX_BASE: "TAX_BASE",
  BRANCH_WORK_PERMIT: "WORK_PERMIT",
  BRANCH_AGRICULTURE_CERT: "AGRICULTURE_CERT",
  BRANCH_DOCUMENT: "OTHER",
};

/** Araç kategorisi → backend kind eşlemesi (sigorta poliçesi spesifik). */
const VEHICLE_CATEGORY_TO_KIND: Record<string, "REGISTRATION" | "INSPECTION" | "INSURANCE_POLICY" | "OTHER" | null> = {
  VEHICLE_DOCUMENT: null, // umbrella → kullanıcı kind picker'dan seçer
  VEHICLE_INSURANCE_POLICY: "INSURANCE_POLICY",
};

/** URL `q` sometimes contains literal "null"/"undefined"; treat as empty so the input stays clean. */
function sanitizeUrlSearchQuery(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return "";
  return s;
}

/**
 * PDF dosya endpoint'i `Content-Disposition: attachment` ile sunulduğundan `<iframe src>`
 * doğrudan gösteremez (indirir). Dosyayı kimlik-doğrulamalı blob olarak çekip object URL ile
 * iframe'e veririz; bu disposition'ı atlar ve satır içi önizleme sağlar.
 */
function parseShipmentMovementIds(raw: string | null | undefined): Set<number> {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
}

/**
 * Matches a branch document's notes against a set of requested shipment movement ids,
 * mirroring the detection used on the warehouse movements screen. The notes store the
 * shipment metadata as ` · `-separated `key=value` parts; the movement id list there is
 * truncated, so we match on the primary id or any overlapping linked id rather than via
 * brittle full-text substring search.
 */
function documentMatchesShipmentMovements(notes: string | null | undefined, ids: Set<number>): boolean {
  if (ids.size === 0) return false;
  const meta: Record<string, string> = {};
  for (const part of String(notes ?? "").split("·").map((x) => x.trim()).filter(Boolean)) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    meta[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
  }
  const primary = Number(meta.shipmentPrimaryMovementId ?? 0);
  if (Number.isFinite(primary) && primary > 0 && ids.has(primary)) return true;
  return String(meta.shipmentMovementIds ?? "")
    .split(",")
    .map((x) => Number(x.trim()))
    .some((n) => Number.isFinite(n) && n > 0 && ids.has(n));
}

function inferRasterKind(previewUrl: string): "png" | "jpeg" | "webp" | "generic" {
  const raw = String(previewUrl ?? "").trim();
  if (!raw) return "generic";
  try {
    const path = new URL(raw, "https://local.invalid").pathname.toLowerCase();
    const dot = path.lastIndexOf(".");
    const ext = dot >= 0 ? path.slice(dot) : "";
    if (ext === ".png") return "png";
    if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
    if (ext === ".webp") return "webp";
  } catch {
    /* ignore */
  }
  const u = raw.toLowerCase();
  if (u.includes(".png")) return "png";
  if (u.includes(".jpg") || u.includes(".jpeg")) return "jpeg";
  if (u.includes(".webp")) return "webp";
  return "generic";
}

function moduleGlyphBadgeClass(category: DocumentsHubRow["category"]): string {
  switch (category) {
    case "BRANCH_DOCUMENT":
    case "BRANCH_TAX_BASE":
    case "BRANCH_WORK_PERMIT":
    case "BRANCH_AGRICULTURE_CERT":
    case "BRANCH_SHIPMENT_SLIP":
      return "bg-violet-600 text-white";
    case "COMPANY_GENERAL_DOCUMENT":
      return "bg-fuchsia-600 text-white";
    case "VEHICLE_DOCUMENT":
      return "bg-sky-600 text-white";
    case "VEHICLE_INSURANCE_POLICY":
      return "bg-indigo-600 text-white";
    case "PERSONNEL_NATIONAL_ID":
      return "bg-emerald-600 text-white";
    case "PERSONNEL_PROFILE":
      return "bg-teal-600 text-white";
    case "PERSONNEL_YEAR_CLOSURE":
      return "bg-emerald-800 text-white";
    case "WAREHOUSE_INBOUND_INVOICE":
      return "bg-amber-600 text-white";
    case "WAREHOUSE_OUTBOUND_INVOICE":
      return "bg-orange-600 text-white";
    case "SUPPLIER_INVOICE_PHOTO":
      return "bg-rose-600 text-white";
    case "OTHER_INVOICE":
      return "bg-zinc-600 text-white";
    default:
      return "bg-zinc-500 text-white";
  }
}

function ModuleGlyphIcon({
  category,
  className,
}: {
  category: DocumentsHubRow["category"];
  className?: string;
}) {
  const cn = `shrink-0 ${className ?? ""}`.trim();
  switch (category) {
    case "BRANCH_DOCUMENT":
    case "BRANCH_TAX_BASE":
    case "BRANCH_WORK_PERMIT":
    case "BRANCH_AGRICULTURE_CERT":
    case "BRANCH_SHIPMENT_SLIP":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11h-6" />
          <path d="M9 9v0" />
          <path d="M9 13v0" />
          <path d="M9 17v0" />
        </svg>
      );
    case "COMPANY_GENERAL_DOCUMENT":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M9 7h.01" />
          <path d="M15 7h.01" />
          <path d="M9 11h.01" />
          <path d="M15 11h.01" />
          <path d="M10 21v-3a2 2 0 0 1 4 0v3" />
        </svg>
      );
    case "VEHICLE_DOCUMENT":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.4-3.2a2 2 0 0 0-1.8-1.2H8.4a2 2 0 0 0-1.8 1.2L5 10l-2.5.9C1.7 11.1 1 11.9 1 12.8V16c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case "VEHICLE_INSURANCE_POLICY":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "PERSONNEL_NATIONAL_ID":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h.01" />
          <path d="M10 15h4" />
        </svg>
      );
    case "PERSONNEL_PROFILE":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      );
    case "PERSONNEL_YEAR_CLOSURE":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "WAREHOUSE_INBOUND_INVOICE":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M12 12v9" />
          <path d="m9 15 3 3 3-3" />
        </svg>
      );
    case "WAREHOUSE_OUTBOUND_INVOICE":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M12 21V12" />
          <path d="m9 9 3-3 3 3" />
        </svg>
      );
    case "OTHER_INVOICE":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
  }
}

/** Decorative file-type tile + source module badge (not the real file — avoids accidental open/download). */
function DocumentGlyph({
  category,
  previewMode,
  previewUrl,
}: {
  category: DocumentsHubRow["category"];
  previewMode: DocumentsHubRow["previewMode"];
  previewUrl: string;
}) {
  let fileTile: ReactNode;
  if (previewMode === "pdf") {
    fileTile = (
      <div className="flex h-12 w-10 flex-col overflow-hidden rounded-md border border-rose-200 bg-white shadow-sm sm:h-14 sm:w-11">
        <div className="flex h-5 shrink-0 items-center justify-center bg-gradient-to-r from-rose-600 to-red-500 sm:h-[22px]">
          <span className="text-[8px] font-bold tracking-wide text-white sm:text-[9px]">PDF</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-2">
          <div className="h-0.5 rounded-sm bg-rose-100/90 sm:h-1" />
          <div className="h-0.5 rounded-sm bg-rose-50 sm:h-1" />
          <div className="h-0.5 w-3/4 rounded-sm bg-rose-50/80 sm:h-1" />
        </div>
      </div>
    );
  } else if (previewMode === "image") {
    const kind = inferRasterKind(previewUrl);
    const label = kind === "png" ? "PNG" : kind === "jpeg" ? "JPEG" : kind === "webp" ? "WEBP" : "IMG";
    const bar =
      kind === "png"
        ? "from-cyan-600 to-sky-500"
        : kind === "jpeg"
          ? "from-amber-500 to-orange-500"
          : kind === "webp"
            ? "from-violet-600 to-purple-500"
            : "from-emerald-600 to-teal-500";
    const frame = kind === "png" ? "border-cyan-200" : kind === "jpeg" ? "border-amber-200" : kind === "webp" ? "border-violet-200" : "border-emerald-200";

    fileTile = (
      <div className={`flex h-12 w-10 flex-col overflow-hidden rounded-md border bg-white shadow-sm sm:h-14 sm:w-11 ${frame}`}>
        <div className={`flex h-5 shrink-0 items-center justify-center bg-gradient-to-r ${bar} sm:h-[22px]`}>
          <span className="text-[7px] font-bold tracking-wide text-white sm:text-[8px]">{label}</span>
        </div>
        <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-slate-50 to-white px-1 pb-1 pt-0.5 sm:px-1.5 sm:pb-1.5 sm:pt-1">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-sky-400/90 sm:h-9 sm:w-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
            <path d="M8 14h8M8 17h5" className="text-sky-300/80" strokeWidth="1.1" />
            <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
            <path d="m14 9 4 4" />
          </svg>
        </div>
      </div>
    );
  } else {
    fileTile = (
      <div className="flex h-12 w-10 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm sm:h-14 sm:w-11">
        <div className="flex h-5 shrink-0 items-center justify-center bg-gradient-to-r from-zinc-500 to-zinc-600 sm:h-[22px]">
          <span className="text-[8px] font-bold tracking-wide text-white sm:text-[9px]">···</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-2">
          <div className="h-0.5 rounded-sm bg-zinc-100 sm:h-1" />
          <div className="h-0.5 rounded-sm bg-zinc-50 sm:h-1" />
          <div className="h-0.5 w-2/3 rounded-sm bg-zinc-50 sm:h-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-12 w-10 shrink-0 sm:h-14 sm:w-11" aria-hidden>
      {fileTile}
      <div
        className={`absolute bottom-0.5 right-0.5 z-[1] flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white shadow-md sm:bottom-1 sm:right-1 sm:h-[22px] sm:w-[22px] md:bottom-1.5 md:right-1.5 md:h-6 md:w-6 ${moduleGlyphBadgeClass(category)}`}
      >
        <ModuleGlyphIcon category={category} className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
      </div>
    </div>
  );
}

function documentBadgeClass(category: DocumentsHubRow["category"]): string {
  switch (category) {
    case "BRANCH_DOCUMENT":
    case "BRANCH_TAX_BASE":
    case "BRANCH_WORK_PERMIT":
    case "BRANCH_AGRICULTURE_CERT":
    case "BRANCH_SHIPMENT_SLIP":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "COMPANY_GENERAL_DOCUMENT":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800";
    case "VEHICLE_DOCUMENT":
    case "VEHICLE_INSURANCE_POLICY":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "PERSONNEL_NATIONAL_ID":
    case "PERSONNEL_PROFILE":
    case "PERSONNEL_YEAR_CLOSURE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "WAREHOUSE_INBOUND_INVOICE":
    case "WAREHOUSE_OUTBOUND_INVOICE":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "SUPPLIER_INVOICE_PHOTO":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "OTHER_INVOICE":
      return "border-zinc-300 bg-zinc-100 text-zinc-700";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

function humanizeDocumentDetail(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  // Convert metadata payload-like text to readable summary.
  if (text.includes("=") && text.includes("·")) {
    const labelMap: Record<string, string> = {
      orderKey: "Sipariş",
      pdfDocumentNo: "Belge No",
      invoiceNo: "Fatura No",
      invoiceId: "Fatura ID",
      branch: "Şube",
      company: "Firma",
      title: "Belge",
      shipmentWarehouseId: "Sevkiyat depo",
      shipmentPrimaryMovementId: "Sevkiyat hareket",
      shipmentMovementIds: "Sevkiyat satırları",
    };
    const parsed = text
      .split("·")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx <= 0) return null;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (!value) return null;
        return `${labelMap[key] ?? key}: ${value}`;
      })
      .filter((x): x is string => Boolean(x));

    if (parsed.length > 0) return parsed.slice(0, 3).join(" · ");
  }

  // Keep dates compact on cards.
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return text.slice(0, 10);
  }

  return text;
}

function formatDocumentDate(raw: string): string {
  const text = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return text;
}

function formatDocumentsListSummary(
  template: string,
  values: { count: number; from: number; to: number; total: number; page: number; pages: number }
): string {
  return template
    .replaceAll("{count}", String(values.count))
    .replaceAll("{from}", String(values.from))
    .replaceAll("{to}", String(values.to))
    .replaceAll("{total}", String(values.total))
    .replaceAll("{page}", String(values.page))
    .replaceAll("{pages}", String(values.pages));
}

function buildDocumentCardLines(
  row: DocumentsHubRow,
  categoryLabel: string
): { title: string; subtitle: string; detail: string } {
  const subtitle = String(row.subtitle ?? "").trim();
  const detail = humanizeDocumentDetail(row.detail);

  switch (row.category) {
    case "BRANCH_DOCUMENT":
    case "BRANCH_TAX_BASE":
    case "BRANCH_WORK_PERMIT":
    case "BRANCH_AGRICULTURE_CERT":
    case "BRANCH_SHIPMENT_SLIP":
      return {
        title: row.title,
        subtitle: subtitle || "Belge dosyasi",
        detail: detail || categoryLabel,
      };
    case "COMPANY_GENERAL_DOCUMENT":
      return {
        title: row.title,
        subtitle: subtitle || categoryLabel,
        detail: detail || categoryLabel,
      };
    case "VEHICLE_DOCUMENT":
    case "VEHICLE_INSURANCE_POLICY":
      return {
        title: row.title,
        subtitle: subtitle || categoryLabel,
        detail: detail || "Arac belgesi",
      };
    case "PERSONNEL_NATIONAL_ID":
    case "PERSONNEL_PROFILE":
      return {
        title: row.title,
        subtitle: categoryLabel,
        detail: detail || subtitle,
      };
    case "PERSONNEL_YEAR_CLOSURE":
      return {
        title: row.title,
        subtitle: subtitle || categoryLabel,
        detail: detail || "Yil kapanis dokumani",
      };
    case "WAREHOUSE_INBOUND_INVOICE":
    case "WAREHOUSE_OUTBOUND_INVOICE":
    case "SUPPLIER_INVOICE_PHOTO":
    case "OTHER_INVOICE":
      return {
        title: row.title,
        subtitle: subtitle || categoryLabel,
        detail: formatDocumentDate(detail),
      };
    default:
      return {
        title: row.title,
        subtitle: subtitle || categoryLabel,
        detail,
      };
  }
}

export function DocumentsHubScreen() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(() => sanitizeUrlSearchQuery(searchParams.get("q")));
  const [category, setCategory] = useState("ALL");

  const qParam = searchParams.get("q");
  useEffect(() => {
    setQuery(sanitizeUrlSearchQuery(qParam));
  }, [qParam]);

  const shipmentMovementIdsParam = searchParams.get("shipmentMovementIds");
  const requestedShipmentMovementIds = useMemo(
    () => parseShipmentMovementIds(shipmentMovementIdsParam),
    [shipmentMovementIdsParam]
  );
  const [openError, setOpenError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  /** Hover ile prefetch edilen satır id'leri — aynı satıra tekrar gelinince yeniden istek atmasın. */
  const prefetchedIdsRef = useRef<Set<string>>(new Set());
  const prefetchTimeoutRef = useRef<number | null>(null);

  /**
   * Hover'da görsel/PDF kaynağını arka planda warm cache'e koyar.
   * 150ms debounce — scroll/hover ile yanlışlıkla tetiklenmesin.
   * HEIC için skip (CPU yoğun conversion'ı her hover'da tetiklemek istemiyoruz).
   */
  const prefetchRowOnHover = (row: DocumentsHubRow) => {
    if (prefetchTimeoutRef.current != null) {
      window.clearTimeout(prefetchTimeoutRef.current);
    }
    prefetchTimeoutRef.current = window.setTimeout(() => {
      if (prefetchedIdsRef.current.has(row.id)) return;
      prefetchedIdsRef.current.add(row.id);
      if (row.previewMode === "image") {
        // HEIC dosyaları için ayrıca convert tetiklemek istemiyoruz; sadece raw image warm.
        const isHeic = /\.heic(\?|#|$)/i.test(row.previewUrl) || /\.heif(\?|#|$)/i.test(row.previewUrl) ||
          (row.mimeType?.toLowerCase().startsWith("image/hei") ?? false);
        if (isHeic) return;
        const img = new window.Image();
        img.decoding = "async";
        img.src = row.previewUrl;
      } else if (row.previewMode === "pdf") {
        void apiFetch(row.previewUrl).catch(() => {
          prefetchedIdsRef.current.delete(row.id);
        });
      }
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current != null) window.clearTimeout(prefetchTimeoutRef.current);
    };
  }, []);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const router = useRouter();

  // Derin-link: /documents?openDoc=ID → şirket belgesini seç/önizle (kategori sınırlamasını
  // kaldır ki görünür olsun), param'ı temizle. Satır id formatı: `company-doc-<id>`.
  const openDocParam = searchParams.get("openDoc");
  useEffect(() => {
    if (!openDocParam) return;
    const id = Number.parseInt(openDocParam, 10);
    if (Number.isFinite(id) && id > 0) {
      setCategory("ALL");
      setSelectedId(`company-doc-${id}`);
      setMobilePreviewOpen(true);
    }
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("openDoc");
    const qs = params.toString();
    router.replace(qs ? `/documents?${qs}` : "/documents");
  }, [openDocParam, searchParams, router]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("BRANCH_DOCUMENT");
  const [uploadBranchId, setUploadBranchId] = useState("");
  const [uploadBranchKind, setUploadBranchKind] = useState<BranchDocumentKind>("OTHER");
  const [uploadCompanyKind, setUploadCompanyKind] = useState<CompanyDocumentKind>("GENERAL");
  const [uploadVehicleId, setUploadVehicleId] = useState("");
  const [uploadVehicleKind, setUploadVehicleKind] = useState<VehicleDocumentKind>("REGISTRATION");
  const [uploadPersonnelId, setUploadPersonnelId] = useState("");
  const [uploadNationalIdSide, setUploadNationalIdSide] = useState<"front" | "back">("front");
  const [uploadProfileSlot, setUploadProfileSlot] = useState<"1" | "2">("1");
  const [uploadYear, setUploadYear] = useState(String(new Date().getFullYear()));
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** Submit denedikten sonra true; required alanlar inline kırmızı uyarı gösterir. */
  const [uploadAttempted, setUploadAttempted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const { data: unifiedRows = [], isPending: loading } = useDocumentsHubQuery();
  const { data: branches = [] } = useBranchesList();
  const { data: vehicles = [] } = useVehicles();
  const { data: personnelList } = usePersonnelList(defaultPersonnelListFilters);
  const branchUploadMut = useUploadBranchDocument(
    Number.parseInt(uploadBranchId, 10) || 0,
  );
  const companyUploadMut = useUploadCompanyDocument();
  const vehicleUploadMut = useUploadVehicleDocument(
    Number.parseInt(uploadVehicleId, 10) || 0,
  );
  const nationalIdUploadMut = useUploadNationalIdPhotos();
  const profileUploadMut = useUploadProfilePhotos();
  const yearClosureUploadMut = useUploadPersonnelYearClosurePdf(
    Number.parseInt(uploadPersonnelId, 10) || 0,
  );

  const uploadBusy =
    branchUploadMut.isPending ||
    companyUploadMut.isPending ||
    vehicleUploadMut.isPending ||
    nationalIdUploadMut.isPending ||
    profileUploadMut.isPending ||
    yearClosureUploadMut.isPending;

  const filteredRows = useMemo<DocumentsHubRow[]>(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const hasShipmentFilter = requestedShipmentMovementIds.size > 0;
    return unifiedRows.filter((r) => {
      if (category !== "ALL" && r.category !== category) return false;
      if (hasShipmentFilter) {
        if (r.category !== "BRANCH_DOCUMENT") return false;
        if (!documentMatchesShipmentMovements(r.detail, requestedShipmentMovementIds)) return false;
      }
      if (!q) return true;
      return r.searchText.toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [unifiedRows, query, category, requestedShipmentMovementIds]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (effectivePage - 1) * pageSize;
  const pagedRows = useMemo(
    () => filteredRows.slice(pageStart, pageStart + pageSize),
    [filteredRows, pageStart, pageSize]
  );

  /**
   * Global klavye kısayolları:
   *  - j / ↓ — sonraki satır
   *  - k / ↑ — önceki satır
   *  - / — arama input'una focus
   *  - Esc — mobil önizleme açıksa kapat, değilse arama metnini temizle
   *  - Enter — seçili satırın önizlemesini aç (mobil sheet)
   *
   * Input/textarea/select içinde tetiklenmez (yazma karışmasın).
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // "/" arama'ya focus — input içinde değilse
      if (!isTyping && e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Esc — önizleme kapat veya arama temizle (typing iken de izinli)
      if (e.key === "Escape") {
        if (mobilePreviewOpen) {
          setMobilePreviewOpen(false);
          return;
        }
        if (isTyping && target === searchInputRef.current) {
          setQuery("");
          setPage(1);
          searchInputRef.current?.blur();
          return;
        }
        return;
      }

      if (isTyping) return;

      // j / k / ↓ / ↑ — satır gezme
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (pagedRows.length === 0) return;
        const idx = pagedRows.findIndex((r) => r.id === selectedId);
        const nextIdx = idx < 0 ? 0 : Math.min(idx + 1, pagedRows.length - 1);
        setSelectedId(pagedRows[nextIdx]!.id);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (pagedRows.length === 0) return;
        const idx = pagedRows.findIndex((r) => r.id === selectedId);
        const prevIdx = idx <= 0 ? 0 : idx - 1;
        setSelectedId(pagedRows[prevIdx]!.id);
        return;
      }

      // Enter — mobil önizleme aç
      if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        setMobilePreviewOpen(true);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pagedRows, selectedId, mobilePreviewOpen]);
  /** Only after explicit row click — avoids loading iframe/img on mount (can trigger unwanted downloads). */
  const previewRow = useMemo(() => {
    if (!selectedId) return null;
    return filteredRows.find((r) => r.id === selectedId) ?? null;
  }, [filteredRows, selectedId]);

  const previewPlaceholderText = useMemo(() => {
    if (loading) return t("common.loading");
    if (filteredRows.length === 0) return t("documents.empty");
    if (!selectedId) return t("documents.previewSelectHint");
    return t("documents.previewHiddenByFilter");
  }, [loading, filteredRows.length, selectedId, t]);

  const categoryOptions = useMemo(
    () => [
      { value: "ALL", label: t("documents.categoryAll") },
      { value: "BRANCH_TAX_BASE", label: t("documents.categoryBranchTaxBase") },
      { value: "BRANCH_WORK_PERMIT", label: t("documents.categoryBranchWorkPermit") },
      { value: "BRANCH_AGRICULTURE_CERT", label: t("documents.categoryBranchAgricultureCert") },
      { value: "BRANCH_SHIPMENT_SLIP", label: t("documents.categoryBranchShipmentSlip") },
      { value: "BRANCH_DOCUMENT", label: t("documents.categoryBranch") },
      { value: "COMPANY_GENERAL_DOCUMENT", label: t("documents.categoryCompanyGeneral") },
      { value: "VEHICLE_DOCUMENT", label: t("documents.categoryVehicle") },
      { value: "VEHICLE_INSURANCE_POLICY", label: t("documents.categoryVehicleInsurancePolicy") },
      { value: "PERSONNEL_NATIONAL_ID", label: t("documents.categoryPersonnelNationalId") },
      { value: "PERSONNEL_PROFILE", label: t("documents.categoryPersonnelProfile") },
      { value: "PERSONNEL_YEAR_CLOSURE", label: t("documents.categoryPersonnelYearClosure") },
      { value: "WAREHOUSE_INBOUND_INVOICE", label: t("documents.categoryWarehouseInboundInvoice") },
      { value: "WAREHOUSE_OUTBOUND_INVOICE", label: t("documents.categoryWarehouseOutboundInvoice") },
      { value: "SUPPLIER_INVOICE_PHOTO", label: t("documents.categorySupplierInvoicePhoto") },
      { value: "OTHER_INVOICE", label: t("documents.categoryOtherInvoice") },
    ],
    [t]
  );
  const categoryLabelMap = useMemo(
    () =>
      Object.fromEntries(
        categoryOptions
          .filter((opt) => opt.value !== "ALL")
          .map((opt) => [opt.value, opt.label])
      ) as Record<string, string>,
    [categoryOptions]
  );
  const orderPdfQuickFilter = "Sipariş-hesap dökümü PDF";
  const uploadCategoryOptions = categoryOptions.filter(
    (opt) => !NON_UPLOAD_CATEGORIES.has(opt.value)
  );
  const branchKindOptions: { value: BranchDocumentKind; label: string }[] = [
    { value: "TAX_BASE", label: t("documents.branchKindTaxBase") },
    { value: "WORK_PERMIT", label: t("documents.branchKindWorkPermit") },
    { value: "AGRICULTURE_CERT", label: t("documents.branchKindAgricultureCert") },
    { value: "OTHER", label: t("documents.branchKindOther") },
  ];

  const companyKindOptions: { value: CompanyDocumentKind; label: string }[] = [
    { value: "GENERAL", label: t("documents.companyKindGeneral") },
    { value: "OTHER", label: t("documents.companyKindOther") },
  ];
  const vehicleKindOptions: { value: VehicleDocumentKind; label: string }[] = [
    { value: "REGISTRATION", label: t("documents.vehicleKindRegistration") },
    { value: "INSPECTION", label: t("documents.vehicleKindInspection") },
    { value: "INSURANCE_POLICY", label: t("documents.vehicleKindInsurancePolicy") },
    { value: "OTHER", label: t("documents.vehicleKindOther") },
  ];

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }));
  const vehicleOptions = vehicles.map((v) => ({
    value: String(v.id),
    label: `${v.plateNumber}${v.brand || v.model ? ` · ${`${v.brand} ${v.model}`.trim()}` : ""}`,
  }));
  const personnelOptions = (personnelList?.items ?? []).map((p) => ({
    value: String(p.id),
    label: p.fullName,
  }));

  const openQuickAdd = () => {
    const initialCategory = !NON_UPLOAD_CATEGORIES.has(category) ? category : "BRANCH_DOCUMENT";
    setUploadCategory(initialCategory);
    setUploadBranchKind("OTHER");
    setUploadCompanyKind("GENERAL");
    setUploadVehicleKind("REGISTRATION");
    setUploadNationalIdSide("front");
    setUploadProfileSlot("1");
    setUploadYear(String(new Date().getFullYear()));
    setUploadNotes("");
    setUploadFile(null);
    setUploadError(null);
    setUploadAttempted(false);
    setUploadOpen(true);
  };
  const quickUploadDirty =
    uploadCategory !== "BRANCH_DOCUMENT" ||
    uploadBranchId.trim() !== "" ||
    uploadBranchKind !== "OTHER" ||
    uploadCompanyKind !== "GENERAL" ||
    uploadVehicleId.trim() !== "" ||
    uploadVehicleKind !== "REGISTRATION" ||
    uploadPersonnelId.trim() !== "" ||
    uploadNationalIdSide !== "front" ||
    uploadProfileSlot !== "1" ||
    uploadYear !== String(new Date().getFullYear()) ||
    uploadNotes.trim() !== "" ||
    uploadFile != null;
  const requestQuickUploadClose = useDirtyGuard({
    isDirty: quickUploadDirty,
    isBlocked: uploadBusy,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => setUploadOpen(false),
  });

  const submitQuickAdd = async () => {
    setUploadError(null);
    setUploadAttempted(true);
    if (!uploadFile || uploadFile.size <= 0) {
      setUploadError(t("documents.uploadFileRequired"));
      return;
    }
    try {
      if (uploadCategory in BRANCH_CATEGORY_TO_KIND) {
        const branchId = Number.parseInt(uploadBranchId, 10);
        if (!Number.isFinite(branchId) || branchId <= 0) {
          setUploadError(t("documents.uploadBranchRequired"));
          return;
        }
        const kindFromCategory = BRANCH_CATEGORY_TO_KIND[uploadCategory]!;
        await branchUploadMut.mutateAsync({
          file: uploadFile,
          // BRANCH_DOCUMENT umbrella'da kullanıcı uploadBranchKind ile alt-tür seçebilir;
          // spesifik kategorilerde category sub-kategoriyi belirler.
          kind: uploadCategory === "BRANCH_DOCUMENT" ? uploadBranchKind : kindFromCategory,
          notes: uploadNotes.trim() || null,
        });
      } else if (uploadCategory === "COMPANY_GENERAL_DOCUMENT") {
        await companyUploadMut.mutateAsync({
          file: uploadFile,
          kind: uploadCompanyKind,
          notes: uploadNotes.trim() || null,
        });
      } else if (uploadCategory in VEHICLE_CATEGORY_TO_KIND) {
        const vehicleId = Number.parseInt(uploadVehicleId, 10);
        if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
          setUploadError(t("documents.uploadVehicleRequired"));
          return;
        }
        const mappedKind = VEHICLE_CATEGORY_TO_KIND[uploadCategory];
        await vehicleUploadMut.mutateAsync({
          file: uploadFile,
          kind: mappedKind ?? uploadVehicleKind,
          notes: uploadNotes.trim() || null,
        });
      } else if (uploadCategory === "PERSONNEL_NATIONAL_ID") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        await nationalIdUploadMut.mutateAsync({
          personnelId,
          input: uploadNationalIdSide === "front" ? { photoFront: uploadFile } : { photoBack: uploadFile },
        });
      } else if (uploadCategory === "PERSONNEL_PROFILE") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        await profileUploadMut.mutateAsync({
          personnelId,
          input: uploadProfileSlot === "1" ? { photo1: uploadFile } : { photo2: uploadFile },
        });
      } else if (uploadCategory === "PERSONNEL_YEAR_CLOSURE") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        const year = Number.parseInt(uploadYear, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        if (!Number.isFinite(year) || year < 1990 || year > 2100) {
          setUploadError(t("documents.uploadYearInvalid"));
          return;
        }
        await yearClosureUploadMut.mutateAsync({ year, file: uploadFile });
      } else {
        // Unhandled category — never surfaces in uploadCategoryOptions; guard against false success.
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["documents-hub"] });
      notify.success(t("documents.uploadSuccess"));
      setUploadOpen(false);
    } catch (e) {
      setUploadError(toErrorMessage(e));
    }
  };

  const openSelectedInNewTab = () => {
    if (!previewRow) return;
    setOpenError(null);
    const opened = window.open(previewRow.previewUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      setOpenError(t("documents.openPopupBlocked"));
    }
  };

  const mobilePreviewBody = !previewRow ? (
    <p className="text-sm text-zinc-500">{previewPlaceholderText}</p>
  ) : previewRow.previewMode === "image" ? (
    <ImagePreview
      url={previewRow.previewUrl}
      alt={previewRow.subtitle}
      mimeType={previewRow.mimeType}
      className="h-full"
    />
  ) : previewRow.previewMode === "pdf" ? (
    <PdfBlobPreview
      url={previewRow.previewUrl}
      title={previewRow.subtitle}
      className="h-full w-full rounded-lg border border-zinc-200"
      loadingLabel={t("common.loading")}
      errorLabel={t("documents.previewNotSupported")}
    />
  ) : (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      {t("documents.previewNotSupported")}
    </div>
  );

  const previewBody = !previewRow ? (
    <p className="text-sm text-zinc-500">{previewPlaceholderText}</p>
  ) : previewRow.previewMode === "image" ? (
    <ImagePreview
      url={previewRow.previewUrl}
      alt={previewRow.subtitle}
      mimeType={previewRow.mimeType}
      className="h-[48vh]"
    />
  ) : previewRow.previewMode === "pdf" ? (
    <PdfBlobPreview
      url={previewRow.previewUrl}
      title={previewRow.subtitle}
      className="h-[52vh] w-full rounded-lg border border-zinc-200"
      loadingLabel={t("common.loading")}
      errorLabel={t("documents.previewNotSupported")}
    />
  ) : (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      {t("documents.previewNotSupported")}
    </div>
  );

  const previewPane = !previewRow ? (
    previewBody
  ) : (
    <div className="space-y-2">
      <p className="font-medium text-zinc-900">{previewRow.title}</p>
      <p className="text-sm text-zinc-600">{previewRow.subtitle}</p>
      {previewRow.relatedLinks && previewRow.relatedLinks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {previewRow.relatedLinks.map((lnk) => (
            <Link
              key={`${previewRow.id}-${lnk.href}`}
              href={lnk.href}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-violet-700"
            >
              {lnk.label}
            </Link>
          ))}
        </div>
      ) : null}
      {previewBody}
    </div>
  );

  return (
    <div className="space-y-3 overflow-x-hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white/95 p-2.5 shadow-sm sm:p-4 md:sticky md:top-2 md:z-10 md:backdrop-blur md:supports-[backdrop-filter]:bg-white/80">
        <header className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">{t("documents.pageTitle")}</h1>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-600 sm:mt-1 sm:text-sm sm:leading-normal">
            {t("documents.pageDescription")}
          </p>
        </header>

        <div className="mt-2.5 grid gap-2 sm:mt-3 sm:gap-3 md:mt-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start">
          <label className="min-w-0">
            <span className="sr-only">{t("documents.searchPlaceholder")}</span>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t("documents.searchPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none ring-zinc-900 [-webkit-tap-highlight-color:transparent] focus:border-zinc-900 focus:ring-2 sm:min-h-12 sm:text-sm"
            />
            <p className="mt-1 hidden text-[11px] text-zinc-400 sm:block">
              {t("documents.keyboardHint")}
            </p>
          </label>
          <div className="min-w-0 self-stretch">
            <Select
              name="documentsCategory"
              ariaLabel={t("documents.categoryFilterAria")}
              value={category}
              onChange={(e) => {
                setPage(1);
                setSelectedId(null);
                setCategory(e.target.value);
              }}
              onBlur={NOOP_BLUR}
              options={categoryOptions}
              menuZIndex={220}
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
          <div className="flex shrink-0 items-center justify-start gap-2 sm:order-1">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSelectedId(null);
                setCategory("BRANCH_DOCUMENT");
                setQuery(orderPdfQuickFilter);
              }}
              className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800 [-webkit-tap-highlight-color:transparent] active:bg-violet-100"
              aria-label={t("documents.orderStatementPdfQuickFilter")}
              title={t("documents.orderStatementPdfQuickFilter")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 5h18" />
                <path d="M6 12h12" />
                <path d="M10 19h4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSelectedId(null);
                setCategory("ALL");
                setQuery("");
              }}
              className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700 [-webkit-tap-highlight-color:transparent] active:bg-zinc-100"
              aria-label={t("documents.clearFilters")}
              title={t("documents.clearFilters")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px] w-full touch-manipulation px-3 py-2 text-sm [-webkit-tap-highlight-color:transparent] sm:order-2 sm:w-auto sm:min-w-[11rem] md:min-w-[12rem]"
            onClick={openQuickAdd}
          >
            {t("documents.quickAdd")}
          </Button>
        </div>
      </div>

      {openError ? <p className="text-sm text-red-600">{openError}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)]">
      <div className="min-w-0 overflow-x-hidden rounded-2xl border border-zinc-200 bg-white p-3">
        {loading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("documents.empty")}</p>
        ) : (
          <div className="space-y-3">
          <div
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-medium leading-snug text-zinc-800 sm:text-sm">
              {formatDocumentsListSummary(t("documents.listSummary"), {
                count: filteredRows.length,
                from: pageStart + 1,
                to: Math.min(pageStart + pageSize, filteredRows.length),
                total: filteredRows.length,
                page: effectivePage,
                pages: totalPages,
              })}
            </p>
            <p className="text-[11px] text-zinc-500 sm:text-xs">
              {t("documents.pageSizeLabel").replace("{n}", String(pageSize))}
            </p>
          </div>
          <ul className="space-y-2">
            {pagedRows.map((r) => (
              (() => {
                const categoryLabel = categoryLabelMap[r.category] ?? r.category;
                const lines = buildDocumentCardLines(r, categoryLabel);
                return (
              <li
                key={r.id}
                onMouseEnter={() => prefetchRowOnHover(r)}
                onFocusCapture={() => prefetchRowOnHover(r)}
                className={`rounded-xl border p-3 shadow-sm transition-colors ${
                  selectedId === r.id
                    ? "border-zinc-900 bg-zinc-100"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="min-h-[44px] min-w-0 flex-1 rounded-lg p-1 text-left touch-manipulation"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div className="flex gap-3">
                      <div className="pointer-events-none shrink-0 pt-0.5" aria-hidden>
                        <DocumentGlyph category={r.category} previewMode={r.previewMode} previewUrl={r.previewUrl} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="line-clamp-1 min-w-0 break-words text-base font-semibold text-zinc-900">{lines.title}</p>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${documentBadgeClass(r.category)}`}
                          >
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 break-all text-sm text-zinc-700">{lines.subtitle}</p>
                        <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-500">{lines.detail}</p>
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 lg:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                        setMobilePreviewOpen(true);
                      }}
                      aria-label={t("documents.open")}
                      title={t("documents.open")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                      disabled={openingId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenError(null);
                        setOpeningId(r.id);
                        void r
                          .download()
                          .catch((e2) => setOpenError(toErrorMessage(e2)))
                          .finally(() => setOpeningId(null));
                      }}
                      aria-label={t("documents.download")}
                      title={t("documents.download")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
                );
              })()
            ))}
          </ul>
          <TablePagination
            page={effectivePage}
            pageSize={pageSize}
            totalCount={filteredRows.length}
            onPageChange={setPage}
          />
          </div>
        )}
      </div>
      <div className="hidden rounded-2xl border border-zinc-200 bg-white p-3 lg:block">
        {previewPane}
      </div>
      </div>
      <Modal
        open={uploadOpen}
        onClose={requestQuickUploadClose}
        titleId="documents-quick-upload-title"
        title={t("documents.quickAdd")}
        className="max-w-lg"
        nested
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuickAdd();
          }}
        >
          <ModalFormLayout
            body={
              <FormSection>
                <Select
                  name="documentsUploadCategory"
                  label={t("documents.uploadCategoryLabel")}
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  onBlur={NOOP_BLUR}
                  options={uploadCategoryOptions}
                  menuZIndex={320}
                />

                {uploadCategory in BRANCH_CATEGORY_TO_KIND ? (
                  <>
              <Select
                name="documentsUploadBranch"
                label={t("documents.uploadBranchLabel")}
                labelRequired
                value={uploadBranchId}
                onChange={(e) => setUploadBranchId(e.target.value)}
                onBlur={NOOP_BLUR}
                options={branchOptions}
                menuZIndex={320}
                error={
                  uploadAttempted && !uploadBranchId.trim()
                    ? t("documents.uploadBranchRequired")
                    : undefined
                }
              />
              {uploadCategory === "BRANCH_DOCUMENT" ? (
                <Select
                  name="documentsUploadBranchKind"
                  label={t("documents.uploadBranchKindLabel")}
                  value={uploadBranchKind}
                  onChange={(e) => setUploadBranchKind(e.target.value as BranchDocumentKind)}
                  onBlur={NOOP_BLUR}
                  options={branchKindOptions}
                  menuZIndex={320}
                />
              ) : null}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  {t("documents.uploadNotesLabel")}
                </label>
                <textarea
                className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  maxLength={500}
                  placeholder={t("documents.uploadNotesPlaceholder")}
                />
              </div>
                  </>
                ) : null}

                {uploadCategory === "COMPANY_GENERAL_DOCUMENT" ? (
                  <>
                    <Select
                      name="documentsUploadCompanyKind"
                      label={t("documents.uploadCompanyKindLabel")}
                      value={uploadCompanyKind}
                      onChange={(e) => setUploadCompanyKind(e.target.value as CompanyDocumentKind)}
                      onBlur={NOOP_BLUR}
                      options={companyKindOptions}
                      menuZIndex={320}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">
                        {t("documents.uploadNotesLabel")}
                      </label>
                      <textarea
                        className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        maxLength={500}
                        placeholder={t("documents.uploadNotesPlaceholder")}
                      />
                    </div>
                  </>
                ) : null}

                {uploadCategory in VEHICLE_CATEGORY_TO_KIND ? (
                  <>
                    <Select
                      name="documentsUploadVehicle"
                      label={t("documents.uploadVehicleLabel")}
                      labelRequired
                      value={uploadVehicleId}
                      onChange={(e) => setUploadVehicleId(e.target.value)}
                      onBlur={NOOP_BLUR}
                      options={vehicleOptions}
                      menuZIndex={320}
                      error={
                        uploadAttempted && !uploadVehicleId.trim()
                          ? t("documents.uploadVehicleRequired")
                          : undefined
                      }
                    />
                    {uploadCategory === "VEHICLE_DOCUMENT" ? (
                      <Select
                        name="documentsUploadVehicleKind"
                        label={t("documents.uploadVehicleKindLabel")}
                        value={uploadVehicleKind}
                        onChange={(e) => setUploadVehicleKind(e.target.value as VehicleDocumentKind)}
                        onBlur={NOOP_BLUR}
                        options={vehicleKindOptions}
                        menuZIndex={320}
                      />
                    ) : null}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">
                        {t("documents.uploadNotesLabel")}
                      </label>
                      <textarea
                        className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        maxLength={500}
                        placeholder={t("documents.uploadNotesPlaceholder")}
                      />
                    </div>
                  </>
                ) : null}

                {uploadCategory === "PERSONNEL_NATIONAL_ID" || uploadCategory === "PERSONNEL_PROFILE" || uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? (
                  <Select
                    name="documentsUploadPersonnel"
                    label={t("documents.uploadPersonnelLabel")}
                    labelRequired
                    value={uploadPersonnelId}
                    onChange={(e) => setUploadPersonnelId(e.target.value)}
                    onBlur={NOOP_BLUR}
                    options={personnelOptions}
                    menuZIndex={320}
                    error={
                      uploadAttempted && !uploadPersonnelId.trim()
                        ? t("documents.uploadPersonnelRequired")
                        : undefined
                    }
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_NATIONAL_ID" ? (
                  <Select
              name="documentsUploadNationalIdSide"
              label={t("documents.uploadNationalIdSideLabel")}
              value={uploadNationalIdSide}
              onChange={(e) => setUploadNationalIdSide(e.target.value as "front" | "back")}
              onBlur={NOOP_BLUR}
              options={[
                { value: "front", label: t("documents.personnelNationalIdFront") },
                { value: "back", label: t("documents.personnelNationalIdBack") },
              ]}
              menuZIndex={320}
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_PROFILE" ? (
                  <Select
              name="documentsUploadProfileSlot"
              label={t("documents.uploadProfileSlotLabel")}
              value={uploadProfileSlot}
              onChange={(e) => setUploadProfileSlot(e.target.value as "1" | "2")}
              onBlur={NOOP_BLUR}
              options={[
                { value: "1", label: t("documents.personnelProfilePhoto1") },
                { value: "2", label: t("documents.personnelProfilePhoto2") },
              ]}
              menuZIndex={320}
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? (
                  <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                {t("documents.uploadYearLabel")}
              </label>
              <input
                type="number"
                min={1990}
                max={2100}
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                className="min-h-[44px] min-w-[44px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    {t("documents.uploadFileLabel")}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    accept={uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? "application/pdf,.pdf" : "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
              </FormSection>
            }
            footer={
              <>
                <Button type="button" variant="secondary" onClick={requestQuickUploadClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={uploadBusy}>
                  {uploadBusy ? t("common.loading") : t("documents.uploadSubmit")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>
      <Modal
        open={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        titleId="documents-mobile-preview-title"
        title={previewRow?.title ?? t("documents.pageTitle")}
        description={previewRow?.subtitle}
        closeButtonLabel={t("common.close")}
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-screen rounded-none border-0 lg:hidden"
        wide
      >
        <div className="flex h-full min-h-0 flex-col gap-3 p-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="min-h-0 flex-1">{mobilePreviewBody}</div>
          {previewRow ? (
            <div className="mt-auto flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
              <Button type="button" variant="secondary" onClick={openSelectedInNewTab}>
                {t("documents.open")}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={openingId === previewRow.id}
                onClick={() => {
                  setOpenError(null);
                  setOpeningId(previewRow.id);
                  void previewRow
                    .download()
                    .catch((e) => setOpenError(toErrorMessage(e)))
                    .finally(() => setOpeningId(null));
                }}
              >
                {openingId === previewRow.id ? t("common.loading") : t("documents.download")}
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

