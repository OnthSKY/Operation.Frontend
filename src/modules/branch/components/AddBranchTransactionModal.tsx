"use client";

import { useI18n } from "@/i18n/context";
import { useCreateBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  type: string;
  amount: string;
  transactionDate: string;
  category: string;
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
  const { t } = useI18n();
  const createTx = useCreateBranchTransaction();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      type: "IN",
      amount: "",
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      category: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      type: "IN",
      amount: "",
      transactionDate: defaultTransactionDate ?? localIsoDate(),
      category: "",
      description: "",
    });
  }, [open, reset, defaultTransactionDate]);

  const onSubmit = handleSubmit(async (values) => {
    const amount = Number(values.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(t("branch.txAmountInvalid"));
      return;
    }
    try {
      await createTx.mutateAsync({
        branchId,
        type: values.type,
        amount,
        transactionDate: values.transactionDate,
        category: values.category.trim() || null,
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
          {...register("type", { required: true })}
        />
        <Input
          label={t("branch.txAmount")}
          inputMode="decimal"
          {...register("amount", { required: t("common.required") })}
          error={errors.amount?.message}
        />
        <Input
          type="date"
          label={t("branch.txDateField")}
          {...register("transactionDate", { required: t("common.required") })}
          error={errors.transactionDate?.message}
        />
        <Input
          label={t("branch.txCategory")}
          {...register("category")}
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
