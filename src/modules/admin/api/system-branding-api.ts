import { apiRequest, apiUrl } from "@/lib/api/base-api";

export type BrandingSettingsPayload = {
  companyName: string | null;
  hasLogo: boolean;
  institutionBankAccounts: InstitutionBankAccountPayload[];
  updatedAtUtc: string | null;
  updatedByUserId: number | null;
};

export type InstitutionBankAccountPayload = {
  id: string;
  displayName: string;
  iban: string;
  accountHolder?: string | null;
  bankName?: string | null;
  isDefaultForInvoices: boolean;
};

export async function fetchSystemBranding(): Promise<BrandingSettingsPayload> {
  return apiRequest<BrandingSettingsPayload>("/system/branding", { method: "GET" });
}

export async function putSystemBranding(body: {
  companyName?: string | null;
  institutionBankAccounts?: {
    id?: string;
    displayName: string;
    iban: string;
    accountHolder?: string | null;
    bankName?: string | null;
    isDefaultForInvoices: boolean;
  }[];
}): Promise<BrandingSettingsPayload> {
  return apiRequest<BrandingSettingsPayload>("/system/branding", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function postSystemBrandingLogo(file: File): Promise<BrandingSettingsPayload> {
  const fd = new FormData();
  fd.append("logo", file);
  return apiRequest<BrandingSettingsPayload>("/system/branding/logo", {
    method: "POST",
    body: fd,
  });
}

export async function deleteSystemBrandingLogo(): Promise<BrandingSettingsPayload> {
  return apiRequest<BrandingSettingsPayload>("/system/branding/logo", { method: "DELETE" });
}

/** Kimlik çerezleriyle logo; önbellek kırığı için sunucudaki güncelleme zamanı kullanılır. */
export function companyBrandingLogoUrl(updatedAtUtc: string | null | undefined): string {
  const v =
    updatedAtUtc != null && updatedAtUtc !== ""
      ? new Date(updatedAtUtc).getTime()
      : 0;
  return `${apiUrl("/system/branding/logo")}?t=${encodeURIComponent(String(v))}`;
}
