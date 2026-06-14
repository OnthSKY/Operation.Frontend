"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { ShareAllocateIcon } from "@/shared/ui/EyeIcon";
import { MobileListCard } from "@/shared/components/MobileListCard";
import type { AllocLine } from "@/modules/general-overhead/components/GohAllocateModal";

export type CreateAmountRow = { key: string; amount: string; currency: string };
type QuickPick = { main: string; category: string; labelKey: string };

/**
 * Yeni genel gider havuzu oluşturma modal'ı: başlık + tarih + tutar(lar) +
 * ana/alt kategori seçimi + opsiyonel anında dağıtım.
 *
 * Saf sunum — state ve helper'lar dışarıdan gelir.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: () => void;

  cTitle: string;
  setCTitle: (v: string) => void;
  cDate: string;
  setCDate: (v: string) => void;
  cNotes: string;
  setCNotes: (v: string) => void;

  createAmountRows: CreateAmountRow[];
  setCreateAmountRows: React.Dispatch<React.SetStateAction<CreateAmountRow[]>>;
  addCreateAmountRow: () => void;
  removeCreateAmountRow: (key: string) => void;

  cMain: string;
  setCMain: (v: string) => void;
  cCat: string;
  setCCat: (v: string) => void;
  currencySelectOptions: SelectOption[];

  allocateNow: boolean;
  setAllocateNow: (v: boolean) => void;
  createAllocLines: AllocLine[];
  setCreateAllocLines: React.Dispatch<React.SetStateAction<AllocLine[]>>;
  branchSelectOptions: SelectOption[];
  branchOptionsForCreateAllocRow: (
    state: AllocLine[],
    key: string,
    base: SelectOption[]
  ) => SelectOption[];
  addCreateAllocRow: () => void;
  removeCreateAllocRow: (key: string) => void;
  equalSplitCreate: () => void;
  equalSplitAllBranchesCreate: () => void;
  /** Anında dağıtım için ön kontrol (status). */
  createAllocCompare: {
    sumCents: number;
    targetCents: number | null;
    status: "no_target" | "match" | "short" | "over";
  };
  formatAmountInputOnBlur: (v: string, loc: "tr" | "en") => string;
  /** Tek para birimi olduğunda "şubelere eşit dağıt" butonu açıkça gösterilir. */
  hasSingleCurrencyTotal: boolean;
  /** Toplam hedef (anında dağıtım için referans). */
  totalAmountForAlloc: number;

  /** Mevcut "ortak alloc mut" — pending bilgisi. */
  allocPending: boolean;
  allocBranchPaid: boolean;
  setAllocBranchPaid: (v: boolean) => void;
  applyAllocBranchChange: (lines: AllocLine[], lineKey: string, branchId: string) => AllocLine[];
  branchOptionsForAllocRow: (
    lines: AllocLine[],
    lineKey: string,
    base: SelectOption[]
  ) => SelectOption[];
  /** Hızlı kategori seçimleri. */
  quickPicks: QuickPick[];
  currencyOpts: SelectOption[];

  loc: "tr" | "en";
  locale: "tr" | "en";
  branchesLoading: boolean;
  AllocationDraftTotalsBar: React.ComponentType<{
    compare: {
      sumCents: number;
      targetCents: number | null;
      status: "no_target" | "match" | "short" | "over";
    };
    locale: "tr" | "en";
    currencyCode: string;
    t: (k: string) => string;
    variant: "allocate" | "create";
  }>;
};

export function GohCreateModal(p: Props) {
  const { t } = useI18n();
  // Aliasing — block içeriğinde orchestrator değişken adlarıyla uyumlu olmak için.
  const createOpen = p.open;
  const setCreateOpen = (_: boolean) => p.onClose();
  const createMut = { isPending: p.saving } as const;
  const cTitle = p.cTitle, setCTitle = p.setCTitle;
  const cDate = p.cDate, setCDate = p.setCDate;
  const cNotes = p.cNotes, setCNotes = p.setCNotes;
  const createAmountRows = p.createAmountRows;
  const setCreateAmountRows = p.setCreateAmountRows;
  const addCreateAmountRow = p.addCreateAmountRow;
  const removeCreateAmountRow = p.removeCreateAmountRow;
  const cMain = p.cMain, setCMain = p.setCMain;
  const cCat = p.cCat, setCCat = p.setCCat;
  const currencySelectOptions = p.currencySelectOptions;
  const allocateNow = p.allocateNow, setAllocateNow = p.setAllocateNow;
  const createAllocLines = p.createAllocLines;
  const setCreateAllocLines = p.setCreateAllocLines;
  const branchSelectOptions = p.branchSelectOptions;
  const branchOptionsForCreateAllocRow = p.branchOptionsForCreateAllocRow;
  const addCreateAllocRow = p.addCreateAllocRow;
  const removeCreateAllocRow = p.removeCreateAllocRow;
  const equalSplitCreate = p.equalSplitCreate;
  const equalSplitAllBranchesCreate = p.equalSplitAllBranchesCreate;
  const createAllocCompare = p.createAllocCompare;
  const formatAmountInputOnBlur = p.formatAmountInputOnBlur;
  const branchesQ = { isPending: p.branchesLoading } as const;
  const AllocationDraftTotalsBar = p.AllocationDraftTotalsBar;
  const locale = p.locale, loc = p.loc;
  const hasSingleCurrencyTotal = p.hasSingleCurrencyTotal;
  const totalAmountForAlloc = p.totalAmountForAlloc;
  // create akışı için kullanıcı görsel save handler'ı submit'e bağlıdır.
  const onCreate = p.onSubmit;
  const submitCreate = p.onSubmit;
  const allocMut = { isPending: p.allocPending } as const;
  const allocBranchPaid = p.allocBranchPaid;
  const setAllocBranchPaid = p.setAllocBranchPaid;
  const applyAllocBranchChange = p.applyAllocBranchChange;
  const branchOptionsForAllocRow = p.branchOptionsForAllocRow;
  const QUICK_PICKS = p.quickPicks;
  const currencyOpts = p.currencyOpts;

  return (
<Modal
  open={createOpen}
  onClose={() => setCreateOpen(false)}
  titleId="goh-create"
  title={t("generalOverhead.modalCreateTitle")}
  narrow
  sheetMobile
  closeButtonLabel={t("common.close")}
  className="sm:!max-w-xl md:!max-w-2xl lg:!max-w-[min(52rem,calc(100vw-3rem))]"
>
  <div className="flex flex-col gap-3 sm:gap-4">
      <Input
        label={t("generalOverhead.fieldTitle")}
        labelRequired
        value={cTitle}
        onChange={(e) => setCTitle(e.target.value)}
        required
      />
      <Input
        label={t("generalOverhead.fieldNotes")}
        value={cNotes}
        onChange={(e) => setCNotes(e.target.value)}
      />
      <DateField
        label={t("generalOverhead.fieldDate")}
        labelRequired
        value={cDate}
        onChange={(e) => setCDate(e.target.value)}
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-zinc-900">
          {t("generalOverhead.amountsTitle")}
          <span className="ml-0.5 font-semibold text-red-600" aria-hidden>
            *
          </span>
        </p>
        <p className="text-xs text-zinc-500">{t("generalOverhead.amountsHint")}</p>
        {createAmountRows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6.5rem,8rem)_auto] sm:items-end sm:gap-2"
          >
            <Input
              label={t("generalOverhead.fieldAmount")}
              labelRequired
              value={row.amount}
              onChange={(e) => {
                const v = e.target.value;
                setCreateAmountRows((xs) =>
                  xs.map((x) => (x.key === row.key ? { ...x, amount: v } : x))
                );
              }}
              onBlur={() =>
                setCreateAmountRows((xs) =>
                  xs.map((x) =>
                    x.key === row.key
                      ? { ...x, amount: formatAmountInputOnBlur(x.amount, loc) }
                      : x
                  )
                )
              }
              inputMode="decimal"
            />
            <div className="min-w-0">
              <Select
                name={`gohCreateCur-${row.key}`}
                label={t("generalOverhead.fieldCurrency")}
                labelRequired
                value={row.currency}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setCreateAmountRows((xs) =>
                    xs.map((x) => (x.key === row.key ? { ...x, currency: v } : x))
                  );
                }}
                onBlur={() => {}}
                options={currencyOpts}
              />
            </div>
            <div className="flex justify-end sm:pb-0.5">
              <button
                type="button"
                className={cn(trashIconActionButtonClass, "min-h-11 min-w-11")}
                disabled={createAmountRows.length <= 1}
                onClick={() => removeCreateAmountRow(row.key)}
                aria-label={t("common.delete")}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" className="w-full text-xs sm:w-auto" onClick={addCreateAmountRow}>
          {t("generalOverhead.addCurrencyRow")}
        </Button>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-zinc-900">
          {t("generalOverhead.quickPicksTitle")}
          <span className="ml-0.5 font-semibold text-red-600" aria-hidden>
            *
          </span>
        </p>
        <p className="mb-2 text-xs text-zinc-500">{t("generalOverhead.quickPicksHint")}</p>
        <div className="-mx-1 flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:snap-none sm:gap-2">
          {QUICK_PICKS.map((p) => (
            <button
              key={`${p.main}-${p.category}`}
              type="button"
              onClick={() => {
                setCMain(p.main);
                setCCat(p.category);
              }}
              className={cn(
                "touch-manipulation shrink-0 snap-start rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition sm:snap-none sm:text-sm",
                cMain === p.main && cCat === p.category
                  ? "border-violet-500 bg-violet-50 text-violet-950"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-800 hover:border-zinc-300"
              )}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t("generalOverhead.allocPaymentIntro")}</p>

      <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">{t("generalOverhead.allocateNowLabel")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {t("generalOverhead.allocateNowHint")}
            </p>
          </div>
          <Switch
            checked={allocateNow}
            onCheckedChange={setAllocateNow}
            disabled={createAmountRows.length > 1}
            aria-label={t("generalOverhead.allocateNowLabel")}
            className="shrink-0 self-start sm:self-center"
          />
        </div>
        {createAmountRows.length > 1 ? (
          <p className="mt-2 text-xs text-amber-800">{t("generalOverhead.allocateAfterSaveMultiCurrency")}</p>
        ) : null}

        {allocateNow ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200/80 pt-4">
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm transition hover:bg-zinc-50/90 sm:p-4",
                (createMut.isPending || allocMut.isPending) && "pointer-events-none opacity-60"
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
                disabled={createMut.isPending || allocMut.isPending}
                className="shrink-0 self-start sm:self-center"
                aria-label={t("generalOverhead.allocBranchPaidLabel")}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full justify-center px-3 text-sm font-medium leading-snug whitespace-normal sm:min-h-10 sm:w-auto sm:flex-none sm:text-xs"
                onClick={addCreateAllocRow}
              >
                {t("generalOverhead.addBranchRow")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full justify-center px-3 text-sm font-medium leading-snug whitespace-normal sm:min-h-10 sm:w-auto sm:flex-none sm:text-xs"
                onClick={() => equalSplitCreate()}
              >
                {t("generalOverhead.equalSplit")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full justify-center px-3 text-sm font-medium leading-snug whitespace-normal sm:min-h-10 sm:w-auto sm:flex-none sm:text-xs"
                disabled={branchesQ.isPending}
                onClick={equalSplitAllBranchesCreate}
              >
                {t("generalOverhead.equalSplitAllBranches")}
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {createAllocLines.map((line) => (
                <div
                  key={line.key}
                  className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(6.5rem,9rem)_auto] sm:items-end sm:gap-2">
                    <div className="min-w-0">
                      <Select
                        name={`gohCreateBranch-${line.key}`}
                        label={t("generalOverhead.fieldBranch")}
                        labelRequired
                        value={line.branchId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCreateAllocLines((xs) => applyAllocBranchChange(xs, line.key, v));
                        }}
                        onBlur={() => {}}
                        options={branchOptionsForAllocRow(createAllocLines, line.key, branchSelectOptions)}
                      />
                    </div>
                    <Input
                      label={t("generalOverhead.fieldShareAmount")}
                      labelRequired
                      value={line.amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreateAllocLines((xs) =>
                          xs.map((x) => (x.key === line.key ? { ...x, amount: v } : x))
                        );
                      }}
                      onBlur={() =>
                        setCreateAllocLines((xs) =>
                          xs.map((x) =>
                            x.key === line.key
                              ? { ...x, amount: formatAmountInputOnBlur(x.amount, loc) }
                              : x
                          )
                        )
                      }
                      inputMode="decimal"
                      className="min-w-0"
                    />
                    <div className="flex justify-end sm:pb-0.5">
                      <button
                        type="button"
                        className={cn(trashIconActionButtonClass, "min-h-11 min-w-11")}
                        disabled={createAllocLines.length <= 1}
                        onClick={() => removeCreateAllocRow(line.key)}
                        aria-label={t("common.delete")}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AllocationDraftTotalsBar
              compare={createAllocCompare}
              locale={locale}
              currencyCode={createAmountRows[0]?.currency.trim() || "TRY"}
              t={t}
              variant="create"
            />
            <p className="text-xs text-zinc-500">{t("generalOverhead.allocateSumHint")}</p>
          </div>
        ) : null}
      </div>
    </div>

  <div className="mt-5 flex flex-col-reverse gap-3 border-t border-zinc-200/90 pt-5 sm:mt-4 sm:flex-row sm:justify-end sm:gap-2 sm:border-zinc-100 sm:pt-4">
    <Button type="button" variant="ghost" className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => setCreateOpen(false)}>
      {t("common.cancel")}
    </Button>
    <Button
      type="button"
      variant="primary"
      className="min-h-11 inline-flex w-full items-center justify-center gap-2 sm:min-h-10 sm:w-auto"
      disabled={createMut.isPending || allocMut.isPending}
      onClick={() => void submitCreate()}
    >
      {allocateNow ? (
        <>
          <ShareAllocateIcon className="h-5 w-5 shrink-0 opacity-90" />
          <span>{t("generalOverhead.saveAndAllocate")}</span>
        </>
      ) : (
        t("common.save")
      )}
    </Button>
  </div>
</Modal>

  );
}
