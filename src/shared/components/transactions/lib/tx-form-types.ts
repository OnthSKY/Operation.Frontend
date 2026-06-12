/**
 * AddTransactionModal form tipleri — react-hook-form FormValues, modal Props ve
 * gün sonu bundled gider satırı şeması. Saf TS, React/runtime yok.
 */

export type TxFormValues = {
  type: string;
  mainCategory: string;
  category: string;
  amount: string;
  amountCash: string;
  amountCard: string;
  currencyCode: string;
  transactionDate: string;
  description: string;
  cashSettlementParty: string;
  cashSettlementPersonnelId: string;
  expensePaymentSource: string;
  expensePocketPersonnelId: string;
  /** OUT_PERSONNEL_POCKET_CLAIM_TRANSFER: alacağı devreden personel (linkedPersonnelId) */
  pocketClaimFromPersonnelId: string;
  /** OUT_OPS + OPS_INVOICE: UNPAID | PAID */
  invoicePaymentStatus: string;
  /** adv:{id} | sal:{id} */
  expenseFinancialLink: string;
  expenseLinkPersonnelId: string;
  /** PER_ADVANCE: existing | new */
  advanceExpenseMode: string;
  effectiveYear: string;
  /** Personel kartı + atanmış şube yok: kasa için şube */
  personnelExpenseBranchId: string;
  /** Gün sonu + PATRON: otomatik patron borcu düşümü */
  applyPatronDebtRepayFromDayClose: boolean;
  /** Gün sonu ile birlikte (isteğe bağlı) aynı güne şube gideri */
  dayCloseBundledExpenseAmount: string;
  dayCloseBundledExpenseMainCategory: string;
  dayCloseBundledExpenseCategory: string;
  dayCloseBundledExpenseDescription: string;
  dayCloseBundledExpensePaymentSource: string;
  /** OUT + kasa/patron ödeme: kasa devri IN satır id (isteğe bağlı). */
  settlesCashHandoverTransactionId: string;
};

export type TxModalProps = {
  open: boolean;
  onClose: () => void;
  /** Null: şubesiz merkez gideri (yalnız OUT; ödeme PATRON). */
  branchId: number | null;
  /** Şubesiz personel giderinde (maaş/prim/avans dışı) linkedPersonnelId için varsayılan */
  defaultLinkedPersonnelId?: number;
  /** YYYY-MM-DD or datetime-local prefix; gün sabit, saat yoksa şu anki yerel saat eklenir. */
  defaultTransactionDate?: string;
  /** Pre-select gelir / gider when opening from income or expense tab. */
  defaultType?: "IN" | "OUT";
  /** Örn. şube listesinden «gün sonu»: IN + IN_DAY_CLOSE. */
  defaultMainCategory?: string;
  /** Şube: personel cebi borcu ödeme — OUT + OUT_PERSONNEL_POCKET_REPAY + personel + kasa kaynağı. */
  defaultPocketRepayPersonnelId?: number;
  defaultPocketRepayCurrencyCode?: string;
  /** POCKET_REPAY açılışında ödeme kaynağı (REGISTER | PATRON). */
  defaultExpensePaymentSource?: string;
  /** OUT_PERSONNEL_POCKET_CLAIM_TRANSFER: devreden personel (defaultMainCategory ile birlikte). */
  defaultPocketClaimFromPersonnelId?: number;
  /** OUT_PERSONNEL_POCKET_CLAIM_TRANSFER alt kodu (örn. POCKET_CLAIM_TRANSFER_TO_PATRON). */
  defaultCategory?: string;
  /**
   * Personel kasa devri: OUT + kasa/patron ödemede IN satırına bağlanır.
   * `defaultHandoverSettleKind` ile birlikte kullanın.
   */
  defaultSettlesCashHandoverTransactionId?: number;
  defaultHandoverSettleKind?: "expense_register" | "patron_register_debt_repay";
  defaultHandoverCurrencyCode?: string;
  /** Örn. kalan devir tutarı — tutar alanına yazılır (> 0 ise). */
  defaultHandoverMaxAmount?: number;
  /**
   * true: şube+para birimi toplam kalanından işlem; IN # alanı boş bırakılır (hangi devir satırından
   * düşüleceğini formda elle girersiniz). Tek OUT yalnızca bir IN'e bağlanabilir.
   */
  defaultHandoverPoolTotalOnly?: boolean;
  /** Yeni avans (kasadan) için sezon yılı varsayılanı — boşsa takvim yılı. */
  defaultEffectiveYear?: number;
  /**
   * Personel maliyetleri «personel gideri gir»: merkez modunda yalnız OUT_PERSONNEL + modalda personel seçimi
   * (şube gider ana kategorileri listelenmez).
   */
  personnelDirectExpenseEntry?: boolean;
  /**
   * PERSONNEL_HELD_REGISTER_CASH / PERSONNEL_POCKET tutarları bu şubelerde toplanır.
   * Verilmezse yalnızca `branchId` ve formda seçilen hedef şube sorgulanır (tüm şube listesine istek atılmaz).
   */
  heldRegisterAggregateBranchIds?: number[];
};

/** Gün sonu ile birlikte eklenen ve modal sırasında onaylanmış gider satırı. */
export type DayCloseBundledConfirmedLine = {
  id: string;
  amount: number;
  mainCategory: string;
  category: string | null;
  paymentSource: "REGISTER" | "PATRON";
  description: string | null;
};
