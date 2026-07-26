export const apiErrors = {
  generalOverheadReverseRequiresAcknowledgement:
    "Undo needs confirmation: use the preview screen and send acknowledgeReverseRisks=true after reviewing branches with closed tourism season or REGISTER/pocket-paid shares.",
  tourismSeasonClosedForRegister:
    "There is no open tourism season for this branch on that date. Expenses and other non-income register flows cannot be posted without a season; add a season or pick a date inside one. Register income (IN) may only go through if the central closed-season policy allows it.",
  tourismSeasonClosedForRegisterAdmin:
    "There is no open tourism season for this branch on that date. Expense-type flows stay blocked without a season; define a season row. For income (IN) exceptions use Settings → Tourism season (closed register) policy.",
  shipmentFromRequestNotEditable:
    "This shipment was created from an approved shipment request and cannot be edited or deleted manually.",
  shipmentInvoicedNotEditable:
    "This shipment has an invoice. To edit or delete it, delete the related invoice first.",
  shipmentGroupAlreadyInvoiced:
    "This shipment already has an invoice. Delete the existing invoice before adding a new one.",
} as const;
