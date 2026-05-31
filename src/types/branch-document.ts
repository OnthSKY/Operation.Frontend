export type BranchDocumentKind =
  | "TAX_BASE"
  | "WORK_PERMIT"
  | "AGRICULTURE_CERT"
  | "OTHER"
  /** Sistem üretir: DELIVERED transition'ında oluşan sevkiyat teslim irsaliyesi. */
  | "SHIPMENT_DELIVERY_SLIP";

export type BranchDocument = {
  id: number;
  branchId: number;
  kind: BranchDocumentKind;
  originalFileName: string | null;
  contentType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** SHIPMENT_DELIVERY_SLIP belgelerinde dolu; ilgili sevkiyat talebine bağlar. */
  shipmentRequestId: number | null;
};

export type UploadBranchDocumentInput = {
  file: File;
  kind: BranchDocumentKind;
  notes?: string | null;
};
