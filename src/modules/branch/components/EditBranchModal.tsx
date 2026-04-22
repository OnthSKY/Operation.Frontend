"use client";

import { useI18n } from "@/i18n/context";
import { useUpdateBranch } from "@/modules/branch/hooks/useBranchQueries";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = { name: string; address: string };

type Props = {
  open: boolean;
  branch: Branch | null;
  staff: Personnel[];
  onClose: () => void;
};

const TITLE_ID = "edit-branch-title";

export function EditBranchModal({ open, branch, staff, onClose }: Props) {
  const { t } = useI18n();
  const updateBranchMut = useUpdateBranch();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({ defaultValues: { name: "", address: "" } });

  const activeStaff = useMemo(
    () => staff.filter((p) => !p.isDeleted && p.branchId === branch?.id),
    [staff, branch?.id]
  );

  useEffect(() => {
    if (!open) {
      reset({ name: "", address: "" });
      setSelectedIds(new Set());
      return;
    }
    if (!branch) return;
    reset({
      name: branch.name,
      address: branch.address ?? "",
    });
    setSelectedIds(new Set(branch.responsibles.map((r) => r.personnelId)));
  }, [open, branch, reset]);

  const togglePid = (pid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!branch) return;
    try {
      await updateBranchMut.mutateAsync({
        id: branch.id,
        input: {
          name: values.name.trim(),
          address: values.address.trim() || null,
          responsiblePersonnelIds: [...selectedIds].sort((a, b) => a - b),
        },
      });
      notify.success(t("toast.branchUpdated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: updateBranchMut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open && branch != null}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("branch.editTitle")}
      description={t("branch.editHint")}
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
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="edit-branch-address" className="text-sm font-medium text-zinc-700">
                    {t("branch.fieldAddress")}
                  </label>
                  <textarea
                    id="edit-branch-address"
                    rows={3}
                    className={cn(
                      "min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
                    )}
                    maxLength={2000}
                    {...register("address")}
                  />
                </div>
              </FormSection>
              <FormSection>
                <p className="text-sm font-medium text-zinc-700">{t("branch.fieldResponsibles")}</p>
                <p className="text-xs text-zinc-500">{t("branch.responsiblesHint")}</p>
                {activeStaff.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("branch.responsiblesEmptyStaff")}</p>
                ) : (
                  <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                    {activeStaff.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300"
                            checked={selectedIds.has(p.id)}
                            onChange={() => togglePid(p.id)}
                          />
                          <span className="min-w-0 truncate">{p.fullName}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={updateBranchMut.isPending}>
                {updateBranchMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
