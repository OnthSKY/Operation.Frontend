import { fetchBranchDocumentBlob, fetchBranchDocuments } from "@/modules/branch/api/branch-documents-api";
import { fetchBranches } from "@/modules/branch/api/branches-api";
import { fetchCompanyDocumentBlob, fetchCompanyDocuments } from "@/modules/company/api/company-documents-api";
import {
  fetchPersonnelList,
  personnelNationalIdPhotoUrl,
  personnelProfilePhotoUrl,
} from "@/modules/personnel/api/personnel-api";
import {
  fetchPersonnelYearAccountClosures,
  personnelYearClosureArchiveUrl,
  personnelYearClosurePdfDownloadUrl,
} from "@/modules/personnel/api/personnel-account-closure-api";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { fetchVehicleDocuments } from "@/modules/vehicles/api/vehicle-documents-api";
import { fetchVehicles } from "@/modules/vehicles/api/vehicles-api";
import { fetchSupplierInvoices } from "@/modules/suppliers/api/suppliers-api";
import { apiUrl } from "@/shared/api/client";
import type { DocumentsHubRow } from "@/modules/documents/types";

type TranslateFn = (key: string) => string;

function parseOrderMetadata(notes: string | null | undefined): Record<string, string> {
  const text = String(notes ?? "");
  const parts = text.split("·").map((x) => x.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (!key || !value) continue;
    map[key] = value;
  }
  return map;
}

async function fetchAllWarehouseMovementsWithInvoices(warehouseId: number) {
  const pageSize = 100;
  const allItems: Awaited<ReturnType<typeof fetchWarehouseMovementsPage>>["items"] = [];
  let page = 1;
  let totalCount = 0;

  do {
    const res = await fetchWarehouseMovementsPage(warehouseId, {
      page,
      pageSize,
    });
    totalCount = res.totalCount ?? 0;
    allItems.push(...res.items);
    if (res.items.length === 0) break;
    page += 1;
  } while (allItems.length < totalCount && page <= 100);

  return allItems.filter((x) => x.hasInvoicePhoto === true);
}

export async function fetchDocumentsHubRows(t: TranslateFn): Promise<DocumentsHubRow[]> {
  const [branches, personnelList, supplierInvoices, companyDocuments] = await Promise.all([
    fetchBranches(),
    fetchPersonnelList({ status: "all" }),
    fetchSupplierInvoices({}),
    fetchCompanyDocuments().catch(() => []),
  ]);
  const warehouses = await fetchWarehouses();
  const vehicles = await fetchVehicles();

  const branchDocsByBranch = await Promise.all(
    branches.map(async (b) => ({
      branch: b,
      docs: await fetchBranchDocuments(b.id),
    }))
  );
  const warehouseInvoicesByWarehouse = await Promise.all(
    warehouses.map(async (w) => ({
      warehouse: w,
      items: await fetchAllWarehouseMovementsWithInvoices(w.id),
    }))
  );
  const personnelYearClosures = await Promise.all(
    personnelList.items.map(async (p) => ({
      personnel: p,
      closures: await fetchPersonnelYearAccountClosures(p.id).catch(() => []),
    }))
  );
  const vehicleDocumentsByVehicle = await Promise.all(
    vehicles.map(async (v) => ({
      vehicle: v,
      docs: await fetchVehicleDocuments(v.id),
    }))
  );

  const rows: DocumentsHubRow[] = [];

  for (const p of personnelList.items) {
    if (p.hasNationalIdPhotoFront) {
      const url = personnelNationalIdPhotoUrl(p.id, "front");
      rows.push({
        id: `personnel-front-${p.id}`,
        category: "PERSONNEL_NATIONAL_ID",
        title: p.fullName,
        subtitle: t("documents.personnelNationalIdFront"),
        detail: p.branchId ? `${t("documents.branchIdLabel")}: ${p.branchId}` : t("documents.noBranch"),
        searchText: `${p.fullName} ${p.branchId ?? ""} national id front`,
          previewUrl: url,
          previewMode: "image",
          download: async () => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      });
    }
    if (p.hasNationalIdPhotoBack) {
      const url = personnelNationalIdPhotoUrl(p.id, "back");
      rows.push({
        id: `personnel-back-${p.id}`,
        category: "PERSONNEL_NATIONAL_ID",
        title: p.fullName,
        subtitle: t("documents.personnelNationalIdBack"),
        detail: p.branchId ? `${t("documents.branchIdLabel")}: ${p.branchId}` : t("documents.noBranch"),
        searchText: `${p.fullName} ${p.branchId ?? ""} national id back`,
          previewUrl: url,
          previewMode: "image",
          download: async () => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      });
    }
    if (p.hasProfilePhoto1) {
      const url = personnelProfilePhotoUrl(p.id, 1, {
        profilePhoto1Url: p.profilePhoto1Url,
        profilePhoto2Url: p.profilePhoto2Url,
      });
      rows.push({
        id: `personnel-profile1-${p.id}`,
        category: "PERSONNEL_PROFILE",
        title: p.fullName,
        subtitle: t("documents.personnelProfilePhoto1"),
        detail: p.branchId ? `${t("documents.branchIdLabel")}: ${p.branchId}` : t("documents.noBranch"),
        searchText: `${p.fullName} ${p.branchId ?? ""} profile photo 1`,
        previewUrl: url,
        previewMode: "image",
        download: async () => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      });
    }
    if (p.hasProfilePhoto2) {
      const url = personnelProfilePhotoUrl(p.id, 2, {
        profilePhoto1Url: p.profilePhoto1Url,
        profilePhoto2Url: p.profilePhoto2Url,
      });
      rows.push({
        id: `personnel-profile2-${p.id}`,
        category: "PERSONNEL_PROFILE",
        title: p.fullName,
        subtitle: t("documents.personnelProfilePhoto2"),
        detail: p.branchId ? `${t("documents.branchIdLabel")}: ${p.branchId}` : t("documents.noBranch"),
        searchText: `${p.fullName} ${p.branchId ?? ""} profile photo 2`,
        previewUrl: url,
        previewMode: "image",
        download: async () => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
      });
    }
  }

  for (const group of branchDocsByBranch) {
    for (const d of group.docs) {
      const metadata = parseOrderMetadata(d.notes);
      const pdfDocumentNo = metadata.pdfDocumentNo?.trim() || "";
      const relatedLinks =
        metadata.orderKey || metadata.invoiceNo || metadata.invoiceId
          ? [
              {
                href: `/products/order-account-statement?orderKey=${encodeURIComponent(metadata.orderKey ?? "")}`,
                label: t("reports.orderAccountStatementGoToSourceOrder"),
              },
              {
                href: `/products/order-account-statement/summary?search=${encodeURIComponent(
                  metadata.invoiceNo ?? metadata.invoiceId ?? ""
                )}`,
                label: t("reports.orderAccountStatementGoToRelatedInvoice"),
              },
            ]
          : undefined;
      const branchCategory: DocumentsHubRow["category"] =
        d.kind === "TAX_BASE"
          ? "BRANCH_TAX_BASE"
          : d.kind === "WORK_PERMIT"
            ? "BRANCH_WORK_PERMIT"
            : d.kind === "AGRICULTURE_CERT"
              ? "BRANCH_AGRICULTURE_CERT"
              : d.kind === "SHIPMENT_DELIVERY_SLIP"
                ? "BRANCH_SHIPMENT_SLIP"
                : "BRANCH_DOCUMENT";
      rows.push({
        id: `branch-${group.branch.id}-doc-${d.id}`,
        category: branchCategory,
        mimeType: d.contentType,
        title: group.branch.name,
        subtitle:
          pdfDocumentNo.length > 0
            ? `Sipariş-hesap dökümü PDF · ${pdfDocumentNo}`
            : d.originalFileName ?? d.kind,
        detail: d.notes ?? d.kind,
        searchText: `${group.branch.name} ${d.kind} ${d.originalFileName ?? ""} ${d.notes ?? ""} ${pdfDocumentNo}`,
        previewUrl: apiUrl(`/branches/${group.branch.id}/documents/${d.id}/file`),
        previewMode: d.contentType === "application/pdf" ? "pdf" : d.contentType.startsWith("image/") ? "image" : "other",
        relatedLinks,
        download: async () => {
          const { blob, contentType } = await fetchBranchDocumentBlob(group.branch.id, d.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const ext =
            contentType === "application/pdf"
              ? "pdf"
              : contentType.includes("png")
                ? "png"
                : contentType.includes("webp")
                  ? "webp"
                  : "jpg";
          a.download = `branch-${group.branch.id}-doc-${d.id}.${ext}`;
          a.rel = "noopener";
          a.click();
          URL.revokeObjectURL(url);
        },
      });
    }
  }

  for (const d of companyDocuments) {
    rows.push({
      id: `company-doc-${d.id}`,
      category: "COMPANY_GENERAL_DOCUMENT",
      mimeType: d.contentType,
      title: d.originalFileName ?? t("documents.categoryCompanyGeneral"),
      subtitle: t("documents.categoryCompanyGeneral"),
      detail: d.notes ?? t("documents.noDetail"),
      searchText: `${d.originalFileName ?? ""} ${d.kind} ${d.notes ?? ""} company general sirket genel belge`,
      previewUrl: apiUrl(`/company-documents/${d.id}/file`),
      previewMode:
        d.contentType === "application/pdf"
          ? "pdf"
          : d.contentType.startsWith("image/")
            ? "image"
            : "other",
      download: async () => {
        const { blob, contentType } = await fetchCompanyDocumentBlob(d.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext =
          contentType === "application/pdf"
            ? "pdf"
            : contentType.includes("png")
              ? "png"
              : contentType.includes("webp")
                ? "webp"
                : contentType.startsWith("image/")
                  ? "jpg"
                  : "bin";
        a.download = d.originalFileName ?? `company-doc-${d.id}.${ext}`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  for (const group of vehicleDocumentsByVehicle) {
    for (const d of group.docs) {
      const isInsurancePolicy = d.kind === "INSURANCE_POLICY";
      rows.push({
        id: `vehicle-${group.vehicle.id}-doc-${d.id}`,
        category: isInsurancePolicy ? "VEHICLE_INSURANCE_POLICY" : "VEHICLE_DOCUMENT",
        mimeType: d.contentType,
        title: group.vehicle.plateNumber,
        subtitle: d.originalFileName ?? (isInsurancePolicy ? t("documents.vehicleInsurancePolicy") : d.kind),
        detail: d.notes ?? `${group.vehicle.brand} ${group.vehicle.model}`.trim(),
        searchText: `${group.vehicle.plateNumber} ${group.vehicle.brand} ${group.vehicle.model} ${d.kind} ${isInsurancePolicy ? "insurance policy sigorta police" : ""} ${d.originalFileName ?? ""} ${d.notes ?? ""}`,
        previewUrl: apiUrl(`/vehicles/${group.vehicle.id}/documents/${d.id}/file`),
        previewMode:
          d.contentType === "application/pdf"
            ? "pdf"
            : d.contentType.startsWith("image/")
              ? "image"
              : "other",
        download: async () => {
          window.open(apiUrl(`/vehicles/${group.vehicle.id}/documents/${d.id}/file`), "_blank", "noopener,noreferrer");
        },
      });
    }
  }

  for (const group of warehouseInvoicesByWarehouse) {
    const items = group.items;
    for (const row of items) {
      const photoUrl = warehouseMovementInvoicePhotoUrl(row.id);
      if (row.type === "IN") {
        rows.push({
          id: `warehouse-inbound-invoice-${row.id}`,
          category: "WAREHOUSE_INBOUND_INVOICE",
          title: group.warehouse.name,
          subtitle: `${t("documents.warehouseInboundInvoiceLabel")} · ${row.productName}`,
          detail: row.movementDate,
          searchText: `${group.warehouse.name} ${row.productName} ${row.description ?? ""} invoice movement ${row.id} giris inbound depot warehouse`,
          previewUrl: photoUrl,
          previewMode: "image",
          download: async () => {
            window.open(photoUrl, "_blank", "noopener,noreferrer");
          },
        });
        continue;
      }
      rows.push({
        id: `warehouse-other-invoice-${row.id}`,
        category: "OTHER_INVOICE",
        title: group.warehouse.name,
        subtitle: `${t("documents.otherInvoiceLabel")} · ${row.productName}`,
        detail: row.movementDate,
        searchText: `${group.warehouse.name} ${row.productName} ${row.description ?? ""} invoice movement ${row.id} cikis outbound depot warehouse`,
        previewUrl: photoUrl,
        previewMode: "image",
        download: async () => {
          window.open(photoUrl, "_blank", "noopener,noreferrer");
        },
      });
    }
  }

  for (const inv of supplierInvoices) {
    const detail = inv.documentDate || inv.dueDate || `#${inv.id}`;
    const subtitle = inv.documentNumber?.trim()
      ? `${t(inv.formalSupplierInvoiceIssued ? "documents.warehouseOutboundInvoiceLabel" : "documents.supplierInvoicePhotoLabel")} · ${inv.documentNumber.trim()}`
      : `${t(inv.formalSupplierInvoiceIssued ? "documents.warehouseOutboundInvoiceLabel" : "documents.supplierInvoicePhotoLabel")} · #${inv.id}`;
    const routeUrl = `/suppliers/invoices?invoiceId=${inv.id}`;
    // Resmi (formal) faturalar: WAREHOUSE_OUTBOUND_INVOICE.
    // Resmi olmayanlar: yalnız invoicePhoto varsa SUPPLIER_INVOICE_PHOTO altında listelensin.
    if (inv.formalSupplierInvoiceIssued) {
      rows.push({
        id: `system-outbound-invoice-${inv.id}`,
        category: "WAREHOUSE_OUTBOUND_INVOICE",
        title: inv.supplierName,
        subtitle,
        detail,
        searchText: `${inv.supplierName} ${inv.documentNumber ?? ""} ${inv.description ?? ""} formal supplier invoice outbound ${inv.id}`,
        previewUrl: routeUrl,
        previewMode: "other",
        download: async () => {
          window.open(routeUrl, "_blank", "noopener,noreferrer");
        },
      });
    } else if (inv.hasInvoicePhoto) {
      rows.push({
        id: `supplier-invoice-photo-${inv.id}`,
        category: "SUPPLIER_INVOICE_PHOTO",
        title: inv.supplierName,
        subtitle,
        detail,
        searchText: `${inv.supplierName} ${inv.documentNumber ?? ""} ${inv.description ?? ""} informal supplier invoice photo ${inv.id} tedarikci foto`,
        previewUrl: routeUrl,
        previewMode: "other",
        download: async () => {
          window.open(routeUrl, "_blank", "noopener,noreferrer");
        },
      });
    }
  }

  for (const group of personnelYearClosures) {
    for (const c of group.closures) {
      if (c.hasClosurePdf) {
        const pdfUrl = personnelYearClosurePdfDownloadUrl(group.personnel.id, c.closureYear);
        rows.push({
          id: `personnel-closure-pdf-${group.personnel.id}-${c.closureYear}`,
          category: "PERSONNEL_YEAR_CLOSURE",
          title: group.personnel.fullName,
          subtitle: `${t("documents.personnelYearClosurePdf")} ${c.closureYear}`,
          detail: c.notes ?? t("documents.noDetail"),
          searchText: `${group.personnel.fullName} closure pdf ${c.closureYear} ${c.notes ?? ""}`,
          previewUrl: pdfUrl,
          previewMode: "pdf",
          download: async () => {
            window.open(pdfUrl, "_blank", "noopener,noreferrer");
          },
        });
      }
      if (c.hasClosureArchive) {
        const archiveUrl = personnelYearClosureArchiveUrl(group.personnel.id, c.closureYear);
        rows.push({
          id: `personnel-closure-archive-${group.personnel.id}-${c.closureYear}`,
          category: "PERSONNEL_YEAR_CLOSURE",
          title: group.personnel.fullName,
          subtitle: `${t("documents.personnelYearClosureArchive")} ${c.closureYear}`,
          detail: c.notes ?? t("documents.noDetail"),
          searchText: `${group.personnel.fullName} closure archive ${c.closureYear} ${c.notes ?? ""}`,
          previewUrl: archiveUrl,
          previewMode: "other",
          download: async () => {
            window.open(archiveUrl, "_blank", "noopener,noreferrer");
          },
        });
      }
    }
  }

  return rows;
}

