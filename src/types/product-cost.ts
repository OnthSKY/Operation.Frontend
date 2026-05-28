export type ProductCostSource = "INVOICE" | "MANUAL";

export type ProductCostHistoryRow = {
  id: number;
  productId: number;
  productName: string;
  effectiveDate: string;
  unit: string;
  currencyCode: string;
  vatRate: number;
  unitCostExcludingVat: number;
  unitCostIncludingVat: number;
  note?: string | null;
  createdAt?: string | null;
  source: ProductCostSource;
  isInformational: boolean;
  sourceSupplierInvoiceId?: number | null;
  sourceSupplierInvoiceLineId?: number | null;
  /** ISO timestamp. null = satır halen geçerli. */
  validTo?: string | null;
};

export type ProductCostHistoryQueryParams = {
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
  /** "" = hepsi; "INVOICE" sadece faturalı; "MANUAL" sadece elle. */
  source?: ProductCostSource | "";
  /** true = sadece not satırları; false = sadece resmi maliyet; undefined = hepsi. */
  isInformational?: boolean;
  /** true = yalnızca aktif (valid_to=null) satırlar. */
  activeOnly?: boolean;
};

export type CreateProductCostInput = {
  productId: number;
  effectiveDate: string;
  unit: string;
  currencyCode: string;
  vatRate: number;
  unitCostExcludingVat: number;
  unitCostIncludingVat: number;
  note?: string | null;
  isInformational?: boolean;
};

export type UpdateProductCostInput = {
  id: number;
  effectiveDate: string;
  unit: string;
  currencyCode: string;
  vatRate: number;
  unitCostExcludingVat: number;
  unitCostIncludingVat: number;
  note?: string | null;
  isInformational?: boolean;
};
