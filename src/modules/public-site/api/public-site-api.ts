import { apiRequest, apiUrl } from "@/shared/api/client";

/** Vitrin ▸ Şubeler liste satırı. */
export type BranchPublicProfileListItem = {
  branchId: number;
  branchName: string;
  isPublished: boolean;
  city: string | null;
  district: string | null;
};

/** Tek şube vitrin profili (düzenleme). */
export type BranchPublicProfile = {
  branchId: number;
  branchName: string;
  /** Operasyonel şube adresi (referans; vitrin adresi boşsa bu kullanılır). */
  defaultAddress: string | null;
  isPublished: boolean;
  city: string | null;
  district: string | null;
  publicAddress: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hoursText: string | null;
  openingHoursSchema: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  keywords: string[];
  description: string | null;
  /** Sisteme yüklenmiş bir kapak fotoğrafı var mı. */
  hasImage: boolean;
};

export type UpsertBranchPublicProfile = {
  isPublished: boolean;
  city: string | null;
  district: string | null;
  publicAddress: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hoursText: string | null;
  openingHoursSchema: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  keywords: string[];
  description: string | null;
};

export type HomeFeature = { title: string; text: string };

export type SiteContentAdmin = {
  brandName: string;
  brandTagline: string | null;
  about: string | null;
  mission: string | null;
  vision: string | null;
  contactEmail: string | null;
  instagram: string | null;
  contactPhone: string | null;
  footerNote: string | null;
  homeFeatures: HomeFeature[];
};

// ---------------- Şube profilleri ----------------

export function fetchPublicSiteBranches(): Promise<BranchPublicProfileListItem[]> {
  return apiRequest<BranchPublicProfileListItem[]>("/public-site/branches");
}

export function fetchPublicSiteBranch(branchId: number): Promise<BranchPublicProfile> {
  return apiRequest<BranchPublicProfile>(`/public-site/branches/${branchId}`);
}

export function savePublicSiteBranch(
  branchId: number,
  body: UpsertBranchPublicProfile
): Promise<BranchPublicProfile> {
  return apiRequest<BranchPublicProfile>(`/public-site/branches/${branchId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function uploadBranchImage(branchId: number, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  return apiRequest<null>(`/public-site/branches/${branchId}/image`, { method: "POST", body: fd }).then(() => undefined);
}

export function deleteBranchImage(branchId: number): Promise<void> {
  return apiRequest<null>(`/public-site/branches/${branchId}/image`, { method: "DELETE" }).then(() => undefined);
}

/** Yüklenmiş şube kapak fotoğrafının (anonim) servis URL'i — panel önizlemesi için. */
export function branchImageUrl(branchId: number): string {
  return apiUrl(`/public/branches/${branchId}/image`);
}

// ---------------- Site içeriği ----------------

export function fetchSiteContent(): Promise<SiteContentAdmin> {
  return apiRequest<SiteContentAdmin>("/public-site/content");
}

export function saveSiteContent(body: SiteContentAdmin): Promise<SiteContentAdmin> {
  return apiRequest<SiteContentAdmin>("/public-site/content", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---------------- Çeşitler ----------------

export type Flavor = {
  id: number;
  slug: string;
  name: string;
  category: string;
  color: string;
  description: string | null;
  isSignature: boolean;
  image: string | null;
  /** Sisteme yüklenmiş fotoğraf var mı. */
  hasImage: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type UpsertFlavor = {
  slug: string;
  name: string;
  category: string;
  color: string;
  description: string | null;
  isSignature: boolean;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function fetchFlavors(): Promise<Flavor[]> {
  return apiRequest<Flavor[]>("/public-site/flavors");
}

export function createFlavor(body: UpsertFlavor): Promise<Flavor> {
  return apiRequest<Flavor>("/public-site/flavors", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateFlavor(id: number, body: UpsertFlavor): Promise<Flavor> {
  return apiRequest<Flavor>(`/public-site/flavors/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteFlavor(id: number): Promise<void> {
  return apiRequest<null>(`/public-site/flavors/${id}`, { method: "DELETE" }).then(() => undefined);
}

export type SelectableProduct = { id: number; name: string; category: string | null };

/** Çeşit formunda "üründen seç" için ürün kataloğu (hafif). */
export function fetchSelectableProducts(): Promise<SelectableProduct[]> {
  return apiRequest<SelectableProduct[]>("/public-site/products");
}

export function uploadFlavorImage(id: number, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  return apiRequest<null>(`/public-site/flavors/${id}/image`, { method: "POST", body: fd }).then(() => undefined);
}

export function deleteFlavorImage(id: number): Promise<void> {
  return apiRequest<null>(`/public-site/flavors/${id}/image`, { method: "DELETE" }).then(() => undefined);
}

/** Yüklenmiş çeşit fotoğrafının (anonim) servis URL'i — panel önizlemesi için. */
export function flavorImageUrl(id: number): string {
  return apiUrl(`/public/flavors/${id}/image`);
}

/** Vitrin sitesinin önbelleğini anında tazeler ("Siteyi Güncelle"). */
export function revalidateSite(): Promise<void> {
  return apiRequest<null>("/public-site/revalidate", { method: "POST" }).then(() => undefined);
}
