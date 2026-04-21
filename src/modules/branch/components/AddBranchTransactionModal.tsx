"use client";

import { useI18n } from "@/i18n/context";
import {
  fetchBranchExpenseLinkAdvances,
  fetchBranchExpenseLinkSalaryPayments,
  fetchPersonnelOrgExpenseLinkAdvances,
  fetchPersonnelOrgExpenseLinkSalaryPayments,
} from "@/modules/branch/api/branches-api";
import {
  useBranchHeldRegisterCashByPerson,
  useBranchesList,
  useCreateBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  defaultPersonnelListFilters,
  useCreateAdvance,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { BranchExpenseRoutingCallout } from "@/modules/branch/components/BranchExpenseRoutingCallout";
import {
  branchTxFormIsSupplierInvoiceLine,
  buildExpensePaymentSelectOptions,
  isNonPnlMemoClassificationMain,
  isOutPersonnelClassificationMain,
  isPatronCashIncomeMain,
  isOutOtherExpenseClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
  isRegisterDayCloseIncomeRow,
  orderBranchExpenseMainOptions,
  outPersonnelCategoryEffective,
  outPersonnelSubcategoryNeedsFinancialLink,
  TX_MAIN_OUT,
  txCodeLabel,
  txMainNeedsSubCategory,
  txMainOptions,
  txSubOptions,
  txSubOptionsForRegisterExpenseModal,
} from "@/modules/branch/lib/branch-transaction-options";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { defaultDateTimeFromInput } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyErrorWithAction } from "@/shared/lib/notify-error-with-action";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import {
  currencySelectOptions,
  DEFAULT_CURRENCY,
} from "@/shared/lib/iso4217-currencies";
import { PersonnelPocketPriorLinesPicker } from "@/modules/branch/components/PersonnelPocketPriorLinesPicker";
import { cn } from "@/lib/cn";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { BRANCH_API_ERROR_TOURISM_SEASON_CLOSED_FOR_REGISTER } from "@/modules/branch/lib/branch-api-error-codes";
import { branchTourismSeasonDeepLink } from "@/modules/branch/lib/branch-tourism-season-nav";
import {
  resolveLocalizedApiError,
  userCanManageTourismSeasonClosedPolicy,
} from "@/shared/lib/resolve-localized-api-error";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import type { IncomeCashBranchManagerPersonRow } from "@/types/branch";

/** useQuery `data` yokken `?? []` kullanmayın — her render yeni dizi → useEffect sonsuz döngü. */
const EMPTY_HELD_REGISTER_ROWS: IncomeCashBranchManagerPersonRow[] = [];

type FormValues = {
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

type Props = {
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
   * düşüleceğini formda elle girersiniz). Tek OUT yalnızca bir IN’e bağlanabilir.
   */
  defaultHandoverPoolTotalOnly?: boolean;
  /** Yeni avans (kasadan) için sezon yılı varsayılanı — boşsa takvim yılı. */
  defaultEffectiveYear?: number;
  /**
   * Personel maliyetleri «personel gideri gir»: merkez modunda yalnız OUT_PERSONNEL + modalda personel seçimi
   * (şube gider ana kategorileri listelenmez).
   */
  personnelDirectExpenseEntry?: boolean;
};

const TITLE_ID = "branch-tx-title";

/** Gün sonu ile birlikte hızlı gider: personel / cebi / patron borcu vb. hariç şube gider ana kodları */
const DAY_CLOSE_BUNDLED_OUT_MAINS = new Set([
  "OUT_OPS",
  "OUT_TAX",
  "OUT_GOODS",
  "OUT_OTHER",
]);

const DAY_CLOSE_BUNDLED_EXPENSE_MAX = 3;

function formatHandoverAmountPrefill(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
}

type DayCloseBundledConfirmedLine = {
  id: string;
  amount: number;
  mainCategory: string;
  category: string | null;
  paymentSource: "REGISTER" | "PATRON";
  description: string | null;
};

function newBundledExpenseLineId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AddBranchTransactionModal({
  open,
  onClose,
  branchId: propBranchId,
  defaultLinkedPersonnelId,
  defaultTransactionDate,
  defaultType,
  defaultMainCategory,
  defaultPocketRepayPersonnelId,
  defaultPocketRepayCurrencyCode,
  defaultExpensePaymentSource,
  defaultPocketClaimFromPersonnelId,
  defaultCategory,
  defaultSettlesCashHandoverTransactionId,
  defaultHandoverSettleKind,
  defaultHandoverCurrencyCode,
  defaultHandoverMaxAmount,
  defaultHandoverPoolTotalOnly,
  defaultEffectiveYear,
  personnelDirectExpenseEntry,
}: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const canManageTourismPolicy = userCanManageTourismSeasonClosedPolicy(user?.role);

  const tryTourismSeasonClosedRedirect = useCallback(
    (e: unknown, registerBranchId: number | null | undefined) => {
      if (!(e instanceof ApiError)) return false;
      if (e.errorCode !== BRANCH_API_ERROR_TOURISM_SEASON_CLOSED_FOR_REGISTER) return false;
      const id =
        registerBranchId != null && Number.isFinite(registerBranchId) && registerBranchId > 0
          ? registerBranchId
          : null;
      const href = branchTourismSeasonDeepLink(id, false);
      if (href == null) return false;
      notifyErrorWithAction({
        message: resolveLocalizedApiError(e, t, {
          canManageTourismSeasonClosedPolicy: canManageTourismPolicy,
        }),
        actionLabel: t("branch.tourismSeasonClosedOpenTab"),
        autoCloseMs: 10_000,
        onAction: () => {
          onClose();
          router.push(href);
        },
      });
      return true;
    },
    [onClose, router, t, canManageTourismPolicy]
  );
  /** Sabit şube yok: null veya geçersiz/0 id (personel API normalize ile uyumlu). */
  const orgMode = propBranchId == null || propBranchId <= 0;
  /** Personel kartından «gider ekle»: yalnızca personel ana/alt kategorileri (şube atanmışsa kasa seçeneği de gelir). */
  const personnelLinkedExpenseContext =
    defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0;
  const personnelExpenseFlow =
    personnelLinkedExpenseContext ||
    (personnelDirectExpenseEntry === true && orgMode);
  /** RHF: invalid state + red border; no visible “Zorunlu” copy under the field. */
  const reqVal = " ";
  const createTx = useCreateBranchTransaction();
  const createAdvanceMut = useCreateAdvance();
  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    open,
    "branch-tx-modal"
  );
  const allPersonnel = personnelListResult?.items ?? [];
  const { data: branchesForPersonnelExpense = [] } = useBranchesList();
  const receiptPhotoRef = useRef<HTMLInputElement>(null);
  const [receiptPhotoPick, setReceiptPhotoPick] = useState<File | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    reset,
    trigger,
  } = useForm<FormValues>({
    defaultValues: {
      type: defaultType ?? "IN",
      mainCategory: "",
      category: "",
      amount: "",
      amountCash: "",
      amountCard: "",
      currencyCode: DEFAULT_CURRENCY,
      transactionDate: defaultDateTimeFromInput(defaultTransactionDate),
      description: "",
      cashSettlementParty: "",
      cashSettlementPersonnelId: "",
      expensePaymentSource: "",
      expensePocketPersonnelId: "",
      pocketClaimFromPersonnelId: "",
      invoicePaymentStatus: "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId: "",
      advanceExpenseMode: "existing",
      effectiveYear: "",
      personnelExpenseBranchId: "",
      applyPatronDebtRepayFromDayClose: true,
      dayCloseBundledExpenseAmount: "",
      dayCloseBundledExpenseMainCategory: "",
      dayCloseBundledExpenseCategory: "",
      dayCloseBundledExpenseDescription: "",
      dayCloseBundledExpensePaymentSource: "",
      settlesCashHandoverTransactionId: "",
    },
  });

  const [pocketRepaySettlement, setPocketRepaySettlement] = useState<{
    ids: number[];
    sum: number;
    currencyOk: boolean;
  }>({ ids: [], sum: 0, currencyOk: true });
  /** Gün sonu + aynı güne bağlı gider: alanlar kapalı; işaretlenince açılır. */
  const [dayCloseBundledExpenseOpen, setDayCloseBundledExpenseOpen] = useState(false);
  const [dayCloseBundledConfirmedLines, setDayCloseBundledConfirmedLines] = useState<
    DayCloseBundledConfirmedLine[]
  >([]);

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const txType = useWatch({ control, name: "type" });
  const mainCategoryWatch = useWatch({ control, name: "mainCategory" });
  const categoryWatch = useWatch({ control, name: "category" });
  const invoicePaymentWatch = useWatch({ control, name: "invoicePaymentStatus" });
  const isInvoiceOpsLine = useMemo(
    () =>
      branchTxFormIsSupplierInvoiceLine({
        type: txType,
        mainCategory: mainCategoryWatch,
        category: categoryWatch,
      }),
    [txType, mainCategoryWatch, categoryWatch]
  );
  const isInvoiceUnpaid = isInvoiceOpsLine && String(invoicePaymentWatch ?? "").trim().toUpperCase() === "UNPAID";
  const personnelExpenseBranchWatch = useWatch({ control, name: "personnelExpenseBranchId" });
  const resolvedBranchId = useMemo(() => {
    if (propBranchId != null && propBranchId > 0) return propBranchId;
    if (!personnelExpenseFlow) return null;
    const n = parseInt(String(personnelExpenseBranchWatch ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [propBranchId, personnelExpenseFlow, personnelExpenseBranchWatch]);
  const useOrgExpenseLinks = resolvedBranchId == null;
  const prevType = useRef(txType);
  const prevMain = useRef(mainCategoryWatch);

  useEffect(() => {
    if (!open) return;
    const pocketClaimPrefill =
      !orgMode &&
      propBranchId != null &&
      propBranchId > 0 &&
      String(defaultMainCategory ?? "").trim().toUpperCase() ===
        "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER" &&
      defaultPocketClaimFromPersonnelId != null &&
      defaultPocketClaimFromPersonnelId > 0;
    const handoverPrefill =
      !orgMode &&
      propBranchId != null &&
      propBranchId > 0 &&
      defaultHandoverSettleKind != null &&
      (defaultHandoverSettleKind === "expense_register" ||
        defaultHandoverSettleKind === "patron_register_debt_repay") &&
      (defaultHandoverPoolTotalOnly === true ||
        (defaultSettlesCashHandoverTransactionId != null &&
          defaultSettlesCashHandoverTransactionId > 0));
    const pocketRepayPrefill =
      !pocketClaimPrefill &&
      !handoverPrefill &&
      !orgMode &&
      defaultPocketRepayPersonnelId != null &&
      defaultPocketRepayPersonnelId > 0;
    const personnelExpensePrefill =
      defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0;
    const personnelCostsDirectEntry =
      orgMode && personnelDirectExpenseEntry === true;
    const nextType =
      pocketClaimPrefill ||
      handoverPrefill ||
      personnelExpensePrefill ||
      personnelCostsDirectEntry
        ? "OUT"
        : orgMode
          ? "OUT"
          : pocketRepayPrefill
            ? "OUT"
            : (defaultType ?? "IN");
    const prefillCur = (defaultPocketRepayCurrencyCode ?? "").trim().toUpperCase();
    const currencyForReset =
      (pocketClaimPrefill || pocketRepayPrefill) && /^[A-Z]{3}$/.test(prefillCur)
        ? prefillCur
        : DEFAULT_CURRENCY;
    const pocketClaimCategory =
      String(defaultCategory ?? "").trim().toUpperCase() === "POCKET_CLAIM_TRANSFER_TO_PATRON"
        ? "POCKET_CLAIM_TRANSFER_TO_PATRON"
        : "POCKET_CLAIM_TRANSFER";
    const repayPaySrc =
      String(defaultExpensePaymentSource ?? "REGISTER").trim().toUpperCase() === "PATRON"
        ? "PATRON"
        : "REGISTER";
    const dayClosePrefill =
      !orgMode &&
      !pocketClaimPrefill &&
      !pocketRepayPrefill &&
      !handoverPrefill &&
      !personnelExpensePrefill &&
      !personnelCostsDirectEntry &&
      (defaultType ?? "IN") === "IN" &&
      String(defaultMainCategory ?? "").trim().toUpperCase() === "IN_DAY_CLOSE";
    const handoverCurRaw = (defaultHandoverCurrencyCode ?? "").trim().toUpperCase();
    const handoverCur = /^[A-Z]{3}$/.test(handoverCurRaw) ? handoverCurRaw : DEFAULT_CURRENCY;
    reset({
      type: nextType,
      mainCategory: pocketClaimPrefill
        ? "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER"
        : handoverPrefill
          ? defaultHandoverSettleKind === "patron_register_debt_repay"
            ? "OUT_PATRON_DEBT_REPAY"
            : ""
          : pocketRepayPrefill
            ? "OUT_PERSONNEL_POCKET_REPAY"
            : personnelExpensePrefill || personnelCostsDirectEntry
              ? "OUT_PERSONNEL"
              : dayClosePrefill
                ? "IN_DAY_CLOSE"
                : "",
      category: pocketClaimPrefill
        ? pocketClaimCategory
        : handoverPrefill
          ? defaultHandoverSettleKind === "patron_register_debt_repay"
            ? "PATRON_DEBT_REPAY"
            : ""
          : pocketRepayPrefill
            ? "POCKET_REPAY"
            : "",
      amount:
        handoverPrefill &&
        defaultHandoverMaxAmount != null &&
        defaultHandoverMaxAmount > 0
          ? formatHandoverAmountPrefill(defaultHandoverMaxAmount)
          : "",
      amountCash: "",
      amountCard: "",
      currencyCode: handoverPrefill ? handoverCur : currencyForReset,
      transactionDate: defaultDateTimeFromInput(defaultTransactionDate),
      description: "",
      cashSettlementParty: "",
      cashSettlementPersonnelId: "",
      expensePaymentSource: handoverPrefill
        ? "REGISTER"
        : pocketRepayPrefill
          ? repayPaySrc
          : "",
      expensePocketPersonnelId: pocketRepayPrefill
        ? String(defaultPocketRepayPersonnelId)
        : "",
      pocketClaimFromPersonnelId: pocketClaimPrefill
        ? String(defaultPocketClaimFromPersonnelId)
        : "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId:
        pocketClaimPrefill || handoverPrefill || !personnelExpensePrefill
          ? ""
          : String(defaultLinkedPersonnelId),
      advanceExpenseMode: "existing",
      effectiveYear:
        defaultEffectiveYear != null &&
        defaultEffectiveYear >= 1900 &&
        defaultEffectiveYear <= 9999
          ? String(defaultEffectiveYear)
          : "",
      personnelExpenseBranchId: "",
      invoicePaymentStatus: "",
      applyPatronDebtRepayFromDayClose: true,
      dayCloseBundledExpenseAmount: "",
      dayCloseBundledExpenseMainCategory: "",
      dayCloseBundledExpenseCategory: "",
      dayCloseBundledExpenseDescription: "",
      dayCloseBundledExpensePaymentSource: "",
      settlesCashHandoverTransactionId:
        handoverPrefill &&
        defaultHandoverPoolTotalOnly !== true &&
        defaultSettlesCashHandoverTransactionId != null &&
        defaultSettlesCashHandoverTransactionId > 0
          ? String(defaultSettlesCashHandoverTransactionId)
          : "",
    });
    setPocketRepaySettlement({ ids: [], sum: 0, currencyOk: true });
    setDayCloseBundledExpenseOpen(false);
    setDayCloseBundledConfirmedLines([]);
    prevType.current = nextType;
    prevMain.current = pocketClaimPrefill
      ? "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER"
      : handoverPrefill
        ? defaultHandoverSettleKind === "patron_register_debt_repay"
          ? "OUT_PATRON_DEBT_REPAY"
          : ""
        : pocketRepayPrefill
          ? "OUT_PERSONNEL_POCKET_REPAY"
          : personnelExpensePrefill || personnelCostsDirectEntry
            ? "OUT_PERSONNEL"
            : dayClosePrefill
              ? "IN_DAY_CLOSE"
              : "";
    if (receiptPhotoRef.current) receiptPhotoRef.current.value = "";
    setReceiptPhotoPick(null);
  }, [
    open,
    reset,
    defaultTransactionDate,
    defaultType,
    orgMode,
    propBranchId,
    defaultPocketRepayPersonnelId,
    defaultPocketRepayCurrencyCode,
    defaultExpensePaymentSource,
    defaultPocketClaimFromPersonnelId,
    defaultCategory,
    defaultSettlesCashHandoverTransactionId,
    defaultHandoverSettleKind,
    defaultHandoverCurrencyCode,
    defaultHandoverMaxAmount,
    defaultHandoverPoolTotalOnly,
    defaultLinkedPersonnelId,
    defaultMainCategory,
    defaultEffectiveYear,
    personnelDirectExpenseEntry,
  ]);

  useEffect(() => {
    if (prevType.current !== txType) {
      setValue("mainCategory", "");
      setValue("category", "");
      setValue("amountCash", "");
      setValue("amountCard", "");
      setValue("cashSettlementParty", "");
      setValue("cashSettlementPersonnelId", "");
      setValue("expensePaymentSource", "");
      setValue("expensePocketPersonnelId", "");
      setValue("pocketClaimFromPersonnelId", "");
      setValue("expenseFinancialLink", "");
      setValue("expenseLinkPersonnelId", "");
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
      setValue("applyPatronDebtRepayFromDayClose", true);
      setValue("dayCloseBundledExpenseAmount", "");
      setValue("dayCloseBundledExpenseMainCategory", "");
      setValue("dayCloseBundledExpenseCategory", "");
      setValue("dayCloseBundledExpenseDescription", "");
      setValue("dayCloseBundledExpensePaymentSource", "");
      setDayCloseBundledConfirmedLines([]);
      setPocketRepaySettlement({ ids: [], sum: 0, currencyOk: true });
      if (receiptPhotoRef.current) receiptPhotoRef.current.value = "";
      setReceiptPhotoPick(null);
      prevType.current = txType;
    }
  }, [txType, setValue]);

  useEffect(() => {
    if (prevMain.current !== mainCategoryWatch) {
      setValue("category", "");
      setValue("cashSettlementParty", "");
      setValue("cashSettlementPersonnelId", "");
      setValue("expensePaymentSource", "");
      setValue("expensePocketPersonnelId", "");
      setValue("pocketClaimFromPersonnelId", "");
      setValue("invoicePaymentStatus", "");
      setValue("expenseFinancialLink", "");
      setValue("expenseLinkPersonnelId", "");
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
      setValue("applyPatronDebtRepayFromDayClose", true);
      setValue("dayCloseBundledExpenseAmount", "");
      setValue("dayCloseBundledExpenseMainCategory", "");
      setValue("dayCloseBundledExpenseCategory", "");
      setValue("dayCloseBundledExpenseDescription", "");
      setValue("dayCloseBundledExpensePaymentSource", "");
      setDayCloseBundledConfirmedLines([]);
      setPocketRepaySettlement({ ids: [], sum: 0, currencyOk: true });
      prevMain.current = mainCategoryWatch;
    }
  }, [mainCategoryWatch, setValue]);

  useEffect(() => {
    if (!isInvoiceOpsLine) {
      setValue("invoicePaymentStatus", "");
      return;
    }
    if (!String(invoicePaymentWatch ?? "").trim()) {
      setValue("invoicePaymentStatus", "UNPAID");
    }
  }, [isInvoiceOpsLine, invoicePaymentWatch, setValue]);

  useEffect(() => {
    if (!isInvoiceUnpaid) return;
    setValue("expensePaymentSource", "");
    setValue("expensePocketPersonnelId", "");
  }, [isInvoiceUnpaid, setValue]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [isInvoiceUnpaid, trigger]);

  useEffect(() => {
    void trigger("invoicePaymentStatus");
  }, [isInvoiceOpsLine, trigger]);

  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    const c = (String(categoryWatch ?? "").trim() || "").toUpperCase();
    const mU = m.toUpperCase();
    if (
      isPocketClaimTransferClassificationMain(m) &&
      (c === "POCKET_CLAIM_TRANSFER_TO_PATRON" || mU === "OUT_POCKET_CLAIM_TO_PATRON")
    ) {
      setValue("expensePocketPersonnelId", "");
    }
  }, [mainCategoryWatch, categoryWatch, setValue]);

  useEffect(() => {
    const ty = txType.toUpperCase();
    const m = String(mainCategoryWatch ?? "").trim();
    if (ty === "OUT" && isOutOtherExpenseClassificationMain(m)) setValue("category", "EXP_OTHER");
    if (ty === "OUT" && isPersonnelPocketRepayClassificationMain(m)) {
      setValue("category", m.toUpperCase() === "OUT_POCKET_REPAY" ? "" : "POCKET_REPAY");
    }
    if (ty === "OUT" && isPocketClaimTransferClassificationMain(m)) {
      const curCat = String(getValues("category") ?? "").trim();
      if (!curCat && m.toUpperCase() === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER") {
        setValue("category", "POCKET_CLAIM_TRANSFER");
      }
    }
    if (ty === "OUT" && isPatronDebtRepayClassificationMain(m))
      setValue("category", "PATRON_DEBT_REPAY");
    if (ty === "OUT" && isNonPnlMemoClassificationMain(m)) {
      setValue("category", m.toUpperCase() === "MEMO_NON_PNL" ? "" : "NON_PNL_MEMO");
    }
    if (ty === "IN" && m === "IN_DAY_CLOSE") setValue("category", "");
    if (ty === "IN" && isPatronCashIncomeMain(m)) {
      setValue("category", m.toUpperCase() === "IN_PATRON_CASH" ? "" : "PATRON_CASH");
      setValue("amountCash", "");
      setValue("amountCard", "");
    }
  }, [txType, mainCategoryWatch, setValue, getValues]);

  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    if (txType.toUpperCase() === "OUT" && isPatronDebtRepayClassificationMain(m)) {
      setValue("expensePaymentSource", "REGISTER");
      setValue("expensePocketPersonnelId", "");
    }
  }, [txType, mainCategoryWatch, setValue]);

  const { field: transactionDateField, fieldState: transactionDateFieldState } =
    useController({
      name: "transactionDate",
      control,
      rules: { required: reqVal },
    });

  const { field: typeField } = useController({
    name: "type",
    control,
    defaultValue: "IN",
    rules: { required: reqVal },
  });

  const { field: personnelExpenseBranchField } = useController({
    name: "personnelExpenseBranchId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (!personnelExpenseFlow) return true;
        if (propBranchId != null && propBranchId > 0) return true;
        const pay = String(getValues("expensePaymentSource") ?? "").trim().toUpperCase();
        if (pay !== "REGISTER") return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const { field: mainField } = useController({
    name: "mainCategory",
    control,
    defaultValue: "",
    rules: { required: reqVal },
  });

  const needsSubCategory = useMemo(
    () => txMainNeedsSubCategory(txType, String(mainCategoryWatch ?? "")),
    [txType, mainCategoryWatch]
  );

  const { field: categoryField } = useController({
    name: "category",
    control,
    defaultValue: "",
    rules: {
      validate: (v) =>
        !needsSubCategory || String(v ?? "").trim()
          ? true
          : reqVal,
    },
  });

  const { field: invoicePaymentField } = useController({
    name: "invoicePaymentStatus",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (!isInvoiceOpsLine) return true;
        const u = String(v ?? "").trim().toUpperCase();
        return u === "UNPAID" || u === "PAID" ? true : reqVal;
      },
    },
  });

  useEffect(() => {
    void trigger("category");
  }, [needsSubCategory, trigger]);

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [categoryWatch, setValue]);

  const mainCat = String(mainCategoryWatch ?? "").trim();
  const isPocketRepayMain =
    txType.toUpperCase() === "OUT" && isPersonnelPocketRepayClassificationMain(mainCat);
  /** Önceki cep satırları seçimi — yalnız şemsiye ana kodda (granüler OUT_POCKET_REPAY kilit göstermez). */
  const isPocketRepaySettlementUmbrellaMain =
    txType.toUpperCase() === "OUT" &&
    mainCat.trim().toUpperCase() === "OUT_PERSONNEL_POCKET_REPAY";
  const isPocketClaimTransferMain =
    txType.toUpperCase() === "OUT" && isPocketClaimTransferClassificationMain(mainCat);
  const isPatronDebtRepayMain =
    txType.toUpperCase() === "OUT" && isPatronDebtRepayClassificationMain(mainCat);
  const isNonPnlMemoMain =
    txType.toUpperCase() === "OUT" && isNonPnlMemoClassificationMain(mainCat);
  const subCat = outPersonnelCategoryEffective(mainCat, categoryWatch).toUpperCase();
  const needsExpenseAdvancePick =
    txType.toUpperCase() === "OUT" &&
    isOutPersonnelClassificationMain(mainCat) &&
    subCat === "PER_ADVANCE";
  const needsExpenseSalaryPick =
    txType.toUpperCase() === "OUT" &&
    isOutPersonnelClassificationMain(mainCat) &&
    (subCat === "PER_SALARY" || subCat === "PER_BONUS");
  const needsExpenseFinancialPersonnelPick =
    needsExpenseAdvancePick || needsExpenseSalaryPick;

  const needsDirectPersonnelPickForPersonnelExpense = useMemo(() => {
    if (!personnelExpenseFlow || personnelLinkedExpenseContext) return false;
    if (txType.trim().toUpperCase() !== "OUT") return false;
    if (!isOutPersonnelClassificationMain(mainCat)) return false;
    if (!subCat) return false;
    if (needsExpenseFinancialPersonnelPick) return false;
    return !outPersonnelSubcategoryNeedsFinancialLink(subCat);
  }, [
    personnelExpenseFlow,
    personnelLinkedExpenseContext,
    txType,
    mainCat,
    subCat,
    needsExpenseFinancialPersonnelPick,
  ]);

  const { field: expenseLinkPersonnelField } = useController({
    name: "expenseLinkPersonnelId",
    control,
    defaultValue: "",
  });

  const { field: advanceExpenseModeField } = useController({
    name: "advanceExpenseMode",
    control,
    defaultValue: "existing",
  });

  const expenseLinkPersonnelWatch = useWatch({ control, name: "expenseLinkPersonnelId" });
  const advanceExpenseModeWatch = useWatch({ control, name: "advanceExpenseMode" });
  const expenseFinancialLinkWatch = useWatch({ control, name: "expenseFinancialLink" });
  const expenseLinkPidNum = useMemo(() => {
    const n = parseInt(String(expenseLinkPersonnelWatch ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [expenseLinkPersonnelWatch]);

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [expenseLinkPersonnelWatch, setValue]);

  useEffect(() => {
    if (!needsExpenseFinancialPersonnelPick) setValue("expenseLinkPersonnelId", "");
  }, [needsExpenseFinancialPersonnelPick, setValue]);

  useEffect(() => {
    if (
      !needsExpenseFinancialPersonnelPick ||
      !personnelLinkedExpenseContext ||
      defaultLinkedPersonnelId == null ||
      defaultLinkedPersonnelId <= 0
    )
      return;
    setValue("expenseLinkPersonnelId", String(defaultLinkedPersonnelId));
  }, [
    needsExpenseFinancialPersonnelPick,
    personnelLinkedExpenseContext,
    defaultLinkedPersonnelId,
    categoryWatch,
    setValue,
  ]);

  useEffect(() => {
    if (!needsExpenseAdvancePick) {
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
    }
  }, [needsExpenseAdvancePick, setValue]);

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [advanceExpenseModeWatch, setValue]);

  const advanceModeTrim = String(advanceExpenseModeWatch ?? "existing").trim();
  const needsExpenseAdvanceExisting =
    needsExpenseAdvancePick && advanceModeTrim === "existing";
  const needsExpenseAdvanceNewRegister =
    needsExpenseAdvancePick && advanceModeTrim === "new_register";

  useEffect(() => {
    if (!open || !needsExpenseAdvanceNewRegister) return;
    const cur = getValues("effectiveYear");
    if (String(cur ?? "").trim()) return;
    const y =
      defaultEffectiveYear != null &&
      defaultEffectiveYear >= 1900 &&
      defaultEffectiveYear <= 9999
        ? defaultEffectiveYear
        : new Date().getFullYear();
    setValue("effectiveYear", String(y));
  }, [
    open,
    needsExpenseAdvanceNewRegister,
    defaultEffectiveYear,
    getValues,
    setValue,
  ]);

  const financialAmountLocked = useMemo(() => {
    if (isPocketRepaySettlementUmbrellaMain) return true;
    const link = String(expenseFinancialLinkWatch ?? "").trim();
    if (needsExpenseSalaryPick && link.startsWith("sal:")) return true;
    if (needsExpenseAdvanceExisting && link.startsWith("adv:")) return true;
    return false;
  }, [
    isPocketRepaySettlementUmbrellaMain,
    needsExpenseSalaryPick,
    needsExpenseAdvanceExisting,
    expenseFinancialLinkWatch,
  ]);

  const { data: expenseLinkAdvances = [], isFetching: expenseLinkAdvFetching } = useQuery({
    queryKey: useOrgExpenseLinks
      ? ["personnel", expenseLinkPidNum, "org-expense-link-advances"]
      : ["branches", resolvedBranchId, "expense-link-advances", expenseLinkPidNum],
    queryFn: () =>
      useOrgExpenseLinks
        ? fetchPersonnelOrgExpenseLinkAdvances(expenseLinkPidNum)
        : fetchBranchExpenseLinkAdvances(resolvedBranchId!, expenseLinkPidNum),
    enabled:
      open &&
      needsExpenseAdvanceExisting &&
      expenseLinkPidNum > 0 &&
      (useOrgExpenseLinks || (resolvedBranchId != null && resolvedBranchId > 0)),
  });

  const { data: expenseLinkSalary = [], isFetching: expenseLinkSalaryFetching } = useQuery({
    queryKey: useOrgExpenseLinks
      ? ["personnel", expenseLinkPidNum, "org-expense-link-salary"]
      : ["branches", resolvedBranchId, "expense-link-salary", expenseLinkPidNum],
    queryFn: () =>
      useOrgExpenseLinks
        ? fetchPersonnelOrgExpenseLinkSalaryPayments(expenseLinkPidNum)
        : fetchBranchExpenseLinkSalaryPayments(resolvedBranchId!, expenseLinkPidNum),
    enabled:
      open &&
      needsExpenseSalaryPick &&
      expenseLinkPidNum > 0 &&
      (useOrgExpenseLinks || (resolvedBranchId != null && resolvedBranchId > 0)),
  });

  const { field: expenseFinancialLinkField } = useController({
    name: "expenseFinancialLink",
    control,
    defaultValue: "",
  });

  const { field: cashSettlementField } = useController({
    name: "cashSettlementParty",
    control,
    defaultValue: "",
  });

  const cashPartyWatch = useWatch({ control, name: "cashSettlementParty" });

  const { field: settlementPersonnelField } = useController({
    name: "cashSettlementPersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (String(cashPartyWatch ?? "").trim().toUpperCase() !== "BRANCH_MANAGER")
          return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const { field: expensePayField } = useController({
    name: "expensePaymentSource",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (txType.toUpperCase() !== "OUT") return true;
        const main = String(mainCategoryWatch ?? "").trim();
        const inv = (String(getValues("invoicePaymentStatus") ?? "").trim() || "").toUpperCase();
        if (
          branchTxFormIsSupplierInvoiceLine({
            type: txType,
            mainCategory: main,
            category: String(getValues("category") ?? ""),
          }) &&
          inv === "UNPAID"
        )
          return true;
        if (!main.toUpperCase().startsWith("OUT_")) return true;
        if (isNonPnlMemoClassificationMain(main)) return true;
        if (isPocketClaimTransferClassificationMain(main)) return true;
        if (isPatronDebtRepayClassificationMain(main)) {
          return String(v ?? "").trim().toUpperCase() === "REGISTER" ? true : reqVal;
        }
        if (isPersonnelPocketRepayClassificationMain(main)) {
          const u = String(v ?? "").trim().toUpperCase();
          return u === "REGISTER" || u === "PATRON" ? true : reqVal;
        }
        if (
          isOutPersonnelClassificationMain(main) &&
          String(v ?? "").trim().toUpperCase() === "PERSONNEL_POCKET"
        )
          return reqVal;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const { field: dayCloseBundledMainField } = useController({
    name: "dayCloseBundledExpenseMainCategory",
    control,
    defaultValue: "",
  });

  const { field: dayCloseBundledSubField } = useController({
    name: "dayCloseBundledExpenseCategory",
    control,
    defaultValue: "",
  });

  const { field: dayCloseBundledExpensePayField } = useController({
    name: "dayCloseBundledExpensePaymentSource",
    control,
    defaultValue: "",
  });

  const expensePayWatch = useWatch({ control, name: "expensePaymentSource" });
  const transactionDateWatch = useWatch({ control, name: "transactionDate" });

  const expensePayUForHandover = String(expensePayWatch ?? "").trim().toUpperCase();
  const cashHandoverSettleFieldVisible =
    txType.toUpperCase() === "OUT" &&
    !isPocketRepayMain &&
    !isPocketClaimTransferMain &&
    !isPatronDebtRepayMain &&
    !isNonPnlMemoMain &&
    !isInvoiceUnpaid &&
    (expensePayUForHandover === "REGISTER" || expensePayUForHandover === "PATRON");

  useEffect(() => {
    void trigger("personnelExpenseBranchId");
  }, [expensePayWatch, resolvedBranchId, trigger]);

  useEffect(() => {
    if (resolvedBranchId != null && resolvedBranchId > 0) return;
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (pay !== "REGISTER" && pay !== "PERSONNEL_HELD_REGISTER_CASH") return;
    setValue("expensePaymentSource", "");
  }, [resolvedBranchId, expensePayWatch, setValue]);

  const expensePocketPersonnelWatch = useWatch({ control, name: "expensePocketPersonnelId" });
  useEffect(() => {
    void trigger("pocketClaimFromPersonnelId");
    void trigger("expensePocketPersonnelId");
  }, [expensePocketPersonnelWatch, mainCategoryWatch, categoryWatch, trigger]);

  const expensePocketRepayPidNum = useMemo(() => {
    const n = parseInt(String(expensePocketPersonnelWatch ?? "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [expensePocketPersonnelWatch]);

  const { field: expensePocketPersonnelField } = useController({
    name: "expensePocketPersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (txType.toUpperCase() !== "OUT") return true;
        const main = String(mainCategoryWatch ?? "").trim();
        if (!main.toUpperCase().startsWith("OUT_")) return true;
        const pay = String(getValues("expensePaymentSource") ?? "").trim().toUpperCase();
        if (isNonPnlMemoClassificationMain(main)) return true;
        if (isPocketClaimTransferClassificationMain(main)) {
          const cat = (String(getValues("category") ?? "").trim() || "").toUpperCase();
          const mU = main.toUpperCase();
          if (cat === "POCKET_CLAIM_TRANSFER_TO_PATRON" || mU === "OUT_POCKET_CLAIM_TO_PATRON")
            return true;
          const from = String(getValues("pocketClaimFromPersonnelId") ?? "").trim();
          const to = String(v ?? "").trim();
          if (!from || !to) return reqVal;
          if (from === to) return reqVal;
          return true;
        }
        if (isPatronDebtRepayClassificationMain(main)) return true;
        if (isPersonnelPocketRepayClassificationMain(main)) {
          if (pay !== "REGISTER" && pay !== "PATRON") return true;
          return String(v ?? "").trim() ? true : reqVal;
        }
        if (isOutPersonnelClassificationMain(main)) return true;
        const payU = String(expensePayWatch ?? "").trim().toUpperCase();
        if (payU !== "PERSONNEL_POCKET" && payU !== "PERSONNEL_HELD_REGISTER_CASH") return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const { field: pocketClaimFromPersonnelField } = useController({
    name: "pocketClaimFromPersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (txType.toUpperCase() !== "OUT") return true;
        const main = String(mainCategoryWatch ?? "").trim();
        if (!isPocketClaimTransferClassificationMain(main)) return true;
        const cat = (String(getValues("category") ?? "").trim() || "").toUpperCase();
        const from = String(v ?? "").trim();
        if (
          cat === "POCKET_CLAIM_TRANSFER_TO_PATRON" ||
          main.toUpperCase() === "OUT_POCKET_CLAIM_TO_PATRON"
        )
          return from ? true : reqVal;
        const to = String(getValues("expensePocketPersonnelId") ?? "").trim();
        if (!from || !to) return reqVal;
        if (from === to) return reqVal;
        return true;
      },
    },
  });

  const amountCashWatch = useWatch({ control, name: "amountCash" });
  const amountCardWatch = useWatch({ control, name: "amountCard" });
  const currencyWatch = useWatch({ control, name: "currencyCode" });

  const patronCashIncomeMainActive =
    txType.toUpperCase() === "IN" && isPatronCashIncomeMain(mainCategoryWatch);

  const incomeSplitActive =
    txType.toUpperCase() === "IN" &&
    !patronCashIncomeMainActive &&
    (String(amountCashWatch ?? "").trim() !== "" ||
      String(amountCardWatch ?? "").trim() !== "");

  const registerDayClose = isRegisterDayCloseIncomeRow(
    txType,
    mainCategoryWatch,
    categoryWatch
  );

  useEffect(() => {
    if (!registerDayClose || orgMode) {
      setDayCloseBundledExpenseOpen(false);
      setDayCloseBundledConfirmedLines([]);
    }
  }, [registerDayClose, orgMode]);

  const parsedCashPositive = useMemo(() => {
    if (txType.toUpperCase() !== "IN") return false;
    const c = parseLocaleAmount(String(amountCashWatch ?? ""), locale);
    return Number.isFinite(c) && c > 0;
  }, [txType, amountCashWatch, locale]);

  const showCashSettlement = registerDayClose || parsedCashPositive;

  useEffect(() => {
    if (!showCashSettlement) {
      setValue("cashSettlementParty", "");
      setValue("cashSettlementPersonnelId", "");
    }
  }, [showCashSettlement, setValue]);

  useEffect(() => {
    if (String(cashPartyWatch ?? "").trim().toUpperCase() !== "BRANCH_MANAGER")
      setValue("cashSettlementPersonnelId", "");
  }, [cashPartyWatch, setValue]);

  useEffect(() => {
    void trigger("cashSettlementPersonnelId");
  }, [cashPartyWatch, trigger]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [mainCategoryWatch, txType, trigger]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [categoryWatch, trigger]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [advanceExpenseModeWatch, trigger]);

  useEffect(() => {
    const main = String(mainCategoryWatch ?? "").trim();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (!isOutPersonnelClassificationMain(main) || pay !== "PERSONNEL_POCKET") return;
    setValue("expensePaymentSource", "");
    setValue("expensePocketPersonnelId", "");
  }, [mainCategoryWatch, expensePayWatch, setValue]);

  useEffect(() => {
    const main = String(mainCategoryWatch ?? "").trim();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (isNonPnlMemoClassificationMain(main)) {
      setValue("expensePaymentSource", "");
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (isPatronDebtRepayClassificationMain(main)) {
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (isPersonnelPocketRepayClassificationMain(main) && pay === "PERSONNEL_POCKET") {
      setValue("expensePaymentSource", "");
      return;
    }
    if (isPersonnelPocketRepayClassificationMain(main)) return;
    if (pay !== "PERSONNEL_POCKET" && pay !== "PERSONNEL_HELD_REGISTER_CASH")
      setValue("expensePocketPersonnelId", "");
  }, [expensePayWatch, mainCategoryWatch, setValue]);

  useEffect(() => {
    void trigger("expensePocketPersonnelId");
  }, [expensePayWatch, mainCategoryWatch, trigger]);

  const expensePaymentSelectOptions = useMemo(
    () =>
      buildExpensePaymentSelectOptions({
        orgMode: resolvedBranchId == null,
        mainCategory: String(mainCategoryWatch ?? ""),
        category: String(categoryWatch ?? ""),
        isNonPnlMemoMain,
        isPatronDebtRepayMain,
        isPocketRepayMain,
        isPocketClaimTransferMain,
        t,
      }),
    [
      resolvedBranchId,
      mainCategoryWatch,
      categoryWatch,
      isNonPnlMemoMain,
      isPatronDebtRepayMain,
      isPocketRepayMain,
      isPocketClaimTransferMain,
      t,
    ]
  );

  const personnelExpenseBranchOptions = useMemo(() => {
    const empty = { value: "", label: t("branch.txPersonnelExpenseBranchPick") };
    const loc = locale === "tr" ? "tr" : "en";
    return [
      empty,
      ...[...branchesForPersonnelExpense]
        .sort((a, b) => a.name.localeCompare(b.name, loc))
        .map((b) => ({ value: String(b.id), label: b.name })),
    ];
  }, [branchesForPersonnelExpense, locale, t]);

  const branchStaffOptions = useMemo(() => {
    const list = allPersonnel.filter(
      (p) =>
        !p.isDeleted &&
        (resolvedBranchId == null || p.branchId === resolvedBranchId)
    );
    const loc = locale === "tr" ? "tr" : "en";
    return [
      { value: "", label: t("branch.cashSettlementResponsiblePick") },
      ...[...list]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [allPersonnel, resolvedBranchId, locale, t]);

  /** Gün sonu / IN nakit devirinde sorumlu: tüm aktif personel (şube filtresi yok). */
  const cashSettlementResponsibleOptions = useMemo(() => {
    const list = allPersonnel.filter((p) => !p.isDeleted);
    const loc = locale === "tr" ? "tr" : "en";
    return [
      { value: "", label: t("branch.cashSettlementResponsiblePick") },
      ...[...list]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [allPersonnel, locale, t]);

  const asOfDateYmd = useMemo(() => {
    const s = String(transactionDateWatch ?? "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }, [transactionDateWatch]);

  const heldRegisterPickerEnabled =
    open &&
    resolvedBranchId != null &&
    resolvedBranchId > 0 &&
    String(expensePayWatch ?? "").trim().toUpperCase() === "PERSONNEL_HELD_REGISTER_CASH";

  const { data: heldRegisterCashData, isPending: heldRegisterCashLoading } =
    useBranchHeldRegisterCashByPerson(
      resolvedBranchId,
      asOfDateYmd,
      heldRegisterPickerEnabled
    );
  const heldRegisterCashRows = heldRegisterCashData ?? EMPTY_HELD_REGISTER_ROWS;

  /** Cebinde net kasa parası &gt; 0 olanlar; etikette tutar (işlem tarihine kadar). */
  const heldRegisterPersonOptions = useMemo(() => {
    const empty = { value: "", label: t("branch.cashSettlementResponsiblePick") };
    const loc = locale === "tr" ? "tr" : "en";
    const rows = heldRegisterCashRows.filter(
      (r) => r.personnelId != null && r.personnelId > 0 && r.amount > 0.005
    );
    const opts = [...rows]
      .sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || "", loc)
      )
      .map((r) => {
        const pid = r.personnelId as number;
        const p = allPersonnel.find((x) => x.id === pid);
        const namePart = p
          ? `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`
          : r.fullName || `#${pid}`;
        const amt = formatLocaleAmount(r.amount, locale);
        return {
          value: String(pid),
          label: `${namePart} — ${t("branch.heldRegisterCashDropdownAmountLabel")}: ${amt}`,
        };
      });
    return [empty, ...opts];
  }, [heldRegisterCashRows, allPersonnel, locale, t]);

  useEffect(() => {
    if (!heldRegisterPickerEnabled) return;
    const sel = String(expensePocketPersonnelWatch ?? "").trim();
    if (!sel) return;
    const inList = heldRegisterCashRows.some(
      (r) =>
        r.personnelId != null &&
        String(r.personnelId) === sel &&
        r.amount > 0.005
    );
    if (!inList) setValue("expensePocketPersonnelId", "");
  }, [heldRegisterPickerEnabled, heldRegisterCashRows, expensePocketPersonnelWatch, setValue]);

  useEffect(() => {
    if (!heldRegisterPickerEnabled) return;
    void trigger("expensePocketPersonnelId");
  }, [heldRegisterPickerEnabled, heldRegisterCashRows, trigger]);

  const expenseLinkStaffOptions = useMemo(() => {
    const list = allPersonnel.filter(
      (p) =>
        !p.isDeleted &&
        (resolvedBranchId == null || p.branchId === resolvedBranchId)
    );
    const loc = locale === "tr" ? "tr" : "en";
    return [
      { value: "", label: t("branch.txExpenseLinkPersonnelPick") },
      ...[...list]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [allPersonnel, resolvedBranchId, locale, t]);

  const prefilledLinkedPersonnelLabel = useMemo(() => {
    if (defaultLinkedPersonnelId == null || defaultLinkedPersonnelId <= 0) return "";
    const p = allPersonnel.find((x) => x.id === defaultLinkedPersonnelId);
    if (!p) return `#${defaultLinkedPersonnelId}`;
    return `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`;
  }, [allPersonnel, defaultLinkedPersonnelId, t]);

  const splitTotal = useMemo(() => {
    if (!incomeSplitActive) return null;
    const c = parseLocaleAmount(String(amountCashWatch ?? ""), locale);
    const k = parseLocaleAmount(String(amountCardWatch ?? ""), locale);
    if (!Number.isFinite(c) || !Number.isFinite(k) || c < 0 || k < 0)
      return null;
    return c + k;
  }, [incomeSplitActive, amountCashWatch, amountCardWatch, locale]);

  const { field: amountField } = useController({
    name: "amount",
    control,
    defaultValue: "",
    rules: {
      validate: (v) =>
        incomeSplitActive || String(v ?? "").trim()
          ? true
          : reqVal,
    },
  });

  useEffect(() => {
    void trigger("amount");
  }, [incomeSplitActive, trigger]);

  const { field: currencyField } = useController({
    name: "currencyCode",
    control,
    defaultValue: DEFAULT_CURRENCY,
    rules: { required: reqVal },
  });

  const handlePocketRepaySettlementChange = useCallback(
    (ids: number[], sum: number, currencyOk: boolean) => {
      setPocketRepaySettlement({ ids, sum, currencyOk });
      const cur = String(currencyWatch ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
      if (ids.length > 0 && sum > 0 && currencyOk) {
        setValue("amount", formatLocaleAmount(sum, locale, cur));
      } else {
        setValue("amount", "");
      }
      void trigger("amount");
    },
    [currencyWatch, locale, setValue, trigger]
  );

  const regCash = register("amountCash");
  const regCard = register("amountCard");
  const regEffectiveYear = register("effectiveYear");

  const mainOpts = useMemo(() => {
    const base = txMainOptions(txType, t);
    const ty = txType.trim().toUpperCase();
    let opts: SelectOption[];
    if (personnelExpenseFlow && ty === "OUT") {
      opts = base.filter((o) => o.value === "OUT_PERSONNEL");
    } else if (orgMode) {
      const filtered = base.filter(
        (o) =>
          o.value !== "OUT_PERSONNEL_POCKET_REPAY" &&
          o.value !== "OUT_PATRON_DEBT_REPAY" &&
          o.value !== "OUT_NON_PNL"
      );
      opts = ty === "OUT" ? orderBranchExpenseMainOptions(filtered) : filtered;
    } else if (ty === "OUT") {
      opts = orderBranchExpenseMainOptions(base);
    } else {
      opts = base;
    }
    if (ty === "OUT" && !UI_POCKET_CLAIM_TRANSFER_ENABLED) {
      opts = opts.filter((o) => o.value !== "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER");
    }
    return opts;
  }, [txType, t, orgMode, personnelExpenseFlow]);
  const subOpts = useMemo(() => {
    const ty = txType.trim().toUpperCase();
    if (ty === "OUT") {
      return txSubOptionsForRegisterExpenseModal(String(mainCategoryWatch ?? ""), t);
    }
    return txSubOptions(mainCategoryWatch, t);
  }, [txType, mainCategoryWatch, t]);

  const dayCloseBundledMainOpts = useMemo(() => {
    const empty = { value: "", label: t("branch.txSelectPlaceholder") };
    const rows = TX_MAIN_OUT.filter((x) => DAY_CLOSE_BUNDLED_OUT_MAINS.has(x.value));
    return [empty, ...rows.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
  }, [t]);

  const dayCloseBundledSubOpts = useMemo(() => {
    const m = String(dayCloseBundledMainField.value ?? "").trim();
    if (!m) return [{ value: "", label: t("branch.txSelectPlaceholder") }];
    return txSubOptionsForRegisterExpenseModal(m, t);
  }, [dayCloseBundledMainField.value, t]);

  const bundledDayCloseNeedsSubCategory = txMainNeedsSubCategory(
    "OUT",
    String(dayCloseBundledMainField.value ?? "")
  );

  const dayCloseBundledAmtWatch = useWatch({ control, name: "dayCloseBundledExpenseAmount" });
  const dayCloseBundledDescWatch = useWatch({ control, name: "dayCloseBundledExpenseDescription" });

  const dayCloseBundledExpensePreview = useMemo(() => {
    const raw = String(dayCloseBundledAmtWatch ?? "").trim();
    if (!raw) return null;
    const amt = parseLocaleAmount(raw, locale);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    const main = String(dayCloseBundledMainField.value ?? "").trim();
    if (!main || !DAY_CLOSE_BUNDLED_OUT_MAINS.has(main)) return null;
    const mainLabel =
      dayCloseBundledMainOpts.find((o) => o.value === main)?.label ?? main;
    const sub = String(dayCloseBundledSubField.value ?? "").trim();
    const subNeeded = txMainNeedsSubCategory("OUT", main);
    let subLabel: string | null = null;
    if (subNeeded) {
      if (!sub) {
        return {
          line: `${mainLabel} · ${formatLocaleAmount(amt, locale, currencyWatch)}`,
          incomplete: true as const,
        };
      }
      subLabel =
        dayCloseBundledSubOpts.find((o) => o.value === sub)?.label ?? sub;
    }
    const pay = String(dayCloseBundledExpensePayField.value ?? "").trim().toUpperCase();
    if (pay !== "REGISTER" && pay !== "PATRON") {
      return {
        line: `${mainLabel}${subLabel ? ` · ${subLabel}` : ""} · ${formatLocaleAmount(amt, locale, currencyWatch)}`,
        incomplete: true as const,
      };
    }
    const payLabel =
      pay === "REGISTER" ? t("branch.expensePayRegister") : t("branch.expensePayPatron");
    const desc = String(dayCloseBundledDescWatch ?? "").trim();
    const base = `${mainLabel}${subLabel ? ` · ${subLabel}` : ""} · ${payLabel} · ${formatLocaleAmount(amt, locale, currencyWatch)}`;
    return { line: desc ? `${base} — ${desc}` : base, incomplete: false as const };
  }, [
    currencyWatch,
    dayCloseBundledAmtWatch,
    dayCloseBundledDescWatch,
    dayCloseBundledExpensePayField.value,
    dayCloseBundledMainField.value,
    dayCloseBundledMainOpts,
    dayCloseBundledSubField.value,
    dayCloseBundledSubOpts,
    locale,
    t,
  ]);

  const dayCloseBundledTableDisplay = useMemo(
    () =>
      dayCloseBundledConfirmedLines.map((line) => {
        const mainRow = TX_MAIN_OUT.find((x) => x.value === line.mainCategory);
        const mainLabel =
          mainRow?.labelKey != null
            ? t(mainRow.labelKey)
            : txCodeLabel(line.mainCategory, t) || line.mainCategory;
        let subLabel = "—";
        if (line.category) {
          const subOpts = txSubOptionsForRegisterExpenseModal(line.mainCategory, t);
          subLabel =
            subOpts.find((o) => o.value === line.category)?.label ??
            txCodeLabel(line.category, t) ??
            line.category;
        } else if (isOutOtherExpenseClassificationMain(line.mainCategory)) {
          subLabel = t("branch.txSubExpOther");
        }
        const payLabel =
          line.paymentSource === "REGISTER"
            ? t("branch.expensePayRegister")
            : t("branch.expensePayPatron");
        return {
          ...line,
          mainLabel,
          subLabel,
          payLabel,
          amountFmt: formatLocaleAmount(line.amount, locale, currencyWatch),
        };
      }),
    [currencyWatch, dayCloseBundledConfirmedLines, locale, t]
  );

  const confirmDayCloseBundledExpense = useCallback(() => {
    if (dayCloseBundledConfirmedLines.length >= DAY_CLOSE_BUNDLED_EXPENSE_MAX) {
      notify.error(t("branch.txDayCloseBundledExpenseMax"));
      return;
    }
    if (!dayCloseBundledExpensePreview || dayCloseBundledExpensePreview.incomplete) {
      notify.error(t("branch.txNotifyIncomplete"));
      return;
    }
    const v = getValues();
    const raw = v.dayCloseBundledExpenseAmount.trim();
    const amt = parseLocaleAmount(raw, locale);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("branch.txAmountInvalid"));
      return;
    }
    const bMain = v.dayCloseBundledExpenseMainCategory.trim();
    if (!bMain || !DAY_CLOSE_BUNDLED_OUT_MAINS.has(bMain)) {
      notify.error(t("branch.txDayCloseBundledExpenseMainRequired"));
      return;
    }
    let bCat: string | null = v.dayCloseBundledExpenseCategory.trim() || null;
    if (txMainNeedsSubCategory("OUT", bMain)) {
      if (!bCat) {
        notify.error(t("branch.txDayCloseBundledExpenseSubRequired"));
        return;
      }
    } else if (isOutOtherExpenseClassificationMain(bMain)) {
      bCat = "EXP_OTHER";
    }
    const bSrc = v.dayCloseBundledExpensePaymentSource.trim().toUpperCase();
    if (bSrc !== "REGISTER" && bSrc !== "PATRON") {
      notify.error(t("branch.txDayCloseBundledExpensePaymentRequired"));
      return;
    }
    const desc = v.dayCloseBundledExpenseDescription.trim() || null;
    setDayCloseBundledConfirmedLines((prev) => [
      ...prev,
      {
        id: newBundledExpenseLineId(),
        amount: amt,
        mainCategory: bMain,
        category: bCat,
        paymentSource: bSrc as "REGISTER" | "PATRON",
        description: desc,
      },
    ]);
    setValue("dayCloseBundledExpenseAmount", "");
    setValue("dayCloseBundledExpenseDescription", "");
  }, [
    dayCloseBundledConfirmedLines.length,
    dayCloseBundledExpensePreview,
    getValues,
    locale,
    setValue,
    t,
  ]);

  const prevBundledDayCloseMain = useRef("");
  useEffect(() => {
    const m = String(dayCloseBundledMainField.value ?? "").trim();
    const prev = prevBundledDayCloseMain.current;
    if (prev === m) return;
    if (prev !== "" && prev !== m) setValue("dayCloseBundledExpenseCategory", "");
    prevBundledDayCloseMain.current = m;
  }, [dayCloseBundledMainField.value, setValue]);

  const expenseMainRoutingHint = useMemo(() => {
    if (personnelLinkedExpenseContext) return null;
    if (txType.trim().toUpperCase() !== "OUT") return null;
    const m = String(mainCategoryWatch ?? "").trim();
    const u = m.toUpperCase();
    if (u === "OUT_GOODS" || u.startsWith("OUT_GOODS_")) return "branch.txRoutingHintOutGoods" as const;
    if (u === "OUT_OPS" || (u.startsWith("OUT_OPS_") && u !== "OUT_OPS_INVOICE"))
      return "branch.txRoutingHintOutOps" as const;
    if (
      (u === "OUT_PERSONNEL" || u.startsWith("OUT_PER_")) &&
      !personnelLinkedExpenseContext &&
      personnelDirectExpenseEntry !== true
    ) {
      return "branch.txRoutingHintOutPersonnel" as const;
    }
    return null;
  }, [txType, mainCategoryWatch, personnelLinkedExpenseContext, personnelDirectExpenseEntry]);

  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    const c = String(categoryWatch ?? "").trim().toUpperCase();
    if (m === "OUT_OPS" && c === "OPS_INVOICE") {
      setValue("category", "");
    }
  }, [mainCategoryWatch, categoryWatch, setValue]);

  const advanceLinkSelectOptions = useMemo(
    () =>
      expenseLinkAdvances.map((r) => ({
        value: `adv:${r.id}`,
        label: `${formatLocaleAmount(r.amount, locale, r.currencyCode)} · ${formatLocaleDate(r.advanceDate, locale)}`,
      })),
    [expenseLinkAdvances, locale]
  );

  const salaryLinkSelectOptions = useMemo(
    () =>
      expenseLinkSalary.map((r) => ({
        value: `sal:${r.id}`,
        label: `${formatLocaleAmount(r.amount, locale, r.currencyCode)} · ${formatLocaleDate(r.paymentDate, locale)}`,
      })),
    [expenseLinkSalary, locale]
  );

  const onSubmit = handleSubmit(async (values) => {
    const cur = values.currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY;
    let amount: number;
    let cashAmount: number | null = null;
    let cardAmount: number | null = null;

    const splitIncome =
      values.type.toUpperCase() === "IN" &&
      (values.amountCash.trim() !== "" || values.amountCard.trim() !== "");

    if (
      values.type.toUpperCase() === "IN" &&
      isPatronCashIncomeMain(values.mainCategory) &&
      splitIncome
    ) {
      notify.error(t("branch.txPatronCashNoSplit"));
      return;
    }

    if (splitIncome) {
      const c = parseLocaleAmount(values.amountCash, locale);
      const k = parseLocaleAmount(values.amountCard, locale);
      if (!Number.isFinite(c) || c < 0 || !Number.isFinite(k) || k < 0) {
        notify.error(t("branch.txSplitIncomplete"));
        return;
      }
      amount = c + k;
      if (amount <= 0) {
        notify.error(t("branch.txAmountInvalid"));
        return;
      }
      cashAmount = c;
      cardAmount = k;
    } else {
      amount = parseLocaleAmount(values.amount, locale);
      if (!Number.isFinite(amount) || amount <= 0) {
        notify.error(t("branch.txAmountInvalid"));
        return;
      }
    }

    const registerDayCloseSubmit = isRegisterDayCloseIncomeRow(
      values.type,
      values.mainCategory,
      values.category
    );
    const hasCashPortion = cashAmount != null && cashAmount > 0;
    let cashSettlementParty: string | null = null;
    if (registerDayCloseSubmit || hasCashPortion) {
      const p = values.cashSettlementParty.trim();
      cashSettlementParty = p ? p.toUpperCase() : null;
    }

    let cashSettlementPersonnelId: number | undefined;
    if (cashSettlementParty === "BRANCH_MANAGER") {
      const sp = values.cashSettlementPersonnelId.trim();
      const n = parseInt(sp, 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txNotifyIncomplete"));
        return;
      }
      cashSettlementPersonnelId = n;
    }

    let categoryOut: string | null = values.category.trim() || null;
    if (values.type.toUpperCase() === "OUT" && isOutOtherExpenseClassificationMain(values.mainCategory))
      categoryOut = "EXP_OTHER";
    if (values.type.toUpperCase() === "OUT" && isPersonnelPocketRepayClassificationMain(values.mainCategory)) {
      categoryOut =
        values.mainCategory.trim().toUpperCase() === "OUT_POCKET_REPAY" ? null : "POCKET_REPAY";
    }
    if (values.type.toUpperCase() === "OUT" && isPatronDebtRepayClassificationMain(values.mainCategory))
      categoryOut = "PATRON_DEBT_REPAY";
    if (values.type.toUpperCase() === "OUT" && isNonPnlMemoClassificationMain(values.mainCategory)) {
      categoryOut =
        values.mainCategory.trim().toUpperCase() === "MEMO_NON_PNL"
          ? null
          : "NON_PNL_MEMO";
    }
    if (values.type.toUpperCase() === "IN") {
      const mm = values.mainCategory.trim().toUpperCase();
      if (mm === "IN_DAY_CLOSE") categoryOut = null;
      else if (mm === "IN_PATRON") categoryOut = "PATRON_CASH";
      else if (mm === "IN_PATRON_CASH") categoryOut = null;
    }

    const mc = values.mainCategory.trim();
    const sc = outPersonnelCategoryEffective(mc, categoryOut).toUpperCase();
    const isInvRow = branchTxFormIsSupplierInvoiceLine({
      type: values.type,
      mainCategory: mc,
      category: values.category.trim(),
    });
    const invStatusRaw = values.invoicePaymentStatus.trim().toUpperCase();
    if (isInvRow && invStatusRaw !== "UNPAID" && invStatusRaw !== "PAID") {
      notify.error(t("branch.txNotifyIncomplete"));
      return;
    }

    const mainTrimEarly = values.mainCategory.trim();
    const expensePaymentSource =
      values.type.toUpperCase() === "OUT" &&
      !isNonPnlMemoClassificationMain(mainTrimEarly) &&
      !isPocketClaimTransferClassificationMain(mainTrimEarly)
        ? values.expensePaymentSource.trim()
          ? values.expensePaymentSource.trim().toUpperCase()
          : null
        : null;

    const effExpensePay =
      isInvRow && invStatusRaw === "UNPAID" ? null : expensePaymentSource;

    const allowsCashHandoverSettle =
      values.type.toUpperCase() === "OUT" &&
      effExpensePay != null &&
      (effExpensePay === "REGISTER" || effExpensePay === "PATRON") &&
      !isPersonnelPocketRepayClassificationMain(mainTrimEarly) &&
      !isPocketClaimTransferClassificationMain(mainTrimEarly) &&
      (!isPatronDebtRepayClassificationMain(mainTrimEarly) || effExpensePay === "REGISTER") &&
      !isNonPnlMemoClassificationMain(mainTrimEarly) &&
      !(isInvRow && invStatusRaw === "UNPAID");

    let settlesCashHandoverTransactionId: number | undefined;
    const settlesRaw = values.settlesCashHandoverTransactionId.trim();
    if (settlesRaw !== "") {
      const sid = parseInt(settlesRaw, 10);
      if (!Number.isFinite(sid) || sid <= 0) {
        notify.error(t("branch.txSettlesCashHandoverInvalid"));
        return;
      }
      if (!allowsCashHandoverSettle) {
        notify.error(t("branch.txSettlesCashHandoverNotAllowed"));
        return;
      }
      settlesCashHandoverTransactionId = sid;
    }

    let expensePocketPersonnelId: number | undefined;
    if (
      values.type.toUpperCase() === "OUT" &&
      isPersonnelPocketRepayClassificationMain(values.mainCategory)
    ) {
      const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txExpensePocketPersonnelRequired"));
        return;
      }
      expensePocketPersonnelId = n;
    } else if (
      values.type.toUpperCase() === "OUT" &&
      (effExpensePay === "PERSONNEL_POCKET" || effExpensePay === "PERSONNEL_HELD_REGISTER_CASH")
    ) {
      const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txExpensePocketPersonnelRequired"));
        return;
      }
      expensePocketPersonnelId = n;
    } else if (values.type.toUpperCase() === "OUT" && isPocketClaimTransferClassificationMain(mainTrimEarly)) {
      const catXfer = (values.category ?? "").trim().toUpperCase();
      const toPatronXfer =
        catXfer === "POCKET_CLAIM_TRANSFER_TO_PATRON" ||
        mainTrimEarly.toUpperCase() === "OUT_POCKET_CLAIM_TO_PATRON";
      if (!toPatronXfer) {
        const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
        if (!Number.isFinite(n) || n <= 0) {
          notify.error(t("branch.txExpensePocketPersonnelRequired"));
          return;
        }
        expensePocketPersonnelId = n;
      }
    }

    const receiptFile =
      values.type.toUpperCase() === "OUT"
        ? receiptPhotoRef.current?.files?.[0] ?? null
        : null;

    if (receiptFile) {
      const v = await validateImageFileForUpload(receiptFile);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }

    if (isInvRow && (!receiptFile || receiptFile.size <= 0)) {
      notify.error(t("branch.invoiceReceiptPhotoRequired"));
      return;
    }

    const pickBranchSubmit = parseInt(String(values.personnelExpenseBranchId ?? "").trim(), 10);
    const branchForTx =
      propBranchId != null && propBranchId > 0
        ? propBranchId
        : personnelExpenseFlow &&
            Number.isFinite(pickBranchSubmit) &&
            pickBranchSubmit > 0
          ? pickBranchSubmit
          : null;
    const effBranchId =
      branchForTx != null && branchForTx > 0 ? branchForTx : undefined;

    if (
      (effExpensePay === "REGISTER" || effExpensePay === "PERSONNEL_HELD_REGISTER_CASH") &&
      values.type.toUpperCase() === "OUT" &&
      (effBranchId == null || effBranchId <= 0)
    ) {
      notify.error(t("branch.txRegisterPaymentNeedBranch"));
      return;
    }

    if (
      isPocketClaimTransferClassificationMain(mc) &&
      (effBranchId == null || effBranchId <= 0)
    ) {
      notify.error(t("branch.txPocketClaimTransferNeedBranch"));
      return;
    }

    const reqExpenseAdvance =
      values.type.toUpperCase() === "OUT" &&
      isOutPersonnelClassificationMain(mc) &&
      sc === "PER_ADVANCE";
    const reqExpenseSalary =
      values.type.toUpperCase() === "OUT" &&
      isOutPersonnelClassificationMain(mc) &&
      (sc === "PER_SALARY" || sc === "PER_BONUS");

    if (mc.toUpperCase() === "OUT_PERSONNEL_POCKET_REPAY") {
      if (pocketRepaySettlement.ids.length === 0) {
        notify.error(t("branch.pocketRepayPickRequired"));
        return;
      }
      if (!pocketRepaySettlement.currencyOk) {
        notify.error(t("branch.pocketPriorCurrencyMismatch"));
        return;
      }
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        Math.abs(amount - pocketRepaySettlement.sum) > 0.009
      ) {
        notify.error(t("branch.pocketRepayAmountMismatch"));
        return;
      }
    }

    const linkFinancialPid = parseInt(values.expenseLinkPersonnelId.trim(), 10);
    if (
      (reqExpenseAdvance || reqExpenseSalary) &&
      (!Number.isFinite(linkFinancialPid) || linkFinancialPid <= 0)
    ) {
      notify.error(t("branch.txExpenseLinkPersonnelRequired"));
      return;
    }

    const advanceMode = values.advanceExpenseMode.trim() || "existing";
    if (reqExpenseAdvance && advanceMode === "new_register") {
      const yStr = values.effectiveYear.trim();
      let effY = parseInt(yStr, 10);
      if (!Number.isFinite(effY) || effY < 1990 || effY > 2100) {
        const ymd = values.transactionDate.slice(0, 10);
        effY = /^\d{4}/.test(ymd) ? parseInt(ymd.slice(0, 4), 10) : new Date().getFullYear();
      }
      if (effBranchId == null || effBranchId <= 0) {
        notify.error(t("branch.txAdvanceNeedBranch"));
        return;
      }
      let createdAdvanceId: number;
      try {
        const adv = await createAdvanceMut.mutateAsync({
          personnelId: linkFinancialPid,
          branchId: effBranchId,
          sourceType: "CASH",
          amount,
          currencyCode: cur,
          advanceDate: values.transactionDate,
          effectiveYear: effY,
          description: values.description.trim() || null,
        });
        createdAdvanceId = adv.id;
      } catch (e) {
        notify.error(toErrorMessage(e));
        return;
      }
      try {
        await createTx.mutateAsync({
          branchId: effBranchId,
          type: values.type,
          mainCategory: values.mainCategory.trim() || null,
          category: categoryOut,
          amount,
          cashAmount,
          cardAmount,
          currencyCode: cur,
          transactionDate: values.transactionDate,
          description: values.description.trim() || null,
          cashSettlementParty,
          cashSettlementPersonnelId,
          ...(registerDayCloseSubmit && cashSettlementParty === "PATRON"
            ? { applyPatronDebtRepayFromDayClose: values.applyPatronDebtRepayFromDayClose }
            : {}),
          expensePaymentSource: effExpensePay,
          ...(expensePocketPersonnelId != null && expensePocketPersonnelId > 0
            ? { expensePocketPersonnelId }
            : {}),
          ...(isInvRow ? { invoicePaymentStatus: invStatusRaw } : {}),
          receiptPhoto: receiptFile,
          linkedAdvanceId: createdAdvanceId,
          ...(linkFinancialPid > 0 ? { linkedFinancialPersonnelId: linkFinancialPid } : {}),
        });
        notify.success(t("toast.branchTxCreated"));
        onClose();
      } catch (e) {
        if (!tryTourismSeasonClosedRedirect(e, effBranchId)) {
          notify.error(
            `${t("branch.txAdvanceCreatedRegisterFailed")} ${toErrorMessage(e)}`
          );
        }
      }
      return;
    }

    let linkedAdvanceId: number | undefined;
    let linkedSalaryPaymentId: number | undefined;
    const linkRaw = values.expenseFinancialLink.trim();
    if (linkRaw.startsWith("adv:")) {
      const n = parseInt(linkRaw.slice(4), 10);
      if (Number.isFinite(n) && n > 0) linkedAdvanceId = n;
    } else if (linkRaw.startsWith("sal:")) {
      const n = parseInt(linkRaw.slice(4), 10);
      if (Number.isFinite(n) && n > 0) linkedSalaryPaymentId = n;
    }
    if (
      reqExpenseAdvance &&
      advanceMode === "existing" &&
      (linkedAdvanceId == null || linkedAdvanceId <= 0)
    ) {
      notify.error(t("branch.txExpenseLinkRequired"));
      return;
    }
    if (reqExpenseSalary && (linkedSalaryPaymentId == null || linkedSalaryPaymentId <= 0)) {
      notify.error(t("branch.txExpenseLinkRequired"));
      return;
    }

    let linkedPersonnelIdOut: number | undefined;
    if (isPocketClaimTransferClassificationMain(mc)) {
      const fromN = parseInt(values.pocketClaimFromPersonnelId.trim(), 10);
      if (!Number.isFinite(fromN) || fromN <= 0) {
        notify.error(t("branch.txPocketClaimTransferFromRequired"));
        return;
      }
      const catXfer = (values.category ?? "").trim().toUpperCase();
      const toPatronXfer =
        catXfer === "POCKET_CLAIM_TRANSFER_TO_PATRON" ||
        mc.toUpperCase() === "OUT_POCKET_CLAIM_TO_PATRON";
      if (
        !toPatronXfer &&
        expensePocketPersonnelId != null &&
        fromN === expensePocketPersonnelId
      ) {
        notify.error(t("branch.txPocketClaimTransferSamePerson"));
        return;
      }
      linkedPersonnelIdOut = fromN;
    } else if (
      isOutPersonnelClassificationMain(mc) &&
      !outPersonnelSubcategoryNeedsFinancialLink(sc) &&
      personnelExpenseFlow
    ) {
      const lp =
        defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0
          ? defaultLinkedPersonnelId
          : linkFinancialPid > 0
            ? linkFinancialPid
            : 0;
      if (lp <= 0) {
        notify.error(t("branch.txOrgPerOtherNeedPersonnel"));
        return;
      }
      linkedPersonnelIdOut = lp;
    }

    const dayCloseBundledExpensePayloads: {
      amount: number;
      mainCategory: string;
      category: string | null;
      paymentSource: string;
      description: string | null;
    }[] = [];
    if (registerDayCloseSubmit) {
      const draftRaw = values.dayCloseBundledExpenseAmount.trim();
      if (dayCloseBundledExpenseOpen && draftRaw !== "") {
        notify.error(t("branch.txDayCloseBundledExpenseDraftNotConfirmed"));
        return;
      }
      for (const row of dayCloseBundledConfirmedLines) {
        if (!DAY_CLOSE_BUNDLED_OUT_MAINS.has(row.mainCategory)) {
          notify.error(t("branch.txDayCloseBundledExpenseMainRequired"));
          return;
        }
        const src = row.paymentSource.trim().toUpperCase();
        if (src !== "REGISTER" && src !== "PATRON") {
          notify.error(t("branch.txDayCloseBundledExpensePaymentRequired"));
          return;
        }
        dayCloseBundledExpensePayloads.push({
          amount: row.amount,
          mainCategory: row.mainCategory,
          category: row.category,
          paymentSource: src,
          description: row.description,
        });
      }
      if (dayCloseBundledExpensePayloads.length > 0) {
        if (effBranchId == null || effBranchId <= 0) {
          notify.error(t("branch.txRegisterPaymentNeedBranch"));
          return;
        }
      }
    }

    try {
      await createTx.mutateAsync({
        branchId: effBranchId,
        type: values.type,
        mainCategory: values.mainCategory.trim() || null,
        category: categoryOut,
        amount,
        cashAmount,
        cardAmount,
        currencyCode: cur,
        transactionDate: values.transactionDate,
        description: values.description.trim() || null,
        cashSettlementParty,
        cashSettlementPersonnelId,
        ...(registerDayCloseSubmit && cashSettlementParty === "PATRON"
          ? { applyPatronDebtRepayFromDayClose: values.applyPatronDebtRepayFromDayClose }
          : {}),
        expensePaymentSource: effExpensePay,
        ...(expensePocketPersonnelId != null && expensePocketPersonnelId > 0
          ? { expensePocketPersonnelId }
          : {}),
        ...(isInvRow ? { invoicePaymentStatus: invStatusRaw } : {}),
        receiptPhoto: receiptFile,
        ...(linkedAdvanceId != null && linkedAdvanceId > 0 ? { linkedAdvanceId } : {}),
        ...(linkedSalaryPaymentId != null && linkedSalaryPaymentId > 0
          ? { linkedSalaryPaymentId }
          : {}),
        ...((reqExpenseSalary ||
          (reqExpenseAdvance && advanceMode === "existing")) &&
        linkFinancialPid > 0
          ? { linkedFinancialPersonnelId: linkFinancialPid }
          : {}),
        ...(mc.toUpperCase() === "OUT_PERSONNEL_POCKET_REPAY"
          ? { linkedPocketExpenseTransactionIds: [...pocketRepaySettlement.ids] }
          : {}),
        ...(linkedPersonnelIdOut != null && linkedPersonnelIdOut > 0
          ? { linkedPersonnelId: linkedPersonnelIdOut }
          : {}),
        ...(settlesCashHandoverTransactionId != null
          ? { settlesCashHandoverTransactionId }
          : {}),
      });
      for (const pl of dayCloseBundledExpensePayloads) {
        try {
          await createTx.mutateAsync({
            branchId: effBranchId,
            type: "OUT",
            mainCategory: pl.mainCategory,
            category: pl.category,
            amount: pl.amount,
            currencyCode: cur,
            transactionDate: values.transactionDate,
            description: pl.description,
            expensePaymentSource: pl.paymentSource,
          });
        } catch (be) {
          if (!tryTourismSeasonClosedRedirect(be, effBranchId)) {
            notify.error(
              `${t("branch.txDayCloseBundledExpenseFailedAfterIncome")} ${toErrorMessage(be)}`
            );
          }
        }
      }
      notify.success(t("toast.branchTxCreated"));
      onClose();
    } catch (e) {
      if (!tryTourismSeasonClosedRedirect(e, effBranchId)) {
        notify.error(toErrorMessage(e));
      }
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={
        propBranchId == null && resolvedBranchId == null
          ? t("branch.txOrgModalTitle")
          : t("branch.txModalTitle")
      }
      description={
        propBranchId == null && resolvedBranchId == null
          ? t("branch.txOrgModalHintShort")
          : t("branch.txModalHintShort")
      }
      closeButtonLabel={t("common.close")}
      wide
      wideFixedHeight
      className="!p-0"
    >
      <form
        className="mt-2 flex min-h-0 min-w-0 flex-1 touch-manipulation flex-col sm:mt-4"
        onSubmit={onSubmit}
      >
        <div
          className={cn(
            "min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:space-y-4 sm:px-6"
          )}
        >
          <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{t("branch.txModalHintDetail")}</p>
          {txType.trim().toUpperCase() === "OUT" ? (
            personnelExpenseFlow ? (
              <BranchExpenseRoutingCallout variant="personnel-only" />
            ) : (
              <BranchExpenseRoutingCallout variant="full" />
            )
          ) : null}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3">
            <div className="min-w-0 lg:col-span-2">
              <Select
                label={t("branch.txType")}
                labelRequired
                options={
                  orgMode || personnelExpenseFlow
                    ? [{ value: "OUT", label: t("branch.txTypeOut") }]
                    : [
                        { value: "IN", label: t("branch.txTypeIn") },
                        { value: "OUT", label: t("branch.txTypeOut") },
                      ]
                }
                name={typeField.name}
                value={String(typeField.value ?? "IN")}
                onChange={(e) => typeField.onChange(e.target.value)}
                onBlur={typeField.onBlur}
                ref={typeField.ref}
                disabled={orgMode || personnelExpenseFlow}
                error={errors.type?.message}
              />
            </div>
            {personnelExpenseFlow &&
            personnelLinkedExpenseContext &&
            defaultLinkedPersonnelId != null &&
            defaultLinkedPersonnelId > 0 ? (
              <div className="min-w-0 lg:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
                <p className="text-xs font-medium text-zinc-500">
                  {t("branch.txExpenseLinkPersonnelLabel")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {prefilledLinkedPersonnelLabel}
                </p>
              </div>
            ) : null}
            {!personnelExpenseFlow ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.txMainCategory")}
                  labelRequired
                  options={mainOpts}
                  name={mainField.name}
                  value={String(mainField.value ?? "")}
                  onChange={(e) => mainField.onChange(e.target.value)}
                  onBlur={mainField.onBlur}
                  ref={mainField.ref}
                  error={errors.mainCategory?.message}
                />
              </div>
            ) : null}
            {expenseMainRoutingHint ? (
              <div className="min-w-0 lg:col-span-2">
                <p className="rounded-lg border border-amber-200/75 bg-amber-50/55 px-3 py-2 text-xs leading-relaxed text-amber-950 sm:text-sm">
                  {t(expenseMainRoutingHint)}
                </p>
              </div>
            ) : null}
            {needsSubCategory ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.txSubCategory")}
                  labelRequired
                  options={subOpts}
                  name={categoryField.name}
                  value={String(categoryField.value ?? "")}
                  onChange={(e) => categoryField.onChange(e.target.value)}
                  onBlur={categoryField.onBlur}
                  ref={categoryField.ref}
                  disabled={!mainCategoryWatch}
                  error={errors.category?.message}
                />
              </div>
            ) : null}
            {isInvoiceOpsLine ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.invoicePaymentStatusLabel")}
                  labelRequired
                  options={[
                    { value: "", label: t("branch.txSelectPlaceholder") },
                    { value: "UNPAID", label: t("branch.invoicePaymentUnpaid") },
                    { value: "PAID", label: t("branch.invoicePaymentPaid") },
                  ]}
                  name={invoicePaymentField.name}
                  value={String(invoicePaymentField.value ?? "")}
                  onChange={(e) => invoicePaymentField.onChange(e.target.value)}
                  onBlur={invoicePaymentField.onBlur}
                  ref={invoicePaymentField.ref}
                  error={errors.invoicePaymentStatus?.message}
                />
              </div>
            ) : null}
            {patronCashIncomeMainActive ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-balance text-amber-950 sm:col-span-2 sm:text-sm">
                {t("branch.txPatronCashIncomeHint")}
              </p>
            ) : null}
            {isNonPnlMemoMain ? (
              <p className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-xs leading-relaxed text-balance text-sky-950 sm:col-span-2 sm:text-sm">
                {t("branch.txNonPnlModalHint")}
              </p>
            ) : null}
            {needsExpenseFinancialPersonnelPick && !personnelLinkedExpenseContext ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.txExpenseLinkPersonnelLabel")}
                  labelRequired
                  options={expenseLinkStaffOptions}
                  name={expenseLinkPersonnelField.name}
                  value={String(expenseLinkPersonnelField.value ?? "")}
                  onChange={(e) => expenseLinkPersonnelField.onChange(e.target.value)}
                  onBlur={expenseLinkPersonnelField.onBlur}
                  ref={expenseLinkPersonnelField.ref}
                />
                {expenseLinkStaffOptions.length <= 1 ? (
                  <p className="mt-1 text-xs text-amber-800">{t("branch.cashSettlementResponsibleEmpty")}</p>
                ) : null}
              </div>
            ) : null}
            {needsDirectPersonnelPickForPersonnelExpense ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.txExpenseLinkPersonnelLabel")}
                  labelRequired
                  options={expenseLinkStaffOptions}
                  name={expenseLinkPersonnelField.name}
                  value={String(expenseLinkPersonnelField.value ?? "")}
                  onChange={(e) => expenseLinkPersonnelField.onChange(e.target.value)}
                  onBlur={expenseLinkPersonnelField.onBlur}
                  ref={expenseLinkPersonnelField.ref}
                />
                {expenseLinkStaffOptions.length <= 1 ? (
                  <p className="mt-1 text-xs text-amber-800">{t("branch.cashSettlementResponsibleEmpty")}</p>
                ) : null}
              </div>
            ) : null}
            {needsExpenseAdvancePick ? (
              <>
                <div className="min-w-0 lg:col-span-2">
                  <Select
                    label={t("branch.txAdvanceModeLabel")}
                    options={
                      useOrgExpenseLinks
                        ? [{ value: "existing", label: t("branch.txAdvanceModeExisting") }]
                        : [
                            { value: "existing", label: t("branch.txAdvanceModeExisting") },
                            { value: "new_register", label: t("branch.txAdvanceModeNew") },
                          ]
                    }
                    name={advanceExpenseModeField.name}
                    value={String(advanceExpenseModeField.value ?? "existing")}
                    onChange={(e) => advanceExpenseModeField.onChange(e.target.value)}
                    onBlur={advanceExpenseModeField.onBlur}
                    ref={advanceExpenseModeField.ref}
                  />
                </div>
                {needsExpenseAdvanceExisting ? (
                  <div className="min-w-0 lg:col-span-2">
                    <Select
                      label={t("branch.txExpenseLinkAdvance")}
                      labelRequired
                      options={[
                        { value: "", label: t("branch.txExpenseLinkPick") },
                        ...advanceLinkSelectOptions,
                      ]}
                      name={expenseFinancialLinkField.name}
                      value={String(expenseFinancialLinkField.value ?? "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        expenseFinancialLinkField.onChange(v);
                        if (v.startsWith("adv:")) {
                          const id = parseInt(v.slice(4), 10);
                          const row = expenseLinkAdvances.find((x) => x.id === id);
                          if (row) {
                            setValue(
                              "amount",
                              formatLocaleAmount(row.amount, locale, row.currencyCode)
                            );
                            setValue("currencyCode", row.currencyCode);
                          }
                        }
                      }}
                      onBlur={expenseFinancialLinkField.onBlur}
                      ref={expenseFinancialLinkField.ref}
                      disabled={
                        expenseLinkPidNum <= 0 ||
                        (expenseLinkAdvFetching && advanceLinkSelectOptions.length === 0)
                      }
                    />
                    {expenseLinkAdvFetching ? (
                      <p className="mt-1 text-xs text-zinc-500">{t("common.loading")}</p>
                    ) : null}
                    {!expenseLinkAdvFetching && advanceLinkSelectOptions.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-800">
                        {expenseLinkPidNum <= 0
                          ? t("branch.txExpenseLinkPickPersonnelFirst")
                          : t("branch.txExpenseLinkEmpty")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {needsExpenseAdvanceNewRegister ? (
                  <div className="min-w-0 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 lg:col-span-2">
                    <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                      {t("branch.txAdvanceNewHint")}
                    </p>
                    <Input
                      label={t("branch.txAdvanceEffectiveYear")}
                      type="number"
                      inputMode="numeric"
                      min={1990}
                      max={2100}
                      autoComplete="off"
                      name={regEffectiveYear.name}
                      ref={regEffectiveYear.ref}
                      onChange={regEffectiveYear.onChange}
                      onBlur={regEffectiveYear.onBlur}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            {needsExpenseSalaryPick ? (
              <div className="min-w-0 lg:col-span-2">
                <Select
                  label={t("branch.txExpenseLinkSalary")}
                  labelRequired
                  options={[
                    { value: "", label: t("branch.txExpenseLinkPick") },
                    ...salaryLinkSelectOptions,
                  ]}
                  name={expenseFinancialLinkField.name}
                  value={String(expenseFinancialLinkField.value ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    expenseFinancialLinkField.onChange(v);
                    if (v.startsWith("sal:")) {
                      const id = parseInt(v.slice(4), 10);
                      const row = expenseLinkSalary.find((x) => x.id === id);
                      if (row) {
                        setValue(
                          "amount",
                          formatLocaleAmount(row.amount, locale, row.currencyCode)
                        );
                        setValue("currencyCode", row.currencyCode);
                      }
                    }
                  }}
                  onBlur={expenseFinancialLinkField.onBlur}
                  ref={expenseFinancialLinkField.ref}
                  disabled={
                    expenseLinkPidNum <= 0 ||
                    (expenseLinkSalaryFetching && salaryLinkSelectOptions.length === 0)
                  }
                />
                {expenseLinkSalaryFetching ? (
                  <p className="mt-1 text-xs text-zinc-500">{t("common.loading")}</p>
                ) : null}
                {!expenseLinkSalaryFetching && salaryLinkSelectOptions.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-800">
                    {expenseLinkPidNum <= 0
                      ? t("branch.txExpenseLinkPickPersonnelFirst")
                      : t("branch.txExpenseLinkEmpty")}
                  </p>
                ) : null}
              </div>
            ) : null}
            {txType.toUpperCase() === "IN" ? (
              <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs leading-relaxed text-balance text-emerald-950 break-words lg:col-span-2 sm:text-sm">
                {t("branch.txStoryIncomeCallout")}
              </p>
            ) : (
              <p className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2.5 text-xs leading-relaxed text-balance text-red-950 break-words lg:col-span-2 sm:text-sm">
                {t("branch.txStoryExpenseCallout")}
              </p>
            )}
            <div className="min-w-0">
              <Select
                label={t("branch.txCurrency")}
                labelRequired
                options={currencyOptions}
                name={currencyField.name}
                value={String(currencyField.value ?? DEFAULT_CURRENCY)}
                onChange={(e) => currencyField.onChange(e.target.value)}
                onBlur={currencyField.onBlur}
                ref={currencyField.ref}
                error={errors.currencyCode?.message}
                disabled={financialAmountLocked && !isPocketRepaySettlementUmbrellaMain}
              />
            </div>
            <div className="min-w-0">
              <DateField
                ref={transactionDateField.ref}
                label={t("branch.txDateField")}
                labelRequired
                mode="datetime-local"
                name={transactionDateField.name}
                value={transactionDateField.value}
                onChange={transactionDateField.onChange}
                onBlur={transactionDateField.onBlur}
                error={transactionDateFieldState.error?.message}
              />
            </div>
            {txType.toUpperCase() === "IN" && !patronCashIncomeMainActive ? (
              <>
                <p className="text-xs text-zinc-500 lg:col-span-2">{t("branch.txAmountSplitHint")}</p>
                <div className="min-w-0">
                  <Input
                    label={t("branch.txAmountCash")}
                    inputMode="decimal"
                    autoComplete="off"
                    name={regCash.name}
                    ref={regCash.ref}
                    onChange={regCash.onChange}
                    onBlur={(e) => {
                      regCash.onBlur(e);
                      const n = parseLocaleAmount(e.target.value, locale);
                      if (Number.isFinite(n) && n >= 0) {
                        setValue(
                          "amountCash",
                          formatLocaleAmount(n, locale, currencyWatch)
                        );
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label={t("branch.txAmountCard")}
                    inputMode="decimal"
                    autoComplete="off"
                    name={regCard.name}
                    ref={regCard.ref}
                    onChange={regCard.onChange}
                    onBlur={(e) => {
                      regCard.onBlur(e);
                      const n = parseLocaleAmount(e.target.value, locale);
                      if (Number.isFinite(n) && n >= 0) {
                        setValue(
                          "amountCard",
                          formatLocaleAmount(n, locale, currencyWatch)
                        );
                      }
                    }}
                  />
                </div>
                {incomeSplitActive && splitTotal != null ? (
                  <p className="text-sm font-medium text-zinc-800 lg:col-span-2">
                    {t("branch.txAmount")}:{" "}
                    {formatLocaleAmount(splitTotal, locale, currencyWatch)}
                  </p>
                ) : null}
              </>
            ) : null}
            {!incomeSplitActive ? (
              <div className="min-w-0 lg:col-span-2">
                <Input
                  label={t("branch.txAmount")}
                  labelRequired
                  inputMode="decimal"
                  autoComplete="off"
                  readOnly={financialAmountLocked}
                  name={amountField.name}
                  value={amountField.value}
                  onChange={(e) => amountField.onChange(e.target.value)}
                  onBlur={(e) => {
                    if (financialAmountLocked) {
                      amountField.onBlur();
                      return;
                    }
                    const n = parseLocaleAmount(e.target.value, locale);
                    if (Number.isFinite(n) && n > 0) {
                      amountField.onChange(
                        formatLocaleAmount(n, locale, currencyField.value)
                      );
                    }
                    amountField.onBlur();
                  }}
                  ref={amountField.ref}
                  error={errors.amount?.message}
                />
                {financialAmountLocked ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {isPocketRepaySettlementUmbrellaMain
                      ? t("branch.pocketRepayAmountFromSelectionHint")
                      : t("branch.txAmountLockedHint")}
                  </p>
                ) : null}
              </div>
            ) : null}
            {showCashSettlement ? (
              <>
                <p className="text-xs leading-relaxed text-zinc-600 lg:col-span-2">
                  {registerDayClose
                    ? t("branch.txRegisterDayCloseHint")
                    : t("branch.cashSettlementHintSplit")}
                </p>
                <div className="min-w-0 lg:col-span-2">
                  <Select
                    label={t("branch.cashSettlementLabel")}
                    options={[
                      { value: "", label: t("branch.cashSettlementUnset") },
                      { value: "PATRON", label: t("branch.cashSettlementPatron") },
                      { value: "BRANCH_MANAGER", label: t("branch.cashSettlementBranchManager") },
                      { value: "REMAINS_AT_BRANCH", label: t("branch.cashSettlementRemainsAtBranch") },
                    ]}
                    name={cashSettlementField.name}
                    value={String(cashSettlementField.value ?? "")}
                    onChange={(e) => cashSettlementField.onChange(e.target.value)}
                    onBlur={cashSettlementField.onBlur}
                    ref={cashSettlementField.ref}
                  />
                </div>
                {registerDayClose &&
                String(cashPartyWatch ?? "").trim().toUpperCase() === "PATRON" ? (
                  <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 lg:col-span-2">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
                        {...register("applyPatronDebtRepayFromDayClose")}
                      />
                      <span className="text-sm font-medium text-zinc-800">
                        {t("branch.txDayClosePatronDebtRepayToggle")}
                      </span>
                    </label>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                      {t("branch.txDayClosePatronAutoDebtHint")}
                    </p>
                  </div>
                ) : null}
                {String(cashPartyWatch ?? "").trim().toUpperCase() === "BRANCH_MANAGER" ? (
                  <>
                    <div className="min-w-0 lg:col-span-2">
                      <Select
                        label={t("branch.cashSettlementResponsiblePerson")}
                        labelRequired
                        options={cashSettlementResponsibleOptions}
                        name={settlementPersonnelField.name}
                        value={String(settlementPersonnelField.value ?? "")}
                        onChange={(e) => settlementPersonnelField.onChange(e.target.value)}
                        onBlur={settlementPersonnelField.onBlur}
                        ref={settlementPersonnelField.ref}
                        error={errors.cashSettlementPersonnelId?.message}
                      />
                    </div>
                    {cashSettlementResponsibleOptions.length <= 1 ? (
                      <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
                        {t("branch.cashSettlementResponsibleEmptyGlobal")}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {registerDayClose && !orgMode ? (
              <div className="min-w-0 space-y-3 rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/90 to-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/[0.03] sm:px-4 sm:py-4 lg:col-span-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {t("branch.txDayCloseOptionalExpenseTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                    {t("branch.txDayCloseOptionalExpenseHint")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dayCloseBundledExpenseOpen}
                  aria-label={t("branch.txDayCloseBundledExpenseCheckbox")}
                  onClick={() => {
                    const on = !dayCloseBundledExpenseOpen;
                    setDayCloseBundledExpenseOpen(on);
                    if (on) {
                      setValue("dayCloseBundledExpenseMainCategory", "OUT_OPS");
                      setValue("dayCloseBundledExpenseCategory", "OPS_OTHER");
                      setValue("dayCloseBundledExpensePaymentSource", "REGISTER");
                    } else {
                      setDayCloseBundledConfirmedLines([]);
                      setValue("dayCloseBundledExpenseAmount", "");
                      setValue("dayCloseBundledExpenseMainCategory", "");
                      setValue("dayCloseBundledExpenseCategory", "");
                      setValue("dayCloseBundledExpenseDescription", "");
                      setValue("dayCloseBundledExpensePaymentSource", "");
                    }
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition sm:px-3.5 sm:py-3.5",
                    dayCloseBundledExpenseOpen
                      ? "border-emerald-200/90 bg-emerald-50/40 shadow-sm"
                      : "border-zinc-200 bg-white/90 hover:border-zinc-300"
                  )}
                >
                  <span className="min-w-0 flex-1 pr-2">
                    <span className="block text-sm font-medium text-zinc-900">
                      {t("branch.txDayCloseBundledExpenseCheckbox")}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-600">
                      {t("branch.txDayCloseBundledExpenseCheckboxHint")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-7 w-[2.75rem] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
                      dayCloseBundledExpenseOpen ? "justify-end bg-emerald-600" : "justify-start bg-zinc-300"
                    )}
                  >
                    <span className="pointer-events-none size-6 rounded-full bg-white shadow-md ring-1 ring-zinc-950/10" />
                  </span>
                </button>
                {dayCloseBundledExpenseOpen && dayCloseBundledTableDisplay.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("branch.txDayCloseBundledExpenseListTitle")}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm">
                      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/95 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                            <th className="px-2 py-2.5 pl-3 sm:px-3">
                              {t("branch.txDayCloseBundledExpenseTableType")}
                            </th>
                            <th className="px-2 py-2.5 sm:px-3">
                              {t("branch.txDayCloseBundledExpenseTableSub")}
                            </th>
                            <th className="px-2 py-2.5 sm:px-3">
                              {t("branch.txDayCloseBundledExpenseTablePay")}
                            </th>
                            <th className="px-2 py-2.5 text-right sm:px-3">
                              {t("branch.txDayCloseBundledExpenseTableAmount")}
                            </th>
                            <th className="hidden min-w-[6rem] px-2 py-2.5 lg:table-cell lg:px-3">
                              {t("branch.txDayCloseBundledExpenseTableNote")}
                            </th>
                            <th className="w-10 px-2 py-2.5 pr-3 text-right sm:px-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {dayCloseBundledTableDisplay.map((row) => (
                            <tr key={row.id} className="align-top text-zinc-800">
                              <td className="px-2 py-2.5 pl-3 font-medium sm:px-3">
                                {row.mainLabel}
                              </td>
                              <td className="px-2 py-2.5 text-zinc-600 sm:px-3">{row.subLabel}</td>
                              <td className="px-2 py-2.5 text-zinc-600 sm:px-3">{row.payLabel}</td>
                              <td className="px-2 py-2.5 text-right font-semibold tabular-nums sm:px-3">
                                {row.amountFmt}
                              </td>
                              <td className="hidden max-w-[10rem] truncate px-2 py-2.5 text-xs text-zinc-500 lg:table-cell lg:px-3">
                                {row.description ?? "—"}
                              </td>
                              <td className="px-2 py-2 pr-3 sm:px-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 min-w-0 shrink-0 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                                  onClick={() =>
                                    setDayCloseBundledConfirmedLines((prev) =>
                                      prev.filter((x) => x.id !== row.id)
                                    )
                                  }
                                >
                                  {t("branch.txDayCloseBundledExpenseRemove")}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                {dayCloseBundledExpenseOpen &&
                dayCloseBundledConfirmedLines.length >= DAY_CLOSE_BUNDLED_EXPENSE_MAX ? (
                  <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-950">
                    {t("branch.txDayCloseBundledExpenseMax")}
                  </p>
                ) : null}
                {dayCloseBundledExpenseOpen &&
                dayCloseBundledConfirmedLines.length < DAY_CLOSE_BUNDLED_EXPENSE_MAX ? (
                  <div className="space-y-3 border-t border-zinc-200/80 pt-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 sm:col-span-2">
                        <Input
                          label={t("branch.txDayCloseOptionalExpenseAmount")}
                          inputMode="decimal"
                          autoComplete="off"
                          {...register("dayCloseBundledExpenseAmount")}
                        />
                      </div>
                      <div
                        className={cn(
                          "min-w-0",
                          !bundledDayCloseNeedsSubCategory ? "sm:col-span-2" : ""
                        )}
                      >
                        <Select
                          label={t("branch.txDayCloseBundledExpenseMainLabel")}
                          labelRequired
                          options={dayCloseBundledMainOpts}
                          name={dayCloseBundledMainField.name}
                          value={String(dayCloseBundledMainField.value ?? "")}
                          onChange={(e) => dayCloseBundledMainField.onChange(e.target.value)}
                          onBlur={dayCloseBundledMainField.onBlur}
                          ref={dayCloseBundledMainField.ref}
                        />
                      </div>
                      {bundledDayCloseNeedsSubCategory ? (
                        <div className="min-w-0">
                          <Select
                            label={t("branch.txDayCloseBundledExpenseSubLabel")}
                            labelRequired
                            options={dayCloseBundledSubOpts}
                            name={dayCloseBundledSubField.name}
                            value={String(dayCloseBundledSubField.value ?? "")}
                            onChange={(e) => dayCloseBundledSubField.onChange(e.target.value)}
                            onBlur={dayCloseBundledSubField.onBlur}
                            ref={dayCloseBundledSubField.ref}
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 sm:col-span-2">
                        <Input
                          label={t("branch.txDayCloseOptionalExpenseDescription")}
                          {...register("dayCloseBundledExpenseDescription")}
                        />
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <Select
                          label={t("branch.expensePaymentLabel")}
                          labelRequired
                          options={[
                            { value: "", label: t("branch.expensePaymentUnset") },
                            { value: "REGISTER", label: t("branch.expensePayRegister") },
                            { value: "PATRON", label: t("branch.expensePayPatron") },
                          ]}
                          name={dayCloseBundledExpensePayField.name}
                          value={String(dayCloseBundledExpensePayField.value ?? "")}
                          onChange={(e) => dayCloseBundledExpensePayField.onChange(e.target.value)}
                          onBlur={dayCloseBundledExpensePayField.onBlur}
                          ref={dayCloseBundledExpensePayField.ref}
                        />
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                          {t("branch.txDayCloseBundledExpensePaymentHint")}
                        </p>
                      </div>
                    </div>
                    {dayCloseBundledExpensePreview?.incomplete ? (
                      <p className="text-xs text-amber-900/90">
                        {t("branch.txDayCloseBundledExpensePreviewIncomplete")}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={
                        !dayCloseBundledExpensePreview ||
                        dayCloseBundledExpensePreview.incomplete ||
                        dayCloseBundledConfirmedLines.length >= DAY_CLOSE_BUNDLED_EXPENSE_MAX
                      }
                      onClick={confirmDayCloseBundledExpense}
                    >
                      {t("branch.txDayCloseBundledExpenseConfirm")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            !isNonPnlMemoMain &&
            !isPocketClaimTransferMain &&
            !isInvoiceUnpaid ? (
              <div className="min-w-0 lg:col-span-2">
                {personnelExpenseFlow &&
                (propBranchId == null || propBranchId <= 0) ? (
                  <div className="mb-3 min-w-0">
                    <Select
                      label={t("branch.txPersonnelExpenseBranchLabel")}
                      options={personnelExpenseBranchOptions}
                      name={personnelExpenseBranchField.name}
                      value={String(personnelExpenseBranchField.value ?? "")}
                      onChange={(e) => personnelExpenseBranchField.onChange(e.target.value)}
                      onBlur={personnelExpenseBranchField.onBlur}
                      ref={personnelExpenseBranchField.ref}
                      error={errors.personnelExpenseBranchId?.message}
                    />
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {t("branch.txPersonnelExpenseBranchHint")}
                    </p>
                  </div>
                ) : null}
                {isPatronDebtRepayMain ? (
                  <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                    {t("branch.txPatronDebtRepayModalHint")}
                  </p>
                ) : isPocketRepayMain ? (
                  <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                    {t("branch.txPocketRepayModalHint")}
                  </p>
                ) : personnelExpenseFlow &&
                  (propBranchId == null || propBranchId <= 0) ? (
                  <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                    {resolvedBranchId != null && resolvedBranchId > 0
                      ? t("branch.txPersonnelExpensePaymentHintWithBranch")
                      : t("branch.txPersonnelExpensePaymentHintNoBranch")}
                  </p>
                ) : (
                  <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                    {t("branch.expensePaymentHint")}
                  </p>
                )}
                <Select
                  label={t("branch.expensePaymentLabel")}
                  labelRequired
                  options={expensePaymentSelectOptions}
                  name={expensePayField.name}
                  value={String(expensePayField.value ?? "")}
                  onChange={(e) => expensePayField.onChange(e.target.value)}
                  onBlur={expensePayField.onBlur}
                  ref={expensePayField.ref}
                  error={errors.expensePaymentSource?.message}
                />
                {cashHandoverSettleFieldVisible ? (
                  <div className="mt-3 min-w-0">
                    <label
                      htmlFor="branch-tx-settles-handover-id"
                      className="mb-1 block text-sm font-medium text-zinc-700"
                    >
                      {t("branch.txSettlesCashHandoverLabel")}
                    </label>
                    <input
                      id="branch-tx-settles-handover-id"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      {...register("settlesCashHandoverTransactionId")}
                    />
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {t("branch.txSettlesCashHandoverHint")}
                    </p>
                  </div>
                ) : null}
                {String(expensePayWatch ?? "").trim().toUpperCase() === "PERSONNEL_POCKET" ? (
                  <>
                    <div className="min-w-0 lg:col-span-2">
                      <Select
                        label={t("branch.expensePocketPersonLabel")}
                        labelRequired
                        options={cashSettlementResponsibleOptions}
                        name={expensePocketPersonnelField.name}
                        value={String(expensePocketPersonnelField.value ?? "")}
                        onChange={(e) => expensePocketPersonnelField.onChange(e.target.value)}
                        onBlur={expensePocketPersonnelField.onBlur}
                        ref={expensePocketPersonnelField.ref}
                        error={errors.expensePocketPersonnelId?.message}
                      />
                    </div>
                    {cashSettlementResponsibleOptions.length <= 1 ? (
                      <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
                        {t("branch.cashSettlementResponsibleEmpty")}
                      </p>
                    ) : null}
                  </>
                ) : String(expensePayWatch ?? "").trim().toUpperCase() === "PERSONNEL_HELD_REGISTER_CASH" ? (
                  <>
                    <div className="min-w-0 lg:col-span-2">
                      <Select
                        label={t("branch.expenseHeldRegisterPersonLabel")}
                        labelRequired
                        options={heldRegisterPersonOptions}
                        name={expensePocketPersonnelField.name}
                        value={String(expensePocketPersonnelField.value ?? "")}
                        onChange={(e) => expensePocketPersonnelField.onChange(e.target.value)}
                        onBlur={expensePocketPersonnelField.onBlur}
                        ref={expensePocketPersonnelField.ref}
                        error={errors.expensePocketPersonnelId?.message}
                        disabled={heldRegisterCashLoading}
                      />
                    </div>
                    {heldRegisterCashLoading ? (
                      <p className="text-xs leading-relaxed text-zinc-500 lg:col-span-2">
                        {t("branch.expenseHeldRegisterPersonPickerLoading")}
                      </p>
                    ) : heldRegisterPersonOptions.length <= 1 ? (
                      <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
                        {!asOfDateYmd
                          ? t("branch.expenseHeldRegisterPersonPickerNeedDate")
                          : t("branch.expenseHeldRegisterPersonPickerEmpty")}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {isPocketRepaySettlementUmbrellaMain &&
                (String(expensePayWatch ?? "").trim().toUpperCase() === "REGISTER" ||
                  String(expensePayWatch ?? "").trim().toUpperCase() === "PATRON") ? (
                  <>
                    <div className="mt-2 min-w-0 lg:col-span-2">
                      <Select
                        label={t("branch.expensePocketRepayPersonLabel")}
                        labelRequired
                        options={branchStaffOptions}
                        name={expensePocketPersonnelField.name}
                        value={String(expensePocketPersonnelField.value ?? "")}
                        onChange={(e) => expensePocketPersonnelField.onChange(e.target.value)}
                        onBlur={expensePocketPersonnelField.onBlur}
                        ref={expensePocketPersonnelField.ref}
                        error={errors.expensePocketPersonnelId?.message}
                      />
                    </div>
                    {branchStaffOptions.length <= 1 ? (
                      <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
                        {t("branch.cashSettlementResponsibleEmpty")}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {isPocketRepaySettlementUmbrellaMain &&
                (String(expensePayWatch ?? "").trim().toUpperCase() === "REGISTER" ||
                  String(expensePayWatch ?? "").trim().toUpperCase() === "PATRON") &&
                expensePocketRepayPidNum > 0 ? (
                  <div className="mt-2 min-w-0 lg:col-span-2">
                    <PersonnelPocketPriorLinesPicker
                      branchId={resolvedBranchId ?? 0}
                      personnelId={expensePocketRepayPidNum}
                      enabled={
                        open &&
                        isPocketRepaySettlementUmbrellaMain &&
                        expensePocketRepayPidNum > 0
                      }
                      excludeSettledPocketExpenses={true}
                      locale={locale}
                      t={t}
                      formCurrencyCode={String(currencyWatch ?? DEFAULT_CURRENCY)}
                      onSettlementChange={handlePocketRepaySettlementChange}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            isPocketClaimTransferMain &&
            resolvedBranchId != null &&
            resolvedBranchId > 0 ? (
              <div className="min-w-0 space-y-3 lg:col-span-2">
                <p className="text-xs leading-relaxed text-zinc-600">
                  {t("branch.txPocketClaimTransferModalHint")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label={t("branch.txPocketClaimTransferFromLabel")}
                    labelRequired
                    options={branchStaffOptions}
                    name={pocketClaimFromPersonnelField.name}
                    value={String(pocketClaimFromPersonnelField.value ?? "")}
                    onChange={(e) => pocketClaimFromPersonnelField.onChange(e.target.value)}
                    onBlur={pocketClaimFromPersonnelField.onBlur}
                    ref={pocketClaimFromPersonnelField.ref}
                    error={errors.pocketClaimFromPersonnelId?.message}
                  />
                  {subCat !== "POCKET_CLAIM_TRANSFER_TO_PATRON" ? (
                    <Select
                      label={t("branch.txPocketClaimTransferToLabel")}
                      labelRequired
                      options={branchStaffOptions}
                      name={expensePocketPersonnelField.name}
                      value={String(expensePocketPersonnelField.value ?? "")}
                      onChange={(e) => expensePocketPersonnelField.onChange(e.target.value)}
                      onBlur={expensePocketPersonnelField.onBlur}
                      ref={expensePocketPersonnelField.ref}
                      error={errors.expensePocketPersonnelId?.message}
                    />
                  ) : null}
                </div>
                {branchStaffOptions.length <= 1 ? (
                  <p className="text-xs leading-relaxed text-amber-900">
                    {t("branch.cashSettlementResponsibleEmpty")}
                  </p>
                ) : null}
              </div>
            ) : null}
            {txType.toUpperCase() === "OUT" ? (
              <div className="min-w-0 lg:col-span-2">
                <label
                  htmlFor="branch-tx-receipt-photo"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  {isInvoiceOpsLine
                    ? t("branch.receiptPhotoRequiredWhenInvoice")
                    : t("branch.receiptPhotoOptional")}
                </label>
                <input
                  id="branch-tx-receipt-photo"
                  ref={receiptPhotoRef}
                  name="branch-tx-receipt-photo"
                  type="file"
                  accept={IMAGE_FILE_INPUT_ACCEPT}
                  className="block w-full min-w-0 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                  onChange={async (e) => {
                    const input = e.target;
                    const f = input.files?.[0] ?? null;
                    if (!f) {
                      setReceiptPhotoPick(null);
                      return;
                    }
                    const v = await validateImageFileForUpload(f);
                    if (!v.ok) {
                      input.value = "";
                      setReceiptPhotoPick(null);
                      notify.error(
                        v.reason === "size"
                          ? t("common.imageUploadTooLarge")
                          : t("common.imageUploadNotImage")
                      );
                      return;
                    }
                    setReceiptPhotoPick(f);
                  }}
                />
                <LocalImageFileThumb file={receiptPhotoPick} />
              </div>
            ) : null}
            <div className="min-w-0 lg:col-span-2">
              <Input label={t("branch.txDescription")} {...register("description")} />
            </div>
          </div>
        </div>
        <div className="mt-2 shrink-0 border-t border-zinc-100 bg-white pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:mt-3 sm:pb-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full min-w-0 sm:min-w-[120px] sm:w-auto"
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="min-h-12 w-full min-w-0 sm:min-w-[120px] sm:w-auto"
              disabled={createTx.isPending || createAdvanceMut.isPending}
            >
              {createTx.isPending || createAdvanceMut.isPending
                ? t("common.saving")
                : t("common.save")}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
