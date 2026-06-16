"use client";

import { useI18n } from "@/i18n/context";
import { useUpdateBranchType } from "@/modules/branch/hooks/useBranchQueries";
import type { Branch, BranchType } from "@/types/branch";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { useEffect, useState } from "react";

type Props = {
  branch: Branch | null;
  onClose: () => void;
};

type Choice = { value: BranchType; emoji: string; title: string; desc: string };

const CHOICES: Choice[] = [
  {
    value: "OWNED",
    emoji: "🏠",
    title: "Öz Şube",
    desc: "Tam operasyonel. Günlük gelir, gider, gün sonu ve personel kayıtları yapılır.",
  },
  {
    value: "JOINT_VENTURE",
    emoji: "🤝",
    title: "Ortak Şube",
    desc: "Öz şube gibi çalışır. Ek olarak ortak adı + kar payı yüzdesi kayıt altındadır (otomatik dağıtım yapılmaz).",
  },
  {
    value: "FRANCHISE",
    emoji: "📦",
    title: "Franchise",
    desc: "Sadece sevkiyat, fatura ve tahsilat akışı. Şubeye doğrudan kasa hareketi (gelir/gider/gün sonu) yazılamaz.",
  },
];

const TITLE_ID = "branch-type-modal-title";

/**
 * Şube tipi değiştirme — mobile-first bottom-sheet, desktop'ta merkezde modal.
 * JOINT_VENTURE seçiminde ek alanlar (ortak adı + yüzde) açılır ve zorunlu olur.
 */
export function EditBranchTypeModal({ branch, onClose }: Props) {
  const { t } = useI18n();
  const mutation = useUpdateBranchType();

  const [type, setType] = useState<BranchType>("OWNED");
  const [partnerName, setPartnerName] = useState("");
  const [partnerShare, setPartnerShare] = useState("");

  useEffect(() => {
    if (!branch) return;
    setType((branch.branchType ?? "OWNED") as BranchType);
    setPartnerName(branch.partnerName ?? "");
    setPartnerShare(
      branch.partnerSharePercent != null ? String(branch.partnerSharePercent) : ""
    );
  }, [branch]);

  const isDirty =
    branch != null &&
    (type !== (branch.branchType ?? "OWNED") ||
      partnerName !== (branch.partnerName ?? "") ||
      partnerShare !==
        (branch.partnerSharePercent != null ? String(branch.partnerSharePercent) : ""));

  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: mutation.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const isJv = type === "JOINT_VENTURE";

  const onSave = async () => {
    if (!branch) return;
    if (isJv) {
      const name = partnerName.trim();
      const pct = Number(partnerShare);
      if (!name) {
        notify.error("Ortak şubede ortak adı zorunludur.");
        return;
      }
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        notify.error("Ortak payı yüzdesi 0 (hariç) ile 100 (dahil) arasında olmalıdır.");
        return;
      }
    }

    try {
      await mutation.mutateAsync({
        id: branch.id,
        input: {
          branchType: type,
          partnerName: isJv ? partnerName.trim() : null,
          partnerSharePercent: isJv ? Number(partnerShare) : null,
          partnerPersonnelId: null,
          rowVersion: branch.rowVersion,
        },
      });
      notify.success("Şube tipi güncellendi.");
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Modal
      open={branch != null}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={`${branch?.name ?? ""} — Şube Tipi`}
      description="Şubenin iş modeli geçmiş kayıtları etkilemez; yalnızca yeni işlemleri kısıtlar."
      className="w-full max-w-lg"
    >
      <ModalFormLayout
        body={
          <>
            <FormSection>
              <div role="radiogroup" aria-labelledby={TITLE_ID} className="flex flex-col gap-2.5">
                {CHOICES.map((c) => {
                  const selected = type === c.value;
                  return (
                    <label
                      key={c.value}
                      className={
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors " +
                        (selected
                          ? "border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200"
                          : "border-zinc-200 bg-white hover:bg-zinc-50")
                      }
                    >
                      <input
                        type="radio"
                        name="branchType"
                        value={c.value}
                        checked={selected}
                        onChange={() => setType(c.value)}
                        className="mt-1 h-4 w-4 shrink-0 border-zinc-300 text-indigo-600"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-zinc-900">
                          <span className="mr-1.5" aria-hidden>
                            {c.emoji}
                          </span>
                          {c.title}
                        </span>
                        <span className="text-xs leading-relaxed text-zinc-600">{c.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormSection>

            {isJv ? (
              <FormSection>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="mb-3 text-xs font-medium text-amber-900">
                    Ortak şube bilgileri (yalnızca kayıt amaçlıdır — otomatik aksiyon yapılmaz)
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        label="Ortak Adı"
                        labelRequired
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        maxLength={150}
                        placeholder="Ahmet Yılmaz"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <Input
                        label="Pay (%)"
                        labelRequired
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        max={100}
                        step={0.01}
                        value={partnerShare}
                        onChange={(e) => setPartnerShare(e.target.value)}
                        placeholder="40"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>
            ) : null}

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
              ⚠️ Tipi değiştirmek geçmiş kayıtları etkilemez. FRANCHISE seçildiğinde şubeye
              yeni gelir/gider/gün sonu kaydedilemez (sevkiyat ve cari fatura akışı devam eder).
            </div>
          </>
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="min-w-[120px]"
              onClick={requestClose}
              disabled={mutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-w-[120px]"
              onClick={onSave}
              busy={mutation.isPending}
              disabled={mutation.isPending || !isDirty}
            >
              {mutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" className="text-white/80" />
                  {t("common.saving")}
                </span>
              ) : (
                t("common.save")
              )}
            </Button>
          </>
        }
      />
    </Modal>
  );
}
