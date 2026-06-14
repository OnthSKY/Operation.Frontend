"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { ShareAllocateIcon } from "@/shared/ui/EyeIcon";
import { formatAmountInputOnBlur } from "@/shared/lib/locale-amount";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  GeneralOverheadPoolRow,
} from "@/modules/general-overhead/api/general-overhead-api";

export type AllocLine = {
  key: string;
  branchId: string;
  amount: string;
};

type CompareResult = {
  sumCents: number;
  targetCents: number | null;
  status: "no_target" | "match" | "short" | "over";
};

/**
 * Pool dağıtım modal'ı: para birimi başına şube satırları + her satıra tutar atama.
 * Çoklu para varsa her biri için ayrı bucket.
 */
type Props = {
  pool: GeneralOverheadPoolRow | null;
  onClose: () => void;
  allocLinesByCur: Record<string, AllocLine[]>;
  setAllocLinesByCur: React.Dispatch<React.SetStateAction<Record<string, AllocLine[]>>>;
  allocBranchPaid: boolean;
  setAllocBranchPaid: (v: boolean) => void;
  saving: boolean;
  onSubmit: () => void;

  loc: "tr" | "en";
  locale: "tr" | "en";
  poolAmountsList: (p: GeneralOverheadPoolRow) => { currencyCode: string; amount: number }[];
  allocPoolSingleCurrency: boolean;
  /** Aynı şubeyi tüm para birimi gruplarına yansıt. */
  applyAllocBranchChangeGlobal: (
    prev: Record<string, AllocLine[]>,
    cur: string,
    key: string,
    v: string
  ) => Record<string, AllocLine[]>;
  branchOptionsForAllocRowGlobal: (
    state: Record<string, AllocLine[]>,
    cur: string,
    key: string,
    base: SelectOption[]
  ) => SelectOption[];
  branchSelectOptions: SelectOption[];
  branchesLoading: boolean;
  equalSplit: (cur: string, total: number) => void;
  equalSplitAllBranches: (cur: string, total: number) => void;
  compareAllocDraftSum: (
    lines: AllocLine[],
    target: number | undefined,
    loc: "tr" | "en"
  ) => CompareResult;
  addAllocRow: (cur: string) => void;
  removeAllocRow: (cur: string, key: string) => void;
  AllocationDraftTotalsBar: React.ComponentType<{
    compare: CompareResult;
    locale: "tr" | "en";
    currencyCode: string;
    t: (k: string) => string;
    variant: "allocate" | "create";
  }>;
};

export function GohAllocateModal(p: Props) {
  const { t } = useI18n();
  const allocPool = p.pool;
  const setAllocPool = (_: GeneralOverheadPoolRow | null) => p.onClose();
  const allocMut = { isPending: p.saving } as const;
  const submitAllocate = p.onSubmit;
  const setAllocBranchPaid = p.setAllocBranchPaid;
  const setAllocLinesByCur = p.setAllocLinesByCur;
  const allocBranchPaid = p.allocBranchPaid;
  const allocLinesByCur = p.allocLinesByCur;
  const loc = p.loc;
  const locale = p.locale;
  const poolAmountsList = p.poolAmountsList;
  const compareAllocDraftSum = p.compareAllocDraftSum;
  const allocPoolSingleCurrency = p.allocPoolSingleCurrency;
  const applyAllocBranchChangeGlobal = p.applyAllocBranchChangeGlobal;
  const branchOptionsForAllocRowGlobal = p.branchOptionsForAllocRowGlobal;
  const addAllocRow = p.addAllocRow;
  const removeAllocRow = p.removeAllocRow;
  const AllocationDraftTotalsBar = p.AllocationDraftTotalsBar;
  const equalSplit = p.equalSplit;
  const equalSplitAllBranches = p.equalSplitAllBranches;
  const branchSelectOptions = p.branchSelectOptions;
  const branchesQ = { isPending: p.branchesLoading } as const;

  return (
<Modal
  open={allocPool != null}
  onClose={() => setAllocPool(null)}
  titleId="goh-alloc"
  title={t("generalOverhead.modalAllocateTitle")}
  wide
  closeButtonLabel={t("common.close")}
  className="!max-w-[min(100vw-0.5rem,88rem)]"
>
  {allocPool ? (
    <div className="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-6 sm:pb-6 sm:pt-0">
      <p className="text-sm text-zinc-700">
        <span className="font-semibold">{allocPool.title}</span>
        <span className="mx-1">—</span>
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
          {poolAmountsList(allocPool).map((a, i) => (
            <span key={a.currencyCode}>
              {i > 0 ? <span className="text-zinc-400">·</span> : null}
              {formatLocaleAmount(a.amount, locale, a.currencyCode)}
            </span>
          ))}
        </span>
      </p>
      <label
        className={cn(
          "flex cursor-pointer gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-3.5 sm:p-4",
          allocMut.isPending && "pointer-events-none opacity-60"
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900">
            {t("generalOverhead.allocBranchPaidLabel")}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-600">
            {t("generalOverhead.allocBranchPaidHint")}
          </span>
        </span>
        <Switch
          checked={allocBranchPaid}
          onCheckedChange={setAllocBranchPaid}
          disabled={allocMut.isPending}
          className="shrink-0 self-start sm:self-center"
          aria-label={t("generalOverhead.allocBranchPaidLabel")}
        />
      </label>
      <div className="flex flex-col gap-6">
        {poolAmountsList(allocPool).map((bucket) => {
          const lines = allocLinesByCur[bucket.currencyCode] ?? [];
          const draftCompare = compareAllocDraftSum(lines, bucket.amount, loc);
          return (
            <MobileListCard
              key={bucket.currencyCode}
              as="div"
              className="flex flex-col gap-0 bg-zinc-50/40"
            >
              <p className="mb-3 text-sm font-semibold text-zinc-900">
                {t("generalOverhead.allocateSectionCurrency").replace("{cc}", bucket.currencyCode)}
                <span className="ml-2 tabular-nums font-normal text-zinc-600">
                  {formatLocaleAmount(bucket.amount, locale, bucket.currencyCode)}
                </span>
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 flex-1 text-xs sm:flex-none"
                  onClick={() => addAllocRow(bucket.currencyCode)}
                >
                  {t("generalOverhead.addBranchRow")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 flex-1 text-xs sm:flex-none"
                  onClick={() => equalSplit(bucket.currencyCode, bucket.amount)}
                >
                  {t("generalOverhead.equalSplit")}
                </Button>
                {allocPoolSingleCurrency ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-10 flex-1 text-xs sm:flex-none"
                    disabled={branchesQ.isPending || allocMut.isPending}
                    onClick={() => equalSplitAllBranches(bucket.currencyCode, bucket.amount)}
                  >
                    {t("generalOverhead.equalSplitAllBranches")}
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(6.5rem,9rem)_auto] sm:items-end sm:gap-2">
                      <div className="min-w-0">
                        <Select
                          name={`gohAllocBranch-${bucket.currencyCode}-${line.key}`}
                          label={t("generalOverhead.fieldBranch")}
                          labelRequired
                          value={line.branchId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAllocLinesByCur((prev) =>
                              applyAllocBranchChangeGlobal(prev, bucket.currencyCode, line.key, v)
                            );
                          }}
                          onBlur={() => {}}
                          options={branchOptionsForAllocRowGlobal(
                            allocLinesByCur,
                            bucket.currencyCode,
                            line.key,
                            branchSelectOptions
                          )}
                        />
                      </div>
                      <Input
                        label={t("generalOverhead.fieldShareAmount")}
                        labelRequired
                        value={line.amount}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAllocLinesByCur((prev) => ({
                            ...prev,
                            [bucket.currencyCode]: (prev[bucket.currencyCode] ?? []).map((x) =>
                              x.key === line.key ? { ...x, amount: v } : x
                            ),
                          }));
                        }}
                        onBlur={() =>
                          setAllocLinesByCur((prev) => ({
                            ...prev,
                            [bucket.currencyCode]: (prev[bucket.currencyCode] ?? []).map((x) =>
                              x.key === line.key
                                ? { ...x, amount: formatAmountInputOnBlur(x.amount, loc) }
                                : x
                            ),
                          }))
                        }
                        inputMode="decimal"
                        className="min-w-0"
                      />
                      <div className="flex justify-end sm:pb-0.5">
                        <button
                          type="button"
                          className={cn(trashIconActionButtonClass, "min-h-11 min-w-11")}
                          disabled={lines.length <= 1}
                          onClick={() => removeAllocRow(bucket.currencyCode, line.key)}
                          aria-label={t("common.delete")}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <AllocationDraftTotalsBar
                  compare={draftCompare}
                  locale={locale}
                  currencyCode={bucket.currencyCode}
                  t={t}
                  variant="allocate"
                />
              </div>
            </MobileListCard>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">{t("generalOverhead.allocateSumHint")}</p>
      <div className="mt-1 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => setAllocPool(null)}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="primary"
          className="min-h-11 inline-flex w-full items-center justify-center gap-2 sm:min-h-10 sm:w-auto"
          disabled={allocMut.isPending}
          onClick={() => void submitAllocate()}
        >
          <ShareAllocateIcon className="h-5 w-5 shrink-0 opacity-90" />
          <span>{t("generalOverhead.confirmAllocate")}</span>
        </Button>
      </div>
    </div>
  ) : null}
</Modal>

  );
}
