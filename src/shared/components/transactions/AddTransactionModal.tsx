"use client";

import { useI18n } from "@/i18n/context";
import {
  useBranchRegisterSummary,
  useBranchesList,
  useCreateBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  defaultPersonnelListFilters,
  useCreateAdvance,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  branchTxFormIsSupplierInvoiceLine,
  buildExpensePaymentSelectOptions,
  isNonPnlMemoClassificationMain,
  isOutPersonnelClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
  isRegisterDayCloseIncomeRow,
  outPersonnelCategoryEffective,
  outPersonnelSubcategoryNeedsFinancialLink,
  txMainNeedsSubCategory,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { defaultDateTimeFromInput } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { notifyErrorWithAction } from "@/shared/lib/notify-error-with-action";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { Button } from "@/shared/ui/Button";
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
import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { BRANCH_API_ERROR_TOURISM_SEASON_CLOSED_FOR_REGISTER } from "@/modules/branch/lib/branch-api-error-codes";
import {
  resolveLocalizedApiError,
  userCanManageTourismSeasonClosedPolicy,
} from "@/shared/lib/resolve-localized-api-error";
import {
  buildBranchDetailHref,
  useBranchDetailOverlayOptional,
} from "@/shared/branch-detail";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

/** useQuery `data` yokken `?? []` kullanmayın — her render yeni dizi → useEffect sonsuz döngü. */

import type {
  TxFormValues as FormValues,
  TxModalProps as Props,
} from "./lib/tx-form-types";
import {
  TX_TITLE_ID as TITLE_ID,
  DAY_CLOSE_BUNDLED_OUT_MAINS,
  DAY_CLOSE_BUNDLED_EXPENSE_MAX,
} from "./lib/tx-form-constants";
import { buildTxFormDefaults } from "./lib/tx-form-defaults";
import {
  buildDayCloseBundledMainOptions,
  buildTxMainOptions,
  buildTxSubOptions,
} from "./lib/tx-category-options";
import {
  buildAdvanceLinkSelectOptions,
  buildSalaryLinkSelectOptions,
} from "./lib/tx-financial-link-options";
import { buildHeldRegisterPersonOptions } from "./lib/tx-personnel-options";
import {
  buildBranchSelectOptions,
  buildPersonnelOptions,
} from "./lib/tx-staff-options";
import { useDayCloseBundle } from "./hooks/useDayCloseBundle";
import { useDayCloseBundlePreview } from "./hooks/useDayCloseBundlePreview";
import { usePocketRepaySettlement } from "./hooks/usePocketRepaySettlement";
import { useTxAmountState } from "./hooks/useTxAmountState";
import { useTxCategorySync } from "./hooks/useTxCategorySync";
import { useTxClassificationFlags } from "./hooks/useTxClassificationFlags";
import { useTxExpensePaymentSync } from "./hooks/useTxExpensePaymentSync";
import { useTxFinancialLinkSync } from "./hooks/useTxFinancialLinkSync";
import { useTxMiscSync } from "./hooks/useTxMiscSync";
import { useTxDynamicTitle } from "./hooks/useTxDynamicTitle";
import { useTxInvoiceSync } from "./hooks/useTxInvoiceSync";
import { useTxOpenReset } from "./hooks/useTxOpenReset";
import { useTxResetOnChange } from "./hooks/useTxResetOnChange";
import { useTxSubmit } from "./hooks/useTxSubmit";
import { useExpenseLinkOptions } from "./hooks/useExpenseLinkOptions";
import { useHeldRegisterCashRows } from "./hooks/useHeldRegisterCashRows";
import { AmountCurrencyDateRow } from "./sections/AmountCurrencyDateRow";
import { AmountSplitFields } from "./sections/AmountSplitFields";
import { CashSettlementSection } from "./sections/CashSettlementSection";
import { DayCloseBundledExpensesPanel } from "./sections/DayCloseBundledExpensesPanel";
import { ExpenseFinancialLinkSection } from "./sections/ExpenseFinancialLinkSection";
import { ExpenseLinkPersonnelPicker } from "./sections/ExpenseLinkPersonnelPicker";
import { ExpensePaymentSection } from "./sections/ExpensePaymentSection";
import { InvoicePaymentStatusField } from "./sections/InvoicePaymentStatusField";
import { MainAndSubCategorySelects } from "./sections/MainAndSubCategorySelects";
import { PocketClaimTransferSection } from "./sections/PocketClaimTransferSection";
import { PersonnelExpenseTargetBranchSection } from "./sections/PersonnelExpenseTargetBranchSection";
import { ReceiptPhotoField } from "./sections/ReceiptPhotoField";
import { TxCalloutHints, TxFormIntro, TxStoryCallout } from "./sections/TxFormCallouts";
import { TxContextCards } from "./sections/TxContextCards";
import { DayCloseHeroBanner } from "./sections/DayCloseHeroBanner";
import { PersonnelExpenseHeroBanner } from "./sections/PersonnelExpenseHeroBanner";
import { TxModalFooter } from "./sections/TxModalFooter";
import { TxTypeSelector } from "./sections/TxTypeSelector";

export function AddTransactionModal({
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
  heldRegisterAggregateBranchIds,
}: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const branchDetailOverlay = useBranchDetailOverlayOptional();
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
          if (branchDetailOverlay) {
            branchDetailOverlay.openBranchDetail(id, { initialTab: "tourismSeason" });
          } else {
            void router.push(buildBranchDetailHref(id, { tab: "tourismSeason" }));
          }
        },
      });
      return true;
    },
    [onClose, branchDetailOverlay, router, t, canManageTourismPolicy]
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
    formState: { errors, isDirty },
    reset,
    trigger,
  } = useForm<FormValues>({
    defaultValues: buildTxFormDefaults({
      defaultType,
      defaultMainCategory,
      defaultTransactionDate,
    }),
  });

  const pocketRepay = usePocketRepaySettlement();
  const pocketRepaySettlement = pocketRepay.settlement;
  /** Gün sonu bundled gider alt state'i: open + onaylı satırlar + helper'lar. */
  const dayCloseBundle = useDayCloseBundle();
  const dayCloseBundledExpenseOpen = dayCloseBundle.open;
  const dayCloseBundledConfirmedLines = dayCloseBundle.lines;

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

  // Personel gideri akışı: bağlı personelin ana şubesini target branch'e default'lat
  // (modal her açıldığında bir kez; kullanıcı sonradan değiştirebilir).
  useEffect(() => {
    if (!open || !personnelExpenseFlow) return;
    if (defaultLinkedPersonnelId == null || defaultLinkedPersonnelId <= 0) return;
    const cur = String(getValues("personnelExpenseBranchId") ?? "").trim();
    if (cur) return;
    const linked = allPersonnel.find((p) => p.id === defaultLinkedPersonnelId);
    if (linked?.branchId != null && linked.branchId > 0) {
      setValue("personnelExpenseBranchId", String(linked.branchId));
    }
  }, [open, personnelExpenseFlow, defaultLinkedPersonnelId, allPersonnel, getValues, setValue]);
  const useOrgExpenseLinks = resolvedBranchId == null;
  const prevType = useRef(txType);
  const prevMain = useRef(mainCategoryWatch);

  useTxOpenReset({
    open,
    orgMode,
    propBranchId,
    defaultType,
    defaultMainCategory,
    defaultTransactionDate,
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
    defaultEffectiveYear,
    personnelDirectExpenseEntry,
    reset,
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef: prevType,
    prevMainRef: prevMain,
  });

  useTxResetOnChange({
    txType,
    mainCategoryWatch,
    setValue,
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef: prevType,
    prevMainRef: prevMain,
  });

  useTxInvoiceSync({
    isInvoiceOpsLine,
    isInvoiceUnpaid,
    invoicePaymentWatch,
    setValue,
    trigger,
  });

  useTxCategorySync({
    txType,
    mainCategoryWatch,
    categoryWatch,
    setValue,
    getValues,
  });

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


  const {
    mainCat,
    subCat,
    isPocketRepayMain,
    isPocketRepaySettlementUmbrellaMain,
    isPocketClaimTransferMain,
    isPatronDebtRepayMain,
    isNonPnlMemoMain,
    needsExpenseAdvancePick,
    needsExpenseSalaryPick,
    needsExpenseFinancialPersonnelPick,
    needsDirectPersonnelPickForPersonnelExpense,
  } = useTxClassificationFlags({
    txType,
    mainCategoryWatch,
    categoryWatch,
    personnelExpenseFlow,
    personnelLinkedExpenseContext,
  });

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

  const advanceModeTrim = String(advanceExpenseModeWatch ?? "existing").trim();
  const needsExpenseAdvanceExisting =
    needsExpenseAdvancePick && advanceModeTrim === "existing";
  const needsExpenseAdvanceNewRegister =
    needsExpenseAdvancePick && advanceModeTrim === "new_register";

  useTxFinancialLinkSync({
    open,
    expenseLinkPersonnelWatch,
    advanceExpenseModeWatch,
    categoryWatch,
    needsExpenseFinancialPersonnelPick,
    needsExpenseAdvancePick,
    needsExpenseAdvanceNewRegister,
    personnelLinkedExpenseContext,
    defaultLinkedPersonnelId,
    defaultEffectiveYear,
    setValue,
    getValues,
  });


  const {
    expenseLinkAdvances,
    expenseLinkAdvFetching,
    expenseLinkSalary,
    expenseLinkSalaryFetching,
  } = useExpenseLinkOptions({
    open,
    resolvedBranchId,
    useOrgExpenseLinks,
    expenseLinkPidNum,
    needsAdvanceExisting: needsExpenseAdvanceExisting,
    needsSalaryPick: needsExpenseSalaryPick,
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

  const asOfDateYmd = useMemo(() => {
    const s = String(transactionDateWatch ?? "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }, [transactionDateWatch]);


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

  const amountWatch = useWatch({ control, name: "amount" });
  const amountCashWatch = useWatch({ control, name: "amountCash" });
  const amountCardWatch = useWatch({ control, name: "amountCard" });
  const currencyWatch = useWatch({ control, name: "currencyCode" });

  // Önce gün sonu sezişi için kullanılan watch'lar; registerSummary query buna bağlı.
  const registerDayCloseProbe = isRegisterDayCloseIncomeRow(
    txType,
    mainCategoryWatch,
    categoryWatch
  );

  const { data: registerSummary } = useBranchRegisterSummary(
    resolvedBranchId,
    asOfDateYmd,
    registerDayCloseProbe &&
      resolvedBranchId != null &&
      resolvedBranchId > 0 &&
      asOfDateYmd.length === 10 &&
      !orgMode
  );

  const {
    patronCashIncomeMainActive,
    incomeSplitActive,
    registerDayClose,
    splitTotal,
    financialAmountLocked,
    priorRegisterExpenses,
    bundledRegisterExpenses,
    totalDeductibleRegisterExpenses,
    enteredCashIncome,
    netCashHandover,
    parsedCashPositive,
  } = useTxAmountState({
    txType,
    mainCategoryWatch,
    categoryWatch,
    amountWatch,
    amountCashWatch,
    amountCardWatch,
    expenseFinancialLinkWatch,
    locale,
    isPocketRepaySettlementUmbrellaMain,
    needsExpenseSalaryPick,
    needsExpenseAdvanceExisting,
    registerSummary,
    dayCloseBundledConfirmedLines,
  });



  const showCashSettlement = registerDayClose || parsedCashPositive;

  useTxExpensePaymentSync({
    txType,
    mainCategoryWatch,
    categoryWatch,
    expensePayWatch,
    cashPartyWatch,
    advanceExpenseModeWatch,
    resolvedBranchId,
    showCashSettlement,
    personnelExpenseFlow,
    setValue,
    getValues,
    trigger,
  });

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
        personnelExpenseFlow,
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
      personnelExpenseFlow,
      t,
    ]
  );

  const personnelExpenseBranchOptions = useMemo(
    () =>
      buildBranchSelectOptions({
        branches: branchesForPersonnelExpense,
        locale,
        t,
        placeholderKey: "branch.txPersonnelExpenseBranchPick",
      }),
    [branchesForPersonnelExpense, locale, t]
  );
  const resolvedBranchName = useMemo(() => {
    if (resolvedBranchId == null || resolvedBranchId <= 0) return "";
    return (
      branchesForPersonnelExpense.find((b) => b.id === resolvedBranchId)?.name ??
      `#${resolvedBranchId}`
    );
  }, [branchesForPersonnelExpense, resolvedBranchId]);
  const canSelectExpenseTargetBranch =
    personnelExpenseFlow && (propBranchId == null || propBranchId <= 0);

  const branchStaffOptions = useMemo(
    () =>
      buildPersonnelOptions({
        personnel: allPersonnel,
        locale,
        t,
        placeholderKey: "branch.cashSettlementResponsiblePick",
        branchIdFilter: resolvedBranchId,
      }),
    [allPersonnel, resolvedBranchId, locale, t]
  );

  /** Gün sonu / IN nakit devirinde sorumlu: tüm aktif personel (şube filtresi yok). */
  const cashSettlementResponsibleOptions = useMemo(
    () =>
      buildPersonnelOptions({
        personnel: allPersonnel,
        locale,
        t,
        placeholderKey: "branch.cashSettlementResponsiblePick",
      }),
    [allPersonnel, locale, t]
  );

  const expensePaySourceUpper = String(expensePayWatch ?? "").trim().toUpperCase();
  const heldRegisterPaySourceActive =
    expensePaySourceUpper === "PERSONNEL_HELD_REGISTER_CASH";
  const personnelPocketPaySourceActive = expensePaySourceUpper === "PERSONNEL_POCKET";

  const heldRegisterQueryBranchIds = useMemo(() => {
    const fromProp = (heldRegisterAggregateBranchIds ?? []).filter(
      (id) => typeof id === "number" && Number.isFinite(id) && id > 0,
    );
    if (fromProp.length > 0) return [...new Set(fromProp)].sort((a, b) => a - b);
    const ids = new Set<number>();
    if (resolvedBranchId != null && resolvedBranchId > 0) ids.add(resolvedBranchId);
    if (propBranchId != null && propBranchId > 0) ids.add(propBranchId);
    // Personel gideri akışında hedef şube henüz seçilmemiş olabilir; bağlı personelin şubesi
    // bilinmiyorsa tüm görünen şubeleri tarayalım ki HELD picker boş kalmasın.
    if (personnelExpenseFlow && ids.size === 0) {
      const linkedPid =
        defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0
          ? defaultLinkedPersonnelId
          : null;
      const linked = linkedPid != null ? allPersonnel.find((p) => p.id === linkedPid) : null;
      if (linked?.branchId != null && linked.branchId > 0) {
        ids.add(linked.branchId);
      } else {
        for (const b of branchesForPersonnelExpense) {
          if (b.id != null && b.id > 0) ids.add(b.id);
        }
      }
    }
    return [...ids].sort((a, b) => a - b);
  }, [
    heldRegisterAggregateBranchIds,
    resolvedBranchId,
    propBranchId,
    personnelExpenseFlow,
    defaultLinkedPersonnelId,
    allPersonnel,
    branchesForPersonnelExpense,
  ]);

  /** İşlem tarihi + en az bir şube: çoklu istek yalnızca bu id listesiyle (tüm şube listesi yok). */
  const heldBalancesAcrossBranchesEnabled =
    open &&
    asOfDateYmd.length === 10 &&
    (heldRegisterPaySourceActive || personnelPocketPaySourceActive) &&
    heldRegisterQueryBranchIds.length > 0;
  const heldRegisterPickerEnabled =
    open &&
    heldRegisterPaySourceActive &&
    (heldBalancesAcrossBranchesEnabled ||
      (resolvedBranchId != null && resolvedBranchId > 0));

  const {
    rowsForPicker: heldRegisterRowsForPicker,
    singleBranchRows: heldRegisterCashRows,
    aggregatedRows: heldRegisterCashRowsAggregated,
    loading: heldRegisterPickerLoading,
    fingerprint: heldRegisterAggregationFingerprint,
  } = useHeldRegisterCashRows({
    resolvedBranchId,
    asOfDateYmd,
    pickerEnabled: heldRegisterPickerEnabled,
    acrossBranchesEnabled: heldBalancesAcrossBranchesEnabled,
    queryBranchIds: heldRegisterQueryBranchIds,
  });

  /** PERSONNEL_POCKET: aynı held-register toplamı (tüm şubeler); tarih yoksa sadece isim listesi. */
  const pocketExpensePersonOptions = useMemo(() => {
    if (!personnelPocketPaySourceActive) return cashSettlementResponsibleOptions;
    if (!heldBalancesAcrossBranchesEnabled) return cashSettlementResponsibleOptions;
    return buildHeldRegisterPersonOptions({
      rows: heldRegisterCashRowsAggregated,
      allPersonnel,
      locale,
      t,
      pickPlaceholderKey: "branch.cashSettlementResponsiblePick",
      amountLabelKey: "branch.heldRegisterCashDropdownAmountLabel",
    });
  }, [
    personnelPocketPaySourceActive,
    heldBalancesAcrossBranchesEnabled,
    heldRegisterAggregationFingerprint,
    heldRegisterCashRowsAggregated,
    cashSettlementResponsibleOptions,
    allPersonnel,
    locale,
    t,
  ]);

  /** Cebinde net kasa parası &gt; 0 olanlar; etikette tutar (işlem tarihine kadar). */
  const heldRegisterPersonOptions = useMemo(
    () =>
      buildHeldRegisterPersonOptions({
        rows: heldRegisterRowsForPicker,
        allPersonnel,
        locale,
        t,
        pickPlaceholderKey: "branch.cashSettlementResponsiblePick",
        amountLabelKey: "branch.heldRegisterCashDropdownAmountLabel",
      }),
    [heldRegisterRowsForPicker, allPersonnel, locale, t]
  );

  const expensePocketPickerUsesHeldTotals =
    heldBalancesAcrossBranchesEnabled &&
    (heldRegisterPaySourceActive || personnelPocketPaySourceActive);

  useTxMiscSync({
    registerDayClose,
    orgMode,
    dayCloseBundle,
    expensePocketPickerUsesHeldTotals,
    heldRegisterPickerEnabled,
    expensePocketPersonnelWatch,
    heldRegisterCashRowsAggregated,
    heldRegisterRowsForPicker,
    heldRegisterAggregationFingerprint,
    needsSubCategory,
    categoryWatch,
    incomeSplitActive,
    setValue,
    getValues,
    trigger,
  });

  const expenseLinkStaffOptions = useMemo(
    () =>
      buildPersonnelOptions({
        personnel: allPersonnel,
        locale,
        t,
        placeholderKey: "branch.txExpenseLinkPersonnelPick",
        branchIdFilter: resolvedBranchId,
      }),
    [allPersonnel, resolvedBranchId, locale, t]
  );

  const prefilledLinkedPersonnelLabel = useMemo(() => {
    if (defaultLinkedPersonnelId == null || defaultLinkedPersonnelId <= 0) return "";
    const p = allPersonnel.find((x) => x.id === defaultLinkedPersonnelId);
    if (!p) return `#${defaultLinkedPersonnelId}`;
    return `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`;
  }, [allPersonnel, defaultLinkedPersonnelId, t]);

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


  const { field: currencyField } = useController({
    name: "currencyCode",
    control,
    defaultValue: DEFAULT_CURRENCY,
    rules: { required: reqVal },
  });

  const handlePocketRepaySettlementChange = useCallback(
    (ids: number[], sum: number, currencyOk: boolean) => {
      pocketRepay.setSettlement({ ids, sum, currencyOk });
      const cur = String(currencyWatch ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
      if (ids.length > 0 && sum > 0 && currencyOk) {
        setValue("amount", formatLocaleAmount(sum, locale, cur));
      } else {
        setValue("amount", "");
      }
      void trigger("amount");
    },
    [pocketRepay, currencyWatch, locale, setValue, trigger]
  );

  const regCash = register("amountCash");
  const regCard = register("amountCard");
  const regEffectiveYear = register("effectiveYear");

  const mainOpts = useMemo(
    () => buildTxMainOptions({ txType, t, orgMode, personnelExpenseFlow }),
    [txType, t, orgMode, personnelExpenseFlow]
  );
  const subOpts = useMemo(
    () => buildTxSubOptions({ txType, mainCategoryWatch, t }),
    [txType, mainCategoryWatch, t]
  );
  const dayCloseBundledMainOpts = useMemo(
    () => buildDayCloseBundledMainOptions(t),
    [t]
  );

  const dayCloseBundledAmtWatch = useWatch({ control, name: "dayCloseBundledExpenseAmount" });
  const dayCloseBundledDescWatch = useWatch({ control, name: "dayCloseBundledExpenseDescription" });

  const {
    subOptions: dayCloseBundledSubOpts,
    needsSubCategory: bundledDayCloseNeedsSubCategory,
    preview: dayCloseBundledExpensePreview,
    tableDisplay: dayCloseBundledTableDisplay,
  } = useDayCloseBundlePreview({
    mainValue: dayCloseBundledMainField.value,
    subValue: dayCloseBundledSubField.value,
    payValue: dayCloseBundledExpensePayField.value,
    amountWatch: dayCloseBundledAmtWatch,
    descWatch: dayCloseBundledDescWatch,
    confirmedLines: dayCloseBundledConfirmedLines,
    mainOptions: dayCloseBundledMainOpts,
    currencyWatch,
    locale,
    t,
  });

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
    const bCat: string | null = v.dayCloseBundledExpenseCategory.trim() || null;
    if (txMainNeedsSubCategory("OUT", bMain) && !bCat) {
      notify.error(t("branch.txDayCloseBundledExpenseSubRequired"));
      return;
    }
    const bSrc = v.dayCloseBundledExpensePaymentSource.trim().toUpperCase();
    if (bSrc !== "REGISTER" && bSrc !== "PATRON") {
      notify.error(t("branch.txDayCloseBundledExpensePaymentRequired"));
      return;
    }
    const desc = v.dayCloseBundledExpenseDescription.trim() || null;
    dayCloseBundle.addLine({
      amount: amt,
      mainCategory: bMain,
      category: bCat,
      paymentSource: bSrc as "REGISTER" | "PATRON",
      description: desc,
    });
    setValue("dayCloseBundledExpenseAmount", "");
    setValue("dayCloseBundledExpenseDescription", "");
  }, [
    dayCloseBundle,
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
    () => buildAdvanceLinkSelectOptions(expenseLinkAdvances, locale),
    [expenseLinkAdvances, locale]
  );
  const salaryLinkSelectOptions = useMemo(
    () => buildSalaryLinkSelectOptions(expenseLinkSalary, locale),
    [expenseLinkSalary, locale]
  );

  const { onSubmit } = useTxSubmit({
    handleSubmit,
    propBranchId,
    personnelExpenseFlow,
    defaultLinkedPersonnelId,
    onClose,
    locale,
    dayCloseBundledConfirmedLines,
    dayCloseBundledExpenseOpen,
    pocketRepaySettlement,
    receiptPhotoRef,
    registerSummary,
    createTx,
    createAdvanceMut,
    tryTourismSeasonClosedRedirect,
  });
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: createTx.isPending || createAdvanceMut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  const { title: modalTitle, hint: modalHint } = useTxDynamicTitle({
    orgMode,
    defaultMainCategory,
    defaultType,
    defaultPocketRepayPersonnelId,
    defaultHandoverSettleKind,
    propBranchId,
    resolvedBranchId,
    personnelExpenseFlow,
  });

  const showsPersonnelHero =
    personnelExpenseFlow &&
    !!personnelLinkedExpenseContext &&
    defaultLinkedPersonnelId != null &&
    defaultLinkedPersonnelId > 0;
  const hideModalDescription = registerDayClose || showsPersonnelHero;

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={modalTitle}
      description={hideModalDescription ? undefined : modalHint}
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
            "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:space-y-2.5 sm:px-5"
          )}
        >
          {(() => {
            const showPersonnelHero =
              personnelExpenseFlow &&
              !!personnelLinkedExpenseContext &&
              defaultLinkedPersonnelId != null &&
              defaultLinkedPersonnelId > 0;
            if (registerDayClose) {
              return <DayCloseHeroBanner branchName={resolvedBranchName ?? ""} />;
            }
            if (showPersonnelHero) {
              return <PersonnelExpenseHeroBanner personnelLabel={prefilledLinkedPersonnelLabel} />;
            }
            return <TxFormIntro txType={txType} personnelExpenseFlow={personnelExpenseFlow} />;
          })()}
          <div className="grid grid-cols-1 gap-2 sm:gap-2.5 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2.5">
            {!registerDayClose ? (
              <>
                <TxContextCards
                  branchVisible={
                    !personnelExpenseFlow &&
                    propBranchId != null &&
                    propBranchId > 0 &&
                    !!resolvedBranchName
                  }
                  branchName={resolvedBranchName ?? ""}
                  personnelVisible={false}
                  personnelLabel={prefilledLinkedPersonnelLabel}
                />
                {!personnelExpenseFlow ? (
                  <TxTypeSelector
                    field={typeField}
                    orgMode={orgMode}
                    personnelExpenseFlow={personnelExpenseFlow}
                    errors={errors}
                  />
                ) : null}
              </>
            ) : null}
            {!registerDayClose ? (
              <MainAndSubCategorySelects
                hideMain={personnelExpenseFlow}
                mainField={mainField}
                mainOptions={mainOpts}
                routingHintKey={expenseMainRoutingHint}
                needsSubCategory={needsSubCategory}
                subField={categoryField}
                subOptions={subOpts}
                mainCategoryValue={mainCategoryWatch}
                errors={errors}
              />
            ) : null}
            {isInvoiceOpsLine ? (
              <InvoicePaymentStatusField field={invoicePaymentField} errors={errors} />
            ) : null}
            <TxCalloutHints
              patronCashActive={patronCashIncomeMainActive}
              nonPnlMemoActive={isNonPnlMemoMain}
            />
            {(needsExpenseFinancialPersonnelPick && !personnelLinkedExpenseContext) ||
            needsDirectPersonnelPickForPersonnelExpense ? (
              <ExpenseLinkPersonnelPicker
                field={expenseLinkPersonnelField}
                options={expenseLinkStaffOptions}
              />
            ) : null}
            <ExpenseFinancialLinkSection
              needsAdvancePick={needsExpenseAdvancePick}
              needsAdvanceExisting={needsExpenseAdvanceExisting}
              needsAdvanceNewRegister={needsExpenseAdvanceNewRegister}
              needsSalaryPick={needsExpenseSalaryPick}
              useOrgExpenseLinks={useOrgExpenseLinks}
              advanceModeField={advanceExpenseModeField}
              finLinkField={expenseFinancialLinkField}
              effectiveYearReg={regEffectiveYear}
              advanceOptions={advanceLinkSelectOptions}
              salaryOptions={salaryLinkSelectOptions}
              advances={expenseLinkAdvances}
              salaries={expenseLinkSalary}
              advFetching={expenseLinkAdvFetching}
              salaryFetching={expenseLinkSalaryFetching}
              linkPidNum={expenseLinkPidNum}
              setValue={setValue}
              locale={locale}
            />
            {!registerDayClose ? <TxStoryCallout txType={txType} /> : null}
            <AmountCurrencyDateRow
              currencyField={currencyField}
              currencyOptions={currencyOptions}
              dateField={transactionDateField}
              dateFieldState={transactionDateFieldState}
              amountField={amountField}
              amountLocked={financialAmountLocked}
              isPocketRepaySettlementUmbrellaMain={isPocketRepaySettlementUmbrellaMain}
              splitActive={incomeSplitActive}
              locale={locale}
              errors={errors}
            />
            {txType.toUpperCase() === "IN" && !patronCashIncomeMainActive ? (
              <AmountSplitFields
                regCash={regCash}
                regCard={regCard}
                setValue={setValue}
                locale={locale}
                currencyCode={currencyWatch}
                splitActive={incomeSplitActive}
                splitTotal={splitTotal}
                hideHint={registerDayClose}
              />
            ) : null}
            {showCashSettlement ? (
              <CashSettlementSection
                registerDayClose={registerDayClose}
                cashSettlementField={cashSettlementField}
                cashPartyWatch={cashPartyWatch}
                settlementPersonnelField={settlementPersonnelField}
                cashSettlementResponsibleOptions={cashSettlementResponsibleOptions}
                register={register}
                errors={errors}
                enteredCashIncome={enteredCashIncome}
                priorRegisterExpenses={priorRegisterExpenses}
                bundledRegisterExpenses={bundledRegisterExpenses}
                netCashHandover={netCashHandover}
                locale={locale}
                currencyCode={currencyWatch}
              />
            ) : null}
            {registerDayClose && !orgMode ? (
              <DayCloseBundledExpensesPanel
                bundle={dayCloseBundle}
                tableDisplay={dayCloseBundledTableDisplay}
                preview={dayCloseBundledExpensePreview}
                needsSubCategory={bundledDayCloseNeedsSubCategory}
                mainOptions={dayCloseBundledMainOpts}
                subOptions={dayCloseBundledSubOpts}
                mainField={dayCloseBundledMainField}
                subField={dayCloseBundledSubField}
                payField={dayCloseBundledExpensePayField}
                register={register}
                setValue={setValue}
                onConfirm={confirmDayCloseBundledExpense}
              />
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            !isNonPnlMemoMain &&
            !isPocketClaimTransferMain &&
            !isInvoiceUnpaid ? (
              <ExpensePaymentSection
                isPatronDebtRepayMain={isPatronDebtRepayMain}
                isPocketRepayMain={isPocketRepayMain}
                personnelExpenseFlow={personnelExpenseFlow}
                propBranchId={propBranchId}
                resolvedBranchId={resolvedBranchId}
                expensePayField={expensePayField}
                expensePayWatch={expensePayWatch}
                expensePaymentOptions={expensePaymentSelectOptions}
                errors={errors}
                expensePocketPersonnelField={expensePocketPersonnelField}
                pocketExpensePersonOptions={pocketExpensePersonOptions}
                heldRegisterPersonOptions={heldRegisterPersonOptions}
                heldBalancesAcrossBranchesEnabled={heldBalancesAcrossBranchesEnabled}
                heldRegisterPickerLoading={heldRegisterPickerLoading}
                asOfDateYmd={asOfDateYmd}
                isPocketRepaySettlementUmbrellaMain={isPocketRepaySettlementUmbrellaMain}
                branchStaffOptions={branchStaffOptions}
                expensePocketRepayPidNum={expensePocketRepayPidNum}
                modalOpen={open}
                locale={locale}
                formCurrencyCode={String(currencyWatch ?? DEFAULT_CURRENCY)}
                onSettlementChange={handlePocketRepaySettlementChange}
              />
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            personnelExpenseFlow &&
            String(expensePayWatch ?? "").trim().toUpperCase() === "REGISTER" ? (
              <PersonnelExpenseTargetBranchSection
                canSelect={canSelectExpenseTargetBranch}
                field={personnelExpenseBranchField}
                options={personnelExpenseBranchOptions}
                resolvedBranchName={resolvedBranchName ?? ""}
                errors={errors}
              />
            ) : null}
            {txType.toUpperCase() === "OUT" &&
            isPocketClaimTransferMain &&
            resolvedBranchId != null &&
            resolvedBranchId > 0 ? (
              <PocketClaimTransferSection
                subCategory={subCat}
                branchStaffOptions={branchStaffOptions}
                fromField={pocketClaimFromPersonnelField}
                toField={expensePocketPersonnelField}
                errors={errors}
              />
            ) : null}
            {txType.toUpperCase() === "OUT" ? (
              <ReceiptPhotoField
                ref={receiptPhotoRef}
                requiredByInvoice={
                  isInvoiceOpsLine &&
                  String(invoicePaymentWatch ?? "").trim().toUpperCase() === "PAID"
                }
                pickedFile={receiptPhotoPick}
                onPick={setReceiptPhotoPick}
              />
            ) : null}
            <div className="min-w-0 lg:col-span-2">
              <Input label={t("branch.txDescription")} {...register("description")} />
            </div>
          </div>
        </div>
        <TxModalFooter
          pending={createTx.isPending || createAdvanceMut.isPending}
          onCancel={requestClose}
        />
      </form>
    </Modal>
  );
}
