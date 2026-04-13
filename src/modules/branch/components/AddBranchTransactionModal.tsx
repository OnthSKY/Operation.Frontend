"use client";

import { useI18n } from "@/i18n/context";
import {
  fetchBranchExpenseLinkAdvances,
  fetchBranchExpenseLinkSalaryPayments,
  fetchPersonnelOrgExpenseLinkAdvances,
  fetchPersonnelOrgExpenseLinkSalaryPayments,
} from "@/modules/branch/api/branches-api";
import {
  useBranchesList,
  useCreateBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  useCreateAdvance,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { BranchExpenseRoutingCallout } from "@/modules/branch/components/BranchExpenseRoutingCallout";
import {
  buildExpensePaymentSelectOptions,
  orderBranchExpenseMainOptions,
  outPersonnelSubcategoryNeedsFinancialLink,
  txMainNeedsSubCategory,
  txMainOptions,
  txSubOptions,
  txSubOptionsForRegisterExpenseModal,
} from "@/modules/branch/lib/branch-transaction-options";
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
import {
  resolveLocalizedApiError,
  userCanManageTourismSeasonClosedPolicy,
} from "@/shared/lib/resolve-localized-api-error";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

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
  /** Yeni avans (kasadan) için sezon yılı varsayılanı — boşsa takvim yılı. */
  defaultEffectiveYear?: number;
  /**
   * Personel maliyetleri «personel gideri gir»: merkez modunda yalnız OUT_PERSONNEL + modalda personel seçimi
   * (şube gider ana kategorileri listelenmez).
   */
  personnelDirectExpenseEntry?: boolean;
};

const TITLE_ID = "branch-tx-title";

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
      if (id == null) return false;
      notifyErrorWithAction({
        message: resolveLocalizedApiError(e, t, {
          canManageTourismSeasonClosedPolicy: canManageTourismPolicy,
        }),
        actionLabel: t("branch.tourismSeasonClosedOpenTab"),
        autoCloseMs: 10_000,
        onAction: () => {
          onClose();
          router.push(`/branches?openBranch=${id}&branchTab=tourismSeason`);
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
  const { data: allPersonnel = [] } = usePersonnelList(open);
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
      invoicePaymentStatus: "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId: "",
      advanceExpenseMode: "existing",
      effectiveYear: "",
      personnelExpenseBranchId: "",
      applyPatronDebtRepayFromDayClose: true,
    },
  });

  const [pocketRepaySettlement, setPocketRepaySettlement] = useState<{
    ids: number[];
    sum: number;
    currencyOk: boolean;
  }>({ ids: [], sum: 0, currencyOk: true });

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const txType = useWatch({ control, name: "type" });
  const mainCategoryWatch = useWatch({ control, name: "mainCategory" });
  const categoryWatch = useWatch({ control, name: "category" });
  const invoicePaymentWatch = useWatch({ control, name: "invoicePaymentStatus" });
  const isInvoiceOpsLine = useMemo(
    () =>
      txType.trim().toUpperCase() === "OUT" &&
      String(mainCategoryWatch ?? "").trim() === "OUT_OPS" &&
      String(categoryWatch ?? "").trim().toUpperCase() === "OPS_INVOICE",
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
    const pocketRepayPrefill =
      !orgMode &&
      defaultPocketRepayPersonnelId != null &&
      defaultPocketRepayPersonnelId > 0;
    const personnelExpensePrefill =
      defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0;
    const personnelCostsDirectEntry =
      orgMode && personnelDirectExpenseEntry === true;
    const nextType = personnelExpensePrefill || personnelCostsDirectEntry
      ? "OUT"
      : orgMode
        ? "OUT"
        : pocketRepayPrefill
          ? "OUT"
          : (defaultType ?? "IN");
    const repayCur = (defaultPocketRepayCurrencyCode ?? "").trim().toUpperCase();
    const currencyForReset =
      pocketRepayPrefill && /^[A-Z]{3}$/.test(repayCur) ? repayCur : DEFAULT_CURRENCY;
    const dayClosePrefill =
      !orgMode &&
      !pocketRepayPrefill &&
      !personnelExpensePrefill &&
      !personnelCostsDirectEntry &&
      (defaultType ?? "IN") === "IN" &&
      String(defaultMainCategory ?? "").trim().toUpperCase() === "IN_DAY_CLOSE";
    reset({
      type: nextType,
      mainCategory: pocketRepayPrefill
        ? "OUT_PERSONNEL_POCKET_REPAY"
        : personnelExpensePrefill || personnelCostsDirectEntry
          ? "OUT_PERSONNEL"
          : dayClosePrefill
            ? "IN_DAY_CLOSE"
            : "",
      category: pocketRepayPrefill ? "POCKET_REPAY" : "",
      amount: "",
      amountCash: "",
      amountCard: "",
      currencyCode: currencyForReset,
      transactionDate: defaultDateTimeFromInput(defaultTransactionDate),
      description: "",
      cashSettlementParty: "",
      cashSettlementPersonnelId: "",
      expensePaymentSource: pocketRepayPrefill ? "REGISTER" : "",
      expensePocketPersonnelId: pocketRepayPrefill
        ? String(defaultPocketRepayPersonnelId)
        : "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId: personnelExpensePrefill
        ? String(defaultLinkedPersonnelId)
        : "",
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
    });
    setPocketRepaySettlement({ ids: [], sum: 0, currencyOk: true });
    prevType.current = nextType;
    prevMain.current = pocketRepayPrefill
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
    defaultPocketRepayPersonnelId,
    defaultPocketRepayCurrencyCode,
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
      setValue("expenseFinancialLink", "");
      setValue("expenseLinkPersonnelId", "");
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
      setValue("applyPatronDebtRepayFromDayClose", true);
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
      setValue("invoicePaymentStatus", "");
      setValue("expenseFinancialLink", "");
      setValue("expenseLinkPersonnelId", "");
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
      setValue("applyPatronDebtRepayFromDayClose", true);
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
    const ty = txType.toUpperCase();
    const m = String(mainCategoryWatch ?? "").trim();
    if (ty === "OUT" && m === "OUT_OTHER") setValue("category", "EXP_OTHER");
    if (ty === "OUT" && m === "OUT_PERSONNEL_POCKET_REPAY") setValue("category", "POCKET_REPAY");
    if (ty === "OUT" && m === "OUT_PATRON_DEBT_REPAY") setValue("category", "PATRON_DEBT_REPAY");
    if (ty === "OUT" && m === "OUT_NON_PNL") setValue("category", "NON_PNL_MEMO");
    if (ty === "IN" && m === "IN_DAY_CLOSE") setValue("category", "");
    if (ty === "IN" && m === "IN_PATRON") {
      setValue("category", "PATRON_CASH");
      setValue("amountCash", "");
      setValue("amountCard", "");
    }
  }, [txType, mainCategoryWatch, setValue]);

  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    if (txType.toUpperCase() === "OUT" && m === "OUT_PATRON_DEBT_REPAY") {
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
    txType.toUpperCase() === "OUT" && mainCat === "OUT_PERSONNEL_POCKET_REPAY";
  const isPatronDebtRepayMain =
    txType.toUpperCase() === "OUT" && mainCat === "OUT_PATRON_DEBT_REPAY";
  const isNonPnlMemoMain =
    txType.toUpperCase() === "OUT" && mainCat === "OUT_NON_PNL";
  const subCat = String(categoryWatch ?? "").trim().toUpperCase();
  const needsExpenseAdvancePick =
    txType.toUpperCase() === "OUT" && mainCat === "OUT_PERSONNEL" && subCat === "PER_ADVANCE";
  const needsExpenseSalaryPick =
    txType.toUpperCase() === "OUT" &&
    mainCat === "OUT_PERSONNEL" &&
    (subCat === "PER_SALARY" || subCat === "PER_BONUS");
  const needsExpenseFinancialPersonnelPick =
    needsExpenseAdvancePick || needsExpenseSalaryPick;

  const needsDirectPersonnelPickForPersonnelExpense = useMemo(() => {
    if (!personnelExpenseFlow || personnelLinkedExpenseContext) return false;
    if (txType.trim().toUpperCase() !== "OUT") return false;
    if (mainCat !== "OUT_PERSONNEL") return false;
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
    if (isPocketRepayMain) return true;
    const link = String(expenseFinancialLinkWatch ?? "").trim();
    if (needsExpenseSalaryPick && link.startsWith("sal:")) return true;
    if (needsExpenseAdvanceExisting && link.startsWith("adv:")) return true;
    return false;
  }, [
    isPocketRepayMain,
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
        const catI = (String(getValues("category") ?? "").trim() || "").toUpperCase();
        const inv = (String(getValues("invoicePaymentStatus") ?? "").trim() || "").toUpperCase();
        if (main === "OUT_OPS" && catI === "OPS_INVOICE" && inv === "UNPAID") return true;
        if (!main.toUpperCase().startsWith("OUT_")) return true;
        if (main === "OUT_NON_PNL") return true;
        if (main === "OUT_PATRON_DEBT_REPAY") {
          return String(v ?? "").trim().toUpperCase() === "REGISTER" ? true : reqVal;
        }
        if (main === "OUT_PERSONNEL_POCKET_REPAY") {
          const u = String(v ?? "").trim().toUpperCase();
          return u === "REGISTER" || u === "PATRON" ? true : reqVal;
        }
        if (main === "OUT_PERSONNEL" && String(v ?? "").trim().toUpperCase() === "PERSONNEL_POCKET")
          return reqVal;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const expensePayWatch = useWatch({ control, name: "expensePaymentSource" });

  useEffect(() => {
    void trigger("personnelExpenseBranchId");
  }, [expensePayWatch, resolvedBranchId, trigger]);

  useEffect(() => {
    if (resolvedBranchId != null && resolvedBranchId > 0) return;
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (pay !== "REGISTER") return;
    setValue("expensePaymentSource", "");
  }, [resolvedBranchId, expensePayWatch, setValue]);

  const expensePocketPersonnelWatch = useWatch({ control, name: "expensePocketPersonnelId" });
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
        if (main === "OUT_NON_PNL") return true;
        if (main === "OUT_PATRON_DEBT_REPAY") return true;
        if (main === "OUT_PERSONNEL_POCKET_REPAY") {
          if (pay !== "REGISTER" && pay !== "PATRON") return true;
          return String(v ?? "").trim() ? true : reqVal;
        }
        if (main === "OUT_PERSONNEL") return true;
        if (String(expensePayWatch ?? "").trim().toUpperCase() !== "PERSONNEL_POCKET")
          return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const amountCashWatch = useWatch({ control, name: "amountCash" });
  const amountCardWatch = useWatch({ control, name: "amountCard" });
  const currencyWatch = useWatch({ control, name: "currencyCode" });

  const isPatronCashIncomeMain =
    txType.toUpperCase() === "IN" &&
    String(mainCategoryWatch ?? "").trim() === "IN_PATRON";

  const incomeSplitActive =
    txType.toUpperCase() === "IN" &&
    !isPatronCashIncomeMain &&
    (String(amountCashWatch ?? "").trim() !== "" ||
      String(amountCardWatch ?? "").trim() !== "");

  const registerDayClose =
    txType.toUpperCase() === "IN" &&
    (mainCategoryWatch === "IN_DAY_CLOSE" ||
      (mainCategoryWatch === "IN_OTHER" && categoryWatch === "INC_REGISTER"));

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
    const main = String(mainCategoryWatch ?? "").trim().toUpperCase();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (main !== "OUT_PERSONNEL" || pay !== "PERSONNEL_POCKET") return;
    setValue("expensePaymentSource", "");
    setValue("expensePocketPersonnelId", "");
  }, [mainCategoryWatch, expensePayWatch, setValue]);

  useEffect(() => {
    const main = String(mainCategoryWatch ?? "").trim();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (main === "OUT_NON_PNL") {
      setValue("expensePaymentSource", "");
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (main === "OUT_PATRON_DEBT_REPAY") {
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (main === "OUT_PERSONNEL_POCKET_REPAY" && pay === "PERSONNEL_POCKET") {
      setValue("expensePaymentSource", "");
      return;
    }
    if (main === "OUT_PERSONNEL_POCKET_REPAY") return;
    if (pay !== "PERSONNEL_POCKET") setValue("expensePocketPersonnelId", "");
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
        t,
      }),
    [
      resolvedBranchId,
      mainCategoryWatch,
      categoryWatch,
      isNonPnlMemoMain,
      isPatronDebtRepayMain,
      isPocketRepayMain,
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
    if (personnelExpenseFlow && ty === "OUT") {
      return base.filter((o) => o.value === "OUT_PERSONNEL");
    }
    if (orgMode) {
      const filtered = base.filter(
        (o) =>
          o.value !== "OUT_PERSONNEL_POCKET_REPAY" &&
          o.value !== "OUT_PATRON_DEBT_REPAY" &&
          o.value !== "OUT_NON_PNL"
      );
      if (ty === "OUT") return orderBranchExpenseMainOptions(filtered);
      return filtered;
    }
    if (ty === "OUT") return orderBranchExpenseMainOptions(base);
    return base;
  }, [txType, t, orgMode, personnelExpenseFlow]);
  const subOpts = useMemo(() => {
    const ty = txType.trim().toUpperCase();
    if (ty === "OUT") {
      return txSubOptionsForRegisterExpenseModal(String(mainCategoryWatch ?? ""), t);
    }
    return txSubOptions(mainCategoryWatch, t);
  }, [txType, mainCategoryWatch, t]);

  const expenseMainRoutingHint = useMemo(() => {
    if (personnelLinkedExpenseContext) return null;
    if (txType.trim().toUpperCase() !== "OUT") return null;
    const m = String(mainCategoryWatch ?? "").trim();
    if (m === "OUT_GOODS") return "branch.txRoutingHintOutGoods" as const;
    if (m === "OUT_OPS") return "branch.txRoutingHintOutOps" as const;
    if (
      m === "OUT_PERSONNEL" &&
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
      values.mainCategory.trim() === "IN_PATRON" &&
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

    const registerDayCloseSubmit =
      values.type.toUpperCase() === "IN" &&
      (values.mainCategory === "IN_DAY_CLOSE" ||
        (values.mainCategory === "IN_OTHER" && values.category === "INC_REGISTER"));
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
    if (values.type.toUpperCase() === "OUT" && values.mainCategory === "OUT_OTHER")
      categoryOut = "EXP_OTHER";
    if (values.type.toUpperCase() === "OUT" && values.mainCategory === "OUT_PERSONNEL_POCKET_REPAY")
      categoryOut = "POCKET_REPAY";
    if (values.type.toUpperCase() === "OUT" && values.mainCategory === "OUT_PATRON_DEBT_REPAY")
      categoryOut = "PATRON_DEBT_REPAY";
    if (values.type.toUpperCase() === "OUT" && values.mainCategory.trim() === "OUT_NON_PNL")
      categoryOut = "NON_PNL_MEMO";
    if (values.type.toUpperCase() === "IN" && values.mainCategory === "IN_DAY_CLOSE")
      categoryOut = null;
    if (values.type.toUpperCase() === "IN" && values.mainCategory.trim() === "IN_PATRON")
      categoryOut = "PATRON_CASH";

    const mc = values.mainCategory.trim();
    const sc = (categoryOut ?? (values.category.trim() || "")).toUpperCase();
    const isInvRow = values.type.toUpperCase() === "OUT" && mc === "OUT_OPS" && sc === "OPS_INVOICE";
    const invStatusRaw = values.invoicePaymentStatus.trim().toUpperCase();
    if (isInvRow && invStatusRaw !== "UNPAID" && invStatusRaw !== "PAID") {
      notify.error(t("branch.txNotifyIncomplete"));
      return;
    }

    const mainTrimEarly = values.mainCategory.trim();
    const expensePaymentSource =
      values.type.toUpperCase() === "OUT" && mainTrimEarly !== "OUT_NON_PNL"
        ? values.expensePaymentSource.trim()
          ? values.expensePaymentSource.trim().toUpperCase()
          : null
        : null;

    const effExpensePay =
      isInvRow && invStatusRaw === "UNPAID" ? null : expensePaymentSource;

    let expensePocketPersonnelId: number | undefined;
    if (
      values.type.toUpperCase() === "OUT" &&
      values.mainCategory.trim() === "OUT_PERSONNEL_POCKET_REPAY"
    ) {
      const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txExpensePocketPersonnelRequired"));
        return;
      }
      expensePocketPersonnelId = n;
    } else if (values.type.toUpperCase() === "OUT" && effExpensePay === "PERSONNEL_POCKET") {
      const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txExpensePocketPersonnelRequired"));
        return;
      }
      expensePocketPersonnelId = n;
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
      effExpensePay === "REGISTER" &&
      values.type.toUpperCase() === "OUT" &&
      (effBranchId == null || effBranchId <= 0)
    ) {
      notify.error(t("branch.txRegisterPaymentNeedBranch"));
      return;
    }

    const reqExpenseAdvance =
      values.type.toUpperCase() === "OUT" && mc === "OUT_PERSONNEL" && sc === "PER_ADVANCE";
    const reqExpenseSalary =
      values.type.toUpperCase() === "OUT" &&
      mc === "OUT_PERSONNEL" &&
      (sc === "PER_SALARY" || sc === "PER_BONUS");

    if (mc === "OUT_PERSONNEL_POCKET_REPAY") {
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
    if (
      mc === "OUT_PERSONNEL" &&
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
        ...(mc === "OUT_PERSONNEL_POCKET_REPAY"
          ? { linkedPocketExpenseTransactionIds: [...pocketRepaySettlement.ids] }
          : {}),
        ...(linkedPersonnelIdOut != null && linkedPersonnelIdOut > 0
          ? { linkedPersonnelId: linkedPersonnelIdOut }
          : {}),
      });
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
            {isPatronCashIncomeMain ? (
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
                disabled={financialAmountLocked && !isPocketRepayMain}
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
            {txType.toUpperCase() === "IN" && !isPatronCashIncomeMain ? (
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
                    {isPocketRepayMain
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
                        options={branchStaffOptions}
                        name={settlementPersonnelField.name}
                        value={String(settlementPersonnelField.value ?? "")}
                        onChange={(e) => settlementPersonnelField.onChange(e.target.value)}
                        onBlur={settlementPersonnelField.onBlur}
                        ref={settlementPersonnelField.ref}
                        error={errors.cashSettlementPersonnelId?.message}
                      />
                    </div>
                    {branchStaffOptions.length <= 1 ? (
                      <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
                        {t("branch.cashSettlementResponsibleEmpty")}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            !isNonPnlMemoMain &&
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
                {String(expensePayWatch ?? "").trim().toUpperCase() === "PERSONNEL_POCKET" ? (
                  <>
                    <div className="min-w-0 lg:col-span-2">
                      <Select
                        label={t("branch.expensePocketPersonLabel")}
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
                {isPocketRepayMain &&
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
                {isPocketRepayMain &&
                (String(expensePayWatch ?? "").trim().toUpperCase() === "REGISTER" ||
                  String(expensePayWatch ?? "").trim().toUpperCase() === "PATRON") &&
                expensePocketRepayPidNum > 0 ? (
                  <div className="mt-2 min-w-0 lg:col-span-2">
                    <PersonnelPocketPriorLinesPicker
                      branchId={resolvedBranchId ?? 0}
                      personnelId={expensePocketRepayPidNum}
                      enabled={
                        open && isPocketRepayMain && expensePocketRepayPidNum > 0
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
