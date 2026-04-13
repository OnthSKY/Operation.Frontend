"use client";

import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useAllocateGeneralOverheadPool,
  useCreateGeneralOverheadPool,
  useGeneralOverheadPools,
  useReverseGeneralOverheadAllocation,
} from "@/modules/general-overhead/hooks/useGeneralOverheadQueries";
import type {
  GeneralOverheadAllocateLine,
  GeneralOverheadPoolRow,
} from "@/modules/general-overhead/api/general-overhead-api";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import {
  resolveLocalizedApiError,
  userCanManageTourismSeasonClosedPolicy,
} from "@/shared/lib/resolve-localized-api-error";
import { useAuth } from "@/lib/auth/AuthContext";
import { currencySelectOptions } from "@/shared/lib/currency-select-options";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { financialBreakdownMainLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphCoinExpense } from "@/shared/ui/ToolbarGlyph";
import { useCallback, useEffect, useMemo, useState } from "react";

function splitEqualParts(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rem = cents % n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0);
    out.push(c / 100);
  }
  return out;
}

type AllocLine = { key: string; branchId: string; amount: string };

type CreateAmountRow = { key: string; currency: string; amount: string };

function poolAmountsList(p: GeneralOverheadPoolRow): { currencyCode: string; amount: number }[] {
  const rows = p.amounts;
  if (rows != null && rows.length > 0) {
    return rows.map((r) => ({
      currencyCode: String(r.currencyCode ?? "TRY")
        .trim()
        .toUpperCase(),
      amount: r.amount,
    }));
  }
  return [
    {
      currencyCode: String(p.currencyCode ?? "TRY")
        .trim()
        .toUpperCase(),
      amount: p.amountTotal,
    },
  ];
}

function branchOptionsForAllocRow(
  allLines: AllocLine[],
  lineKey: string,
  base: SelectOption[]
): SelectOption[] {
  const currentId = allLines.find((l) => l.key === lineKey)?.branchId.trim() ?? "";
  const taken = new Set(
    allLines
      .filter((l) => l.key !== lineKey && l.branchId.trim() !== "")
      .map((l) => l.branchId.trim())
  );
  return base.filter((o) => o.value === "" || o.value === currentId || !taken.has(o.value));
}

/** Aynı şube başka satırdaysa o satırı şube + pay sıfırla (yeni seçim öncelikli). */
function applyAllocBranchChange(lines: AllocLine[], lineKey: string, branchId: string): AllocLine[] {
  return lines.map((x) => {
    if (x.key === lineKey) return { ...x, branchId };
    if (branchId !== "" && x.branchId === branchId) return { ...x, branchId: "", amount: "" };
    return x;
  });
}

/** Tüm para birimleri: aynı şube yalnızca bir satırda (backend ile uyumlu). */
function applyAllocBranchChangeGlobal(
  byCur: Record<string, AllocLine[]>,
  currencyCode: string,
  lineKey: string,
  branchId: string
): Record<string, AllocLine[]> {
  const next: Record<string, AllocLine[]> = { ...byCur };
  for (const cc of Object.keys(next)) {
    next[cc] = (next[cc] ?? []).map((x) => {
      if (cc === currencyCode && x.key === lineKey) return { ...x, branchId };
      if (branchId !== "" && x.branchId === branchId) return { ...x, branchId: "", amount: "" };
      return x;
    });
  }
  return next;
}

function branchOptionsForAllocRowGlobal(
  byCur: Record<string, AllocLine[]>,
  currencyCode: string,
  lineKey: string,
  base: SelectOption[]
): SelectOption[] {
  const currentId =
    (byCur[currencyCode] ?? []).find((l) => l.key === lineKey)?.branchId.trim() ?? "";
  const taken = new Set<string>();
  for (const [cc, lines] of Object.entries(byCur)) {
    for (const l of lines) {
      const id = l.branchId.trim();
      if (id === "") continue;
      if (cc === currencyCode && l.key === lineKey) continue;
      taken.add(id);
    }
  }
  return base.filter((o) => o.value === "" || o.value === currentId || !taken.has(o.value));
}

type QuickPick = { main: string; category: string; labelKey: string };

const QUICK_PICKS: QuickPick[] = [
  { main: "OUT_TAX", category: "TAX_OTHER", labelKey: "generalOverhead.quickPickTaxAnnualAccounting" },
  { main: "OUT_TAX", category: "TAX_VAT", labelKey: "generalOverhead.quickPickVat" },
  { main: "OUT_TAX", category: "TAX_WITHHOLDING", labelKey: "generalOverhead.quickPickWithholding" },
  { main: "OUT_TAX", category: "TAX_SSI", labelKey: "generalOverhead.quickPickSsi" },
  { main: "OUT_TAX", category: "TAX_MUNICIPAL", labelKey: "generalOverhead.quickPickMunicipal" },
  { main: "OUT_TAX", category: "TAX_STAMP", labelKey: "generalOverhead.quickPickStamp" },
  { main: "OUT_OPS", category: "OPS_RENT", labelKey: "generalOverhead.quickPickRent" },
  { main: "OUT_OPS", category: "OPS_UTIL", labelKey: "generalOverhead.quickPickUtilities" },
  { main: "OUT_OPS", category: "OPS_POS_BANK_FEE", labelKey: "generalOverhead.quickPickBankPos" },
  { main: "OUT_OPS", category: "OPS_OTHER", labelKey: "generalOverhead.quickPickConsultingAdmin" },
  { main: "OUT_OTHER", category: "EXP_OTHER", labelKey: "generalOverhead.quickPickOther" },
];

function parseAllocationLines(
  allocLines: AllocLine[],
  t: (k: string) => string,
  locale: Locale,
  currencyCode: string
): GeneralOverheadAllocateLine[] | null {
  const cc = currencyCode.trim().toUpperCase() || "TRY";
  const lines = allocLines
    .map((l) => ({
      branchId: parseInt(l.branchId, 10),
      amount: parseLocaleAmount(String(l.amount), locale),
    }))
    .filter((l) => l.branchId > 0 && Number.isFinite(l.amount) && l.amount > 0);
  if (lines.length === 0) {
    notify.error(t("generalOverhead.allocLinesRequired"));
    return null;
  }
  const seen = new Set<number>();
  for (const l of lines) {
    if (seen.has(l.branchId)) {
      notify.error(t("generalOverhead.duplicateBranch"));
      return null;
    }
    seen.add(l.branchId);
  }
  return lines.map((l) => ({
    branchId: l.branchId,
    amount: l.amount,
    currencyCode: cc,
  }));
}

function allocationSumMatches(
  lines: GeneralOverheadAllocateLine[],
  targetTotal: number,
  t: (k: string) => string,
  locale: string,
  currencyCode: string
): boolean {
  const sum = lines.reduce((s, l) => s + Math.round(l.amount * 100), 0);
  const target = Math.round(targetTotal * 100);
  if (sum !== target) {
    notify.error(
      `${t("generalOverhead.sumMustMatch")} ${formatLocaleAmount(targetTotal, locale as "tr" | "en", currencyCode)}`
    );
    return false;
  }
  return true;
}

type AllocDraftCompare = {
  sumCents: number;
  targetCents: number | null;
  status: "no_target" | "match" | "short" | "over";
};

function compareAllocDraftSum(
  lines: AllocLine[],
  targetTotal: number | undefined,
  locale: Locale
): AllocDraftCompare {
  let sumCents = 0;
  for (const l of lines) {
    if (l.branchId.trim() === "") continue;
    const n = parseLocaleAmount(String(l.amount), locale);
    if (Number.isFinite(n) && n >= 0) sumCents += Math.round(n * 100);
  }
  const tt =
    targetTotal != null && Number.isFinite(targetTotal) && targetTotal > 0
      ? Math.round(targetTotal * 100)
      : null;
  if (tt == null) return { sumCents, targetCents: null, status: "no_target" };
  if (sumCents === tt) return { sumCents, targetCents: tt, status: "match" };
  if (sumCents < tt) return { sumCents, targetCents: tt, status: "short" };
  return { sumCents, targetCents: tt, status: "over" };
}

function AllocationDraftTotalsBar({
  compare,
  locale,
  currencyCode,
  t,
  variant,
}: {
  compare: AllocDraftCompare;
  locale: string;
  currencyCode: string;
  t: (k: string) => string;
  variant: "create" | "allocate";
}) {
  const cur = currencyCode.trim() || "TRY";
  const loc = locale as "tr" | "en";
  const sumFmt = formatLocaleAmount(compare.sumCents / 100, loc, cur);
  const targetFmt =
    compare.targetCents != null ? formatLocaleAmount(compare.targetCents / 100, loc, cur) : "—";
  const gapCents =
    compare.targetCents != null ? Math.abs(compare.sumCents - compare.targetCents) : 0;
  const gapFmt = formatLocaleAmount(gapCents / 100, loc, cur);

  const tone =
    compare.status === "no_target"
      ? "border-zinc-200 bg-zinc-50 text-zinc-700"
      : compare.status === "match"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : compare.status === "short"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-red-200 bg-red-50 text-red-950";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-600">{t("generalOverhead.allocateShareIsMoneyNotPercent")}</p>
      <div className={cn("rounded-xl border px-3 py-2.5 text-sm", tone)}>
        <p className="tabular-nums font-medium">
          {t("generalOverhead.allocateTotalsLine").replace("{sum}", sumFmt).replace("{target}", targetFmt)}
        </p>
        {compare.status === "no_target" && variant === "create" ? (
          <p className="mt-1 text-xs opacity-90">{t("generalOverhead.allocateEnterTotalFirst")}</p>
        ) : compare.status === "match" ? (
          <p className="mt-1 text-xs font-semibold text-emerald-800">{t("generalOverhead.allocateSumMatch")}</p>
        ) : compare.status === "short" ? (
          <p className="mt-1 text-xs font-semibold text-amber-900">
            {t("generalOverhead.allocateSumShort").replace("{gap}", gapFmt)}
          </p>
        ) : compare.status === "over" ? (
          <p className="mt-1 text-xs font-semibold text-red-800">
            {t("generalOverhead.allocateSumOver").replace("{gap}", gapFmt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function GeneralOverheadScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const loc = locale as Locale;
  const canManageTourismPolicy = userCanManageTourismSeasonClosedPolicy(user?.role);
  const apiErrMsg = useCallback(
    (e: unknown) =>
      resolveLocalizedApiError(e, t, { canManageTourismSeasonClosedPolicy: canManageTourismPolicy }),
    [t, canManageTourismPolicy]
  );
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const poolsQ = useGeneralOverheadPools(
    statusFilter.trim() === "" ? undefined : statusFilter,
    true
  );
  const branchesQ = useBranchesList();
  const createMut = useCreateGeneralOverheadPool();
  const allocMut = useAllocateGeneralOverheadPool();
  const reverseMut = useReverseGeneralOverheadAllocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cDate, setCDate] = useState(() => localIsoDate());
  const [createAmountRows, setCreateAmountRows] = useState<CreateAmountRow[]>([
    { key: crypto.randomUUID(), currency: "TRY", amount: "" },
  ]);
  const [cMain, setCMain] = useState("");
  const [cCat, setCCat] = useState("");
  const [allocateNow, setAllocateNow] = useState(false);
  const [createAllocLines, setCreateAllocLines] = useState<AllocLine[]>([
    { key: "1", branchId: "", amount: "" },
  ]);

  const [allocPool, setAllocPool] = useState<GeneralOverheadPoolRow | null>(null);
  const [allocLinesByCur, setAllocLinesByCur] = useState<Record<string, AllocLine[]>>({});
  const [allocBranchPaid, setAllocBranchPaid] = useState(false);

  useEffect(() => {
    if (!createOpen) return;
    setAllocBranchPaid(false);
  }, [createOpen]);

  const branchOpts = useMemo(() => {
    const rows = branchesQ.data ?? [];
    return rows
      .map((b) => ({ value: String(b.id), label: b.name }))
      .sort((a, b) => a.label.localeCompare(b.label, locale === "tr" ? "tr" : "en"));
  }, [branchesQ.data, locale]);

  const createAllocBranchKey = useMemo(
    () =>
      `${allocateNow ? 1 : 0}|${createOpen ? 1 : 0}|${createAllocLines.length}|${createAllocLines.map((l) => l.branchId.trim()).join(";")}`,
    [allocateNow, createOpen, createAllocLines]
  );

  useEffect(() => {
    if (!allocateNow || !createOpen || createAmountRows.length !== 1) return;
    const amt = parseLocaleAmount(createAmountRows[0]!.amount, loc);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setCreateAllocLines((lines) => {
      const picked = lines.filter((l) => l.branchId.trim() !== "");
      if (picked.length === 0) return lines;
      const parts = splitEqualParts(amt, picked.length);
      let pi = 0;
      return lines.map((l) => {
        if (l.branchId.trim() === "") return { ...l, amount: "" };
        const p = parts[pi++] ?? 0;
        const s = formatLocaleAmountInput(p, loc);
        return l.amount === s ? l : { ...l, amount: s };
      });
    });
  }, [allocateNow, createOpen, createAmountRows, createAllocBranchKey, loc]);

  const allocBranchKey = useMemo(() => {
    if (!allocPool) return "";
    const amts = poolAmountsList(allocPool);
    if (amts.length === 1) {
      const cc = amts[0]!.currencyCode;
      const lines = allocLinesByCur[cc] ?? [];
      return `${allocPool.id}|${lines.length}|${lines.map((l) => l.branchId.trim()).join(";")}`;
    }
    return `${allocPool.id}|multi|${Object.keys(allocLinesByCur)
      .sort()
      .join(",")}`;
  }, [allocPool, allocLinesByCur]);

  useEffect(() => {
    if (!allocPool) return;
    const amts = poolAmountsList(allocPool);
    if (amts.length !== 1) return;
    const cc = amts[0]!.currencyCode;
    const target = amts[0]!.amount;
    setAllocLinesByCur((prev) => {
      const lines = prev[cc] ?? [];
      const picked = lines.filter((l) => l.branchId.trim() !== "");
      if (picked.length === 0) return prev;
      const parts = splitEqualParts(target, picked.length);
      let pi = 0;
      const nextLines = lines.map((l) => {
        if (l.branchId.trim() === "") return l;
        const p = parts[pi++] ?? 0;
        const s = formatLocaleAmountInput(p, loc);
        return l.amount === s ? l : { ...l, amount: s };
      });
      return { ...prev, [cc]: nextLines };
    });
  }, [allocPool?.id, allocBranchKey, loc]);

  const openCreate = () => {
    setCTitle("");
    setCNotes("");
    setCDate(localIsoDate());
    setCreateAmountRows([{ key: crypto.randomUUID(), currency: "TRY", amount: "" }]);
    setCMain("");
    setCCat("");
    setAllocateNow(false);
    setCreateAllocLines([{ key: crypto.randomUUID(), branchId: "", amount: "" }]);
    setCreateOpen(true);
  };

  const parseCreateAmountRowsForSubmit = (): { currencyCode: string; amount: number }[] | null => {
    const out: { currencyCode: string; amount: number }[] = [];
    const seen = new Set<string>();
    for (const r of createAmountRows) {
      const cc = r.currency.trim().toUpperCase();
      if (cc.length !== 3) {
        notify.error(t("generalOverhead.invalidCurrency"));
        return null;
      }
      const amt = parseLocaleAmount(r.amount, loc);
      if (!Number.isFinite(amt) || amt <= 0) {
        notify.error(t("generalOverhead.invalidAmount"));
        return null;
      }
      if (seen.has(cc)) {
        notify.error(t("generalOverhead.duplicateCurrency"));
        return null;
      }
      seen.add(cc);
      out.push({ currencyCode: cc, amount: amt });
    }
    if (out.length === 0) {
      notify.error(t("generalOverhead.invalidAmount"));
      return null;
    }
    return out;
  };

  const submitCreate = async () => {
    const title = cTitle.trim();
    if (!title) {
      notify.error(t("common.required"));
      return;
    }
    const parsedAmounts = parseCreateAmountRowsForSubmit();
    if (!parsedAmounts) return;
    if (!cMain.trim() || !cCat.trim()) {
      notify.error(t("generalOverhead.pickCategory"));
      return;
    }

    let allocParsed: GeneralOverheadAllocateLine[] | null = null;
    if (allocateNow) {
      if (parsedAmounts.length > 1) {
        notify.error(t("generalOverhead.allocateNowSingleCurrencyOnly"));
        return;
      }
      const cc0 = parsedAmounts[0]!.currencyCode;
      const amt0 = parsedAmounts[0]!.amount;
      allocParsed = parseAllocationLines(createAllocLines, t, loc, cc0);
      if (!allocParsed) return;
      if (!allocationSumMatches(allocParsed, amt0, t, locale, cc0)) return;
    }

    try {
      const created = await createMut.mutateAsync({
        title,
        notes: cNotes.trim() || null,
        expenseDate: cDate,
        amounts: parsedAmounts,
        mainCategory: cMain.trim(),
        category: cCat.trim(),
      });
      if (allocateNow && allocParsed && allocParsed.length > 0) {
        await allocMut.mutateAsync({
          poolId: created.id,
          lines: allocParsed,
          expensePaymentSource: allocBranchPaid ? "REGISTER" : "PATRON",
        });
        notify.success(t("generalOverhead.toastCreatedAndAllocated"));
      } else {
        notify.success(t("generalOverhead.toastCreated"));
      }
      setCreateOpen(false);
    } catch (e) {
      notify.error(apiErrMsg(e));
    }
  };

  const openAllocate = (p: GeneralOverheadPoolRow) => {
    setAllocBranchPaid(false);
    const init: Record<string, AllocLine[]> = {};
    for (const a of poolAmountsList(p)) {
      init[a.currencyCode] = [{ key: crypto.randomUUID(), branchId: "", amount: "" }];
    }
    setAllocLinesByCur(init);
    setAllocPool(p);
  };

  const addAllocRow = (currencyCode: string) => {
    setAllocLinesByCur((prev) => ({
      ...prev,
      [currencyCode]: [
        ...(prev[currencyCode] ?? []),
        { key: crypto.randomUUID(), branchId: "", amount: "" },
      ],
    }));
  };

  const addCreateAmountRow = () => {
    setCreateAmountRows((xs) => [
      ...xs,
      { key: crypto.randomUUID(), currency: "TRY", amount: "" },
    ]);
  };

  const removeCreateAmountRow = (key: string) => {
    setCreateAmountRows((xs) => (xs.length <= 1 ? xs : xs.filter((r) => r.key !== key)));
  };

  const addCreateAllocRow = () => {
    setCreateAllocLines((xs) => [...xs, { key: crypto.randomUUID(), branchId: "", amount: "" }]);
  };

  const removeAllocRow = (currencyCode: string, key: string) => {
    setAllocLinesByCur((prev) => {
      const lines = prev[currencyCode] ?? [];
      if (lines.length <= 1) return prev;
      return { ...prev, [currencyCode]: lines.filter((r) => r.key !== key) };
    });
  };

  const removeCreateAllocRow = (key: string) => {
    setCreateAllocLines((xs) => (xs.length <= 1 ? xs : xs.filter((r) => r.key !== key)));
  };

  const equalSplit = (currencyCode: string, targetTotal: number) => {
    if (!allocPool) return;
    const lines = allocLinesByCur[currencyCode] ?? [];
    const withBranch = lines.filter((l) => l.branchId.trim() !== "");
    if (withBranch.length === 0) {
      notify.error(t("generalOverhead.pickBranchFirst"));
      return;
    }
    const parts = splitEqualParts(targetTotal, withBranch.length);
    setAllocLinesByCur((prev) => {
      const ln = prev[currencyCode] ?? [];
      let i = 0;
      const next = ln.map((l) => {
        if (l.branchId.trim() === "") return l;
        const v = parts[i++] ?? 0;
        return { ...l, amount: formatLocaleAmountInput(v, loc) };
      });
      return { ...prev, [currencyCode]: next };
    });
  };

  const equalSplitCreate = () => {
    if (createAmountRows.length !== 1) {
      notify.error(t("generalOverhead.equalSplitSingleCurrencyOnly"));
      return;
    }
    const amt = parseLocaleAmount(createAmountRows[0]!.amount, loc);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("generalOverhead.invalidAmount"));
      return;
    }
    const withBranch = createAllocLines.filter((l) => l.branchId.trim() !== "");
    if (withBranch.length === 0) {
      notify.error(t("generalOverhead.pickBranchFirst"));
      return;
    }
    const parts = splitEqualParts(amt, withBranch.length);
    setCreateAllocLines((lines) => {
      let i = 0;
      return lines.map((l) => {
        if (l.branchId.trim() === "") return l;
        const v = parts[i++] ?? 0;
        return { ...l, amount: formatLocaleAmountInput(v, loc) };
      });
    });
  };

  const equalSplitAllBranchesCreate = () => {
    if (createAmountRows.length !== 1) {
      notify.error(t("generalOverhead.equalSplitSingleCurrencyOnly"));
      return;
    }
    const amt = parseLocaleAmount(createAmountRows[0]!.amount, loc);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("generalOverhead.invalidAmount"));
      return;
    }
    const ids = branchOpts.map((o) => o.value).filter((v) => v.trim() !== "");
    if (ids.length === 0) {
      notify.error(t("generalOverhead.noBranchesForAlloc"));
      return;
    }
    const parts = splitEqualParts(amt, ids.length);
    setCreateAllocLines(
      ids.map((id, i) => ({
        key: crypto.randomUUID(),
        branchId: id,
        amount: formatLocaleAmountInput(parts[i] ?? 0, loc),
      }))
    );
  };

  const equalSplitAllBranches = (currencyCode: string, targetTotal: number) => {
    if (!allocPool) return;
    if (poolAmountsList(allocPool).length > 1) {
      notify.error(t("generalOverhead.equalSplitAllBranchesMultiCurrency"));
      return;
    }
    const ids = branchOpts.map((o) => o.value).filter((v) => v.trim() !== "");
    if (ids.length === 0) {
      notify.error(t("generalOverhead.noBranchesForAlloc"));
      return;
    }
    const parts = splitEqualParts(targetTotal, ids.length);
    const cc = currencyCode.trim().toUpperCase() || "TRY";
    setAllocLinesByCur((prev) => ({
      ...prev,
      [cc]: ids.map((id, i) => ({
        key: crypto.randomUUID(),
        branchId: id,
        amount: formatLocaleAmountInput(parts[i] ?? 0, loc),
      })),
    }));
  };

  const submitAllocate = async () => {
    if (!allocPool) return;
    const targets = poolAmountsList(allocPool);
    const flat: GeneralOverheadAllocateLine[] = [];
    const seenBranches = new Set<number>();
    for (const a of targets) {
      const lines = allocLinesByCur[a.currencyCode];
      if (!lines) {
        notify.error(t("generalOverhead.allocLinesRequired"));
        return;
      }
      const parsed = parseAllocationLines(lines, t, loc, a.currencyCode);
      if (!parsed) return;
      for (const pl of parsed) {
        if (seenBranches.has(pl.branchId)) {
          notify.error(t("generalOverhead.duplicateBranch"));
          return;
        }
        seenBranches.add(pl.branchId);
      }
      if (!allocationSumMatches(parsed, a.amount, t, locale, a.currencyCode)) return;
      flat.push(...parsed);
    }
    try {
      await allocMut.mutateAsync({
        poolId: allocPool.id,
        lines: flat,
        expensePaymentSource: allocBranchPaid ? "REGISTER" : "PATRON",
      });
      notify.success(t("generalOverhead.toastAllocated"));
      setAllocPool(null);
    } catch (e) {
      notify.error(apiErrMsg(e));
    }
  };

  const requestReverseAllocation = (p: GeneralOverheadPoolRow) => {
    notifyConfirmToast({
      toastId: `goh-reverse-${p.id}`,
      title: t("generalOverhead.confirmReverseTitle"),
      message: (
        <>
          <p>{t("generalOverhead.confirmReverseMessage")}</p>
          <p className="mt-2 break-words font-medium text-zinc-900">“{p.title}”</p>
        </>
      ),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("generalOverhead.confirmReverseAction"),
      tone: "warning",
      onConfirm: async () => {
        try {
          await reverseMut.mutateAsync(p.id);
          notify.success(t("generalOverhead.toastReversed"));
        } catch (e) {
          notify.error(apiErrMsg(e));
        }
      },
    });
  };

  const statusLabel = (s: string) => {
    const u = s.trim().toUpperCase();
    if (u === "OPEN") return t("generalOverhead.statusOpen");
    if (u === "ALLOCATED") return t("generalOverhead.statusAllocated");
    return s;
  };

  const branchSelectOptions = useMemo(
    () => [{ value: "", label: t("branch.txSelectPlaceholder") }, ...branchOpts],
    [branchOpts, t]
  );

  const allocPoolSingleCurrency = allocPool != null && poolAmountsList(allocPool).length === 1;

  const currencyOpts = useMemo(() => currencySelectOptions(loc), [loc]);

  useEffect(() => {
    if (createAmountRows.length > 1 && allocateNow) setAllocateNow(false);
  }, [createAmountRows.length, allocateNow]);

  const createTargetAmt = useMemo(() => {
    if (createAmountRows.length !== 1) return undefined;
    const v = parseLocaleAmount(createAmountRows[0]!.amount, loc);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  }, [createAmountRows, loc]);

  const createAllocCompare = useMemo(
    () => compareAllocDraftSum(createAllocLines, createTargetAmt, loc),
    [createAllocLines, createTargetAmt, loc]
  );

  const poolStats = useMemo(() => {
    const rows = poolsQ.data ?? [];
    let open = 0;
    let allocated = 0;
    for (const p of rows) {
      const u = String(p.status ?? "").trim().toUpperCase();
      if (u === "OPEN") open++;
      else if (u === "ALLOCATED") allocated++;
    }
    return { total: rows.length, open, allocated };
  }, [poolsQ.data]);

  return (
    <>
      <PageScreenScaffold
        className="w-full app-page-max px-3 py-6 md:px-4"
        intro={
          <>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                {t("generalOverhead.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">{t("generalOverhead.intro")}</p>
            </div>

            <PageWhenToUseGuide
              guideTab="flows"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.generalOverhead.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.generalOverhead.step1") },
                { text: t("pageHelp.generalOverhead.step2") },
                {
                  text: t("pageHelp.generalOverhead.step3"),
                  link: { href: "/suppliers", label: t("pageHelp.generalOverhead.step3Link") },
                },
                {
                  text: t("pageHelp.generalOverhead.step4"),
                  link: { href: "/branches", label: t("pageHelp.generalOverhead.step4Link") },
                },
              ]}
            />
          </>
        }
        main={
          <Card
            title={t("generalOverhead.listTitle")}
            headerActions={
              <Tooltip content={t("generalOverhead.addExpense")} delayMs={200}>
                <Button
                  type="button"
                  variant="primary"
                  className={TABLE_TOOLBAR_ICON_BTN}
                  onClick={openCreate}
                  aria-label={t("generalOverhead.addExpense")}
                >
                  <ToolbarGlyphCoinExpense className="h-5 w-5" />
                </Button>
              </Tooltip>
            }
          >
        {!poolsQ.isPending && !poolsQ.isError ? (
          <div className="mb-4 md:mb-5">
            <p className="mb-2 text-xs text-zinc-500 md:hidden">{t("generalOverhead.storyRailHint")}</p>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [-webkit-overflow-scrolling:touch] md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0 md:snap-none">
              <div className="w-full max-md:w-[min(82vw,16.5rem)] max-md:shrink-0 max-md:snap-start rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm ring-1 ring-violet-100/40">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-violet-900/80">
                  {t("generalOverhead.storyStatTotal")}
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-zinc-950">
                  {poolStats.total}
                </p>
              </div>
              <div className="w-full max-md:w-[min(82vw,16.5rem)] max-md:shrink-0 max-md:snap-start rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm ring-1 ring-emerald-100/50">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/85">
                  {t("generalOverhead.storyStatOpen")}
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-zinc-950">
                  {poolStats.open}
                </p>
              </div>
              <div className="w-full max-md:w-[min(82vw,16.5rem)] max-md:shrink-0 max-md:snap-start rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-600">
                  {t("generalOverhead.storyStatAllocated")}
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-zinc-950">
                  {poolStats.allocated}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="mb-4 w-full max-w-xs">
          <Select
            name="gohStatusFilter"
            label={t("generalOverhead.filterStatus")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            onBlur={() => {}}
            options={[
              { value: "", label: t("generalOverhead.filterAll") },
              { value: "OPEN", label: t("generalOverhead.statusOpen") },
              { value: "ALLOCATED", label: t("generalOverhead.statusAllocated") },
            ]}
          />
        </div>
        {poolsQ.isPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : poolsQ.isError ? (
          <p className="text-sm text-red-600">{apiErrMsg(poolsQ.error)}</p>
        ) : (poolsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">{t("generalOverhead.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("generalOverhead.colDate")}</TableHeader>
                  <TableHeader>{t("generalOverhead.colTitle")}</TableHeader>
                  <TableHeader>{t("generalOverhead.colCategory")}</TableHeader>
                  <TableHeader>{t("generalOverhead.colAmount")}</TableHeader>
                  <TableHeader>{t("generalOverhead.colStatus")}</TableHeader>
                  <TableHeader className="text-end">{t("common.actions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(poolsQ.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell dataLabel={t("generalOverhead.colDate")} className="whitespace-nowrap text-sm">
                      {p.expenseDate}
                    </TableCell>
                    <TableCell dataLabel={t("generalOverhead.colTitle")} className="min-w-[10rem] text-sm font-medium">
                      {p.title}
                    </TableCell>
                    <TableCell dataLabel={t("generalOverhead.colCategory")} className="text-sm text-zinc-600">
                      {financialBreakdownMainLabel(p.mainCategory, t)} /{" "}
                      {txCategoryLine(p.mainCategory, p.category, t) || "—"}
                    </TableCell>
                    <TableCell dataLabel={t("generalOverhead.colAmount")} className="min-w-[7rem] text-sm text-zinc-800">
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        {poolAmountsList(p).map((a) => (
                          <span key={a.currencyCode}>
                            {formatLocaleAmount(a.amount, locale, a.currencyCode)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell dataLabel={t("generalOverhead.colStatus")}>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status.trim().toUpperCase() === "OPEN"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-zinc-200 text-zinc-800"
                        }`}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </TableCell>
                    <TableCell dataLabel={t("common.actions")} className="text-end">
                      {p.status.trim().toUpperCase() === "OPEN" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          disabled={allocMut.isPending}
                          onClick={() => openAllocate(p)}
                        >
                          {t("generalOverhead.allocate")}
                        </Button>
                      ) : p.status.trim().toUpperCase() === "ALLOCATED" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="text-xs"
                          disabled={reverseMut.isPending && reverseMut.variables === p.id}
                          onClick={() => requestReverseAllocation(p)}
                        >
                          {t("generalOverhead.reverseAllocation")}
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
          </Card>
        }
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        titleId="goh-create"
        title={t("generalOverhead.modalCreateTitle")}
        narrow
        closeButtonLabel={t("common.close")}
        className="!max-w-[min(100vw-1rem,36rem)] sm:!max-w-xl md:!max-w-2xl"
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 flex-1 text-xs sm:flex-none"
                      onClick={addCreateAllocRow}
                    >
                      {t("generalOverhead.addBranchRow")}
                    </Button>
                    <Button type="button" variant="secondary" className="min-h-10 flex-1 text-xs sm:flex-none" onClick={equalSplitCreate}>
                      {t("generalOverhead.equalSplit")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 flex-1 text-xs sm:flex-none"
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

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => setCreateOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-11 w-full sm:min-h-10 sm:w-auto"
            disabled={createMut.isPending || allocMut.isPending}
            onClick={() => void submitCreate()}
          >
            {allocateNow ? t("generalOverhead.saveAndAllocate") : t("common.save")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={allocPool != null}
        onClose={() => setAllocPool(null)}
        titleId="goh-alloc"
        title={t("generalOverhead.modalAllocateTitle")}
        wide
        closeButtonLabel={t("common.close")}
      >
        {allocPool ? (
          <div className="flex flex-col gap-4 px-4 pb-4 sm:px-6 sm:pb-6">
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
                  <div
                    key={bucket.currencyCode}
                    className="rounded-2xl border border-zinc-200/90 bg-zinc-50/40 p-4 sm:p-5"
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
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">{t("generalOverhead.allocateSumHint")}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => setAllocPool(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                disabled={allocMut.isPending}
                onClick={() => void submitAllocate()}
              >
                {t("generalOverhead.confirmAllocate")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
