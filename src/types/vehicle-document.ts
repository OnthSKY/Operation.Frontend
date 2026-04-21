export type VehicleDocumentKind = "REGISTRATION" | "INSPECTION" | "INSURANCE_POLICY" | "OTHER";

export type VehicleDocument = {
  id: number;
  vehicleId: number;
  kind: VehicleDocumentKind;
  originalFileName: string | null;
  contentType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadVehicleDocumentInput = {
  file: File;
  kind: VehicleDocumentKind;
  notes?: string | null;
};
