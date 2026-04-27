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
};

export type ProductCostHistoryQueryParams = {
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
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
};
