export type DocumentsHubCategory =
  | "BRANCH_DOCUMENT"
  | "VEHICLE_DOCUMENT"
  | "VEHICLE_INSURANCE_POLICY"
  | "PERSONNEL_NATIONAL_ID"
  | "PERSONNEL_PROFILE"
  | "PERSONNEL_YEAR_CLOSURE"
  | "WAREHOUSE_INBOUND_INVOICE"
  | "WAREHOUSE_OUTBOUND_INVOICE"
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
  relatedLinks?: Array<{ href: string; label: string }>;
  download: () => Promise<void>;
};

