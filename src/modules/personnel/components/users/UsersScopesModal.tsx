"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Personnel } from "@/types/personnel";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  UserListItem,
  WarehouseScopeAssignment,
} from "@/types/user";

/**
 * Kullanıcı veri kapsam (branch/warehouse/personnel) editörü modal'ı. Saf sunum +
 * draft yönetimi. Veri ve helper'lar dışarıdan gelir.
 */
type UserScopesData = {
  branchOptions: { id: number; name: string }[];
  warehouseOptions: { id: number; name: string }[];
  personnelOptions: { id: number; name?: string | null; fullName?: string | null }[];
  branchScopes?: BranchScopeAssignment[];
  warehouseScopes?: WarehouseScopeAssignment[];
  personnelScopes?: PersonnelScopeAssignment[];
};

/** Sol guide kolonu — UsersScreen üst-seviye yardımcısından kopyalandı. */
function DataScopesGuideColumn({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-semibold text-violet-950">{title}</p>
      <ol className="mt-2 list-none space-y-2.5 p-0">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-2.5 text-xs leading-snug text-zinc-700">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-200/90 text-[10px] font-bold tabular-nums text-violet-950"
              aria-hidden
            >
              {i + 1}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Props = {
  user: UserListItem | null;
  onClose: () => void;

  loading: boolean;
  saving: boolean;
  onSave: () => void;
  hasChanges: boolean;

  data: UserScopesData | undefined;
  personnel: Personnel[];

  branchScopeLevelOptions: SelectOption[];
  warehouseScopeLevelOptions: SelectOption[];
  personnelScopeLevelOptions: SelectOption[];

  branchScopeDraft: BranchScopeAssignment[];
  setBranchScopeDraft: React.Dispatch<React.SetStateAction<BranchScopeAssignment[]>>;
  warehouseScopeDraft: WarehouseScopeAssignment[];
  setWarehouseScopeDraft: React.Dispatch<React.SetStateAction<WarehouseScopeAssignment[]>>;
  personnelScopeDraft: PersonnelScopeAssignment[];
  setPersonnelScopeDraft: React.Dispatch<React.SetStateAction<PersonnelScopeAssignment[]>>;

  personnelAtBranchSorted: (
    personnel: Personnel[],
    branchId: number,
    collatorLocale: string
  ) => Personnel[];
};

export function UsersScopesModal(p: Props) {
  const {
    user: scopesModalUser,
    onClose: closeScopesModal,
    loading: isUserScopesLoading,
    saving,
    onSave: saveUserScopes,
    hasChanges: hasScopesDraftChanges,
    data: userScopesData,
    personnel,
    branchScopeLevelOptions,
    warehouseScopeLevelOptions,
    personnelScopeLevelOptions,
    branchScopeDraft,
    setBranchScopeDraft,
    warehouseScopeDraft,
    setWarehouseScopeDraft,
    personnelScopeDraft,
    setPersonnelScopeDraft,
    personnelAtBranchSorted,
  } = p;
  const { t, locale } = useI18n();
  const putUserDataScopes = { isPending: saving } as const;
  const collatorLocale = locale;

  return (
<Modal
  open={Boolean(scopesModalUser)}
  onClose={closeScopesModal}
  titleId="user-scopes-title"
  title={t("users.scopesModalTitle")}
  description={t("users.scopesModalHint")}
  closeButtonLabel={t("common.close")}
  wide
  wideFixedHeight
>
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-2 pt-2 sm:px-6 [-webkit-overflow-scrolling:touch]">
    {scopesModalUser ? (
      <p className="text-xs text-zinc-600 sm:text-sm">
        <span className="font-semibold text-zinc-900">{scopesModalUser.username}</span>
        {" · "}
        {scopesModalUser.role}
      </p>
    ) : null}

    <div className="rounded-xl border border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-white to-violet-50/35 p-4 shadow-sm">
      <p className="text-sm font-semibold text-violet-950">{t("users.scopesHelpPanelTitle")}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
        {t("users.scopesHelpPanelSubtitle")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DataScopesGuideColumn
          title={t("users.branchScopesTitle")}
          steps={[
            t("users.scopesHelpBranchStep1"),
            t("users.scopesHelpBranchStep2"),
            t("users.scopesHelpBranchStep3"),
          ]}
        />
        <DataScopesGuideColumn
          title={t("users.warehouseScopesTitle")}
          steps={[
            t("users.scopesHelpWarehouseStep1"),
            t("users.scopesHelpWarehouseStep2"),
            t("users.scopesHelpWarehouseStep3"),
          ]}
        />
        <DataScopesGuideColumn
          title={t("users.personnelScopesTitle")}
          steps={[
            t("users.scopesHelpPersonnelStep1"),
            t("users.scopesHelpPersonnelStep2"),
            t("users.scopesHelpPersonnelStep3"),
            t("users.scopesHelpPersonnelStep4"),
          ]}
        />
      </div>
    </div>

    {isUserScopesLoading || !userScopesData ? (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        {t("common.loading")}
      </div>
    ) : (
      <div className="space-y-4">
        <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{t("users.branchScopesTitle")}</h3>
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
              onClick={() =>
                setBranchScopeDraft((prev) => [
                  ...prev,
                  { branchId: userScopesData.branchOptions[0]?.id ?? 0, scopeLevel: "SUMMARY" },
                ])
              }
            >
              {t("common.add")}
            </Button>
          </div>
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:gap-2 sm:px-1 sm:pb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {t("users.scopesColumnTarget")}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {t("users.scopesColumnAccessLevel")}
            </span>
            <span className="sr-only">{t("common.remove")}</span>
          </div>
          <div className="space-y-2">
            {branchScopeDraft.map((item, idx) => (
              <div
                key={`branch-${idx}`}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
              >
                <Select
                  name={`branch-scope-branch-${idx}`}
                  ariaLabel={t("users.branchScopesTitle")}
                  options={userScopesData.branchOptions.map((x) => ({
                    value: String(x.id),
                    label: x.name,
                  }))}
                  value={String(item.branchId)}
                  onBlur={() => {}}
                  onChange={(e) =>
                    setBranchScopeDraft((prev) =>
                      prev.map((row, rowIdx) =>
                        rowIdx === idx ? { ...row, branchId: Number(e.target.value) } : row
                      )
                    )
                  }
                />
                <Select
                  name={`branch-scope-level-${idx}`}
                  ariaLabel={t("users.branchScopeLevel")}
                  options={branchScopeLevelOptions}
                  value={item.scopeLevel}
                  onBlur={() => {}}
                  onChange={(e) =>
                    setBranchScopeDraft((prev) =>
                      prev.map((row, rowIdx) =>
                        rowIdx === idx
                          ? { ...row, scopeLevel: e.target.value as BranchScopeAssignment["scopeLevel"] }
                          : row
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                  onClick={() =>
                    setBranchScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                  }
                >
                  {t("common.remove")}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{t("users.warehouseScopesTitle")}</h3>
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
              onClick={() =>
                setWarehouseScopeDraft((prev) => [
                  ...prev,
                  { warehouseId: userScopesData.warehouseOptions[0]?.id ?? 0, scopeLevel: "READ" },
                ])
              }
            >
              {t("common.add")}
            </Button>
          </div>
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:gap-2 sm:px-1 sm:pb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {t("users.scopesColumnTarget")}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {t("users.scopesColumnAccessLevel")}
            </span>
            <span className="sr-only">{t("common.remove")}</span>
          </div>
          <div className="space-y-2">
            {warehouseScopeDraft.map((item, idx) => (
              <div
                key={`warehouse-${idx}`}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
              >
                <Select
                  name={`warehouse-scope-warehouse-${idx}`}
                  ariaLabel={t("users.warehouseScopesTitle")}
                  options={userScopesData.warehouseOptions.map((x) => ({
                    value: String(x.id),
                    label: x.name,
                  }))}
                  value={String(item.warehouseId)}
                  onBlur={() => {}}
                  onChange={(e) =>
                    setWarehouseScopeDraft((prev) =>
                      prev.map((row, rowIdx) =>
                        rowIdx === idx ? { ...row, warehouseId: Number(e.target.value) } : row
                      )
                    )
                  }
                />
                <Select
                  name={`warehouse-scope-level-${idx}`}
                  ariaLabel={t("users.warehouseScopeLevel")}
                  options={warehouseScopeLevelOptions}
                  value={item.scopeLevel}
                  onBlur={() => {}}
                  onChange={(e) =>
                    setWarehouseScopeDraft((prev) =>
                      prev.map((row, rowIdx) =>
                        rowIdx === idx
                          ? {
                              ...row,
                              scopeLevel:
                                e.target.value as WarehouseScopeAssignment["scopeLevel"],
                            }
                          : row
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                  onClick={() =>
                    setWarehouseScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                  }
                >
                  {t("common.remove")}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{t("users.personnelScopesTitle")}</h3>
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-h-9 w-full shrink-0 px-3 text-xs sm:w-auto"
              onClick={() =>
                setPersonnelScopeDraft((prev) => [
                  ...prev,
                  { personnelId: userScopesData.personnelOptions[0]?.id ?? null, branchId: null, scopeLevel: "SELF" },
                ])
              }
            >
              {t("common.add")}
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white/80 p-3 text-xs leading-relaxed text-zinc-700 sm:text-sm">
            <p className="font-semibold text-zinc-900">{t("users.howToBranchResponsibleTitle")}</p>
            <p>{t("users.howToBranchResponsibleBody")}</p>
            <p className="pt-1 font-semibold text-zinc-900">{t("users.howToPersonnelScopeTitle")}</p>
            <p>{t("users.howToPersonnelScopeBody")}</p>
          </div>
          {(userScopesData.personnelScopes ?? []).some((x) => x.source === "BRANCH_RESPONSIBLE") ? (
            <div className="space-y-2">
              {(userScopesData.personnelScopes ?? []).filter((x) => x.source === "BRANCH_RESPONSIBLE")
                .length > 1 ? (
                <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                  {t("users.personnelScopeImpliedMultiBranchNote")}
                </p>
              ) : null}
              {(userScopesData.personnelScopes ?? [])
                .filter((x) => x.source === "BRANCH_RESPONSIBLE")
                .map((item) => {
                  const bName =
                    userScopesData.branchOptions.find((b) => b.id === item.branchId)?.name ??
                    `#${item.branchId ?? ""}`;
                  const bid = item.branchId ?? 0;
                  const covered =
                    bid > 0 ? personnelAtBranchSorted(personnel, bid, locale) : [];
                  return (
                    <div
                      key={`implied-p-${item.branchId}`}
                      className="rounded-lg border border-dashed border-violet-300 bg-violet-50/70 px-3 py-2.5 text-sm"
                    >
                      <p className="font-semibold text-violet-950">{t("users.personnelScopeImpliedTitle")}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-800 sm:text-sm">
                        <span className="font-medium text-zinc-900">{t("users.personnelScopeImpliedPrefix")}</span>{" "}
                        {bName}. {t("users.personnelScopeImpliedDetail")}
                      </p>
                      <div className="mt-2 border-t border-violet-200/80 pt-2">
                        <p className="text-xs font-medium text-violet-950">
                          {t("users.personnelScopeImpliedCoveredTitle")}{" "}
                          <span className="font-normal text-zinc-600">
                            (
                            {t("users.personnelScopeImpliedCoveredCount").replace(
                              "{count}",
                              String(covered.length)
                            )}
                            )
                          </span>
                        </p>
                        {covered.length === 0 ? (
                          <p className="mt-1 text-xs text-zinc-600">{t("users.personnelScopeImpliedCoveredEmpty")}</p>
                        ) : (
                          <ul className="mt-1 max-h-36 overflow-y-auto rounded-md border border-violet-100 bg-white/90 px-2 py-1.5 text-xs text-zinc-800">
                            {covered.map((p) => (
                              <li key={p.id} className="truncate py-0.5">
                                {personnelDisplayName(p)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">{t("users.personnelScopeImpliedRemoveHint")}</p>
                    </div>
                  );
                })}
            </div>
          ) : null}
          <div className="space-y-2">
            {personnelScopeDraft.map((item, idx) => (
              <div key={`personnel-${idx}`} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-2">
                <Select
                  name={`personnel-scope-target-${idx}`}
                  ariaLabel={t("users.personnelScopeTarget")}
                  options={[
                    { value: "PERSONNEL", label: t("users.scopeTargetPersonnel") },
                    { value: "BRANCH", label: t("users.scopeTargetBranch") },
                  ]}
                  value={item.personnelId ? "PERSONNEL" : "BRANCH"}
                  onBlur={() => {}}
                  onChange={(e) =>
                    setPersonnelScopeDraft((prev) =>
                      prev.map((row, rowIdx) =>
                        rowIdx === idx
                          ? e.target.value === "PERSONNEL"
                            ? { ...row, personnelId: userScopesData.personnelOptions[0]?.id ?? null, branchId: null }
                            : { ...row, personnelId: null, branchId: userScopesData.branchOptions[0]?.id ?? null }
                          : row
                      )
                    )
                  }
                />
                {item.personnelId ? (
                  <Select
                    name={`personnel-scope-personnel-${idx}`}
                    ariaLabel={t("users.scopeTargetPersonnel")}
                    options={userScopesData.personnelOptions.map((x) => ({
                      value: String(x.id),
                      label: x.name ?? "",
                    }))}
                    value={String(item.personnelId)}
                    onBlur={() => {}}
                    onChange={(e) =>
                      setPersonnelScopeDraft((prev) =>
                        prev.map((row, rowIdx) =>
                          rowIdx === idx ? { ...row, personnelId: Number(e.target.value), branchId: null } : row
                        )
                      )
                    }
                  />
                ) : (
                  <Select
                    name={`personnel-scope-branch-${idx}`}
                    ariaLabel={t("users.scopeTargetBranch")}
                    options={userScopesData.branchOptions.map((x) => ({
                      value: String(x.id),
                      label: x.name,
                    }))}
                    value={String(item.branchId ?? "")}
                    onBlur={() => {}}
                    onChange={(e) =>
                      setPersonnelScopeDraft((prev) =>
                        prev.map((row, rowIdx) =>
                          rowIdx === idx ? { ...row, branchId: Number(e.target.value), personnelId: null } : row
                        )
                      )
                    }
                  />
                )}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Select
                    name={`personnel-scope-level-${idx}`}
                    ariaLabel={t("users.personnelScopeLevel")}
                    options={personnelScopeLevelOptions}
                    value={item.scopeLevel}
                    onBlur={() => {}}
                    onChange={(e) =>
                      setPersonnelScopeDraft((prev) =>
                        prev.map((row, rowIdx) =>
                          rowIdx === idx
                            ? {
                                ...row,
                                scopeLevel:
                                  e.target.value as PersonnelScopeAssignment["scopeLevel"],
                              }
                            : row
                        )
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 min-h-11 w-full px-3 text-xs sm:w-auto"
                    onClick={() =>
                      setPersonnelScopeDraft((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                    }
                  >
                    {t("common.remove")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )}
    </div>

    <div className="flex shrink-0 justify-stretch border-t border-zinc-200 bg-white px-4 py-3 sm:justify-end sm:px-6">
      <Button
        type="button"
        className="min-h-11 w-full min-w-0 sm:w-auto sm:min-w-[130px]"
        onClick={() => void saveUserScopes()}
        disabled={!hasScopesDraftChanges || putUserDataScopes.isPending}
      >
        {putUserDataScopes.isPending ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  </div>
</Modal>

  );
}
