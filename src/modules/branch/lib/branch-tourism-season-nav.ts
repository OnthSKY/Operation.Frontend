/** Şube detayında turizm sezonu sekmesine yönlendirme (personel self-servis hariç). */
export function branchTourismSeasonDeepLink(
  branchId: number | null | undefined,
  employeeSelfService: boolean
): string | undefined {
  if (employeeSelfService) return undefined;
  if (branchId == null || !Number.isFinite(branchId) || branchId <= 0) return undefined;
  return `/branches?openBranch=${branchId}&branchTab=tourismSeason`;
}
