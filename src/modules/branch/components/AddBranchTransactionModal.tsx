"use client";

import { useI18n } from "@/i18n/context";
import { useCreateBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import {
  txMainOptions,
  txSubOptions,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  /** Defaults to today when omitted. */
  defaultTransactionDate?: string;
};

const TITLE_ID = "branch-tx-title";

export function AddBranchTransactionModal({
  open,
  onClose,
  branchId,
  defaultTransactionDate,
}: Props) {
  const { t, locale } = useI18n();
  const createTx = useCreateBranchTransaction();
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm<FormValues>({
    defaultValues: {
      type: "IN",
      mainCategory: "",
      category: "",
      amount: "",
      amountCash: "",
      amountCard: "",
      currencyCode: DEFAULT_CURRENCY,
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      description: "",
    },
  });

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const txType = useWatch({ control, name: "type" });
  const mainCategoryWatch = useWatch({ control, name: "mainCategory" });
  const prevType = useRef(txType);
  const prevMain = useRef(mainCategoryWatch);

  useEffect(() => {
    if (!open) return;
    reset({
      type: "IN",
      mainCategory: "",
      category: "",
      amount: "",
      amountCash: "",
      amountCard: "",
      currencyCode: DEFAULT_CURRENCY,
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      description: "",
    });
    prevType.current = "IN";
    prevMain.current = "";
  }, [open, reset, defaultTransactionDate]);

  useEffect(() => {
    if (prevType.current !== txType) {
      setValue("mainCategory", "");
      setValue("category", "");
      setValue("amountCash", "");
      setValue("amountCard", "");
      prevType.current = txType;
    }
  }, [txType, setValue]);

  useEffect(() => {
    if (prevMain.current !== mainCategoryWatch) {
      setValue("category", "");
      prevMain.current = mainCategoryWatch;
    }
  }, [mainCategoryWatch, setValue]);

  const { field: typeField } = useController({
    name: "type",
    control,
    defaultValue: "IN",
    rules: { required: t("common.required") },
  });

  const { field: mainField } = useController({
    name: "mainCategory",
    control,
    defaultValue: "",
    rules: { required: t("common.required") },
  });

  const { field: categoryField } = useController({
    name: "category",
    control,
    defaultValue: "",
    rules: { required: t("common.required") },
  });

  const amountCashWatch = useWatch({ control, name: "amountCash" });
  const amountCardWatch = useWatch({ control, name: "amountCard" });
  const currencyWatch = useWatch({ control, name: "currencyCode" });

  const incomeSplitActive =
    txType.toUpperCase() === "IN" &&
    (String(amountCashWatch ?? "").trim() !== "" ||
      String(amountCardWatch ?? "").trim() !== "");

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
          : t("common.required"),
    },
  });

  useEffect(() => {
    void trigger("amount");
  }, [incomeSplitActive, trigger]);

  const { field: currencyField } = useController({
    name: "currencyCode",
    control,
    defaultValue: DEFAULT_CURRENCY,
    rules: { required: t("common.required") },
  });

  const regCash = register("amountCash");
  const regCard = register("amountCard");

  const mainOpts = useMemo(() => txMainOptions(txType, t), [txType, t]);
  const subOpts = useMemo(
    () => txSubOptions(mainCategoryWatch, t),
    [mainCategoryWatch, t]
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

    try {
      await createTx.mutateAsync({
        branchId,
        type: values.type,
        mainCategory: values.mainCategory.trim() || null,
        category: values.category.trim() || null,
        amount,
        cashAmount,
        cardAmount,
        currencyCode: cur,
        transactionDate: values.transactionDate,
        description: values.description.trim() || null,
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
      description={t("branch.txModalHint")}
      closeButtonLabel={t("common.close")}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <Select
          label={t("branch.txType")}
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
        <Select
          label={t("branch.txMainCategory")}
          options={mainOpts}
          name={mainField.name}
          value={String(mainField.value ?? "")}
          onChange={(e) => mainField.onChange(e.target.value)}
          onBlur={mainField.onBlur}
          ref={mainField.ref}
          error={errors.mainCategory?.message}
        />
        <Select
          label={t("branch.txSubCategory")}
          options={subOpts}
          name={categoryField.name}
          value={String(categoryField.value ?? "")}
          onChange={(e) => categoryField.onChange(e.target.value)}
          onBlur={categoryField.onBlur}
          ref={categoryField.ref}
          disabled={!mainCategoryWatch}
          error={errors.category?.message}
        />
        <Select
          label={t("branch.txCurrency")}
          options={currencyOptions}
          name={currencyField.name}
          value={String(currencyField.value ?? DEFAULT_CURRENCY)}
          onChange={(e) => currencyField.onChange(e.target.value)}
          onBlur={currencyField.onBlur}
          ref={currencyField.ref}
          error={errors.currencyCode?.message}
        />
        {txType.toUpperCase() === "IN" && (
          <>
            <p className="text-xs text-zinc-500">{t("branch.txAmountSplitHint")}</p>
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
            {incomeSplitActive && splitTotal != null && (
              <p className="text-sm font-medium text-zinc-800">
                {t("branch.txAmount")}:{" "}
                {formatLocaleAmount(splitTotal, locale, currencyWatch)}
              </p>
            )}
          </>
        )}
        {!incomeSplitActive && (
          <Input
            label={t("branch.txAmount")}
            inputMode="decimal"
            autoComplete="off"
            name={amountField.name}
            value={amountField.value}
            onChange={(e) => amountField.onChange(e.target.value)}
            onBlur={(e) => {
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
        )}
        <Input
          type="date"
          label={t("branch.txDateField")}
          {...register("transactionDate", { required: t("common.required") })}
          error={errors.transactionDate?.message}
        />
        <Input
          label={t("branch.txDescription")}
          {...register("description")}
        />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="sm:min-w-[120px]"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="sm:min-w-[120px]"
            disabled={createTx.isPending}
          >
            {createTx.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
