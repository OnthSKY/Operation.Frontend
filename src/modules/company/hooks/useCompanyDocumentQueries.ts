"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCompanyDocument,
  fetchCompanyDocuments,
  uploadCompanyDocument,
} from "@/modules/company/api/company-documents-api";
import type { UploadCompanyDocumentInput } from "@/types/company-document";

export const companyDocumentKeys = {
  all: ["company-documents"] as const,
  list: () => [...companyDocumentKeys.all, "list"] as const,
};

export function useCompanyDocuments() {
  return useQuery({
    queryKey: companyDocumentKeys.list(),
    queryFn: fetchCompanyDocuments,
  });
}

export function useUploadCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadCompanyDocumentInput) => uploadCompanyDocument(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: companyDocumentKeys.list() });
    },
  });
}

export function useDeleteCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => deleteCompanyDocument(documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: companyDocumentKeys.list() });
    },
  });
}
