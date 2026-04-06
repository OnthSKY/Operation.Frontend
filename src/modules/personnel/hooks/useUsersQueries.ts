"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  fetchUsersList,
} from "@/modules/personnel/api/users-api";
import type { CreateUserInput } from "@/types/user";

export const usersKeys = {
  all: ["users"] as const,
  list: () => [...usersKeys.all, "list"] as const,
};

export function useUsersList(enabled = true) {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: fetchUsersList,
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      void qc.invalidateQueries({ queryKey: ["personnel", "list"] });
    },
  });
}
