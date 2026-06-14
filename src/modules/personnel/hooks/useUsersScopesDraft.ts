"use client";

import { useEffect, useState } from "react";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  UserListItem,
  WarehouseScopeAssignment,
} from "@/types/user";

type Params = {
  scopesModalUser: UserListItem | null;
  userScopesData:
    | {
        branchScopes?: BranchScopeAssignment[];
        warehouseScopes?: WarehouseScopeAssignment[];
        personnelScopes?: PersonnelScopeAssignment[];
      }
    | null
    | undefined;
  /** "BRANCH_RESPONSIBLE" gibi otomatik kaynak'ları dışla — yalnızca açıkça atanmış olanlar. */
  isExplicitPersonnelScope: (row: PersonnelScopeAssignment) => boolean;
};

/**
 * Veri-scope modal'ı için 3 ayrı draft (branch/warehouse/personnel) + seeding effect'i.
 *
 * SRP: yalnızca scope draft state'i. Modal açılınca backend'den gelen veriden seed eder,
 * kapanınca temizler.
 */
export function useUsersScopesDraft({
  scopesModalUser,
  userScopesData,
  isExplicitPersonnelScope,
}: Params) {
  const [branchScopeDraft, setBranchScopeDraft] = useState<BranchScopeAssignment[]>([]);
  const [warehouseScopeDraft, setWarehouseScopeDraft] = useState<WarehouseScopeAssignment[]>([]);
  const [personnelScopeDraft, setPersonnelScopeDraft] = useState<PersonnelScopeAssignment[]>([]);

  useEffect(() => {
    if (!scopesModalUser) {
      setBranchScopeDraft([]);
      setWarehouseScopeDraft([]);
      setPersonnelScopeDraft([]);
      return;
    }
    if (!userScopesData) return;
    setBranchScopeDraft(userScopesData.branchScopes ?? []);
    setWarehouseScopeDraft(userScopesData.warehouseScopes ?? []);
    setPersonnelScopeDraft(
      (userScopesData.personnelScopes ?? []).filter(isExplicitPersonnelScope)
    );
  }, [scopesModalUser, userScopesData, isExplicitPersonnelScope]);

  return {
    branchScopeDraft,
    setBranchScopeDraft,
    warehouseScopeDraft,
    setWarehouseScopeDraft,
    personnelScopeDraft,
    setPersonnelScopeDraft,
  };
}
