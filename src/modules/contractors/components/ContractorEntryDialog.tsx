"use client";

import { useState } from "react";
import type { ContractorPaymentSourceCode } from "@/modules/contractors/api/contractors-api";
import {
  useCreateContractorPayment,
  useCreateContractorWorkEntry,
  useUpdateContractorWorkEntry,
} from "@/modules/contractors/hooks/useContractorQueries";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { usePersonnelList, defaultPersonnelListFilters } from "@/modules/personnel/hooks/usePersonnelQueries";
import { useI18n } from "@/i18n/context";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatAmountInputOnBlur, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";

export type ContractorEntryMode = "work" | "payment";

/** İş düzenleme için açılışta doldurulacak kayıt; null/undefined => yeni iş. */
export type ContractorWorkEntryInitial = {
  id: number;
  workDate: string;
  description: string;
  amount: number | null;
  branchId: number | null;
};

type Props = {
  open: boolean;
  mode: ContractorEntryMode;
  /** Kişi belli ise id; liste sayfasından hızlı işlemde null → içeride kişi seçici gösterilir. */
  contractorId: number | null;
  workEntry?: ContractorWorkEntryInitial | null;
  /** Quick mode (contractorId null) için seçilebilir aktif kişiler. */
  contractors?: { id: number; displayName: string }[];
  /** Başka bir modalın üstünde mi açılıyor (ör. detay modalı). */
  nested?: boolean;
  onClose: () => void;
};

const SOURCES: ContractorPaymentSourceCode[] = ["PATRON", "BRANCH_REGISTER", "PERSONNEL_POCKET"];
const TITLE_ID = "contractor-entry-title";

export function ContractorEntryDialog({
  open,
  mode,
  contractorId,
  workEntry = null,
  contractors = [],
  nested = false,
  onClose,
}: Props) {
  const { t, locale } = useI18n();

  const needsPicker = contractorId == null;
  const [pickedId, setPickedId] = useState("");
  const activeContractorId = contractorId ?? (pickedId ? Number(pickedId) : 0);

  const createWork = useCreateContractorWorkEntry(activeContractorId);
  const updateWork = useUpdateContractorWorkEntry();
  const createPayment = useCreateContractorPayment(activeContractorId);

  const { data: branches = [] } = useBranchesList(open);
  const { data: personnelResult } = usePersonnelList({ ...defaultPersonnelListFilters, status: "active" }, open);
  const personnel = personnelResult?.items ?? [];

  // İş formu
  const [wDate, setWDate] = useState(localIsoDate());
  const [wDesc, setWDesc] = useState("");
  const [wAmount, setWAmount] = useState("");
  const [wAmountLater, setWAmountLater] = useState(false);
  const [wScope, setWScope] = useState<"general" | "branch">("general");
  const [wBranchId, setWBranchId] = useState("");

  // Ödeme formu
  const [pDate, setPDate] = useState(localIsoDate());
  const [pAmount, setPAmount] = useState("");
  const [pSource, setPSource] = useState<ContractorPaymentSourceCode>("PATRON");
  const [pBranchId, setPBranchId] = useState("");
  const [pPersonnelId, setPPersonnelId] = useState("");
  const [pDesc, setPDesc] = useState("");

  // Açılışta / mod-kayıt değişiminde formu sıfırla — render-aşaması reset deseni.
  const editId = mode === "work" ? workEntry?.id ?? null : null;
  const instanceKey = open ? `${contractorId ?? "pick"}:${mode}:${editId ?? "new"}` : null;
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const [baseline, setBaseline] = useState("");
  if (instanceKey !== prevKey) {
    setPrevKey(instanceKey);
    if (open) {
      setPickedId("");
      if (mode === "work" && workEntry) {
        setWDate(workEntry.workDate);
        setWDesc(workEntry.description);
        setWAmount(workEntry.amount != null ? formatAmountInputOnBlur(String(workEntry.amount), locale) : "");
        setWAmountLater(workEntry.amount == null);
        setWScope(workEntry.branchId != null ? "branch" : "general");
        setWBranchId(workEntry.branchId != null ? String(workEntry.branchId) : "");
      } else {
        setWDate(localIsoDate());
        setWDesc("");
        setWAmount("");
        setWAmountLater(false);
        setWScope("general");
        setWBranchId("");
      }
      setPDate(localIsoDate());
      setPAmount("");
      setPSource("PATRON");
      setPBranchId("");
      setPPersonnelId("");
      setPDesc("");
      setBaseline("");
    }
  }

  // Mevcut değerleri serialize edip baseline (boş = açılış) ile kıyaslayarak dirty hesapla.
  const current =
    mode === "work"
      ? JSON.stringify([pickedId, wDate, wDesc, wAmount, wAmountLater, wScope, wBranchId])
      : JSON.stringify([pickedId, pDate, pAmount, pSource, pBranchId, pPersonnelId, pDesc]);
  const isDirty = open && baseline !== "" && current !== baseline;

  // İlk render'dan sonra baseline'ı yakala (effect yerine: baseline boşken bir kez set et).
  if (open && baseline === "" && instanceKey === prevKey) {
    setBaseline(current);
  }

  const sourceLabel = (code: ContractorPaymentSourceCode) => t(`contractors.source.${code}`);
  const isSaving = createWork.isPending || updateWork.isPending || createPayment.isPending;

  const requireContractor = () => {
    if (needsPicker && !activeContractorId) {
      notify.error(t("contractors.pickContractorRequired"));
      return false;
    }
    return true;
  };

  const submitWork = async () => {
    if (!requireContractor()) return;
    const description = wDesc.trim();
    if (!description) {
      notify.error(t("common.required"));
      return;
    }
    let amount: number | null = null;
    if (!wAmountLater) {
      const parsed = parseLocaleAmount(wAmount, locale);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        notify.error(t("contractors.amountInvalid"));
        return;
      }
      amount = parsed;
    }
    if (wScope === "branch" && !wBranchId) {
      notify.error(t("contractors.scopeBranchRequired"));
      return;
    }
    const branchId = wScope === "branch" && wBranchId ? Number(wBranchId) : null;
    try {
      if (editId != null) {
        await updateWork.mutateAsync({ entryId: editId, workDate: wDate, description, amount, branchId });
        notify.success(t("contractors.toastUpdated"));
      } else {
        await createWork.mutateAsync({ workDate: wDate, description, amount, branchId });
        notify.success(t("contractors.toastWorkAdded"));
      }
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const submitPayment = async () => {
    if (!requireContractor()) return;
    const amount = parseLocaleAmount(pAmount, locale);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(t("contractors.amountInvalid"));
      return;
    }
    if (pSource === "BRANCH_REGISTER" && !pBranchId) {
      notify.error(t("contractors.branchRequired"));
      return;
    }
    if (pSource === "PERSONNEL_POCKET" && !pPersonnelId) {
      notify.error(t("contractors.personnelRequired"));
      return;
    }
    try {
      await createPayment.mutateAsync({
        paymentDate: pDate,
        amount,
        paymentSource: pSource,
        branchId: pSource === "BRANCH_REGISTER" ? Number(pBranchId) : null,
        paidByPersonnelId: pSource === "PERSONNEL_POCKET" ? Number(pPersonnelId) : null,
        description: pDesc.trim() || null,
      });
      notify.success(t("contractors.toastPaymentAdded"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: isSaving,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  const title =
    mode === "payment"
      ? t("contractors.paymentAddTitle")
      : editId != null
        ? t("contractors.workEditTitle")
        : t("contractors.workAddTitle");
  const description =
    mode === "payment" ? t("contractors.paymentDialogDescription") : t("contractors.workDialogDescription");

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={title}
      description={description}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-xl"
      nested={nested}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "work") void submitWork();
          else void submitPayment();
        }}
      >
        <ModalFormLayout
          body={
            <>
              {needsPicker ? (
                <FormSection>
                  <Select
                    label={t("contractors.contractor")}
                    labelRequired
                    name="entry-contractor"
                    value={pickedId}
                    onChange={(e) => setPickedId(e.target.value)}
                    onBlur={() => {}}
                    options={[
                      { value: "", label: t("contractors.selectContractor") },
                      ...contractors.map((c) => ({ value: String(c.id), label: c.displayName })),
                    ]}
                  />
                </FormSection>
              ) : null}

              {mode === "work" ? (
                <FormSection>
                  <Input type="date" label={t("contractors.workDate")} value={wDate} onChange={(e) => setWDate(e.target.value)} />
                  <div>
                    <Input
                      label={t("contractors.amount")}
                      labelRequired={!wAmountLater}
                      value={wAmount}
                      onChange={(e) => setWAmount(e.target.value)}
                      onBlur={(e) => setWAmount(formatAmountInputOnBlur(e.target.value, locale))}
                      inputMode="decimal"
                      disabled={wAmountLater}
                      placeholder={wAmountLater ? t("contractors.amountWaiting") : undefined}
                    />
                    <label className="mt-2 flex cursor-pointer items-center gap-2">
                      <Checkbox checked={wAmountLater} onCheckedChange={setWAmountLater} aria-label={t("contractors.amountLater")} />
                      <span className="text-xs text-zinc-600">{t("contractors.amountLater")}</span>
                    </label>
                  </div>
                  <Input label={t("contractors.workDescription")} labelRequired value={wDesc} onChange={(e) => setWDesc(e.target.value)} />
                  <Select
                    label={t("contractors.workScope")}
                    name="work-scope"
                    value={wScope}
                    onChange={(e) => setWScope(e.target.value as "general" | "branch")}
                    onBlur={() => {}}
                    options={[
                      { value: "general", label: t("contractors.scopeGeneral") },
                      { value: "branch", label: t("contractors.scopeBranch") },
                    ]}
                  />
                  {wScope === "branch" ? (
                    <Select
                      label={t("contractors.branch")}
                      labelRequired
                      name="work-branch"
                      value={wBranchId}
                      onChange={(e) => setWBranchId(e.target.value)}
                      onBlur={() => {}}
                      options={[
                        { value: "", label: t("contractors.selectBranch") },
                        ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                      ]}
                    />
                  ) : null}
                </FormSection>
              ) : (
                <FormSection>
                  <Input type="date" label={t("contractors.paymentDate")} value={pDate} onChange={(e) => setPDate(e.target.value)} />
                  <Input
                    label={t("contractors.amount")}
                    labelRequired
                    value={pAmount}
                    onChange={(e) => setPAmount(e.target.value)}
                    onBlur={(e) => setPAmount(formatAmountInputOnBlur(e.target.value, locale))}
                    inputMode="decimal"
                  />
                  <Select
                    label={t("contractors.paymentSource")}
                    name="payment-source"
                    value={pSource}
                    onChange={(e) => setPSource(e.target.value as ContractorPaymentSourceCode)}
                    onBlur={() => {}}
                    options={SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }))}
                  />
                  {pSource === "BRANCH_REGISTER" ? (
                    <Select
                      label={t("contractors.branch")}
                      labelRequired
                      name="payment-branch"
                      value={pBranchId}
                      onChange={(e) => setPBranchId(e.target.value)}
                      onBlur={() => {}}
                      options={[
                        { value: "", label: t("contractors.selectBranch") },
                        ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                      ]}
                    />
                  ) : null}
                  {pSource === "PERSONNEL_POCKET" ? (
                    <Select
                      label={t("contractors.personnel")}
                      labelRequired
                      name="payment-personnel"
                      value={pPersonnelId}
                      onChange={(e) => setPPersonnelId(e.target.value)}
                      onBlur={() => {}}
                      options={[
                        { value: "", label: t("contractors.selectPersonnel") },
                        ...personnel.map((p) => ({ value: String(p.id), label: p.fullName })),
                      ]}
                    />
                  ) : null}
                  <Input label={t("contractors.descriptionOptional")} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                </FormSection>
              )}
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" className="min-w-[120px]" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-w-[120px]" disabled={isSaving}>
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
