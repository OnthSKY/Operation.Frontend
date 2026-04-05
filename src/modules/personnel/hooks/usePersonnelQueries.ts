"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdvance,
  fetchAdvancesByPersonnel,
} from "@/modules/personnel/api/advances-api";
import {
  createPersonnel,
  fetchPersonnelList,
} from "@/modules/personnel/api/personnel-api";
import type { CreateAdvanceInput } from "@/types/advance";
import type { CreatePersonnelInput } from "@/types/personnel";

export const personnelKeys = {
  all: ["personnel"] as const,
  list: () => [...personnelKeys.all, "list"] as const,
  /** @param effectivePeriod ISO date (any day in month) — filters API by effective_date month; omit for all periods */
  advances: (personnelId: number, effectivePeriod?: string) =>
    [...personnelKeys.all, "advances", personnelId, effectivePeriod ?? "all"] as const,
};

export function usePersonnelList() {
  return useQuery({
    queryKey: personnelKeys.list(),
    queryFn: fetchPersonnelList,
  });
}

export function useCreatePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonnelInput) => createPersonnel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
    },
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdvanceInput) => createAdvance(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances"],
        exact: false,
      });
    },
  });
}
