import { apiFetch, apiRequest } from "@/shared/api/client";
import type {
  UploadVehicleDocumentInput,
  VehicleDocument,
  VehicleDocumentKind,
} from "@/types/vehicle-document";

type ApiRow = {
  id: number;
  vehicleId: number;
  kind: string;
  originalFileName?: string | null;
  contentType?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const KINDS: ReadonlySet<string> = new Set(["REGISTRATION", "INSPECTION", "INSURANCE_POLICY", "OTHER"]);

function normalizeKind(raw: string): VehicleDocumentKind {
  const k = String(raw ?? "").trim().toUpperCase();
  return (KINDS.has(k) ? k : "OTHER") as VehicleDocumentKind;
}

function mapRow(r: ApiRow): VehicleDocument {
  return {
    id: Number(r.id) || 0,
    vehicleId: Number(r.vehicleId) || 0,
    kind: normalizeKind(r.kind),
    originalFileName:
      r.originalFileName != null && String(r.originalFileName).trim() !== ""
        ? String(r.originalFileName).trim()
        : null,
    contentType: String(r.contentType ?? "application/octet-stream").trim() || "application/octet-stream",
    notes: r.notes != null && String(r.notes).trim() !== "" ? String(r.notes).trim() : null,
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

export async function fetchVehicleDocuments(vehicleId: number): Promise<VehicleDocument[]> {
  const rows = await apiRequest<ApiRow[]>(`/vehicles/${vehicleId}/documents`);
  return rows.map(mapRow);
}

export async function uploadVehicleDocument(
  vehicleId: number,
  input: UploadVehicleDocumentInput
): Promise<VehicleDocument> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("kind", input.kind);
  if (input.notes != null && String(input.notes).trim() !== "") {
    fd.append("notes", String(input.notes).trim());
  }
  const r = await apiRequest<ApiRow>(`/vehicles/${vehicleId}/documents`, {
    method: "POST",
    body: fd,
  });
  return mapRow(r);
}

export async function deleteVehicleDocument(vehicleId: number, documentId: number): Promise<void> {
  await apiRequest<null>(`/vehicles/${vehicleId}/documents/${documentId}`, { method: "DELETE" });
}

export async function fetchVehicleDocumentBlob(
  vehicleId: number,
  documentId: number
): Promise<{ blob: Blob; contentType: string }> {
  const res = await apiFetch(`/vehicles/${vehicleId}/documents/${documentId}/file`);
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const contentType = res.headers.get("Content-Type")?.split(";")[0]?.trim() || blob.type;
  return { blob, contentType };
}
