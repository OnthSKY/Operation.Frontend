"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdvance,
  deleteAdvance,
  fetchAdvancesByPersonnel,
  fetchAllAdvances,
  type FetchAllAdvancesParams,
} from "@/modules/personnel/api/advances-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import { reportsKeys } from "@/modules/reports/query-keys";
import {
  closePersonnelYearAccount,
  createPersonnelEmploymentTerm,
  deleteOpenPersonnelEmploymentTerm,
  fetchPersonnelAccountClosurePreview,
  fetchPersonnelEmploymentTerms,
  fetchPersonnelYearAccountClosures,
  fetchPersonnelYearAccountPreview,
  reopenPersonnelYearAccount,
  updatePersonnelEmploymentTerm,
  uploadPersonnelYearClosurePdf,
  type ClosePersonnelYearAccountBody,
} from "@/modules/personnel/api/personnel-account-closure-api";
import {
  createPersonnelNote,
  deletePersonnelNote,
  fetchPersonnelNotes,
  updatePersonnelNote,
} from "@/modules/personnel/api/personnel-notes-api";
import {
  addPersonnelInsurancePeriod,
  updatePersonnelInsurancePeriod,
  createPersonnel,
  fetchPersonnelInsurancePeriods,
  fetchPersonnelList,
  fetchPersonnelCashHandoverLinesPaged,
  fetchPersonnelCashHandoverOutflowsPaged,
  fetchPersonnelManagementSnapshot,
  fetchPersonnel,
  softDeletePersonnel,
  updatePersonnel,
  uploadNationalIdPhotos,
  uploadProfilePhotos,
  type UploadNationalIdPhotosInput,
  type UploadProfilePhotosInput,
} from "@/modules/personnel/api/personnel-api";
import { usersKeys } from "@/modules/personnel/hooks/useUsersQueries";
import type { CreateAdvanceInput } from "@/types/advance";
import type { SavePersonnelNoteInput } from "@/types/personnel-note";
import type {
  AddPersonnelInsurancePeriodInput,
  UpdatePersonnelInsurancePeriodInput,
  CreatePersonnelInput,
  UpdatePersonnelInput,
} from "@/types/personnel";
import type {
  CreatePersonnelEmploymentTermBody,
  UpdatePersonnelEmploymentTermBody,
} from "@/types/personnel-account-closure";

export type PersonnelListFilters = {
  status: "all" | "active" | "passive";
  branchId: number;
  jobTitle: string;
  name: string;
  seasonArrivalFrom: string;
  seasonArrivalTo: string;
  hireDateFrom: string;
  hireDateTo: string;
  /** "all" | "started" | "not_started" — API'ye yalnız started/not_started gider. */
  insuranceStatus: "all" | "started" | "not_started";
  /**
   * İkisi de verilirse API sayfalı döner; verilmezse tüm eşleşen kayıtlar (seçiciler / geriye dönük).
   */
  page?: number;
  pageSize?: number;
};

export const defaultPersonnelListFilters: PersonnelListFilters = {
  status: "all",
  branchId: 0,
  jobTitle: "",
  name: "",
  seasonArrivalFrom: "",
  seasonArrivalTo: "",
  hireDateFrom: "",
  hireDateTo: "",
  insuranceStatus: "all",
};

export const personnelKeys = {
  all: ["personnel"] as const,
  list: (f: PersonnelListFilters) =>
    [
      ...personnelKeys.all,
      "list",
      f.status,
      f.branchId,
      f.jobTitle,
      f.name,
      f.seasonArrivalFrom,
      f.seasonArrivalTo,
      f.hireDateFrom,
      f.hireDateTo,
      f.insuranceStatus,
      f.page ?? "all",
      f.pageSize ?? "all",
    ] as const,
  /** Tüm filtre kombinasyonlarındaki liste sorgularını geçersiz kılar. */
  listRoot: () => [...personnelKeys.all, "list"] as const,
  detail: (id: number) => [...personnelKeys.all, "detail", id] as const,
  nonAdvanceAttributedExpenses: (sort: string = "dateDesc") =>
    [...personnelKeys.all, "non-advance-attributed-expenses", sort] as const,
  managementSnapshot: (personnelId: number) =>
    [...personnelKeys.all, "management-snapshot", personnelId] as const,
  cashHandoverLines: (
    personnelId: number,
    page: number,
    pageSize: number,
    branchId: string,
    currency: string,
    dateFrom: string,
    dateTo: string,
    search: string
  ) =>
    [
      ...personnelKeys.all,
      "cash-handover-lines",
      personnelId,
      page,
      pageSize,
      branchId,
      currency,
      dateFrom,
      dateTo,
      search,
    ] as const,
  cashHandoverOutflows: (
    personnelId: number,
    page: number,
    pageSize: number,
    branchId: string,
    currency: string,
    dateFrom: string,
    dateTo: string,
    search: string
  ) =>
    [
      ...personnelKeys.all,
      "cash-handover-outflows",
      personnelId,
      page,
      pageSize,
      branchId,
      currency,
      dateFrom,
      dateTo,
      search,
    ] as const,
  /** @param effectiveYear calendar year — filters API by effectiveYear; omit for all years */
  advances: (personnelId: number, effectiveYear?: number) =>
    [...personnelKeys.all, "advances", personnelId, effectiveYear ?? "all"] as const,
  advancesAll: (
    effectiveYear: number,
    personnelId: number,
    branchId: number,
    limit: number
  ) =>
    [
      ...personnelKeys.all,
      "advances-all",
      effectiveYear,
      personnelId,
      branchId,
      limit,
    ] as const,
  insurancePeriods: (personnelId: number) =>
    [...personnelKeys.all, "insurance-periods", personnelId] as const,
  notes: (personnelId: number) => [...personnelKeys.all, "notes", personnelId] as const,
  employmentTerms: (personnelId: number) =>
    [...personnelKeys.all, "employment-terms", personnelId] as const,
  accountClosurePreview: (personnelId: number, employmentTermId: number) =>
    [
      ...personnelKeys.all,
      "account-closure-preview",
      personnelId,
      employmentTermId,
    ] as const,
  yearAccountPreview: (personnelId: number, year: number) =>
    [...personnelKeys.all, "year-account-preview", personnelId, year] as const,
  yearAccountClosures: (personnelId: number) =>
    [...personnelKeys.all, "year-account-closures", personnelId] as const,
};

/**
 * @param queryKeySuffix İsteğe bağlı; şube kasa modalı gibi yerlerde aynı filtreyle başka ekranın
 * React Query önbelleğiyle çakışmayı önlemek için kullanılır (örn. `"branch-tx-modal"`).
 */
export function usePersonnelList(
  filters: PersonnelListFilters,
  enabled: boolean = true,
  queryKeySuffix?: string
) {
  const baseKey = personnelKeys.list(filters);
  const queryKey =
    queryKeySuffix != null && queryKeySuffix.length > 0
      ? ([...baseKey, queryKeySuffix] as const)
      : baseKey;

  return useQuery({
    queryKey,
    queryFn: () =>
      fetchPersonnelList({
        status: filters.status,
        branchId: filters.branchId > 0 ? filters.branchId : undefined,
        jobTitle: filters.jobTitle.trim() || undefined,
        name: filters.name.trim() || undefined,
        seasonArrivalFrom: filters.seasonArrivalFrom.trim() || undefined,
        seasonArrivalTo: filters.seasonArrivalTo.trim() || undefined,
        hireDateFrom: filters.hireDateFrom.trim() || undefined,
        hireDateTo: filters.hireDateTo.trim() || undefined,
        insuranceStarted:
          filters.insuranceStatus === "started"
            ? true
            : filters.insuranceStatus === "not_started"
              ? false
              : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    enabled,
  });
}

export function usePersonnelDetail(
  personnelId: number | null | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: personnelKeys.detail(personnelId ?? 0),
    queryFn: () => fetchPersonnel(personnelId!),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

export function usePersonnelInsurancePeriods(
  personnelId: number | null | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.insurancePeriods(personnelId ?? 0),
    queryFn: () => fetchPersonnelInsurancePeriods(personnelId!),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

export function useAddPersonnelInsurancePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      personnelId: number;
      input: AddPersonnelInsurancePeriodInput;
    }) => addPersonnelInsurancePeriod(vars.personnelId, vars.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: personnelKeys.insurancePeriods(vars.personnelId),
      });
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({
        queryKey: personnelKeys.detail(vars.personnelId),
      });
    },
  });
}

export function useUpdatePersonnelInsurancePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      personnelId: number;
      periodId: number;
      input: UpdatePersonnelInsurancePeriodInput;
    }) =>
      updatePersonnelInsurancePeriod(
        vars.personnelId,
        vars.periodId,
        vars.input
      ),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: personnelKeys.insurancePeriods(vars.personnelId),
      });
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({
        queryKey: personnelKeys.detail(vars.personnelId),
      });
    },
  });
}

export function usePersonnelManagementSnapshot(
  personnelId: number | null | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.managementSnapshot(personnelId ?? 0),
    queryFn: () => fetchPersonnelManagementSnapshot(personnelId!),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

export type PersonnelCashHandoverLinesFilterState = {
  branchId: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

export function usePersonnelCashHandoverLinesPaged(
  personnelId: number | null | undefined,
  page: number,
  pageSize: number,
  filters: PersonnelCashHandoverLinesFilterState,
  enabled: boolean
) {
  const branchIdKey = filters.branchId.trim();
  const currencyKey = filters.currency.trim();
  const dateFromKey = filters.dateFrom.trim();
  const dateToKey = filters.dateTo.trim();
  const searchKey = filters.search.trim();
  const bid = branchIdKey ? parseInt(branchIdKey, 10) : NaN;

  return useQuery({
    queryKey: personnelKeys.cashHandoverLines(
      personnelId ?? 0,
      page,
      pageSize,
      branchIdKey,
      currencyKey,
      dateFromKey,
      dateToKey,
      searchKey
    ),
    queryFn: () =>
      fetchPersonnelCashHandoverLinesPaged(personnelId!, {
        page,
        pageSize,
        branchId: Number.isFinite(bid) && bid > 0 ? bid : undefined,
        currencyCode: currencyKey || undefined,
        dateFrom: dateFromKey || undefined,
        dateTo: dateToKey || undefined,
        search: searchKey || undefined,
      }),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

export function usePersonnelCashHandoverOutflowsPaged(
  personnelId: number | null | undefined,
  page: number,
  pageSize: number,
  filters: PersonnelCashHandoverLinesFilterState,
  enabled: boolean
) {
  const branchIdKey = filters.branchId.trim();
  const currencyKey = filters.currency.trim();
  const dateFromKey = filters.dateFrom.trim();
  const dateToKey = filters.dateTo.trim();
  const searchKey = filters.search.trim();
  const bid = branchIdKey ? parseInt(branchIdKey, 10) : NaN;

  return useQuery({
    queryKey: personnelKeys.cashHandoverOutflows(
      personnelId ?? 0,
      page,
      pageSize,
      branchIdKey,
      currencyKey,
      dateFromKey,
      dateToKey,
      searchKey
    ),
    queryFn: () =>
      fetchPersonnelCashHandoverOutflowsPaged(personnelId!, {
        page,
        pageSize,
        branchId: Number.isFinite(bid) && bid > 0 ? bid : undefined,
        currencyCode: currencyKey || undefined,
        dateFrom: dateFromKey || undefined,
        dateTo: dateToKey || undefined,
        search: searchKey || undefined,
      }),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

/** Tüm yıllar — geçmiş listesi (effectiveYear filtresi yok). */
export function usePersonnelAdvancesAll(personnelId: number | null | undefined) {
  return useQuery({
    queryKey: personnelKeys.advances(personnelId ?? 0, undefined),
    queryFn: () => fetchAdvancesByPersonnel(personnelId!),
    enabled: personnelId != null && personnelId > 0,
  });
}

export function useAllAdvancesList(
  params: FetchAllAdvancesParams,
  enabled: boolean = true
) {
  const effectiveYear = params.effectiveYear;
  const personnelId = params.personnelId ?? 0;
  const branchId = params.branchId ?? 0;
  const limit =
    params.limit != null &&
    Number.isFinite(params.limit) &&
    params.limit >= 1 &&
    params.limit <= 1000
      ? Math.trunc(params.limit)
      : 500;
  const yearKey = effectiveYear ?? 0;
  return useQuery({
    queryKey: personnelKeys.advancesAll(
      yearKey,
      personnelId,
      branchId,
      limit
    ),
    queryFn: () =>
      fetchAllAdvances({
        effectiveYear:
          effectiveYear != null &&
          Number.isFinite(effectiveYear) &&
          effectiveYear >= 1900 &&
          effectiveYear <= 9999
            ? Math.trunc(effectiveYear)
            : undefined,
        personnelId: personnelId > 0 ? personnelId : undefined,
        branchId: branchId > 0 ? branchId : undefined,
        limit,
      }),
    enabled,
  });
}

export function useCreatePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonnelInput) => createPersonnel(input),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(created.id) });
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdatePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePersonnelInput) => updatePersonnel(input),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(input.id) });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}

export function useUploadNationalIdPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      personnelId: number;
      input: UploadNationalIdPhotosInput;
    }) => uploadNationalIdPhotos(vars.personnelId, vars.input),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(vars.personnelId) });
    },
  });
}

export function useUploadProfilePhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      personnelId: number;
      input: UploadProfilePhotosInput;
    }) => uploadProfilePhotos(vars.personnelId, vars.input),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(vars.personnelId) });
    },
  });
}

export function useSoftDeletePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeletePersonnel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
    },
  });
}

export function usePersonnelNotes(personnelId: number | null, enabled: boolean) {
  return useQuery({
    queryKey:
      personnelId != null && personnelId > 0
        ? personnelKeys.notes(personnelId)
        : ([...personnelKeys.all, "notes", 0] as const),
    queryFn: () => fetchPersonnelNotes(personnelId!),
    enabled: Boolean(enabled && personnelId != null && personnelId > 0),
  });
}

export function useCreatePersonnelNote(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavePersonnelNoteInput) => createPersonnelNote(personnelId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.notes(personnelId) });
    },
  });
}

export function useUpdatePersonnelNote(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: number; body: SavePersonnelNoteInput }) =>
      updatePersonnelNote(personnelId, noteId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.notes(personnelId) });
    },
  });
}

export function useDeletePersonnelNote(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) => deletePersonnelNote(personnelId, noteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.notes(personnelId) });
    },
  });
}

export function usePersonnelEmploymentTerms(
  personnelId: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.employmentTerms(personnelId),
    queryFn: () => fetchPersonnelEmploymentTerms(personnelId),
    enabled: enabled && personnelId > 0,
  });
}

function invalidatePersonnelAfterEmploymentTermChange(
  qc: ReturnType<typeof useQueryClient>,
  personnelId: number
) {
  void qc.invalidateQueries({ queryKey: personnelKeys.employmentTerms(personnelId) });
  void qc.invalidateQueries({ queryKey: personnelKeys.detail(personnelId) });
  void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
}

export function useCreatePersonnelEmploymentTerm(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonnelEmploymentTermBody) =>
      createPersonnelEmploymentTerm(personnelId, body),
    onSuccess: () => {
      invalidatePersonnelAfterEmploymentTermChange(qc, personnelId);
    },
  });
}

export function useUpdatePersonnelEmploymentTerm(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      termId,
      body,
    }: {
      termId: number;
      body: UpdatePersonnelEmploymentTermBody;
    }) => updatePersonnelEmploymentTerm(personnelId, termId, body),
    onSuccess: () => {
      invalidatePersonnelAfterEmploymentTermChange(qc, personnelId);
    },
  });
}

export function useDeleteOpenPersonnelEmploymentTerm(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteOpenPersonnelEmploymentTerm(personnelId),
    onSuccess: () => {
      invalidatePersonnelAfterEmploymentTermChange(qc, personnelId);
    },
  });
}

export function usePersonnelAccountClosurePreview(
  personnelId: number,
  employmentTermId: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.accountClosurePreview(
      personnelId,
      employmentTermId ?? 0
    ),
    queryFn: () =>
      fetchPersonnelAccountClosurePreview(personnelId, employmentTermId!),
    enabled:
      enabled && personnelId > 0 && employmentTermId != null && employmentTermId > 0,
  });
}

export function usePersonnelYearAccountPreview(
  personnelId: number,
  year: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.yearAccountPreview(personnelId, year),
    queryFn: () => fetchPersonnelYearAccountPreview(personnelId, year),
    enabled: enabled && personnelId > 0 && year >= 1990 && year <= 2100,
  });
}

export function usePersonnelYearAccountClosures(
  personnelId: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.yearAccountClosures(personnelId),
    queryFn: () => fetchPersonnelYearAccountClosures(personnelId),
    enabled: enabled && personnelId > 0,
  });
}

export function useClosePersonnelYearAccount(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClosePersonnelYearAccountBody) =>
      closePersonnelYearAccount(personnelId, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: personnelKeys.yearAccountPreview(personnelId, vars.closureYear),
      });
      void qc.invalidateQueries({
        queryKey: personnelKeys.yearAccountClosures(personnelId),
      });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(personnelId) });
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
    },
  });
}

export function useReopenPersonnelYearAccount(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (year: number) => reopenPersonnelYearAccount(personnelId, year),
    onSuccess: (_ok, year) => {
      void qc.invalidateQueries({
        queryKey: personnelKeys.yearAccountClosures(personnelId),
      });
      void qc.invalidateQueries({
        queryKey: personnelKeys.yearAccountPreview(personnelId, year),
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "year-account-preview", personnelId],
      });
      void qc.invalidateQueries({ queryKey: personnelKeys.detail(personnelId) });
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
    },
  });
}

export function useUploadPersonnelYearClosurePdf(personnelId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, file }: { year: number; file: File }) =>
      uploadPersonnelYearClosurePdf(personnelId, year, file),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: personnelKeys.yearAccountClosures(personnelId),
      });
    },
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdvanceInput) => createAdvance(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "management-snapshot"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances-all"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "register-summary"],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}

export function useDeleteAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (advanceId: number) => deleteAdvance(advanceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.listRoot() });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "management-snapshot"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances-all"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: ["personnel", "attributed-expenses"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "register-summary"],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
}
