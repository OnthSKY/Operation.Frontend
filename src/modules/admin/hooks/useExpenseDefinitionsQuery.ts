"use client";

import { fetchExpenseDefinitions } from "@/modules/admin/api/expense-definitions-api";
import type { ExpenseDefinitionGroup } from "@/types/expense-definition";
import { useQuery } from "@tanstack/react-query";

export const expenseDefinitionsKeys = {
  all: ["expense-definitions"] as const,
  list: (group: ExpenseDefinitionGroup, includeArchived: boolean) =>
    ["expense-definitions", { group, includeArchived }] as const,
};

export function useExpenseDefinitionsQuery(
  group: ExpenseDefinitionGroup,
  enabled: boolean,
  includeArchived = false
) {
  return useQuery({
    queryKey: expenseDefinitionsKeys.list(group, includeArchived),
    queryFn: () => fetchExpenseDefinitions(group, includeArchived),
    staleTime: 60_000,
    enabled,
  });
}
