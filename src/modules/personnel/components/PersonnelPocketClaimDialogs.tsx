"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import {
  useBranchPersonnelMoneySummaries,
  useCreateBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { fetchPersonnelCashHandoverLinesPaged } from "@/modules/personnel/api/personnel-api";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { defaultDateTimeFromInput, localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import {
  currencySelectOptions,
  DEFAULT_CURRENCY,
} from "@/shared/lib/iso4217-currencies";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type BaseProps = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  fromPersonnelId: number;
  fromPersonnelDisplayName: string;
  defaultCurrencyCode: string;
};

const TITLE_PATRON = "personnel-pocket-claim-patron-title";
const TITLE_STAFF = "personnel-pocket-claim-staff-title";

function usePersonnelPocketMoneyRow(
  branchId: number,
  personnelId: number,
  open: boolean
) {
  const { data, isPending, isError } = useBranchPersonnelMoneySummaries(
    branchId,
    open && branchId > 0 && personnelId > 0
  );
  return useMemo(() => {
    const row = data?.find((r) => r.personnelId === personnelId) ?? null;
    return { row, isPending, isError };
  }, [data, personnelId, isPending, isError]);
}

type PocketClaimBalancePanelProps = {
  row: BranchPersonnelMoneySummaryItem | null;
  isPending: boolean;
  isError: boolean;
  locale: Locale;
  t: (k: string) => string;
  currencyCode: string;
};

function PocketClaimBalancePanel({
  row,
  isPending,
  isError,
  locale,
  t,
  currencyCode,
}: PocketClaimBalancePanelProps) {
  if (isPending) {
    return (
      <p className="text-sm text-zinc-500">{t("personnel.pocketClaimDialogBalanceLoading")}</p>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-amber-800">{t("personnel.pocketClaimDialogBalanceError")}</p>
    );
  }
  if (row?.pocketMixedCurrencies) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
        {t("branch.personnelMoneyMixedCurrency")}
      </p>
    );
  }
  const pocketCur = (row?.pocketCurrencyCode ?? currencyCode).trim().toUpperCase() || "TRY";
  const netOwes = row?.netRegisterOwesPocket;
  const noClaim =
    row == null ||
    !Number.isFinite(netOwes) ||
    netOwes == null ||
    netOwes <= 0;
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
      <p className="text-sm text-zinc-800">
        <span className="font-medium text-zinc-900">
          {t("personnel.pocketClaimDialogBalanceLabel")}
        </span>{" "}
        <span className="font-mono font-semibold tabular-nums text-zinc-950">
          {row != null && Number.isFinite(netOwes)
            ? formatLocaleAmount(netOwes as number, locale, pocketCur)
            : "—"}
        </span>
      </p>
      {noClaim ? (
        <p className="text-sm font-medium text-amber-800">
          {t("personnel.pocketClaimDialogNoRegisterPocketShort")}
        </p>
      ) : null}
    </div>
  );
}

/** Kasa devri (IN) kalanı varsa: kayıt devri ile karıştırmayın diye yönlendirme. */
function PocketClaimHandoverRedirectHint({
  branchId,
  personnelId,
  show,
  t,
}: {
  branchId: number;
  personnelId: number;
  show: boolean;
  t: (k: string) => string;
}) {
  const q = useQuery({
    queryKey: ["personnel", "pocket-claim-handover-remain", personnelId, branchId],
    queryFn: async () => {
      let total = 0;
      let page = 1;
      const pageSize = 100;
      for (;;) {
        const r = await fetchPersonnelCashHandoverLinesPaged(personnelId, {
          page,
          pageSize,
          branchId: branchId > 0 ? branchId : undefined,
        });
        for (const x of r.items) {
          total += Number(x.remainingHandoverAmount ?? 0) || 0;
        }
        if (r.items.length === 0 || r.items.length < pageSize) break;
        if (page * pageSize >= r.totalCount) break;
        page += 1;
        if (page > 10) break;
      }
      return total;
    },
    enabled: show && branchId > 0 && personnelId > 0,
    staleTime: 30_000,
  });
  if (!show) return null;
  if (q.isPending || q.isError) return null;
  if ((q.data ?? 0) <= 0.009) return null;
  return (
    <p className="rounded-lg border border-sky-200 bg-sky-50/95 px-3 py-2.5 text-sm leading-relaxed text-sky-950">
      {t("personnel.pocketClaimDialogHandoverInsteadHint")}
    </p>
  );
}

function useBranchStaffSelectOptions(
  branchId: number,
  excludePersonnelId: number,
  open: boolean
) {
  const filters = useMemo(
    () => ({
      ...defaultPersonnelListFilters,
      branchId,
      status: "active" as const,
    }),
    [branchId]
  );
  const { data } = usePersonnelList(filters, open && branchId > 0);
  const { t, locale } = useI18n();
  return useMemo(() => {
    const loc = locale === "tr" ? "tr" : "en";
    const items = (data?.items ?? []).filter(
      (p) => !p.isDeleted && p.id !== excludePersonnelId && p.branchId === branchId
    );
    return [
      { value: "", label: t("personnel.pocketClaimDialogRecipientPick") },
      ...[...items]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [data?.items, branchId, excludePersonnelId, locale, t]);
}

function usePocketClaimMoneyContext(
  branchId: number,
  fromPersonnelId: number,
  open: boolean
) {
  const { row, isPending, isError } = usePersonnelPocketMoneyRow(
    branchId,
    fromPersonnelId,
    open
  );
  const mixed = Boolean(row?.pocketMixedCurrencies);
  const balanceReady = !isPending && !isError;
  const netOwes = row?.netRegisterOwesPocket;
  const noClaim =
    balanceReady &&
    !mixed &&
    (row == null ||
      netOwes == null ||
      !Number.isFinite(netOwes) ||
      (netOwes as number) <= 0);
  const ceiling =
    balanceReady && !mixed && row != null && Number.isFinite(netOwes) && (netOwes as number) > 0
      ? (netOwes as number)
      : null;

  return { row, isPending, isError, mixed, noClaim, ceiling };
}

/** Kasa–cep kaydı: alacağı patrona bırak (nakit çıkışı yok). */
export function PersonnelPocketClaimToPatronDialog({
  open,
  onClose,
  branchId,
  fromPersonnelId,
  fromPersonnelDisplayName,
  defaultCurrencyCode,
}: BaseProps) {
  const { t, locale } = useI18n();
  const loc = locale as Locale;
  const createTx = useCreateBranchTransaction();
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState(
    (defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY
  );
  const [transactionDate, setTransactionDate] = useState(() =>
    defaultDateTimeFromInput(localIsoDate())
  );
  const [description, setDescription] = useState("");

  const dialogOpen = open && branchId > 0 && fromPersonnelId > 0;
  const { row, isPending, isError, mixed, noClaim, ceiling } = usePocketClaimMoneyContext(
    branchId,
    fromPersonnelId,
    dialogOpen
  );

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCurrencyCode(
      (defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY
    );
    setTransactionDate(defaultDateTimeFromInput(localIsoDate()));
    setDescription("");
  }, [open, defaultCurrencyCode]);

  useEffect(() => {
    if (!dialogOpen || row == null || mixed) return;
    const c = row.pocketCurrencyCode?.trim().toUpperCase();
    if (c) setCurrencyCode(c);
  }, [dialogOpen, row, mixed]);

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const amountNum = useMemo(() => parseLocaleAmount(amount.trim(), loc), [amount, loc]);
  const amountMissing = amount.trim() === "";
  const amountExceeds =
    ceiling != null && Number.isFinite(amountNum) && amountNum > ceiling + 1e-9;
  const currencyLocked = row != null && !mixed && Boolean(row.pocketCurrencyCode?.trim());

  const submitDisabled =
    createTx.isPending ||
    isPending ||
    amountMissing ||
    (!mixed && noClaim) ||
    amountExceeds ||
    (!amountMissing &&
      (!Number.isFinite(amountNum) || amountNum <= 0));
  const requestClose = useDirtyGuard({
    isDirty:
      amount.trim() !== "" ||
      description.trim() !== "" ||
      transactionDate.trim() !== defaultDateTimeFromInput(localIsoDate()) ||
      currencyCode.trim().toUpperCase() !==
        ((defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY),
    isBlocked: createTx.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const onSubmit = async () => {
    if (amount.trim() === "") {
      notify.error(t("personnel.pocketClaimDialogAmountRequired"));
      return;
    }
    const amt = parseLocaleAmount(amount, loc);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("personnel.pocketClaimDialogAmountInvalid"));
      return;
    }
    if (ceiling != null && amt > ceiling + 1e-9) {
      notify.error(t("personnel.pocketClaimDialogAmountExceedsBalance"));
      return;
    }
    if (!mixed && noClaim) {
      notify.error(t("personnel.pocketClaimDialogNoRegisterPocket"));
      return;
    }
    if (branchId <= 0) {
      notify.error(t("personnel.pocketClaimDialogBranchRequired"));
      return;
    }
    try {
      await createTx.mutateAsync({
        branchId,
        type: "OUT",
        mainCategory: "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER",
        category: "POCKET_CLAIM_TRANSFER_TO_PATRON",
        amount: amt,
        currencyCode,
        transactionDate,
        linkedPersonnelId: fromPersonnelId,
        description: description.trim() || null,
      });
      notify.success(t("toast.branchTxCreated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Modal
      open={dialogOpen}
      onClose={requestClose}
      titleId={TITLE_PATRON}
      title={t("personnel.pocketClaimToPatronDialogTitle")}
      description={t("personnel.pocketClaimToPatronDialogLead")}
      narrow
      nested
    >
      <div className="space-y-4 text-sm">
        <p className="text-zinc-700">
          <span className="font-medium text-zinc-900">
            {t("personnel.pocketClaimDialogFromLabel")}
          </span>{" "}
          {fromPersonnelDisplayName}
        </p>
        <PocketClaimBalancePanel
          row={row}
          isPending={isPending}
          isError={isError}
          locale={loc}
          t={t}
          currencyCode={currencyCode}
        />
        <PocketClaimHandoverRedirectHint
          branchId={branchId}
          personnelId={fromPersonnelId}
          show={dialogOpen && !isPending && !isError && !mixed && noClaim}
          t={t}
        />
        <Input
          name="pocketClaimPatronAmount"
          label={t("personnel.pocketClaimDialogAmountLabel")}
          labelRequired
          required
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={(e) => {
            const n = parseLocaleAmount(e.target.value, loc);
            if (Number.isFinite(n) && n >= 0) {
              setAmount(formatLocaleAmountInput(n, loc));
            }
          }}
          error={amountExceeds ? t("personnel.pocketClaimDialogAmountExceedsBalance") : undefined}
        />
        <Select
          name="pocketClaimPatronCurrency"
          label={t("personnel.pocketClaimDialogCurrencyLabel")}
          options={currencyOptions}
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
          onBlur={() => {}}
          disabled={currencyLocked}
        />
        <Input
          type="datetime-local"
          name="pocketClaimPatronWhen"
          label={t("personnel.pocketClaimDialogDateLabel")}
          value={transactionDate.slice(0, 16)}
          onChange={(e) => setTransactionDate(e.target.value)}
        />
        <Input
          name="pocketClaimPatronNote"
          label={t("personnel.pocketClaimDialogDescriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-10" onClick={requestClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-10"
            disabled={submitDisabled}
            onClick={() => void onSubmit()}
          >
            {t("personnel.pocketClaimDialogSubmit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Kasa–cep kaydı: alacağı başka personele taşı (nakit çıkışı yok). */
export function PersonnelPocketClaimToStaffDialog({
  open,
  onClose,
  branchId,
  fromPersonnelId,
  fromPersonnelDisplayName,
  defaultCurrencyCode,
}: BaseProps) {
  const { t, locale } = useI18n();
  const loc = locale as Locale;
  const createTx = useCreateBranchTransaction();
  const dialogOpen = open && branchId > 0 && fromPersonnelId > 0;
  const recipientOptions = useBranchStaffSelectOptions(
    branchId,
    fromPersonnelId,
    dialogOpen
  );
  const [toPersonnelId, setToPersonnelId] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState(
    (defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY
  );
  const [transactionDate, setTransactionDate] = useState(() =>
    defaultDateTimeFromInput(localIsoDate())
  );
  const [description, setDescription] = useState("");

  const { row, isPending, isError, mixed, noClaim, ceiling } = usePocketClaimMoneyContext(
    branchId,
    fromPersonnelId,
    dialogOpen
  );

  useEffect(() => {
    if (!open) return;
    setToPersonnelId("");
    setAmount("");
    setCurrencyCode(
      (defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY
    );
    setTransactionDate(defaultDateTimeFromInput(localIsoDate()));
    setDescription("");
  }, [open, defaultCurrencyCode]);

  useEffect(() => {
    if (!dialogOpen || row == null || mixed) return;
    const c = row.pocketCurrencyCode?.trim().toUpperCase();
    if (c) setCurrencyCode(c);
  }, [dialogOpen, row, mixed]);

  const currencyOptions = useMemo(() => currencySelectOptions(), []);

  const toId = parseInt(toPersonnelId.trim(), 10);
  const recipientOk =
    Number.isFinite(toId) && toId > 0 && toId !== fromPersonnelId;

  const amountNum = useMemo(() => parseLocaleAmount(amount.trim(), loc), [amount, loc]);
  const amountMissing = amount.trim() === "";
  const amountExceeds =
    ceiling != null && Number.isFinite(amountNum) && amountNum > ceiling + 1e-9;
  const currencyLocked = row != null && !mixed && Boolean(row.pocketCurrencyCode?.trim());

  const submitDisabled =
    createTx.isPending ||
    isPending ||
    !recipientOk ||
    amountMissing ||
    (!mixed && noClaim) ||
    amountExceeds ||
    (!amountMissing &&
      (!Number.isFinite(amountNum) || amountNum <= 0));
  const requestClose = useDirtyGuard({
    isDirty:
      toPersonnelId.trim() !== "" ||
      amount.trim() !== "" ||
      description.trim() !== "" ||
      transactionDate.trim() !== defaultDateTimeFromInput(localIsoDate()) ||
      currencyCode.trim().toUpperCase() !==
        ((defaultCurrencyCode ?? DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY),
    isBlocked: createTx.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const onSubmit = async () => {
    const to = parseInt(toPersonnelId.trim(), 10);
    if (!Number.isFinite(to) || to <= 0) {
      notify.error(t("personnel.pocketClaimDialogRecipientRequired"));
      return;
    }
    if (to === fromPersonnelId) {
      notify.error(t("branch.txPocketClaimTransferSamePerson"));
      return;
    }
    if (amount.trim() === "") {
      notify.error(t("personnel.pocketClaimDialogAmountRequired"));
      return;
    }
    const amt = parseLocaleAmount(amount, loc);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("personnel.pocketClaimDialogAmountInvalid"));
      return;
    }
    if (ceiling != null && amt > ceiling + 1e-9) {
      notify.error(t("personnel.pocketClaimDialogAmountExceedsBalance"));
      return;
    }
    if (!mixed && noClaim) {
      notify.error(t("personnel.pocketClaimDialogNoRegisterPocket"));
      return;
    }
    if (branchId <= 0) {
      notify.error(t("personnel.pocketClaimDialogBranchRequired"));
      return;
    }
    try {
      await createTx.mutateAsync({
        branchId,
        type: "OUT",
        mainCategory: "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER",
        category: "POCKET_CLAIM_TRANSFER",
        amount: amt,
        currencyCode,
        transactionDate,
        linkedPersonnelId: fromPersonnelId,
        expensePocketPersonnelId: to,
        description: description.trim() || null,
      });
      notify.success(t("toast.branchTxCreated"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Modal
      open={dialogOpen}
      onClose={requestClose}
      titleId={TITLE_STAFF}
      title={t("personnel.pocketClaimToStaffDialogTitle")}
      description={t("personnel.pocketClaimToStaffDialogLead")}
      narrow
      nested
    >
      <div className="space-y-4 text-sm">
        <p className="text-zinc-700">
          <span className="font-medium text-zinc-900">
            {t("personnel.pocketClaimDialogFromLabel")}
          </span>{" "}
          {fromPersonnelDisplayName}
        </p>
        <PocketClaimBalancePanel
          row={row}
          isPending={isPending}
          isError={isError}
          locale={loc}
          t={t}
          currencyCode={currencyCode}
        />
        <PocketClaimHandoverRedirectHint
          branchId={branchId}
          personnelId={fromPersonnelId}
          show={dialogOpen && !isPending && !isError && !mixed && noClaim}
          t={t}
        />
        <Select
          name="pocketClaimStaffTo"
          label={t("personnel.pocketClaimDialogRecipientLabel")}
          labelRequired
          options={recipientOptions}
          value={toPersonnelId}
          onChange={(e) => setToPersonnelId(e.target.value)}
          onBlur={() => {}}
        />
        <Input
          name="pocketClaimStaffAmount"
          label={t("personnel.pocketClaimDialogAmountLabel")}
          labelRequired
          required
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={(e) => {
            const n = parseLocaleAmount(e.target.value, loc);
            if (Number.isFinite(n) && n >= 0) {
              setAmount(formatLocaleAmountInput(n, loc));
            }
          }}
          error={amountExceeds ? t("personnel.pocketClaimDialogAmountExceedsBalance") : undefined}
        />
        <Select
          name="pocketClaimStaffCurrency"
          label={t("personnel.pocketClaimDialogCurrencyLabel")}
          options={currencyOptions}
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
          onBlur={() => {}}
          disabled={currencyLocked}
        />
        <Input
          type="datetime-local"
          name="pocketClaimStaffWhen"
          label={t("personnel.pocketClaimDialogDateLabel")}
          value={transactionDate.slice(0, 16)}
          onChange={(e) => setTransactionDate(e.target.value)}
        />
        <Input
          name="pocketClaimStaffNote"
          label={t("personnel.pocketClaimDialogDescriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-10" onClick={requestClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-10"
            disabled={submitDisabled}
            onClick={() => void onSubmit()}
          >
            {t("personnel.pocketClaimDialogSubmit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
