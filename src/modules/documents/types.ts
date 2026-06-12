export type DocumentsHubCategory =
  | "BRANCH_DOCUMENT"
  | "BRANCH_TAX_BASE"
  | "BRANCH_WORK_PERMIT"
  | "BRANCH_AGRICULTURE_CERT"
  | "BRANCH_SHIPMENT_SLIP"
  | "COMPANY_GENERAL_DOCUMENT"
  | "VEHICLE_DOCUMENT"
  | "VEHICLE_INSURANCE_POLICY"
  | "PERSONNEL_NATIONAL_ID"
  | "PERSONNEL_PROFILE"
  | "PERSONNEL_YEAR_CLOSURE"
  | "WAREHOUSE_INBOUND_INVOICE"
  | "WAREHOUSE_OUTBOUND_INVOICE"
  | "SUPPLIER_INVOICE_PHOTO"
  | "OTHER_INVOICE";

export type DocumentsHubRow = {
  id: string;
  category: DocumentsHubCategory;
  title: string;
  subtitle: string;
  detail: string;
  searchText: string;
  previewUrl: string;
  previewMode: "image" | "pdf" | "other";
  /** Sunucudan dönen Content-Type (varsa). HEIC/HEIF tespitinde kullanılır. */
  mimeType?: string;
  relatedLinks?: Array<{ href: string; label: string }>;
  download: () => Promise<void>;
};

