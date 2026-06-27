/** Mutabakat/şube PDF'i için veri yardımcıları (sıralama + personel kartı/foto yükleme). */
import { personnelProfilePhotoUrl, fetchPersonnel } from "@/modules/personnel/api/personnel-api";
import { apiFetch } from "@/shared/api/client";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";

export function sortExpensesDesc(rows: BranchTransaction[]): BranchTransaction[] {
  return [...rows].sort((a, b) => {
    const d = b.transactionDate.localeCompare(a.transactionDate);
    if (d !== 0) return d;
    return b.id - a.id;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read"));
    r.readAsDataURL(blob);
  });
}

export async function loadPersonnelSettlementPersonRow(
  personnelId: number
): Promise<{ personnel: Personnel | null; profilePhotoDataUrl: string | null }> {
  try {
    const personnel = await fetchPersonnel(personnelId);
    let profilePhotoDataUrl: string | null = null;
    if (personnel.hasProfilePhoto1 === true) {
      const res = await apiFetch(
        personnelProfilePhotoUrl(personnelId, 1, {
          profilePhoto1Url: personnel.profilePhoto1Url,
          profilePhoto2Url: personnel.profilePhoto2Url,
        })
      );
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) profilePhotoDataUrl = await blobToDataUrl(blob);
      }
    }
    return { personnel, profilePhotoDataUrl };
  } catch {
    return { personnel: null, profilePhotoDataUrl: null };
  }
}
