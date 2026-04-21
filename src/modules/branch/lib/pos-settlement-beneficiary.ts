/** Matches backend PosSettlementBeneficiaryRules.RequiresDestinationNotes */
export function requiresPosDestinationNotes(beneficiaryType: string): boolean {
  const t = beneficiaryType.trim().toUpperCase();
  return t === "FRANCHISE" || t === "JOINT_VENTURE" || t === "OTHER";
}

/** i18n keys: reports.patronFlowBeneficiary* */
export function posSettlementBeneficiaryLabel(
  t: (key: string) => string,
  type: string
): string {
  const u = type.toUpperCase();
  if (u === "PATRON") return t("reports.patronFlowBeneficiaryPatron");
  if (u === "FRANCHISE") return t("reports.patronFlowBeneficiaryFranchise");
  if (u === "JOINT_VENTURE") return t("reports.patronFlowBeneficiaryJoint");
  if (u === "BRANCH_PERSONNEL")
    return t("reports.patronFlowBeneficiaryBranchPersonnel");
  if (u === "OTHER") return t("reports.patronFlowBeneficiaryOther");
  return type;
}
