"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContractor,
  createContractorPayment,
  createContractorWorkEntry,
  deleteContractor,
  deleteContractorPayment,
  deleteContractorWorkEntry,
  fetchAllContractorPayments,
  fetchContractor,
  fetchContractors,
  updateContractor,
  updateContractorWorkEntry,
} from "@/modules/contractors/api/contractors-api";
import { createOptimisticListDelete } from "@/shared/lib/optimistic-list-delete";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { personnelKeys } from "@/modules/personnel/hooks/usePersonnelQueries";
import { reportsKeys } from "@/modules/reports/query-keys";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";

/**
 * Taşeron ödemesi kasa/zimmet/rapor'u etkiler (BRANCH_REGISTER → şube kasası,
 * PERSONNEL_POCKET → personel zimmet ledger). İlgili tüm modülleri tazele.
 */
function invalidateContractorPaymentSideEffects(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: contractorKeys.all });
  void qc.invalidateQueries({ queryKey: branchKeys.all });
  void qc.invalidateQueries({ queryKey: personnelKeys.all });
  void qc.invalidateQueries({ queryKey: reportsKeys.all });
  void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
}

export const contractorKeys = {
  all: ["contractors"] as const,
  list: (includeDeleted: boolean) => [...contractorKeys.all, "list", includeDeleted] as const,
  detail: (id: number) => [...contractorKeys.all, "detail", id] as const,
  allPayments: () => [...contractorKeys.all, "payments-all"] as const,
};

export function useAllContractorPayments(enabled = true) {
  return useQuery({
    queryKey: contractorKeys.allPayments(),
    queryFn: fetchAllContractorPayments,
    enabled,
  });
}

export function useContractors(includeDeleted = false) {
  return useQuery({
    queryKey: contractorKeys.list(includeDeleted),
    queryFn: () => fetchContractors(includeDeleted),
  });
}

export function useContractor(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: contractorKeys.detail(id ?? 0),
    queryFn: () => fetchContractor(id!),
    enabled: enabled && id != null && id > 0,
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContractor,
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useUpdateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: number;
      displayName: string;
      phone?: string | null;
      nationalId?: string | null;
      notes?: string | null;
    }) => {
      const { id, ...body } = input;
      return updateContractor(id, body);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useDeleteContractor() {
  const qc = useQueryClient();
  const optimistic = createOptimisticListDelete<{ id: number }>({
    qc,
    queryKeyPrefix: contractorKeys.all,
    extractId: (c) => c.id,
  });
  return useMutation({
    mutationFn: deleteContractor,
    ...optimistic((id) => id as number),
    onSettled: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useCreateContractorWorkEntry(contractorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createContractorWorkEntry>[1]) =>
      createContractorWorkEntry(contractorId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useUpdateContractorWorkEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { entryId: number } & Parameters<typeof updateContractorWorkEntry>[1]) => {
      const { entryId, ...body } = input;
      return updateContractorWorkEntry(entryId, body);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useDeleteContractorWorkEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContractorWorkEntry,
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractorKeys.all }),
  });
}

export function useCreateContractorPayment(contractorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createContractorPayment>[1]) =>
      createContractorPayment(contractorId, body),
    onSuccess: () => invalidateContractorPaymentSideEffects(qc),
  });
}

export function useDeleteContractorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContractorPayment,
    onSuccess: () => invalidateContractorPaymentSideEffects(qc),
  });
}
