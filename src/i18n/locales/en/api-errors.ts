export const apiErrors = {
  tourismSeasonClosedForRegister:
    "There is no open tourism season for the branch on this transaction date; open the tourism season or extend the date range before recording register income/expenses.",
  tourismSeasonClosedForRegisterAdmin:
    "There is no open tourism season for the branch on this transaction date. Open or extend the branch tourism season, or as an administrator allow this flow under Settings → Tourism season closed policy.",
} as const;
