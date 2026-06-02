import { apiRequest } from "@/shared/api/client";

export type ContractorPaymentSourceCode = "PATRON" | "BRANCH_REGISTER" | "PERSONNEL_POCKET";

export type Contractor = {
  id: number;
  displayName: string;
  phone: string | null;
  nationalId: string | null;
  notes: string | null;
  isDeleted: boolean;
  /** Σ yapılan iş bedeli. */
  totalWork: number;
  /** Σ ödenen. */
  totalPaid: number;
  /** totalWork − totalPaid; pozitif = ona hâlâ borçluyuz. */
  balance: number;
  workCount: number;
  paymentCount: number;
};

export type ContractorWorkEntry = {
  id: number;
  contractorId: number;
  workDate: string;
  description: string;
  /** null = tutar henüz belirlenmedi (sonradan girilecek). */
  amount: number | null;
  currencyCode: string;
  branchId: number | null;
  branchName: string | null;
  reference: string | null;
  notes: string | null;
};

export type ContractorPayment = {
  id: number;
  contractorId: number;
  paymentDate: string;
  amount: number;
  currencyCode: string;
  paymentSource: ContractorPaymentSourceCode;
  branchId: number | null;
  branchName: string | null;
  paidByPersonnelId: number | null;
  paidByPersonnelName: string | null;
  description: string | null;
  reference: string | null;
};

/** Tüm kişilerin ödemeleri (kişi adı dahil) — birleşik listeler için. */
export type ContractorPaymentListItem = ContractorPayment & {
  contractorDisplayName: string;
};

export type ContractorDetail = {
  contractor: Contractor;
  workEntries: ContractorWorkEntry[];
  payments: ContractorPayment[];
};

// ---------------- Kişi ----------------

export async function fetchContractors(includeDeleted = false): Promise<Contractor[]> {
  const q = includeDeleted ? "?includeDeleted=true" : "";
  return apiRequest<Contractor[]>(`/contractors${q}`);
}

export async function fetchContractor(id: number): Promise<ContractorDetail> {
  return apiRequest<ContractorDetail>(`/contractors/${id}`);
}

export async function createContractor(body: {
  displayName: string;
  phone?: string | null;
  nationalId?: string | null;
  notes?: string | null;
}): Promise<Contractor> {
  return apiRequest<Contractor>("/contractors", {
    method: "POST",
    body: JSON.stringify({
      displayName: body.displayName.trim(),
      phone: body.phone ?? null,
      nationalId: body.nationalId ?? null,
      notes: body.notes ?? null,
    }),
  });
}

export async function updateContractor(
  id: number,
  body: { displayName: string; phone?: string | null; nationalId?: string | null; notes?: string | null }
): Promise<Contractor> {
  return apiRequest<Contractor>(`/contractors/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      displayName: body.displayName.trim(),
      phone: body.phone ?? null,
      nationalId: body.nationalId ?? null,
      notes: body.notes ?? null,
    }),
  });
}

export async function deleteContractor(id: number): Promise<void> {
  await apiRequest<null>(`/contractors/${id}`, { method: "DELETE" });
}

// ---------------- Yapılan işler ----------------

export async function fetchContractorWorkEntries(contractorId: number): Promise<ContractorWorkEntry[]> {
  return apiRequest<ContractorWorkEntry[]>(`/contractors/${contractorId}/work-entries`);
}

export async function createContractorWorkEntry(
  contractorId: number,
  body: {
    workDate: string;
    description: string;
    amount?: number | null;
    currencyCode?: string;
    branchId?: number | null;
    reference?: string | null;
    notes?: string | null;
  }
): Promise<ContractorWorkEntry> {
  return apiRequest<ContractorWorkEntry>(`/contractors/${contractorId}/work-entries`, {
    method: "POST",
    body: JSON.stringify({
      workDate: body.workDate,
      description: body.description.trim(),
      amount: body.amount ?? null,
      currencyCode: body.currencyCode ?? "TRY",
      branchId: body.branchId ?? null,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
    }),
  });
}

export async function updateContractorWorkEntry(
  entryId: number,
  body: {
    workDate: string;
    description: string;
    amount?: number | null;
    branchId?: number | null;
    reference?: string | null;
    notes?: string | null;
  }
): Promise<ContractorWorkEntry> {
  return apiRequest<ContractorWorkEntry>(`/contractors/work-entries/${entryId}`, {
    method: "PUT",
    body: JSON.stringify({
      workDate: body.workDate,
      description: body.description.trim(),
      amount: body.amount ?? null,
      branchId: body.branchId ?? null,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
    }),
  });
}

export async function deleteContractorWorkEntry(entryId: number): Promise<void> {
  await apiRequest<null>(`/contractors/work-entries/${entryId}`, { method: "DELETE" });
}

// ---------------- Ödemeler ----------------

export async function fetchContractorPayments(contractorId: number): Promise<ContractorPayment[]> {
  return apiRequest<ContractorPayment[]>(`/contractors/${contractorId}/payments`);
}

/** Tüm dış çalışan ödemeleri (kişi adı dahil). */
export async function fetchAllContractorPayments(): Promise<ContractorPaymentListItem[]> {
  return apiRequest<ContractorPaymentListItem[]>(`/contractors/payments`);
}

export async function createContractorPayment(
  contractorId: number,
  body: {
    paymentDate: string;
    amount: number;
    currencyCode?: string;
    paymentSource: ContractorPaymentSourceCode;
    branchId?: number | null;
    paidByPersonnelId?: number | null;
    description?: string | null;
    reference?: string | null;
  }
): Promise<ContractorPayment> {
  return apiRequest<ContractorPayment>(`/contractors/${contractorId}/payments`, {
    method: "POST",
    body: JSON.stringify({
      paymentDate: body.paymentDate,
      amount: body.amount,
      currencyCode: body.currencyCode ?? "TRY",
      paymentSource: body.paymentSource,
      branchId: body.branchId ?? null,
      paidByPersonnelId: body.paidByPersonnelId ?? null,
      description: body.description ?? null,
      reference: body.reference ?? null,
    }),
  });
}

export async function deleteContractorPayment(paymentId: number): Promise<void> {
  await apiRequest<null>(`/contractors/payments/${paymentId}`, { method: "DELETE" });
}
