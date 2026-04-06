"use client";

import { useI18n } from "@/i18n/context";
import {
  fetchBranchExpenseLinkAdvances,
  fetchBranchExpenseLinkSalaryPayments,
} from "@/modules/branch/api/branches-api";
import { useCreateBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  useCreateAdvance,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import {
  txMainNeedsSubCategory,
  txMainOptions,
  txSubOptions,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import {
  currencySelectOptions,
  DEFAULT_CURRENCY,
} from "@/shared/lib/iso4217-currencies";
import { cn } from "@/lib/cn";
import {
  IMAGE_FILE_INPUT_ACCEPT,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/shared/lib/image-upload-limits";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
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
  /** adv:{id} | sal:{id} */
  expenseFinancialLink: string;
  expenseLinkPersonnelId: string;
  /** PER_ADVANCE: existing | new */
  advanceExpenseMode: string;
  effectiveYear: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  /** Defaults to today when omitted. */
  defaultTransactionDate?: string;
  /** Pre-select gelir / gider when opening from income or expense tab. */
  defaultType?: "IN" | "OUT";
};

const TITLE_ID = "branch-tx-title";

export function AddBranchTransactionModal({
  open,
  onClose,
  branchId,
  defaultTransactionDate,
  defaultType,
}: Props) {
  const { t, locale } = useI18n();
  /** RHF: invalid state + red border; no visible “Zorunlu” copy under the field. */
  const reqVal = " ";
  const createTx = useCreateBranchTransaction();
  const createAdvanceMut = useCreateAdvance();
  const { data: allPersonnel = [] } = usePersonnelList(open);
  const receiptPhotoRef = useRef<HTMLInputElement>(null);
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
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      description: "",
      cashSettlementParty: "",
      cashSettlementPersonnelId: "",
      expensePaymentSource: "",
      expensePocketPersonnelId: "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId: "",
      advanceExpenseMode: "existing",
      effectiveYear: "",
    },
  });

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const txType = useWatch({ control, name: "type" });
  const mainCategoryWatch = useWatch({ control, name: "mainCategory" });
  const categoryWatch = useWatch({ control, name: "category" });
  const prevType = useRef(txType);
  const prevMain = useRef(mainCategoryWatch);

  useEffect(() => {
    if (!open) return;
    const nextType = defaultType ?? "IN";
    reset({
      type: nextType,
      mainCategory: "",
      category: "",
      amount: "",
      amountCash: "",
      amountCard: "",
      currencyCode: DEFAULT_CURRENCY,
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      description: "",
      cashSettlementParty: "",
      cashSettlementPersonnelId: "",
      expensePaymentSource: "",
      expensePocketPersonnelId: "",
      expenseFinancialLink: "",
      expenseLinkPersonnelId: "",
      advanceExpenseMode: "existing",
      effectiveYear: "",
    });
    prevType.current = nextType;
    prevMain.current = "";
    if (receiptPhotoRef.current) receiptPhotoRef.current.value = "";
  }, [open, reset, defaultTransactionDate, defaultType]);

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
      if (receiptPhotoRef.current) receiptPhotoRef.current.value = "";
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
      setValue("expenseFinancialLink", "");
      setValue("expenseLinkPersonnelId", "");
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
      prevMain.current = mainCategoryWatch;
    }
  }, [mainCategoryWatch, setValue]);

  useEffect(() => {
    const ty = txType.toUpperCase();
    const m = String(mainCategoryWatch ?? "").trim();
    if (ty === "OUT" && m === "OUT_OTHER") setValue("category", "EXP_OTHER");
    if (ty === "IN" && m === "IN_DAY_CLOSE") setValue("category", "");
  }, [txType, mainCategoryWatch, setValue]);

  const { field: typeField } = useController({
    name: "type",
    control,
    defaultValue: "IN",
    rules: { required: reqVal },
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

  useEffect(() => {
    void trigger("category");
  }, [needsSubCategory, trigger]);

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [categoryWatch, setValue]);

  const mainCat = String(mainCategoryWatch ?? "").trim();
  const subCat = String(categoryWatch ?? "").trim().toUpperCase();
  const needsExpenseAdvancePick =
    txType.toUpperCase() === "OUT" && mainCat === "OUT_PERSONNEL" && subCat === "PER_ADVANCE";
  const needsExpenseSalaryPick =
    txType.toUpperCase() === "OUT" &&
    mainCat === "OUT_PERSONNEL" &&
    (subCat === "PER_SALARY" || subCat === "PER_BONUS");
  const needsExpenseFinancialPersonnelPick =
    needsExpenseAdvancePick || needsExpenseSalaryPick;

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
  const needsExpenseAdvancePersonnelPocket =
    needsExpenseAdvancePick && advanceModeTrim === "personnel_pocket";
  const needsExpenseAdvanceCreatesOnly =
    needsExpenseAdvanceNewRegister || needsExpenseAdvancePersonnelPocket;

  useEffect(() => {
    if (needsExpenseAdvanceCreatesOnly && receiptPhotoRef.current)
      receiptPhotoRef.current.value = "";
  }, [needsExpenseAdvanceCreatesOnly]);

  const financialAmountLocked = useMemo(() => {
    const link = String(expenseFinancialLinkWatch ?? "").trim();
    if (needsExpenseSalaryPick && link.startsWith("sal:")) return true;
    if (needsExpenseAdvanceExisting && link.startsWith("adv:")) return true;
    return false;
  }, [
    needsExpenseSalaryPick,
    needsExpenseAdvanceExisting,
    expenseFinancialLinkWatch,
  ]);

  const { data: expenseLinkAdvances = [], isFetching: expenseLinkAdvFetching } = useQuery({
    queryKey: ["branches", branchId, "expense-link-advances", expenseLinkPidNum],
    queryFn: () => fetchBranchExpenseLinkAdvances(branchId, expenseLinkPidNum),
    enabled:
      open &&
      branchId > 0 &&
      needsExpenseAdvanceExisting &&
      expenseLinkPidNum > 0,
  });

  const { data: expenseLinkSalary = [], isFetching: expenseLinkSalaryFetching } = useQuery({
    queryKey: ["branches", branchId, "expense-link-salary", expenseLinkPidNum],
    queryFn: () => fetchBranchExpenseLinkSalaryPayments(branchId, expenseLinkPidNum),
    enabled: open && branchId > 0 && needsExpenseSalaryPick && expenseLinkPidNum > 0,
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
        if (!main.toUpperCase().startsWith("OUT_")) return true;
        const sc = (String(getValues("category") ?? "").trim() || "").toUpperCase();
        const advMode = String(getValues("advanceExpenseMode") ?? "existing").trim();
        if (
          main === "OUT_PERSONNEL" &&
          sc === "PER_ADVANCE" &&
          (advMode === "new_register" || advMode === "personnel_pocket")
        )
          return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const expensePayWatch = useWatch({ control, name: "expensePaymentSource" });

  const { field: expensePocketPersonnelField } = useController({
    name: "expensePocketPersonnelId",
    control,
    defaultValue: "",
    rules: {
      validate: (v) => {
        if (txType.toUpperCase() !== "OUT") return true;
        const main = String(mainCategoryWatch ?? "").trim();
        if (!main.toUpperCase().startsWith("OUT_")) return true;
        const sc = (String(getValues("category") ?? "").trim() || "").toUpperCase();
        const advMode = String(getValues("advanceExpenseMode") ?? "existing").trim();
        if (
          main === "OUT_PERSONNEL" &&
          sc === "PER_ADVANCE" &&
          (advMode === "new_register" || advMode === "personnel_pocket")
        )
          return true;
        if (String(expensePayWatch ?? "").trim().toUpperCase() !== "PERSONNEL_POCKET")
          return true;
        return String(v ?? "").trim() ? true : reqVal;
      },
    },
  });

  const amountCashWatch = useWatch({ control, name: "amountCash" });
  const amountCardWatch = useWatch({ control, name: "amountCard" });
  const currencyWatch = useWatch({ control, name: "currencyCode" });

  const incomeSplitActive =
    txType.toUpperCase() === "IN" &&
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
  }, [advanceExpenseModeWatch, trigger]);

  useEffect(() => {
    if (String(expensePayWatch ?? "").trim().toUpperCase() !== "PERSONNEL_POCKET")
      setValue("expensePocketPersonnelId", "");
  }, [expensePayWatch, setValue]);

  useEffect(() => {
    void trigger("expensePocketPersonnelId");
  }, [expensePayWatch, trigger]);

  const branchStaffOptions = useMemo(() => {
    const list = allPersonnel.filter((p) => !p.isDeleted && p.branchId === branchId);
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
  }, [allPersonnel, branchId, locale, t]);

  const expenseLinkStaffOptions = useMemo(() => {
    const list = allPersonnel.filter((p) => !p.isDeleted && p.branchId === branchId);
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
  }, [allPersonnel, branchId, locale, t]);

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

  const regCash = register("amountCash");
  const regCard = register("amountCard");
  const regEffectiveYear = register("effectiveYear");

  const mainOpts = useMemo(() => txMainOptions(txType, t), [txType, t]);
  const subOpts = useMemo(
    () => txSubOptions(mainCategoryWatch, t),
    [mainCategoryWatch, t]
  );

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
    if (values.type.toUpperCase() === "IN" && values.mainCategory === "IN_DAY_CLOSE")
      categoryOut = null;

    const expensePaymentSource =
      values.type.toUpperCase() === "OUT"
        ? values.expensePaymentSource.trim()
          ? values.expensePaymentSource.trim().toUpperCase()
          : null
        : null;

    let expensePocketPersonnelId: number | undefined;
    if (values.type.toUpperCase() === "OUT" && expensePaymentSource === "PERSONNEL_POCKET") {
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

    if (receiptFile && receiptFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      notify.error(t("common.imageUploadTooLarge"));
      return;
    }

    const mc = values.mainCategory.trim();
    const sc = (values.category.trim() || "").toUpperCase();
    const reqExpenseAdvance =
      values.type.toUpperCase() === "OUT" && mc === "OUT_PERSONNEL" && sc === "PER_ADVANCE";
    const reqExpenseSalary =
      values.type.toUpperCase() === "OUT" &&
      mc === "OUT_PERSONNEL" &&
      (sc === "PER_SALARY" || sc === "PER_BONUS");

    const linkFinancialPid = parseInt(values.expenseLinkPersonnelId.trim(), 10);
    if (
      (reqExpenseAdvance || reqExpenseSalary) &&
      (!Number.isFinite(linkFinancialPid) || linkFinancialPid <= 0)
    ) {
      notify.error(t("branch.txExpenseLinkPersonnelRequired"));
      return;
    }

    const advanceMode = values.advanceExpenseMode.trim() || "existing";
    if (
      reqExpenseAdvance &&
      (advanceMode === "new_register" || advanceMode === "personnel_pocket")
    ) {
      const yStr = values.effectiveYear.trim();
      let effY = parseInt(yStr, 10);
      if (!Number.isFinite(effY) || effY < 1990 || effY > 2100) {
        const ymd = values.transactionDate.slice(0, 10);
        effY = /^\d{4}/.test(ymd) ? parseInt(ymd.slice(0, 4), 10) : new Date().getFullYear();
      }
      try {
        await createAdvanceMut.mutateAsync({
          personnelId: linkFinancialPid,
          branchId,
          sourceType: advanceMode === "personnel_pocket" ? "PERSONNEL_POCKET" : "CASH",
          amount,
          currencyCode: cur,
          advanceDate: values.transactionDate,
          effectiveYear: effY,
          description: values.description.trim() || null,
        });
        notify.success(
          advanceMode === "personnel_pocket"
            ? t("toast.advancePocketRegistered")
            : t("toast.advanceCreatedRegister")
        );
        onClose();
      } catch (e) {
        notify.error(toErrorMessage(e));
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

    try {
      await createTx.mutateAsync({
        branchId,
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
        expensePaymentSource,
        ...(expensePocketPersonnelId != null && expensePocketPersonnelId > 0
          ? { expensePocketPersonnelId }
          : {}),
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
      });
      notify.success(t("toast.branchTxCreated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("branch.txModalTitle")}
      description={t("branch.txModalHintShort")}
      closeButtonLabel={t("common.close")}
      className={cn(
        "flex max-h-[min(100dvh,92dvh)] min-h-0 w-full max-w-[min(100vw-0.5rem,28rem)] flex-col overflow-hidden rounded-t-2xl sm:max-w-xl sm:rounded-xl lg:max-h-[min(90dvh,52rem)] lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl"
      )}
    >
      <form
        className="mt-2 flex min-h-0 flex-1 touch-manipulation flex-col sm:mt-4"
        onSubmit={onSubmit}
      >
        <div
          className={cn(
            "min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-0.5 [-webkit-overflow-scrolling:touch]",
            "sm:space-y-4 sm:px-0"
          )}
        >
          <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{t("branch.txModalHintDetail")}</p>
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3">
            <div className="min-w-0 lg:col-span-2">
              <Select
                label={t("branch.txType")}
                labelRequired
                options={[
                  { value: "IN", label: t("branch.txTypeIn") },
                  { value: "OUT", label: t("branch.txTypeOut") },
                ]}
                name={typeField.name}
                value={String(typeField.value ?? "IN")}
                onChange={(e) => typeField.onChange(e.target.value)}
                onBlur={typeField.onBlur}
                ref={typeField.ref}
                error={errors.type?.message}
              />
            </div>
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
            {needsExpenseFinancialPersonnelPick ? (
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
                    options={[
                      { value: "existing", label: t("branch.txAdvanceModeExisting") },
                      { value: "new_register", label: t("branch.txAdvanceModeNew") },
                      { value: "personnel_pocket", label: t("branch.txAdvanceModePersonnelPocket") },
                    ]}
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
                {needsExpenseAdvancePersonnelPocket ? (
                  <div className="min-w-0 space-y-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3 lg:col-span-2">
                    <p className="text-xs leading-relaxed text-amber-950/90 sm:text-sm">
                      {t("branch.txAdvancePocketHint")}
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
                disabled={financialAmountLocked}
              />
            </div>
            <div className="min-w-0">
              <Input
                type="date"
                label={t("branch.txDateField")}
                labelRequired
                {...register("transactionDate", { required: reqVal })}
                error={errors.transactionDate?.message}
              />
            </div>
            {txType.toUpperCase() === "IN" ? (
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
                  <p className="mt-1 text-xs text-zinc-500">{t("branch.txAmountLockedHint")}</p>
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
            {txType.toUpperCase() === "OUT" && !needsExpenseAdvanceCreatesOnly ? (
              <div className="min-w-0 lg:col-span-2">
                <p className="mb-1.5 text-xs leading-relaxed text-zinc-600">
                  {t("branch.expensePaymentHint")}
                </p>
                <Select
                  label={t("branch.expensePaymentLabel")}
                  labelRequired
                  options={[
                    { value: "", label: t("branch.expensePaymentUnset") },
                    { value: "REGISTER", label: t("branch.expensePayRegister") },
                    { value: "PATRON", label: t("branch.expensePayPatron") },
                    { value: "PERSONNEL_POCKET", label: t("branch.expensePayPersonnelPocket") },
                  ]}
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
              </div>
            ) : null}
            {txType.toUpperCase() === "OUT" && !needsExpenseAdvanceCreatesOnly ? (
              <div className="min-w-0 lg:col-span-2">
                <label
                  htmlFor="branch-tx-receipt-photo"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  {t("branch.receiptPhotoOptional")}
                </label>
                <input
                  id="branch-tx-receipt-photo"
                  ref={receiptPhotoRef}
                  name="branch-tx-receipt-photo"
                  type="file"
                  accept={IMAGE_FILE_INPUT_ACCEPT}
                  className="block w-full min-w-0 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                />
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
