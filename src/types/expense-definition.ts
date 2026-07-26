/** Gider tanımı grubu: BRANCH = şube giderleri (operasyon + yatırım), PER = personel gider türleri. */
export type ExpenseDefinitionGroup = "BRANCH" | "PER";

/** ledger_classifications kaynaklı salt-okunur gider tanımı. */
export type ExpenseDefinition = {
  id: number;
  code: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  /** FIXED / VARIABLE / CAPEX / NONE */
  costBehavior: string;
  /** P&L'e girer mi; false ise arşiv/pasif kod. */
  isPnlRelevant: boolean;
};
