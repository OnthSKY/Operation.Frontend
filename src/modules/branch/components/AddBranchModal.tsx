"use client";

import { useI18n } from "@/i18n/context";
import { useCreateBranch } from "@/modules/branch/hooks/useBranchQueries";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { requiresPosDestinationNotes } from "@/modules/branch/lib/pos-settlement-beneficiary";
import type { BranchPosSettlementBeneficiaryType } from "@/types/branch";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  name: string;
  posSettlementBeneficiaryType: BranchPosSettlementBeneficiaryType;
  posSettlementNotes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const TITLE_ID = "add-branch-title";

const POS_OPTIONS: {
  value: BranchPosSettlementBeneficiaryType;
  labelKey: string;
  hintKey: string;
}[] = [
  { value: "PATRON", labelKey: "branch.posSettlementPatron", hintKey: "branch.posSettlementPatronHint" },
  {
    value: "FRANCHISE",
    labelKey: "branch.posSettlementFranchise",
    hintKey: "branch.posSettlementFranchiseHint",
  },
  {
    value: "JOINT_VENTURE",
    labelKey: "branch.posSettlementJoint",
    hintKey: "branch.posSettlementJointHint",
  },
  {
    value: "BRANCH_PERSONNEL",
    labelKey: "branch.posSettlementBranchPersonnel",
    hintKey: "branch.posSettlementBranchPersonnelHint",
  },
  { value: "OTHER", labelKey: "branch.posSettlementOther", hintKey: "branch.posSettlementOtherHint" },
];

export function AddBranchModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const createBranch = useCreateBranch();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      posSettlementBeneficiaryType: "PATRON",
      posSettlementNotes: "",
    },
  });

  const posType = watch("posSettlementBeneficiaryType");
  const notesRequired = requiresPosDestinationNotes(posType);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createBranch.mutateAsync({
        name: values.name.trim(),
        posSettlementBeneficiaryType: values.posSettlementBeneficiaryType,
        posSettlementNotes: values.posSettlementNotes.trim()
          ? values.posSettlementNotes.trim()
          : null,
      });
      notify.success(t("toast.branchCreated"));
      reset();
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: createBranch.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => {
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("branch.addTitle")}
      description={t("branch.addHint")}
      className="w-full max-w-xl"
    >
      <form onSubmit={onSubmit}>
        <ModalFormLayout
          body={
            <>
              <FormSection>
                <Input
                  label={t("branch.fieldName")}
                  labelRequired
                  required
                  autoFocus
                  {...register("name", { required: t("common.required") })}
                  error={errors.name?.message}
                  autoComplete="organization"
                  maxLength={100}
                />
              </FormSection>
              <FormSection>
                <fieldset className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                  <legend className="px-1 text-sm font-semibold text-zinc-800">
                    {t("branch.addPosSettlementLegend")}
                  </legend>
                  <p className="mb-3 text-xs leading-relaxed text-zinc-600">
                    {t("branch.addPosSettlementLead")}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {POS_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:bg-white/80"
                      >
                        <input
                          type="radio"
                          className="mt-0.5 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900"
                          value={opt.value}
                          {...register("posSettlementBeneficiaryType", {
                            required: t("common.required"),
                          })}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium text-zinc-800">{t(opt.labelKey)}</span>
                          <span className="text-xs leading-snug text-zinc-500">{t(opt.hintKey)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {posType === "BRANCH_PERSONNEL" ? (
                    <p className="mt-3 text-xs leading-relaxed text-amber-900/90">
                      {t("branch.posBranchPersonnelFollowUp")}
                    </p>
                  ) : null}
                </fieldset>
              </FormSection>
              <FormSection>
                <Input
                  label={t("branch.posSettlementNotesLabel")}
                  labelRequired={notesRequired}
                  {...register("posSettlementNotes", {
                    maxLength: { value: 500, message: t("branch.posSettlementNotesMaxLength") },
                    validate: (v) =>
                      !notesRequired ||
                      (typeof v === "string" && v.trim().length > 0) ||
                      t("branch.posSettlementNotesRequired"),
                  })}
                  error={errors.posSettlementNotes?.message}
                  maxLength={500}
                  placeholder={
                    notesRequired
                      ? t("branch.posSettlementNotesPlaceholderRequired")
                      : t("branch.posSettlementNotesPlaceholder")
                  }
                />
                {notesRequired ? (
                  <p className="-mt-2 text-xs leading-snug text-zinc-600">
                    {t("branch.posSettlementNotesRequiredHint")}
                  </p>
                ) : null}
              </FormSection>
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={createBranch.isPending}>
                {createBranch.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
