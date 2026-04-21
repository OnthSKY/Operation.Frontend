"use client";

import { useI18n } from "@/i18n/context";
import {
  requiresPosDestinationNotes,
  posSettlementBeneficiaryLabel,
} from "@/modules/branch/lib/pos-settlement-beneficiary";
import {
  usePatronFlowPosProfiles,
  useUpsertBranchPosSettlementProfile,
} from "@/modules/reports/hooks/useReportsQueries";
import type { Branch } from "@/types/branch";
import type { BranchPosSettlementList } from "@/types/patron-flow";
import type { Personnel } from "@/types/personnel";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useMemo, useState } from "react";

const TITLE_ID = "branch-pos-profile-title";

type Props = {
  branch: Branch | null;
  personnel: Personnel[];
  onClose: () => void;
};

type Defaults = {
  beneficiaryType: string;
  beneficiaryPersonnelId: string;
  notes: string;
};

type InnerProps = {
  branch: Branch;
  defaults: Defaults;
  personnel: Personnel[];
  listData: BranchPosSettlementList;
  onClose: () => void;
};

function BranchPosSettlementProfileFormInner({
  branch,
  defaults,
  personnel,
  listData,
  onClose,
}: InnerProps) {
  const { t, locale } = useI18n();
  const upsertProfile = useUpsertBranchPosSettlementProfile();

  const [beneficiaryType, setBeneficiaryType] = useState(defaults.beneficiaryType);
  const [beneficiaryPersonnelId, setBeneficiaryPersonnelId] = useState(
    defaults.beneficiaryPersonnelId
  );
  const [profileNotes, setProfileNotes] = useState(defaults.notes);

  const personnelForBranch = useMemo(
    () => personnel.filter((p) => p.branchId === branch.id),
    [personnel, branch.id]
  );

  const personnelSelectOptions = useMemo(() => {
    const base = personnelForBranch.map((p) => ({
      value: String(p.id),
      label: p.fullName,
    }));
    const prof = listData.profiles.find((p) => p.branchId === branch.id);
    const pid = prof?.beneficiaryPersonnelId;
    if (
      pid &&
      prof?.beneficiaryPersonnelName &&
      !base.some((o) => o.value === String(pid))
    ) {
      base.unshift({
        value: String(pid),
        label: prof.beneficiaryPersonnelName,
      });
    }
    return [
      { value: "", label: t("reports.patronFlowPersonnelPlaceholder") },
      ...base,
    ];
  }, [personnelForBranch, listData.profiles, branch.id, t]);

  const beneficiaryTypeOptions = useMemo(
    () => [
      { value: "PATRON", label: posSettlementBeneficiaryLabel(t, "PATRON") },
      { value: "FRANCHISE", label: posSettlementBeneficiaryLabel(t, "FRANCHISE") },
      { value: "JOINT_VENTURE", label: posSettlementBeneficiaryLabel(t, "JOINT_VENTURE") },
      {
        value: "BRANCH_PERSONNEL",
        label: posSettlementBeneficiaryLabel(t, "BRANCH_PERSONNEL"),
      },
      { value: "OTHER", label: posSettlementBeneficiaryLabel(t, "OTHER") },
    ],
    [t]
  );

  const profileNotesRequired = requiresPosDestinationNotes(beneficiaryType);

  const missingProfile = listData.branchesWithoutProfile.some((o) => o.id === branch.id);

  const onSave = async () => {
    const bt = beneficiaryType.toUpperCase();
    if (requiresPosDestinationNotes(bt) && !profileNotes.trim()) {
      notify.error(t("branch.posSettlementNotesRequired"));
      return;
    }
    let pid: number | null = null;
    if (bt === "BRANCH_PERSONNEL") {
      const n = Number.parseInt(beneficiaryPersonnelId, 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("reports.patronFlowPersonnelRequired"));
        return;
      }
      pid = n;
    }
    try {
      await upsertProfile.mutateAsync({
        branchId: branch.id,
        body: {
          beneficiaryType: bt,
          beneficiaryPersonnelId: pid,
          notes: profileNotes.trim() ? profileNotes.trim() : null,
        },
      });
      notify.success(t("reports.patronFlowProfileSaved"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4 pt-1">
      {missingProfile ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
          {t("branch.posProfileUnsetHint")}
        </p>
      ) : null}
      <Select
        name="branchPosBeneficiaryType"
        label={t("reports.patronFlowBeneficiaryTypeLabel")}
        options={beneficiaryTypeOptions}
        value={beneficiaryType}
        onChange={(e) => setBeneficiaryType(e.target.value)}
        onBlur={() => {}}
        className="min-h-11 sm:min-h-10 sm:text-sm"
      />
      <Select
        name="branchPosBeneficiaryPersonnel"
        label={t("reports.patronFlowPersonnelLabel")}
        options={personnelSelectOptions}
        value={beneficiaryPersonnelId}
        onChange={(e) => setBeneficiaryPersonnelId(e.target.value)}
        onBlur={() => {}}
        disabled={beneficiaryType.toUpperCase() !== "BRANCH_PERSONNEL"}
        className="min-h-11 sm:min-h-10 sm:text-sm"
      />
      <div className="flex flex-col gap-1">
        <Input
          name="branchPosProfileNotes"
          label={t("reports.patronFlowNotesLabel")}
          labelRequired={profileNotesRequired}
          value={profileNotes}
          onChange={(e) => setProfileNotes(e.target.value)}
          onBlur={() => {}}
          maxLength={500}
          placeholder={
            profileNotesRequired
              ? t("branch.posSettlementNotesPlaceholderRequired")
              : t("reports.patronFlowNotesPlaceholder")
          }
        />
        {profileNotesRequired ? (
          <p className="text-xs leading-snug text-zinc-600">
            {t("branch.posSettlementNotesRequiredHint")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={upsertProfile.isPending}
          onClick={onClose}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          disabled={upsertProfile.isPending}
          onClick={() => void onSave()}
        >
          {t("reports.patronFlowSaveProfile")}
        </Button>
      </div>
      <p className="text-xs text-zinc-500" lang={locale}>
        {t("branch.posProfileReportsHint")}
      </p>
    </div>
  );
}

export function BranchPosSettlementProfileModal({
  branch,
  personnel,
  onClose,
}: Props) {
  const { t } = useI18n();
  const open = branch != null;
  const posProfiles = usePatronFlowPosProfiles(open);

  const defaults: Defaults | null = useMemo(() => {
    if (!branch) return null;
    if (posProfiles.isError) {
      return {
        beneficiaryType: "PATRON",
        beneficiaryPersonnelId: "",
        notes: "",
      };
    }
    if (!posProfiles.data) return null;
    const r = posProfiles.data.profiles.find((p) => p.branchId === branch.id);
    return {
      beneficiaryType: (r?.beneficiaryType ?? "PATRON").toUpperCase(),
      beneficiaryPersonnelId:
        r?.beneficiaryPersonnelId != null ? String(r.beneficiaryPersonnelId) : "",
      notes: r?.notes ?? "",
    };
  }, [branch, posProfiles.data, posProfiles.isError]);

  const formKey =
    branch && defaults
      ? `${branch.id}-${defaults.beneficiaryType}-${defaults.beneficiaryPersonnelId}-${defaults.notes}`
      : "closed";

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={
        branch
          ? `${t("reports.patronFlowPosSectionTitle")} — ${branch.name}`
          : t("reports.patronFlowPosSectionTitle")
      }
      description={t("reports.patronFlowPosSectionLead")}
      closeButtonLabel={t("common.close")}
      wide
    >
      {posProfiles.isError ? (
        <p className="px-4 pb-4 text-sm text-red-600">
          {t("reports.error")} {toErrorMessage(posProfiles.error)}
        </p>
      ) : null}
      {branch && posProfiles.data && defaults ? (
        <BranchPosSettlementProfileFormInner
          key={formKey}
          branch={branch}
          defaults={defaults}
          personnel={personnel}
          listData={posProfiles.data}
          onClose={onClose}
        />
      ) : posProfiles.isPending && branch ? (
        <p className="px-4 pb-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : null}
    </Modal>
  );
}
