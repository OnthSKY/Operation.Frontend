/** branchId 0 = merkez (branch_id NULL OUT) — API'den gelen branchName boş olabilir. */
export function reportBranchLabel(
  branchId: number,
  branchName: string,
  t: (key: string) => string
): string {
  if (branchId === 0) return t("reports.headquartersBranch");
  const n = branchName.trim();
  return n.length > 0 ? n : "—";
}
