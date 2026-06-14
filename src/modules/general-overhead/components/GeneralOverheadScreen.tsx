"use client";

import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useAllocateGeneralOverheadPool,
  useCreateGeneralOverheadPool,
  useGeneralOverheadPoolDetail,
  useGeneralOverheadPools,
  useGeneralOverheadReversePreview,
  generalOverheadPoolAuditKey,
  useReverseGeneralOverheadAllocation,
} from "@/modules/general-overhead/hooks/useGeneralOverheadQueries";
import type {
  GeneralOverheadAllocateLine,
  GeneralOverheadPoolDetail,
  GeneralOverheadPoolRow,
} from "@/modules/general-overhead/api/general-overhead-api";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
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
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { financialBreakdownMainLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import {
  detailOpenIconButtonClass,
  EyeIcon,
  ShareAllocateIcon,
  UndoIcon,
} from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphCoinExpense } from "@/shared/ui/ToolbarGlyph";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAuditLogs } from "@/lib/api/audit-logs-api";
import { GohReverseConfirmModal } from "@/modules/general-overhead/components/GohReverseConfirmModal";
import { GohDetailModal } from "@/modules/general-overhead/components/GohDetailModal";
import { GohAllocateModal } from "@/modules/general-overhead/components/GohAllocateModal";
import { GohCreateModal } from "@/modules/general-overhead/components/GohCreateModal";

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

function expensePaySourceLabel(src: string, t: (k: string) => string): string {
  const u = String(src ?? "")
    .trim()
    .toUpperCase();
  if (u === "REGISTER") return t("generalOverhead.reversePayRegister");
  if (u === "PERSONNEL_POCKET") return t("generalOverhead.reversePayPocket");
  return t("generalOverhead.reversePayPatron");
}

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

function GohDetailAllocationSection({
  data,
  t,
  locale,
}: {
  data: GeneralOverheadPoolDetail;
  t: (k: string) => string;
  locale: Locale;
}) {
  const st = String(data.status ?? "")
    .trim()
    .toUpperCase();
  const rows = data.allocations ?? [];
  if (st === "ALLOCATED" && rows.length > 0) {
    return (
      <div className="max-h-[min(52dvh,22rem)] overflow-y-auto overscroll-y-contain rounded-2xl sm:max-h-[min(60dvh,28rem)] md:max-h-none md:overflow-visible">
        <Table className="shadow-sm ring-1 ring-zinc-950/[0.04]">
          <TableHead>
            <TableRow>
              <TableHeader>{t("generalOverhead.fieldBranch")}</TableHeader>
              <TableHeader className="text-end">{t("generalOverhead.fieldShareAmount")}</TableHeader>
              <TableHeader className="whitespace-nowrap text-end">
                {t("generalOverhead.detailBranchTransactionId")}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.branchId}-${row.currencyCode}-${row.branchTransactionId}`}>
                <TableCell className="text-sm font-medium text-zinc-900" dataLabel={t("generalOverhead.fieldBranch")}>
                  {row.branchName}
                </TableCell>
                <TableCell
                  className="text-end text-sm font-semibold tabular-nums text-zinc-900"
                  dataLabel={t("generalOverhead.fieldShareAmount")}
                >
                  {formatLocaleAmount(row.amount, locale, row.currencyCode)}
                </TableCell>
                <TableCell
                  className="text-end text-sm tabular-nums text-zinc-500"
                  dataLabel={t("generalOverhead.detailBranchTransactionId")}
                >
                  #{row.branchTransactionId}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  if (st === "ALLOCATED") {
    return <p className="rounded-xl bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">{t("generalOverhead.detailAllocationsEmpty")}</p>;
  }
  return (
    <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">{t("generalOverhead.detailNotAllocated")}</p>
  );
}

function parseGohAuditOperationJson(json: string | null): string | null {
  if (json == null || json.trim() === "") return null;
  try {
    const o = JSON.parse(json) as { operation?: string };
    return typeof o.operation === "string" ? o.operation : null;
  } catch {
    return null;
  }
}

function gohAuditOperationLabel(op: string | null, t: (k: string) => string): string {
  switch (op) {
    case "GENERAL_OVERHEAD_POOL_CREATE":
      return t("generalOverhead.auditOpPoolCreate");
    case "GENERAL_OVERHEAD_ALLOCATE":
      return t("generalOverhead.auditOpAllocate");
    case "GENERAL_OVERHEAD_REVERSE_PREVIEW":
      return t("generalOverhead.auditOpReversePreview");
    case "GENERAL_OVERHEAD_REVERSE_ALLOCATION":
      return t("generalOverhead.auditOpReverseAllocation");
    default:
      return op ?? "—";
  }
}

function GohPoolAuditSection({
  poolId,
  locale,
  t,
  apiErrMsg,
}: {
  poolId: number;
  locale: Locale;
  t: (k: string) => string;
  apiErrMsg: (e: unknown) => string;
}) {
  const q = useQuery({
    queryKey: [...generalOverheadPoolAuditKey(poolId)],
    queryFn: () => fetchAuditLogs({ tableName: "general_overhead_pools", recordId: poolId }),
    enabled: poolId > 0,
  });

  if (q.isPending) {
    return <p className="text-xs text-zinc-500">{t("common.loading")}</p>;
  }
  if (q.isError) {
    return <p className="text-xs text-red-700">{apiErrMsg(q.error)}</p>;
  }
  const rows = q.data ?? [];
  if (rows.length === 0) {
    return <p className="text-xs text-zinc-500">{t("generalOverhead.detailAuditEmpty")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {t("generalOverhead.detailAuditTitle")}
      </p>
      <ul className="max-h-[min(40dvh,16rem)] space-y-2 overflow-y-auto overscroll-y-contain pr-0.5 sm:max-h-[min(48dvh,20rem)]">
        {rows.map((row) => {
          const op = parseGohAuditOperationJson(row.newData);
          const label = gohAuditOperationLabel(op, t);
          return (
            <li
              key={row.id}
              className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-3 py-2 text-xs shadow-sm shadow-zinc-900/[0.03]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span className="font-semibold text-zinc-900">{label}</span>
                <span className="tabular-nums text-zinc-500">{formatLocaleDateTime(row.createdAt, locale)}</span>
              </div>
              {row.userId != null ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  {t("generalOverhead.detailAuditUser")}{" "}
                  <span className="font-mono font-medium text-zinc-700">#{row.userId}</span>
                </p>
              ) : null}
              {row.newData != null && row.newData.trim() !== "" ? (
                <details className="mt-2 border-t border-dashed border-zinc-200 pt-2">
                  <summary className="cursor-pointer select-none text-[11px] font-medium text-violet-800">
                    {t("generalOverhead.detailAuditPayload")}
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-zinc-900/95 p-2 text-[10px] leading-snug text-zinc-100">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(row.newData), null, 2);
                      } catch {
                        return row.newData;
                      }
                    })()}
                  </pre>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GeneralOverheadScreen() {
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const loc = locale as Locale;
  const canManageTourismPolicy = userCanManageTourismSeasonClosedPolicy(user?.role);
  const apiErrMsg = useCallback(
    (e: unknown) =>
      resolveLocalizedApiError(e, t, { canManageTourismSeasonClosedPolicy: canManageTourismPolicy }),
    [t, canManageTourismPolicy]
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const poolsQ = useGeneralOverheadPools(
    statusFilter.trim() === "" ? undefined : statusFilter,
    true
  );
  const branchesQ = useBranchesList();
  const createMut = useCreateGeneralOverheadPool();
  const allocMut = useAllocateGeneralOverheadPool();
  const reverseMut = useReverseGeneralOverheadAllocation();
  const [reversePoolId, setReversePoolId] = useState<number | null>(null);
  const [reverseAck, setReverseAck] = useState(false);
  const reversePreviewQ = useGeneralOverheadReversePreview(reversePoolId);

  useEffect(() => {
    if (!reversePreviewQ.isSuccess || reversePoolId == null) return;
    void qc.invalidateQueries({ queryKey: [...generalOverheadPoolAuditKey(reversePoolId)] });
  }, [qc, reversePoolId, reversePreviewQ.isSuccess, reversePreviewQ.dataUpdatedAt]);

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
  const [detailPoolId, setDetailPoolId] = useState<number | null>(null);
  const detailQ = useGeneralOverheadPoolDetail(detailPoolId);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derin-link: /general-overhead?openPool=ID → havuz detayını aç, param'ı temizle.
  useEffect(() => {
    const raw = searchParams.get("openPool");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id) && id > 0) setDetailPoolId(id);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("openPool");
    const qs = params.toString();
    router.replace(qs ? `/general-overhead?${qs}` : "/general-overhead");
  }, [searchParams, router]);

  // Derin-link: /general-overhead?newPool=1 → yeni havuz dialog'unu aç (branchPreset/returnTo'yu sakla).
  useEffect(() => {
    if (searchParams.get("newPool") !== "1") return;
    setCreateOpen(true);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("newPool");
    const qs = params.toString();
    router.replace(qs ? `/general-overhead?${qs}` : "/general-overhead");
  }, [searchParams, router]);

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

  const openReverseAllocationFlow = useCallback((poolId: number) => {
    setReversePoolId(poolId);
    setReverseAck(false);
  }, []);

  const submitReverseAllocation = useCallback(async () => {
    if (reversePoolId == null) return;
    const pv = reversePreviewQ.data;
    if (!pv) return;
    if (pv.risksRequireAcknowledgement && !reverseAck) {
      notify.error(t("generalOverhead.reverseAckRequired"));
      return;
    }
    try {
      await reverseMut.mutateAsync({
        poolId: reversePoolId,
        acknowledgeReverseRisks: pv.risksRequireAcknowledgement ? reverseAck : false,
      });
      notify.success(t("generalOverhead.toastReversed"));
      setReversePoolId(null);
    } catch (e) {
      notify.error(apiErrMsg(e));
    }
  }, [
    apiErrMsg,
    reverseAck,
    reverseMut,
    reversePoolId,
    reversePreviewQ.data,
    t,
  ]);

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

  const statusFilterSelect = (
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
  );

  const addExpenseButton = (
    <Tooltip content={t("generalOverhead.addExpense")} delayMs={200}>
      <Button
        type="button"
        variant="primary"
        className={cn(TABLE_TOOLBAR_ICON_BTN, "touch-manipulation")}
        onClick={openCreate}
        aria-label={t("generalOverhead.addExpense")}
      >
        <ToolbarGlyphCoinExpense className="h-5 w-5" />
      </Button>
    </Tooltip>
  );

  return (
    <>
      <PageScreenScaffold
        className="w-full app-page-max gap-4 px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:gap-6 sm:px-6 md:px-4 md:py-6"
        intro={
          <>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                {t("generalOverhead.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-pretty text-sm text-zinc-600 line-clamp-4 md:line-clamp-none">
                {t("generalOverhead.intro")}
              </p>
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
            headerActions={<span className="max-md:hidden">{addExpenseButton}</span>}
          >
        {!poolsQ.isPending && !poolsQ.isError ? (
          <div className="mb-3 md:mb-5">
            <p className="mb-2 text-xs leading-snug text-zinc-500">{t("generalOverhead.storyRailHint")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="min-w-0 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-violet-50/70 to-white p-3 shadow-sm ring-1 ring-violet-100/40 sm:p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-violet-900/80">
                  {t("generalOverhead.storyStatTotal")}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-zinc-950 sm:mt-1.5 sm:text-2xl">
                  {poolStats.total}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-3 shadow-sm ring-1 ring-emerald-100/50 sm:p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/85">
                  {t("generalOverhead.storyStatOpen")}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-zinc-950 sm:mt-1.5 sm:text-2xl">
                  {poolStats.open}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-white p-3 shadow-sm sm:p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-600">
                  {t("generalOverhead.storyStatAllocated")}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-zinc-950 sm:mt-1.5 sm:text-2xl">
                  {poolStats.allocated}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "mb-4 border-b border-zinc-100 pb-3",
            "sticky top-0 z-10 -mx-3 bg-white/95 px-3 pt-0.5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90",
            "sm:-mx-4 sm:px-4",
            "md:static md:z-0 md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:backdrop-blur-none"
          )}
        >
          <div className="flex min-w-0 items-end gap-2 md:block md:max-w-xs">
            <div className="min-w-0 flex-1">{statusFilterSelect}</div>
            <div className="flex shrink-0 pb-0.5 md:hidden">{addExpenseButton}</div>
          </div>
        </div>
        {poolsQ.isPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : poolsQ.isError ? (
          <p className="text-sm text-red-600">{apiErrMsg(poolsQ.error)}</p>
        ) : (poolsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">{t("generalOverhead.empty")}</p>
        ) : (
          <div className="min-w-0">
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
                    <TableCell dataLabel={t("common.actions")} className="text-end max-md:pt-3">
                      <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-1.5">
                        <Tooltip content={t("common.openDetails")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn(detailOpenIconButtonClass, "mx-auto sm:mx-0")}
                            aria-label={t("common.openDetails")}
                            title={t("common.openDetails")}
                            aria-haspopup="dialog"
                            onClick={() => setDetailPoolId(p.id)}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
                        {p.status.trim().toUpperCase() === "OPEN" ? (
                          <Tooltip content={t("generalOverhead.allocate")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={cn(detailOpenIconButtonClass, "mx-auto sm:mx-0")}
                              disabled={allocMut.isPending}
                              aria-label={t("generalOverhead.allocate")}
                              title={t("generalOverhead.allocate")}
                              onClick={() => openAllocate(p)}
                            >
                              <ShareAllocateIcon />
                            </Button>
                          </Tooltip>
                        ) : p.status.trim().toUpperCase() === "ALLOCATED" ? (
                          <Tooltip content={t("generalOverhead.reverseAllocation")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={cn(detailOpenIconButtonClass, "mx-auto sm:mx-0")}
                              disabled={reverseMut.isPending && reverseMut.variables?.poolId === p.id}
                              aria-label={t("generalOverhead.reverseAllocation")}
                              title={t("generalOverhead.reverseAllocation")}
                              onClick={() => openReverseAllocationFlow(p.id)}
                            >
                              <UndoIcon />
                            </Button>
                          </Tooltip>
                        ) : (
                          <span className="py-2 text-center text-xs text-zinc-400 sm:py-0">—</span>
                        )}
                      </div>
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

      <GohCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        saving={createMut.isPending}
        onSubmit={() => void submitCreate()}
        cTitle={cTitle}
        setCTitle={setCTitle}
        cDate={cDate}
        setCDate={setCDate}
        cNotes={cNotes}
        setCNotes={setCNotes}
        createAmountRows={createAmountRows}
        setCreateAmountRows={setCreateAmountRows}
        addCreateAmountRow={addCreateAmountRow}
        removeCreateAmountRow={removeCreateAmountRow}
        cMain={cMain}
        setCMain={setCMain}
        cCat={cCat}
        setCCat={setCCat}
        currencySelectOptions={currencyOpts}
        allocateNow={allocateNow}
        setAllocateNow={setAllocateNow}
        createAllocLines={createAllocLines}
        setCreateAllocLines={setCreateAllocLines}
        branchSelectOptions={branchSelectOptions}
        branchOptionsForCreateAllocRow={(state, key, base) =>
          branchOptionsForAllocRow(state, key, base)
        }
        addCreateAllocRow={addCreateAllocRow}
        removeCreateAllocRow={removeCreateAllocRow}
        equalSplitCreate={equalSplitCreate}
        equalSplitAllBranchesCreate={equalSplitAllBranchesCreate}
        createAllocCompare={createAllocCompare}
        formatAmountInputOnBlur={formatAmountInputOnBlur}
        hasSingleCurrencyTotal={createAmountRows.length === 1}
        totalAmountForAlloc={
          createAmountRows.length === 1
            ? parseLocaleAmount(createAmountRows[0]!.amount, loc) || 0
            : 0
        }
        allocPending={allocMut.isPending}
        allocBranchPaid={allocBranchPaid}
        setAllocBranchPaid={setAllocBranchPaid}
        applyAllocBranchChange={applyAllocBranchChange}
        branchOptionsForAllocRow={branchOptionsForAllocRow}
        quickPicks={QUICK_PICKS}
        currencyOpts={currencyOpts}
        loc={loc}
        locale={locale}
        branchesLoading={branchesQ.isPending}
        AllocationDraftTotalsBar={AllocationDraftTotalsBar}
      />

      <GohAllocateModal
        pool={allocPool}
        onClose={() => setAllocPool(null)}
        allocLinesByCur={allocLinesByCur}
        setAllocLinesByCur={setAllocLinesByCur}
        allocBranchPaid={allocBranchPaid}
        setAllocBranchPaid={setAllocBranchPaid}
        saving={allocMut.isPending}
        onSubmit={() => void submitAllocate()}
        loc={loc}
        locale={locale}
        poolAmountsList={poolAmountsList}
        allocPoolSingleCurrency={allocPoolSingleCurrency}
        applyAllocBranchChangeGlobal={applyAllocBranchChangeGlobal}
        branchOptionsForAllocRowGlobal={branchOptionsForAllocRowGlobal}
        branchSelectOptions={branchSelectOptions}
        branchesLoading={branchesQ.isPending}
        equalSplit={equalSplit}
        equalSplitAllBranches={equalSplitAllBranches}
        addAllocRow={addAllocRow}
        removeAllocRow={removeAllocRow}
        compareAllocDraftSum={compareAllocDraftSum}
        AllocationDraftTotalsBar={AllocationDraftTotalsBar}
      />

      <GohDetailModal
        open={detailPoolId != null}
        onClose={() => setDetailPoolId(null)}
        poolId={detailPoolId}
        detail={detailQ}
        loc={loc}
        locale={locale}
        statusLabel={statusLabel}
        apiErrMsg={apiErrMsg}
        poolAmountsList={poolAmountsList}
        AllocationSection={GohDetailAllocationSection}
        AuditSection={GohPoolAuditSection}
        onReverseAllocation={(poolId) => {
          openReverseAllocationFlow(poolId);
          setDetailPoolId(null);
        }}
        reverseBusyForPool={(poolId) =>
          reverseMut.isPending && reverseMut.variables?.poolId === poolId
        }
      />

      <GohReverseConfirmModal
        open={reversePoolId != null}
        onClose={() => setReversePoolId(null)}
        poolId={reversePoolId}
        preview={reversePreviewQ}
        reverseAck={reverseAck}
        setReverseAck={setReverseAck}
        saving={reverseMut.isPending}
        onConfirm={() => void submitReverseAllocation()}
        loc={loc}
        locale={locale}
        expensePaySourceLabel={expensePaySourceLabel}
        apiErrMsg={apiErrMsg}
      />
    </>
  );
}
