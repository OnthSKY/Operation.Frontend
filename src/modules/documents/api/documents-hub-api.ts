import { fetchBranchDocumentBlob, fetchBranchDocuments } from "@/modules/branch/api/branch-documents-api";
import { fetchBranches } from "@/modules/branch/api/branches-api";
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
import { apiUrl } from "@/shared/api/client";
import type { DocumentsHubRow } from "@/modules/documents/types";

type TranslateFn = (key: string) => string;

export async function fetchDocumentsHubRows(t: TranslateFn): Promise<DocumentsHubRow[]> {
  const [branches, personnelList] = await Promise.all([
    fetchBranches(),
    fetchPersonnelList({ status: "all" }),
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
      page: await fetchWarehouseMovementsPage(w.id, {
        page: 1,
        pageSize: 500,
        type: "IN",
      }),
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
      rows.push({
        id: `branch-${group.branch.id}-doc-${d.id}`,
        category: "BRANCH_DOCUMENT",
        title: group.branch.name,
        subtitle: d.originalFileName ?? d.kind,
        detail: d.notes ?? d.kind,
        searchText: `${group.branch.name} ${d.kind} ${d.originalFileName ?? ""} ${d.notes ?? ""}`,
        previewUrl: apiUrl(`/branches/${group.branch.id}/documents/${d.id}/file`),
        previewMode: d.contentType === "application/pdf" ? "pdf" : d.contentType.startsWith("image/") ? "image" : "other",
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

  for (const group of vehicleDocumentsByVehicle) {
    for (const d of group.docs) {
      const isInsurancePolicy = d.kind === "INSURANCE_POLICY";
      rows.push({
        id: `vehicle-${group.vehicle.id}-doc-${d.id}`,
        category: isInsurancePolicy ? "VEHICLE_INSURANCE_POLICY" : "VEHICLE_DOCUMENT",
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
    const items = group.page.items.filter((x) => x.type === "IN" && x.hasInvoicePhoto === true);
    for (const row of items) {
      const photoUrl = warehouseMovementInvoicePhotoUrl(row.id);
      rows.push({
        id: `warehouse-invoice-${row.id}`,
        category: "WAREHOUSE_INVOICE",
        title: group.warehouse.name,
        subtitle: row.productName,
        detail: row.movementDate,
        searchText: `${group.warehouse.name} ${row.productName} ${row.description ?? ""} invoice movement ${row.id}`,
        previewUrl: photoUrl,
        previewMode: "image",
        download: async () => {
          window.open(photoUrl, "_blank", "noopener,noreferrer");
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

