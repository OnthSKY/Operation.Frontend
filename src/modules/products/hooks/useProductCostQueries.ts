"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey } from "@/modules/stock/query-keys";
import {
  createProductCostEntry,
  fetchProductCostHistory,
} from "@/modules/products/api/product-costs-api";
import type {
  CreateProductCostInput,
  ProductCostHistoryQueryParams,
} from "@/types/product-cost";

export const productCostKeys = {
  all: [...productsRootKey, "cost-history"] as const,
  list: (params: ProductCostHistoryQueryParams) =>
    [
      ...productCostKeys.all,
      params.productId ?? 0,
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ] as const,
};

export function useProductCostHistory(params: ProductCostHistoryQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: productCostKeys.list(params),
    queryFn: () => fetchProductCostHistory(params),
    enabled,
  });
}

export function useCreateProductCostEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductCostInput) => createProductCostEntry(input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: productCostKeys.all });
      void qc.invalidateQueries({ queryKey: [...productsRootKey, "catalog"] });
      void qc.invalidateQueries({
        queryKey: productCostKeys.list({
          productId: vars.productId,
          dateFrom: "",
          dateTo: "",
        }),
      });
    },
  });
}
